// Epochia – Lagerfenster, Warnung „bald leer“ und Verlustmeldung (Plan: docs/plan-lager.md).
// Nur Anzeige: An der Spielrechnung ändert sich nichts, im Spielstand liegt nichts davon.

const stockWatch = { timer: 0, warned: {}, lossFor: {}, lastLoss: {}, lastAny: -Infinity, winterDone: false, lastText: '' };

function resetStockWatch() {
  Object.assign(stockWatch, { timer: 0, warned: {}, lossFor: {}, lastLoss: {}, lastAny: -Infinity, winterDone: false, lastText: '' });
}

// Waren, die gerade jemand braucht: Einwohner oder laufende Werkstätten
function goodsInDemand() {
  const out = new Set();
  for (const id of Object.keys(RESOURCES)) if (upkeepPerHead(id) > 0) out.add(id);
  for (const n of activeNeeds()) if (n.kind === 'stock' && RESOURCES[n.id]) out.add(n.id);
  state.buildings.forEach((b, i) => {
    const def = BUILDINGS[b.type];
    if (!def.consumes || b.build || b.paused || !isConnected(i)) return;
    for (const id of Object.keys(def.consumes)) out.add(id);
  });
  return out;
}

// Minuten, bis die Ware bei gleichem Verlauf aufgebraucht ist
function minutesLeft(id) {
  const net = (stats.rates || {})[id] || 0;
  return net < -0.01 ? (state.res[id] || 0) / -net : Infinity;
}

function updateStockWatch(dt) {
  if (offlineRunning) return;
  stockWatch.timer += dt;
  if (stockWatch.timer < 1 || !stats.rates) return;
  const step = stockWatch.timer;
  stockWatch.timer = 0;
  updateSoonEmpty();
  updateLosses(step);
}

function updateSoonEmpty() {
  const c = CONFIG.stockWatch, w = stockWatch.warned, demand = goodsInDemand(), now = state.playTime;
  for (const id of visibleResources()) {
    if (c.topGoods.includes(id)) continue;
    const dry = (state.res[id] || 0) < 0.5 && demand.has(id) && (stats.rates[id] || 0) <= 0.01;
    const left = minutesLeft(id);
    if (w[id] === undefined) {
      if (dry || left < c.soonIn) w[id] = now;
    } else if (!dry && left >= c.soonOut && now - w[id] >= c.minShow) {
      delete w[id];   // Mindestzeit, damit die Ware nicht flackert
    }
  }
}

// Gewarnte Waren für die Leiste: die dringendsten zuerst, damit die Leiste nicht wieder voll wird
function warnedGoods() {
  return Object.keys(stockWatch.warned).filter(id => RESOURCES[id])
    .sort((a, b) => minutesLeft(a) - minutesLeft(b) || (state.res[a] || 0) - (state.res[b] || 0))
    .slice(0, CONFIG.stockWatch.maxChips);
}

function updateLosses(step) {
  const c = CONFIG.stockWatch, now = state.playTime, winter = seasonIndex() === 3;
  if (!winter) stockWatch.winterDone = false;
  if (state.tutorial >= 0) { stockWatch.lossFor = {}; return; }
  const ready = [];
  let anyDue = false;
  for (const id of visibleResources()) {
    // Kleine Verluste aus einem großen Vorrat sind kein Grund zur Sorge: nur melden, wenn die Ware in absehbarer Zeit leer wäre
    const falling = (stats.rates[id] || 0) <= -c.lossRate && (state.res[id] || 0) > c.lossStock && minutesLeft(id) < c.lossWithin;
    stockWatch.lossFor[id] = falling ? (stockWatch.lossFor[id] || 0) + step : 0;
    if (stockWatch.lossFor[id] < c.lossHold / 2 || now - (stockWatch.lastLoss[id] ?? -Infinity) < c.lossPause) continue;
    if (id === 'nahrung' && winter && stockWatch.winterDone) continue;   // im Winter sinkt die Nahrung immer
    ready.push(id);
    if (stockWatch.lossFor[id] >= c.lossHold) anyDue = true;
  }
  if (!anyDue || now - stockWatch.lastAny < c.lossGap) return;
  stockWatch.lastAny = now;
  for (const id of ready) {
    stockWatch.lastLoss[id] = now;
    if (id === 'nahrung' && winter) stockWatch.winterDone = true;
  }
  stockWatch.lastText = lossText(ready);
  toast(stockWatch.lastText);
}

// Als Grund taugt nur, was wirklich schadet: Sonne fördert die Felder und erklärt keinen Verlust
function effectHurts(e, id) {
  const x = e.effect, makers = Object.keys(BUILDINGS).filter(t => (BUILDINGS[t].produces || {})[id] !== undefined);
  return (id === 'nahrung' && x.food > 1) || (x.workers !== undefined && x.workers < 1) || makers.some(t =>
    (x.buildings || {})[t] < 1 || (x.outdoor < 1 && OUTDOOR_WORK.includes(t)) || (x.water < 1 && BUILDINGS[t].needsWater));
}

// „📉 Holz −3, Stein −1 je Minute · Dauerregen“
function lossText(ids) {
  const list = ids.slice(0, 3).map(id => `${RESOURCES[id].name} −${perMin(Math.abs(stats.rates[id] || 0))}`).join(', ');
  const more = ids.length > 3 ? ` und ${ids.length - 3} weitere` : '';
  const effect = ids.map(id => goodEffects(id).find(e => effectHurts(e, id))).find(Boolean);
  const why = effect ? `${effect.icon} ${effect.name}`
    : ids.includes('nahrung') && seasonIndex() === 3 ? `${season().icon} ${season().name}`
    : 'mehr Ausgaben als Einnahmen';
  return `📉 ${list}${more} je Minute · ${why}`;
}

// ---------------------------------------------------------------------
// Das Fenster
// ---------------------------------------------------------------------

// Ist die Ware knapp? Dieselbe Regel wie die Warnung oben in der Leiste.
function lagerSoon(id) {
  return stockWatch.warned[id] !== undefined || minutesLeft(id) < CONFIG.stockWatch.soonIn;
}

function lagerRowHtml(id) {
  const r = RESOURCES[id], n = Math.floor(state.res[id] || 0), cap = capOf(id), net = stats.rates[id] || 0;
  const full = n >= cap, soon = lagerSoon(id);
  const mark = full ? '<i class="lager-mark voll">voll</i>' : n <= 0 && soon ? '<i class="lager-mark knapp">leer</i>' : soon ? '<i class="lager-mark knapp">bald leer</i>' : '';
  const rate = Math.abs(net) < 0.05 ? '' : `<em class="${net > 0 ? 'good' : 'bad'}">${net > 0 ? '+' : '−'}${perMin(Math.abs(net))}</em>`;
  const cls = full ? ' voll' : soon ? ' knapp' : n <= 0 ? ' leer' : '';
  const fill = cap > 0 ? Math.min(100, Math.round(100 * n / cap)) : 0;
  return `<button class="lager-row${cls}" onclick="resourceTip('${id}')">${iconHtml(r.bild, r.icon)}<span class="lager-name">${esc(r.name)}${mark}</span>${rate}<b>${n}</b><span class="lager-fill"><i style="width:${fill}%"></i></span></button>`;
}

function lagerFindsHtml() {
  const ids = Object.keys(FINDS).filter(findEver);
  if (!ids.length) return '<p class="hint">Noch nichts gefunden. Tippe glitzernde Stellen auf der Karte an.</p>';
  const rows = ids.map(id => {
    const f = FINDS[id], have = findCount(id), need = findNeed(id);
    return `<button class="lager-row" onclick="openChest()">${iconHtml(f.bild, f.icon)}<span class="lager-name">${esc(f.name)}</span><small>${need > 0 ? `${have} / ${need}` : have ? `${have} übrig` : '✔ verbaut'}</small></button>`;
  }).join('');
  return `<div class="lager-list">${rows}</div>`;
}

function lagerGroupHtml(cls, title, body) {
  return `<section class="lager-group ${cls}"><h3>${title}</h3>${body}</section>`;
}

function lagerHtml() {
  const seen = visibleResources();
  // Knappe Waren stehen in einem eigenen Block ganz oben, nicht zweimal
  const knapp = seen.filter(id => lagerSoon(id) && (state.res[id] || 0) < capOf(id));
  const groups = LAGER_GROUPS.map(g => {
    const ids = g.goods.filter(id => seen.includes(id) && !knapp.includes(id));
    return ids.length ? lagerGroupHtml('', `${g.icon} ${esc(g.name)}`, `<div class="lager-list">${ids.map(lagerRowHtml).join('')}</div>`) : '';
  }).join('');
  const warn = knapp.length ? lagerGroupHtml('achtung', '⚠️ Wird knapp', `<div class="lager-list">${knapp.map(lagerRowHtml).join('')}</div>`) : '';
  return `<div class="lager">
    <div class="lager-cap"><span>📦 Platz je Ware <b>${storageCap()}</b></span><span>💡 Platz für Wissen <b>${knowledgeCap()}</b></span></div>
    ${warn}${groups}${lagerGroupHtml('', '💎 Besonderes', lagerFindsHtml())}
  </div>`;
}

function openLager() {
  closeInfo();
  openPage('📦 Lager', lagerHtml(), 'lager');
}

let lagerTick = 0;
function tickLagerPage() {
  if (pageOpen !== 'lager' || ++lagerTick % 4) return;   // einmal je Sekunde genügt
  patchHtml($('page-body'), lagerHtml());
}
