'use strict';
// Epochia – Speichern und Laden. Eigene Speicherplätze (epochia-save-1/2/3), die Stände des alten
// Spiels (stadtaufbau-save-…) werden nie angefasst.

const SAVE_PREFIX = 'epochia-save-';
const SLOT_KEY = 'epochia-slot';
const SETTINGS_KEY = 'epochia-settings';
const SLOTS = [1, 2, 3];

let currentSlot = 1;
let settings = { sound: true, music: true, footprint: false };

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
  return storageSet(SAVE_PREFIX + currentSlot, serialize());
}

// Prüft einen gelesenen Spielstand und ergänzt Fehlendes. Gibt null zurück, wenn er unbrauchbar ist.
// Alte Spielstände (64 × 64, bis Version 21) in die Mitte der großen Karte legen: Gebäude, Land, geräumte Felder, Jagd
function migrateMapSize(data) {
  const old = Number.isInteger(data.mapSize) ? data.mapSize : 64;
  if (old === N || old > N) return data;
  const off = (N - old) / 2, poff = off / CONFIG.plotSize, oldPlots = old / CONFIG.plotSize;
  const d = { ...data, mapSize: N };
  d.buildings = data.buildings.map(b => (b && Number.isInteger(b.x) && Number.isInteger(b.y) ? { ...b, x: b.x + off, y: b.y + off } : b));
  if (Array.isArray(data.plots) && data.plots.length === oldPlots * oldPlots) {
    d.plots = new Array(PLOTS * PLOTS).fill(0);
    data.plots.forEach((v, k) => { if (v === 1) d.plots[(Math.floor(k / oldPlots) + poff) * PLOTS + (k % oldPlots) + poff] = 1; });
  }
  if (Array.isArray(data.cleared)) d.cleared = data.cleared.filter(Number.isInteger).map(i => (Math.floor(i / old) + off) * N + (i % old) + off);
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
    .map(b => ({ type: b.type, x: b.x, y: b.y, rot: (Number(b.rot) || 0) & 3, build: Number.isFinite(b.build) && b.build > 0 ? b.build : 0, ...(b.paused ? { paused: true } : {}),
      ...(Number.isFinite(b.chop) && b.chop > 0 ? { chop: b.chop } : {}), ...(Number.isFinite(b.plant) && b.plant > 0 ? { plant: b.plant } : {}) }));
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
  for (const key of ['pop', 'yearTime', 'playTime', 'savedAt', 'herdWait', 'disasterCalm']) if (Number.isFinite(data[key]) && data[key] >= 0) s[key] = data[key];
  s.pop = Math.floor(s.pop);
  if (data.quests && typeof data.quests === 'object') s.quests = { ...data.quests };
  if (data.built && typeof data.built === 'object') s.built = { ...data.built };
  if (data.seen && typeof data.seen === 'object') s.seen = { ...data.seen };
  if (data.daily && typeof data.daily === 'object') s.daily = { last: String(data.daily.last || ''), streak: Number(data.daily.streak) || 0, pending: Number(data.daily.pending) || 0 };
  if (Number.isInteger(data.tutorial)) s.tutorial = data.tutorial;
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
    return { pop: Math.floor(d.pop || 0), stage: stage.name, savedAt: d.savedAt || 0 };
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
