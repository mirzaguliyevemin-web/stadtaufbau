'use strict';
// Epochia – Oberfläche: Leisten, kleine Info, Gebäude-Fenster, Forschungsbaum, Aufträge, Menü, Meldungen.

const $ = id => document.getElementById(id);

function show(el, on = true) { if (el) el.classList.toggle('hidden', !on); }

// Inhalt nur dort ändern, wo er sich unterscheidet (Zahlen, Breiten), statt alles neu zu bauen.
// Grund: iPhone-Safari lädt bei innerHTML die <img>-Bilder neu und lässt sie kurz verschwinden – die Leiste „flattert“.
// Ändert sich der Aufbau (andere Knoten), wird wie bisher alles ersetzt.
function patchHtml(el, html) {
  if (!el) return;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const next = tpl.content;
  if (!next || !el.childNodes || !sameShape(el, next)) { el.innerHTML = html; return; }
  syncNodes(el, next);
}

function sameShape(a, b) {
  const x = a.childNodes, y = b.childNodes;
  if (x.length !== y.length) return false;
  for (let i = 0; i < x.length; i++) {
    if (x[i].nodeType !== y[i].nodeType || x[i].nodeName !== y[i].nodeName) return false;
    if (x[i].nodeType === 1 && !sameShape(x[i], y[i])) return false;
  }
  return true;
}

function syncNodes(a, b) {
  for (let i = 0; i < a.childNodes.length; i++) {
    const x = a.childNodes[i], y = b.childNodes[i];
    if (x.nodeType === 3) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; continue; }
    if (x.nodeType !== 1) continue;
    for (const { name, value } of [...y.attributes]) if (x.getAttribute(name) !== value) x.setAttribute(name, value);
    for (const { name } of [...x.attributes]) if (!y.hasAttribute(name)) x.removeAttribute(name);
    syncNodes(x, y);
  }
}

function esc(text) {
  return String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Kleines Bild (Gebäude, Ware, Forschung) – fehlt das Bild, das Zeichen
const SIDE_SYMBOLS = {
  'btn-research': 'symbol-forschung', 'btn-quests': 'symbol-auftraege', 'btn-trader': 'symbol-haendler', 'btn-chest': 'symbol-schaetze',
  'btn-shop': 'symbol-shop', 'btn-footprint': 'symbol-grundriss', 'btn-menu': 'symbol-menue',
};
function iconElement(bild) {
  const img = document.createElement('img');
  img.className = 'ic'; img.alt = ''; img.src = imagePath(bild);
  return img;
}
function iconHtml(bild, icon, cls = '') {
  return bild && images[bild]
    ? `<img class="ic ${cls}" src="${imagePath(bild)}" alt="">`
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

let lastTopbar = '', topbarHeight = 0;

// Wetter-Symbol oben: nachts der Mond, sonst das Wetter (sobald es richtig da ist)
function weatherIcon() {
  if (state.disaster && DISASTERS[state.disaster.id]) return DISASTERS[state.disaster.id].icon + '❗';
  const w = currentWeather();
  if (darkness() > 0.5 && (w.id === 'klar' || w.k < 0.5)) return '🌙';
  return w.k >= 0.15 ? w.icon : '';
}

// Steinkreis fertig: zeigt die nächste Jahreszeit und eine angekündigte Katastrophe
function sunCalendarRow() {
  if (!state.wonders.steinkreis || !wonderDone('steinkreis')) return '';
  const q = CONFIG.yearSeconds / 4, next = SEASONS[(seasonIndex() + 1) % 4], left = q - (state.yearTime % q);
  const warn = state.disasterNext ? ` · ${DISASTERS[state.disasterNext.id].icon} ${DISASTERS[state.disasterNext.id].name} in ${formatTime(state.disasterNext.left)}` : '';
  return `<div><span>🪨 Sonnenkalender</span><b>${next.icon} ${esc(next.name)}</b><small>beginnt in ${formatTime(left)}${warn}</small></div>`;
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
      ${sunCalendarRow()}
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

// Farbwelt des Zeitalters: <html data-zeit="stein|kupfer|bronze|eisen">, die Farben stehen in style.css
function applyEpochTheme() {
  const st = STAGES[stageIndex()];
  BUILDINGS.lagerfeuer.name = stageReached('eisen1') ? 'Thingplatz' : stageReached('kupfer') ? 'Dorfplatz' : 'Lagerfeuer';
  // Ab der Kupferzeit zeigt der Dorfplatz sein eigenes Bild (sobald es geladen ist, bis dahin das Lagerfeuer)
  BUILDINGS.lagerfeuer.bild = stageReached('kupfer') && typeof images !== 'undefined' && images['2-dorfplatz'] ? '2-dorfplatz' : '1-lagerfeuer';
  if (typeof document !== 'undefined' && document.documentElement && document.documentElement.dataset) document.documentElement.dataset.zeit = st.zeit;
}

function renderTopbar() {
  applyEpochTheme();
  const cap = storageCap();
  const chip = (id, warn) => {
    const n = Math.floor(state.res[id] || 0);
    const cls = warn ? ' warned' : n <= 0 ? ' empty' : n >= (RESOURCES[id].knowledge ? knowledgeCap() : cap) ? ' full' : '';
    return `<button class="chip${cls}" onclick="resourceTip('${id}')">${iconHtml(RESOURCES[id].bild, RESOURCES[id].icon)}<b>${n}</b></button>`;
  };
  // Oben nur das Wichtigste, der Rest steht im Lager (docs/plan-lager.md)
  const chips = CONFIG.stockWatch.topGoods.map(id => chip(id)).join('')
    + '<button class="chip lager-chip" id="btn-lager" onclick="openLager()" aria-label="Lager öffnen">📦<b>Lager</b></button>'
    + warnedGoods().map(id => chip(id, true)).join('');
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
    patchHtml($('topbar'), html);
    lastTopbar = html;
    // Seitenknöpfe unter die (evtl. zweizeilige) obere Leiste schieben – nur bei echter Änderung,
    // sonst rechnet das iPhone das Layout ständig neu
    const h = $('topbar').offsetHeight;
    if (h && h !== topbarHeight) { topbarHeight = h; setCssVar('--top-h', h + 'px'); }
  }
}

const perMin = n => (n >= 10 ? Math.round(n) : n.toFixed(1)).toString().replace('.', ',');

// Wetter und Katastrophen, die gerade auf die Herstellung dieser Ware wirken
function goodEffects(id) {
  const makers = Object.keys(BUILDINGS).filter(t => (BUILDINGS[t].produces || {})[id] !== undefined);
  const touches = e => makers.some(t => { const b = e.effect.buildings || {}; return b[t] !== undefined || (e.effect.outdoor !== undefined && OUTDOOR_WORK.includes(t)) || (e.effect.water !== undefined && BUILDINGS[t].needsWater) || e.effect.workers !== undefined; })
    || (id === 'nahrung' && e.effect.food);
  return activeEffects().filter(e => e.k > 0.3 && e.effect.text && touches(e));
}

// Ware antippen: Einnahmen und Ausgaben je Gebäude, Saldo, Lager und was gerade wirkt
function resourceTip(id) {
  const r = RESOURCES[id], f = (stats.flows || {})[id] || { in: {}, out: {} };
  const count = type => state.buildings.filter(b => b.type === type && !b.build).length;
  const who = k => (k === '__pop' ? `👥 ${Math.floor(state.pop)} Einwohner` : `${BUILDINGS[k].icon} ${esc(BUILDINGS[k].name)} ×${count(k)}`);
  const rows = (obj, sign) => Object.entries(obj).filter(([, n]) => n > 0.005).sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `<div><span>${who(k)}</span><b class="${sign === '+' ? 'good' : 'bad'}">${sign}${perMin(n)}</b></div>`).join('') || '<div><small>nichts</small></div>';
  const net = stats.rates[id] || 0, stock = state.res[id] || 0, cap = storageCap();
  const when = stock >= (r.knowledge ? knowledgeCap() : cap) ? 'Lager voll' : net < -0.01 ? `leer in ${formatTime(stock / -net * 60)}` : net > 0.01 && stock < (r.knowledge ? knowledgeCap() : cap) ? `voll in ${formatTime(((r.knowledge ? knowledgeCap() : cap) - stock) / net * 60)}` : '';
  const eff = goodEffects(id).map(e => `${e.icon} ${esc(e.name)}: ${esc(e.effect.text)}`);
  openDialog(`<h2>${iconHtml(r.bild, r.icon)} ${esc(r.name)}</h2>
    <p>Im Lager: <b>${Math.floor(stock)}</b> von ${r.knowledge ? knowledgeCap() : cap}${when ? ` · ${when}` : ''}</p>
    <h3>Einnahmen je Minute</h3><div class="info-list">${rows(f.in, '+')}</div>
    <h3>Ausgaben je Minute</h3><div class="info-list">${rows(f.out, '−')}</div>
    ${id === 'wissen' ? '<p class="hint">Wissen wird beim Start einer Forschung auf einmal bezahlt.</p>' : ''}
    ${upkeepPerHead(id) > 0 && id !== 'nahrung' ? `<p class="hint">${{ holz: 'Einwohner verbrauchen Feuerholz.', stein: 'Einwohner bessern Wege und Häuser aus.', werkzeug: 'Werkzeug nutzt sich ab.' }[id]} Ein leeres Lager schadet nicht, nur Bauen geht dann nicht.</p>` : ''}
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
      <div><span>Arbeit</span><b>${stats.workers} / ${stats.jobs}</b><small>${stats.jobs > stats.workers ? `${stats.jobs - stats.workers} Stellen frei – Gebäude arbeiten langsamer${understaffedText()}` : `alle Stellen besetzt · ${Math.floor(state.pop) - stats.workers} Einwohner ohne Arbeit (spazieren, beten, sitzen am Feuer)`}</small></div>
      <div><span>Zuzug</span><small>${esc(why)}</small></div>
      <div><span>🍖 Essen</span><small>Jeder isst ${perMin(foodPerHead())} Nahrung je Minute</small></div>
      ${upkeepPerHead('holz') > 0 ? `<div><span>🪵 Feuerholz</span><small>Alle zusammen ${perMin(state.pop * upkeepPerHead('holz'))} Holz je Minute</small></div>` : ''}
      ${upkeepPerHead('stein') > 0 ? `<div><span>🪨 Ausbessern</span><small>Alle zusammen ${perMin(state.pop * upkeepPerHead('stein'))} Stein je Minute</small></div>` : ''}
      ${upkeepPerHead('werkzeug') > 0 ? `<div><span>🗡️ Verschleiß</span><small>Alle zusammen ${perMin(state.pop * upkeepPerHead('werkzeug'))} Werkzeug je Minute</small></div>` : ''}
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
    if (rb.classList) rb.classList.toggle('running', !!r);   // schmale Leiste: Name nur als Restzeit, solange geforscht wird
    if (bar) { bar.style.width = r ? Math.round((1 - r.left / TECHS[r.id].time) * 100) + '%' : '0'; show(bar.parentNode, !!r); }
  }
  const wish = currentWish();
  const ready = activeQuests().filter(questDone).length + (wish && canAfford({ [wish.id]: wish.amount }) ? 1 : 0) + (wonderReady() ? 1 : 0);
  $('quest-badge').textContent = ready || '';
  const ups = upgradeReadyCount(), ub = $('upgrade-badge');
  if (ub) { ub.textContent = ups || ''; show(ub, ups > 0); }
  show($('quest-badge'), ready > 0);
  const canResearch = !r && Object.keys(TECHS).some(id => !researchProblem(id));
  show($('research-badge'), canResearch);
  show($('btn-trader'), traderHere() || suedHere());
  show($('btn-daily'), !!state.daily.pending);
  show($('btn-shop'), state.tutorial < 0);
  show($('btn-chest'), state.tutorial < 0 || Object.keys(state.finds).length > 0);
  const chest = chestBadge();
  $('chest-badge').textContent = chest || '';
  show($('chest-badge'), chest > 0);
  // Truhe statt 🎁, sobald das Bild geladen ist
  const daily = $('btn-daily');
  if (images.truhe && !daily.querySelector('img')) daily.innerHTML = `${iconHtml('truhe', '🎁')}<span>Belohnung</span>`;
  // Gemalte Symbole statt Emojis, sobald die Bilder geladen sind; Punkte und Zähler am Knopf bleiben erhalten
  for (const [id, bild] of Object.entries(SIDE_SYMBOLS)) {
    const emoji = $(id).firstChild;
    if (images[bild] && emoji && emoji.nodeType === 3) emoji.replaceWith(iconElement(bild));
  }
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

// „Neu“ nur für wirklich neue Gebäude: löst ein Gebäude durch Forschung oder Zeitalter nur ein älteres derselben
// Reihe ab (Pflanzerin → Baumgärtnerin), ist es nicht neu, nur anders (Wunsch Emin, 08.11.2026)
function barIsNew(type, locked) {
  const def = BUILDINGS[type];
  if (locked || !def.requires || (state.seen || {})[type]) return false;
  return !Object.entries(BUILDINGS).some(([t, d]) => t !== type && d.line === def.line && d.tier < def.tier && !d.upgradeOnly && d.buildable !== false);
}

function renderBuildBar() {
  if (barDrag) return;   // nicht neu aufbauen, solange ein Finger auf der Leiste liegt
  // Im Einstieg zeigt die Leiste die Kategorie, in der das gesuchte Gebäude steht
  const wanted = typeof tutorialBarType === 'function' ? tutorialBarType() : null;
  if (wanted && BUILDINGS[wanted]) barCategory = categoryOf(wanted);
  const entries = barEntries();
  const fresh = new Set(entries.filter(({ type, locked }) => barIsNew(type, locked)).map(e => categoryOf(e.type)));
  const tabs = BAR_CATEGORIES.filter(c => entries.some(e => categoryOf(e.type) === c.id)).map(c =>
    `<button class="bar-tab${c.id === barCategory ? ' active' : ''}" onclick="setBarCategory('${c.id}')"><span class="emoji">${c.icon}</span><span class="tname">${esc(c.name)}</span>${fresh.has(c.id) && c.id !== barCategory ? '<i class="dot"></i>' : ''}</button>`).join('');
  if (tabs !== lastTabs) { $('bar-tabs').innerHTML = tabs; lastTabs = tabs; }
  // Baubares zuerst, gesperrte Gebäude (Forschung fehlt noch) ans Ende der Leiste (Emin, 10.11.)
  const items = entries.filter(e => categoryOf(e.type) === barCategory).sort((a, b) => a.locked - b.locked).map(({ type, locked }) => {
    const def = BUILDINGS[type];
    const isNew = barIsNew(type, locked);
    const affordable = canAfford(def.cost);
    return `<div class="bar-item${locked ? ' locked' : ''}${affordable ? '' : ' poor'}" data-type="${type}"
        onpointerdown="onBarPointerDown(event,'${type}',${locked})" onpointermove="onBarPointerMove(event)"
        onpointerup="onBarPointerUp(event)" onpointercancel="onBarPointerUp(event)">
      ${isNew ? '<span class="new">Neu</span>' : ''}
      <button class="bar-info" aria-label="Was macht ${esc(def.name)}?" onpointerdown="event.stopPropagation()" onpointerup="event.stopPropagation()" onclick="event.stopPropagation(); showBarInfo('${type}')">i</button>
      ${iconHtml(def.bild, def.icon, 'big')}
      <span class="txt"><span class="name">${esc(def.name)}</span>
      <span class="costs">${locked ? '🔒' : def.deko ? `× ${dekoOwned(type)}` : costHtml(def.cost)}</span></span>
    </div>`;
  }).join('');
  applyBarHidden();
  if (items !== lastBar) {
    patchHtml($('buildbar'), items);
    lastBar = items;
    const h = $('buildbar').offsetHeight;
    if (h) setCssVar('--bar-h', h + 'px');
    if (typeof highlightTutorialTarget === 'function') highlightTutorialTarget();
  }
}

// Feld beim Bauen/Verschieben/Pfade malen: Preis und ✖ ↻ ✔
let lastAction = '';
function renderActionBar() {
  syncToolEntry();
  const el = $('action-bar');
  let html = '';
  if (ghost) {
    const def = BUILDINGS[ghost.type];
    const problem = ghostProblem();
    const s = def.size;
    const road = ghost.from >= 0 ? touchesNetwork(ghost.x, ghost.y, s) || state.buildings[ghost.from].type === 'lagerfeuer' : touchesNetwork(ghost.x, ghost.y, s);
    const title = ghost.from >= 0 ? `${def.icon} ${esc(def.name)} verschieben` : def.deko ? `${def.icon} ${esc(def.name)} · noch ${dekoOwned(ghost.type)} zum Aufstellen`
      : `${def.icon} ${esc(def.name)} · ${costHtml(def.cost)} · ⏱ ${formatTime(buildTimeOf(ghost.type))}`;
    const what = ghost.from < 0 ? `<small class="ghost-info">${buildFactsHtml(ghost.type)}</small>` : '';
    html = `<div class="action-text">${title}${what}<small class="${problem ? 'bad' : road || def.deko ? 'good' : 'warn'}">${esc(problem || (def.deko ? 'Passt! Mit ✔ aufstellen' : road ? (ghost.from < 0 ? 'Passt! Mit ✔ bauen' : 'Passt! Mit ✔ abstellen') : 'Passt – danach einen Trampelpfad zum Lagerfeuer legen'))}</small></div>
      <button class="round no" onclick="cancelGhost()">✖</button>
      ${ghost.from < 0 ? `<button class="round info" aria-label="Was macht das Gebäude?" onclick="showBarInfo('${ghost.type}')">i</button>` : ''}
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

// Was macht ein Gebäude, bevor man es baut? (Emin, 07.11.) Kurz: die wichtigsten Zahlen in einer Zeile
function buildFactsHtml(type) {
  const def = BUILDINGS[type], parts = [];
  const ware = id => iconHtml(RESOURCES[id].bild, RESOURCES[id].icon, 'mini');
  if (def.produces) parts.push('macht ' + Object.entries(def.produces).map(([id, n]) => `${perMin(n)} ${ware(id)}`).join(' ') + ' je Min.');
  if (def.consumes) parts.push('braucht ' + Object.entries(def.consumes).map(([id, n]) => `${perMin(n)} ${ware(id)}`).join(' '));
  if (def.workers) parts.push(`👤 ${def.workers} Arbeiter`);
  if (def.housing) parts.push(`👥 ${housingOf(type)} Plätze`);
  if (def.warmth) parts.push(`🔥 Wärme ${def.warmth} Felder`);
  if (def.belief) parts.push(`🗿 Glaube ${def.belief} Felder`);
  if (def.happy) parts.push(`😊 Laune +${def.happy}`);
  if (def.storage) parts.push(`📦 +${def.storage} Lager`);
  if (def.needsWater) parts.push('🌊 am Wasser');
  if (def.needsRock) parts.push('🪨 an Felsen');
  return parts.join(' · ');
}

// Info-Fenster aus der Bauleiste (ⓘ an der Karte oder beim Hinsetzen)
function showBarInfo(type) {
  const def = BUILDINGS[type], lock = lockText(type);
  const can = !lock && canAfford(def.cost);
  openDialog(`
    <button class="rb dlg-x" aria-label="Schließen" onclick="closeDialog()">✕</button>
    <div class="dlg-head">${iconHtml(def.bild, def.icon, 'huge')}<div><h2>${esc(def.name)}</h2><p>${esc(def.info || '')}</p></div></div>
    <p class="bar-facts">${buildFactsHtml(type) || '–'}</p>
    <p>Kostet: ${costHtml(def.cost)}${def.time > 0 ? ` · ⏱ ${formatTime(buildTimeOf(type))}` : ''}</p>
    ${lock ? `<p class="why">${esc(lock)}</p>` : !can ? `<p class="why">⏳ ${esc(missingText(def.cost))}</p>` : ''}
    <div class="buttons">${ghost && ghost.type === type ? '<button class="btn primary" onclick="closeDialog()">✋ Weiter hinsetzen</button>'
      : `<button class="btn primary" ${lock ? 'disabled' : ''} onclick="closeDialog(); beginBuild('${type}')">🔨 Bauen</button>`}</div>`);
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
  const parts = [`${def.icon} ${def.name}${hasLevels(def) ? ' · ⭐' + levelOf(b) : ''}`];
  if (def.housing) parts.push(`🏠 ${housingOf(b.type)} Plätze`);
  if (def.produces) {
    const out = outputPerMinute(i);
    parts.push(Object.entries(out).map(([id, n]) => `+${perMin(n)} ${RESOURCES[id].icon}/min`).join(' '));
  }
  if (def.workers) parts.push(`👤 ${stats.staff[i] || 0}/${workersOf(b)}`);
  const lacking = def.consumes && Object.keys(def.consumes).find(id => (state.res[id] || 0) < 0.5);
  if (lacking) parts.push(`❗ Fehlt: ${RESOURCES[lacking].name}${sourceText(lacking)}`);
  if (def.warmth) parts.push(`🔥 Umkreis ${warmthRadius(def)}`);
  if (def.belief) parts.push(`🗿 Umkreis ${def.belief}`);
  if (def.storage) parts.push(`📦 +${storageOf(b)}`);
  return parts.join(' · ');
}

// Wo fehlen Leute? Für das Einwohner-Fenster
function understaffedText() {
  const missing = {};
  for (const i of workerOrder()) {
    const b = state.buildings[i], gap = workersOf(b) - (stats.staff[i] || 0);
    if (gap > 0) missing[b.type] = (missing[b.type] || 0) + gap;
  }
  const list = Object.entries(missing).sort((a, b) => b[1] - a[1]);
  if (!list.length) return '';
  return '. Es fehlen Leute bei: ' + list.slice(0, 3).map(([t, n]) => `${BUILDINGS[t].name} (${n})`).join(', ') + (list.length > 3 ? ' und anderen' : '');
}

// Warnung: Die Einwohner verbrauchen eine Ware schneller, als sie für diese Forschung zusammenkommt
function stallText(techId) {
  const s = researchStalls(techId)[0];
  if (!s) return '';
  const r = RESOURCES[s.id];
  const from = Object.keys(BUILDINGS).filter(t => BUILDINGS[t].produces && BUILDINGS[t].produces[s.id] && isUnlocked(t)).map(t => BUILDINGS[t].name);
  return `${r.name}: Deine ${Math.floor(state.pop)} Einwohner verbrauchen ${perMin(s.use)} je Minute, es entstehen ${perMin(s.made)}. ` +
    `So kommen die ${s.need} ${r.name} kaum zusammen. Baue mehr davon (${from.length ? from.slice(0, 2).join(" oder ") : "Hersteller"}) und vorerst keine neuen Wohnungen.`;
}

// Woher kommt eine Ware? (für Hinweise wie „Es fehlt Felle – kommt vom Jägerlager“)
function sourceText(id) {
  const from = Object.keys(BUILDINGS).filter(t => BUILDINGS[t].produces && BUILDINGS[t].produces[id] && (isUnlocked(t) || stageReached(BUILDINGS[t].stage)));
  const trader = CONFIG.trader.offers.some(o => o.get[id] && (!o.requires || state.techs[o.requires])) && stageReached('frueh') ? ['Händler'] : [];
  if (state.techs[CONFIG.suedhaendler.requires] && CONFIG.suedhaendler.offers.some(o => o.get[id])) trader.push('Händler aus dem Süden');
  const names = [...from.map(t => BUILDINGS[t].name), ...trader];
  return names.length ? ' – kommt von: ' + names.join(', ') + (id === 'felle' && !mammothsExtinct() && state.techs.mammutjagd ? ', Mammutjagd' : '') : '';
}

// Kleines Fenster beim Antippen (Emin, 07.11.): schmale Leiste mit Bild, Name, wichtigster Zahl und runden Knöpfen.
// Bei Gebäuden mit Stufen ein ⬆-Knopf: erst antippen zeigt die Kosten, ✔ baut aus.
function infoLine(i) {
  const b = state.buildings[i], def = BUILDINGS[b.type];
  if (b.build > 0) return `🔨 noch ${formatTime(b.build)}`;
  if (b.up > 0) return `🔨 Ausbau auf ★${levelOf(b) + 1} · noch ${formatTime(b.up)}`;
  if (!isConnected(i)) return '<span class="bad">🛤️ Kein Weg zum Lagerfeuer</span>';
  const lacking = def.consumes && Object.keys(def.consumes).find(id => (state.res[id] || 0) < 0.5);
  if (lacking) return `<span class="bad">❗ Es fehlt ${esc(RESOURCES[lacking].name)}</span>`;
  const parts = [];
  if (def.produces) parts.push(Object.entries(outputPerMinute(i)).map(([id, n]) => `+${perMin(n)} ${iconHtml(RESOURCES[id].bild, RESOURCES[id].icon, 'mini')}`).join(' ') + ' je Minute');
  if (def.housing) parts.push(`👥 ${housingOf(b.type)} Plätze`);
  if (def.workers) parts.push(`👤 ${stats.staff[i] || 0}/${workersOf(b)}`);
  if (def.storage) parts.push(`📦 +${storageOf(b)}`);
  if (def.warmth && !def.produces) parts.push(`🔥 Umkreis ${warmthRadius(def)}`);
  if (def.belief) parts.push(`🗿 Umkreis ${def.belief}`);
  return parts.join(' · ');
}

function canLevelHere(i) {
  const b = state.buildings[i];
  return hasLevels(BUILDINGS[b.type]) && !b.build && !(b.up > 0) && levelOf(b) < Math.min(maxLevel(), CONFIG.levels.max);
}

function infoPopHtml(i) {
  const b = state.buildings[i], def = BUILDINGS[b.type];
  const stop = 'event.stopPropagation();';
  const name = `${esc(def.name)}${hasLevels(def) ? ` <span class="lvl-badge">★${levelOf(b)}</span>` : ''}`;
  if (infoFor && infoFor.level && canLevelHere(i)) {
    const next = levelOf(b) + 1, problem = levelProblem(i);
    return `<div class="pop-chip">${iconHtml(def.bild, def.icon, 'pop-pic')}<div class="pop-text"><b>Ausbauen auf ★${next}</b>
      <small>${costHtml(levelCost(b.type, next))} · ⏱ ${formatTime(levelTime(b.type, next))}${problem ? ` · <span class="bad">${esc(problem)}</span>` : ''}</small></div>
      <button class="rb" aria-label="Abbrechen" onclick="${stop} infoFor.level = false; positionInfo()">✕</button>
      <button class="rb main" aria-label="Ausbauen" ${problem ? 'disabled' : ''} onclick="${stop} infoFor.level = false; doLevelUp(${i}); closeInfo()">✔</button></div>`;
  }
  const btn = [];
  if (def.workers && !b.build) btn.push(`<button class="rb" aria-label="${b.paused ? 'Weiter' : 'Pause'}" onclick="${stop} togglePause(${i}); showInfo(${i})">${b.paused ? '▶' : '⏸'}</button>`);
  if (typeof stoneKey === 'function' && stoneKey(i)) btn.push(`<button class="rb fast" aria-label="Beschleunigen (${state.shop.stones || 0} Steine)" onclick="${stop} doUseStone(${i})">⚡<i>${state.shop.stones || 0}</i></button>`);
  if (canLevelHere(i)) btn.push(`<button class="rb up" aria-label="Ausbauen" onclick="${stop} infoFor.level = true; clearTimeout(infoTimer); positionInfo()">⬆</button>`);
  if (def.storage && !b.build) btn.push(`<button class="rb" aria-label="Lager" onclick="${stop} closeInfo(); openLager()">📦</button>`);
  btn.push(`<button class="rb main" aria-label="Mehr über das Gebäude" onclick="${stop} closeInfo(); showBuildingWindow(${i})">i</button>`);
  return `<div class="pop-chip">${iconHtml(def.bild, def.icon, 'pop-pic')}<div class="pop-text"><b>${name}</b><small>${infoLine(i)}</small></div>${btn.join('')}</div>`;
}

function showInfo(i) {
  infoFor = { kind: 'b', i };
  const el = $('info-pop');
  el.classList.remove('tool'); el.classList.add('chip');
  el.innerHTML = el.dataset.html = infoPopHtml(i);
  el.onclick = () => {
    const k = infoFor;
    const b = k && k.kind === 'b' && state.buildings[k.i];
    closeInfo();
    if (!b) return;
    if (BUILDINGS[b.type].storage && !b.build) openLager();   // Lagerfeuer und Speicher: gleich ins Lager
    else showBuildingWindow(k.i);
  };
  show(el, true);
  positionInfo();
  clearTimeout(infoTimer);
  infoTimer = setTimeout(closeInfo, 5000);
}

// Setzling antippen: ausreißen (macht den Platz wieder frei)
function showSaplingInfo(x, y) {
  infoFor = { kind: 'tile', x, y };
  const el = $('info-pop');
  el.classList.add('tool'); el.classList.remove('chip');
  el.innerHTML = `<span class="tool-ic">${iconHtml('setzling', '🌱', 'big')}</span><span>Setzling ausreißen<small>macht den Platz frei</small></span>`;
  el.onclick = () => { removeSapling(x, y); toast('🌱 Setzling ausgerissen'); closeInfo(); };
  show(el, true);
  positionInfo();
  clearTimeout(infoTimer);
}

function showTerrainInfo(x, y) {
  const t = terrainAt(x, y);
  infoFor = { kind: 'tile', x, y };
  const el = $('info-pop');
  // Baum: Axt, Felsen: Spitzhacke – antippen, und schon wird gefällt bzw. abgetragen
  const tool = t === TERRAIN.wald ? iconHtml('axt', '🪓', 'big') : iconHtml('hacke', '⛏️', 'big');
  el.classList.add('tool'); el.classList.remove('chip');
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
  el.classList.add('tool'); el.classList.remove('chip');
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
    // mit dem zuletzt geschriebenen Text vergleichen: innerHTML liest sich anders zurück (disabled=""), sonst würde jedes Bild
    // in jedem Bild neu geladen und bliebe leer
    if (el.dataset.html !== html) { el.dataset.html = html; el.innerHTML = html; }
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

let waitingPushes = 0;   // während der Browser noch zurückspringt, neue Einträge erst danach anlegen

function pushEntry(kind) {
  if (!hasHistory()) return;
  if (pendingBack > 0) { pendingBack--; histDepth++; history.replaceState({ epochia: kind }, ''); return; }
  histDepth++;
  if (skipPop > 0) { waitingPushes++; return; }
  history.pushState({ epochia: kind }, '');
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
  if (skipPop > 0) {
    skipPop--;
    if (skipPop === 0) for (; waitingPushes > 0; waitingPushes--) history.pushState({ epochia: 'page' }, '');
    return;
  }
  histDepth = Math.max(0, histDepth - 1);
  if (dialogOpen) closeDialog(true);
  else if (pageOpen === 'research' && researchSheet) closeTechSheet(true);   // Handy: erst das Detail schließen
  else if (pageOpen) closePage(true);
  else if (toolEntry) { toolEntry = false; cancelGhost(); }   // Bauen bzw. Wege malen abbrechen statt das Spiel zu verlassen
}

// Bauen, Verschieben und Wege malen bekommen einen Eintrag im Verlauf – so bricht die Zurück-Taste sie ab
let toolEntry = false;
function syncToolEntry() {
  const active = !!(typeof ghost !== 'undefined' && (ghost || pathMode));
  if (active && !toolEntry) { toolEntry = true; pushEntry('tool'); }
  else if (!active && toolEntry) { toolEntry = false; popEntries(1); }
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
const PAGE_OPENERS = { menu: () => openMenu(), upgrades: () => openUpgrades(), slots: () => openSlots(true), research: () => openResearch(), quests: () => openQuests(), chest: () => openChest(), lager: () => openLager(), shop: () => openShop(), wonder: () => { if (wonderPageId) openWonder(wonderPageId); }, konto: () => openKonto() };

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
  if (researchSheet) { researchSheet = false; if (!fromHistory) popEntries(1); }
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
  const n = pageStack.length + 1 + (researchSheet ? 1 : 0);
  researchSheet = false;
  pageStack.length = 0;
  pageOpen = null;
  show($('page'), false);
  popEntries(n);
}

// Namen der Geländearten für den Bonus (eine oder mehrere, z. B. „Felsen, Gebirge“)
const terrainNames = t => [].concat(t).map(k => TERRAIN[k].name).join(', ');

// ---------------------------------------------------------------------
// Gebäude-Fenster
// ---------------------------------------------------------------------

function showBuildingWindow(i) {
  const b = state.buildings[i];
  if (!b) return;
  const def = BUILDINGS[b.type];
  // Werte als Kacheln, Hinweise als kurze Zeilen darunter (Design-Bewertung 07.11.)
  const tiles = [], lines = [];
  const tile = (big, label, bad) => tiles.push(`<div class="vtile${bad ? ' bad' : ''}"><b>${big}</b><small>${label}</small></div>`);
  const ware = id => iconHtml(RESOURCES[id].bild, RESOURCES[id].icon, 'mini');
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
    tile(`👥 ${housingOf(b.type)}`, 'Plätze');
    // gleiche Regel wie bei den Bedürfnissen: die Quelle braucht einen Weg
    const near = (key, r) => state.buildings.some((s, k) => !s.build && BUILDINGS[s.type][key] && isConnected(k) && distance(s, b) <= r(BUILDINGS[s.type]) + def.size / 2);
    const warm = near('warmth', warmthRadius);
    tile(warm ? '🔥 ✔' : '❄️ ✖', 'Wärme', !warm);
    if (!warm) lines.push('❄️ Kein Feuer mit Weg in der Nähe – baue einen Feuerplatz');
    if (activeNeeds().some(n => n.id === 'glaube')) {
      const holy = near('belief', d => d.belief);
      tile(holy ? '🗿 ✔' : '🗿 ✖', 'Glaube', !holy);
      if (!holy) lines.push('🗿 Kein Ahnenplatz mit Weg in der Nähe');
    }
  }
  if (def.workers && !b.build) {
    const staff = stats.staff[i] || 0;
    tile(`👤 ${staff}/${workersOf(b)}`, 'Arbeiter', staff < workersOf(b));
    if (b.paused) lines.push('⏸ Pausiert – die Arbeiter helfen in anderen Gebäuden');
    else if (staff < workersOf(b)) lines.push('👤 Es fehlen Arbeiter – alle Einwohner arbeiten schon woanders');
  }
  if (def.produces && !b.build) {
    for (const [id, n] of Object.entries(outputPerMinute(i))) tile(`${perMin(n)} ${ware(id)}`, 'je Minute');
    for (const [id, n] of Object.entries(def.consumes || {})) tile(`−${perMin(n * outputFactor(i))} ${ware(id)}`, 'braucht je Min.', (state.res[id] || 0) < 0.5);
    for (const id of Object.keys(def.consumes || {})) if ((state.res[id] || 0) < 0.5) lines.push(`❗ Fehlt: ${RESOURCES[id].name} – darum steht es still${sourceText(id)}`);
    if (def.bonus) tile(`🌲 +${Math.round(terrainBonus(b) * 100)} %`, 'Gelände: ' + terrainNames(def.bonus.terrain));
    if (SEASON_FACTORS[b.type]) tile(`${season().icon} ${Math.round(SEASON_FACTORS[b.type][seasonIndex()] * 100)} %`, season().name);
  }
  if (def.warmth) tile(`🔥 ${warmthRadius(def)}`, 'Felder Wärme');
  if (def.belief) tile(`🗿 ${def.belief}`, 'Felder Glaube');
  if (def.storage) tile(`📦 +${storageOf(b)}`, 'je Ware');

  let upgrade = '';
  // Stufen 1–5: Ausbauen bringt einen Arbeiterplatz und +50 % Ertrag (docs/plan-stufen.md)
  if (hasLevels(def) && !b.build) {
    const lv = levelOf(b), next = lv + 1, stars = '⭐';
    if (b.up > 0) upgrade += `<div class="upgrade"><h3>${stars} Stufe ${lv} – wird auf Stufe ${next} ausgebaut</h3>
      <p>🔨 noch ${formatTime(b.up)} · arbeitet währenddessen weiter</p>${shopSpeedButton()}</div>`;
    else if (next > CONFIG.levels.max) upgrade += `<div class="upgrade"><h3>⭐ Stufe ${lv} – höchste Stufe</h3></div>`;
    else {
      const problem = levelProblem(i), more = Math.round(CONFIG.levels.outputPerLevel * 100);
      const row = Array.from({ length: maxLevel() }, (_, k) => k < lv ? '★' : '<i>★</i>').join('');
      upgrade += `<div class="upgrade level-card">
        <h3><span>Ausbauen auf Stufe ${next}</span><span class="stars" title="Stufe ${lv} von ${maxLevel()}">${row}</span></h3>
        ${maxLevel() < CONFIG.levels.max ? `<small>Stufe ${lv} von ${maxLevel()} – mehr Stufen in späteren Zeitaltern</small>` : ''}
        <p>Ausbau auf Stufe ${next}: ${isStoreLevel(def) ? `Lagerplatz 📦 +${storageOf(b)} → +${storageOf({ type: b.type, level: next })} je Ware (+${Math.round(CONFIG.levels.storagePerLevel * 100)} % vom Grundwert)</p>` : `Ertrag ×${perMin(levelFactor(b))} → ×${perMin(levelFactor(b) + CONFIG.levels.outputPerLevel)} (+${more} % vom Grundwert)${workersOf({ type: b.type, level: next }) > workersOf(b) ? `, 👤 ${workersOf(b)} → ${workersOf({ type: b.type, level: next })} Arbeiter` : ', gleich viele Arbeiter'}</p>`}
        <p>${costHtml(levelCost(b.type, next))} · ⏱ ${formatTime(levelTime(b.type, next))}</p>
        <div class="why-row"><button class="btn primary" ${problem ? 'disabled' : ''} onclick="doLevelUp(${i})">⬆ Ausbauen auf Stufe ${next}</button>
        ${problem ? `<span class="why">⏳ ${esc(problem)}</span>` : ''}</div>
      </div>`;
    }
  }
  const to = upgradeTarget(b);
  // Gleich groß und ohne neue Zutaten: entwickelt sich von selbst und kostenlos, sobald es freigeschaltet ist (evolveBuildings) –
  // dann kein Knopf, nur ein Hinweis (Emin, 07.11.: Knopf war verwirrend)
  const auto = to && BUILDINGS[to].size === def.size && !BUILDINGS[to].manualUpgrade;
  if (auto) {
    const t = BUILDINGS[to], lock = lockText(to).replace('🔒 ', '');
    upgrade += `<div class="upgrade">
      <h3>Wird zu ${t.icon} ${esc(t.name)}</h3>
      <p>${esc(t.info)}</p>
      <p>✨ Von selbst und kostenlos${lock ? ' – ' + esc(lock.charAt(0).toLowerCase() + lock.slice(1)) : ''}.</p>
    </div>`;
  } else if (to) {
    const t = BUILDINGS[to];
    const problem = upgradeProblem(i);
    upgrade += `<div class="upgrade">
      <h3>Weiterentwickeln zu ${t.icon} ${esc(t.name)}</h3>
      <p>${esc(t.info)}</p>
      <p>${costHtml(t.cost)} · ⏱ ${formatTime(buildTimeOf(to))}${t.size > def.size ? ` · braucht ${t.size}×${t.size} Felder` : ''}</p>
      <button class="btn primary" ${problem ? 'disabled' : ''} onclick="doUpgrade(${i})">⬆ Weiterentwickeln</button>
      ${problem ? `<small class="bad">${esc(problem)}</small>` : ''}
    </div>`;
  }
  const canRemove = def.buildable !== false;
  openDialog(`
    <button class="rb dlg-x" aria-label="Schließen" onclick="closeDialog()">✕</button>
    <div class="dlg-head">${iconHtml(def.bild, def.icon, 'huge')}<div><h2>${esc(def.name)}${hasLevels(def) && !b.build ? ` <span class="lvl-badge">★ Stufe ${levelOf(b)}</span>` : ''}</h2><p>${esc(def.info)}</p></div></div>
    ${road}
    ${tiles.length ? `<div class="vtiles">${tiles.join('')}</div>` : ''}
    ${lines.length ? `<ul class="lines notes">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
    ${b.build > 0 ? shopSpeedButton() : buildingDetailsHtml(i)}
    ${upgrade}
    <div class="buttons">
      ${def.storage && !b.build ? '<button class="btn primary" onclick="closeDialog(); openLager()">📦 Lager öffnen</button>' : ''}
      ${def.workers && !b.build ? `<button class="btn" onclick="doTogglePause(${i})">${b.paused ? '▶ Weiter' : '⏸ Pause'}</button>` : ''}
      ${def.isPath ? '' : `<button class="btn" onclick="closeDialog(); liftBuilding(${i})">✋ Verschieben</button>`}
      ${canRemove ? `<button class="btn text-danger" onclick="askDemolish(${i})">🗑 Abreißen …</button>` : ''}
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
    row('🏠 Wohnplätze', housingOf(b.type), `Einwohner essen je ${perMin(foodPerHead())} Nahrung pro Minute. Sie brauchen Wärme${stageReached('mittel') ? ' und Glaube' : ''} in der Nähe.`);
  }
  if (def.produces) {
    const staff = def.workers ? (stats.staff[i] || 0) / workersOf(b) : 1;
    const seasonF = SEASON_FACTORS[b.type] ? SEASON_FACTORS[b.type][seasonIndex()] : 1;
    const parts = [
      ['👤 Arbeiter', staff, `${stats.staff[i] || 0} von ${workersOf(b)}`],
      ...(hasLevels(def) ? [[`⭐ Stufe ${levelOf(b)}`, levelFactor(b), `+${Math.round(CONFIG.levels.outputPerLevel * 100)} % je Stufe, alle ${CONFIG.levels.workersEvery} Stufen ein Arbeiter mehr`]] : []),
      [`${season().icon} Jahreszeit`, seasonF, season().name],
      [`${currentWeather().icon} Wetter${state.disaster ? ' & ' + DISASTERS[state.disaster.id].name : ''}`, effectFactor(b.type), ''],
      ['😊 Zufriedenheit', happinessFactor(), `${stats.happiness} %`],
      ...(def.bonus ? [[`🌲 Gelände (${terrainNames(def.bonus.terrain)})`, 1 + terrainBonus(b), `höchstens +${Math.round(def.bonus.max * 100)} %`]] : []),
      ['📜 Forschung', 1 + techSum('bonus', b.type), ''],
    ];
    const base = Object.entries(def.produces).map(([id, n]) => `${RESOURCES[id].icon} ${perMin(n)}`).join(' ');
    row('Grundwert je Minute', base, 'bei voller Besetzung, ohne Einflüsse');
    for (const [label, f, note] of parts) if (Math.abs(f - 1) > 0.005 || label.startsWith('👤') || label.startsWith('⭐')) row(label, '×' + perMin(f), note);
    const out = outputPerMinute(i);
    row('= Ergebnis je Minute', Object.entries(out).map(([id, n]) => `${RESOURCES[id].icon} ${perMin(n)}`).join(' '));
    const share = stats.inputShare && stats.inputShare[i] !== undefined ? stats.inputShare[i] : 1;
    if (def.consumes) row('Verbraucht dafür', Object.entries(def.consumes).map(([id, n]) => `${RESOURCES[id].icon} ${perMin(n * outputFactor(i) * share)}`).join(' '), 'fehlt etwas, läuft es nur so weit, wie es reicht');
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

function doLevelUp(i) {
  const problem = levelUp(i);
  if (problem) { toast(problem); return; }
  closeDialog();
  toast(`🔨 ${BUILDINGS[state.buildings[i].type].name} wird ausgebaut …`);
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
    <p>Ein neues Stück Land (${CONFIG.plotSize}×${CONFIG.plotSize} Felder) für dein Lager. Was unter den Wolken liegt, siehst du nach dem Kauf.</p>
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
  if (id === 'eisenfund') out.push('Macht den Aufbruch in die Eisenzeit möglich');
  if (id === 'himmelsscheibe') out.push(`Sonnwendfest mitten im Sommer: Laune +${CONFIG.fest.happy}`);
  if (e.traderOffers) out.push('Der Händler bringt Bernstein und ein Angebot mehr');
  if (e.constructions) out.push(`🏗️ ${e.constructions === 1 ? 'Eine Baustelle' : e.constructions + ' Baustellen'} mehr gleichzeitig`);
  if (e.buildFaster) out.push(`Bauzeiten −${Math.round(e.buildFaster * 100)} %`);
  if (e.traderFaster) out.push(`Händler kommt alle ${Math.round((CONFIG.trader.every - e.traderFaster) / 60)} statt ${Math.round(CONFIG.trader.every / 60)} Minuten`);
  if (id === 'tauschhandel') out.push('Der Händler kommt zum Handelsplatz');
  if (id === CONFIG.suedhaendler.requires) out.push(`🫏 Alle ${Math.round(CONFIG.suedhaendler.every / 60)} Minuten kommt ein Händler aus dem Süden mit Wein und Glas`);
  return out.join(' · ') || '–';
}

// Fenster „Liste und Detail“: links die Forschungen geordnet (läuft, jetzt möglich, kommt danach, erforscht),
// rechts groß die gewählte. Am Handy hochkant öffnet Antippen das Detail als ganze Seite.
let researchSheet = false;   // Handy hochkant: Detail ist offen
const researchIsNarrow = () => viewW < 700 && viewH > 520;   // passt zur CSS-Regel für Handy hochkant

// Forschungen eines Zeitalters, die man am sinnvollsten zuerst sieht: läuft, dann die günstigste mögliche, dann die nächste gesperrte
function bestTechOfStage(stage) {
  const ids = Object.keys(TECHS).filter(id => TECHS[id].stage === stage);
  const wissen = id => TECHS[id].cost.wissen || 0;
  const of = st => ids.filter(id => techStatus(id) === st);
  return of('running')[0] || of('available').sort((a, b) => wissen(a) - wissen(b))[0] || of('locked')[0] || ids[ids.length - 1] || null;
}

// Was fehlt noch bis zum nächsten Zeitalter? Übergangsforschung + alle offenen Voraussetzungen davor
function researchGoal() {
  const ids = Object.keys(TECHS).filter(id => TECHS[id].stage === state.stage);
  // Ziel des Zeitalters: Übergangsforschung, sonst die letzte Forschung, auf die keine andere mehr aufbaut (Kupferfund)
  const trans = ids.find(id => TECHS[id].transition) || ids.filter(id => !ids.some(o => TECHS[o].requires.includes(id))).sort((a, b) => TECHS[b].requires.length - TECHS[a].requires.length)[0];
  if (!trans) return null;
  const e = TECHS[trans].effect || {};
  const target = e.stage ? STAGES[stageIndex(e.stage)].name : TECHS[trans].name;
  const open = [], seen = {};
  (function walk(id) {
    for (const r of TECHS[id].requires) {
      if (seen[r] || state.techs[r]) continue;
      seen[r] = true; walk(r); open.push(r);
    }
  })(trans);
  return { trans, target, open };
}

function researchTopHtml() {
  const know = `<span class="rs-know">${iconHtml(RESOURCES.wissen.bild, RESOURCES.wissen.icon)}<b>${Math.floor(state.res.wissen)}</b></span>`;
  const g = researchGoal();
  if (!g) return `<div class="rs-goal"><div class="rs-gtext"><b>Alles erforscht</b></div>${know}</div>`;
  const t = TECHS[g.trans], done = state.techs[g.trans];
  const stalled = !done && !g.open.length && !t.soon && researchStalls(g.trans)[0];
  const line = done ? 'Geschafft!' : stalled ? `⚠ ${RESOURCES[stalled.id].name} knapp` : g.open.length ? `Noch ${g.open.length} ${g.open.length === 1 ? 'Forschung' : 'Forschungen'} bis zum Aufbruch` : t.soon ? 'Kommt mit dem nächsten Ausbau' : 'Alles bereit – jetzt erforschen!';
  const steps = g.open.map(id => `<button class="rs-step${techStatus(id) === 'running' ? ' run' : ''}" onclick="selectTech('${id}')">${esc(TECHS[id].name)}</button>`).join('');
  return `<div class="rs-goal"><button class="rs-gmain" onclick="selectTech('${g.trans}')">${iconHtml(t.bild, t.icon)}<span class="rs-gtext"><b>Ziel: ${esc(t.name === g.target ? t.name : t.name + ' → ' + g.target)}</b><small>${line}</small></span></button>
    <div class="rs-steps">${steps}</div>${know}</div>`;
}

function researchItemHtml(id) {
  const t = TECHS[id], status = techStatus(id);
  let meta;
  if (status === 'running') {
    const pct = Math.round((1 - state.research.left / t.time) * 100);
    meta = `<span class="rs-prog"><i style="width:${pct}%"></i></span><span class="rs-meta">⏳ Läuft – noch <b>${formatTime(state.research.left)}</b></span>`;
  } else if (status === 'locked') {
    meta = `<span class="rs-meta rs-lock">🔒 Erst: ${esc(t.requires.filter(r => !state.techs[r]).map(r => TECHS[r].name).join(', '))}</span>`;
  } else {
    const fewPeople = t.population && state.pop < t.population;
    meta = `<span class="rs-meta">${costHtml(t.cost)}<span class="rs-time">⏱ ${formatTime(t.time)}</span>${fewPeople ? `<span class="rs-time bad">👥 ${t.population}</span>` : ''}${techBuildGaps(id).length ? `<span class="rs-time bad">🔨 ${techBuildGaps(id).reduce((n, g) => n + g.need - g.have, 0)}</span>` : ''}</span>`;
  }
  return `<button class="rs-item ${status}${researchSelected === id ? ' sel' : ''}" onclick="selectTech('${id}')">
    <span class="rs-pic">${iconHtml(t.bild, t.icon)}</span><span class="rs-mid"><span class="rs-name">${esc(t.name)}${state.researchNext === id ? ' <small>📌 Danach</small>' : ''}</span>${meta}</span><span class="rs-arrow">›</span></button>`;
}

function researchListHtml() {
  if (researchStage === '__next') {
    return `<h4>Danach</h4><div class="rs-item sel"><span class="rs-pic"><span class="ic emoji">${NEXT_EPOCH.icon}</span></span><span class="rs-mid"><span class="rs-name">${esc(NEXT_EPOCH.name)}</span><span class="rs-meta rs-lock">Wird als Nächstes gebaut</span></span></div>`;
  }
  const ids = Object.keys(TECHS).filter(id => TECHS[id].stage === researchStage);
  const of = st => ids.filter(id => techStatus(id) === st);
  const group = (title, list) => list.length ? `<h4>${title}</h4>${list.map(researchItemHtml).join('')}` : '';
  const done = of('done');
  return group('Läuft gerade', of('running')) + group('Jetzt möglich', of('available')) + group('Kommt danach', of('locked'))
    + (done.length ? `<h4>Erforscht</h4><div class="rs-done">${done.map(id => `<button class="rs-chip${researchSelected === id ? ' sel' : ''}" onclick="selectTech('${id}')">${iconHtml(TECHS[id].bild, TECHS[id].icon)}✔ ${esc(TECHS[id].name)}</button>`).join('')}</div>` : '');
}

function stageTabsHtml() {
  const tabs = STAGES.map(st => {
    const ids = Object.keys(TECHS).filter(id => TECHS[id].stage === st.id);
    const done = ids.filter(id => state.techs[id]).length;
    const cls = (researchStage === st.id ? ' active' : '') + (done === ids.length ? ' complete' : '') + (stageReached(st.id) ? '' : ' locked');
    return `<button class="st-tab${cls}" onclick="showResearchStage('${st.id}')">
      <b>${stageReached(st.id) ? (done === ids.length ? '✔ ' : '') : '🔒 '}${esc(st.name)} <small>${done}/${ids.length}</small></b>
      <span class="st-bar" style="--p:${Math.round(done / ids.length * 100)}%"></span></button>`;
  });
  tabs.push(`<button class="st-tab locked${researchStage === '__next' ? ' active' : ''}" onclick="showResearchStage('__next')"><b>${NEXT_EPOCH.icon} ${esc(NEXT_EPOCH.name)} <small>bald</small></b><span class="st-bar" style="--p:0%"></span></button>`);
  return tabs.join('');
}

function researchPageHtml() {
  if (!researchStage) researchStage = state.stage;
  return `<div class="rs${researchSheet ? ' sheet' : ''}" id="rs">
    <div id="rs-top">${researchTopHtml()}</div>
    <div class="stage-tabs" id="rs-tabs">${stageTabsHtml()}</div>
    <div class="rs-main">
      <div class="rs-list" id="rs-list">${researchListHtml()}</div>
      <div class="rs-detail" id="tech-detail">${techDetailHtml()}</div>
    </div>
  </div>`;
}

function showResearchStage(stage) {
  researchStage = stage;
  researchSelected = stage === '__next' ? '__next' : (researchSelected && TECHS[researchSelected] && TECHS[researchSelected].stage === stage ? researchSelected : bestTechOfStage(stage));
  refreshResearchPage();
  const list = $('rs-list');
  if (list) list.scrollTop = 0;
}

// Forschungsseite laufend auffrischen (Wissen, Restzeit und Balken, Kosten rot/schwarz), ohne Scrollstellung und Bilder anzutasten
function tickResearchPage() {
  if (pageOpen !== 'research') return;
  patchHtml($('rs-top'), researchTopHtml());
  patchHtml($('rs-tabs'), stageTabsHtml());
  patchHtml($('rs-list'), researchListHtml());
  patchHtml($('tech-detail'), techDetailHtml());
}

// Warum geht es (noch) nicht? Kurz für den Knopf, ausführlicher als Hinweis darüber
function researchHint(id) {
  const t = TECHS[id], problem = researchProblem(id);
  if (!problem) return { label: '📜 Erforschen', hint: '' };
  const status = techStatus(id);
  if (t.soon) return { label: '🔜 Kommt mit dem nächsten Ausbau', hint: '' };
  if (status === 'locked') return { label: '🔒 ' + problem, hint: '' };
  if (state.research) return { label: '⏳ Es läuft schon eine Forschung', hint: problem };
  if (t.population && state.pop < t.population) return { label: `👥 ${t.population} Einwohner nötig`, hint: 'Baue mehr Wohnungen, dann ziehen mehr Leute zu.' };
  if (techBuildGaps(id).length) return { label: '🔨 Erst bauen', hint: problem };
  const fehlt = Math.ceil((t.cost.wissen || 0) - state.res.wissen);
  if (fehlt > 0) return { label: `📚 Noch ${fehlt} Wissen sammeln`, hint: `Es fehlen noch ${fehlt} Wissen – mehr Höhlenmaler, dann geht es schneller.` };
  return { label: problem, hint: 'Sieh in der Leiste oben nach, welche Ware knapp ist.' };
}

function techDetailHtml() {
  const id = researchSelected;
  const close = '<button class="rs-close" onclick="closeTechSheet()">← Zur Liste</button>';
  if (!id) return `${close}<p>Tippe eine Forschung an, um zu sehen, was sie bringt.</p>`;
  if (id === '__next') {
    return `${close}<div class="rs-dhead"><span class="rs-med"><span class="ic emoji">${NEXT_EPOCH.icon}</span></span><div><h3>${esc(NEXT_EPOCH.name)}</h3>
      <p>${esc(NEXT_EPOCH.text)}</p></div></div>
      <p class="rs-soon">Kommt mit dem nächsten Ausbau.</p>`;
  }
  const t = TECHS[id], status = techStatus(id);
  const news = Object.values(BUILDINGS).filter(def => def.requires === id);
  const others = techEffectText(id).split(' · ').filter(e => e !== '–' && !e.startsWith('Neu:'));
  const req = t.requires.length ? t.requires.map(r => `${state.techs[r] ? '✔' : '✖'} ${esc(TECHS[r].name)}`).join(', ') : 'nichts';
  const people = t.population ? `<div class="rs-fact">Einwohner nötig<b>👥 ${t.population} <small class="${state.pop >= t.population ? 'ok' : 'bad'}">(du: ${state.pop})</small></b></div>` : '';
  const buildNeeds = techBuildNeeds(id);
  const buildSec = buildNeeds.length && status !== 'done' ? `<div class="rs-sec"><h4>Dafür bauen</h4><div class="rs-costs">${buildNeeds.map(g => `<span class="cost${g.have < g.need ? ' short' : ''}">${iconHtml(BUILDINGS[g.type].bild, BUILDINGS[g.type].icon, 'mini')}${esc(BUILDINGS[g.type].name)} ${g.have}/${g.need}</span>`).join(' ')}</div></div>` : '';
  const { label, hint } = researchHint(id);
  const button = status === 'done' ? '<button class="rs-go good" disabled>✔ Erforscht</button>'
    : status === 'running' ? `<button class="rs-go run" disabled>⏳ Läuft … noch ${formatTime(state.research.left)}</button><button class="btn small" onclick="openShop()">⚡ Beschleunigen</button>`
    : state.researchNext === id ? `<button class="rs-go ready" onclick="doQueue('${id}')">📌 Vormerkung aufheben</button>`
    : state.research && !queueProblem(id) ? `<button class="rs-go ready" onclick="doQueue('${id}')">📌 Danach erforschen</button>`
    : label === '🔨 Erst bauen' ? `<button class="rs-go ready" onclick="goBuildFor('${id}')">🔨 Jetzt bauen: ${esc(BUILDINGS[techBuildGaps(id)[0].type].name)}</button>`
    : `<button class="rs-go${label === '📜 Erforschen' ? ' ready' : ''}" ${label === '📜 Erforschen' ? '' : 'disabled'} onclick="doResearch('${id}')">${esc(label)}</button>`;
  return `${close}<div class="rs-dhead"><span class="rs-med ${status}">${iconHtml(t.bild, t.icon)}</span><div><h3>${esc(t.name)}</h3>
      ${others.length ? `<div class="rs-effects">${others.map(e => `<span class="tag">${esc(e)}</span>`).join('')}</div>` : ''}</div></div>
    <div class="rs-facts"><div class="rs-fact">Dauer<b>⏱ ${formatTime(t.time)}</b></div>${people}<div class="rs-fact">Vorher erforscht<b class="rs-req">${req}</b></div></div>
    ${news.length ? `<div class="rs-sec rs-sec-new"><h4>Neu zum Bauen</h4>${news.map(def => `<div class="rs-new">${iconHtml(def.bild, def.icon)}<div><b>${esc(def.name)}${def.upgradeOnly ? ' <small>(Weiterentwicklung)</small>' : ''}</b><span>${esc(def.info || '')}</span></div></div>`).join('')}</div>` : ''}
    ${buildSec}<div class="rs-sec"><h4>Kostet</h4><div class="rs-costs">${costHtml(t.cost)}</div></div>
    ${state.researchNext === id ? `<p class="rs-hint neutral">Startet von selbst, sobald die laufende Forschung fertig und alles dafür da ist – auch wenn das Spiel zu ist. Bezahlt wird beim Start.${researchProblem(id) && !state.research ? ' Gerade fehlt: ' + esc(researchProblem(id)) : ''}</p>` : hint && status === 'available' && !stallText(id) && !(state.research && !queueProblem(id)) ? `<p class="rs-hint">${esc(hint)}</p>` : ''}
    ${status === 'available' && !t.soon && stallText(id) ? `<p class="rs-hint">⚠ ${esc(stallText(id))}</p>` : ''}
    <div class="rs-action">${button}</div>`;
}

// „Erst bauen“ (Wunsch von Emins Bruder, 07.11.): zur Karte, die Leiste zeigt das gesuchte Gebäude. Reicht alles zum Bauen,
// liegt es gleich zum Hinsetzen bereit; sonst blinkt es nur in der Leiste und eine Meldung sagt, was fehlt.
function goBuildFor(id) {
  const gap = techBuildGaps(id)[0];
  if (!gap) return;
  const line = BUILDINGS[gap.type].line;
  const entry = barEntries().find(e => BUILDINGS[e.type].line === line && !e.locked) || barEntries().find(e => BUILDINGS[e.type].line === line);
  closeAllPages();
  if (!entry) { toast(lockText(gap.type) || `${BUILDINGS[gap.type].name} kann man gerade nicht bauen`); return; }
  const type = entry.type, def = BUILDINGS[type];
  const placed = def.wonder ? state.buildings.findIndex(b => b.type === type) : -1;
  if (placed >= 0) { openWonder(def.wonder); return; }   // Wunderwerk steht schon: dort weiterbauen
  if (settings.barHidden) toggleBuildBar(false);
  setBarCategory(categoryOf(type));
  const why = entry.locked ? lockText(type) : !canAfford(def.cost) ? missingText(def.cost)
    : def.time > 0 && constructionCount() >= constructionLimit() ? `Schon ${constructionLimit()} Baustellen – warte, bis eine fertig ist` : null;
  if (!why) { beginBuild(type); toast(`${def.icon} ${def.name}: Platz wählen und mit ✔ bauen`); return; }
  toast(`${def.icon} ${def.name} – ${why}`);
  setTimeout(() => {
    const el = document.querySelector && document.querySelector(`#buildbar .bar-item[data-type="${type}"]`);
    if (!el) return;
    if (el.scrollIntoView) el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    el.classList.add('pulse');
    setTimeout(() => el.classList.remove('pulse'), 2400);
  }, 60);
}

// showDetail: von außen gezielt eine Forschung öffnen (z. B. gesperrtes Gebäude in der Bauleiste)
function openResearch(showDetail = false) {
  closeInfo();
  if (!showDetail || !researchSelected) {
    const sel = researchSelected && TECHS[researchSelected];
    if (!sel || techStatus(researchSelected) === 'done') researchSelected = (state.research && state.research.id) || bestTechOfStage(state.stage);
  }
  researchStage = researchSelected && TECHS[researchSelected] ? TECHS[researchSelected].stage : state.stage;
  const wasOpen = pageOpen === 'research';
  openPage('📜 Forschung', '', 'research');
  if (!wasOpen) researchSheet = false;
  if (showDetail && researchIsNarrow() && !researchSheet) { researchSheet = true; pushEntry('sheet'); }
  $('page-body').innerHTML = researchPageHtml();
  showActiveStageTab();
  emit('researchOpened');
}

function refreshResearchPage() {
  if (pageOpen !== 'research') return;
  const list = $('rs-list'), det = $('tech-detail');
  const a = list ? list.scrollTop : 0, b = det ? det.scrollTop : 0;
  $('page-body').innerHTML = researchPageHtml();
  const list2 = $('rs-list'), det2 = $('tech-detail');
  if (list2) list2.scrollTop = a;
  if (det2) det2.scrollTop = b;
  showActiveStageTab();
}

// Am schmalen Handy passen nicht alle Reiter: den aktiven ins Bild holen
function showActiveStageTab() {
  const tabs = $('rs-tabs'), a = tabs && tabs.querySelector && tabs.querySelector('.st-tab.active');
  if (a && a.scrollIntoView) a.scrollIntoView({ block: 'nearest', inline: 'center' });
}

function selectTech(id) {
  researchSelected = id;
  if (id === '__next') researchStage = '__next';
  else if (TECHS[id]) researchStage = TECHS[id].stage;
  if (researchIsNarrow() && !researchSheet) { researchSheet = true; pushEntry('sheet'); }
  refreshResearchPage();
  const det = $('tech-detail');
  if (det) det.scrollTop = 0;
}

// Handy hochkant: Detail schließen, zurück zur Liste (auch über die Zurück-Taste, siehe onHistoryBack)
function closeTechSheet(fromHistory = false) {
  if (!researchSheet) return;
  researchSheet = false;
  if (!fromHistory) popEntries(1);
  refreshResearchPage();
}

function doQueue(id) {
  const problem = toggleQueue(id);
  if (problem) { toast(problem); return; }
  toast(state.researchNext === id ? `📌 ${TECHS[id].name} startet danach von selbst` : '📌 Vormerkung aufgehoben');
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
  if (g.line) return iconHtml(BUILDINGS[g.type].bild, BUILDINGS[g.type].icon, 'big');
  if (g.population) return '<span class="ic emoji big">👥</span>';
  if (g.plots) return '<span class="ic emoji big">🗺️</span>';
  if (g.wishes) return '<span class="ic emoji big">🤲</span>';
  if (g.hunts) return '<span class="ic emoji big">🦣</span>';
  if (g.trades) return '<span class="ic emoji big">🤝</span>';
  if (g.level) return '<span class="ic emoji big">⭐</span>';
  return '<span class="ic emoji big">📜</span>';
}

function rewardChips(reward) {
  return Object.entries(reward).map(([id, n]) => `<span class="tag">${iconHtml(RESOURCES[id].bild, RESOURCES[id].icon, 'mini')} ${n}</span>`).join('');
}

// Wunsch des Stammes: steht über den Aufträgen
function wishHtml() {
  const w = currentWish();
  if (!w) return state.tutorial >= 0 ? '' : `<div class="wish-card later"><span class="q-medal"><span class="ic emoji big">🤲</span></span><div class="q-main"><b>Wunsch des Stammes</b><span>Der nächste Wunsch kommt in ${formatTime(state.wishWait)}.</span></div></div>`;
  const can = canAfford({ [w.id]: w.amount });
  const res = RESOURCES[w.id];
  return `<div class="wish-card"><span class="q-medal">${iconHtml(res.bild, res.icon, 'big')}</span>
    <div class="q-main"><b>Wunsch des Stammes</b><span>${esc(w.text)}</span>
      <span class="q-reward">Gib ${costHtml({ [w.id]: w.amount })} – dafür ${rewardChips({ wissen: w.wissen })}${state.research ? `<span class="tag">⏱ Forschung ${formatTime(CONFIG.wishes.researchSeconds)} kürzer</span>` : ''}</span></div>
    <button class="btn primary" ${can ? '' : 'disabled'} onclick="doWish()">🤲 Geben</button></div>`;
}

function doWish() {
  const r = fulfillWish();
  if (r) { toast(`🤲 Der Stamm dankt dir! +${r.wissen} Wissen${r.faster ? ` · Forschung ${formatTime(r.faster)} kürzer` : ''}`); playSound('muenze'); }
  if (pageOpen === 'quests') $('page-body').innerHTML = questsHtml();
  renderAll();
}

// Händler: Waren gegen Waren, jedes Angebot einmal je Besuch
function traderHtml() {
  if (!traderHere()) return '<div class="quests"><p class="empty-note">Der Händler ist weitergezogen.</p></div>';
  const rows = traderOffers().map(o => {
    const taken = state.trader.done.includes(o.id);
    const problem = taken ? null : tradeProblem(o.id);
    return `<div class="quest-card${taken ? ' done' : ''}">
      <div class="q-main"><b>Du gibst ${costHtml(o.give)}</b><span class="q-reward">Du bekommst ${o.getFind ? `${FINDS[o.getFind].icon} ${esc(FINDS[o.getFind].name)}` : rewardChips(o.get)}</span>${problem ? `<small class="bad">${esc(problem)}</small>` : ''}</div>
      ${taken ? '<span class="q-pct">✔</span>' : `<button class="btn primary" ${problem ? 'disabled' : ''} onclick="tradeNow('${o.id}')">🤝 Tauschen</button>`}
    </div>`;
  }).join('');
  return `<div class="quests"><div class="wish-card later"><span class="q-medal">${iconHtml('mensch-haendler', '🐂', 'big')}</span><div class="q-main"><b>Der Händler ist da</b><span>Er tauscht Waren gegen Waren und zieht in ${formatTime(state.trader.left)} weiter.</span></div></div>${rows}</div>`;
}

function openTrader() { openPage('🤝 Händler', traderHtml(), 'trader'); }

function tradeNow(id) {
  const err = doTrade(id);
  if (err) toast(err); else playSound('muenze');
  if (pageOpen === 'trader') $('page-body').innerHTML = traderHtml();
  if (pageOpen === 'sued') $('page-body').innerHTML = suedHtml();
  renderAll();
}

// Händler aus dem Süden (CONFIG.suedhaendler): eigenes Fenster mit seinen festen Angeboten
function suedHtml() {
  if (!suedHere()) return '<div class="quests"><p class="empty-note">Der Händler aus dem Süden ist weitergezogen.</p></div>';
  const rows = CONFIG.suedhaendler.offers.map(o => {
    const taken = state.suedhaendler.done.includes(o.id);
    const problem = taken ? null : tradeProblem(o.id);
    return `<div class="quest-card${taken ? ' done' : ''}">
      <div class="q-main"><b>Du gibst ${costHtml(o.give)}</b><span class="q-reward">Du bekommst ${rewardChips(o.get)}</span>${problem ? `<small class="bad">${esc(problem)}</small>` : ''}</div>
      ${taken ? '<span class="q-pct">✔</span>' : `<button class="btn primary" ${problem ? 'disabled' : ''} onclick="tradeNow('${o.id}')">🍇 Tauschen</button>`}
    </div>`;
  }).join('');
  return `<div class="quests"><div class="wish-card later"><span class="q-medal">${iconHtml('mensch-suedhaendler', '🫏', 'big')}</span><div class="q-main"><b>Ein Händler aus dem Süden ist da</b><span>Er kam mit seinem Esel über die Berge, bringt Wein und Glas und zieht in ${formatTime(state.suedhaendler.left)} weiter.</span></div></div>${rows}</div>`;
}
function openSued() { openPage('🍇 Händler aus dem Süden', suedHtml(), 'sued'); }
function suedCardHtml() {
  if (!suedHere()) return '';
  return `<div class="wish-card"><span class="q-medal">${iconHtml('mensch-suedhaendler', '🫏', 'big')}</span><div class="q-main"><b>Ein Händler aus dem Süden ist da</b><span>Noch ${formatTime(state.suedhaendler.left)}.</span></div><button class="btn primary" onclick="openSued()">🍇 Tauschen</button></div>`;
}

// Wanderer (CONFIG.wanderer): Fenster und Karte bei den Aufträgen
function openWanderer() { openPage('🚶 Wanderer', wandererHtml(), 'wanderer'); }
function wandererHtml() {
  if (!wandererHere()) return '<p class="empty-note">Der Wanderer ist weitergezogen.</p>';
  const c = CONFIG.wanderer, problem = canAfford(c.give) ? '' : missingText(c.give);
  return `<div class="wish-card"><span class="q-medal">${iconHtml('mensch-hirte', '🚶', 'big')}</span><div class="q-main"><b>Ein Wanderer rastet am Feuer</b>
    <span>Er kommt von weit her und ist hungrig. Gebt ihr ihm Wegzehrung, erzählt er von fernen Tälern, Tieren und Pflanzen.</span>
    <span class="q-reward">Gib ${costHtml(c.give)} – dafür ${rewardChips(c.get)}</span><span>Er bleibt noch ${formatTime(state.wanderer.left)}.</span></div></div>
    <div class="why-row"><button class="btn primary" ${problem ? 'disabled' : ''} onclick="wandererNow(true)">🍖 Wegzehrung geben</button>
    <button class="btn" onclick="wandererNow(false)">Weiterziehen lassen</button>${problem ? `<span class="why">${esc(problem)}</span>` : ''}</div>`;
}
function wandererNow(take) {
  const err = wandererDeal(take);
  if (err) toast(err); else if (take) playSound('muenze');
  renderAll();
}
function wandererCardHtml() {
  if (!wandererHere()) return '';
  return `<div class="wish-card"><span class="q-medal">${iconHtml('mensch-hirte', '🚶', 'big')}</span><div class="q-main"><b>Ein Wanderer rastet am Feuer</b><span>Noch ${formatTime(state.wanderer.left)}.</span></div><button class="btn primary" onclick="openWanderer()">Ansehen</button></div>`;
}

function traderCardHtml() {
  if (!traderHere()) return '';
  return `<div class="wish-card"><span class="q-medal">${iconHtml('mensch-haendler', '🐂', 'big')}</span><div class="q-main"><b>Der Händler ist da</b><span>Noch ${formatTime(state.trader.left)}.</span></div><button class="btn primary" onclick="openTrader()">🤝 Tauschen</button></div>`;
}

function questsHtml() {
  const total = QUESTS.filter(q => state.quests[q.id] || !questImpossible(q)).length;
  const doneCount = QUESTS.filter(q => state.quests[q.id]).length;
  const head = `<div class="quest-sum"><span>🏆 Erledigt <b>${doneCount}</b> von ${total}</span>
    <span class="q-bar thin"><i style="width:${Math.round(100 * doneCount / total)}%"></i></span></div>`;
  const list = activeQuests();
  if (!list.length) return `<div class="quests">${head}${wonderCardHtml()}${traderCardHtml()}${suedCardHtml()}${wandererCardHtml()}${wishHtml()}<p class="empty-note">Alle Aufträge erledigt – neue kommen mit der nächsten Epoche.</p></div>`;
  return `<div class="quests">${head}${wonderCardHtml()}${traderCardHtml()}${suedCardHtml()}${wandererCardHtml()}${wishHtml()}` + list.map(q => {
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

// ---------------------------------------------------------------------
// Ausbauen-Liste (Wunsch von Emins Bruder, 07.11.): 🔨 am Rand zeigt, was man jetzt ausbauen oder weiterentwickeln kann.
// Antippen: Die Karte springt zum Gebäude, das kleine Fenster zeigt Kosten und ✔.
// ---------------------------------------------------------------------

// Gruppen gleicher Gebäude auf gleicher Stufe: [{ kind: 'level'|'evolve', type, level, list: [i…], problem }]
function upgradeGroups() {
  const groups = new Map();
  state.buildings.forEach((b, i) => {
    const def = BUILDINGS[b.type];
    if (b.build || b.up > 0) return;
    if (canLevelHere(i)) {
      const key = 'l:' + b.type + ':' + levelOf(b);
      if (!groups.has(key)) groups.set(key, { kind: 'level', type: b.type, level: levelOf(b), list: [] });
      groups.get(key).list.push(i);
    }
    const to = upgradeTarget(b);
    if (to && isUnlocked(to) && (BUILDINGS[to].size !== def.size || BUILDINGS[to].manualUpgrade)) {
      const key = 'e:' + b.type;
      if (!groups.has(key)) groups.set(key, { kind: 'evolve', type: b.type, to, list: [] });
      groups.get(key).list.push(i);
    }
  });
  const out = [...groups.values()];
  for (const g of out) g.problem = g.kind === 'level' ? levelProblem(g.list[0]) : upgradeProblem(g.list[0]);
  return out.sort((a, b) => (!!a.problem - !!b.problem) || (a.kind === 'level' ? a.level : 0) - (b.kind === 'level' ? b.level : 0));
}
function upgradeReadyCount() { return upgradeGroups().filter(g => !g.problem).length; }

function upgradesHtml() {
  const groups = upgradeGroups();
  if (!groups.length) return '<p class="hint">Gerade lässt sich nichts ausbauen. Neue Stufen gibt es in jedem Zeitalter, Weiterentwicklungen mit neuen Forschungen.</p>';
  return `<p class="hint">Tippe ein Gebäude an: Die Karte springt hin, dann mit ✔ ausbauen.</p><div class="quests">${groups.map((g, k) => {
    const def = BUILDINGS[g.type];
    const title = g.kind === 'level' ? `${esc(def.name)} ★${g.level} → ★${g.level + 1}` : `${esc(def.name)} → ${BUILDINGS[g.to].icon} ${esc(BUILDINGS[g.to].name)}`;
    const cost = g.kind === 'level' ? levelCost(g.type, g.level + 1) : BUILDINGS[g.to].cost;
    return `<div class="quest-card${g.problem ? '' : ' ready'}"><div class="q-medal">${iconHtml(def.bild, def.icon, 'big')}</div><div class="q-main">
      <b>${title}</b><small>${g.list.length > 1 ? `${g.list.length} Gebäude · ` : ''}${costHtml(cost)}</small>
      ${g.problem ? `<small class="why">⏳ ${esc(g.problem)}</small>` : ''}</div>
      <button class="btn${g.problem ? '' : ' primary'}" onclick="goUpgrade(${k})">${g.problem ? '👁 Ansehen' : '⬆ Ausbauen'}</button></div>`;
  }).join('')}</div>`;
}

function openUpgrades() {
  closeInfo();
  openPage('🔨 Ausbauen', upgradesHtml(), 'upgrades');
}

function goUpgrade(k) {
  const g = upgradeGroups()[k];
  if (!g) return;
  const i = g.list[0], b = state.buildings[i], s = BUILDINGS[b.type].size;
  closeAllPages();
  centerOnTile(b.x + s / 2, b.y + s / 2);
  if (g.kind === 'evolve') { showBuildingWindow(i); return; }
  showInfo(i);
  infoFor.level = true;
  clearTimeout(infoTimer);
  positionInfo();
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

// Zum Händler: Karte hinfahren und sein Fenster öffnen (Emin, 03.11.: der Handelsplatz lag oft außerhalb des Bildes)
function goToTrader() {
  const p = traderSpot() || suedSpot();
  if (!p) return;
  centerOnTile(p.bx, p.by);
  if (traderHere()) openTrader(); else openSued();
}

function showDailyReward() {
  const day = state.daily.pending;
  if (!day) return;
  const goods = r => Object.entries(r).map(([id, n]) => `<span>${iconHtml(RESOURCES[id].bild, RESOURCES[id].icon, 'mini')}${n}</span>`).join('');
  const boxes = DAILY_REWARDS.map((_, k) => dailyRewardOf(k + 1)).map((r, k) => {
    const cls = (k + 1 === day ? ' today' : k + 1 < day ? ' past' : '') + (k === DAILY_REWARDS.length - 1 ? ' chest' : '');
    return `<div class="day${cls}"><b>Tag ${k + 1}</b>${k === DAILY_REWARDS.length - 1 ? iconHtml('truhe', '🎁', 'big') : ''}<div class="day-goods">${goods(r)}${k === DAILY_REWARDS.length - 1 ? '<span>💎</span>' : ''}</div></div>`;
  }).join('');
  openDialog(`<div class="daily-head">${iconHtml('truhe', '🎁', 'big')}<div><h2>Tägliche Belohnung</h2>
    <p>Tag ${day} von 7 – am 7. Tag gibt es die große Truhe! Ein verpasster Tag bricht die Reihe nicht.</p></div></div>
    <div class="days">${boxes}</div>
    <div class="buttons"><button class="btn primary" onclick="doClaimDaily()">🎁 Abholen</button></div>`);
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
  const lost = Object.entries(result.gained).filter(([, n]) => n < 0);
  openDialog(`<h2>Willkommen zurück!</h2>
    <p>Du warst ${formatTime(result.seconds)} weg. Dein Stamm hat weitergearbeitet:</p>
    <p>${gained.length ? gained.map(([id, n]) => `${RESOURCES[id].icon} +${Math.floor(n)}`).join('  ') : 'nichts Neues im Lager'}${result.pop > 0 ? `  👥 +${result.pop}` : ''}</p>
    ${lost.length || result.pop < 0 ? `<p><small>Weniger geworden: ${lost.map(([id, n]) => `${RESOURCES[id].icon} −${Math.floor(-n)}`).join('  ')}${result.pop < 0 ? `  👥 −${Math.ceil(-result.pop)}` : ''}</small></p>` : ''}
    ${(result.events || []).length ? `<div class="info-list">${result.events.map(e => `<div><small>${esc(e)}</small></div>`).join('')}</div>` : ''}
    <div class="buttons"><button class="btn primary" onclick="closeDialog(); afterWelcome()">Weiter</button></div>`);
}

// ---------------------------------------------------------------------
// Menü, Einstellungen, Spielstände
// ---------------------------------------------------------------------

function menuHtml() {
  const stat = (value, label) => `<div class="stat"><b>${value}</b><small>${label}</small></div>`;
  const tile = (icon, label, action) => `<button class="tile" onclick="${action}"><span class="emoji">${icon}</span>${label}</button>`;
  const sw = (key, icon, label, note) => `<label class="switch-row"><span>${icon} ${label}<small>${note}</small></span>
    <input type="checkbox" class="switch" ${settings[key] ? 'checked' : ''} onchange="settings.${key}=this.checked; saveSettings(); updateMusic()"></label>`;
  return `<div class="menu">
    ${images['logo-rund'] ? `<img class="menu-logo" src="${imagePath('logo-rund')}" alt="Epochia">` : ''}
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
      ${sw('music', '🎵', 'Musik', 'Flöten und Trommeln')}
      <div class="switch-row"><span>💬 Blasen über Gebäuden<small>Probleme zeigen sie immer, außer bei „Aus“</small></span>
        <span class="seg">${[['probleme', 'Probleme'], ['alle', 'Alle'], ['aus', 'Aus']].map(([v, t]) =>
          `<button class="${(settings.bubbles || 'probleme') === v ? 'on' : ''}" onclick="settings.bubbles='${v}'; saveSettings(); refreshMenu()">${t}</button>`).join('')}</span></div>
      <div class="tiles">${tile('👴', 'Einstieg neu starten', 'closeAllPages(); restartTutorial()')}</div>
    </section>
    <section class="card">
      <h3>💾 Spielstand <small>Platz ${currentSlot}</small></h3>
      <div class="tiles">
        ${tile('💾', 'Speichern', "saveGame(); toast('Gespeichert')")}
        ${tile('🗂', 'Spielstände', 'openSlots(true)')}
        ${tile('☁️', 'Konto', 'openKonto()')}
        ${tile('🌱', 'Neu starten', 'askRestart()')}
        ${tile('📤', 'Exportieren', 'showExport()')}
        ${tile('📥', 'Importieren', 'showImport()')}
        ${tile('🏠', 'Startseite', 'saveGame(); closeAllPages(); showStartScreen()')}
        ${tile('🔄', 'Nach Updates suchen', 'checkForUpdate(true)')}
      </div>
    </section>
    ${typeof errorLog !== 'undefined' && errorLog.length ? `<section class="card"><details><summary>⚠️ Letzte Fehler (${errorLog.length}) – Bildschirmfoto an Claude</summary>
      <ul class="lines">${errorLog.map(x => `<li><small>${esc(new Date(x.t).toLocaleString('de-DE'))} · V${x.v}</small><br>${esc(x.text)}<br><small>${esc(x.line || '')}</small></li>`).join('')}</ul>
      <button class="btn small" onclick="errorLog = []; try { localStorage.removeItem(ERROR_KEY); } catch (e) {} openMenu()">Liste leeren</button></details></section>` : ''}
    <p class="version">Epochia · Version ${APP_VERSION}</p>
  </div>`;
}

function openMenu() {
  closeInfo();
  openPage('⚙️ Menü', menuHtml(), 'menu');
}
function refreshMenu() { if (pageOpen === 'menu') $('page-body').innerHTML = menuHtml(); }

const SLOT_PICTURES = { alt: '1-lagerfeuer', mittel: '1-grubenhaus', jung: '1-langhaus', kupfer: '1-langhaus', eisen1: '1-langhaus', eisen2: '1-langhaus', eisen3: '1-langhaus' };

function slotsHtml(inGame) {
  return '<div class="slots">' + SLOTS.map(slot => {
    const info = slotInfo(slot), good = info && !info.broken, cur = slot === currentSlot;
    const pic = good ? (SLOT_PICTURES[info.stageId] || 'logo-rund') : info ? '' : '1-baustelle-2';
    const when = good && info.savedAt ? new Date(info.savedAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '';
    return `<div class="slot${cur ? ' current' : ''}${info ? '' : ' empty'}">
      <div class="slot-pic">${pic ? `<img src="${imagePath(pic)}" alt="">` : '⚠️'}</div>
      <div class="slot-text">
        <b>Platz ${slot}${cur && inGame ? ' <em>gerade offen</em>' : ''}</b>
        ${good ? `<span class="slot-stage">${esc(info.stage)}</span><span>👥 ${info.pop} Einwohner</span><small>${esc(when)}</small>`
          : info ? '<span>Spielstand beschädigt</span>' : '<span>Frei für ein neues Spiel</span>'}
      </div>
      <div class="slot-buttons">
        <button class="btn primary" onclick="chooseSlot(${slot})">${good ? '▶ Spielen' : '🌱 Neues Spiel'}</button>
        ${info ? `<button class="btn danger" aria-label="Platz ${slot} löschen" onclick="askDeleteSlot(${slot})">🗑</button>` : ''}
      </div>
    </div>`;
  }).join('') + '</div>';
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

// Neu starten: Gibt es einen freien Platz, bleibt der jetzige Spielstand erhalten; sonst wird er nach Rückfrage ersetzt
function askRestart() {
  const free = SLOTS.find(sl => !slotInfo(sl));
  openDialog(`<h2>🌱 Neu starten?</h2>
    <p>${free ? `Du kannst auf dem freien <b>Platz ${free}</b> neu anfangen – dein Spiel auf Platz ${currentSlot} bleibt erhalten.` : 'Alle Plätze sind belegt.'}</p>
    <p>„Diesen Platz ersetzen“ löscht das Spiel auf Platz ${currentSlot} für immer.</p>
    <div class="buttons">
      ${free ? `<button class="btn primary" onclick="closeDialog(); chooseSlot(${free})">Auf Platz ${free} neu starten</button>` : ''}
      <button class="btn danger" onclick="doDeleteSlot(${currentSlot})">Diesen Platz ersetzen</button>
      <button class="btn" onclick="closeDialog()">Abbrechen</button>
    </div>`);
}

function askDeleteSlot(slot) {
  openDialog(`<h2>Platz ${slot} löschen?</h2><p>Der Spielstand ist dann für immer weg.</p>
    <div class="buttons"><button class="btn danger" onclick="doDeleteSlot(${slot})">Löschen</button><button class="btn" onclick="closeDialog()">Nein</button></div>`);
}

function doDeleteSlot(slot) {
  deleteSlot(slot);
  closeDialog();
  if (slot === currentSlot && gameRunning) { closeAllPages(); enterGame(); return; }   // wie ein frisches Spiel: Figuren, Kamera, Einstieg
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
    enterGame();   // setzt Figuren, Wetter, Kamera und Hinweise zurück
    toast('Spielstand geladen');
  } else toast('Der Text ist kein gültiger Spielstand');
}
