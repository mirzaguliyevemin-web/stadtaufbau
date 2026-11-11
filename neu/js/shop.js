'use strict';
// Epochia – Item-Shop (docs/plan-item-shop.md). Schritt 1: zum Ausprobieren, es fließt kein echtes Geld.
// Solange CONFIG.shop.testMode gilt, gibt es Gold kostenlos. Für echte Käufe muss das Gold später auf den Server.

function goldEuro(n) { return (n * CONFIG.shop.euroPerGold).toFixed(2).replace('.', ','); }
function goldText(n) { return `🪙 ${n}`; }

// Baustellen: 2 zu Beginn, je eine mehr durch die Forschungen Bautrupps (Bronzezeit) und Zimmerleute (Eisenzeit), dazu der Shop
function constructionLimit() { return CONFIG.maxConstructions + techSum('constructions') + (state.shop.slots || 0); }

function addGold(n) { state.shop.gold = Math.max(0, state.shop.gold + n); emit('goldChanged'); }

function spendGold(n) {
  if (state.shop.gold < n) return false;
  state.shop.gold -= n;
  state.shop.spent = (state.shop.spent || 0) + n;
  emit('goldChanged');
  return true;
}

// Was gerade läuft und beschleunigt werden kann: Forschung, Baustellen, Abschnitte der Wunderwerke
function speedTargets() {
  const out = [];
  if (state.research) out.push({ key: 'r', name: `${TECHS[state.research.id].icon} ${TECHS[state.research.id].name}`, left: state.research.left });
  state.buildings.forEach((b, i) => { if (b.build > 0 && !BUILDINGS[b.type].wonder) out.push({ key: 'b' + i, name: `${BUILDINGS[b.type].icon} ${BUILDINGS[b.type].name}`, left: b.build }); });
  state.buildings.forEach((b, i) => { if (b.up > 0) out.push({ key: 'u' + i, name: `${BUILDINGS[b.type].icon} ${BUILDINGS[b.type].name} → Stufe ${levelOf(b) + 1}`, left: b.up }); });
  for (const id of Object.keys(WONDERS)) if (state.wonders[id] && state.wonders[id].left > 0) out.push({ key: 'w' + id, name: `${WONDERS[id].icon} ${WONDERS[id].name}`, left: state.wonders[id].left });
  return out;
}

function speedAllPrice(left) { return Math.max(CONFIG.shop.speedMin, Math.ceil(left / 60 * CONFIG.shop.speedPerMinute)); }

// Zieht Zeit ab (seconds = Infinity: sofort fertig). Fertig wird es beim nächsten Spielschritt. Gibt einen Fehlertext oder null zurück.
function speedUp(key, seconds, price) {
  const t = speedTargets().find(x => x.key === key);
  if (!t) return 'Das läuft nicht mehr';
  if (!spendGold(price)) return 'Nicht genug Gold';
  applySpeed(key, t.left - seconds);
  return null;
}

function applySpeed(key, rest) {
  const left = Math.max(0.01, rest);
  if (key === 'r') state.research.left = left;
  else if (key[0] === 'b') state.buildings[Number(key.slice(1))].build = left;
  else if (key[0] === 'u') state.buildings[Number(key.slice(1))].up = left;
  else state.wonders[key.slice(1)].left = left;
  emit('speedUsed', key);
}

// Beschleunigungsstein: am Gebäude (Bau oder Ausbau) – ein Stein spart CONFIG.shop.stone.seconds
function stoneKey(i) {
  const b = state.buildings[i];
  if (!b || BUILDINGS[b.type].wonder) return null;
  return b.build > 0 ? 'b' + i : b.up > 0 ? 'u' + i : null;
}
function useStone(i) {
  const key = stoneKey(i);
  const t = key && speedTargets().find(x => x.key === key);
  if (!t) return 'Hier wird gerade nichts gebaut';
  if ((state.shop.stones || 0) < 1) return 'Keine Beschleunigungssteine';
  state.shop.stones -= 1;
  applySpeed(key, t.left - CONFIG.shop.stone.seconds);
  return null;
}
function buyStones(k) {
  const p = CONFIG.shop.stone.packs[k];
  if (!spendGold(p.price)) return 'Nicht genug Gold';
  state.shop.stones = (state.shop.stones || 0) + p.n;
  emit('goldChanged');
  return null;
}

function shopFinds() {
  return Object.keys(FINDS).filter(id => findAvailable(id) && findCount(id) < findNeed(id));
}
function findPrice(id) { return CONFIG.shop.findPrices[id] || CONFIG.shop.findPrice; }

function buyFind(id) {
  if (!shopFinds().includes(id)) return 'Das brauchst du gerade nicht';
  if (!spendGold(findPrice(id))) return 'Nicht genug Gold';
  addFind(id);
  return null;
}

function goodsPack(k) {
  const p = CONFIG.shop.goods[k], f = DAILY_GROWTH.factor[state.stage] || 1, out = {};
  for (const [id, n] of Object.entries(p.goods)) out[id] = Math.round(n * f / 5) * 5;
  const extra = DAILY_GROWTH.extra[state.stage];
  if (extra) for (const [id, n] of Object.entries(extra)) out[id] = (out[id] || 0) + n * p.extra;
  return { goods: out, price: Math.round(p.price * (1 + (f - 1) * 0.35) / 5) * 5 };
}

// Zeitalter-Paket: feste Waren je Zeitalter (CONFIG.shop.epochPacks)
function epochPack() { return CONFIG.shop.epochPacks[state.stage] || null; }

function buyGoods(k) {
  const p = k === 'zeit' ? epochPack() : goodsPack(k);
  if (!p) return 'Gibt es gerade nicht';
  if (!spendGold(p.price)) return 'Nicht genug Gold';
  addReward(p.goods);
  return null;
}

function buySlot() {
  if (state.shop.slots >= 1) return 'Hast du schon';
  if (!spendGold(CONFIG.shop.slotPrice)) return 'Nicht genug Gold';
  state.shop.slots = 1;
  return null;
}

// Testkauf: kein echtes Geld
function buyPack(i) {
  if (!CONFIG.shop.testMode) return 'Kaufen geht noch nicht';
  addGold(CONFIG.shop.packs[i].gold);
  return null;
}

// Gold verdienen: etwas für Aufträge, Wünsche und die große Truhe
on('questClaimed', () => { if (state.shop) addGold(CONFIG.shop.earn.quest); });

// ---------------------------------------------------------------------
// Fenster
// ---------------------------------------------------------------------

function shopRow(icon, title, sub, price, onclick, enabled = true) {
  const can = enabled && state.shop.gold >= price;
  return `<div class="quest-card shop-row"><div class="q-medal">${icon}</div><div class="q-main"><b>${esc(title)}</b><small>${sub}</small></div>
    <button class="btn${can ? ' primary' : ''}" ${can ? '' : 'disabled'} onclick="${onclick}">${goldText(price)}<small class="shop-euro">≈ ${goldEuro(price)} €</small></button></div>`;
}

function stoneShopHtml() {
  const c = CONFIG.shop.stone;
  return `<p class="empty-note">Du hast <b>⚡ ${state.shop.stones || 0}</b>. Tippe beim Bauen oder Ausbauen auf ⚡ am Gebäude: Jeder Stein spart ${Math.round(c.seconds / 60)} Minuten.</p>`
    + c.packs.map((p, k) => shopRow('<span class="ic emoji big">⚡</span>', `${p.n} Beschleunigungssteine`, `${p.n * Math.round(c.seconds / 60)} Minuten schneller bauen`, p.price, `doBuyStones(${k})`)).join('');
}

function shopSpeedHtml() {
  const list = speedTargets();
  if (!list.length) return '<p class="empty-note">Gerade läuft nichts, das man beschleunigen kann.</p>';
  const c = CONFIG.shop;
  return list.map(t => {
    const all = speedAllPrice(t.left);
    const btn = (label, secs, price) => `<button class="btn small${state.shop.gold >= price ? '' : ' off'}" ${state.shop.gold >= price ? '' : 'disabled'} onclick="doSpeed('${t.key}', ${secs}, ${price})">${label}<br>${goldText(price)}</button>`;
    return `<div class="quest-card shop-speed"><div class="q-main"><b>${esc(t.name)}</b><small>noch ${formatTime(t.left)}</small>
      <div class="shop-speed-btns">${t.left > 900 ? btn('−15 min', 900, c.speed15) : ''}${t.left > 3600 ? btn('−1 Std.', 3600, c.speed60) : ''}${btn('Sofort', 1e9, all)}</div></div></div>`;
  }).join('');
}

function shopHtml() { return `<div class="shop">${shopInner()}</div>`; }

// Waren mit Bild, ohne Rot für Fehlendes
function amountsHtml(goods) {
  return Object.entries(goods).map(([id, n]) => `<span class="cost">${iconHtml(RESOURCES[id].bild, RESOURCES[id].icon, 'mini')}${n}</span>`).join(' ');
}

function shopInner() {
  const c = CONFIG.shop;
  const packs = c.packs.map((p, i) => `<button class="btn shop-pack" onclick="doPack(${i})"><b>${goldText(p.gold)}</b><span>${esc(p.euro)} €</span>${c.testMode ? '<small>Test: kostenlos</small>' : ''}</button>`).join('');
  const finds = shopFinds().map(id => shopRow(iconHtml(FINDS[id].bild, FINDS[id].icon, 'big'), FINDS[id].name, `Hast du ${findCount(id)}, gebraucht werden ${findNeed(id)}`, findPrice(id), `doBuyFind('${id}')`)).join('');
  const ep = epochPack(), stage = STAGES[stageIndex()];
  const goods = (ep ? shopRow(iconHtml(RESOURCES[Object.keys(ep.goods)[0]].bild, '🎁', 'big'), `Zeitalter-Paket: ${stage.name}`, amountsHtml(ep.goods), ep.price, "doBuyGoods('zeit')") : '')
    + Object.keys(c.goods).map(k => {
      const p = goodsPack(k);
      return shopRow(iconHtml(RESOURCES.holz.bild, '📦', 'big'), c.goods[k].name, amountsHtml(p.goods), p.price, `doBuyGoods('${k}')`);
    }).join('');
  const slot = state.shop.slots >= 1 ? '<p class="empty-note">✔ Du hast eine zusätzliche Baustelle.</p>'
    : shopRow('<span class="ic emoji big">🏗️</span>', 'Eine Baustelle mehr', `Dauerhaft ${constructionLimit() + 1} statt ${constructionLimit()} gleichzeitig`, c.slotPrice, 'doBuySlot()');
  return `<div class="shop-head"><span class="shop-gold">${goldText(state.shop.gold)}</span><small>${c.testMode ? 'Testmodus: Es fließt kein echtes Geld.' : ''} Gold gibt es auch für Aufträge, Wünsche und die große Truhe.</small></div>
    <h3 class="find-page">Gold</h3><div class="shop-packs">${packs}</div>
    <h3 class="find-page">Beschleunigungssteine</h3><div class="quests">${stoneShopHtml()}</div>
    <h3 class="find-page">Beschleunigen</h3><div class="quests">${shopSpeedHtml()}</div>
    ${finds ? `<h3 class="find-page">Fehlende Fundstücke</h3><div class="quests">${finds}</div>` : ''}
    <h3 class="find-page">Warenpakete</h3><div class="quests">${goods}</div>
    <h3 class="find-page">Dauerhaft</h3><div class="quests">${slot}</div>`;
}

function openShop() {
  closeInfo();
  openPage('🪙 Shop', shopHtml(), 'shop');
}

function refreshShop() { if (pageOpen === 'shop') { const el = $('page-body'), top = el.scrollTop; el.innerHTML = shopHtml(); el.scrollTop = top; } }
function tickShopPage() { if (pageOpen === 'shop' && speedTargets().length) refreshShop(); }

function shopDone(err, ok) {
  if (err) toast(err); else { if (ok) toast(ok); playSound('muenze'); }
  refreshShop();
  if (typeof refreshWonder === 'function') refreshWonder();
  renderAll();
}
function doSpeed(key, secs, price) { shopDone(speedUp(key, secs, price), '⚡ Beschleunigt'); }
function doPack(i) { shopDone(buyPack(i), `🪙 +${CONFIG.shop.packs[i].gold} Gold (Test, kostenlos)`); }
function doBuyFind(id) { shopDone(buyFind(id)); }
function doBuyGoods(k) { shopDone(buyGoods(k), '📦 Waren geliefert'); }
function doBuyStones(k) { shopDone(buyStones(k), `⚡ +${CONFIG.shop.stone.packs[k].n} Beschleunigungssteine`); }
function doUseStone(i) {
  const err = useStone(i);
  if (err === 'Keine Beschleunigungssteine') { closeInfo(); toast('⚡ Keine Beschleunigungssteine mehr – im Shop gibt es neue'); openShop(); return; }
  if (err) { toast(err); return; }
  toast(`⚡ ${Math.round(CONFIG.shop.stone.seconds / 60)} Minuten schneller · noch ${state.shop.stones} Steine`);
  playSound('muenze');
  showInfo(i);
}
function doBuySlot() { shopDone(buySlot(), '🏗️ Eine Baustelle mehr'); }

// Knopf für Fenster: zum Shop
function shopSpeedButton() { return '<button class="btn small" onclick="closeDialog(); openShop()">⚡ Beschleunigen</button>'; }
on('goldChanged', () => { if (typeof gameRunning !== 'undefined' && gameRunning && !offlineRunning) refreshShop(); });
