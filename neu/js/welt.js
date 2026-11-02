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
    wishWait: 0,             // Sekunden, bis der nächste Wunsch des Stammes kommt
    wishesDone: 0,           // so viele Wünsche wurden erfüllt
    huntsDone: 0,            // so oft waren die Jäger auf Mammutjagd
    stage: 'alt',
    pop: CONFIG.start.population,
    yearTime: 0,
    playTime: 0,
    quests: {},              // id → true, wenn abgeholt
    built: {},               // Typ → wie oft fertig gebaut (für Aufträge)
    seen: {},                // Typ → in der Bauleiste schon angesehen (sonst „Neu“)
    daily: { last: '', streak: 0, pending: 0 },   // pending = Tag (1–7), dessen Belohnung noch wartet
    tutorial: 0,             // Schritt im Einstieg, -1 = fertig/übersprungen
    tutorialRewards: {},     // Belohnungen des Einstiegs, die schon gutgeschrieben sind (jede nur einmal)
    mapSize: N,              // Kartengröße beim Speichern (ältere Stände: kleiner, werden beim Laden in die Mitte gelegt)
    mapCore: 0,              // 0 = ganze Karte aus einem Guss; 128 = alte 128er-Karte liegt als Kern in der Mitte (Außenland neu)
    torches: true,           // Wege haben schon Fackeln bekommen (alte Stände: einmal beim Laden nachholen)
    mapGen: 3,               // Art der Kartenerzeugung: 3 = wie 2, See doppelt so breit (Emin); 2 = breiter, kurviger Fluss; 1 = alter Fluss. Alte Stände behalten ihre Art.
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
  const grid = new Float64Array(g * g);
  for (let i = 0; i < grid.length; i++) grid[i] = rng();
  return (x, y) => {
    const gx = x / cell, gy = y / cell;
    const ix = gx | 0, iy = gy | 0;   // (Koordinaten sind nie negativ)
    const ax = gx - ix, ay = gy - iy, fx = ax * ax * (3 - 2 * ax), fy = ay * ay * (3 - 2 * ay);
    const k = iy * g + ix;
    return (grid[k] * (1 - fx) + grid[k + 1] * fx) * (1 - fy) + (grid[k + g] * (1 - fx) + grid[k + g + 1] * fx) * fy;
  };
}

const OLD_N = 128;    // Kantenlänge der alten Karte (Epochia bis 54) – alte Spielstände behalten sie als Kern in der Mitte
let lastOldMap = null;   // Fluss, Gebirge und Rauschen der zuletzt erzeugten alten Karte (fürs Außenland)

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

// Alte Karte (mapGen 1) der Größe n: außen Land mit Wäldern, Wiesen, Felsen, zwei Gebirge in den Ecken, in der Mitte der 64er-Kern.
// Nie die Reihenfolge der Zufallszahlen ändern: Alte Spielstände müssen Feld für Feld dasselbe Gelände bekommen.
function generateTerrain(seed, n = OLD_N) {
  const core = generateCore(seed);
  const off = (n - CORE) / 2;
  const rng = seededRng((seed ^ 0x5bd1e995) >>> 0);
  const t = new Uint8Array(n * n);
  const forest = makeNoise(rng, 11, n), forest2 = makeNoise(rng, 5, n), rocks = makeNoise(rng, 8, n), ridge = makeNoise(rng, 10, n);
  const mountains = [   // Kammlinie x + y = L (oben links bzw. unten rechts), Breite schwankt
    { L: 34 + Math.floor(rng() * 10), w: 4 + rng() * 2 },
    { L: 2 * n - 40 - Math.floor(rng() * 10), w: 3.5 + rng() * 2 },
  ];
  for (let y = 0; y < n; y++) {
    const { rx, width } = riverAt(y - off, core.phase, core.phase2, CORE / 2);
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
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
    for (let x = 0; x < CORE; x++) t[(y + off) * n + x + off] = core.t[y * CORE + x];
  // Für das Außenland: Fluss, Gebirge und Rauschen, damit es am Rand der alten Karte passend weitergeht
  const pts = [];
  for (let yy = -12; yy < n + 12; yy += 0.5) {
    const a = riverAt(yy - off, core.phase, core.phase2, CORE / 2), b = riverAt(yy + 0.5 - off, core.phase, core.phase2, CORE / 2);
    const dx = b.rx - a.rx, len = Math.hypot(dx, 0.5);
    pts.push({ x: a.rx + off + 0.5, y: yy + 0.5, ux: dx / len, uy: 0.5 / len, w: a.width });
  }
  lastOldMap = { t, pts, fall: null, mountains, noise: { forest, forest2, rocks, ridge } };
  return t;
}

// ---------------------------------------------------------------------
// Karte ab Epochia 52 (mapGen 2): breiter Fluss in großen Schleifen, Engstellen, Wasserfall an einer Felsstufe.
// Alte Spielstände behalten generateTerrain (oben) – sonst stünden ihre Gebäude plötzlich im Wasser.
// ---------------------------------------------------------------------

let mapFeatures = { fall: null, lake: null, source: null };   // Wasserfall: { x, y, ux, uy, w } (Mitte, Fließrichtung, halbe Breite); See: { x, y, r }; Quelle: { x, y }

// Mittellinie des Flusses: Die Richtung schwingt hin und her (so mäandern echte Flüsse).
// Ergebnis: Punkte { x, y, ux, uy, w } im Abstand 0,5 Felder, oder null, wenn die Kurve nicht auf die Karte passt.
function riverCurve(rng, n = OLD_N) {
  const c = n / 2 - 0.5;
  const a1 = 1.2 + rng() * 0.25, l1 = 56 + rng() * 22, p1 = rng() * 6.28;
  const a2 = 0.25 + rng() * 0.2, l2 = 22 + rng() * 12, p2 = rng() * 6.28;
  const pw1 = rng() * 6.28, pw2 = rng() * 6.28, narrow = 40 + rng() * 25;
  const pts = [];
  let x = 0, y = -12, sn = 0;
  while (y < n + 12 && sn < 2400) {
    const s = sn * 0.5;
    const th = a1 * Math.sin(6.283 * s / l1 + p1) + a2 * Math.sin(6.283 * s / l2 + p2);
    const ux = Math.sin(th), uy = Math.cos(th);
    let w = 3.3 + 1.1 * Math.sin(s * 0.047 + pw1) + 0.5 * Math.sin(s * 0.13 + pw2);
    const nq = ((s % narrow) / narrow - 0.5) * 2;   // regelmäßig eine Engstelle – dort lohnt sich die Brücke
    w = Math.max(1.8, w - 1.9 * Math.exp(-nq * nq * 40));
    pts.push({ x, y, ux, uy, w });
    x += ux * 0.5; y += uy * 0.5; sn++;
  }
  if (y < n + 12) return null;
  // Waagrecht so schieben, dass der Fluss rechts neben dem Lager vorbeifließt: Abstand zum Ufer mindestens clear
  const clear = 8.5 + rng() * 1.5;
  const cross = pts.reduce((a, q) => (Math.abs(q.y - c) < Math.abs(a.y - c) ? q : a), pts[0]);
  let ox = c + 6 - cross.x;
  for (let k = 0; k < 200; k++, ox += 0.5)
    if (pts.every(q => Math.hypot(q.x + ox - c, q.y - c) - q.w >= clear)) break;
  for (const q of pts) q.x += ox;
  for (const q of pts) if (q.y >= 0 && q.y < n && (q.x < 8 || q.x > n - 8)) return null;
  return pts;
}

// Stelle für den Wasserfall: abseits des Lagers, wo der Fluss im Bild nach unten fließt
function chooseFall(pts, n = OLD_N) {
  const c = n / 2 - 0.5;
  let best = null, bestScore = 0.65;
  for (const q of pts) {
    if (q.y < 8 || q.y > n - 8 || q.x < 12 || q.x > n - 12) continue;
    const d = Math.hypot(q.x - c, q.y - c);
    if (d < 24 || d > 52) continue;
    const score = (q.ux + q.uy) / Math.SQRT2 + (q.y < c ? 0.08 : 0);
    if (score > bestScore) { best = q; bestScore = score; }
  }
  return best;
}

function generateTerrain2(seed, n = OLD_N) {
  const rng = seededRng((seed ^ 0x2f6e2b1) >>> 0);
  const curveRng = seededRng((seed ^ 0x51ed27) >>> 0);
  let pts = null;
  for (let k = 0; k < 60 && !pts; k++) pts = riverCurve(curveRng, n);
  if (!pts) {   // sollte kaum vorkommen: sanfte Kurve rechts vom Lager
    pts = [];
    for (let y = -12; y < n + 12; y += 0.5) pts.push({ x: n / 2 + 18 + Math.sin(y * 0.09) * 6, y, ux: 0, uy: 1, w: 3 });
  }
  const fall = chooseFall(pts, n);
  if (fall) for (const q of pts) {   // am Wasserfall wird der Fluss enger (Felsstufe)
    const d = Math.hypot(q.x - fall.x, q.y - fall.y);
    q.w = Math.min(q.w, 2.4 + Math.min(1, d / 10) * 3);
  }
  // Abstand jedes Feldes zum Ufer: negativ = im Wasser
  const field = new Float32Array(n * n).fill(99);
  for (const q of pts) {
    const r = Math.ceil(q.w + 5);
    for (let y = Math.max(0, Math.floor(q.y) - r); y <= Math.min(n - 1, Math.floor(q.y) + r); y++)
      for (let x = Math.max(0, Math.floor(q.x) - r); x <= Math.min(n - 1, Math.floor(q.x) + r); x++) {
        const v = Math.hypot(x + 0.5 - q.x, y + 0.5 - q.y) - q.w;
        if (v < field[y * n + x]) field[y * n + x] = v;
      }
  }
  const bank = makeNoise(rng, 5, n), beach = makeNoise(rng, 9, n);
  const forest = makeNoise(rng, 11, n), forest2 = makeNoise(rng, 5, n), rocks = makeNoise(rng, 8, n), ridge = makeNoise(rng, 10, n);
  const mountains = [
    { L: 34 + Math.floor(rng() * 10), w: 4 + rng() * 2 },
    { L: 2 * n - 40 - Math.floor(rng() * 10), w: 3.5 + rng() * 2 },
  ];
  const t = new Uint8Array(n * n);
  const mid = n / 2;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
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
      if (Math.hypot(x - fx, y - fy) < 2.3 && rng() < 0.7 && t[y * n + x] !== TERRAIN.wasser.id) t[y * n + x] = TERRAIN.fels.id;
  // Wasserfall: links und rechts der Stufe Gebirge (wird nie abgebaut)
  let oldFall = null;
  if (fall) {
    const px = fall.uy, py = -fall.ux;   // quer zum Fluss
    const w = Math.min(fall.w, 2.4);
    for (const side of [-1, 1])
      for (let a = w + 0.8; a < w + 5; a += 0.5)
        for (let b = -2.2; b <= 1.2; b += 0.5) {
          const x = Math.floor(fall.x + side * px * a + fall.ux * b), y = Math.floor(fall.y + side * py * a + fall.uy * b);
          if (x >= 0 && y >= 0 && x < n && y < n && t[y * n + x] !== TERRAIN.wasser.id && a - w + Math.abs(b) < 4.6) t[y * n + x] = TERRAIN.berg.id;
        }
    oldFall = { x: fall.x, y: fall.y, ux: fall.ux, uy: fall.uy, w: w + 0.6 };
  }
  lastOldMap = { t, pts, fall: oldFall, mountains, noise: { forest, forest2, rocks, ridge, bank, beach } };
  return t;
}

// ---------------------------------------------------------------------
// Große Karte (seit Epochia 55). In der Schrägansicht ist „oben“ die Ecke (0, 0), „unten“ die Ecke (N, N):
// Oben liegt ein zusammenhängendes Gebirge mit der Quelle, der Fluss tritt mit einem Wasserfall aus den Bergen,
// schlängelt sich rechts am Lager vorbei und endet unten in einem großen See.
// Alte Stände (128 × 128) behalten ihr Gelände Feld für Feld als Kern in der Mitte, nur das Außenland ist neu.
// ---------------------------------------------------------------------

// Hat der Stand einen alten Kern? (mapGen 1 hat immer einen)
function hasOldCore() { return state.mapCore === OLD_N || state.mapGen < 2; }

// Lage der großen Dinge, alles im Verhältnis zur Kartengröße
function worldPlan(rng) {
  const lakeR = Math.min(46, 16 + N * 0.05) * (0.9 + rng() * 0.2) * (state.mapGen >= 3 ? 2 : 1);   // ab mapGen 3: doppelte Breite, vierfache Fläche
  const lakeAt = N - 1 - lakeR * 1.55 - rng() * 4, lakeSide = (rng() - 0.5) * N * 0.08;
  const srcAt = N * (0.075 + rng() * 0.02), srcSide = (rng() - 0.5) * N * 0.08;
  return {
    source: { x: srcAt + srcSide, y: srcAt - srcSide },
    lake: { x: lakeAt + lakeSide, y: lakeAt - lakeSide, r: lakeR, p1: rng() * 6.28, p2: rng() * 6.28 },
    foot: N * (0.34 + rng() * 0.04),     // Fuß des Gebirges: x + y
    side: N * (0.8 + rng() * 0.05),      // Gebirge links und rechts in den Ecken: |x − y| darüber
  };
}

function riverWidth(s, p) {
  const w = 3.3 + 1.1 * Math.sin(s * 0.047 + p.pw1) + 0.5 * Math.sin(s * 0.13 + p.pw2);
  const nq = ((s % p.narrow) / p.narrow - 0.5) * 2;   // regelmäßig eine Engstelle – dort lohnt sich die Brücke
  return Math.max(1.8, w - 1.9 * Math.exp(-nq * nq * 40));
}

// Flusslauf von der Quelle zum See: Die Richtung schwingt um die Bilddiagonale (so mäandern echte Flüsse), dann wird die
// Kurve so gedreht und gestreckt, dass sie genau an Quelle und See anschließt, und rechts vom Lager vorbeigeführt.
function bigRiverCurve(rng, plan) {
  const c = N / 2 - 0.5, S = plan.source, E = plan.lake;
  const a0 = 0.35 + rng() * 0.25, l0 = N * (0.8 + rng() * 0.5), p0 = rng() * 6.28;
  const a1 = 1.15 + rng() * 0.25, l1 = 56 + rng() * 22, p1 = rng() * 6.28;
  const a2 = 0.25 + rng() * 0.2, l2 = 22 + rng() * 12, p2 = rng() * 6.28;
  const wp = { pw1: rng() * 6.28, pw2: rng() * 6.28, narrow: 40 + rng() * 25 };
  const want = Math.hypot(E.x - S.x, E.y - S.y);
  const raw = [];
  let x = 0, y = 0, sn = 0, done = 0;
  while (done < want && sn < 40000) {
    const s = sn * 0.5, th = Math.PI / 4 + a0 * Math.sin(6.283 * s / l0 + p0) + a1 * Math.sin(6.283 * s / l1 + p1) + a2 * Math.sin(6.283 * s / l2 + p2);
    raw.push({ x, y, s });
    x += Math.sin(th) * 0.5; y += Math.cos(th) * 0.5; sn++;
    done = (x + y) / Math.SQRT2;
  }
  if (done < want) return null;
  // aufs Ziel abbilden (Drehen + Strecken)
  const tx = E.x - S.x, ty = E.y - S.y, d2 = x * x + y * y;
  const cs = (x * tx + y * ty) / d2, sn2 = (x * ty - y * tx) / d2, scale = Math.hypot(cs, sn2);
  if (scale > 1.35 || scale < 0.7) return null;
  const pts = raw.map(q => ({ x: S.x + q.x * cs - q.y * sn2, y: S.y + q.x * sn2 + q.y * cs, s: q.s }));
  // Am Lager: rechts im Bild (x − y größer) vorbeiführen, mit Abstand zum Ufer. Eine Beule quer zur Diagonale, die außen ausläuft.
  const clear = 8.5 + rng() * 1.5;
  const near = pts.reduce((a, q) => (Math.abs(q.x + q.y - 2 * c) < Math.abs(a.x + a.y - 2 * c) ? q : a), pts[0]);
  const sig = 34 + rng() * 14;
  const lateralNear = ((near.x - c) - (near.y - c)) / Math.SQRT2;
  for (const q of pts) q.w = Math.max(1.5, riverWidth(q.s, wp) * (0.32 + 0.68 * Math.min(1, q.s / (N * 0.16))));
  let push = clear + 5 - lateralNear;
  const shift = (q, d) => { const g = d * Math.exp(-(((q.s - near.s) / sig) ** 2)); return { x: q.x + g / Math.SQRT2, y: q.y - g / Math.SQRT2 }; };
  let cleared = false;
  for (let k = 0; k < 120; k++, push += 0.5) {
    let ok = true;
    for (const q of pts) { const a = shift(q, push); if (Math.hypot(a.x - c, a.y - c) - q.w < clear) { ok = false; break; } }
    if (ok) { cleared = true; break; }
  }
  // Ab mapGen 3: Findet sich kein Abstand zum Lager, neuen Lauf versuchen (sonst schnitte der Schutz ums Lager den Fluss durch).
  if (!cleared && state.mapGen >= 3) return null;
  for (const q of pts) { const a = shift(q, push); q.x = a.x; q.y = a.y; }
  for (const q of pts) if (q.x < 6 || q.y < 4 || q.x > N - 6 || q.y > N - 6) return null;
  let out = pts;
  if (state.mapGen >= 3) {   // Die Beule am Lager zieht Punkte auseinander: Lücken füllen, sonst reißt der Fluss dort ab
    out = [];
    for (let i = 0; i < pts.length; i++) {
      const q = pts[i], n = pts[i + 1];
      out.push(q);
      if (!n) break;
      const gaps = Math.ceil(Math.hypot(n.x - q.x, n.y - q.y) / 0.6);
      for (let g = 1; g < gaps; g++) { const k = g / gaps; out.push({ x: q.x + (n.x - q.x) * k, y: q.y + (n.y - q.y) * k, s: q.s + (n.s - q.s) * k, w: q.w + (n.w - q.w) * k }); }
    }
  }
  for (let i = 0; i < out.length; i++) {
    const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)], l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    out[i].ux = (b.x - a.x) / l; out[i].uy = (b.y - a.y) / l;
  }
  return out;
}

// Fluss als Bogen von P nach Q mit vorgegebenen Richtungen an den Enden, leicht gewunden. Für das Außenland alter Stände.
function linkRiver(P, Q, uP, uQ, wP, wQ, rng) {
  const len = Math.hypot(Q.x - P.x, Q.y - P.y), steps = Math.max(8, Math.ceil(len * 2.4)), out = [];
  const nx = -(Q.y - P.y) / (len || 1), ny = (Q.x - P.x) / (len || 1), l = 58 + rng() * 26, ph = rng() * 6.28, amp = 5 + rng() * 5;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, t2 = t * t, t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2, mp = len * 0.9, env = Math.sin(Math.PI * t);
    const wob = amp * env * env * Math.sin(6.283 * t * len / l + ph);
    out.push({ x: h00 * P.x + h10 * uP.x * mp + h01 * Q.x + h11 * uQ.x * mp + nx * wob, y: h00 * P.y + h10 * uP.y * mp + h01 * Q.y + h11 * uQ.y * mp + ny * wob, w: wP + (wQ - wP) * t });
  }
  for (let i = 0; i < out.length; i++) {
    const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)], m = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    out[i].ux = (b.x - a.x) / m; out[i].uy = (b.y - a.y) / m;
  }
  return out;
}

// Wasserfall: dort, wo der Fluss aus dem Gebirge tritt und im Bild möglichst gerade nach unten fließt
function chooseFootFall(pts, foot) {
  let best = null, bestScore = -1;
  for (const q of pts) {
    const sum = q.x + q.y;
    if (sum < foot - N * 0.1 || sum > foot + N * 0.08) continue;
    const score = (q.ux + q.uy) / Math.SQRT2 - Math.abs(sum - foot) / (N * 0.6);
    if (score > bestScore) { best = q; bestScore = score; }
  }
  return best;
}

// Abstand jedes Feldes zum Ufer von Fluss und See (negativ = im Wasser)
function waterField(lists, lake) {
  const field = new Float32Array(N * N).fill(99);
  for (const pts of lists) for (let n = 0; n < pts.length; n += 3) {   // jeder dritte Punkt (1,5 Felder Abstand) reicht und spart viel Zeit
    const q = pts[n], r = Math.ceil(q.w + 6), fx = Math.floor(q.x), fy = Math.floor(q.y);
    for (let y = Math.max(0, fy - r); y <= Math.min(N - 1, fy + r); y++)
      for (let x = Math.max(0, fx - r); x <= Math.min(N - 1, fx + r); x++) {
        const dx = x + 0.5 - q.x, dy = y + 0.5 - q.y, v = Math.sqrt(dx * dx + dy * dy) - q.w, i = y * N + x;
        if (v < field[i]) field[i] = v;
      }
  }
  const R = Math.ceil(lake.r * 1.45 + 8);
  for (let y = Math.max(0, Math.floor(lake.y) - R); y <= Math.min(N - 1, Math.floor(lake.y) + R); y++)
    for (let x = Math.max(0, Math.floor(lake.x) - R); x <= Math.min(N - 1, Math.floor(lake.x) + R); x++) {
      const dx = x + 0.5 - lake.x, dy = y + 0.5 - lake.y, a = Math.atan2(dy, dx);
      const v = Math.hypot(dx, dy) - lake.r * (1 + 0.17 * Math.sin(2 * a + lake.p1) + 0.09 * Math.sin(3 * a + lake.p2) + 0.05 * Math.sin(5 * a + lake.p1 * 2)), i = y * N + x;
      if (v < field[i]) field[i] = v;
    }
  return field;
}

// Die ganze Karte aus der Spielstand-Zahl
function generateWorld(seed) {
  let core = null;
  if (hasOldCore() || N === OLD_N) {
    const t0 = state.mapGen >= 2 ? generateTerrain2(seed, OLD_N) : generateTerrain(seed, OLD_N);
    if (N === OLD_N) { mapFeatures.fall = lastOldMap.fall; return t0; }
    core = lastOldMap;
  }
  const off = core ? (N - OLD_N) / 2 : 0;
  const rng = seededRng((seed ^ 0x9e3779b9 ^ N) >>> 0);
  const plan = worldPlan(rng);
  let lists, fall = null;
  if (core) {
    // Alter Fluss bleibt, oben und unten wird er bis zur Quelle bzw. zum See weitergeführt
    const mid = core.pts.map(q => ({ ...q, x: q.x + off, y: q.y + off }));
    const a = mid[0], b = mid[mid.length - 1];
    const diag = { x: Math.SQRT1_2, y: Math.SQRT1_2 };
    const toSrc = linkRiver(plan.source, a, diag, { x: a.ux, y: a.uy }, 1.5, a.w, rng);
    const toLake = linkRiver(b, plan.lake, { x: b.ux, y: b.uy }, diag, b.w, Math.max(b.w, 3), rng);
    lists = [toSrc, mid, toLake];
    if (core.fall) mapFeatures.fall = { ...core.fall, x: core.fall.x + off, y: core.fall.y + off };   // alter Wasserfall bleibt, wo er war
    else fall = chooseFootFall(toSrc, plan.foot);
  } else {
    let pts = null;
    for (let k = 0; k < 80 && !pts; k++) pts = bigRiverCurve(rng, plan);
    if (!pts) {   // zur Not: ruhiger Bogen, rechts am Lager vorbei
      const diag = { x: Math.SQRT1_2, y: Math.SQRT1_2 };
      pts = linkRiver(plan.source, plan.lake, diag, diag, 1.5, 3.4, rng);
      for (const q of pts) { const g = 22 * Math.exp(-(((q.x + q.y - N) / (N * 0.3)) ** 2)); q.x += g * Math.SQRT1_2; q.y -= g * Math.SQRT1_2; }
    }
    lists = [pts];
    fall = chooseFootFall(pts, plan.foot);
  }
  let foot = plan.foot;
  if (fall) {
    foot = fall.x + fall.y + 3;
    for (const list of lists) for (const q of list) {   // am Wasserfall wird der Fluss enger (Felsstufe)
      const d = Math.hypot(q.x - fall.x, q.y - fall.y);
      q.w = Math.min(q.w, 2.4 + Math.min(1, d / 10) * 3);
    }
  }
  const lake = plan.lake;
  mapFeatures.lake = { x: lake.x, y: lake.y, r: lake.r };
  mapFeatures.source = { x: plan.source.x, y: plan.source.y };
  const field = waterField(lists, lake);
  // kleiner Quellteich hoch in den Bergen
  const sx = plan.source.x, sy = plan.source.y;
  for (let y = Math.max(0, Math.floor(sy) - 5); y <= Math.min(N - 1, Math.floor(sy) + 5); y++)
    for (let x = Math.max(0, Math.floor(sx) - 5); x <= Math.min(N - 1, Math.floor(sx) + 5); x++) {
      const v = Math.hypot(x + 0.5 - sx, y + 0.5 - sy) - 2.6, i = y * N + x;
      if (v < field[i]) field[i] = v;
    }
  const bank = makeNoise(rng, 5), beach = makeNoise(rng, 9), forest = makeNoise(rng, 11), forest2 = makeNoise(rng, 5),
    rocks = makeNoise(rng, 8), ridge = makeNoise(rng, 10), wide = makeNoise(rng, 42), far = makeNoise(rng, 37);
  const t = new Uint8Array(N * N);
  const mid = N / 2, ON = OLD_N, end = off + ON - 1;
  const tri = v => { const m = ON - 1; return v < 0 ? -v : v > m ? 2 * m - v : v; };
  const gen1 = core && state.mapGen < 2;
  const cn = core ? core.noise : {};
  // Altes Gebirge am Rand des Kerns: läuft als Bergrücken ein Stück ins Außenland und endet dann
  const spurs = core ? core.mountains.map(m => ({ L: m.L + 2 * off, w: m.w })) : [];
  const spurLen = N * 0.12;
  const fx0 = fall ? fall.x : -1e4, fy0 = fall ? fall.y : -1e4;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      let dc = 99, k = 1;
      if (core) {
        dc = Math.max(off - x, x - end, off - y, y - end);
        if (dc <= 0) continue;      // Kern wird unten eingesetzt
        k = Math.min(1, dc / 12);   // Übergang: am Kernrand dasselbe (gespiegelte) Rauschen wie innen, weiter draußen eigenes
      }
      const seam = core && k < 1;
      const cx = seam ? tri(x - off) : 0, cy = seam ? tri(y - off) : 0;
      const nb0 = bank(x, y) - 0.5;
      const nb = gen1 ? nb0 * k : seam ? (cn.bank(cx, cy) - 0.5) * (1 - k) + nb0 * k : nb0;   // alte Karte: Ufer am Kernrand noch glatt
      const f = field[i] + nb * 1.3;
      if (f < 0) { t[i] = TERRAIN.wasser.id; continue; }
      let be = beach(x, y);
      if (seam && cn.beach) be = cn.beach(cx, cy) * (1 - k) + be * k;
      const shore = gen1 ? 1.2 * (1 - k) + (0.9 + be * 2.2) * k : 0.9 + be * 2.2;
      const dLake = (x - lake.x) * (x - lake.x) + (y - lake.y) * (y - lake.y), nearLake = dLake < lake.r * lake.r * 2.9;
      // Gebirge: nur rechnen, wo es sein kann (Rauschen verschiebt die Kante um höchstens etwa 20 Felder)
      let berg = -99;
      const sum = x + y, diff = Math.abs(x - y);
      if (sum < foot + 22) {
        const fd = Math.hypot(x - fx0, y - fy0), damp = fd < 22 ? fd / 22 : 1;   // am Wasserfall liegt der Bergfuß genau an der Stufe
        berg = (foot - sum + (ridge(x, y) - 0.5) * 30 * damp) / Math.SQRT2;
      }
      if (diff > plan.side - 26) berg = Math.max(berg, (diff - plan.side + (far(x, y) - 0.5) * 40) / Math.SQRT2);
      for (const m of spurs) {
        const w = m.w * (1 - Math.min(1, dc / spurLen));
        if (w <= 0 || Math.abs(sum - m.L) > 30) continue;
        let rv = ridge(x, y);
        if (seam) rv = cn.ridge(cx, cy) * (1 - k) + rv * k;
        berg = Math.max(berg, w - Math.abs(sum - m.L + (rv - 0.5) * 18) / Math.SQRT2);
      }
      if (berg > 1.5) t[i] = TERRAIN.berg.id;                                     // im Gebirge: Felsufer statt Strand
      else if (f < shore + (nearLake ? 1.6 : 0)) t[i] = TERRAIN.sand.id;          // mal schmaler, mal breiter Strand, am See breiter
      else if (!core && Math.hypot(x - mid, y - mid) < 7) t[i] = TERRAIN.gras.id;
      else if (berg > 0) t[i] = TERRAIN.berg.id;
      else if (berg > -2.5 && rng() < 0.45 + berg * 0.15) t[i] = TERRAIN.fels.id;
      else if (gen1 && dc < 16 && rng() < 0.45 * (1 - dc / 16)) t[i] = TERRAIN.fels.id;   // alte Karte: viele Felsen am Rand, laufen aus
      else {
        let fo = forest(x, y), fo2 = forest2(x, y), ro = rocks(x, y);
        if (seam) { fo = cn.forest(cx, cy) * (1 - k) + fo * k; fo2 = cn.forest2(cx, cy) * (1 - k) + fo2 * k; ro = cn.rocks(cx, cy) * (1 - k) + ro * k; }
        if (fo * 0.75 + fo2 * 0.25 > 0.6 - (wide(x, y) - 0.5) * 0.14 * k) t[i] = TERRAIN.wald.id;
        else if (ro > 0.8 && rng() < 0.55) t[i] = TERRAIN.fels.id;
        else if (rng() < 0.03) t[i] = TERRAIN.wald.id;
        else t[i] = TERRAIN.gras.id;
      }
    }
  if (core) {
    for (let y = 0; y < ON; y++) t.set(core.t.subarray(y * ON, (y + 1) * ON), (y + off) * N + off);
  } else {
    // Felsgruppe nahe beim Lager (links oben), wie bisher
    const fx = Math.floor(mid - 10 + rng() * 4), fy = Math.floor(mid - 9 + rng() * 4);
    for (let y = fy - 2; y <= fy + 2; y++)
      for (let x = fx - 2; x <= fx + 2; x++)
        if (Math.hypot(x - fx, y - fy) < 2.3 && rng() < 0.7 && t[y * N + x] !== TERRAIN.wasser.id) t[y * N + x] = TERRAIN.fels.id;
  }
  if (fall) {   // links und rechts der Stufe Gebirge (wird nie abgebaut)
    const px = fall.uy, py = -fall.ux, w = Math.min(fall.w, 2.4);
    for (const side of [-1, 1])
      for (let a = w + 0.8; a < w + 5; a += 0.5)
        for (let b = -2.2; b <= 1.2; b += 0.5) {
          const x = Math.floor(fall.x + side * px * a + fall.ux * b), y = Math.floor(fall.y + side * py * a + fall.uy * b);
          if (x >= 0 && y >= 0 && x < N && y < N && t[y * N + x] !== TERRAIN.wasser.id && a - w + Math.abs(b) < 4.6) t[y * N + x] = TERRAIN.berg.id;
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
  const q = new Int32Array(N * N);
  let qn = 0;
  const water = TERRAIN.wasser.id;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      if (terrain[i] !== water) continue;
      if ((x < N - 1 && terrain[i + 1] !== water) || (x > 0 && terrain[i - 1] !== water) || (y < N - 1 && terrain[i + N] !== water) || (y > 0 && terrain[i - N] !== water)) { dist[i] = 1; q[qn++] = i; }
    }
  for (let h = 0; h < qn; h++) {
    const i = q[h], x = i % N, y = (i - x) / N, d = dist[i] + 1;
    if (x < N - 1 && terrain[i + 1] === water && !dist[i + 1]) { dist[i + 1] = d; q[qn++] = i + 1; }
    if (x > 0 && terrain[i - 1] === water && !dist[i - 1]) { dist[i - 1] = d; q[qn++] = i - 1; }
    if (y < N - 1 && terrain[i + N] === water && !dist[i + N]) { dist[i + N] = d; q[qn++] = i + N; }
    if (y > 0 && terrain[i - N] === water && !dist[i - N]) { dist[i - N] = d; q[qn++] = i - N; }
  }
  // weich machen (dreimal mitteln), damit keine eckigen Stufen zu sehen sind – nur die Wasserfelder (auf großer Karte viel schneller)
  const wet = q.subarray(0, qn);
  let cur = dist;
  for (let pass = 0; pass < 3; pass++) {
    const nx = new Float32Array(N * N);
    for (const i of wet) {
      const x = i % N, y = (i - x) / N;
      if (x < 1 || y < 1 || x >= N - 1 || y >= N - 1) continue;
      nx[i] = (cur[i] * 2 + cur[i - 1] + cur[i + 1] + cur[i - N] + cur[i + N]) / 6;
    }
    cur = nx;
  }
  // Alte Stände: dasselbe Rauschen wie auf der alten Karte (Sandbänke bleiben, wo sie waren); im Außenland gespiegelt, also ohne Sprung
  const rng = seededRng((state.seed ^ 0x3c6ef372) >>> 0);
  const old = hasOldCore(), n = old ? OLD_N : N, off = old ? (N - OLD_N) / 2 : 0;
  const tri = v => { const m = n - 1, k = ((v % (2 * m)) + 2 * m) % (2 * m); return k > m ? 2 * m - k : k; };
  const deep0 = makeNoise(rng, 7, n), shoal0 = makeNoise(rng, 6, n);
  waterDepth = new Float32Array(N * N);
  waterShoal = new Float32Array(N * N);
  const step = (a, b, v) => { const k = Math.max(0, Math.min(1, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
  for (const i of wet) {
    const x = i % N, y = (i - x) / N, nx = tri(x - off), ny = tri(y - off);
    waterDepth[i] = cur[i] * (0.75 + deep0(nx, ny) * 0.5);
    waterShoal[i] = step(0.68, 0.8, shoal0(nx, ny)) * step(1.6, 2.6, cur[i]) * (1 - step(6, 9, cur[i]));   // Sandbank mitten im breiten Fluss (nicht in der Seemitte)
  }
}

let baseTerrain = null;   // Gelände, wie es aus der Spielstand-Zahl entsteht (ohne Fällen und Pflanzen)

let terrainVersion = 0;   // zählt Geländeänderungen (für gemerkte Werte wie terrainBonus)
function buildTerrain() {
  terrainVersion++;
  mapFeatures = { fall: null, lake: null, source: null };
  baseTerrain = generateWorld(state.seed);
  terrain = baseTerrain.slice();
  computeWaterDepth();
  for (const i of state.cleared) if (i >= 0 && i < N * N) terrain[i] = TERRAIN.gras.id;
  for (const i of state.planted) if (i >= 0 && i < N * N) terrain[i] = TERRAIN.wald.id;
  if (typeof chunks !== 'undefined') chunks = [];   // andere Karte: Boden ganz neu
  refreshLand();
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

// Eigenes Land als Feld-Maske: 2 = gehört dir, 1 = gleich daneben (schaut unter dem Wolkenrand hervor), 0 = unter den Wolken.
// landBox = Rechteck ums eigene Land (Felder). So kostet das Zeichnen nichts für alles, was unter den Wolken liegt.
let landMask = null;
let landBox = { x0: 0, y0: 0, x1: -1, y1: -1 };
let landVersion = 0;   // zählt Änderungen am Land (Wolkendecke neu malen)
function refreshLand() {
  if (!state) return;
  landVersion++;
  landMask = landMask || new Uint8Array(N * N);
  landMask.fill(0);
  const ps = CONFIG.plotSize, m = 2;
  let bx0 = N, by0 = N, bx1 = -1, by1 = -1;
  for (let p = 0; p < state.plots.length; p++) {
    if (state.plots[p] !== 1) continue;
    const px = (p % PLOTS) * ps, py = Math.floor(p / PLOTS) * ps;
    bx0 = Math.min(bx0, px); by0 = Math.min(by0, py); bx1 = Math.max(bx1, px + ps - 1); by1 = Math.max(by1, py + ps - 1);
    for (let y = Math.max(0, py - m); y < Math.min(N, py + ps + m); y++) landMask.fill(1, y * N + Math.max(0, px - m), y * N + Math.min(N, px + ps + m));
  }
  for (let p = 0; p < state.plots.length; p++) {
    if (state.plots[p] !== 1) continue;
    const px = (p % PLOTS) * ps, py = Math.floor(p / PLOTS) * ps;
    for (let y = py; y < py + ps; y++) landMask.fill(2, y * N + px, y * N + px + ps);
  }
  landBox = bx1 < 0 ? { x0: 0, y0: 0, x1: -1, y1: -1 } : { x0: Math.max(0, bx0 - m), y0: Math.max(0, by0 - m), x1: Math.min(N - 1, bx1 + m), y1: Math.min(N - 1, by1 + m) };
}
// Sichtbereich aufs eigene Land begrenzen (leer, wenn man gerade nur Wolken sieht)
function clipToLand(r) {
  return { x0: Math.max(r.x0, landBox.x0), y0: Math.max(r.y0, landBox.y0), x1: Math.min(r.x1, landBox.x1), y1: Math.min(r.y1, landBox.y1) };
}

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
  refreshLand();
  if (typeof liftClouds === 'function') liftClouds(p);   // die Wolken darüber lösen sich sichtbar auf
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
  if (reached) reached.fill(0); else reached = new Uint8Array(N * N);
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
      if (t === TERRAIN.wasser && def.stilts) { wet++; continue; }   // Säulen stehen im echten Fluss
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
  if (def.stilts) {
    // Ältere Spielstände: Fischerplätze am Ufer bleiben an ihrem Platz gültig (die Säulen stehen dann an Land)
    const old = ignore >= 0 && state.buildings[ignore];
    if (old && old.x === x && old.y === y && touchesWater(x, y, s)) return null;
    if (!wet) return 'Muss mit den Säulen im Fluss stehen';
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
