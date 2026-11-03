'use strict';
// Epochia – Fundstücke, glitzernde Fundstellen, Erzader und Schatzkiste (Wunderwerke, Schritt 1: docs/konzept-wunderwerke.md).
// Eigener Zufall aus Spielstand-Zahl und Zähler: zieht nichts aus Math.random, das Testspiel bleibt damit unverändert.

function fundRandom() {
  const n = (state.fund.rng = (state.fund.rng + 1) >>> 0);
  let h = Math.imul(((state.seed || 1) ^ n) >>> 0, 2654435761) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

function findCount(id) { return state.finds[id] || 0; }
// Noch gebraucht: Bedarf des Wunderwerks minus das schon Verbaute
function findNeed(id) { return Math.max(0, (FINDS[id].need || 1) - (state.fund.used[id] || 0)); }
function findEver(id) { return (state.fund.ever[id] || 0) > 0 || findCount(id) > 0; }

function useFind(id, n) {
  state.finds[id] = Math.max(0, findCount(id) - n);
  state.fund.used[id] = (state.fund.used[id] || 0) + n;
}

// Lässt sich das Stück jetzt schon finden?
function findAvailable(id) {
  const f = FINDS[id];
  if (!f || f.soon) return false;
  if (f.tech && !state.techs[f.tech]) return false;
  return !f.stage || stageReached(f.stage);
}

function addFind(id, n = 1) {
  state.finds[id] = findCount(id) + n;
  state.fund.ever[id] = (state.fund.ever[id] || 0) + n;
  emit('findGained', id);
}

// Glücksschutz: Es kommt immer, was im Verhältnis zum Bedarf am wenigsten da ist. So bleibt niemand an einem Stück hängen.
function leastFind(list) {
  let best = [], low = Infinity;
  for (const id of list) {
    const need = findNeed(id), k = need > 0 ? findCount(id) / need : 10 + findCount(id);   // schon verbaut: kommt zuletzt
    if (k < low - 1e-9) { low = k; best = [id]; } else if (k < low + 1e-9) best.push(id);
  }
  return best.length ? best[Math.floor(fundRandom() * best.length)] : null;
}

function anyAvailableFind() {
  return leastFind(Object.keys(FINDS).filter(id => findAvailable(id)));
}

// ---------------------------------------------------------------------
// Fundstellen auf der Karte
// ---------------------------------------------------------------------

function spotTileFits(kind, x, y) {
  if (!inMap(x, y) || !isOwned(x, y) || buildingAt(x, y) >= 0) return false;
  const t = terrainAt(x, y);
  if (kind === 'fels') return t === TERRAIN.fels;
  if (kind === 'wald') return t === TERRAIN.wald;
  if (kind === 'erz') return t === TERRAIN.berg || t === TERRAIN.fels;
  if (kind === 'stern') return t === TERRAIN.gras;
  if (kind === 'findling') return t === TERRAIN.berg || t === TERRAIN.fels || t === TERRAIN.gras;
  if (kind === 'ufer') {
    if (t !== TERRAIN.gras && t !== TERRAIN.sand) return false;
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => terrainAt(x + a, y + b) === TERRAIN.wasser);
  }
  return false;
}

function spotTiles(kind) {
  const out = [], taken = new Set(state.spots.map(s => s.y * N + s.x));
  for (let y = landBox.y0; y <= landBox.y1; y++)
    for (let x = landBox.x0; x <= landBox.x1; x++)
      if (!taken.has(y * N + x) && spotTileFits(kind, x, y)) out.push([x, y]);
  return out;
}

function addSpot(kind, find, tiles = spotTiles(kind)) {
  if (!tiles.length) return null;
  const [x, y] = tiles[Math.floor(fundRandom() * tiles.length)];
  const spot = { kind, x, y, find };
  state.spots.push(spot);
  emit('spotAppeared', spot);
  return spot;
}

// Eine gewöhnliche Fundstelle: das Stück, das am meisten fehlt und zu dem es auf dem eigenen Land Gelände gibt
function spawnSpot() {
  const list = Object.keys(FINDS).filter(id => findAvailable(id) && FINDS[id].spot && (!FINDS[id].spotExtinct || mammothsExtinct()));
  while (list.length) {
    const id = leastFind(list), tiles = spotTiles(FINDS[id].spot);
    if (tiles.length) return addSpot(FINDS[id].spot, id, tiles);
    list.splice(list.indexOf(id), 1);
  }
  return null;
}

function normalSpots() { return state.spots.filter(s => !SPOT_STYLE[s.kind].special).length; }

// Erzader: selten, nur mit Kupfermine. Bevorzugt am Gebirge, sonst an einem Felsen.
function spawnOre() {
  const all = spotTiles('erz');
  const mountain = all.filter(([x, y]) => terrainAt(x, y) === TERRAIN.berg);
  return addSpot('erz', null, mountain.length ? mountain : all);
}

// Riesenfindling: bevorzugt am Gebirge, sonst an Felsen, sonst auf der Wiese. Nur solange der Steinkreis noch welche braucht.
function bouldersWanted() {
  if (!state.wonders.steinkreis || !wonderBuilt('steinkreis') || wonderDone('steinkreis')) return false;
  const coming = state.trips.filter(t => t.kind === 'findling').length;
  return findCount('findling') + coming < findNeed('findling');
}

function spawnBoulder() {
  const all = spotTiles('findling');
  const pick = TERRAINS => all.filter(([x, y]) => TERRAINS.includes(terrainAt(x, y)));
  const mountain = pick([TERRAIN.berg]), rock = pick([TERRAIN.fels]);
  return addSpot('findling', 'findling', mountain.length ? mountain : rock.length ? rock : all);
}

function oreMines() {
  return state.buildings.filter(b => (BUILDINGS[b.type].line === 'erz' || BUILDINGS[b.type].line === 'eisenerz') && !b.build);
}

function fireSpot() {
  const b = state.buildings.find(k => k.type === 'lagerfeuer');
  return b ? { x: b.x + BUILDINGS[b.type].size / 2, y: b.y + BUILDINGS[b.type].size / 2 } : null;
}

// Fundstellen auf überbautem oder gerodetem Boden verschwinden
function dropInvalidSpots() {
  state.spots = state.spots.filter(s => s.kind === 'glut' || spotTileFits(s.kind, s.x, s.y));
}

function updateMoments() {
  if (darkness() < 1) return;
  const night = Math.floor(state.playTime / CONFIG.daySeconds), f = state.fund;
  if (f.glutNight !== night && !state.spots.some(s => s.kind === 'glut')) {
    const p = fireSpot();
    if (p) { f.glutNight = night; const spot = { kind: 'glut', x: Math.floor(p.x), y: Math.floor(p.y), find: 'holzkohle' }; state.spots.push(spot); emit('spotAppeared', spot); }
  }
  // Sternschnuppe: bei klarem Himmel, gegen Ende der Nacht sicher (sonst dauern 3 Sternkarten bei wolkigem Wetter Stunden)
  if (findAvailable('sternkarte') && f.sternNight !== night && (currentWeather().id === 'klar' || dayPart() >= 0.88) && !state.spots.some(s => s.kind === 'stern')) {
    f.sternNight = night;
    addSpot('stern', 'sternkarte');
  }
}

// Glück bei der Arbeit: je Minute wahrscheinlicher, nach der Schutzzeit sicher
function updateLuck() {
  const f = state.fund;
  for (const r of CONFIG.finds.luck) {
    if (!findAvailable(r.find) || (r.seasons && !r.seasons.includes(seasonIndex()))) continue;
    const works = state.buildings.some(b => BUILDINGS[b.type].line === r.line && !b.build);   // auch pausierte zählen, sonst hängt der Steinkreis
    if (!works) continue;
    const t = (f.luck[r.find] || 0) + 60;
    f.luck[r.find] = t;
    if (t >= r.pity || fundRandom() < (t / r.pity) ** 3 * 0.1) { f.luck[r.find] = 0; addFind(r.find); }
  }
}

function updateFinds(dt) {
  for (let i = state.trips.length - 1; i >= 0; i--) {
    const trip = state.trips[i];
    trip.left -= dt;
    if (trip.left > 0) continue;
    state.trips.splice(i, 1);
    finishTrip(trip);
  }
  if (offlineRunning || state.tutorial >= 0) return;
  const c = CONFIG.finds, f = state.fund;
  dropInvalidSpots();
  f.spotWait -= dt;
  if (f.spotWait <= 0) { f.spotWait = c.spotEvery; if (normalSpots() < c.maxSpots) spawnSpot(); }
  if (oreMines().length) {
    f.oreWait -= dt;
    if (f.oreWait <= 0) { f.oreWait = c.oreEvery; if (!state.spots.some(s => s.kind === 'erz')) spawnOre(); }
  }
  if (bouldersWanted()) {
    f.boulderWait -= dt;
    if (f.boulderWait <= 0) { f.boulderWait = c.boulderEvery; if (!state.spots.some(s => s.kind === 'findling')) spawnBoulder(); }
  }
  updateMoments();
  f.luckTick += dt;
  if (f.luckTick >= 60) { f.luckTick -= 60; updateLuck(); }
}

// Fundstelle antippen. Glut und Sternschnuppe gibt es sofort, sonst läuft jemand hin und bringt das Stück.
function collectSpot(i) {
  const spot = state.spots[i];
  if (!spot) return null;
  state.spots.splice(i, 1);
  if (SPOT_STYLE[spot.kind].instant) { addFind(spot.find); return { instant: true, find: spot.find }; }
  if (spot.kind === 'findling') {   // acht Leute rollen ihn vom Fundort zum Bauplatz: nur ein Weg
    const b = state.buildings[wonderIndex('steinkreis')], half = b ? BUILDINGS[b.type].size / 2 : 0;
    const from = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].map(([a, c]) => [spot.x + a, spot.y + c]).find(([x, y]) => walkable(x, y)) || [spot.x, spot.y];
    const s = CONFIG.finds.boulderSeconds;
    const trip = { id: ++state.fund.tripId, left: s, total: s, cx: from[0] + 0.5, cy: from[1] + 0.5, x: b ? b.x + half : spot.x, y: b ? b.y + half : spot.y, kind: 'findling', find: 'findling' };
    state.trips.push(trip);
    return { trip };
  }
  const mine = spot.kind === 'erz' ? oreMines()[0] : null;
  const home = mine ? { x: mine.x + BUILDINGS[mine.type].size / 2, y: mine.y + BUILDINGS[mine.type].size / 2 } : fireSpot() || { x: spot.x, y: spot.y };
  const dist = Math.hypot(spot.x - home.x, spot.y - home.y), c = CONFIG.finds;
  const seconds = spot.kind === 'erz' ? c.oreSeconds : Math.max(c.tripMin, Math.min(c.tripMax, dist * 2 * 0.8));
  const trip = { id: ++state.fund.tripId, left: seconds, total: seconds, cx: home.x, cy: home.y, x: spot.x + 0.5, y: spot.y + 0.5, kind: spot.kind, find: spot.find };
  state.trips.push(trip);
  return { trip };
}

function finishTrip(trip) {
  if (trip.kind === 'erz') {
    const reward = stageReached('eisen1') ? { ...CONFIG.finds.oreReward, ...CONFIG.finds.oreRewardIron } : CONFIG.finds.oreReward;
    addReward(reward);
    state.fund.ores++;
    emit('oreDone', reward);
    if (state.fund.ores % CONFIG.finds.goldEvery === 0) addFind(findAvailable('bronzepickel') ? 'bronzepickel' : 'goldblatt');
    return;
  }
  if (FINDS[trip.find]) addFind(trip.find);
}

// Hochwasser spült Muscheln an
on('disasterEnded', id => {
  if (id !== 'hochwasser' || !state.fund) return;
  for (let n = 0; n < CONFIG.finds.floodShells; n++) if (normalSpots() < CONFIG.finds.maxSpots + CONFIG.finds.floodShells) addSpot('ufer', 'muschel');
});

// Offline legt der Stamm wenige Stücke in den Fundkorb; aktives Spielen lohnt sich mehr
function fillBasket(seconds) {
  if (state.tutorial >= 0) return 0;
  const c = CONFIG.finds;
  const n = (seconds >= c.basketFirst ? 1 : 0) + (seconds >= c.basketSecond ? 1 : 0);
  let added = 0;
  while (added < n && state.basket.length < c.basketMax) {
    const id = anyAvailableFind();
    if (!id) break;
    state.basket.push(id);
    added++;
  }
  return added;
}

function claimBasket() {
  const list = state.basket;
  state.basket = [];
  for (const id of list) addFind(id);
  return list;
}

// Doppelte: alles über dem Bedarf des Wunderwerks. 3 davon ergeben ein Stück nach Wahl.
function findSpare(id) { return Math.max(0, findCount(id) - findNeed(id)); }
function spareTotal(except) { return Object.keys(FINDS).reduce((n, id) => n + (id === except ? 0 : findSpare(id)), 0); }

function swapFinds(target) {
  const cost = CONFIG.finds.swapCost;
  if (!findAvailable(target) || spareTotal(target) < cost) return false;
  for (let left = cost; left > 0; left--) {
    const id = Object.keys(FINDS).filter(k => k !== target && findSpare(k) > 0).sort((a, b) => findSpare(b) - findSpare(a))[0];
    state.finds[id]--;
  }
  addFind(target);
  return true;
}

// ---------------------------------------------------------------------
// Auf der Karte: Funkeln und Figuren
// ---------------------------------------------------------------------

function spotScreen(s) {
  const p = tileToScreen(s.x + 0.5, s.y + 0.5), z = Math.max(cam.zoom, 1);
  return { x: p.x, y: p.y - (s.kind === 'glut' ? 12 : 16) * z, z };
}

function spotAtScreen(sx, sy) {
  let best = -1, low = Infinity;
  state.spots.forEach((s, i) => {
    const q = spotScreen(s), d = Math.hypot(sx - q.x, sy - q.y);
    if (d <= 26 * q.z && d < low) { low = d; best = i; }
  });
  return best;
}

// Vierzackiger Stern (spitz wie ein Lichtblitz), r = Länge der Zacken, turn = Drehung
function drawSparkle(x, y, r, color, turn = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = turn + k * Math.PI / 4, m = k % 2 ? r * 0.13 : r;
    ctx.lineTo(x + Math.cos(a) * m, y + Math.sin(a) * m);
  }
  ctx.closePath();
  ctx.fill();
}

// Funken: je Fundstelle fest verteilt, jeder blitzt zu seiner Zeit kurz auf
const SPARK_COUNT = 9;

function drawSpot(s, n, t) {
  const q = spotScreen(s), style = SPOT_STYLE[s.kind], z = q.z, ph = t + n * 1.7;
  const beat = 0.5 + 0.5 * Math.sin(ph * 4);          // das Pulsieren: 0 bis 1, gut 1,5 Schläge je Sekunde
  ctx.save();
  // Heller Schein, der mitpulsiert
  const R = (30 + beat * 16) * z;
  const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, R);
  g.addColorStop(0, style.glow); g.addColorStop(0.5, style.glow.replace(/[\d.]+\)$/, '0.3)')); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(q.x, q.y, R, 0, 7); ctx.fill();
  // Zwei Lichtwellen laufen nach außen
  for (let k = 0; k < 2; k++) {
    const w = (ph * 0.7 + k * 0.5) % 1;
    ctx.globalAlpha = (1 - w) * 0.7;
    ctx.strokeStyle = style.color;
    ctx.lineWidth = Math.max(1, 2.5 * z * (1 - w));
    ctx.beginPath(); ctx.ellipse(q.x, q.y, (10 + w * 40) * z, (5 + w * 20) * z, 0, 0, 7); ctx.stroke();
  }
  // Dunkler Hauch hinter dem Stern: hebt ihn von hellem Laub und Felsen ab
  ctx.globalAlpha = 0.35;
  drawSparkle(q.x, q.y + 1.5 * z, (24 + beat * 13) * z, '#3a2200', ph * 0.5);
  // Großer Stern: dreht sich langsam, darauf ein zweiter gegenläufig und ein heller Kern
  ctx.globalAlpha = 0.95;
  drawSparkle(q.x, q.y, (20 + beat * 12) * z, style.color, ph * 0.5);
  drawSparkle(q.x, q.y, (11 + (1 - beat) * 8) * z, style.color, Math.PI / 4 - ph * 0.5);
  ctx.globalAlpha = 1;
  drawSparkle(q.x, q.y, (11 + beat * 7) * z, '#fff', ph * 0.5);
  ctx.beginPath(); ctx.fillStyle = '#fff'; ctx.arc(q.x, q.y, (2.5 + beat * 2) * z, 0, 7); ctx.fill();
  // Funken blitzen rundherum auf und steigen ein wenig
  for (let k = 0; k < SPARK_COUNT; k++) {
    const a = k * 2.399 + n, dist = (16 + (k * 7 % 22)) * z;
    const life = (ph * 0.9 + k * 0.37) % 1, flash = Math.sin(life * Math.PI);
    ctx.globalAlpha = flash;
    drawSparkle(q.x + Math.cos(a) * dist, q.y + Math.sin(a) * dist * 0.7 - life * 10 * z, (2.5 + flash * 5) * z, k % 3 ? '#fff' : style.color);
  }
  ctx.restore();
}

function spotObjects(inView, t) {
  const out = [];
  state.spots.forEach((s, n) => {
    if (inView(s.x, s.y)) out.push({ d: s.x + s.y + 100, kind: 'leben', draw: () => drawSpot(s, n, t) });
  });
  return out;
}

const tripRoutes = new Map();
function tripRoute(trip) {
  let r = tripRoutes.get(trip.id);
  if (r) return r;
  let way = walkRoute(trip.cx, trip.cy, trip.x, trip.y);
  // Am Gebirge kann man nicht aufs Feld selbst: bis an den Fuß gehen
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    if (way) break;
    if (walkable(Math.floor(trip.x) + a, Math.floor(trip.y) + b)) way = walkRoute(trip.cx, trip.cy, trip.x + a, trip.y + b);
  }
  const pts = [[trip.cx, trip.cy], ...(way || [[trip.x, trip.y]])], len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  r = { pts, len };
  tripRoutes.set(trip.id, r);
  if (tripRoutes.size > 12) tripRoutes.delete(tripRoutes.keys().next().value);
  return r;
}

// Acht Leute rollen den Riesenfindling auf Stämmen
function boulderObjects(trip, inView, t) {
  const p = routePoint(tripRoute(trip), Math.min(1, Math.max(0, 1 - trip.left / trip.total)));
  if (!inView(p.x, p.y)) return [];
  const out = [], face = p.dx - p.dy > 0 ? -1 : 1, step = t * 7 + trip.id;
  const nx = -p.dy, ny = p.dx, len = Math.hypot(nx, ny) || 1;
  for (let k = 0; k < 8; k++) {
    const side = k % 2 ? 1 : -1, row = Math.floor(k / 2) - 1.5;
    const x = p.x + side * nx / len * 0.9 + p.dx / len * row * 0.45, y = p.y + side * ny / len * 0.9 + p.dy / len * row * 0.45;
    out.push({ d: x + y - 0.5, kind: 'leben', draw: () => drawCreature(personImg('mensch-mann', 'leer'), x, y, 32, face, Math.abs(Math.sin(step + k)) * 1.2 * cam.zoom, '🧍', step + k) });
  }
  out.push({ d: p.x + p.y - 0.5, kind: 'leben', draw: () => {
    const q = tileToScreen(p.x, p.y), z = cam.zoom, img = images['fels-gross'];
    if (img) { const w = 74 * z, h = w * img.height / img.width; ctx.drawImage(img, q.x - w / 2, q.y - h + 6 * z, w, h); }
    else { ctx.font = `${Math.round(44 * z)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText('🪨', q.x, q.y); }
  } });
  return out;
}

function tripObjects(inView, t) {
  const out = [];
  for (const trip of state.trips) {
    if (trip.kind === 'findling') { out.push(...boulderObjects(trip, inView, t)); continue; }
    const phase = Math.min(1, Math.max(0, 1 - trip.left / trip.total)), back = phase >= 0.5;
    const p = routePoint(tripRoute(trip), back ? 2 - phase * 2 : phase * 2);
    if (!inView(p.x, p.y)) continue;
    const face = (p.dx - p.dy) * (back ? -1 : 1) > 0 ? -1 : 1, step = t * 10 + trip.id;
    out.push({ d: p.x + p.y - 0.5, kind: 'leben', draw: () => {
      drawCreature(personImg('mensch-mann', 'leer'), p.x, p.y, 32, face, Math.abs(Math.sin(step)) * 1.2 * cam.zoom, '🧍', step);
      if (!back) return;
      const q = tileToScreen(p.x, p.y), z = cam.zoom;
      ctx.font = `${Math.round(13 * z)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#000';
      ctx.fillText(trip.kind === 'erz' ? '⛏️' : FINDS[trip.find] ? FINDS[trip.find].icon : '✨', q.x, q.y - 34 * z);
    } });
  }
  return out;
}

// Fundstelle wurde angetippt
function tapSpot(i) {
  const s = state.spots[i], r = collectSpot(i);
  if (!r) return;
  closeInfo();
  if (r.trip && s.kind === 'findling') toast(`🪨 Acht Leute rollen den Findling los – in ${formatTime(r.trip.total)} ist er da`);
  else if (r.trip) { toast(s.kind === 'erz' ? `⛏️ Ein Bergmann geht zur Erzader – in ${formatTime(r.trip.total)} ist er zurück` : `🚶 Jemand holt es – in ${formatTime(r.trip.total)} ist er zurück`); }
  renderAll();
}

// ---------------------------------------------------------------------
// Schatzkiste
// ---------------------------------------------------------------------

function chestBadge() { return state.spots.length + state.basket.length; }

function findCardHtml(id) {
  const f = FINDS[id], have = findCount(id), need = findNeed(id), open = findAvailable(id), known = findEver(id);
  const canSwap = open && spareTotal(id) >= CONFIG.finds.swapCost;
  return `<div class="find-card${known ? ' got' : ''}">
    <div class="find-ic">${known ? iconHtml(f.bild, f.icon, 'big') : '<span class="ic emoji big">❓</span>'}</div>
    <b>${known ? esc(f.name) : '???'}</b>
    ${open || known ? `<em>${need > 0 ? `${have} / ${need}` : have ? `${have} übrig` : '✔ verbaut'}</em>` : ''}
    <small>${esc(f.hint)}</small>
    ${canSwap ? `<button class="btn small" onclick="doSwapFind('${id}')">Eintauschen</button>` : ''}
  </div>`;
}

function chestHtml() {
  const top = [];
  if (state.basket.length) top.push(`<div class="quest-card done"><div class="q-medal"><span class="ic emoji big">🧺</span></div><div class="q-main">
      <b>Der Fundkorb ist voll</b><small>Während du weg warst, hat der Stamm ${state.basket.length === 1 ? 'etwas' : `${state.basket.length} Dinge`} gefunden.</small></div>
      <button class="btn primary" onclick="doClaimBasket()">Ansehen</button></div>`);
  state.spots.forEach((s, i) => {
    const st = SPOT_STYLE[s.kind];
    top.push(`<div class="quest-card"><div class="q-medal"><span class="ic emoji big">${st.icon}</span></div><div class="q-main"><b>${esc(st.name)}</b><small>Liegt auf der Karte und wartet, bis du sie antippst.</small></div>
      <button class="btn" onclick="goToSpot(${i})">Hinschauen</button></div>`);
  });
  const spare = spareTotal();
  if (spare) top.push(`<p class="hint">Doppelte Stücke: ${spare}. ${CONFIG.finds.swapCost} davon tauscht der Älteste gegen ein Stück deiner Wahl.</p>`);
  const pages = FIND_PAGES.map(p => {
    const ids = Object.keys(FINDS).filter(id => FINDS[id].page === p.id), got = ids.filter(findEver).length;
    return `<h3 class="find-page">${esc(p.name)} <small>${got} von ${ids.length}</small></h3>${wonderAlbumHtml(p.id)}<div class="find-grid">${ids.map(findCardHtml).join('')}</div>`;
  }).join('');
  return `<div class="quests">${top.join('')}</div>${pages}`;
}

function openChest() {
  closeInfo();
  openPage('💎 Schatzkiste', chestHtml(), 'chest');
}

function refreshChest() { if (pageOpen === 'chest') $('page-body').innerHTML = chestHtml(); }

function doClaimBasket() {
  const list = claimBasket();
  if (list.length) { toast('🧺 ' + list.map(id => `${FINDS[id].icon} ${FINDS[id].name}`).join(', ')); playSound('muenze'); }
  refreshChest();
  renderAll();
}

function doSwapFind(id) {
  if (swapFinds(id)) playSound('muenze');
  refreshChest();
  renderAll();
}

function goToSpot(i) {
  const s = state.spots[i];
  if (!s) return;
  closePage();
  centerOnTile(s.x, s.y);
}

// Der Älteste erklärt es einmal
function checkFindHint() {
  if (elderHint || tutorialStep() || state.playTime - lastHintAt < HINT_PAUSE_S) return;
  const seen = (state.seen ||= {});
  let text = null;
  if (!seen.fund && state.spots.some(s => !SPOT_STYLE[s.kind].special)) {
    seen.fund = true;
    text = 'Sieh mal, da glitzert etwas! Tippe es an, dann holt es jemand. Was wir finden, liegt in der Schatzkiste.';
  } else if (!seen.erzader && state.spots.some(s => s.kind === 'erz')) {
    seen.erzader = true;
    text = 'Dort glitzert es golden: eine Erzader! Tippe sie an, dann bringt ein Bergmann Kupfererz.';
  } else if (!seen.findling && state.spots.some(s => s.kind === 'findling')) {
    seen.findling = true;
    text = 'Ein Riesenfindling liegt bereit! Tippe ihn an, dann rollen ihn acht Leute zum Steinkreis.';
  } else if (!seen.glut && state.spots.some(s => s.kind === 'glut')) {
    seen.glut = true;
    text = 'Nachts glimmt das Feuer. Tippe die Glut an, daraus machen wir Holzkohle-Stifte.';
  }
  if (!text) return;
  lastHintAt = state.playTime;
  elderHint = text;
  renderTutorial();
}

on('findGained', id => {
  if (typeof gameRunning === 'undefined' || !gameRunning || offlineRunning) return;
  toast(`${FINDS[id].icon} Gefunden: ${FINDS[id].name}!`);
  playSound('muenze');
  refreshChest();
  renderAll();
});
on('oreDone', reward => { if (typeof gameRunning !== 'undefined' && gameRunning && !offlineRunning) toast(`⛏️ Der Bergmann ist zurück: +${formatAmounts(reward)}`); });
on('spotAppeared', () => { if (typeof gameRunning !== 'undefined' && gameRunning && !offlineRunning) { refreshChest(); renderAll(); } });
