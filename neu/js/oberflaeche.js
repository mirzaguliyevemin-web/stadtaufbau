'use strict';
// Epochia – Oberfläche: Leisten, kleine Info, Gebäude-Fenster, Forschungsbaum, Aufträge, Menü, Meldungen.

const $ = id => document.getElementById(id);

function show(el, on = true) { if (el) el.classList.toggle('hidden', !on); }

function esc(text) {
  return String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Kleines Bild (Gebäude, Ware, Forschung) – fehlt das Bild, das Zeichen
function iconHtml(bild, icon, cls = '') {
  return bild && images[bild]
    ? `<img class="ic ${cls}" src="${IMAGE_DIR}${bild}.webp" alt="">`
    : `<span class="ic emoji ${cls}">${icon}</span>`;
}

function costHtml(cost) {
  return Object.entries(cost || {}).map(([id, n]) => {
    const short = (state.res[id] || 0) < n;
    return `<span class="cost${short ? ' short' : ''}">${iconHtml(RESOURCES[id].bild, RESOURCES[id].icon, 'mini')}${n}</span>`;
  }).join(' ');
}

let toastTimer = 0;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 2600);
}

function renderAll() {
  renderTopbar();
  renderBuildBar();
  renderActionBar();
  renderSideButtons();
}

// ---------------------------------------------------------------------
// Obere Leiste: Waren, Einwohner, Zufriedenheit, Jahreszeit
// ---------------------------------------------------------------------

function visibleResources() {
  return Object.keys(RESOURCES).filter(id => !RESOURCES[id].from || stageReached(RESOURCES[id].from) || (state.res[id] || 0) >= 1);
}

let lastTopbar = '';
// Maß für das Layout merken (z. B. Höhe der oberen Leiste); im Test ohne Browser gibt es kein documentElement
function setCssVar(name, value) {
  const root = typeof document !== 'undefined' && document.documentElement;
  if (root && root.style) root.style.setProperty(name, value);
}

function renderTopbar() {
  const cap = storageCap();
  const chips = visibleResources().map(id => {
    const n = Math.floor(state.res[id] || 0);
    const cls = n <= 0 ? ' empty' : n >= cap ? ' full' : '';
    return `<button class="chip${cls}" onclick="resourceTip('${id}')">${iconHtml(RESOURCES[id].bild, RESOURCES[id].icon)}<b>${n}</b></button>`;
  }).join('');
  const happy = stats.happiness;
  const face = happy >= 75 ? '😊' : happy >= 50 ? '🙂' : happy >= 25 ? '😐' : '😟';
  const stage = STAGES[stageIndex()];
  const html = `<div class="chips">${chips}</div>
    <div class="chips right">
      <button class="chip" onclick="popTip()">👥<b>${Math.floor(state.pop)}/${stats.housing}</b></button>
      <button class="chip" onclick="happyTip()">${face}<b>${happy}%</b></button>
      <button class="chip" onclick="toast('${season().name} · ${stage.name}')">${season().icon}</button>
    </div>`;
  if (html !== lastTopbar) {
    $('topbar').innerHTML = html;
    lastTopbar = html;
    // Seitenknöpfe unter die (evtl. zweizeilige) obere Leiste schieben
    const h = $('topbar').offsetHeight;
    if (h) setCssVar('--top-h', h + 'px');
  }
}

function resourceTip(id) {
  const r = stats.rates[id] || 0;
  const sign = r >= 0 ? '+' : '';
  toast(`${RESOURCES[id].icon} ${RESOURCES[id].name}: ${Math.floor(state.res[id] || 0)} von ${storageCap()} · ${sign}${r.toFixed(1)} je Minute`);
}

function popTip() {
  toast(`👥 ${Math.floor(state.pop)} Einwohner, Platz für ${stats.housing} · Arbeit: ${stats.workers} von ${stats.jobs} Stellen besetzt`);
}

function happyTip() {
  const parts = activeNeeds().map(n => `${n.icon} ${Math.round((stats.needs[n.id] || 0) * 100)}%`);
  toast(`Zufriedenheit ${stats.happiness}% · ${parts.join(' · ')}`);
}

// ---------------------------------------------------------------------
// Knöpfe am Rand
// ---------------------------------------------------------------------

function renderSideButtons() {
  const r = state.research;
  const pill = $('research-pill');
  if (r) {
    const t = TECHS[r.id];
    const done = 1 - r.left / t.time;
    pill.innerHTML = `${t.icon} ${esc(t.name)} <span class="mini-bar"><i style="width:${Math.round(done * 100)}%"></i></span> ${formatTime(r.left)}`;
    show(pill, true);
  } else show(pill, false);
  const ready = activeQuests().filter(questDone).length;
  $('quest-badge').textContent = ready || '';
  show($('quest-badge'), ready > 0);
  const canResearch = !r && Object.keys(TECHS).some(id => !researchProblem(id));
  show($('research-badge'), canResearch);
  show($('btn-daily'), !!state.daily.pending);
}

// ---------------------------------------------------------------------
// Bauleiste (unten)
// ---------------------------------------------------------------------

let lastBar = '', lastTabs = '';
let barCategory = 'wohnen';

function categoryOf(type) {
  const line = BUILDINGS[type].line;
  return (BAR_CATEGORIES.find(c => c.lines.includes(line)) || BAR_CATEGORIES[0]).id;
}

function setBarCategory(id) {
  barCategory = id;
  lastBar = null;
  renderBuildBar();
  const bar = $('buildbar');
  if (bar) bar.scrollLeft = 0;
}

function renderBuildBar() {
  if (barDrag) return;   // nicht neu aufbauen, solange ein Finger auf der Leiste liegt
  // Im Einstieg zeigt die Leiste die Kategorie, in der das gesuchte Gebäude steht
  const step = typeof tutorialStep === 'function' ? tutorialStep() : null;
  if (step && step.target && step.target.startsWith('bar:') && BUILDINGS[step.target.slice(4)]) barCategory = categoryOf(step.target.slice(4));
  const entries = barEntries();
  const fresh = new Set(entries.filter(({ type, locked }) => !locked && BUILDINGS[type].requires && !(state.seen || {})[type]).map(e => categoryOf(e.type)));
  const tabs = BAR_CATEGORIES.filter(c => entries.some(e => categoryOf(e.type) === c.id)).map(c =>
    `<button class="bar-tab${c.id === barCategory ? ' active' : ''}" onclick="setBarCategory('${c.id}')"><span class="emoji">${c.icon}</span><span class="tname">${esc(c.name)}</span>${fresh.has(c.id) && c.id !== barCategory ? '<i class="dot"></i>' : ''}</button>`).join('');
  if (tabs !== lastTabs) { $('bar-tabs').innerHTML = tabs; lastTabs = tabs; }
  const items = entries.filter(e => categoryOf(e.type) === barCategory).map(({ type, locked }) => {
    const def = BUILDINGS[type];
    const isNew = !locked && def.requires && !(state.seen || {})[type];
    const affordable = canAfford(def.cost);
    return `<div class="bar-item${locked ? ' locked' : ''}${affordable ? '' : ' poor'}" data-type="${type}"
        onpointerdown="onBarPointerDown(event,'${type}',${locked})" onpointermove="onBarPointerMove(event)"
        onpointerup="onBarPointerUp(event)" onpointercancel="onBarPointerUp(event)">
      ${isNew ? '<span class="new">Neu</span>' : ''}
      ${iconHtml(def.bild, def.icon, 'big')}
      <span class="name">${esc(def.name)}</span>
      <span class="costs">${locked ? '🔒' : costHtml(def.cost)}</span>
    </div>`;
  }).join('');
  if (items !== lastBar) {
    $('buildbar').innerHTML = items;
    lastBar = items;
    const h = $('buildbar').offsetHeight;
    if (h) setCssVar('--bar-h', h + 'px');
    if (typeof highlightTutorialTarget === 'function') highlightTutorialTarget();
  }
}

// Feld beim Bauen/Verschieben/Pfade malen: Preis und ✖ ↻ ✔
let lastAction = '';
function renderActionBar() {
  const el = $('action-bar');
  let html = '';
  if (ghost) {
    const def = BUILDINGS[ghost.type];
    const problem = ghostProblem();
    const s = def.size;
    const road = ghost.from >= 0 ? touchesNetwork(ghost.x, ghost.y, s) || state.buildings[ghost.from].type === 'lagerfeuer' : touchesNetwork(ghost.x, ghost.y, s);
    const title = ghost.from < 0 ? `${def.icon} ${esc(def.name)} · ${costHtml(def.cost)} · ⏱ ${formatTime(def.time)}` : `${def.icon} ${esc(def.name)} verschieben`;
    html = `<div class="action-text">${title}<small class="${problem ? 'bad' : road ? 'good' : 'warn'}">${esc(problem || (road ? (ghost.from < 0 ? 'Passt! Mit ✔ bauen' : 'Passt! Mit ✔ abstellen') : 'Passt – danach einen Trampelpfad zum Lagerfeuer legen'))}</small></div>
      <button class="round no" onclick="cancelGhost()">✖</button>
      <button class="round turn" onclick="rotateGhost()">↻</button>
      <button class="round yes" ${problem ? 'disabled' : ''} onclick="confirmGhost()">✔</button>`;
  } else if (pathMode) {
    html = `<div class="action-text">🟫 Trampelpfad · 1 🪵 je Feld<small>Über die Felder ziehen · auf einen Weg tippen löscht ihn</small></div>
      <button class="round yes" onclick="cancelGhost()">✔</button>`;
  }
  show(el, !!html);
  if (html !== lastAction) { el.innerHTML = html; lastAction = html; }
  show($('buildbar'), !html);
  show($('bar-tabs'), !html);
}

// ---------------------------------------------------------------------
// Kleine Info unter einem Gebäude
// ---------------------------------------------------------------------

let infoFor = null;   // { kind: 'b', i } oder { kind: 'tile', x, y }
let infoTimer = 0;

function infoText(i) {
  const b = state.buildings[i];
  const def = BUILDINGS[b.type];
  if (b.build > 0) return `🔨 ${def.name} · noch ${formatTime(b.build)}`;
  if (!isConnected(i)) return `${def.icon} ${def.name} · 🛤️ Kein Weg zum Lagerfeuer!`;
  const parts = [`${def.icon} ${def.name}`];
  if (def.housing) parts.push(`🏠 ${housingOf(b.type)} Plätze`);
  if (def.produces) {
    const out = outputPerMinute(i);
    parts.push(Object.entries(out).map(([id, n]) => `+${n.toFixed(1)} ${RESOURCES[id].icon}/min`).join(' '));
  }
  if (def.workers) parts.push(`👤 ${stats.staff[i] || 0}/${def.workers}`);
  if (def.warmth) parts.push(`🔥 Umkreis ${warmthRadius(def)}`);
  if (def.belief) parts.push(`🗿 Umkreis ${def.belief}`);
  if (def.storage) parts.push(`📦 +${def.storage}`);
  return parts.join(' · ');
}

function infoPopHtml(i) {
  const b = state.buildings[i];
  const pause = BUILDINGS[b.type].workers && !b.build
    ? `<button class="btn small pop-pause" onclick="event.stopPropagation(); togglePause(${i}); showInfo(${i})">${b.paused ? '▶ Weiter' : '⏸ Pause'}</button>` : '';
  return `${esc(infoText(i))}${pause}<small>Antippen für mehr</small>`;
}

function showInfo(i) {
  infoFor = { kind: 'b', i };
  const el = $('info-pop');
  el.classList.remove('tool');
  el.innerHTML = infoPopHtml(i);
  el.onclick = () => { const k = infoFor; closeInfo(); if (k && k.kind === 'b') showBuildingWindow(k.i); };
  show(el, true);
  positionInfo();
  clearTimeout(infoTimer);
  infoTimer = setTimeout(closeInfo, 5000);
}

function showTerrainInfo(x, y) {
  const t = terrainAt(x, y);
  infoFor = { kind: 'tile', x, y };
  const el = $('info-pop');
  // Baum: Axt, Felsen: Spitzhacke – antippen, und schon wird gefällt bzw. abgetragen
  const tool = t === TERRAIN.wald ? iconHtml('axt', '🪓', 'big') : iconHtml('hacke', '⛏️', 'big');
  el.classList.add('tool');
  el.innerHTML = `<span class="tool-ic">${tool}</span><span>${esc(t.clearName)}<small>+${formatAmounts(t.clear)}</small></span>`;
  el.onclick = () => {
    const kind = t === TERRAIN.wald ? 'wald' : 'fels';
    if (clearTile(x, y)) {
      if (typeof addFelled === 'function') addFelled(x, y, kind);
      toast(`+${formatAmounts(t.clear)}`);
    }
    closeInfo();
  };
  show(el, true);
  positionInfo();
  clearTimeout(infoTimer);
  infoTimer = setTimeout(closeInfo, 4000);
}

function positionInfo() {
  if (!infoFor) return;
  const el = $('info-pop');
  let p;
  if (infoFor.kind === 'b') {
    const b = state.buildings[infoFor.i];
    if (!b) { closeInfo(); return; }
    const s = BUILDINGS[b.type].size;
    p = tileToScreen(b.x + s, b.y + s);
    const html = infoPopHtml(infoFor.i);
    if (el.innerHTML !== html) el.innerHTML = html;
  } else {
    // Werkzeug schwebt über dem Baum bzw. Felsen
    const c = tileToScreen(infoFor.x + 0.5, infoFor.y + 0.5);
    const w = el.offsetWidth || 120, h = el.offsetHeight || 60;
    el.style.left = Math.max(8, Math.min(viewW - w - 8, c.x - w / 2)) + 'px';
    el.style.top = Math.max(50, Math.min(viewH - h - 120, c.y - TW * 1.3 * cam.zoom - h)) + 'px';
    return;
  }
  const w = el.offsetWidth || 200;
  el.style.left = Math.max(8, Math.min(viewW - w - 8, p.x - w / 2)) + 'px';
  el.style.top = Math.max(50, Math.min(viewH - 140, p.y + 6)) + 'px';
}

function closeInfo() {
  infoFor = null;
  selected = -1;
  show($('info-pop'), false);
}

// ---------------------------------------------------------------------
// Fenster (Dialog) und ganze Seiten
// ---------------------------------------------------------------------

function openDialog(html) {
  $('dialog-box').innerHTML = html;
  show($('dialog'), true);
}

function closeDialog() { show($('dialog'), false); }

let pageOpen = null;

function openPage(title, html, name) {
  $('page-title').textContent = title;
  $('page-body').innerHTML = html;
  show($('page'), true);
  if (!pageOpen && typeof history !== 'undefined' && history.pushState) history.pushState({ page: name }, '');
  pageOpen = name;
}

function closePage(fromHistory = false) {
  if (!pageOpen) return;
  pageOpen = null;
  show($('page'), false);
  if (!fromHistory && typeof history !== 'undefined' && history.state && history.state.page) history.back();
}

// ---------------------------------------------------------------------
// Gebäude-Fenster
// ---------------------------------------------------------------------

function showBuildingWindow(i) {
  const b = state.buildings[i];
  if (!b) return;
  const def = BUILDINGS[b.type];
  const lines = [];
  if (b.build > 0) lines.push(`🔨 Baustelle – noch ${formatTime(b.build)}`);
  let road = '';
  if (!isConnected(i)) {
    const route = pathRoute(i);
    const cost = route ? { holz: route.length * BUILDINGS.pfad.cost.holz } : null;
    road = `<div class="upgrade">
      <h3>🛤️ Kein Weg zum Lagerfeuer</h3>
      <p>Ohne Trampelpfad zum Lagerfeuer arbeitet hier niemand. Lege Pfade mit dem Finger – oder lass den kürzesten Weg bauen.</p>
      ${route ? `<button class="btn primary" ${canAfford(cost) ? '' : 'disabled'} onclick="doBuildRoute(${i})">🛤️ Weg bauen (${costHtml(cost)})</button>`
        : '<small class="bad">Kein Weg möglich – erst Bäume oder Felsen räumen.</small>'}
    </div>`;
  }
  if (def.housing) {
    lines.push(`🏠 Platz für ${housingOf(b.type)} Menschen`);
    const warm = state.buildings.some(s => !s.build && BUILDINGS[s.type].warmth && distance(s, b) <= warmthRadius(BUILDINGS[s.type]) + def.size / 2);
    lines.push(warm ? '🔥 Hat es warm (Feuer in der Nähe)' : '❄️ Kein Feuer in der Nähe – baue einen Feuerplatz');
    if (stageReached('mittel')) {
      const belief = state.buildings.some(s => !s.build && BUILDINGS[s.type].belief && distance(s, b) <= BUILDINGS[s.type].belief + def.size / 2);
      lines.push(belief ? '🗿 Ahnenplatz in der Nähe' : '🗿 Kein Ahnenplatz in der Nähe');
    }
  }
  if (def.workers && !b.build) lines.push(b.paused ? '⏸ Pausiert – die Arbeiter helfen in anderen Gebäuden'
    : `👤 Arbeiter: ${stats.staff[i] || 0} von ${def.workers}`);
  if (def.produces && !b.build) {
    const out = outputPerMinute(i);
    lines.push('Stellt her: ' + Object.entries(out).map(([id, n]) => `${RESOURCES[id].icon} ${n.toFixed(1)}/min`).join(', '));
    if (def.consumes) lines.push('Braucht: ' + Object.entries(def.consumes).map(([id, n]) => `${RESOURCES[id].icon} ${n}/min`).join(', '));
    const tb = terrainBonus(b);
    if (def.bonus) lines.push(`🌲 Geländebonus (${TERRAIN[def.bonus.terrain].name}): +${Math.round(tb * 100)} %`);
    if (SEASON_FACTORS[b.type]) lines.push(`${season().icon} ${season().name}: ${Math.round(SEASON_FACTORS[b.type][seasonIndex()] * 100)} %`);
  }
  if (def.warmth) lines.push(`🔥 Wärme im Umkreis von ${warmthRadius(def)} Feldern`);
  if (def.belief) lines.push(`🗿 Glaube im Umkreis von ${def.belief} Feldern`);
  if (def.storage) lines.push(`📦 Lagerplatz +${def.storage} je Ware`);

  let upgrade = '';
  const to = upgradeTarget(b);
  if (to) {
    const t = BUILDINGS[to];
    const problem = upgradeProblem(i);
    upgrade = `<div class="upgrade">
      <h3>Weiterentwickeln zu ${t.icon} ${esc(t.name)}</h3>
      <p>${esc(t.info)}</p>
      <p>${costHtml(t.cost)} · ⏱ ${formatTime(t.time)}${t.size > def.size ? ` · braucht ${t.size}×${t.size} Felder` : ''}</p>
      <button class="btn primary" ${problem ? 'disabled' : ''} onclick="doUpgrade(${i})">⬆ Weiterentwickeln</button>
      ${problem ? `<small class="bad">${esc(problem)}</small>` : ''}
    </div>`;
  }
  const canRemove = def.buildable !== false;
  openDialog(`
    <div class="dlg-head">${iconHtml(def.bild, def.icon, 'huge')}<div><h2>${esc(def.name)}</h2><p>${esc(def.info)}</p></div></div>
    ${road}
    <ul class="lines">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
    ${upgrade}
    <div class="buttons">
      ${def.workers && !b.build ? `<button class="btn" onclick="doTogglePause(${i})">${b.paused ? '▶ Weiter' : '⏸ Pause'}</button>` : ''}
      ${def.isPath ? '' : `<button class="btn" onclick="closeDialog(); liftBuilding(${i})">✋ Verschieben</button>`}
      ${canRemove ? `<button class="btn danger" onclick="askDemolish(${i})">🗑 Abreißen</button>` : ''}
      <button class="btn" onclick="closeDialog()">Schließen</button>
    </div>`);
}

function doTogglePause(i) {
  if (!togglePause(i)) return;
  const b = state.buildings[i];
  toast(b.paused ? `⏸ ${BUILDINGS[b.type].name} pausiert – die Leute arbeiten jetzt anderswo` : `▶ ${BUILDINGS[b.type].name} arbeitet wieder`);
  showBuildingWindow(i);
}

function doBuildRoute(i) {
  const problem = buildRoute(i);
  if (problem) { toast(problem); return; }
  closeDialog();
  toast('🛤️ Weg gebaut');
  renderAll();
}

function doUpgrade(i) {
  const problem = upgradeBuilding(i);
  if (problem) { toast(problem); return; }
  closeDialog();
  toast('Wird weiterentwickelt …');
  renderAll();
}

function askDemolish(i) {
  const b = state.buildings[i];
  const refund = formatAmounts(refundOf(b));
  openDialog(`<h2>${esc(BUILDINGS[b.type].name)} abreißen?</h2>
    <p>Du bekommst zurück: ${refund || 'nichts'}</p>
    <div class="buttons"><button class="btn danger" onclick="closeDialog(); demolish(${i}); renderAll()">Ja, abreißen</button>
    <button class="btn" onclick="closeDialog()">Nein</button></div>`);
}

function showPlotDialog(p) {
  if (!canBuyPlot(p)) { toast('Dieses Land liegt zu weit weg – kaufe erst das Land daneben'); return; }
  const price = plotPrice();
  openDialog(`<h2>🛒 Land kaufen</h2>
    <p>Ein neues Stück Land (${CONFIG.plotSize}×${CONFIG.plotSize} Felder) für dein Lager.</p>
    <p>${costHtml(price)}</p>
    <div class="buttons"><button class="btn primary" ${canAfford(price) ? '' : 'disabled'} onclick="doBuyPlot(${p})">Kaufen</button>
    <button class="btn" onclick="closeDialog()">Später</button></div>
    ${canAfford(price) ? '' : `<small class="bad">${esc(missingText(price))}</small>`}`);
}

function doBuyPlot(p) {
  if (buyPlot(p)) { closeDialog(); toast('Neues Land gehört jetzt dir!'); } else toast(missingText(plotPrice()) || 'Geht nicht');
}

// ---------------------------------------------------------------------
// Forschungsbaum
// ---------------------------------------------------------------------

const TREE_COL_W = 190, TREE_ROW_H = 108, TREE_PAD = 46;
let researchSelected = null;

function techEffectText(id) {
  const t = TECHS[id];
  const e = t.effect || {};
  const out = [];
  for (const [type, def] of Object.entries(BUILDINGS)) {
    if (def.requires !== id) continue;
    out.push(def.upgradeOnly ? `Neu: ${def.icon} ${def.name} (Weiterentwicklung)` : `Neu: ${def.icon} ${def.name}`);
  }
  for (const [type, n] of Object.entries(e.bonus || {})) out.push(`${BUILDINGS[type].name} +${Math.round(n * 100)} %`);
  for (const [type, n] of Object.entries(e.housing || {})) out.push(`${BUILDINGS[type].name} +${n} Platz`);
  if (e.warmth) out.push(`Feuer wärmen ${e.warmth} Felder weiter`);
  if (e.storage) out.push(`Lagerplatz +${Math.round(e.storage * 100)} %`);
  if (e.stage) out.push(`Öffnet die ${STAGES[stageIndex(e.stage)].name}`);
  if (id === 'kupferfund') out.push('Macht den Aufbruch in die Bronzezeit möglich');
  return out.join(' · ') || '–';
}

function treeNodeHtml(id) {
  const t = TECHS[id];
  const status = techStatus(id);
  const x = TREE_PAD + t.col * TREE_COL_W, y = TREE_PAD + t.row * TREE_ROW_H;
  const sub = status === 'done' ? 'erforscht'
    : status === 'running' ? `<span class="nbar"><i style="width:${Math.round((1 - state.research.left / t.time) * 100)}%"></i></span>⏳ ${formatTime(state.research.left)}`
    : `${costHtml(t.cost)} · ⏱ ${formatTime(t.time)}`;
  return `<button class="node ${status}${t.transition ? ' transition' : ''}${researchSelected === id ? ' sel' : ''}" style="left:${x}px;top:${y}px" onclick="selectTech('${id}')">
    <span class="medal">${iconHtml(t.bild, t.icon)}${status === 'locked' ? '<i class="lock">🔒</i>' : ''}</span><span class="nname">${esc(t.name)}</span><span class="nsub">${sub}</span>${status === 'done' ? '<i class="check">✔</i>' : ''}</button>`;
}

function treeLines() {
  const pos = id => ({ x: TREE_PAD + TECHS[id].col * TREE_COL_W, y: TREE_PAD + TECHS[id].row * TREE_ROW_H });
  const W = 150, H = 70;
  let svg = '';
  for (const [id, t] of Object.entries(TECHS)) {
    // Übergangs-Knoten bekommen nur Linien von den Forschungen der eigenen Stufe, die nichts Weiteres öffnen
    for (const r of t.requires) {
      const a = pos(r), b = pos(id);
      const done = state.techs[r];
      svg += `<path d="M${a.x + W} ${a.y + H / 2} C${a.x + W + 30} ${a.y + H / 2}, ${b.x - 30} ${b.y + H / 2}, ${b.x} ${b.y + H / 2}" class="${done ? 'done' : techStatus(id) === 'available' ? 'open' : ''}"/>`;
    }
  }
  const last = Object.keys(TECHS).find(id => id === 'kupferfund');
  const a = pos(last), b = { x: TREE_PAD + NEXT_EPOCH.col * TREE_COL_W, y: TREE_PAD + NEXT_EPOCH.row * TREE_ROW_H };
  svg += `<path d="M${a.x + W} ${a.y + H / 2} L${b.x} ${b.y + H / 2}" class="${state.techs[last] ? 'done' : ''}"/>`;
  return svg;
}

function researchPageHtml() {
  const cols = NEXT_EPOCH.col + 1, rows = 5;
  const width = TREE_PAD * 2 + cols * TREE_COL_W, height = TREE_PAD + rows * TREE_ROW_H;
  const headers = STAGES.map((st, k) => {
    const cs = Object.values(TECHS).filter(t => t.stage === st.id).map(t => t.col);
    const x0 = TREE_PAD + Math.min(...cs) * TREE_COL_W, x1 = TREE_PAD + Math.max(...cs) * TREE_COL_W + 150;
    const cls = stageReached(st.id) ? ' reached' : '';
    return `<div class="stage-band s${k}${cls}" style="left:${x0 - 16}px;width:${x1 - x0 + 32}px;height:${height - 8}px"></div>
      <div class="stage-head${cls}" style="left:${x0}px;width:${x1 - x0}px"><span>${stageReached(st.id) ? '' : '🔒 '}${esc(st.name)}</span></div>`;
  }).join('');
  const nx = TREE_PAD + NEXT_EPOCH.col * TREE_COL_W, ny = TREE_PAD + NEXT_EPOCH.row * TREE_ROW_H;
  const next = `<button class="node locked transition epoch" style="left:${nx}px;top:${ny}px" onclick="selectTech('__next')">
    <span class="ic emoji">${NEXT_EPOCH.icon}</span><span class="nname">${esc(NEXT_EPOCH.name)}</span><span class="nsub">kommt bald</span></button>`;
  return `<div class="research-top" id="research-top">${researchTopHtml()}</div>
    <div class="tree-scroll" id="tree-scroll"><div class="tree" style="width:${width}px;height:${height}px">
      <svg class="tree-lines" width="${width}" height="${height}">${treeLines()}</svg>
      ${headers}${Object.keys(TECHS).map(treeNodeHtml).join('')}${next}
    </div></div>
    <div class="tech-detail" id="tech-detail">${techDetailHtml()}</div>`;
}

function researchTopHtml() {
  const r = state.research;
  const running = r
    ? `<span class="rt-chip run">${TECHS[r.id].icon} <b>${esc(TECHS[r.id].name)}</b> <span class="mini-bar wide"><i style="width:${Math.round((1 - r.left / TECHS[r.id].time) * 100)}%"></i></span> noch ${formatTime(r.left)}</span>`
    : '<span class="rt-chip idle">Gerade wird nichts erforscht – tippe eine leuchtende Karte an.</span>';
  return `<span class="rt-chip">💡 Wissen <b>${Math.floor(state.res.wissen)}</b></span>${running}`;
}

function techDetailHtml() {
  const id = researchSelected;
  if (!id) return '<p>Tippe eine Forschung an, um zu sehen, was sie bringt.</p>';
  if (id === '__next') {
    return `<h3>${NEXT_EPOCH.icon} ${esc(NEXT_EPOCH.name)}</h3>
      <p>Braucht alle Forschungen der Steinzeit, einen Steinkreis und ${NEXT_EPOCH.population} Einwohner. Waren: ${costHtml(NEXT_EPOCH.cost)}</p>
      <p><i>Die Bronzezeit wird als Nächstes gebaut.</i></p>`;
  }
  const t = TECHS[id];
  const problem = researchProblem(id);
  const status = techStatus(id);
  const req = t.requires.length ? t.requires.map(r => `${state.techs[r] ? '✔' : '✖'} ${TECHS[r].name}`).join(', ') : 'nichts';
  const effects = techEffectText(id).split(' · ').map(e => `<span class="tag">${esc(e)}</span>`).join('');
  return `<div class="td-medal ${status}">${iconHtml(t.bild, t.icon, 'big')}</div>
    <div class="td-main">
      <h3>${esc(t.name)}</h3>
      <div class="td-chips">${effects}</div>
      <p><b>Kosten:</b> ${costHtml(t.cost)} · ⏱ ${formatTime(t.time)}${t.population ? ` · 👥 ${t.population} Einwohner` : ''} · <b>Vorher:</b> ${esc(req)}</p>
    </div>
    <div class="td-action">${status === 'done' ? '<span class="tag good">✔ Erforscht</span>'
      : status === 'running' ? '<span class="tag">⏳ Läuft …</span>'
      : `<button class="btn primary" ${problem ? 'disabled' : ''} onclick="doResearch('${id}')">📜 Erforschen</button>${problem ? `<small class="bad">${esc(problem)}</small>` : ''}`}</div>`;
}

function openResearch() {
  closeInfo();
  if (!researchSelected) researchSelected = state.research ? state.research.id : Object.keys(TECHS).find(id => techStatus(id) === 'available') || null;
  openPage('📜 Forschung', researchPageHtml(), 'research');
  // zur aktuellen Stufe scrollen
  const sc = $('tree-scroll');
  const col = Math.min(...Object.values(TECHS).filter(t => t.stage === state.stage).map(t => t.col));
  if (sc) sc.scrollLeft = Math.max(0, TREE_PAD + col * TREE_COL_W - 20);
  emit('researchOpened');
}

function refreshResearchPage() {
  if (pageOpen !== 'research') return;
  const sc = $('tree-scroll');
  const left = sc ? sc.scrollLeft : 0, top = sc ? sc.scrollTop : 0;
  $('page-body').innerHTML = researchPageHtml();
  const sc2 = $('tree-scroll');
  if (sc2) { sc2.scrollLeft = left; sc2.scrollTop = top; }
}

function selectTech(id) {
  researchSelected = id;
  refreshResearchPage();
}

function doResearch(id) {
  const problem = startResearch(id);
  if (problem) { toast(problem); return; }
  toast(`📜 ${TECHS[id].name} wird erforscht`);
  refreshResearchPage();
  renderSideButtons();
}

// ---------------------------------------------------------------------
// Aufträge
// ---------------------------------------------------------------------

function questIcon(q) {
  const g = q.goal;
  if (g.build) return iconHtml(BUILDINGS[g.build].bild, BUILDINGS[g.build].icon, 'big');
  if (g.resource) return iconHtml(RESOURCES[g.resource].bild, RESOURCES[g.resource].icon, 'big');
  if (g.population) return '<span class="ic emoji big">👥</span>';
  return '<span class="ic emoji big">📜</span>';
}

function rewardChips(reward) {
  return Object.entries(reward).map(([id, n]) => `<span class="tag">${iconHtml(RESOURCES[id].bild, RESOURCES[id].icon, 'mini')} ${n}</span>`).join('');
}

function questsHtml() {
  const doneCount = Object.keys(state.quests).length;
  const head = `<div class="quest-sum"><span>🏆 Erledigt <b>${doneCount}</b> von ${QUESTS.length}</span>
    <span class="q-bar thin"><i style="width:${Math.round(100 * doneCount / QUESTS.length)}%"></i></span></div>`;
  const list = activeQuests();
  if (!list.length) return `<div class="quests">${head}<p class="empty-note">Alle Aufträge erledigt – neue kommen mit der nächsten Epoche.</p></div>`;
  return `<div class="quests">${head}` + list.map(q => {
    const p = questProgress(q);
    const done = p.have >= p.need;
    const pct = Math.round(100 * p.have / p.need);
    return `<div class="quest-card${done ? ' done' : ''}">
      <div class="q-medal">${questIcon(q)}</div>
      <div class="q-main">
        <b>${esc(q.text)}</b>
        <span class="q-bar"><i style="width:${pct}%"></i><em>${p.have} / ${p.need}</em></span>
        <span class="q-reward">Belohnung ${rewardChips(q.reward)}</span>
      </div>
      ${done ? `<button class="btn primary" onclick="doClaim('${q.id}')">🎁 Abholen</button>` : `<span class="q-pct">${pct}%</span>`}
    </div>`;
  }).join('') + '</div>';
}

function openQuests() {
  closeInfo();
  openPage('📋 Aufträge', questsHtml(), 'quests');
  emit('questsOpened');
}

function doClaim(id) {
  if (claimQuest(id)) toast('🎁 ' + formatAmounts(QUESTS.find(q => q.id === id).reward));
  if (pageOpen === 'quests') $('page-body').innerHTML = questsHtml();
  renderAll();
}

// ---------------------------------------------------------------------
// Tägliche Belohnung und „Willkommen zurück“
// ---------------------------------------------------------------------

function showDailyReward() {
  const day = state.daily.pending;
  if (!day) return;
  const boxes = DAILY_REWARDS.map((r, k) => `<div class="day${k + 1 === day ? ' today' : k + 1 < day ? ' past' : ''}"><b>Tag ${k + 1}</b><small>${formatAmounts(r)}</small></div>`).join('');
  openDialog(`<h2>🎁 Tägliche Belohnung</h2>
    <p>Tag ${day} von 7 – komm jeden Tag wieder, am 7. Tag gibt es die große Truhe!</p>
    <div class="days">${boxes}</div>
    <div class="buttons"><button class="btn primary" onclick="doClaimDaily()">Abholen</button></div>`);
}

function doClaimDaily() {
  const r = claimDailyReward();
  closeDialog();
  if (r) toast('🎁 ' + formatAmounts(r));
  renderAll();
}

function showOfflineSummary(result) {
  if (!result) return;
  const gained = Object.entries(result.gained).filter(([, n]) => n > 0);
  openDialog(`<h2>Willkommen zurück!</h2>
    <p>Du warst ${formatTime(result.seconds)} weg. Dein Stamm hat weitergearbeitet:</p>
    <p>${gained.length ? gained.map(([id, n]) => `${RESOURCES[id].icon} +${Math.floor(n)}`).join('  ') : 'nicht viel Neues'}${result.pop > 0 ? `  👥 +${result.pop}` : ''}</p>
    <div class="buttons"><button class="btn primary" onclick="closeDialog(); afterWelcome()">Weiter</button></div>`);
}

// ---------------------------------------------------------------------
// Menü, Einstellungen, Spielstände
// ---------------------------------------------------------------------

function menuHtml() {
  const stat = (value, label) => `<div class="stat"><b>${value}</b><small>${label}</small></div>`;
  const tile = (icon, label, action) => `<button class="tile" onclick="${action}"><span class="emoji">${icon}</span>${label}</button>`;
  const sw = (key, icon, label, note) => `<label class="switch-row"><span>${icon} ${label}<small>${note}</small></span>
    <input type="checkbox" class="switch" ${settings[key] ? 'checked' : ''} onchange="settings.${key}=this.checked; saveSettings()"></label>`;
  return `<div class="menu">
    <section class="card wide">
      <h3>🏕️ Dein Stamm</h3>
      <div class="stats">
        ${stat(Math.floor(state.pop), 'Einwohner')}${stat(esc(STAGES[stageIndex()].name), 'Epoche')}
        ${stat(Object.keys(state.techs).length, 'Forschungen')}${stat(formatTime(state.playTime), 'gespielt')}
      </div>
    </section>
    <section class="card">
      <h3>⚙️ Einstellungen</h3>
      ${sw('sound', '🔊', 'Geräusche', 'kommen später')}
      ${sw('music', '🎵', 'Musik', 'kommt später')}
      <div class="tiles">${tile('👴', 'Einstieg neu starten', 'closePage(); restartTutorial()')}</div>
    </section>
    <section class="card">
      <h3>💾 Spielstand <small>Platz ${currentSlot}</small></h3>
      <div class="tiles">
        ${tile('💾', 'Speichern', "saveGame(); toast('Gespeichert')")}
        ${tile('🗂', 'Spielstände', 'openSlots(true)')}
        ${tile('📤', 'Exportieren', 'showExport()')}
        ${tile('📥', 'Importieren', 'showImport()')}
        ${tile('🏠', 'Startseite', 'saveGame(); closePage(); showStartScreen()')}
      </div>
    </section>
    <p class="version">Epochia · Version ${APP_VERSION}</p>
  </div>`;
}

function openMenu() {
  closeInfo();
  openPage('⚙️ Menü', menuHtml(), 'menu');
}

function slotsHtml(inGame) {
  return SLOTS.map(slot => {
    const info = slotInfo(slot);
    const desc = !info ? 'leer' : info.broken ? 'beschädigt' : `${info.stage} · ${info.pop} Einwohner · ${new Date(info.savedAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}`;
    return `<div class="slot${slot === currentSlot ? ' current' : ''}">
      <div><b>Platz ${slot}</b>${slot === currentSlot && inGame ? ' (gerade offen)' : ''}<small>${esc(desc)}</small></div>
      <button class="btn primary" onclick="chooseSlot(${slot})">${info && !info.broken ? 'Spielen' : 'Neues Spiel'}</button>
      ${info ? `<button class="btn danger" onclick="askDeleteSlot(${slot})">🗑</button>` : ''}
    </div>`;
  }).join('');
}

function openSlots(inGame = false) {
  if (inGame) saveGame();
  openPage('🗂 Spielstände', slotsHtml(inGame), 'slots');
}

function chooseSlot(slot) {
  if (state && gameRunning) saveGame();
  currentSlot = slot;
  saveSettings();
  closePage();
  enterGame();
}

function askDeleteSlot(slot) {
  openDialog(`<h2>Platz ${slot} löschen?</h2><p>Der Spielstand ist dann für immer weg.</p>
    <div class="buttons"><button class="btn danger" onclick="doDeleteSlot(${slot})">Löschen</button><button class="btn" onclick="closeDialog()">Nein</button></div>`);
}

function doDeleteSlot(slot) {
  deleteSlot(slot);
  closeDialog();
  if (slot === currentSlot && gameRunning) { startNewGame(); saveGame(); renderAll(); }
  if (pageOpen === 'slots') $('page-body').innerHTML = slotsHtml(gameRunning);
}

function showExport() {
  openDialog(`<h2>📤 Exportieren</h2><p>Diesen Text kopieren und sicher aufheben (z. B. in einer Notiz):</p>
    <textarea readonly onclick="this.select()">${esc(exportText())}</textarea>
    <div class="buttons"><button class="btn" onclick="closeDialog()">Fertig</button></div>`);
}

function showImport() {
  openDialog(`<h2>📥 Importieren</h2><p>Exportierten Text hier einfügen. Der Spielstand auf Platz ${currentSlot} wird ersetzt.</p>
    <textarea id="import-text"></textarea>
    <div class="buttons"><button class="btn primary" onclick="doImport()">Laden</button><button class="btn" onclick="closeDialog()">Abbrechen</button></div>`);
}

function doImport() {
  if (importText($('import-text').value)) {
    saveGame();
    closeDialog();
    closePage();
    centerOnCamp();
    renderAll();
    toast('Spielstand geladen');
  } else toast('Der Text ist kein gültiger Spielstand');
}
