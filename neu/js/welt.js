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
    hunt: null,              // Mammutjagd unterwegs: { left, cx, cy, x, y }
    herdWait: 0,             // Sekunden, bis wieder eine Mammutherde vorbeizieht
    stage: 'alt',
    pop: CONFIG.start.population,
    yearTime: 0,
    playTime: 0,
    quests: {},              // id → true, wenn abgeholt
    built: {},               // Typ → wie oft fertig gebaut (für Aufträge)
    seen: {},                // Typ → in der Bauleiste schon angesehen (sonst „Neu“)
    daily: { last: '', streak: 0, pending: 0 },   // pending = Tag (1–7), dessen Belohnung noch wartet
    tutorial: 0,             // Schritt im Einstieg, -1 = fertig/übersprungen
    mapSize: N,              // Kartengröße beim Speichern (alte Stände: 64, werden beim Laden in die Mitte gelegt)
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
  addBuilding('pfad', c - 1, c + 1, false, true);   // Trampelpfade von den Wohnhöhlen zum Feuer
  addBuilding('pfad', c, c + 3, false, true);
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
function makeNoise(rng, cell, n = N) {
  const g = Math.ceil(n / cell) + 2;
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

// Kern der Karte (64 × 64 um das Lager): genau wie bis Version 21 erzeugt, damit alte Spielstände Feld für Feld passen.
const CORE = 64;
function generateCore(seed) {
  const n = CORE;
  const rng = seededRng(seed);
  const t = new Uint8Array(n * n);
  const forest = makeNoise(rng, 9, n), forest2 = makeNoise(rng, 4, n), rocks = makeNoise(rng, 7, n);
  const phase = rng() * 6.28, phase2 = rng() * 6.28;
  const mid = n / 2;
  for (let y = 0; y < n; y++) {
    const { rx, width } = riverAt(y, phase, phase2, mid);
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
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
      if (Math.hypot(x - fx, y - fy) < 2.3 && rng() < 0.7 && t[y * n + x] !== TERRAIN.wasser.id) t[y * n + x] = TERRAIN.fels.id;
  // Ein paar einzelne Bäume auf der Wiese, damit es nicht leer aussieht
  for (let k = 0; k < n * 2; k++) {
    const x = Math.floor(rng() * n), y = Math.floor(rng() * n);
    if (Math.hypot(x - mid, y - mid) > 6 && t[y * n + x] === TERRAIN.gras.id) t[y * n + x] = TERRAIN.wald.id;
  }
  return { t, phase, phase2 };
}

// Fluss: schlängelt sich von oben nach unten, rechts neben dem Lager (y in Kern-Koordinaten)
function riverAt(y, phase, phase2, mid) {
  return { rx: mid + 9 + Math.sin(y * 0.11 + phase) * 4 + Math.sin(y * 0.29 + phase2) * 1.5, width: 1.3 + Math.sin(y * 0.07 + phase2) * 0.4 };
}

// Ganze Karte: außen neues Land (Wälder, Wiesen, Felsen, zwei Gebirge in den Ecken), in der Mitte der alte Kern
function generateTerrain(seed) {
  const core = generateCore(seed);
  const off = (N - CORE) / 2;
  const rng = seededRng((seed ^ 0x5bd1e995) >>> 0);
  const t = new Uint8Array(N * N);
  const forest = makeNoise(rng, 11), forest2 = makeNoise(rng, 5), rocks = makeNoise(rng, 8), ridge = makeNoise(rng, 10);
  const mountains = [   // Kammlinie x + y = L (oben links bzw. unten rechts), Breite schwankt
    { L: 34 + Math.floor(rng() * 10), w: 4 + rng() * 2 },
    { L: 2 * N - 40 - Math.floor(rng() * 10), w: 3.5 + rng() * 2 },
  ];
  for (let y = 0; y < N; y++) {
    const { rx, width } = riverAt(y - off, core.phase, core.phase2, CORE / 2);
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const d = Math.abs(x - (rx + off));
      let berg = 0;
      for (const m of mountains) {
        const dist = Math.abs(x + y - m.L + (ridge(x, y) - 0.5) * 18) / Math.SQRT2;
        berg = Math.max(berg, m.w - dist);
      }
      if (d < width) t[i] = TERRAIN.wasser.id;
      else if (d < width + 1.2) t[i] = TERRAIN.sand.id;
      else if (berg > 0) t[i] = TERRAIN.berg.id;
      else if (berg > -2.5 && rng() < 0.45 + berg * 0.15) t[i] = TERRAIN.fels.id;   // Vorberge: Felsen am Gebirgsrand
      else if (forest(x, y) * 0.75 + forest2(x, y) * 0.25 > 0.6) t[i] = TERRAIN.wald.id;
      else if (rocks(x, y) > 0.8 && rng() < 0.55) t[i] = TERRAIN.fels.id;
      else if (rng() < 0.03) t[i] = TERRAIN.wald.id;   // einzelne Bäume
      else t[i] = TERRAIN.gras.id;
    }
  }
  for (let y = 0; y < CORE; y++)
    for (let x = 0; x < CORE; x++) t[(y + off) * N + x + off] = core.t[y * CORE + x];
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
  // gleichmäßig teurer, aber nie über den Lagerplatz (150) – sonst könnte man nie mehr Land kaufen.
  // Ab dem 8. Stück kostet Land zusätzlich Stein.
  const n = plotsBought();
  const price = { holz: Math.min(140, 30 + 15 * n), nahrung: Math.min(140, 30 + 15 * n) };
  if (n >= 7) price.stein = Math.min(140, 20 * (n - 6));
  return price;
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

// ---------------------------------------------------------------------
// Trampelpfade: Jedes Gebäude braucht einen Weg zum Lagerfeuer (oder steht direkt daran)
// ---------------------------------------------------------------------

let reached = null;      // Felder mit Pfad, die mit dem Lagerfeuer verbunden sind
let connected = [];      // je Gebäude: verbunden?
let networkDirty = true;

function isPathAt(x, y) {
  const i = buildingAt(x, y);
  return i >= 0 && BUILDINGS[state.buildings[i].type].isPath;
}

function isFireAt(x, y) {
  const i = buildingAt(x, y);
  return i >= 0 && state.buildings[i].type === 'lagerfeuer';
}

// Felder rund um ein Rechteck (ohne Ecken)
function perimeter(x, y, s) {
  const out = [];
  for (let k = 0; k < s; k++) out.push([x + k, y - 1], [x + k, y + s], [x - 1, y + k], [x + s, y + k]);
  return out.filter(([px, py]) => inMap(px, py));
}

// Liegt ein Bauplatz am Wegenetz (Pfad mit Verbindung oder direkt am Lagerfeuer)?
function touchesNetwork(x, y, s) {
  updateNetwork();
  return perimeter(x, y, s).some(([px, py]) => reached[py * N + px] || isFireAt(px, py));
}

function updateNetwork() {
  if (!networkDirty && reached) return;
  networkDirty = false;
  reached = new Uint8Array(N * N);
  const queue = [];
  const fire = state.buildings.find(b => b.type === 'lagerfeuer');
  if (fire) for (const [x, y] of perimeter(fire.x, fire.y, BUILDINGS.lagerfeuer.size))
    if (isPathAt(x, y) && !reached[y * N + x]) { reached[y * N + x] = 1; queue.push([x, y]); }
  while (queue.length) {
    const [x, y] = queue.pop();
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]])
      if (inMap(nx, ny) && !reached[ny * N + nx] && isPathAt(nx, ny)) { reached[ny * N + nx] = 1; queue.push([nx, ny]); }
  }
  connected = state.buildings.map(b => {
    const def = BUILDINGS[b.type];
    return def.isPath || b.type === 'lagerfeuer' || touchesNetworkRaw(b.x, b.y, def.size);
  });
}

function touchesNetworkRaw(x, y, s) {
  return perimeter(x, y, s).some(([px, py]) => reached[py * N + px] || isFireAt(px, py));
}

function isConnected(i) {
  updateNetwork();
  return connected[i] !== false;
}

// Auf Wasser wird aus einem Weg eine Brücke
function wayTypeAt(x, y) { return inMap(x, y) && terrain[y * N + x] === TERRAIN.wasser.id ? 'bruecke' : 'pfad'; }

// Kürzester Weg (neue Pfadfelder) von einem Gebäude zum Wegenetz; null = kein Weg möglich
function pathRoute(i) {
  const b = state.buildings[i];
  if (!b || isConnected(i)) return [];
  const s = BUILDINGS[b.type].size;
  const prev = new Int32Array(N * N).fill(-2);
  const queue = [];
  const passable = (x, y) => isPathAt(x, y) || !placeProblem(wayTypeAt(x, y), x, y);
  for (const [x, y] of perimeter(b.x, b.y, s))
    if (passable(x, y)) { prev[y * N + x] = -1; queue.push(y * N + x); }
  for (let q = 0; q < queue.length; q++) {
    const k = queue[q], x = k % N, y = Math.floor(k / N);
    if (reached[k] || perimeter(x, y, 1).some(([px, py]) => reached[py * N + px] || isFireAt(px, py))) {
      const route = [];
      for (let c = k; c >= 0; c = prev[c]) if (!isPathAt(c % N, Math.floor(c / N))) route.push([c % N, Math.floor(c / N)]);
      return route;
    }
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const nk = ny * N + nx;
      if (inMap(nx, ny) && prev[nk] === -2 && passable(nx, ny)) { prev[nk] = k; queue.push(nk); }
    }
  }
  return null;
}

function rebuildOccupancy() {
  occ = new Int32Array(N * N);
  networkDirty = true;
  state.buildings.forEach((b, i) => setOccupied(b, i + 1));
}

function setOccupied(b, value) {
  networkDirty = true;
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
      if (def.onWater) { if (t !== TERRAIN.wasser) return 'Brücken gehen nur über Wasser'; continue; }
      if (t.blocks) return t === TERRAIN.wasser ? 'Nicht im Wasser – über den Fluss braucht es eine Brücke' : `${t.name} im Weg – antippen zum Räumen`;
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
