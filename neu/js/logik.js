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
      // noch nichts freigeschaltet: die erste Stufe gesperrt zeigen, wenn sie in der nächsten Stufe kommt
      const first = list.sort((a, b) => BUILDINGS[a].tier - BUILDINGS[b].tier)[0];
      if (stageIndex(BUILDINGS[first].stage) <= stageIndex() + 1) result.push({ type: first, locked: true });
    }
  }
  return result;
}

function lockText(type) {
  const req = BUILDINGS[type].requires;
  return req && !state.techs[req] ? `🔒 Forschung „${TECHS[req].name}“` : '';
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
  b.x = x; b.y = y; b.rot = !!rot;
  setOccupied(b, i + 1);
  emit('moved', b);
  return null;
}

// Fehlenden Trampelpfad zum Lagerfeuer automatisch legen (1 Holz je Feld)
function buildRoute(i) {
  const route = pathRoute(i);
  if (route === null) return 'Kein Weg möglich – Bäume, Felsen oder Wasser im Weg';
  if (!route.length) return null;
  const cost = { holz: route.length * BUILDINGS.pfad.cost.holz };
  if (!canAfford(cost)) return missingText(cost);
  for (const [x, y] of route) placeBuilding('pfad', x, y);
  return null;
}

function refundOf(b) {
  const def = BUILDINGS[b.type];
  const out = {};
  for (const [id, n] of Object.entries(def.cost || {})) out[id] = Math.floor(n * CONFIG.refundShare);
  return out;
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
    return !b.build && BUILDINGS[b.type].workers && isConnected(i);
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
  s.happiness = needs.length ? Math.round(100 * sum / needs.length) : 100;
  stats = s;
  return s;
}

function foodFirst(b) {
  return BUILDINGS[b.type].produces && BUILDINGS[b.type].produces.nahrung ? 1 : 0;
}

function happinessFactor() { return 0.5 + 0.5 * stats.happiness / 100; }

function seasonIndex() { return Math.floor((state.yearTime % CONFIG.yearSeconds) / (CONFIG.yearSeconds / 4)); }
function season() { return SEASONS[seasonIndex()]; }

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
  return staffShare * seasonF * happinessFactor() * (1 + terrainBonus(b)) * (1 + techSum('bonus', b.type));
}

// Was ein Gebäude je Minute herstellt (für Anzeige und Logik)
function outputPerMinute(i) {
  const def = BUILDINGS[state.buildings[i].type];
  const f = outputFactor(i);
  const out = {};
  for (const [id, n] of Object.entries(def.produces || {})) out[id] = n * f;
  return out;
}

function updateProduction(dt) {
  const rates = {};
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
      }
    }
    for (const [id, n] of Object.entries(def.produces)) rates[id] = (rates[id] || 0) + n * f;
    addResources(def.produces, f * dt / 60);
  });
  // Einwohner essen und verbrauchen Waren
  const eat = state.pop * CONFIG.foodPerPerson;
  state.res.nahrung = Math.max(0, state.res.nahrung - eat * dt / 60);
  rates.nahrung = (rates.nahrung || 0) - eat;
  for (const n of activeNeeds()) {
    if (n.kind !== 'stock' || n.id === 'nahrung') continue;
    const use = state.pop * CONFIG.goodsPerPerson;
    state.res[n.id] = Math.max(0, (state.res[n.id] || 0) - use * dt / 60);
    rates[n.id] = (rates[n.id] || 0) - use;
  }
  stats.rates = rates;
}

let growthTimer = 0;

function updatePopulation(dt) {
  const room = stats.housing - state.pop;
  if (room < 0) state.pop = stats.housing;
  if (room > 0 && state.res.nahrung > 1 && stats.happiness >= CONFIG.growthMinHappy) {
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
