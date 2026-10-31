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

// Wetter-Symbol oben: nachts der Mond, sonst das Wetter (sobald es richtig da ist)
function weatherIcon() {
  if (state.disaster && DISASTERS[state.disaster.id]) return DISASTERS[state.disaster.id].icon + '❗';
  const w = currentWeather();
  if (darkness() > 0.5 && (w.id === 'klar' || w.k < 0.5)) return '🌙';
  return w.k >= 0.5 ? w.icon : '';
}

// Wetter-Fenster: Jahreszeit, Tageszeit, Wetter mit Wirkung, Katastrophe – mit Restzeiten
function weatherTip() {
  const w = currentWeather(), q = CONFIG.yearSeconds / 4;
  const seasonLeft = q - (state.yearTime % q);
  const dayLeft = CONFIG.daySeconds - (state.playTime % CONFIG.daySeconds);
  const weatherLeft = CONFIG.weatherSeconds - (state.playTime % CONFIG.weatherSeconds);
  const d = state.disaster && DISASTERS[state.disaster.id];
  openDialog(`<h2>${season().icon} ${esc(season().name)} · ${w.icon} ${esc(w.name)}</h2>
    <div class="info-list">
      <div><span>${season().icon} Jahreszeit</span><b>${esc(season().name)}</b><small>noch ${formatTime(seasonLeft)}</small></div>
      <div><span>${timeOfDay().icon} Tageszeit</span><b>${esc(timeOfDay().name)}</b><small>ganzer Tag ${formatTime(CONFIG.daySeconds)} · neuer Tag in ${formatTime(dayLeft)}</small></div>
      <div><span>${w.icon} Wetter</span><b>${esc(w.name)}</b><small>${esc((w.effect && w.effect.text) || '')} · wechselt in ${formatTime(weatherLeft)}</small></div>
      ${d ? `<div class="bad"><span>${d.icon} ${esc(d.name)}</span><b>noch ${formatTime(state.disaster.left)}</b><small>${esc(d.text)}</small></div>` : ''}
      ${seasonIndex() === 3 || SEASON_FACTORS.sammlerin[seasonIndex()] !== 1 ? `<div><span>🍂 Jahreszeit wirkt</span><small>Sammlerinnen ×${SEASON_FACTORS.sammlerin[seasonIndex()]} · Äcker ×${SEASON_FACTORS.acker[seasonIndex()]}</small></div>` : ''}
    </div>
    <p class="hint">Im Jahr: Frühling, Sommer, Herbst, Winter je ${formatTime(q)}. Gewitter und Sturm sind selten, Katastrophen sehr selten.</p>
    <div class="buttons"><button class="btn" onclick="closeDialog()">Schließen</button></div>`);
}

// Maß für das Layout merken (z. B. Höhe der oberen Leiste); im Test ohne Browser gibt es kein documentElement
function setCssVar(name, value) {
  const root = typeof document !== 'undefined' && document.documentElement;
  if (root && root.style) root.style.setProperty(name, value);
}

// Leisten oben und unten im Stil des Zeitalters (Bilder leiste-holz-<epoche>.webp und leiste-leder-<epoche>.webp)
let themeEpoch = '';
function applyEpochTheme() {
  const key = STAGES[stageIndex()].epoch.toLowerCase();
  if (key === themeEpoch) return;
  themeEpoch = key;
  setCssVar('--bar-wood', `url(${IMAGE_DIR}leiste-holz-${key}.webp)`);
  setCssVar('--bar-leather', `url(${IMAGE_DIR}leiste-leder-${key}.webp)`);
}

function renderTopbar() {
  applyEpochTheme();
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
      <button class="chip" onclick="weatherTip()">${season().icon}${weatherIcon()}</button>
    </div>`;
  if (html !== lastTopbar) {
    $('topbar').innerHTML = html;
    lastTopbar = html;
    // Seitenknöpfe unter die (evtl. zweizeilige) obere Leiste schieben
    const h = $('topbar').offsetHeight;
    if (h) setCssVar('--top-h', h + 'px');
  }
}

const perMin = n => (n >= 10 ? Math.round(n) : n.toFixed(1)).toString().replace('.', ',');

// Ware antippen: Einnahmen und Ausgaben je Gebäude, Saldo, Lager und was gerade wirkt
function resourceTip(id) {
  const r = RESOURCES[id], f = (stats.flows || {})[id] || { in: {}, out: {} };
  const count = type => state.buildings.filter(b => b.type === type && !b.build).length;
  const who = k => (k === '__pop' ? `👥 ${Math.floor(state.pop)} Einwohner` : `${BUILDINGS[k].icon} ${esc(BUILDINGS[k].name)} ×${count(k)}`);
  const rows = (obj, sign) => Object.entries(obj).filter(([, n]) => n > 0.005).sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `<div><span>${who(k)}</span><b class="${sign === '+' ? 'good' : 'bad'}">${sign}${perMin(n)}</b></div>`).join('') || '<div><small>nichts</small></div>';
  const net = stats.rates[id] || 0, stock = state.res[id] || 0, cap = storageCap();
  const when = net < -0.01 ? `leer in ${formatTime(stock / -net * 60)}` : net > 0.01 && stock < cap ? `voll in ${formatTime((cap - stock) / net * 60)}` : '';
  const eff = activeEffects().filter(e => e.k > 0.3 && e.effect.text && e.effect.text !== 'keine Wirkung').map(e => `${e.icon} ${esc(e.name)}: ${esc(e.effect.text)}`);
  openDialog(`<h2>${iconHtml(r.bild, r.icon)} ${esc(r.name)}</h2>
    <p>Im Lager: <b>${Math.floor(stock)}</b> von ${cap}${when ? ` · ${when}` : ''}</p>
    <h3>Einnahmen je Minute</h3><div class="info-list">${rows(f.in, '+')}</div>
    <h3>Ausgaben je Minute</h3><div class="info-list">${rows(f.out, '−')}</div>
    ${id === 'wissen' ? '<p class="hint">Wissen wird beim Start einer Forschung auf einmal bezahlt.</p>' : ''}
    <p class="net">Zusammen: <b class="${net >= 0 ? 'good' : 'bad'}">${net >= 0 ? '+' : '−'}${perMin(Math.abs(net))} je Minute</b></p>
    ${eff.length ? `<p class="hint">Wirkt gerade: ${eff.join(' · ')}</p>` : ''}
    <div class="buttons"><button class="btn" onclick="closeDialog()">Schließen</button></div>`);
}

function popTip() {
  const homes = {};
  state.buildings.forEach((b, i) => { const h = !b.build && isConnected(i) ? housingOf(b.type) : 0; if (h) homes[b.type] = (homes[b.type] || 0) + h; });
  const why = stats.housing <= state.pop ? 'Kein freier Wohnplatz – baue Wohnungen.'
    : state.res.nahrung <= 1 ? 'Es fehlt Nahrung.'
    : stats.happiness < CONFIG.growthMinHappy ? `Zu unzufrieden (unter ${CONFIG.growthMinHappy} %).`
    : effectGrowthStopped() ? 'Bei diesem Wetter zieht niemand zu.'
    : `Alle ${formatTime(CONFIG.growthSeconds)} zieht jemand ein.`;
  openDialog(`<h2>👥 Einwohner</h2>
    <div class="info-list">
      <div><span>Einwohner</span><b>${Math.floor(state.pop)}</b></div>
      <div><span>Wohnplätze</span><b>${stats.housing}</b><small>${Object.entries(homes).map(([t, n]) => `${BUILDINGS[t].icon} ${esc(BUILDINGS[t].name)} ${n}`).join(' · ') || '–'}</small></div>
      <div><span>Arbeit</span><b>${stats.workers} / ${stats.jobs}</b><small>${stats.jobs > stats.workers ? `${stats.jobs - stats.workers} Stellen frei – Gebäude arbeiten langsamer` : 'alle Stellen besetzt'}</small></div>
      <div><span>Zuzug</span><small>${esc(why)}</small></div>
      <div><span>🍖 Essen</span><small>Jeder isst ${perMin(CONFIG.foodPerPerson * effectFood())} Nahrung je Minute</small></div>
    </div>
    <div class="buttons"><button class="btn" onclick="closeDialog()">Schließen</button></div>`);
}

function happyTip() {
  const needs = activeNeeds().map(n => `<div><span>${n.icon} ${esc(n.name)}</span><b>${Math.round((stats.needs[n.id] || 0) * 100)} %</b><small>${n.kind === 'stock' ? 'genug im Lager?' : 'Anteil der Wohnungen im Umkreis'}</small></div>`).join('');
  const eff = activeEffects().filter(e => e.effect.happy && e.k > 0.05).map(e => `<div><span>${e.icon} ${esc(e.name)}</span><b class="${e.effect.happy > 0 ? 'good' : 'bad'}">${e.effect.happy > 0 ? '+' : '−'}${Math.round(Math.abs(e.effect.happy * e.k))}</b></div>`).join('');
  openDialog(`<h2>😊 Zufriedenheit ${stats.happiness} %</h2>
    <h3>Bedürfnisse (${stats.needsHappy} %)</h3><div class="info-list">${needs}</div>
    ${eff ? `<h3>Wetter und Ereignisse</h3><div class="info-list">${eff}</div>` : ''}
    <p class="hint">Zufriedene arbeiten schneller: Gebäude schaffen gerade ${Math.round(happinessFactor() * 100)} %. Ab ${CONFIG.growthMinHappy} % ziehen neue Leute zu.</p>
    <div class="buttons"><button class="btn" onclick="closeDialog()">Schließen</button></div>`);
}

// ---------------------------------------------------------------------
// Knöpfe am Rand
// ---------------------------------------------------------------------

// Grundriss-Ansicht: Gebäude nur als flache Platten, damit man dahinter Wege bauen und Bäume sehen kann
function toggleFootprint() {
  settings.footprint = !settings.footprint;
  saveSettings();
  toast(settings.footprint ? '📐 Grundriss: Gebäude flach – Wege dahinter gut sichtbar' : '🏠 Gebäude wieder ganz');
  renderSideButtons();
}

function renderSideButtons() {
  const fb = $('btn-footprint');
  if (fb && fb.classList) fb.classList.toggle('on', !!settings.footprint);
  const r = state.research;
  // Laufende Forschung: Balken und Restzeit direkt am Forschung-Knopf (nicht mitten auf der Karte)
  show($('research-pill'), false);
  const rb = $('btn-research');
  if (rb && rb.querySelector) {
    const label = rb.querySelector('span'), bar = $('research-prog');
    if (label) label.textContent = r ? formatTime(r.left) : 'Forschung';
    if (bar) { bar.style.width = r ? Math.round((1 - r.left / TECHS[r.id].time) * 100) + '%' : '0'; show(bar.parentNode, !!r); }
  }
  const ready = activeQuests().filter(questDone).length;
  $('quest-badge').textContent = ready || '';
  show($('quest-badge'), ready > 0);
  const canResearch = !r && Object.keys(TECHS).some(id => !researchProblem(id));
  show($('research-badge'), canResearch);
  show($('btn-daily'), !!state.daily.pending);
  // Truhe statt 🎁, sobald das Bild geladen ist
  const daily = $('btn-daily');
  if (images.truhe && !daily.querySelector('img')) daily.innerHTML = `${iconHtml('truhe', '🎁')}<span>Belohnung</span>`;
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

// Bauleiste einklappen (mehr Platz für die Karte) und wieder aufklappen; bleibt gespeichert
function applyBarHidden() {
  const hidden = !!settings.barHidden;
  const game = $('game');
  if (game && game.classList) game.classList.toggle('bar-hidden', hidden);
  const btn = $('bar-toggle');
  if (btn) btn.innerHTML = hidden ? '🔨 <b>Bauen</b>' : '▾';
}

function toggleBuildBar(force) {
  settings.barHidden = force === undefined ? !settings.barHidden : !!force;
  saveSettings();
  applyBarHidden();
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
      <span class="txt"><span class="name">${esc(def.name)}</span>
      <span class="costs">${locked ? '🔒' : costHtml(def.cost)}</span></span>
    </div>`;
  }).join('');
  applyBarHidden();
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
      if (typeof playSound === 'function') playSound(kind === 'wald' ? 'hacken' : 'klirren');
      toast(`+${formatAmounts(t.clear)}`);
    }
    closeInfo();
  };
  show(el, true);
  positionInfo();
  clearTimeout(infoTimer);
  infoTimer = setTimeout(closeInfo, 4000);
}

// Mammutherde angetippt: Speer zum Losschicken der Jäger (oder erklären, was noch fehlt)
function showHuntInfo(a) {
  const problem = huntProblem();
  if (problem) { closeInfo(); toast('🦣 ' + problem); return; }
  infoFor = { kind: 'herd', a };
  const el = $('info-pop');
  el.classList.add('tool');
  el.innerHTML = `<span class="tool-ic">${iconHtml('f-speer', '🗡️', 'big')}</span><span>Mammut jagen<small>+${formatAmounts(huntReward())}</small></span>`;
  el.onclick = () => {
    const err = startHunt(a.x, a.y);
    toast(err || `🏹 Die Jäger ziehen los – in ${formatTime(CONFIG.hunt.seconds)} sind sie zurück`);
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
    // Werkzeug schwebt über dem Baum bzw. Felsen (oder über dem Mammut)
    const c = infoFor.kind === 'herd' ? tileToScreen(infoFor.a.x, infoFor.a.y) : tileToScreen(infoFor.x + 0.5, infoFor.y + 0.5);
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

// Verlauf des Browsers: Jede offene Seite und jeder Dialog bekommt einen Eintrag, damit die Zurück-Taste bzw.
// Wischgeste des Handys genau eine Ebene zurückgeht. Zurückgehen per Knopf wird gesammelt und am Ende in einem
// Schritt erledigt; wird dazwischen etwas Neues geöffnet, ersetzt es den Eintrag statt einen neuen anzulegen.
const hasHistory = () => typeof history !== 'undefined' && !!history.pushState;
let histDepth = 0, pendingBack = 0, skipPop = 0;

function pushEntry(kind) {
  if (!hasHistory()) return;
  if (pendingBack > 0) { pendingBack--; history.replaceState({ epochia: kind }, ''); return; }
  history.pushState({ epochia: kind }, '');
  histDepth++;
}

function popEntries(n = 1) {
  if (!hasHistory()) return;
  n = Math.min(n, histDepth);
  if (n <= 0) return;
  histDepth -= n;
  const first = pendingBack === 0;
  pendingBack += n;
  if (first) setTimeout(() => {
    const k = pendingBack;
    pendingBack = 0;
    if (k > 0) { skipPop++; history.go(-k); }
  }, 0);
}

// Zurück-Taste des Handys: erst ein offener Dialog, dann die oberste Seite
function onHistoryBack() {
  if (skipPop > 0) { skipPop--; return; }
  histDepth = Math.max(0, histDepth - 1);
  if (dialogOpen) closeDialog(true);
  else if (pageOpen) closePage(true);
}

let dialogOpen = false;

function openDialog(html) {
  $('dialog-box').innerHTML = html;
  show($('dialog'), true);
  if (!dialogOpen) pushEntry('dialog');
  dialogOpen = true;
}

function closeDialog(fromHistory = false) {
  if (!dialogOpen) return;
  dialogOpen = false;
  show($('dialog'), false);
  if (!fromHistory) popEntries(1);
}

let pageOpen = null;
const pageStack = [];        // darunterliegende Seiten (z. B. Menü unter Spielstände) – „Zurück“ führt dorthin
let reopening = false;
const PAGE_OPENERS = { menu: () => openMenu(), slots: () => openSlots(true), research: () => openResearch(), quests: () => openQuests() };

function openPage(title, html, name) {
  $('page-title').textContent = title;
  $('page-body').innerHTML = html;
  show($('page'), true);
  if (!reopening && pageOpen !== name) {
    if (pageOpen) pageStack.push(pageOpen);
    pushEntry('page');
  }
  pageOpen = name;
}

// Eine Seite zurück (Knopf „Zurück“ oder Zurück-Taste des Handys)
function closePage(fromHistory = false) {
  if (!pageOpen) return;
  const prev = pageStack.pop();
  pageOpen = null;
  if (!fromHistory) popEntries(1);
  if (prev && PAGE_OPENERS[prev]) {
    reopening = true;
    try { PAGE_OPENERS[prev](); } finally { reopening = false; }
    return;
  }
  show($('page'), false);
}

// Alle Seiten schließen, zurück aufs Spielfeld (z. B. nach dem Wechsel des Spielstands)
function closeAllPages() {
  if (!pageOpen) return;
  const n = pageStack.length + 1;
  pageStack.length = 0;
  pageOpen = null;
  show($('page'), false);
  popEntries(n);
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
    ${b.build ? '' : buildingDetailsHtml(i)}
    ${upgrade}
    <div class="buttons">
      ${def.workers && !b.build ? `<button class="btn" onclick="doTogglePause(${i})">${b.paused ? '▶ Weiter' : '⏸ Pause'}</button>` : ''}
      ${def.isPath ? '' : `<button class="btn" onclick="closeDialog(); liftBuilding(${i})">✋ Verschieben</button>`}
      ${canRemove ? `<button class="btn danger" onclick="askDemolish(${i})">🗑 Abreißen</button>` : ''}
      <button class="btn" onclick="closeDialog()">Schließen</button>
    </div>`);
}

// „Was bewirkt das genau?“ – zum Aufklappen, damit das Fenster klein bleibt (Emin: Infos selbst abrufen)
function buildingDetailsHtml(i) {
  const b = state.buildings[i], def = BUILDINGS[b.type];
  const rows = [];
  const row = (label, value, note = '') => rows.push(`<div><span>${label}</span><b>${value}</b>${note ? `<small>${note}</small>` : ''}</div>`);
  const pct = f => `${Math.round(f * 100)} %`;
  // Wärme bzw. Glaube: wie viele Wohnungen erreicht dieses Gebäude, was bringt das?
  for (const [key, need, icon, word] of [['warmth', 'waerme', '🔥', 'Wärme'], ['belief', 'glaube', '🗿', 'Glaube']]) {
    if (!def[key]) continue;
    const r = key === 'warmth' ? warmthRadius(def) : def[key];
    let homes = 0, people = 0;
    state.buildings.forEach((h, j) => { const cap = !h.build && isConnected(j) ? housingOf(h.type) : 0; if (cap && distance(b, h) <= r + BUILDINGS[h.type].size / 2) { homes++; people += cap; } });
    const n = NEEDS.find(x => x.id === need), active = activeNeeds().includes(n);
    row(`${icon} ${word} im Umkreis`, `${r} Felder`, `erreicht ${homes} Wohnungen mit ${people} Plätzen`);
    row(`${icon} Bedürfnis „${esc(n.name)}“`, active ? pct(stats.needs[need] || 0) : 'ab ' + esc(STAGES[stageIndex(n.from)].name),
      `Anteil aller Wohnplätze mit ${word}. Jedes Bedürfnis zählt gleich viel für die Zufriedenheit (jetzt ${stats.happiness} %); zufriedene Menschen arbeiten schneller und es ziehen mehr zu.`);
  }
  if (def.housing) {
    row('🏠 Wohnplätze', housingOf(b.type), `Einwohner essen je ${perMin(CONFIG.foodPerPerson)} Nahrung pro Minute. Sie brauchen Wärme${stageReached('mittel') ? ' und Glaube' : ''} in der Nähe.`);
  }
  if (def.produces) {
    const staff = def.workers ? (stats.staff[i] || 0) / def.workers : 1;
    const seasonF = SEASON_FACTORS[b.type] ? SEASON_FACTORS[b.type][seasonIndex()] : 1;
    const parts = [
      ['👤 Arbeiter', staff, `${stats.staff[i] || 0} von ${def.workers || 0}`],
      [`${season().icon} Jahreszeit`, seasonF, season().name],
      [`${currentWeather().icon} Wetter${state.disaster ? ' & ' + DISASTERS[state.disaster.id].name : ''}`, effectFactor(b.type), ''],
      ['😊 Zufriedenheit', happinessFactor(), `${stats.happiness} %`],
      ...(def.bonus ? [[`🌲 Gelände (${TERRAIN[def.bonus.terrain].name})`, 1 + terrainBonus(b), `höchstens +${Math.round(def.bonus.max * 100)} %`]] : []),
      ['📜 Forschung', 1 + techSum('bonus', b.type), ''],
    ];
    const base = Object.entries(def.produces).map(([id, n]) => `${RESOURCES[id].icon} ${perMin(n)}`).join(' ');
    row('Grundwert je Minute', base, 'bei voller Besetzung, ohne Einflüsse');
    for (const [label, f, note] of parts) if (Math.abs(f - 1) > 0.005 || label.startsWith('👤')) row(label, '×' + perMin(f), note);
    const out = outputPerMinute(i);
    row('= Ergebnis je Minute', Object.entries(out).map(([id, n]) => `${RESOURCES[id].icon} ${perMin(n)}`).join(' '));
    if (def.consumes) row('Verbraucht dafür', Object.entries(def.consumes).map(([id, n]) => `${RESOURCES[id].icon} ${perMin(n * outputFactor(i))}`).join(' '), 'fehlt etwas, läuft es nur so weit, wie es reicht');
  }
  if (def.storage) row('📦 Lager', `+${def.storage}`, 'mehr Platz für jede Ware');
  if (def.needsWater) row('🌊 Am Wasser', 'nötig', 'Hochwasser legt Gebäude am Wasser still');
  if (OUTDOOR_WORK.includes(b.type)) row('🌦️ Arbeitet draußen', '', 'Wetter wirkt stark (Gewitter, Hagel, Sturm …) – Details beim Wetter oben rechts');
  if (!rows.length) return '';
  return `<details class="more"><summary>ℹ️ Was bewirkt das genau?</summary><div class="info-list">${rows.join('')}</div></details>`;
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

let researchSelected = null;
let researchStage = null;   // welches Zeitalter im Forschungsfenster gezeigt wird ('__next' = Bronzezeit)
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

// Kartengröße im Forschungsbaum: am Handy (niedriger Bildschirm) kleiner
function treeMetrics() {
  const small = viewH < 520 || viewW < 700;
  return small ? { w: 138, h: 56, colGap: 44, rowGap: 10, pad: 14 } : { w: 168, h: 66, colGap: 64, rowGap: 14, pad: 22 };
}

// Spalte einer Forschung innerhalb ihres Zeitalters: 0 = braucht nichts aus diesem Zeitalter, sonst eins mehr als die Voraussetzung
function techDepth(id, memo = {}) {
  if (id in memo) return memo[id];
  const t = TECHS[id];
  const inStage = t.requires.filter(r => TECHS[r].stage === t.stage && !TECHS[r].transition);
  return (memo[id] = inStage.length ? 1 + Math.max(...inStage.map(r => techDepth(r, memo))) : 0);
}

// Aufbau eines Zeitalters: Karten in Spalten (nach Reihenfolge), Übergang ganz rechts
function stageLayout(stage) {
  const m = treeMetrics();
  const ids = Object.keys(TECHS).filter(id => TECHS[id].stage === stage);
  const normal = ids.filter(id => !TECHS[id].transition), trans = ids.find(id => TECHS[id].transition);
  const memo = {};
  const cols = [];
  for (const id of normal) (cols[techDepth(id, memo)] ||= []).push(id);
  cols.forEach(c => c.sort((a, b) => TECHS[a].row - TECHS[b].row));
  const rows = Math.max(...cols.map(c => c.length));
  const height = m.pad * 2 + rows * m.h + (rows - 1) * m.rowGap;
  const pos = {};
  cols.forEach((c, k) => {
    // Karten einer Spalte möglichst an ihrer Reihe ausrichten, aber ohne Lücken zu groß zu machen
    const colH = c.length * m.h + (c.length - 1) * m.rowGap;
    const top = (height - colH) / 2;
    c.forEach((id, i) => { pos[id] = { x: m.pad + k * (m.w + m.colGap), y: top + i * (m.h + m.rowGap) }; });
  });
  if (trans) pos[trans] = { x: m.pad + cols.length * (m.w + m.colGap), y: (height - m.h) / 2 };
  const width = m.pad * 2 + (cols.length + (trans ? 1 : 0)) * (m.w + m.colGap) - m.colGap;
  return { ids, normal, trans, pos, width, height, m };
}

function treeNodeHtml(id, p, m) {
  const t = TECHS[id];
  const status = techStatus(id);
  const sub = status === 'done' ? 'erforscht'
    : status === 'running' ? `<span class="nbar"><i style="width:${Math.round((1 - state.research.left / t.time) * 100)}%"></i></span>⏳ ${formatTime(state.research.left)}`
    : `${costHtml(t.cost)} · ⏱ ${formatTime(t.time)}`;
  // Voraussetzungen aus einem früheren Zeitalter (ohne Übergänge) stehen als Hinweis auf der Karte
  const outside = t.transition ? [] : t.requires.filter(r => TECHS[r].stage !== t.stage && !TECHS[r].transition);
  let extra = outside.length ? `<span class="nreq">+ ${outside.map(r => `${state.techs[r] ? '✔' : '✖'} ${esc(TECHS[r].name)}`).join(', ')}</span>` : '';
  if (t.transition) {
    const have = t.requires.filter(r => state.techs[r]).length;
    extra = `<span class="nreq">braucht alle Forschungen (${have}/${t.requires.length})</span>`;
  }
  return `<button class="node ${status}${t.transition ? ' transition' : ''}${researchSelected === id ? ' sel' : ''}" style="left:${p.x}px;top:${p.y}px;width:${m.w}px;height:${m.h}px" onclick="selectTech('${id}')">
    <span class="medal">${iconHtml(t.bild, t.icon)}${status === 'locked' ? '<i class="lock">🔒</i>' : ''}</span><span class="nname">${esc(t.name)}</span><span class="nsub">${sub}</span>${extra}${status === 'done' ? '<i class="check">✔</i>' : ''}</button>`;
}

// Pfeile nur zwischen benachbarten Spalten – sie laufen durch die Lücke zwischen den Spalten, nie hinter Karten
function treeLines(L) {
  const { pos, m } = L;
  let svg = '';
  for (const id of L.normal) {
    for (const r of TECHS[id].requires) {
      if (!pos[r] || TECHS[r].transition) continue;
      const a = pos[r], b = pos[id];
      const x1 = a.x + m.w, y1 = a.y + m.h / 2, x2 = b.x - 6, y2 = b.y + m.h / 2, mx = (x1 + x2) / 2;
      const cls = state.techs[r] ? 'done' : techStatus(id) === 'available' ? 'open' : '';
      svg += `<path d="M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" class="${cls}"/>`;
      svg += `<path d="M${x2 - 7} ${y2 - 6} L${x2} ${y2} L${x2 - 7} ${y2 + 6}" class="head ${cls}"/>`;
    }
  }
  // zum Übergang: eine Klammer aus der letzten Spalte statt vieler Linien
  if (L.trans) {
    const b = L.pos[L.trans], have = TECHS[L.trans].requires.every(r => state.techs[r]);
    const x = b.x - m.colGap / 2, y1 = m.pad + m.h / 2, y2 = L.height - m.pad - m.h / 2, yc = b.y + m.h / 2;
    svg += `<path d="M${x - 10} ${y1} Q${x} ${y1} ${x} ${y1 + 12} L${x} ${y2 - 12} Q${x} ${y2} ${x - 10} ${y2}" class="${have ? 'done' : ''}"/>`;
    svg += `<path d="M${x} ${yc} L${b.x - 6} ${yc}" class="${have ? 'done' : ''}"/><path d="M${b.x - 13} ${yc - 6} L${b.x - 6} ${yc} L${b.x - 13} ${yc + 6}" class="head ${have ? 'done' : ''}"/>`;
  }
  return svg;
}

function stageTabsHtml() {
  const tabs = STAGES.map(st => {
    const ids = Object.keys(TECHS).filter(id => TECHS[id].stage === st.id);
    const done = ids.filter(id => state.techs[id]).length;
    const cls = (researchStage === st.id ? ' active' : '') + (done === ids.length ? ' complete' : '') + (stageReached(st.id) ? '' : ' locked');
    const pct = Math.round(done / ids.length * 100);
    return `<button class="st-tab${cls}" onclick="showResearchStage('${st.id}')">
      <b>${stageReached(st.id) ? (done === ids.length ? '✔ ' : '') : '🔒 '}${esc(st.name)} <small>${done}/${ids.length}</small></b>
      <span class="st-bar" style="--p:${pct}%"></span></button>`;
  });
  tabs.push(`<button class="st-tab locked${researchStage === '__next' ? ' active' : ''}" onclick="showResearchStage('__next')"><b>${NEXT_EPOCH.icon} Bronzezeit <small>bald</small></b><span class="st-bar" style="--p:0%"></span></button>`);
  return tabs.join('');
}

function researchBoardHtml() {
  if (researchStage === '__next') {
    return `<div class="tree-next"><span class="ic emoji big">${NEXT_EPOCH.icon}</span><h3>${esc(NEXT_EPOCH.name)}</h3>
      <p>Braucht alle Forschungen der Steinzeit, einen Steinkreis und ${NEXT_EPOCH.population} Einwohner.</p>
      <p>Waren: ${costHtml(NEXT_EPOCH.cost)}</p><p><i>Die Bronzezeit wird als Nächstes gebaut.</i></p></div>`;
  }
  const L = stageLayout(researchStage);
  return `<div class="tree-fit"><div class="tree" style="width:${L.width}px;height:${L.height}px">
      <svg class="tree-lines" width="${L.width}" height="${L.height}">${treeLines(L)}</svg>
      ${L.ids.map(id => treeNodeHtml(id, L.pos[id], L.m)).join('')}
    </div></div>`;
}

// Baum so verkleinern, dass das ganze Zeitalter auf einmal zu sehen ist (nicht kleiner als 60 %, sonst scrollen)
function fitTree() {
  const sc = typeof document !== 'undefined' && $('tree-scroll');
  const fit = sc && sc.querySelector && sc.querySelector('.tree-fit');
  if (!fit) return;
  const tree = fit.firstElementChild;
  const w = parseFloat(tree.style.width), h = parseFloat(tree.style.height);
  const k = Math.max(0.6, Math.min(1, (sc.clientWidth - 6) / w, (sc.clientHeight - 6) / h));
  tree.style.transform = `scale(${k})`;
  fit.style.width = Math.ceil(w * k) + 'px';
  fit.style.height = Math.ceil(h * k) + 'px';
}

function researchPageHtml() {
  if (!researchStage) researchStage = state.stage;
  return `<div class="research-top" id="research-top">${researchTopHtml()}</div>
    <div class="stage-tabs">${stageTabsHtml()}</div>
    <div class="research-main">
      <div class="tree-scroll" id="tree-scroll">${researchBoardHtml()}</div>
      <div class="tech-detail${researchSelected ? '' : ' empty'}" id="tech-detail">${techDetailHtml()}</div>
    </div>`;
}

function showResearchStage(stage) {
  researchStage = stage;
  researchSelected = stage === '__next' ? '__next' : (researchSelected && TECHS[researchSelected] && TECHS[researchSelected].stage === stage ? researchSelected : null);
  refreshResearchPage();
  const sc = $('tree-scroll');
  if (sc) sc.scrollLeft = 0;
}

function researchTopHtml() {
  const r = state.research;
  const running = r
    ? `<span class="rt-chip run">${TECHS[r.id].icon} <b>${esc(TECHS[r.id].name)}</b> <span class="mini-bar wide"><i style="width:${Math.round((1 - r.left / TECHS[r.id].time) * 100)}%"></i></span> noch ${formatTime(r.left)}</span>`
    : '<span class="rt-chip idle">Gerade wird nichts erforscht – tippe eine leuchtende Karte an.</span>';
  return `<span class="rt-chip">${iconHtml(RESOURCES.wissen.bild, RESOURCES.wissen.icon)} Wissen <b>${Math.floor(state.res.wissen)}</b></span>${running}`;
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
  researchStage = researchSelected && TECHS[researchSelected] ? TECHS[researchSelected].stage : state.stage;
  openPage('📜 Forschung', researchPageHtml(), 'research');
  fitTree();
  emit('researchOpened');
}

function refreshResearchPage() {
  if (pageOpen !== 'research') return;
  const sc = $('tree-scroll');
  const left = sc ? sc.scrollLeft : 0, top = sc ? sc.scrollTop : 0;
  $('page-body').innerHTML = researchPageHtml();
  fitTree();
  const sc2 = $('tree-scroll');
  if (sc2) { sc2.scrollLeft = left; sc2.scrollTop = top; }
}

function selectTech(id) {
  researchSelected = id;
  if (id === '__next') researchStage = '__next';
  else if (TECHS[id]) researchStage = TECHS[id].stage;
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
  if (claimQuest(id)) { toast('🎁 ' + formatAmounts(QUESTS.find(q => q.id === id).reward)); playSound('muenze'); }
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
  openDialog(`<div class="daily-chest">${iconHtml('truhe', '🎁', 'big')}</div><h2>Tägliche Belohnung</h2>
    <p>Tag ${day} von 7 – komm jeden Tag wieder, am 7. Tag gibt es die große Truhe!</p>
    <div class="days">${boxes}</div>
    <div class="buttons"><button class="btn primary" onclick="doClaimDaily()">Abholen</button></div>`);
}

function doClaimDaily() {
  const r = claimDailyReward();
  closeDialog();
  if (r) { toast('🎁 ' + formatAmounts(r)); playSound('muenze'); }
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
    ${images['logo-rund'] ? `<img class="menu-logo" src="${IMAGE_DIR}logo-rund.webp" alt="Epochia">` : ''}
    <section class="card wide">
      <h3>🏕️ Dein Stamm</h3>
      <div class="stats">
        ${stat(Math.floor(state.pop), 'Einwohner')}${stat(esc(STAGES[stageIndex()].name), 'Epoche')}
        ${stat(Object.keys(state.techs).length, 'Forschungen')}${stat(formatTime(state.playTime), 'gespielt')}
      </div>
    </section>
    <section class="card">
      <h3>⚙️ Einstellungen</h3>
      ${sw('sound', '🔊', 'Geräusche', 'jedes Gebäude klingt anders')}
      ${sw('music', '🎵', 'Musik', 'kommt später')}
      <div class="tiles">${tile('👴', 'Einstieg neu starten', 'closeAllPages(); restartTutorial()')}</div>
    </section>
    <section class="card">
      <h3>💾 Spielstand <small>Platz ${currentSlot}</small></h3>
      <div class="tiles">
        ${tile('💾', 'Speichern', "saveGame(); toast('Gespeichert')")}
        ${tile('🗂', 'Spielstände', 'openSlots(true)')}
        ${tile('📤', 'Exportieren', 'showExport()')}
        ${tile('📥', 'Importieren', 'showImport()')}
        ${tile('🏠', 'Startseite', 'saveGame(); closeAllPages(); showStartScreen()')}
        ${tile('🔄', 'Nach Updates suchen', 'checkForUpdate(true)')}
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
  closeAllPages();
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
    closeAllPages();
    centerOnCamp();
    renderAll();
    toast('Spielstand geladen');
  } else toast('Der Text ist kein gültiger Spielstand');
}
