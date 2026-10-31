'use strict';
// Epochia – Spiellogik: Waren, Bauen, Produktion, Einwohner, Bedürfnisse, Forschung, Aufträge, Belohnung.
// Kein Zeichnen und keine Seite hier – darum laufen Tests und Bot ohne Browser.

// Kleine Nachrichten an Oberfläche und Einstieg (z. B. 'placed', 'finished', 'researchDone')
const listeners = {};
function on(event, fn) { (listeners[event] ||= []).push(fn); }
function emit(event, data) { (listeners[event] || []).forEach(fn => fn(data)); }

// ---------------------------------------------------------------------
// Waren
// ---------------------------------------------------------------------

function storageCap() {
  let cap = 0;
  state.buildings.forEach((b, i) => { if (!b.build && BUILDINGS[b.type].storage && isConnected(i)) cap += BUILDINGS[b.type].storage; });
  return Math.round(Math.max(cap, CONFIG.baseStorage) * (1 + techSum('storage')));
}

function canAfford(cost) {
  return Object.entries(cost || {}).every(([id, n]) => (state.res[id] || 0) >= n - 1e-9);
}

function payCost(cost) {
  for (const [id, n] of Object.entries(cost || {})) state.res[id] = Math.max(0, (state.res[id] || 0) - n);
}

// Waren dazugeben (höchstens bis zum Lagerplatz – was schon darüber liegt, bleibt)
function addResources(amounts, factor = 1) {
  const cap = storageCap();
  for (const [id, n] of Object.entries(amounts || {})) {
    const have = state.res[id] || 0;
    state.res[id] = have >= cap ? have : Math.min(cap, have + n * factor);
  }
}

function missingText(cost) {
  const parts = Object.entries(cost || {})
    .filter(([id, n]) => (state.res[id] || 0) < n)
    .map(([id, n]) => `${Math.ceil(n - (state.res[id] || 0))} ${RESOURCES[id].icon}`);
  return parts.length ? 'Es fehlt: ' + parts.join(' ') : '';
}

function formatAmounts(amounts) {
  return Object.entries(amounts || {}).map(([id, n]) => `${Math.round(n)} ${RESOURCES[id].icon}`).join('  ');
}

function formatTime(sec) {
  sec = Math.max(0, Math.ceil(sec));
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60) return s ? `${m}:${String(s).padStart(2, '0')} min` : `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

// ---------------------------------------------------------------------
// Forschung: Wirkungen
// ---------------------------------------------------------------------

function stageIndex(id = state.stage) { return STAGES.findIndex(s => s.id === id); }
function stageReached(id) { return stageIndex() >= stageIndex(id || 'alt'); }

function techSum(key, sub) {
  let sum = 0;
  for (const id of Object.keys(state.techs)) {
    const e = TECHS[id] && TECHS[id].effect;
    if (!e || e[key] === undefined) continue;
    sum += sub === undefined ? (typeof e[key] === 'number' ? e[key] : 0) : (e[key][sub] || 0);
  }
  return sum;
}

function isUnlocked(type) {
  const req = BUILDINGS[type].requires;
  return !req || !!state.techs[req];
}

function housingOf(type) {
  const def = BUILDINGS[type];
  return def.housing ? def.housing + techSum('housing', type) : 0;
}

function warmthRadius(def) {
  return def.warmth ? def.warmth + techSum('warmth') : 0;
}

// ---------------------------------------------------------------------
// Bauleiste: je Linie nur die neueste freigeschaltete Stufe
// ---------------------------------------------------------------------

function barEntries() {
  const lines = new Map();
  for (const [type, def] of Object.entries(BUILDINGS)) {
    if (def.buildable === false || def.upgradeOnly) continue;
    const list = lines.get(def.line) || [];
    list.push(type);
    lines.set(def.line, list);
  }
  const result = [];
  for (const list of lines.values()) {
    const unlocked = list.filter(isUnlocked);
    if (unlocked.length) {
      result.push({ type: unlocked.sort((a, b) => BUILDINGS[b].tier - BUILDINGS[a].tier)[0], locked: false });
    } else {
      // noch nichts freigeschaltet: die erste Stufe gesperrt zeigen – aber nur, wenn ihre Forschung schon in diesem
      // Zeitalter zu haben ist (Gebäude späterer Zeitalter erscheinen erst mit dem Aufbruch dorthin)
      const first = list.sort((a, b) => BUILDINGS[a].tier - BUILDINGS[b].tier)[0];
      const req = BUILDINGS[first].requires;
      if (!req || stageReached(TECHS[req].stage)) result.push({ type: first, locked: true });
    }
  }
  return result;
}

function lockText(type) {
  const req = BUILDINGS[type].requires;
  if (!req || state.techs[req]) return '';
  if (!stageReached(TECHS[req].stage)) return `🔒 Kommt in der ${STAGES[stageIndex(TECHS[req].stage)].name}`;
  return `🔒 Erst „${TECHS[req].name}“ erforschen`;
}

// ---------------------------------------------------------------------
// Bauen, Verschieben, Abreißen, Weiterentwickeln
// ---------------------------------------------------------------------

function constructionCount() {
  return state.buildings.filter(b => b.build > 0).length;
}

function buildProblem(type, x, y, ignore = -1) {
  const def = BUILDINGS[type];
  if (!def || def.buildable === false) return 'Kann man nicht bauen';
  if (!isUnlocked(type)) return lockText(type);
  const p = placeProblem(type, x, y, ignore);
  if (p) return p;
  if (!canAfford(def.cost)) return missingText(def.cost);
  if (def.time > 0 && constructionCount() >= CONFIG.maxConstructions)
    return `Schon ${CONFIG.maxConstructions} Baustellen – warte, bis eine fertig ist`;
  return null;
}

// Baut ein Gebäude (mit Baustelle). Gibt einen Fehlertext zurück oder null.
function placeBuilding(type, x, y, rot = false) {
  const problem = buildProblem(type, x, y);
  if (problem) return problem;
  const def = BUILDINGS[type];
  payCost(def.cost);
  const b = addBuilding(type, x, y, rot);
  setOccupied(b, state.buildings.length);
  if (!b.build) finishBuilding(b);
  emit('placed', b);
  return null;
}

function finishBuilding(b) {
  b.build = 0;
  state.built[b.type] = (state.built[b.type] || 0) + 1;
  emit('finished', b);
}

function moveBuilding(i, x, y, rot) {
  const b = state.buildings[i];
  if (!b) return 'Gebäude fehlt';
  const p = placeProblem(b.type, x, y, i);
  if (p) return p;
  setOccupied(b, 0);
  b.x = x; b.y = y; b.rot = (Number(rot) || 0) & 3;
  setOccupied(b, i + 1);
  emit('moved', b);
  return null;
}

// Fehlenden Trampelpfad zum Lagerfeuer automatisch legen (1 Holz je Feld)
function buildRoute(i) {
  const route = pathRoute(i);
  if (route === null) return 'Kein Weg möglich – Bäume, Felsen oder Wasser im Weg';
  if (!route.length) return null;
  const cost = { holz: route.reduce((sum, [x, y]) => sum + BUILDINGS[wayTypeAt(x, y)].cost.holz, 0) };
  if (!canAfford(cost)) return missingText(cost);
  for (const [x, y] of route) placeBuilding(wayTypeAt(x, y), x, y);
  return null;
}

function refundOf(b) {
  const def = BUILDINGS[b.type];
  const out = {};
  for (const [id, n] of Object.entries(def.cost || {})) out[id] = Math.floor(n * CONFIG.refundShare);
  return out;
}

// Pause: Das Gebäude gibt seine Arbeiter frei, sie gehen ans nächste Gebäude, das Leute braucht
function togglePause(i) {
  const b = state.buildings[i];
  if (!b || !BUILDINGS[b.type].workers) return false;
  if (b.paused) delete b.paused; else b.paused = true;
  recalcStats();
  return true;
}

function demolish(i) {
  const b = state.buildings[i];
  if (!b || BUILDINGS[b.type].buildable === false) return false;
  addResources(refundOf(b));
  state.buildings.splice(i, 1);
  rebuildOccupancy();
  state.pop = Math.min(state.pop, Math.max(housingTotal(), 1));
  emit('demolished', b);
  return true;
}

function upgradeTarget(b) {
  const to = BUILDINGS[b.type].upgradeTo;
  return to && BUILDINGS[to] ? to : null;
}

function upgradeProblem(i) {
  const b = state.buildings[i];
  const to = b && upgradeTarget(b);
  if (!to) return 'Keine Weiterentwicklung';
  if (b.build) return 'Erst fertig bauen';
  if (!isUnlocked(to)) return lockText(to);
  const p = placeProblem(to, b.x, b.y, i);
  if (p) return BUILDINGS[to].size > BUILDINGS[b.type].size ? `Braucht mehr Platz (${BUILDINGS[to].size}×${BUILDINGS[to].size}): ${p}` : p;
  if (!canAfford(BUILDINGS[to].cost)) return missingText(BUILDINGS[to].cost);
  if (constructionCount() >= CONFIG.maxConstructions) return `Schon ${CONFIG.maxConstructions} Baustellen`;
  return null;
}

function upgradeBuilding(i) {
  const problem = upgradeProblem(i);
  if (problem) return problem;
  const b = state.buildings[i];
  const to = upgradeTarget(b);
  payCost(BUILDINGS[to].cost);
  setOccupied(b, 0);
  b.type = to;
  b.build = BUILDINGS[to].time;
  setOccupied(b, i + 1);
  emit('placed', b);
  return null;
}

function updateConstruction(dt) {
  for (const b of state.buildings) {
    if (b.build > 0) {
      b.build -= dt;
      if (b.build <= 0) finishBuilding(b);
    }
  }
}

// ---------------------------------------------------------------------
// Einwohner, Arbeit, Bedürfnisse
// ---------------------------------------------------------------------

let stats = { housing: 0, jobs: 0, workers: 0, happiness: 100, needs: {}, staff: [], rates: {} };

function housingTotal() {
  let n = 0;
  state.buildings.forEach((b, i) => { if (!b.build && isConnected(i)) n += housingOf(b.type); });
  return n;
}

function activeNeeds() {
  return NEEDS.filter(n => stageReached(n.from));
}

// Anteil der Wohnplätze, die eine Quelle (Wärme oder Glaube) im Umkreis haben
function areaCoverage(key) {
  const sources = state.buildings.filter((b, i) => !b.build && BUILDINGS[b.type][key] && isConnected(i));
  let total = 0, covered = 0;
  for (const [i, h] of state.buildings.entries()) {
    const cap = h.build || !isConnected(i) ? 0 : housingOf(h.type);
    if (!cap) continue;
    total += cap;
    if (sources.some(s => {
      const def = BUILDINGS[s.type];
      const r = key === 'warmth' ? warmthRadius(def) : def.belief;
      return distance(s, h) <= r + BUILDINGS[h.type].size / 2;
    })) covered += cap;
  }
  return total ? covered / total : 1;
}

function recalcStats() {
  const s = { housing: housingTotal(), jobs: 0, workers: 0, happiness: 100, needs: {}, staff: [], rates: {} };
  // Arbeiter verteilen: zuerst die Nahrung, dann alles andere in Bau-Reihenfolge
  const order = state.buildings.map((b, i) => i).filter(i => {
    const b = state.buildings[i];
    return !b.build && !b.paused && BUILDINGS[b.type].workers && isConnected(i);
  });
  order.sort((a, b) => foodFirst(state.buildings[b]) - foodFirst(state.buildings[a]));
  let free = Math.floor(state.pop);
  for (const i of order) {
    const want = BUILDINGS[state.buildings[i].type].workers;
    s.jobs += want;
    const got = Math.min(want, free);
    s.staff[i] = got;
    free -= got;
  }
  s.workers = Math.floor(state.pop) - free;
  // Bedürfnisse
  let sum = 0;
  const needs = activeNeeds();
  for (const n of needs) {
    let met;
    if (n.kind === 'stock') met = (state.res[n.id] || 0) > 0.01 ? 1 : 0;
    else met = areaCoverage(n.id === 'waerme' ? 'warmth' : 'belief');
    s.needs[n.id] = met;
    sum += met;
  }
  s.needsHappy = needs.length ? Math.round(100 * sum / needs.length) : 100;
  s.weatherHappy = Math.round(effectHappy());
  s.happiness = Math.max(0, Math.min(100, s.needsHappy + s.weatherHappy));
  stats = s;
  return s;
}

function foodFirst(b) {
  return BUILDINGS[b.type].produces && BUILDINGS[b.type].produces.nahrung ? 1 : 0;
}

function happinessFactor() { return 0.5 + 0.5 * stats.happiness / 100; }

// ---------------------------------------------------------------------
// Tag und Nacht, Wetter – alles aus der Spielzeit berechnet, darum muss nichts gespeichert werden
// ---------------------------------------------------------------------

// Anteil des Tages: 0 = Sonnenaufgang. Tag bis 0,60, Abend bis 0,70, Nacht bis 0,92, dann Morgen.
function dayPart() { return ((state.playTime % CONFIG.daySeconds) + CONFIG.daySeconds) % CONFIG.daySeconds / CONFIG.daySeconds; }

// Wie dunkel ist es? 0 = heller Tag, 1 = tiefe Nacht (weicher Übergang am Abend und am Morgen)
function darkness(p = dayPart()) {
  const smooth = k => k * k * (3 - 2 * k);
  if (p < 0.60) return 0;
  if (p < 0.70) return smooth((p - 0.60) / 0.10);
  if (p < 0.92) return 1;
  return 1 - smooth((p - 0.92) / 0.08);
}

function timeOfDay(p = dayPart()) {
  if (p < 0.08 || p >= 0.92) return { name: 'Morgen', icon: '🌅' };
  if (p < 0.60) return { name: 'Tag', icon: '☀️' };
  if (p < 0.70) return { name: 'Abend', icon: '🌇' };
  return { name: 'Nacht', icon: '🌙' };
}

// Wetter im Abschnitt Nummer slot (je CONFIG.weatherSeconds): gewürfelt aus Spielstand-Zahl und Abschnitt,
// gewichtet nach der Jahreszeit am Anfang des Abschnitts
function weatherInSlot(slot) {
  const start = slot * CONFIG.weatherSeconds;
  const year = CONFIG.yearSeconds;
  const yearAt = (((state.yearTime - (state.playTime - start)) % year) + year) % year;
  const si = Math.floor(yearAt / (year / 4));
  let r = hash(slot * 7 + 3, (state.seed % 9973) + 11);
  for (const [id, w] of Object.entries(WEATHERS)) {
    r -= w.chance[si];
    if (r < 0) return id;
  }
  return 'klar';
}

// Aktuelles Wetter mit Stärke k (0–1): am Anfang und Ende eines Abschnitts zieht es auf bzw. ab
function currentWeather() {
  const len = CONFIG.weatherSeconds, ramp = 10;
  const slot = Math.floor(state.playTime / len), s = state.playTime - slot * len;
  const id = weatherInSlot(slot);
  let k = 1;
  if (s < ramp && weatherInSlot(slot - 1) !== id) k = Math.min(k, s / ramp);
  if (len - s < ramp && weatherInSlot(slot + 1) !== id) k = Math.min(k, (len - s) / ramp);
  return { id, k: Math.max(0, k), ...WEATHERS[id] };
}

// Schneedecke: wächst zu Winterbeginn, schmilzt am Anfang des Frühlings (0–1)
function snowCover() {
  const q = CONFIG.yearSeconds / 4, t = state.yearTime % CONFIG.yearSeconds;
  if (t >= 3 * q) return Math.min(1, (t - 3 * q) / 40);
  if (t < 30 && state.playTime > t + 1) return 1 - t / 30;   // nur wenn schon ein Winter war (nicht beim Spielstart)
  return 0;
}

function seasonIndex() { return Math.floor((state.yearTime % CONFIG.yearSeconds) / (CONFIG.yearSeconds / 4)); }
function season() { return SEASONS[seasonIndex()]; }

// ---------------------------------------------------------------------
// Wirkung von Wetter und Naturkatastrophen
// ---------------------------------------------------------------------

// Aktuelle Wirkungen als Liste { name, icon, effect, k } (k = Stärke 0–1, Wetter zieht langsam auf und ab)
function activeEffects() {
  const list = [];
  const w = currentWeather();
  if (w.effect) list.push({ name: w.name, icon: w.icon, effect: w.effect, k: w.k });
  if (state.disaster && DISASTERS[state.disaster.id]) { const d = DISASTERS[state.disaster.id]; list.push({ name: d.name, icon: d.icon, effect: d, k: 1, disaster: true }); }
  return list;
}

// Faktor für ein Gebäude durch Wetter und Katastrophe (1 = keine Wirkung)
function effectFactor(type) {
  let f = 1;
  for (const { effect: e, k } of activeEffects()) {
    let g = 1;
    if (e.buildings && e.buildings[type] !== undefined) g = e.buildings[type];
    else if (e.outdoor !== undefined && OUTDOOR_WORK.includes(type)) g = e.outdoor;
    if (e.water !== undefined && BUILDINGS[type].needsWater) g = Math.min(g, e.water);
    if (e.workers !== undefined && BUILDINGS[type].workers) g *= e.workers;
    f *= 1 + (g - 1) * k;
  }
  return f;
}

function effectHappy() { return activeEffects().reduce((sum, { effect: e, k }) => sum + (e.happy || 0) * k, 0); }
function effectFood() { return activeEffects().reduce((m, { effect: e, k }) => m * (1 + ((e.food || 1) - 1) * k), 1); }
function effectGrowthStopped() { return activeEffects().some(({ effect: e, k }) => e.grow === false && k > 0.5); }

// Naturkatastrophen: sehr selten, dafür heftig
function disasterRandom() { return Math.random(); }

function updateDisaster(dt) {
  const c = CONFIG.disaster;
  if (state.disaster) {
    state.disaster.left -= dt;
    if (state.disaster.left <= 0) { const id = state.disaster.id; state.disaster = null; state.disasterCalm = 0; emit('disasterEnded', id); }
    return;
  }
  state.disasterCalm = (state.disasterCalm || 0) + dt;
  if (state.playTime < c.graceMinutes * 60 || state.disasterCalm < c.pauseMinutes * 60 || state.tutorial >= 0) return;
  if (disasterRandom() >= c.perHour * dt / 3600) return;
  const si = seasonIndex();
  const ids = Object.keys(DISASTERS).filter(id => DISASTERS[id].seasons.includes(si));
  if (ids.length) startDisaster(ids[Math.floor(disasterRandom() * ids.length)]);
}

function startDisaster(id) {
  const d = DISASTERS[id];
  state.disaster = { id, left: d.minutes * 60 };
  for (const [res, share] of Object.entries(d.lose || {})) state.res[res] = (state.res[res] || 0) * (1 - share);
  if (d.burnTrees) burnForest(d.burnTrees);
  emit('disaster', id);
}

let lastBurnt = [];

// Waldbrand: ein zusammenhängendes Waldstück nahe der Siedlung brennt ab
function burnForest(count) {
  const c = Math.floor(N / 2);
  const trees = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (terrain[y * N + x] === TERRAIN.wald.id && !occ[y * N + x]) trees.push([x, y]);
  if (!trees.length) return [];
  trees.sort((a, b) => Math.hypot(a[0] - c, a[1] - c) - Math.hypot(b[0] - c, b[1] - c));
  const [sx, sy] = trees[Math.floor(disasterRandom() * Math.min(trees.length, 40))];
  trees.sort((a, b) => Math.hypot(a[0] - sx, a[1] - sy) - Math.hypot(b[0] - sx, b[1] - sy));
  const burnt = trees.slice(0, count);
  for (const [x, y] of burnt) clearTile(x, y, true);
  lastBurnt = burnt;   // nur fürs Bild (Rauch über der Brandstelle)
  return burnt;
}

function terrainBonus(b) {
  const bonus = BUILDINGS[b.type].bonus;
  if (!bonus) return 0;
  const n = countTerrainNear(b.x, b.y, BUILDINGS[b.type].size, TERRAIN[bonus.terrain].id, CONFIG.bonusRadius);
  return Math.min(bonus.max, n * bonus.perTile);
}

// Faktor für die Produktion eines Gebäudes (ohne Rohstoff-Mangel)
function outputFactor(i) {
  const b = state.buildings[i];
  const def = BUILDINGS[b.type];
  if (b.build || !isConnected(i)) return 0;
  const staffShare = def.workers ? (stats.staff[i] || 0) / def.workers : 1;
  const seasonF = SEASON_FACTORS[b.type] ? SEASON_FACTORS[b.type][seasonIndex()] : 1;
  return staffShare * seasonF * effectFactor(b.type) * happinessFactor() * (1 + terrainBonus(b)) * (1 + techSum('bonus', b.type));
}

// Was ein Gebäude je Minute herstellt (für Anzeige und Logik)
function outputPerMinute(i) {
  const def = BUILDINGS[state.buildings[i].type];
  const f = outputFactor(i);
  const out = {};
  for (const [id, n] of Object.entries(def.produces || {})) out[id] = n * f;
  return out;
}

// ---------------------------------------------------------------------
// Bäume: Holzsammler fällen sie nach und nach, die Pflanzerin setzt Setzlinge, die zu Bäumen wachsen
// ---------------------------------------------------------------------

// Nächster Baum am Gebäude (im Umkreis), oder null
function nearestTree(b, radius) {
  const s = BUILDINGS[b.type].size, cx = b.x + s / 2, cy = b.y + s / 2;
  let best = null, bestD = Infinity;
  for (let y = Math.floor(cy - radius); y <= cy + radius; y++)
    for (let x = Math.floor(cx - radius); x <= cx + radius; x++) {
      if (!inMap(x, y) || terrain[y * N + x] !== TERRAIN.wald.id || occ[y * N + x]) continue;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) + hash(x * 3 + 1, y) * 0.8;
      if (d < bestD && d <= radius + 0.8) { best = [x, y]; bestD = d; }
    }
  return best;
}

// Holz gesammelt → ist genug für einen Baum zusammen, fällt der nächste Baum um
function chopTrees(b, wood) {
  b.chop = (b.chop || 0) + wood;
  const c = CONFIG.trees;
  while (b.chop >= c.woodPerTree) {
    b.chop -= c.woodPerTree;
    const t = nearestTree(b, c.treeRadius);
    if (!t) { b.chop = 0; return; }   // kein Baum mehr: nur noch Äste und Fallholz
    clearTile(t[0], t[1], true);
    emit('treeFelled', { x: t[0], y: t[1] });
  }
}

function updateTrees(dt) {
  const c = CONFIG.trees;
  // Pflanzerinnen setzen Setzlinge auf freie Wiese in der Nähe
  state.buildings.forEach((b, i) => {
    const def = BUILDINGS[b.type];
    if (!def.plants || b.build || b.paused || !isConnected(i)) return;
    b.plant = (b.plant || 0) + dt * outputFactor(i);
    if (b.plant < c.plantSeconds) return;
    b.plant -= c.plantSeconds;
    const spot = plantSpot(b, c.plantRadius);
    if (spot !== null) { state.saplings.push([spot, 0]); emit('planted', spot); }
    else b.plant = 0;
  });
  // Setzlinge wachsen; der Winter hält sie auf
  const grow = seasonIndex() === 3 ? 0.3 : 1;
  let changed = false;
  for (const sp of state.saplings) sp[1] += dt * grow;
  state.saplings = state.saplings.filter(([i, age]) => {
    if (age < c.growSeconds) return true;
    if (occ[i] || terrain[i] !== TERRAIN.gras.id) return false;
    terrain[i] = TERRAIN.wald.id;
    const k = state.cleared.indexOf(i);
    if (k >= 0) state.cleared.splice(k, 1); else state.planted.push(i);
    changed = true;
    return false;
  });
  if (changed && typeof onTerrainChanged === 'function') onTerrainChanged();
}

// Freie Wiese für einen Setzling: nah an der Pflanzerin, lieber neben schon vorhandenem Wald
function plantSpot(b, radius) {
  const s = BUILDINGS[b.type].size, cx = b.x + s / 2, cy = b.y + s / 2;
  let best = null, bestD = Infinity;
  for (let y = Math.floor(cy - radius); y <= cy + radius; y++)
    for (let x = Math.floor(cx - radius); x <= cx + radius; x++) {
      if (!inMap(x, y) || terrain[y * N + x] !== TERRAIN.gras.id || occ[y * N + x] || saplingAt(x, y) || !isOwned(x, y)) continue;
      if (x >= b.x - 1 && x <= b.x + s && y >= b.y - 1 && y <= b.y + s) continue;   // direkt am Haus bleibt frei (Weg)
      const forest = countTerrainNear(x, y, 1, TERRAIN.wald.id, 1);
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - forest * 0.6 + hash(x, y + 7) * 0.5;
      if (d < bestD && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= radius + 0.8) { best = y * N + x; bestD = d; }
    }
  return best;
}

function updateProduction(dt) {
  const rates = {};
  // flows[Ware] = { in: { Gebäudetyp: je Minute }, out: { Verbraucher: je Minute } } – für das Info-Fenster
  const flows = {};
  const flow = (id, dir, who, n) => { const f = (flows[id] ||= { in: {}, out: {} }); f[dir][who] = (f[dir][who] || 0) + n; };
  state.buildings.forEach((b, i) => {
    const def = BUILDINGS[b.type];
    if (b.build || !def.produces) return;
    let f = outputFactor(i);
    if (f <= 0) return;
    if (def.consumes) {
      // fehlt ein Rohstoff, läuft das Gebäude nur so weit, wie er reicht
      for (const [id, n] of Object.entries(def.consumes)) {
        const need = n * f * dt / 60;
        if (need > 0) f = Math.min(f, f * (state.res[id] || 0) / need);
      }
      for (const [id, n] of Object.entries(def.consumes)) {
        state.res[id] = Math.max(0, (state.res[id] || 0) - n * f * dt / 60);
        rates[id] = (rates[id] || 0) - n * f;
        flow(id, 'out', b.type, n * f);
      }
    }
    for (const [id, n] of Object.entries(def.produces)) { rates[id] = (rates[id] || 0) + n * f; flow(id, 'in', b.type, n * f); }
    addResources(def.produces, f * dt / 60);
    if (def.fellsTrees) chopTrees(b, (def.produces.holz || 0) * f * dt / 60);
  });
  updateTrees(dt);
  // Einwohner essen und verbrauchen Waren
  const eat = state.pop * CONFIG.foodPerPerson * effectFood();
  state.res.nahrung = Math.max(0, state.res.nahrung - eat * dt / 60);
  rates.nahrung = (rates.nahrung || 0) - eat;
  flow('nahrung', 'out', '__pop', eat);
  for (const n of activeNeeds()) {
    if (n.kind !== 'stock' || n.id === 'nahrung') continue;
    const use = state.pop * CONFIG.goodsPerPerson;
    state.res[n.id] = Math.max(0, (state.res[n.id] || 0) - use * dt / 60);
    rates[n.id] = (rates[n.id] || 0) - use;
    flow(n.id, 'out', '__pop', use);
  }
  stats.rates = rates;
  stats.flows = flows;
}

let growthTimer = 0;

function updatePopulation(dt) {
  const room = stats.housing - state.pop;
  if (room < 0) state.pop = stats.housing;
  if (room > 0 && state.res.nahrung > 1 && stats.happiness >= CONFIG.growthMinHappy && !effectGrowthStopped()) {
    growthTimer += dt;
    while (growthTimer >= CONFIG.growthSeconds && state.pop < stats.housing) {
      growthTimer -= CONFIG.growthSeconds;
      state.pop++;
      emit('grew', state.pop);
    }
  } else {
    growthTimer = Math.min(growthTimer, CONFIG.growthSeconds);
  }
}

// ---------------------------------------------------------------------
// Forschung
// ---------------------------------------------------------------------

function techStatus(id) {
  if (state.techs[id]) return 'done';
  if (state.research && state.research.id === id) return 'running';
  return TECHS[id].requires.every(r => state.techs[r]) ? 'available' : 'locked';
}

function researchProblem(id) {
  const t = TECHS[id];
  const status = techStatus(id);
  if (status === 'done') return 'Schon erforscht';
  if (status === 'running') return 'Wird gerade erforscht';
  if (status === 'locked') return 'Erst: ' + t.requires.filter(r => !state.techs[r]).map(r => TECHS[r].name).join(', ');
  if (state.research) return `Es läuft schon „${TECHS[state.research.id].name}“`;
  if (t.population && state.pop < t.population) return `Braucht ${t.population} Einwohner`;
  if (!canAfford(t.cost)) return missingText(t.cost);
  return null;
}

function startResearch(id) {
  const problem = researchProblem(id);
  if (problem) return problem;
  payCost(TECHS[id].cost);
  state.research = { id, left: TECHS[id].time };
  emit('researchStarted', id);
  return null;
}

function updateResearch(dt) {
  if (!state.research) return;
  state.research.left -= dt;
  if (state.research.left > 0) return;
  const id = state.research.id;
  state.research = null;
  state.techs[id] = true;
  const e = TECHS[id].effect || {};
  if (e.stage && stageIndex(e.stage) > stageIndex()) state.stage = e.stage;
  emit('researchDone', id);
  const changed = evolveBuildings();
  if (changed.length) emit('evolved', changed);
}

// Mit dem Zeitalter wachsen die Gebäude mit: Ist die nächste Stufe einer Linie freigeschaltet und gleich groß,
// werden alle Gebäude der alten Stufe kostenlos umgebaut (z. B. Wohnhöhle → Fellzelt, Jägerlager → Mammutjägerlager).
// Größere Stufen (Grubenhaus → Langhaus) brauchen mehr Platz und bleiben ein Umbau per Knopf.
// Gibt zurück, was umgebaut wurde: [{ from, to, count }]
function evolveBuildings() {
  const changed = [];
  let again = true;
  while (again) {   // mehrere Stufen auf einmal möglich (z. B. alter Spielstand)
    again = false;
    for (const b of state.buildings) {
      const to = BUILDINGS[b.type].upgradeTo;
      if (!to || !BUILDINGS[to] || !isUnlocked(to) || BUILDINGS[to].size !== BUILDINGS[b.type].size) continue;
      const entry = changed.find(c => c.from === b.type && c.to === to) || (changed.push({ from: b.type, to, count: 0 }), changed[changed.length - 1]);
      entry.count++;
      if (!b.build) state.built[to] = (state.built[to] || 0) + 1;
      b.type = to;
      again = true;
    }
  }
  if (changed.length) { rebuildOccupancy(); recalcStats(); }
  return changed;
}

// ---------------------------------------------------------------------
// Mammutjagd: Herde antippen, Jäger ziehen los und kommen mit Nahrung und Fellen zurück
// ---------------------------------------------------------------------

// Ab der Jungsteinzeit sind die Mammuts ausgestorben
function mammothsExtinct() { return stageReached('jung'); }

// Zieht gerade eine Herde vorbei, die man jagen kann (bzw. zur Stimmung, solange die Forschung fehlt)?
function herdPresent() { return !mammothsExtinct() && !state.hunt && !(state.herdWait > 0); }

// Fertige, verbundene, nicht pausierte Jagdlager (Jägerlager, Mammutjägerlager)
function huntCamps() {
  return state.buildings.map((b, i) => i)
    .filter(i => { const b = state.buildings[i]; return BUILDINGS[b.type].line === 'jagen' && !b.build && !b.paused && isConnected(i); });
}

function huntReward() {
  const big = huntCamps().some(i => state.buildings[i].type === 'mammutjaegerlager');
  const out = {};
  for (const [id, n] of Object.entries(CONFIG.hunt.reward)) out[id] = Math.round(n * (big ? CONFIG.hunt.bigFactor : 1));
  return out;
}

function huntProblem() {
  if (mammothsExtinct()) return 'Die Mammuts sind ausgestorben';
  if (state.hunt) return 'Die Jäger sind schon unterwegs';
  if (!herdPresent()) return 'Gerade zieht keine Mammutherde vorbei';
  if (!state.techs.mammutjagd) return 'Erforsche erst 🦣 Mammutjagd, dann könnt ihr Mammuts jagen';
  if (!huntCamps().length) return 'Du brauchst ein fertiges Jägerlager mit Weg';
  return null;
}

// Jäger losschicken. x/y = wo die Herde steht (nur für die Figuren auf der Karte). Gibt einen Fehlertext oder null zurück.
function startHunt(x = 0, y = 0) {
  const problem = huntProblem();
  if (problem) return problem;
  const b = state.buildings[huntCamps()[0]], half = BUILDINGS[b.type].size / 2;
  state.hunt = { left: CONFIG.hunt.seconds, cx: b.x + half, cy: b.y + half, x: Number(x) || 0, y: Number(y) || 0 };
  emit('huntStarted', state.hunt);
  return null;
}

function updateHunt(dt) {
  if (state.hunt) {
    state.hunt.left -= dt;
    if (state.hunt.left > 0) return;
    const reward = huntReward();
    addResources(reward);
    state.hunt = null;
    state.herdWait = CONFIG.hunt.herdWait;
    emit('huntDone', reward);
  } else if (state.herdWait > 0) state.herdWait = Math.max(0, state.herdWait - dt);
}

// ---------------------------------------------------------------------
// Aufträge und tägliche Belohnung
// ---------------------------------------------------------------------

function questProgress(q) {
  const g = q.goal;
  if (g.build) return { have: Math.min(state.built[g.build] || 0, g.count), need: g.count };
  if (g.population) return { have: Math.min(state.pop, g.population), need: g.population };
  if (g.techs) return { have: Math.min(Object.keys(state.techs).length, g.techs), need: g.techs };
  if (g.tech) return { have: state.techs[g.tech] ? 1 : 0, need: 1 };
  if (g.resource) return { have: Math.min(Math.floor(state.res[g.resource] || 0), g.count), need: g.count };
  return { have: 0, need: 1 };
}

function activeQuests() {
  return QUESTS.filter(q => !state.quests[q.id]).slice(0, 3);
}

function questDone(q) {
  const p = questProgress(q);
  return p.have >= p.need;
}

function claimQuest(id) {
  const q = QUESTS.find(x => x.id === id);
  if (!q || state.quests[id] || !activeQuests().includes(q) || !questDone(q)) return false;
  state.quests[id] = true;
  addResources(q.reward);
  emit('questClaimed', q);
  return true;
}

function dayString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Prüft beim Öffnen, ob es heute schon eine Belohnung gab. Gibt den Tag (1–7) zurück oder 0.
function checkDailyReward(now = new Date()) {
  const today = dayString(now);
  const d = state.daily;
  if (d.last === today) return d.pending || 0;
  const yesterday = dayString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  d.streak = d.last === yesterday ? (d.streak % 7) + 1 : 1;
  d.last = today;
  d.pending = d.streak;
  return d.pending;
}

function claimDailyReward() {
  const day = state.daily.pending;
  if (!day) return null;
  const reward = DAILY_REWARDS[day - 1];
  addResources(reward);
  state.daily.pending = 0;
  return reward;
}

// ---------------------------------------------------------------------
// Hauptschleife und Offline-Fortschritt
// ---------------------------------------------------------------------

function update(dt) {
  if (!state || !(dt > 0)) return;          // negative oder kaputte Zeit (Uhr verstellt) ignorieren
  dt = Math.min(dt, 5);
  state.playTime += dt;
  state.yearTime = (state.yearTime + dt) % CONFIG.yearSeconds;
  updateConstruction(dt);
  recalcStats();
  updateProduction(dt);
  updatePopulation(dt);
  updateResearch(dt);
  updateHunt(dt);
  updateDisaster(dt);
}

// Läuft die Zeit nach, in der das Spiel zu war. Gibt zurück, was dazugekommen ist.
function applyOfflineProgress(savedAt, now = Date.now()) {
  const secs = Math.min(Math.max(0, (now - savedAt) / 1000), CONFIG.maxOfflineHours * 3600);
  if (!(secs > 30)) return null;
  const before = { ...state.res, pop: state.pop };
  let left = secs;
  while (left > 0) {
    const step = Math.min(2, left);
    update(step);
    left -= step;
  }
  const gained = {};
  for (const id of Object.keys(RESOURCES)) {
    const d = (state.res[id] || 0) - (before[id] || 0);
    if (Math.abs(d) >= 1) gained[id] = d;
  }
  return { seconds: secs, gained, pop: state.pop - before.pop };
}
