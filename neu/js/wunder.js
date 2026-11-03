'use strict';
// Epochia – Wunderwerke: Bau in Abschnitten, jeder Abschnitt ist ein Kapitel einer kleinen Geschichte (docs/konzept-wunderwerke.md).
// Solange ein Wunderwerk nicht fertig ist, bleibt b.build auf 1 (zählt nicht als Baustelle), der Fortschritt steht in state.wonders.

function wonderIdOf(type) { const d = BUILDINGS[type]; return d && d.wonder || null; }
function wonderState(id) { return state.wonders[id] || (state.wonders[id] = { step: 0, left: 0 }); }
function wonderDone(id) { return wonderState(id).step >= WONDERS[id].steps.length; }
function wonderIndex(id) { return state.buildings.findIndex(b => b.type === WONDERS[id].building); }
function wonderBuilt(id) { return wonderIndex(id) >= 0; }
function wonderOpen(id) { return !!state.techs[WONDERS[id].tech]; }

function wonderImage(id) {
  const list = WONDERS[id].images;
  return list[Math.min(wonderState(id).step, list.length - 1)];
}

// Ist das Ziel des Kapitels erreicht (z. B. 2 Steinsammler)?
function stepGoal(step) {
  if (!step.goal) return null;
  const have = state.buildings.filter(b => BUILDINGS[b.type].line === step.goal.line && !b.build).length;
  return { have: Math.min(have, step.goal.count), need: step.goal.count, done: have >= step.goal.count };
}

function wonderStepProblem(id) {
  const w = wonderState(id), step = WONDERS[id].steps[w.step];
  if (!step) return 'Das Wunderwerk ist fertig';
  if (w.left > 0) return 'Dieser Abschnitt wird gerade gebaut';
  const i = wonderIndex(id);
  if (i < 0) return WONDERS[id].whereShort;
  if (!isConnected(i)) return 'Es fehlt ein Weg zum Lagerfeuer';
  if (step.stage && !stageReached(step.stage)) return `Geht erst in der ${STAGES[stageIndex(step.stage)].name}`;
  const g = stepGoal(step);
  if (g && !g.done) return step.goal.text;
  for (const [fid, n] of Object.entries(step.finds || {}))
    if (findCount(fid) < n) return `Es fehlt noch: ${FINDS[fid].icon} ${FINDS[fid].name}`;
  if (!canAfford(step.goods)) return missingText(step.goods);
  return null;
}

function startWonderStep(id) {
  const problem = wonderStepProblem(id);
  if (problem) return problem;
  const w = wonderState(id), step = WONDERS[id].steps[w.step];
  payCost(step.goods);
  for (const [fid, n] of Object.entries(step.finds || {})) useFind(fid, n);
  w.left = step.seconds;
  emit('wonderStarted', id);
  return null;
}

function updateWonders(dt) {
  for (const id of Object.keys(WONDERS)) {
    const w = state.wonders[id];
    if (!w || !(w.left > 0)) continue;
    w.left -= dt;
    if (w.left > 0) continue;
    w.left = 0;
    for (const [fid, n] of Object.entries(WONDERS[id].steps[w.step].gives || {})) addFind(fid, n);
    w.step++;
    const done = wonderDone(id);
    if (done) {
      const i = wonderIndex(id);
      if (i >= 0) finishBuilding(state.buildings[i]);
      if (WONDERS[id].firstFest) w.festUntil = state.playTime + CONFIG.fest.seconds;
      recalcStats();
    }
    emit('wonderStep', { id, done, step: w.step - 1 });
  }
}

// Bonus auf andere Gebäude (Höhle: alle Wissens-Gebäude)
function wonderBonus(type) {
  const line = BUILDINGS[type].line;
  let f = 1;
  for (const id of Object.keys(WONDERS)) {
    const k = WONDERS[id].boost;
    if (k && k.line === line && state.wonders[id] && wonderDone(id)) f *= 1 + k.share;
  }
  return f;
}

// Fest eines fertigen Wunderwerks: einmal im Jahr, ergibt sich aus der Jahreszeit (muss nicht gespeichert werden)
function wonderFest() {
  for (const id of Object.keys(WONDERS).reverse()) {   // das spätere Wunderwerk richtet das Fest aus
    const fest = WONDERS[id].fest;
    if (fest && state.wonders[id] && state.wonders[id].festUntil > state.playTime) return { name: fest.name };   // erstes Fest gleich nach dem Bau
    if (fest && state.wonders[id] && wonderDone(id) && Math.abs(state.yearTime - CONFIG.yearSeconds * fest.year) <= CONFIG.fest.seconds / 2) return fest;
  }
  return null;
}

function wonderTraderFaster() {
  return Object.keys(WONDERS).reduce((n, id) => n + (WONDERS[id].traderFaster && state.wonders[id] && wonderDone(id) ? WONDERS[id].traderFaster : 0), 0);
}

// Was gerade offen ist, für Aufträge und den Zähler am Knopf
function wondersNow() { return Object.keys(WONDERS).filter(id => wonderOpen(id) && !wonderDone(id)); }
function wonderReady() { return wondersNow().some(id => !wonderStepProblem(id)); }

// ---------------------------------------------------------------------
// Fenster
// ---------------------------------------------------------------------

function wonderStepHtml(id, k) {
  const W = WONDERS[id], w = wonderState(id), step = W.steps[k], past = k < w.step, now = k === w.step;
  const finds = Object.entries(step.finds || {}).map(([fid, n]) => {
    const short = !past && findCount(fid) < n;
    return `<span class="cost${short ? ' short' : ''}">${iconHtml(FINDS[fid].bild, FINDS[fid].icon, 'mini')}${past || !now ? n : `${Math.min(findCount(fid), n)}/${n}`}</span>`;
  }).join(' ');
  const g = now ? stepGoal(step) : null;
  const goal = g ? `<small class="${g.done ? '' : 'bad'}">${esc(step.goal.text)}: ${g.have} / ${g.need}</small>` : '';
  const state1 = past ? '✔' : now ? '🔨' : '🔒';
  let action = '';
  if (now && w.left > 0) action = `<span class="q-bar"><i style="width:${Math.round(100 * (1 - w.left / step.seconds))}%"></i><em>noch ${formatTime(w.left)}</em></span>`;
  else if (now) {
    const problem = wonderStepProblem(id);
    action = `<button class="btn primary" ${problem ? 'disabled' : ''} onclick="doWonderStep('${id}')">Abschnitt bauen (${formatTime(step.seconds)})</button>${problem ? `<small>${esc(problem)}</small>` : ''}`;
  }
  return `<div class="quest-card wonder-step${past ? ' done' : ''}${!past && !now ? ' locked' : ''}"><div class="q-medal"><span class="ic emoji big">${state1}</span></div><div class="q-main">
    <b>${k + 1}. ${esc(step.title)}</b>${past || now ? `<small>${esc(step.story)}</small>` : ''}
    <div class="wonder-cost">${finds} ${costHtml(step.goods)}</div>${goal}${action}</div></div>`;
}

function wonderHtml(id) {
  const W = WONDERS[id], i = wonderIndex(id), name = wonderImage(id);
  const placed = i >= 0;
  let road = '';
  if (placed && !isConnected(i)) {
    const route = pathRoute(i), cost = route ? { holz: route.length * BUILDINGS.pfad.cost.holz } : null;
    road = `<div class="upgrade"><h3>🛤️ Kein Weg zum Lagerfeuer</h3>
      ${route ? `<button class="btn primary" ${canAfford(cost) ? '' : 'disabled'} onclick="doWonderRoute('${id}')">🛤️ Weg bauen (${costHtml(cost)})</button>` : '<small class="bad">Kein Weg möglich – erst Bäume oder Felsen räumen.</small>'}</div>`;
  }
  const where = placed ? '' : `<p class="hint">${esc(W.where)}</p>`;
  return `<div class="wonder-head">${iconHtml(name, W.icon, 'wonder-pic')}<div><p>${esc(wonderDone(id) ? W.doneText : W.intro)}</p></div></div>
    <div class="info-list wonder-bonus">${W.bonus.map(t => `<div><small>${esc(t)}</small></div>`).join('')}</div>
    ${where}${road}<div class="quests">${W.steps.map((_, k) => wonderStepHtml(id, k)).join('')}</div>`;
}

function openWonder(id) {
  closeInfo();
  wonderPageId = id;
  openPage(`${WONDERS[id].icon} ${WONDERS[id].name}`, wonderHtml(id), 'wonder');
}
let wonderPageId = null;

function refreshWonder() { if (pageOpen === 'wonder' && wonderPageId) $('page-body').innerHTML = wonderHtml(wonderPageId); }
// Restzeit im offenen Fenster läuft mit
function tickWonderPage() { if (pageOpen === 'wonder' && wonderPageId && wonderState(wonderPageId).left > 0) refreshWonder(); }

function doWonderStep(id) {
  const err = startWonderStep(id);
  if (err) toast(err); else playSound('muenze');
  refreshWonder();
  renderAll();
}

function doWonderRoute(id) {
  const err = buildRoute(wonderIndex(id));
  if (err) toast(err);
  recalcStats();
  refreshWonder();
  renderAll();
}

// Karte im Auftrags-Fenster
function wonderCardHtml() { return wondersNow().map(wonderCardOf).join(''); }

function wonderCardOf(id) {
  const W = WONDERS[id], w = wonderState(id), step = W.steps[w.step];
  const text = w.left > 0 ? `Abschnitt ${w.step + 1}: noch ${formatTime(w.left)}` : wonderBuilt(id) ? `Kapitel ${w.step + 1}: ${step.title}` : W.whereShort;
  return `<div class="wish-card"><span class="q-medal">${iconHtml(wonderImage(id), W.icon, 'big')}</span><div class="q-main"><b>${esc(W.name)}</b><span>${esc(text)}</span></div>
    <button class="btn${wonderStepProblem(id) ? '' : ' primary'}" onclick="openWonder('${id}')">Ansehen</button></div>`;
}

// Seite im Sammelalbum
function wonderAlbumHtml(page) {
  return Object.keys(WONDERS).filter(id => WONDERS[id].page === page).map(id => {
    const done = state.wonders[id] && wonderDone(id), W = WONDERS[id];
    return `<div class="wonder-album${done ? ' got' : ''}">${done ? iconHtml(W.images[W.images.length - 1], W.icon, 'big') : '<span class="ic emoji big">❓</span>'}<div><b>${done ? esc(W.name) : 'Ein Wunderwerk'}</b><small>${done ? 'Fertig gebaut.' : esc(W.hint)}</small></div></div>`;
  }).join('');
}

// ---------------------------------------------------------------------
// Der Älteste erzählt
// ---------------------------------------------------------------------

function checkWonderHint() {
  if (elderHint || tutorialStep() || state.playTime - lastHintAt < HINT_PAUSE_S) return;
  const seen = (state.seen ||= {});
  for (const id of Object.keys(WONDERS)) {
    if (!wonderOpen(id) || seen['wunder_' + id] || wonderBuilt(id)) continue;
    seen['wunder_' + id] = true;
    lastHintAt = state.playTime;
    elderHint = WONDERS[id].call;
    renderTutorial();
    return;
  }
}

// Geschichtenabend: Am Abend erzählt der Älteste vor der fertigen Höhle etwas aus der alten Zeit
let storyNight = -1;
function updateStoryEvening() {
  if (!state.wonders.hoehle || !wonderDone('hoehle') || darkness() <= 0 || darkness() >= 1) return;
  const night = Math.floor(state.playTime / CONFIG.daySeconds);
  if (night === storyNight) return;
  if (storyNight >= 0 || dayPart() < 0.7) toast(`🎨 Geschichtenabend: ${WONDERS.hoehle.facts[night % WONDERS.hoehle.facts.length]}`);
  storyNight = night;
}

const wonderLive = () => typeof gameRunning !== 'undefined' && gameRunning && !offlineRunning;
on('wonderStarted', () => { if (wonderLive()) { refreshWonder(); renderAll(); } });
on('wonderStep', ({ id, done, step }) => {
  const W = WONDERS[id];
  if (offlineRunning) { offlineEvents.push(done ? `${W.icon} ${W.name} ist fertig!` : `${W.icon} ${W.name}: Abschnitt ${step + 1} ist fertig.`); return; }
  if (!wonderLive()) return;
  playSound('fertig');
  refreshWonder();
  renderAll();
  if (done) { playFestMusic(); openDialog(`<div class="disaster-ic">${W.icon}</div><h2>${esc(W.name)}!</h2><p>${esc(W.doneText)}</p><p class="hint">${esc(W.facts[0])}</p><div class="buttons"><button class="btn primary" onclick="closeDialog()">Weiter</button></div>`); }
  else toast(`${W.icon} ${W.steps[step].done}`);
});
