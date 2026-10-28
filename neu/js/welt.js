'use strict';
// Epochia – die Welt: Spielstand, Gelände, Landstücke, belegte Felder und Bauplatz-Prüfung.

const N = CONFIG.mapSize;
const PLOTS = N / CONFIG.plotSize;   // Landstücke je Seite

let state = null;      // der Spielstand (wird gespeichert)
let terrain = null;    // Gelände je Feld (TERRAIN.id), wird aus state.seed erzeugt
let occ = null;        // belegte Felder: Index des Gebäudes + 1, 0 = frei

function newState(seed = Math.floor(Math.random() * 1e9)) {
  const plots = new Array(PLOTS * PLOTS).fill(0);
  const first = Math.floor((PLOTS - CONFIG.startPlots) / 2);
  for (let py = first; py < first + CONFIG.startPlots; py++)
    for (let px = first; px < first + CONFIG.startPlots; px++) plots[py * PLOTS + px] = 1;
  const res = {};
  for (const id of Object.keys(RESOURCES)) res[id] = CONFIG.start.resources[id] || 0;
  return {
    v: 1,
    seed,
    res,
    buildings: [],
    plots,
    cleared: [],
    techs: {},
    research: null,          // { id, left }
    stage: 'alt',
    pop: CONFIG.start.population,
    yearTime: 0,
    playTime: 0,
    quests: {},              // id → true, wenn abgeholt
    built: {},               // Typ → wie oft fertig gebaut (für Aufträge)
    seen: {},                // Typ → in der Bauleiste schon angesehen (sonst „Neu“)
    daily: { last: '', streak: 0, pending: 0 },   // pending = Tag (1–7), dessen Belohnung noch wartet
    tutorial: 0,             // Schritt im Einstieg, -1 = fertig/übersprungen
    savedAt: Date.now(),
  };
}

// Neues Spiel: Gelände erzeugen, Lagerfeuer und zwei Wohnhöhlen in die Mitte stellen
function startNewGame(seed) {
  state = newState(seed);
  buildTerrain();
  const c = Math.floor(N / 2) - 1;
  addBuilding('lagerfeuer', c, c, false, true);
  addBuilding('wohnhoehle', c - 3, c + 1, false, true);
  addBuilding('wohnhoehle', c, c + 4, false, true);
  rebuildOccupancy();
}

// ---------------------------------------------------------------------
// Gelände
// ---------------------------------------------------------------------

function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Weiches Rauschen: Zufallswerte auf einem groben Gitter, dazwischen weich überblendet
function makeNoise(rng, cell) {
  const g = Math.ceil(N / cell) + 2;
  const grid = Array.from({ length: g * g }, rng);
  const smooth = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const gx = x / cell, gy = y / cell;
    const ix = Math.floor(gx), iy = Math.floor(gy);
    const fx = smooth(gx - ix), fy = smooth(gy - iy);
    const v = (i, j) => grid[(iy + j) * g + (ix + i)];
    return (v(0, 0) * (1 - fx) + v(1, 0) * fx) * (1 - fy) + (v(0, 1) * (1 - fx) + v(1, 1) * fx) * fy;
  };
}

function generateTerrain(seed) {
  const rng = seededRng(seed);
  const t = new Uint8Array(N * N);
  const forest = makeNoise(rng, 9), forest2 = makeNoise(rng, 4), rocks = makeNoise(rng, 7);
  const phase = rng() * 6.28, phase2 = rng() * 6.28;
  const mid = N / 2;
  for (let y = 0; y < N; y++) {
    // Fluss: schlängelt sich von oben nach unten, rechts neben dem Lager
    const rx = mid + 9 + Math.sin(y * 0.11 + phase) * 4 + Math.sin(y * 0.29 + phase2) * 1.5;
    const width = 1.3 + Math.sin(y * 0.07 + phase2) * 0.4;
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const d = Math.abs(x - rx);
      const nearCamp = Math.hypot(x - mid, y - mid) < 7;
      if (d < width) t[i] = TERRAIN.wasser.id;
      else if (d < width + 1.2) t[i] = TERRAIN.sand.id;
      else if (nearCamp) t[i] = TERRAIN.gras.id;
      else if (forest(x, y) * 0.75 + forest2(x, y) * 0.25 > 0.6) t[i] = TERRAIN.wald.id;
      else if (rocks(x, y) > 0.8 && rng() < 0.55) t[i] = TERRAIN.fels.id;   // lockere Felsgruppen
      else t[i] = TERRAIN.gras.id;
    }
  }
  // Immer eine kleine Felsgruppe nahe beim Lager (links oben), damit Steinsammler und Höhlenmaler Felsen finden
  const fx = mid - 10 + Math.floor(rng() * 4), fy = mid - 9 + Math.floor(rng() * 4);
  for (let y = fy - 2; y <= fy + 2; y++)
    for (let x = fx - 2; x <= fx + 2; x++)
      if (Math.hypot(x - fx, y - fy) < 2.3 && rng() < 0.7 && t[y * N + x] !== TERRAIN.wasser.id) t[y * N + x] = TERRAIN.fels.id;
  // Ein paar einzelne Bäume auf der Wiese, damit es nicht leer aussieht
  for (let k = 0; k < N * 2; k++) {
    const x = Math.floor(rng() * N), y = Math.floor(rng() * N);
    if (Math.hypot(x - mid, y - mid) > 6 && t[y * N + x] === TERRAIN.gras.id) t[y * N + x] = TERRAIN.wald.id;
  }
  return t;
}

function buildTerrain() {
  terrain = generateTerrain(state.seed);
  for (const i of state.cleared) if (i >= 0 && i < N * N) terrain[i] = TERRAIN.gras.id;
  if (typeof onTerrainChanged === 'function') onTerrainChanged();
}

function inMap(x, y) { return x >= 0 && y >= 0 && x < N && y < N; }
function terrainAt(x, y) { return inMap(x, y) ? TERRAIN_BY_ID[terrain[y * N + x]] : null; }

function countTerrainNear(ax, ay, size, id, radius) {
  let n = 0;
  for (let y = ay - radius; y < ay + size + radius; y++)
    for (let x = ax - radius; x < ax + size + radius; x++)
      if (inMap(x, y) && terrain[y * N + x] === id) n++;
  return n;
}

function touchesWater(ax, ay, size) {
  for (let y = ay - 1; y <= ay + size; y++)
    for (let x = ax - 1; x <= ax + size; x++)
      if (inMap(x, y) && terrain[y * N + x] === TERRAIN.wasser.id) return true;
  return false;
}

// Baum fällen / Felsen abtragen (macht Platz und bringt ein wenig Holz bzw. Stein)
function clearTile(x, y) {
  const t = terrainAt(x, y);
  if (!t || !t.clear || !isOwned(x, y) || occ[y * N + x]) return false;
  terrain[y * N + x] = TERRAIN.gras.id;
  state.cleared.push(y * N + x);
  addResources(t.clear);
  if (typeof onTerrainChanged === 'function') onTerrainChanged();
  return true;
}

// ---------------------------------------------------------------------
// Landstücke
// ---------------------------------------------------------------------

function plotOf(x, y) { return Math.floor(y / CONFIG.plotSize) * PLOTS + Math.floor(x / CONFIG.plotSize); }
function isOwned(x, y) { return inMap(x, y) && state.plots[plotOf(x, y)] === 1; }
function plotsBought() { return state.plots.filter(p => p === 1).length - CONFIG.startPlots ** 2; }

function plotPrice() {
  const n = plotsBought();
  const f = Math.pow(1.5, n);
  return { holz: Math.round(40 * f), nahrung: Math.round(40 * f) };
}

// Nur Landstücke neben eigenem Land kann man kaufen
function canBuyPlot(p) {
  if (p < 0 || p >= state.plots.length || state.plots[p] === 1) return false;
  const px = p % PLOTS, py = Math.floor(p / PLOTS);
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
    const nx = px + dx, ny = py + dy;
    return nx >= 0 && ny >= 0 && nx < PLOTS && ny < PLOTS && state.plots[ny * PLOTS + nx] === 1;
  });
}

function buyPlot(p) {
  if (!canBuyPlot(p)) return false;
  const price = plotPrice();
  if (!canAfford(price)) return false;
  payCost(price);
  state.plots[p] = 1;
  return true;
}

// ---------------------------------------------------------------------
// Gebäude auf dem Raster
// ---------------------------------------------------------------------

function addBuilding(type, x, y, rot = false, finished = false) {
  const def = BUILDINGS[type];
  const b = { type, x, y, rot, build: finished ? 0 : def.time || 0 };
  state.buildings.push(b);
  return b;
}

function rebuildOccupancy() {
  occ = new Int32Array(N * N);
  state.buildings.forEach((b, i) => setOccupied(b, i + 1));
}

function setOccupied(b, value) {
  const s = BUILDINGS[b.type].size;
  for (let y = b.y; y < b.y + s; y++)
    for (let x = b.x; x < b.x + s; x++)
      if (inMap(x, y)) occ[y * N + x] = value;
}

function buildingAt(x, y) {
  if (!inMap(x, y)) return -1;
  return occ[y * N + x] - 1;
}

// Warum passt ein Gebäude hier nicht? null = passt. ignore = Gebäude, das gerade verschoben wird
function placeProblem(type, x, y, ignore = -1) {
  const def = BUILDINGS[type];
  const s = def.size;
  for (let yy = y; yy < y + s; yy++)
    for (let xx = x; xx < x + s; xx++) {
      if (!inMap(xx, yy)) return 'Außerhalb der Karte';
      if (!isOwned(xx, yy)) return 'Dieses Land gehört dir noch nicht';
      const o = occ[yy * N + xx] - 1;
      if (o >= 0 && o !== ignore) return 'Hier steht schon etwas';
      const t = terrainAt(xx, yy);
      if (t.blocks) return t === TERRAIN.wasser ? 'Nicht im Wasser' : `${t.name} im Weg – antippen zum Räumen`;
    }
  if (def.needsWater && !touchesWater(x, y, s)) return 'Muss am Wasser stehen';
  return null;
}

// Mittelpunkt eines Gebäudes in Feldern (für Umkreise)
function centerOf(b) {
  const s = BUILDINGS[b.type].size;
  return { x: b.x + s / 2, y: b.y + s / 2 };
}

function distance(a, b) {
  const ca = centerOf(a), cb = centerOf(b);
  return Math.hypot(ca.x - cb.x, ca.y - cb.y);
}
