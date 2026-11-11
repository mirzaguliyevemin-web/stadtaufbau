'use strict';
// Epochia – Speichern und Laden. Eigene Speicherplätze (epochia-save-1/2/3), die Stände des alten
// Spiels (stadtaufbau-save-…) werden nie angefasst.

const SAVE_PREFIX = 'epochia-save-';
const SLOT_KEY = 'epochia-slot';
const SETTINGS_KEY = 'epochia-settings';
const SLOTS = [1, 2, 3];

let currentSlot = 1;
let settings = { sound: true, music: true, footprint: false, bubbles: 'probleme' };

function storageGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
}

function loadSettings() {
  try { settings = { ...settings, ...JSON.parse(storageGet(SETTINGS_KEY) || '{}') }; } catch (e) { /* Standard behalten */ }
  const slot = Number(storageGet(SLOT_KEY));
  if (SLOTS.includes(slot)) currentSlot = slot;
}

function saveSettings() {
  storageSet(SETTINGS_KEY, JSON.stringify(settings));
  storageSet(SLOT_KEY, String(currentSlot));
}

function serialize() {
  state.savedAt = Date.now();
  return JSON.stringify(state);
}

function saveGame() {
  if (!state) return false;
  const ok = storageSet(SAVE_PREFIX + currentSlot, serialize());
  if (ok && typeof kontoNachSpeichern === 'function') kontoNachSpeichern();   // Cloud-Sicherung (gedrosselt, nur mit Konto)
  return ok;
}

// Prüft einen gelesenen Spielstand und ergänzt Fehlendes. Gibt null zurück, wenn er unbrauchbar ist.
// Ältere Spielstände (64 × 64 bis Version 21, 128 × 128 bis Version 54) in die Mitte der großen Karte legen: Gebäude und Wege,
// Land, geräumte Felder, gepflanzte Bäume, Setzlinge, Jagd. Ihr Gelände bleibt Feld für Feld gleich (mapCore), nur das Außenland ist neu.
// Danach steht im Stand mapSize = N: Ein zweites Laden verschiebt nichts mehr. Die Kamera wird nicht gespeichert (sucht beim Start das Lager).
function migrateMapSize(data) {
  const old = Number.isInteger(data.mapSize) ? data.mapSize : 64;
  if (old === N || old > N) return data;
  const off = (N - old) / 2, poff = off / CONFIG.plotSize, oldPlots = old / CONFIG.plotSize;
  const d = { ...data, mapSize: N, mapCore: OLD_N };
  const moved = i => (Math.floor(i / old) + off) * N + (i % old) + off;
  d.buildings = data.buildings.map(b => (b && Number.isInteger(b.x) && Number.isInteger(b.y) ? { ...b, x: b.x + off, y: b.y + off } : b));
  if (Array.isArray(data.plots) && data.plots.length === oldPlots * oldPlots) {
    d.plots = new Array(PLOTS * PLOTS).fill(0);
    data.plots.forEach((v, k) => { if (v === 1) d.plots[(Math.floor(k / oldPlots) + poff) * PLOTS + (k % oldPlots) + poff] = 1; });
  }
  if (Array.isArray(data.cleared)) d.cleared = data.cleared.filter(i => Number.isInteger(i) && i >= 0 && i < old * old).map(moved);
  if (Array.isArray(data.planted)) d.planted = data.planted.filter(i => Number.isInteger(i) && i >= 0 && i < old * old).map(moved);
  if (Array.isArray(data.saplings)) d.saplings = data.saplings.filter(a => Array.isArray(a) && Number.isInteger(a[0]) && a[0] >= 0 && a[0] < old * old).map(a => [moved(a[0]), a[1]]);
  if (data.hunt && typeof data.hunt === 'object') {
    d.hunt = { ...data.hunt };
    for (const k of ['cx', 'cy', 'x', 'y']) if (Number.isFinite(Number(d.hunt[k]))) d.hunt[k] = Number(d.hunt[k]) + off;
  }
  return d;
}

function sanitizeState(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.buildings)) return null;
  data = migrateMapSize(data);
  const s = newState(Number.isFinite(data.seed) ? data.seed : 1);
  for (const id of Object.keys(RESOURCES)) {
    const n = Number(data.res && data.res[id]);
    s.res[id] = Number.isFinite(n) && n >= 0 ? n : 0;
  }
  s.buildings = data.buildings
    .filter(b => b && BUILDINGS[b.type] && Number.isInteger(b.x) && Number.isInteger(b.y))
    .map(b => ({ type: b.type, x: b.x, y: b.y, rot: (Number(b.rot) || 0) & 3, build: Number.isFinite(b.build) && b.build > 0 ? b.build : 0, ...(b.paused ? { paused: true } : {}), ...(BUILDINGS[b.from] ? { from: b.from } : {}),
      ...(Number.isFinite(b.chop) && b.chop > 0 ? { chop: b.chop } : {}), ...(Number.isFinite(b.mine) && b.mine > 0 ? { mine: b.mine } : {}), ...(Number.isFinite(b.plant) && b.plant > 0 ? { plant: b.plant } : {}), ...(b.torch && BUILDINGS[b.type].isPath ? { torch: 1 } : {}),
      ...(Number.isInteger(b.level) && b.level > 1 && b.level <= CONFIG.levels.max ? { level: b.level } : {}), ...(Number.isFinite(b.up) && b.up > 0 ? { up: b.up } : {}) }));   // Stufe (seit Version 132, fehlt = 1)
  s.mapGen = data.mapGen === 3 ? 3 : data.mapGen === 2 ? 2 : 1;   // alte Stände behalten ihre Karte (fehlt = alter, schmaler Fluss)
  s.mapCore = data.mapCore === OLD_N ? OLD_N : 0;   // fehlt = Karte aus einem Guss
  s.torches = data.torches === true;   // fehlt bei alten Ständen: Fackeln werden beim Laden einmal verteilt
  if (Array.isArray(data.plots) && data.plots.length === s.plots.length) s.plots = data.plots.map(p => (p === 1 ? 1 : 0));
  if (Array.isArray(data.cleared)) s.cleared = data.cleared.filter(Number.isInteger);
  if (Array.isArray(data.planted)) s.planted = data.planted.filter(i => Number.isInteger(i) && i >= 0 && i < N * N);
  if (Array.isArray(data.saplings)) s.saplings = data.saplings.filter(a => Array.isArray(a) && Number.isInteger(a[0]) && a[0] >= 0 && a[0] < N * N && Number.isFinite(a[1])).map(a => [a[0], Math.max(0, a[1])]);
  if (data.techs && typeof data.techs === 'object') for (const id of Object.keys(data.techs)) if (TECHS[id]) s.techs[id] = true;
  if (data.research && TECHS[data.research.id] && !s.techs[data.research.id] && Number.isFinite(data.research.left))
    s.research = { id: data.research.id, left: Math.max(0, data.research.left) };
  if (STAGES.some(st => st.id === data.stage)) s.stage = data.stage;
  if (data.hunt && Number.isFinite(data.hunt.left)) {
    const h = data.hunt, num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
    s.hunt = { left: Math.max(0, h.left), cx: num(h.cx), cy: num(h.cy), x: num(h.x), y: num(h.y) };
  }
  if (data.disaster && DISASTERS[data.disaster.id] && Number.isFinite(data.disaster.left)) s.disaster = { id: data.disaster.id, left: Math.max(0, data.disaster.left) };
  if (data.needSince && typeof data.needSince === 'object')
    for (const [id, t] of Object.entries(data.needSince)) if (RESOURCES[id] && Number.isFinite(t)) s.needSince[id] = t;
  for (const key of ['pop', 'yearTime', 'playTime', 'savedAt', 'herdWait', 'disasterCalm', 'hunger', 'wishWait', 'wishesDone', 'huntsDone', 'tradesDone']) if (Number.isFinite(data[key]) && data[key] >= 0) s[key] = data[key];
  s.pop = Math.floor(s.pop);
  for (const key of ['wishesDone', 'huntsDone', 'tradesDone']) s[key] = Math.floor(s[key]);   // Zähler sind ganze Zahlen (sonst Absturz bei handbearbeiteten Ständen)
  if (typeof data.researchNext === 'string' && TECHS[data.researchNext] && !s.techs[data.researchNext]) s.researchNext = data.researchNext;
  if (data.trader && typeof data.trader === 'object') {
    const t = data.trader, num = v => (Number.isFinite(v) && v >= 0 ? v : 0);
    s.trader = { wait: num(t.wait), left: num(t.left), visit: Math.floor(num(t.visit)), done: Array.isArray(t.done) ? t.done.filter(id => CONFIG.trader.offers.some(o => o.id === id)) : [] };
  }
  if (data.suedhaendler && typeof data.suedhaendler === 'object') {   // seit Version 158
    const t = data.suedhaendler, num = v => (Number.isFinite(v) && v >= 0 ? v : 0);
    s.suedhaendler = { wait: num(t.wait), left: num(t.left), visit: Math.floor(num(t.visit)), done: Array.isArray(t.done) ? t.done.filter(id => CONFIG.suedhaendler.offers.some(o => o.id === id)) : [] };
  }
  if (data.wanderer && typeof data.wanderer === 'object')   // seit Version 157
    s.wanderer = { left: Number.isFinite(data.wanderer.left) && data.wanderer.left > 0 ? data.wanderer.left : 0, done: !!data.wanderer.done };
  if (data.wonders && typeof data.wonders === 'object')
    for (const id of Object.keys(WONDERS)) {
      const w = data.wonders[id];
      if (w && Number.isInteger(w.step) && w.step >= 0) s.wonders[id] = { step: Math.min(w.step, WONDERS[id].steps.length), left: Number.isFinite(w.left) && w.left > 0 ? w.left : 0, ...(Number.isFinite(w.festUntil) ? { festUntil: w.festUntil } : {}) };
    }
  // Stand von vor den Wunderwerken: Ein fertiger Steinkreis ist ein fertiges Wunderwerk, eine Baustelle baut den letzten Abschnitt zu Ende
  for (const b of s.buildings) {
    const id = BUILDINGS[b.type].wonder;
    if (!id || !WONDERS[id].legacy || s.wonders[id]) continue;
    const list = WONDERS[id].steps;
    s.wonders[id] = b.build > 0 ? { step: list.length - 1, left: Math.min(b.build, list[list.length - 1].seconds) } : { step: list.length, left: 0 };
  }
  // Wunderwerke: nur der Fortschritt zählt. Unfertig bleibt b.build auf 1, fertig auf 0.
  for (const b of s.buildings) { const id = BUILDINGS[b.type].wonder; if (id) b.build = s.wonders[id] && s.wonders[id].step >= WONDERS[id].steps.length ? 0 : 1; }
  if (data.disasterNext && DISASTERS[data.disasterNext.id] && Number.isFinite(data.disasterNext.left)) s.disasterNext = { id: data.disasterNext.id, left: Math.max(0, data.disasterNext.left) };
  if (data.shop && typeof data.shop === 'object') for (const key of ['gold', 'spent', 'slots', 'stones']) if (Number.isFinite(data.shop[key]) && data.shop[key] >= 0) s.shop[key] = Math.floor(data.shop[key]);
  // seit Version 160: gekaufte, noch nicht aufgestellte Deko
  s.shop.deko = {};
  if (data.shop && data.shop.deko && typeof data.shop.deko === 'object')
    for (const [id, n] of Object.entries(data.shop.deko)) if (DEKO[id] && Number.isFinite(n) && n > 0) s.shop.deko[id] = Math.floor(n);
  if (data.finds && typeof data.finds === 'object')
    for (const [id, n] of Object.entries(data.finds)) if (FINDS[id] && Number.isFinite(n) && n > 0) s.finds[id] = Math.floor(n);
  const onMap = (x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < N && y < N;
  if (Array.isArray(data.spots)) s.spots = data.spots.filter(k => k && SPOT_STYLE[k.kind] && onMap(k.x, k.y) && (k.kind === 'erz' || FINDS[k.find])).map(k => ({ kind: k.kind, x: k.x, y: k.y, find: k.find || null }));
  if (Array.isArray(data.trips)) s.trips = data.trips.filter(k => k && SPOT_STYLE[k.kind] && Number.isFinite(k.left) && k.total > 0 && [k.cx, k.cy, k.x, k.y].every(Number.isFinite) && (k.kind === 'erz' || FINDS[k.find]))
    .map(k => ({ id: Number(k.id) || 0, left: Math.max(0, k.left), total: k.total, cx: k.cx, cy: k.cy, x: k.x, y: k.y, kind: k.kind, find: k.find || null }));
  if (Array.isArray(data.basket)) s.basket = data.basket.filter(id => FINDS[id]).slice(0, CONFIG.finds.basketMax);
  if (data.fund && typeof data.fund === 'object') {
    const f = data.fund;
    for (const key of ['rng', 'spotWait', 'oreWait', 'luckTick', 'glutNight', 'sternNight', 'ores', 'tripId', 'boulderWait']) if (Number.isFinite(f[key])) s.fund[key] = f[key];
    if (f.luck && typeof f.luck === 'object') for (const [id, t] of Object.entries(f.luck)) if (FINDS[id] && Number.isFinite(t) && t >= 0) s.fund.luck[id] = t;
    for (const key of ['used', 'ever']) if (f[key] && typeof f[key] === 'object') for (const [id, n] of Object.entries(f[key])) if (FINDS[id] && Number.isFinite(n) && n > 0) s.fund[key][id] = Math.floor(n);
  }
  if (data.quests && typeof data.quests === 'object') s.quests = { ...data.quests };
  if (data.built && typeof data.built === 'object') s.built = { ...data.built };
  if (data.seen && typeof data.seen === 'object') s.seen = { ...data.seen };
  if (data.daily && typeof data.daily === 'object') s.daily = { last: String(data.daily.last || ''), streak: Number(data.daily.streak) || 0, pending: Number(data.daily.pending) || 0 };
  // Einstieg: Die Liste hat noch dieselbe Reihenfolge, der Index alter Stände gilt also weiter. Unsinnige Werte heißen „fertig“.
  if (Number.isInteger(data.tutorial)) s.tutorial = data.tutorial >= 0 && data.tutorial < TUTORIAL.length ? data.tutorial : -1;
  if (data.tutorialRewards && typeof data.tutorialRewards === 'object') {
    for (const [key, got] of Object.entries(data.tutorialRewards)) if (got === true) s.tutorialRewards[key] = true;
  } else {
    // Stand von vor den Belohnungen: Was schon hinter ihm liegt, gibt es nicht nachträglich
    TUTORIAL.forEach((step, i) => { if (s.tutorial < 0 || i < s.tutorial) s.tutorialRewards[step.id] = true; });
    if (s.tutorial < 0 || s.buildings.some(b => b.type === 'hoehlenmaler')) s.tutorialRewards.forschung_bau = true;
  }
  return s;
}

function loadFromText(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { return false; }
  const s = sanitizeState(data);
  if (!s) return false;
  state = s;
  buildTerrain();
  rebuildOccupancy();
  // Überlappungen (kaputter Stand) auflösen: spätere Gebäude, die auf belegten Feldern stehen, fallen weg
  const seen = new Int32Array(N * N);
  state.buildings = state.buildings.filter(b => {
    const size = BUILDINGS[b.type].size;
    for (let y = b.y; y < b.y + size; y++)
      for (let x = b.x; x < b.x + size; x++)
        if (!inMap(x, y) || seen[y * N + x]) return false;
    for (let y = b.y; y < b.y + size; y++) for (let x = b.x; x < b.x + size; x++) seen[y * N + x] = 1;
    return true;
  });
  if (!state.buildings.some(b => b.type === 'lagerfeuer')) {
    const c = Math.floor(N / 2) - 1;
    state.buildings.unshift({ type: 'lagerfeuer', x: c, y: c, rot: 0, build: 0 });
  }
  rebuildOccupancy();
  if (!state.torches) assignTorches();   // alte Stände: Wege bekommen einmal ihre Fackeln
  evolveBuildings();   // ältere Stände: schon erforschte Stufen nachholen
  recalcStats();
  return true;
}

function loadSlot(slot) {
  const text = storageGet(SAVE_PREFIX + slot);
  return text ? loadFromText(text) : false;
}

// Kurzinfo für die Liste der Spielstände
function slotInfo(slot) {
  const text = storageGet(SAVE_PREFIX + slot);
  if (!text) return null;
  try {
    const d = JSON.parse(text);
    const stage = STAGES.find(s => s.id === d.stage) || STAGES[0];
    return { pop: Math.floor(d.pop || 0), stage: stage.name, stageId: stage.id, savedAt: d.savedAt || 0 };
  } catch (e) {
    return { broken: true };
  }
}

function deleteSlot(slot) {
  try { localStorage.removeItem(SAVE_PREFIX + slot); } catch (e) { /* egal */ }
}

// Export/Import als Text (zum Sichern oder Umziehen auf ein anderes Gerät)
function exportText() {
  return btoa(unescape(encodeURIComponent(serialize())));
}

function importText(text) {
  try {
    return loadFromText(decodeURIComponent(escape(atob(String(text).trim()))));
  } catch (e) {
    return false;
  }
}
