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
    planted: [],             // Felder, auf denen aus einem Setzling ein Baum gewachsen ist
    saplings: [],            // Setzlinge: [Feld, Alter in Sekunden]
    techs: {},
    research: null,          // { id, left }
    hunt: null,              // Mammutjagd unterwegs: { left, cx, cy, x, y }
    disaster: null,          // Naturkatastrophe gerade: { id, left } (Sekunden)
    disasterCalm: 0,         // Sekunden seit der letzten Katastrophe (bzw. seit Spielbeginn)
    herdWait: 0,             // Sekunden, bis wieder eine Mammutherde vorbeizieht
    needSince: {},           // Waren-Bedürfnis → Spielzeit, ab der es galt (Schonfrist, Startvorrat)
    hunger: 0,               // Sekunden ohne Nahrung
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
    torches: true,           // Wege haben schon Fackeln bekommen (alte Stände: einmal beim Laden nachholen)
    mapGen: 2,               // Art der Kartenerzeugung: 2 = breiter, kurviger Fluss (alte Stände: 1 = bleibt, wie sie war)
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
  assignTorches();
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

// ---------------------------------------------------------------------
// Karte ab Epochia 52 (mapGen 2): breiter Fluss in großen Schleifen, Engstellen, Wasserfall an einer Felsstufe.
// Alte Spielstände behalten generateTerrain (oben) – sonst stünden ihre Gebäude plötzlich im Wasser.
// ---------------------------------------------------------------------

let mapFeatures = { fall: null };   // Wasserfall: { x, y, ux, uy, w } (Mitte, Fließrichtung, halbe Breite)

// Mittellinie des Flusses: Die Richtung schwingt hin und her (so mäandern echte Flüsse).
// Ergebnis: Punkte { x, y, ux, uy, w } im Abstand 0,5 Felder, oder null, wenn die Kurve nicht auf die Karte passt.
function riverCurve(rng) {
  const c = N / 2 - 0.5;
  const a1 = 1.2 + rng() * 0.25, l1 = 56 + rng() * 22, p1 = rng() * 6.28;
  const a2 = 0.25 + rng() * 0.2, l2 = 22 + rng() * 12, p2 = rng() * 6.28;
  const pw1 = rng() * 6.28, pw2 = rng() * 6.28, narrow = 40 + rng() * 25;
  const pts = [];
  let x = 0, y = -12, sn = 0;
  while (y < N + 12 && sn < 2400) {
    const s = sn * 0.5;
    const th = a1 * Math.sin(6.283 * s / l1 + p1) + a2 * Math.sin(6.283 * s / l2 + p2);
    const ux = Math.sin(th), uy = Math.cos(th);
    let w = 3.3 + 1.1 * Math.sin(s * 0.047 + pw1) + 0.5 * Math.sin(s * 0.13 + pw2);
    const nq = ((s % narrow) / narrow - 0.5) * 2;   // regelmäßig eine Engstelle – dort lohnt sich die Brücke
    w = Math.max(1.8, w - 1.9 * Math.exp(-nq * nq * 40));
    pts.push({ x, y, ux, uy, w });
    x += ux * 0.5; y += uy * 0.5; sn++;
  }
  if (y < N + 12) return null;
  // Waagrecht so schieben, dass der Fluss rechts neben dem Lager vorbeifließt: Abstand zum Ufer mindestens clear
  const clear = 8.5 + rng() * 1.5;
  const cross = pts.reduce((a, q) => (Math.abs(q.y - c) < Math.abs(a.y - c) ? q : a), pts[0]);
  let ox = c + 6 - cross.x;
  for (let k = 0; k < 200; k++, ox += 0.5)
    if (pts.every(q => Math.hypot(q.x + ox - c, q.y - c) - q.w >= clear)) break;
  for (const q of pts) q.x += ox;
  for (const q of pts) if (q.y >= 0 && q.y < N && (q.x < 8 || q.x > N - 8)) return null;
  return pts;
}

// Stelle für den Wasserfall: abseits des Lagers, wo der Fluss im Bild nach unten fließt
function chooseFall(pts) {
  const c = N / 2 - 0.5;
  let best = null, bestScore = 0.65;
  for (const q of pts) {
    if (q.y < 8 || q.y > N - 8 || q.x < 12 || q.x > N - 12) continue;
    const d = Math.hypot(q.x - c, q.y - c);
    if (d < 24 || d > 52) continue;
    const score = (q.ux + q.uy) / Math.SQRT2 + (q.y < c ? 0.08 : 0);
    if (score > bestScore) { best = q; bestScore = score; }
  }
  return best;
}

function generateTerrain2(seed) {
  const rng = seededRng((seed ^ 0x2f6e2b1) >>> 0);
  const curveRng = seededRng((seed ^ 0x51ed27) >>> 0);
  let pts = null;
  for (let k = 0; k < 60 && !pts; k++) pts = riverCurve(curveRng);
  if (!pts) {   // sollte kaum vorkommen: sanfte Kurve rechts vom Lager
    pts = [];
    for (let y = -12; y < N + 12; y += 0.5) pts.push({ x: N / 2 + 18 + Math.sin(y * 0.09) * 6, y, ux: 0, uy: 1, w: 3 });
  }
  const fall = chooseFall(pts);
  if (fall) for (const q of pts) {   // am Wasserfall wird der Fluss enger (Felsstufe)
    const d = Math.hypot(q.x - fall.x, q.y - fall.y);
    q.w = Math.min(q.w, 2.4 + Math.min(1, d / 10) * 3);
  }
  // Abstand jedes Feldes zum Ufer: negativ = im Wasser
  const field = new Float32Array(N * N).fill(99);
  for (const q of pts) {
    const r = Math.ceil(q.w + 5);
    for (let y = Math.max(0, Math.floor(q.y) - r); y <= Math.min(N - 1, Math.floor(q.y) + r); y++)
      for (let x = Math.max(0, Math.floor(q.x) - r); x <= Math.min(N - 1, Math.floor(q.x) + r); x++) {
        const v = Math.hypot(x + 0.5 - q.x, y + 0.5 - q.y) - q.w;
        if (v < field[y * N + x]) field[y * N + x] = v;
      }
  }
  const bank = makeNoise(rng, 5), beach = makeNoise(rng, 9);
  const forest = makeNoise(rng, 11), forest2 = makeNoise(rng, 5), rocks = makeNoise(rng, 8), ridge = makeNoise(rng, 10);
  const mountains = [
    { L: 34 + Math.floor(rng() * 10), w: 4 + rng() * 2 },
    { L: 2 * N - 40 - Math.floor(rng() * 10), w: 3.5 + rng() * 2 },
  ];
  const t = new Uint8Array(N * N);
  const mid = N / 2;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const f = field[i] + (bank(x, y) - 0.5) * 1.3;   // Ufer unregelmäßig
      const nearCamp = Math.hypot(x - mid, y - mid) < 7;
      let berg = -99;   // (die alte Karte begann hier bei 0 – deshalb lagen dort außerhalb der Mitte viel zu viele Felsen)
      for (const m of mountains) {
        const dist = Math.abs(x + y - m.L + (ridge(x, y) - 0.5) * 18) / Math.SQRT2;
        berg = Math.max(berg, m.w - dist);
      }
      if (f < 0) t[i] = TERRAIN.wasser.id;
      else if (f < 0.9 + beach(x, y) * 2.2) t[i] = TERRAIN.sand.id;   // mal schmaler, mal breiter Strand
      else if (nearCamp) t[i] = TERRAIN.gras.id;
      else if (berg > 0) t[i] = TERRAIN.berg.id;
      else if (berg > -2.5 && rng() < 0.45 + berg * 0.15) t[i] = TERRAIN.fels.id;
      else if (forest(x, y) * 0.75 + forest2(x, y) * 0.25 > 0.6) t[i] = TERRAIN.wald.id;
      else if (rocks(x, y) > 0.8 && rng() < 0.55) t[i] = TERRAIN.fels.id;
      else if (rng() < 0.03) t[i] = TERRAIN.wald.id;
      else t[i] = TERRAIN.gras.id;
    }
  // Felsgruppe nahe beim Lager (links oben), wie bisher
  const fx = Math.floor(mid - 10 + rng() * 4), fy = Math.floor(mid - 9 + rng() * 4);
  for (let y = fy - 2; y <= fy + 2; y++)
    for (let x = fx - 2; x <= fx + 2; x++)
      if (Math.hypot(x - fx, y - fy) < 2.3 && rng() < 0.7 && t[y * N + x] !== TERRAIN.wasser.id) t[y * N + x] = TERRAIN.fels.id;
  // Wasserfall: links und rechts der Stufe Gebirge (wird nie abgebaut)
  mapFeatures = { fall: null };
  if (fall) {
    const px = fall.uy, py = -fall.ux;   // quer zum Fluss
    const w = Math.min(fall.w, 2.4);
    for (const side of [-1, 1])
      for (let a = w + 0.8; a < w + 5; a += 0.5)
        for (let b = -2.2; b <= 1.2; b += 0.5) {
          const x = Math.floor(fall.x + side * px * a + fall.ux * b), y = Math.floor(fall.y + side * py * a + fall.uy * b);
          if (inMap(x, y) && t[y * N + x] !== TERRAIN.wasser.id && a - w + Math.abs(b) < 4.6) t[y * N + x] = TERRAIN.berg.id;
        }
    mapFeatures.fall = { x: fall.x, y: fall.y, ux: fall.ux, uy: fall.uy, w: w + 0.6 };
  }
  return t;
}

// Wassertiefe (nur fürs Aussehen): Abstand zum Ufer in Feldern, mit Sandbänken und tieferen Rinnen. 0 = kein Wasser.
let waterDepth = null;
let waterShoal = null;   // Sandbank in der Flussmitte, 0–1 (nur Optik – Wasser bleibt Wasser)
function computeWaterDepth() {
  const dist = new Float32Array(N * N);
  const q = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (terrain[y * N + x] !== TERRAIN.wasser.id) continue;
      let shore = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
        if (inMap(x + dx, y + dy) && terrain[(y + dy) * N + x + dx] !== TERRAIN.wasser.id) shore = true;
      if (shore) { dist[y * N + x] = 1; q.push(y * N + x); }
    }
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % N, y = Math.floor(i / N);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!inMap(x + dx, y + dy)) continue;
      const k = (y + dy) * N + x + dx;
      if (terrain[k] === TERRAIN.wasser.id && !dist[k]) { dist[k] = dist[i] + 1; q.push(k); }
    }
  }
  // weich machen (dreimal mitteln), damit keine eckigen Stufen zu sehen sind
  let cur = dist;
  for (let pass = 0; pass < 3; pass++) {
    const nx = new Float32Array(N * N);
    for (let y = 1; y < N - 1; y++)
      for (let x = 1; x < N - 1; x++) {
        const i = y * N + x;
        if (!dist[i]) continue;
        nx[i] = (cur[i] * 2 + cur[i - 1] + cur[i + 1] + cur[i - N] + cur[i + N]) / 6;
      }
    cur = nx;
  }
  const rng = seededRng((state.seed ^ 0x3c6ef372) >>> 0);
  const deep = makeNoise(rng, 7), shoal = makeNoise(rng, 6);
  waterDepth = new Float32Array(N * N);
  waterShoal = new Float32Array(N * N);
  const step = (a, b, v) => { const k = Math.max(0, Math.min(1, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      if (!dist[i]) continue;
      waterDepth[i] = cur[i] * (0.75 + deep(x, y) * 0.5);
      waterShoal[i] = step(0.68, 0.8, shoal(x, y)) * step(1.6, 2.6, cur[i]);   // Sandbank mitten im breiten Fluss
    }
}

let baseTerrain = null;   // Gelände, wie es aus der Spielstand-Zahl entsteht (ohne Fällen und Pflanzen)

let terrainVersion = 0;   // zählt Geländeänderungen (für gemerkte Werte wie terrainBonus)
function buildTerrain() {
  terrainVersion++;
  mapFeatures = { fall: null };
  baseTerrain = state.mapGen === 2 ? generateTerrain2(state.seed) : generateTerrain(state.seed);
  terrain = baseTerrain.slice();
  computeWaterDepth();
  for (const i of state.cleared) if (i >= 0 && i < N * N) terrain[i] = TERRAIN.gras.id;
  for (const i of state.planted) if (i >= 0 && i < N * N) terrain[i] = TERRAIN.wald.id;
  if (typeof chunks !== 'undefined') chunks = [];   // andere Karte: Boden ganz neu
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

function saplingAt(x, y) {
  const i = y * N + x;
  return state.saplings.some(s => s[0] === i);
}

function removeSapling(x, y) {
  const i = y * N + x, n = state.saplings.length;
  state.saplings = state.saplings.filter(s => s[0] !== i);
  return state.saplings.length < n;
}

// Baum fällen / Felsen abtragen (macht Platz und bringt ein wenig Holz bzw. Stein).
// free = auch fremdes Land und ohne Ertrag (Waldbrand, Holzsammler, die den Baum schon als Holz verbucht haben)
function clearTile(x, y, free = false) {
  const t = terrainAt(x, y);
  if (!t || !t.clear || (!free && !isOwned(x, y)) || occ[y * N + x]) return false;
  terrain[y * N + x] = TERRAIN.gras.id;
  terrainVersion++;
  const k = state.planted.indexOf(y * N + x);
  if (k >= 0) state.planted.splice(k, 1); else state.cleared.push(y * N + x);   // gepflanzter Baum: einfach wieder weg
  if (!free) addResources(t.clear);
  if (typeof onTerrainChanged === 'function') onTerrainChanged(x, y);
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
  // Seit Version 24 kein Essen mehr: wer hungert, muss trotzdem Land für neue Jäger kaufen können (sonst Sackgasse)
  const price = { holz: Math.min(140, 30 + 15 * n), stein: Math.min(140, 20 + 10 * n) };
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
  const b = { type, x, y, rot: (Number(rot) || 0) & 3, build: finished ? 0 : def.time || 0 };
  if (def.isPath) removeSapling(x, y);   // ein Pfad tritt den Setzling nieder
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

// Gebäude „halb im Wasser“ (Fischerplatz, Tongrube, Pfahlbau – Bilder mit Wasserseite je Drehung):
// Die Wasserseite des Bildes liegt auf echten Flussfeldern, die Landseite auf Land.
const halfInWater = def => !!(def && def.needsWater && def.views && def.views.includes('r1'));

// Abstand eines Feldes (lx, ly im Gebäude) von der Wasser-Ecke des Bildes bei Drehung rot
// (0: hinten = kleines x und y, 1: rechts, 2: vorne, 3: links – passend zu WATER_SIDES in bedienung.js)
function waterCornerDist(lx, ly, s, rot) {
  const m = s - 1;
  return rot === 1 ? (m - lx) + ly : rot === 2 ? (m - lx) + (m - ly) : rot === 3 ? lx + (m - ly) : lx + ly;
}

// Warum passt ein Gebäude hier nicht? null = passt. ignore = Gebäude, das gerade verschoben wird.
// rot: Drehung (nur für Gebäude halb im Wasser wichtig; ohne Angabe genügt irgendeine passende Drehung)
function placeProblem(type, x, y, ignore = -1, rot) {
  const def = BUILDINGS[type];
  const s = def.size;
  if (halfInWater(def)) {
    if (rot === undefined || rot === null || rot === false) {
      let first = null;
      for (let r = 0; r < 4; r++) { const p = placeProblem(type, x, y, ignore, r); if (!p) return null; if (first === null) first = p; }
      return first;
    }
    rot = (Number(rot) || 0) & 3;
  }
  let wet = 0, cornerWet = false;
  for (let yy = y; yy < y + s; yy++)
    for (let xx = x; xx < x + s; xx++) {
      if (!inMap(xx, yy)) return 'Außerhalb der Karte';
      if (!isOwned(xx, yy)) return 'Dieses Land gehört dir noch nicht';
      const o = occ[yy * N + xx] - 1;
      if (o >= 0 && o !== ignore) return 'Hier steht schon etwas';
      if (!def.isPath && saplingAt(xx, yy)) return 'Hier wächst ein Setzling – antippen zum Ausreißen';   // Pfade gehen darüber
      const t = terrainAt(xx, yy);
      if (def.onWater) { if (t !== TERRAIN.wasser) return 'Brücken gehen nur über Wasser'; continue; }
      if (t === TERRAIN.wasser && halfInWater(def)) {
        const d = waterCornerDist(xx - x, yy - y, s, rot);
        if (d > s - 1) return 'Nur die Wasserseite darf im Fluss stehen – drehen (↻) oder verschieben';
        wet++; if (d === 0) cornerWet = true;
        continue;
      }
      if (t.blocks) return t === TERRAIN.wasser ? 'Nicht im Wasser – über den Fluss braucht es eine Brücke' : `${t.name} im Weg – antippen zum Räumen`;
    }
  if (halfInWater(def)) {
    // Ältere Spielstände: Wassergebäude am Ufer bleiben an ihrem Platz gültig
    const old = ignore >= 0 && state.buildings[ignore];
    if (old && old.x === x && old.y === y && !wet && touchesWater(x, y, s)) return null;
    if (!cornerWet) return 'Muss halb im Wasser stehen – die Wasserseite in den Fluss setzen';
    if (wet === s * s) return 'Braucht auch etwas Land';
    return null;
  }
  if (def.needsWater && !touchesWater(x, y, s)) return 'Muss am Wasser stehen';
  return null;
}

// Beste passende Drehung für ein Gebäude halb im Wasser (meiste Wasserfelder auf der Wasserseite), sonst -1
function bestWaterRot(type, x, y, ignore = -1) {
  const def = BUILDINGS[type], s = def.size;
  let best = -1, bestN = -1;
  for (let r = 0; r < 4; r++) {
    if (placeProblem(type, x, y, ignore, r)) continue;
    let n = 0;
    for (let ly = 0; ly < s; ly++) for (let lx = 0; lx < s; lx++)
      if (terrainAt(x + lx, y + ly) === TERRAIN.wasser) n += 10 - waterCornerDist(lx, ly, s, r);
    if (n > bestN) { bestN = n; best = r; }
  }
  return best;
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

// ---------------------------------------------------------------------
// Fackeln am Weg: jedes zweite Wegfeld. Ein neues Wegfeld bekommt eine Fackel, wenn kein direkt
// angrenzendes Wegfeld (auch Brücke) schon eine hat. Auf Brücken (Wasser) steht keine Fackel.
// ---------------------------------------------------------------------

function torchNear(x, y, self = null) {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const i = buildingAt(x + dx, y + dy);
    if (i < 0) continue;
    const n = state.buildings[i];
    if (n !== self && BUILDINGS[n.type].isPath && n.torch) return true;
  }
  return false;
}

function wantsTorch(type, x, y) {
  const def = BUILDINGS[type];
  return !!(def && def.isPath && !def.onWater && !torchNear(x, y));
}

function giveTorch(b) {
  if (wantsTorch(b.type, b.x, b.y)) b.torch = 1;
}

// alte Spielstände: einmal in Bau-Reihenfolge nachholen
function assignTorches() {
  for (const b of state.buildings) if (BUILDINGS[b.type].isPath) delete b.torch;
  for (const b of state.buildings) giveTorch(b);
  state.torches = true;
}

// Fackel oder Laterne – je nach Zeitalter
function pathLightStyle() {
  const st = STAGES[stageIndex()] || STAGES[0];
  return (CONFIG.pathLights && CONFIG.pathLights[st.epoch]) || 'fackel';
}
