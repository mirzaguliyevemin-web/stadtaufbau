// Automatische Tests:  node tools/test.mjs          (alles, inkl. 90-Minuten-Bot, ca. 4 min)
//                       node tools/test.mjs --quick  (ohne Bot, wenige Sekunden)
// Beendet sich mit Code 1, wenn ein Test fehlschlägt – dann NICHT hochladen.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './headless.mjs';
import { runBot } from './bot.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quick = process.argv.includes('--quick');
const results = [];

function test(name, fn) {
  try {
    const detail = fn();
    results.push({ name, ok: true, detail });
  } catch (e) {
    results.push({ name, ok: false, detail: e.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Spiel laden und prüfen, dass dabei keine Fehler auftreten
function fresh(options) {
  const game = loadGame(options);
  assert(game.errors.length === 0, 'Fehler beim Start: ' + game.errors.join(' | '));
  return game;
}

function noErrors(game, where) {
  assert(game.errors.length === 0, `Fehler ${where}: ` + game.errors.join(' | ').slice(0, 600));
}

// ---------------------------------------------------------------------------------------------

test('Versionsnummer an allen drei Stellen gleich', () => {
  const js = fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8').match(/const APP_VERSION = (\d+);/)?.[1];
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/name="app-version" content="(\d+)"/)?.[1];
  const sw = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8').match(/stadtaufbau-v(\d+)/)?.[1];
  assert(js && js === html && js === sw, `game.js ${js}, index.html ${html}, service-worker.js ${sw}`);
  return `Version ${js}`;
});

test('Spiel startet ohne Fehler', () => {
  const game = fresh({ seed: 1 });
  const info = game.run('`${N}×${N}, Geld ${state.resources.money}, ${Object.keys(BUILDINGS).length} Gebäudearten`');
  return info;
});

test('Bauen, Ausbauen, Drehen, Verschieben, Abriss', () => {
  const game = fresh({ seed: 2 });
  const r = game.run(`
    Object.assign(state.resources, { money: 9999, wood: 900, stone: 900, planks: 50, bricks: 50 });
    stats.storage = 2000; state.maxLevel = 2;
    for (let x = 24; x < 40; x++) placeBuilding(x, 32, 'road');
    const okFarm = placeBuilding(26, 30, 'farm');
    const okHouse = placeBuilding(30, 31, 'house');
    placeBuilding(32, 31, 'market'); rotateBuilding(31 * N + 32);
    upgradeBuilding(30, 31); upgradeBuilding(30, 31);
    startMove(31 * N + 30); moveBuildingTo(34, 31);
    demolish(26, 30);
    ({ okFarm, okHouse, farmGone: anchorAt(26, 30) === -1 && anchorAt(27, 31) === -1,
       houseMoved: getCell(34, 31)?.type === 'house', houseLevel: levelOf(getCell(34, 31)),
       marketSize: sizeOf(getCell(32, 31) || getCell(32, 30)).join('x') })
  `);
  noErrors(game, 'beim Bauen');
  assert(r.okFarm && r.okHouse, 'Bauen fehlgeschlagen');
  assert(r.farmGone, 'Abriss hat die Fläche nicht freigegeben');
  assert(r.houseMoved && r.houseLevel === 3, `Verschieben/Ausbau: ${JSON.stringify(r)}`);
  assert(r.marketSize === '1x2', 'Drehen: Markt ist ' + r.marketSize);
  return JSON.stringify(r);
});

test('Zeichnen ohne Fehler (Nacht, Winter, Brand, Banditen, Karren)', () => {
  const game = fresh({ seed: 3 });
  game.run(`
    Object.assign(state.resources, { money: 9999, wood: 900, stone: 900 });
    stats.storage = 2000; state.maxLevel = 1;
    for (let x = 24; x < 40; x++) placeBuilding(x, 32, 'road');
    for (let x = 24; x < 30; x++) placeBuilding(x, 31, 'house');
    placeBuilding(31, 30, 'farm'); placeBuilding(34, 31, 'market'); placeBuilding(36, 31, 'guard');
    for (let x = 24; x < 34; x++) placeBuilding(x, 34, 'wall');
    state.population = 30; recalcStats();
    spawnCamp(); if (state.camps[0]) startRaid(state.camps[0]);
    igniteCell(31 * N + 24);
    getCell(34, 31).cartIn = 0.01;
    for (let i = 0; i < 40; i++) update(0.1);
    state.dayTime = 0.5; state.yearTime = 3 * CONFIG.seasonLength + 10;
    selectBuild('farm'); hoverTile = { x: 30, y: 28 };
    for (let i = 0; i < 5; i++) render(0.016);
    showCategory('demolish'); markForDemolish(24, 31); render(0.016);
    showInfo(31, 30); renderInfo(); showCityInfo(); renderInfo(); showJobsInfo(); renderInfo();
  `);
  noErrors(game, 'beim Zeichnen');
  return 'ok';
});

test('Speichern und Laden erhält die Stadt', () => {
  const a = fresh({ seed: 4 });
  const before = a.run(`
    Object.assign(state.resources, { money: 5000, wood: 500, stone: 500 });
    state.maxLevel = 1;
    for (let x = 24; x < 36; x++) placeBuilding(x, 32, 'road');
    placeBuilding(26, 30, 'farm'); placeBuilding(30, 31, 'house'); upgradeBuilding(30, 31);
    state.cityName = 'Teststadt'; save();
    JSON.stringify({ cells: state.grid.filter(Boolean).length, money: state.resources.money, level: levelOf(getCell(30, 31)) })
  `);
  const b = fresh({ storage: a.storage, seed: 4 });
  const after = b.run(`JSON.stringify({ cells: state.grid.filter(Boolean).length, money: state.resources.money, level: levelOf(getCell(30, 31)) })`);
  const farm = b.run(`sizeOf(getCell(27, 31)).join('x') + ' ' + state.cityName`);
  noErrors(b, 'beim Laden');
  assert(before === after, `vorher ${before}, nachher ${after}`);
  assert(farm === '2x2 Teststadt', 'Farm/Name nach dem Laden: ' + farm);
  return after;
});

test('Alte Spielstände (16×16, 32×32) lassen sich laden', () => {
  for (const gridSize of [undefined, 32]) {
    const save = { v: 1, savedAt: Date.now(), resources: { money: 300, wood: 80 }, population: 4,
      buildings: [{ x: 0, y: 0, type: 'road' }, { x: 1, y: 0, type: 'house' }, { x: 0, y: 1, type: 'farm' }] };
    if (gridSize) save.gridSize = gridSize;
    const game = fresh({ storage: { 'stadtaufbau-save-1': JSON.stringify(save) }, seed: 5 });
    const r = game.run(`JSON.stringify({ cells: state.grid.filter(Boolean).length, farm: sizeOf(state.grid.find(c => c && c.type === 'farm')).join('x') })`);
    noErrors(game, `beim Laden (gridSize ${gridSize || 16})`);
    assert(r === '{"cells":3,"farm":"1x1"}', `gridSize ${gridSize || 16}: ${r}`);
  }
  return 'ok';
});

test('Gelände: Wald, Berge, Seen mit Spielwirkung', () => {
  const game = fresh({ seed: 7 });
  const r = game.run(`
    const count = k => state.terrain.filter(v => v === TERRAIN_ID[k]).length;
    const amounts = { forest: count('forest'), rock: count('rock'), water: count('water') };
    const C = N / 2;
    let centerBlocked = 0;
    for (let y = C - 3; y < C + 3; y++) for (let x = C - 3; x < C + 3; x++) if (terrainBlocked(x, y)) centerBlocked++;
    Object.assign(state.resources, { money: 9999, wood: 50, stone: 900 });
    // Bauen auf Berg verboten
    state.plots.fill(true);
    const rock = state.terrain.indexOf(TERRAIN_ID.rock);
    const onRock = placeBuilding(rock % N, Math.floor(rock / N), 'road');
    // Bauen auf Wald rodet und bringt Holz
    const forest = state.terrain.indexOf(TERRAIN_ID.forest);
    const woodBefore = state.resources.wood;
    const onForest = placeBuilding(forest % N, Math.floor(forest / N), 'road');
    const cleared = state.terrain[forest] === TERRAIN_ID.grass;
    // Bonus: Sägewerk mitten im Wald
    state.terrain.fill(TERRAIN_ID.grass);
    state.terrain.fill(TERRAIN_ID.forest, 0, 5 * N);
    const bonus = terrainBonusOf('sawmill', 2, 2, 2, 1);
    const farmBonus = terrainBonusOf('farm', 2, 2, 2, 2);
    JSON.stringify({ forest: amounts.forest > 300, rock: amounts.rock > 80, water: amounts.water > 40, amounts,
      centerBlocked, onRock, onForest, cleared, woodGain: state.resources.wood - woodBefore, bonus, farmBonus })
  `);
  noErrors(game, 'beim Gelände');
  const o = JSON.parse(r);
  assert(o.forest && o.rock && o.water, 'zu wenig Gelände: ' + r);
  assert(o.centerBlocked === 0, 'Mitte des Startgebiets ist nicht frei: ' + r);
  assert(o.onRock === false && o.onForest === true && o.cleared && o.woodGain === 2, 'Bauregeln: ' + r);
  assert(o.bonus === 0.5 && o.farmBonus === 0, 'Bonus: ' + r);
  // Gelände bleibt beim Speichern erhalten; alter Spielstand bekommt Gelände nur auf fremdem Land
  const a = fresh({ seed: 8 });
  const t1 = a.run('save(); encodeTerrain()');
  const b = fresh({ storage: a.storage, seed: 99 });
  assert(b.run('encodeTerrain()') === t1, 'Gelände nach dem Laden verändert');
  const old = { v: 1, savedAt: Date.now(), gridSize: 64, resources: { money: 300 }, population: 0, plots: [27, 28, 35, 36], buildings: [] };
  const c = fresh({ storage: { 'stadtaufbau-save-1': JSON.stringify(old) }, seed: 9 });
  const oldInfo = c.run(`JSON.stringify({ owned: state.terrain.filter((v, i) => v && isOwned(i % N, Math.floor(i / N))).length, wild: state.terrain.filter(Boolean).length })`);
  noErrors(c, 'beim alten Spielstand');
  assert(JSON.parse(oldInfo).owned === 0 && JSON.parse(oldInfo).wild > 300, 'alter Spielstand: ' + oldInfo);
  return `Wald ${o.amounts.forest}, Berg ${o.amounts.rock}, Wasser ${o.amounts.water} Felder`;
});

test('Meldungen schließen sich selbst', () => {
  const game = fresh({ seed: 6 });
  const r = game.run(`
    let got = 0;
    popupQueue.length = 0; eventEl.classList.add('hidden');   // Start-Meldungen (Tagesbelohnung) wegräumen
    showEventPopup('🌵', 'Dürre', 'a');
    showEventPopup('🎁', 'Belohnung', 'b', [{ label: 'Abholen', primary: true, action: () => { got++; } }]);
    const first = document.getElementById('event-title').textContent;
    const queued = popupQueue.length;
    closeEventPopup();
    const second = document.getElementById('event-title').textContent;
    const auto = autoChoice([{ label: 'Ablehnen' }, { label: 'Annehmen', primary: true, action() {} }]).label;
    autoChoice([{ label: 'Abholen', action: () => { got++; } }]).action();
    JSON.stringify({ first, queued, second, auto, got, timer: !document.getElementById('event-timer').classList.contains('hidden') })
  `);
  noErrors(game, 'bei Meldungen');
  assert(r === '{"first":"Dürre","queued":1,"second":"Belohnung","auto":"Ablehnen","got":1,"timer":true}', r);
  return 'ok';
});

if (!quick) {
  test('Bot spielt 90 Minuten: Tempo und keine Dauerprobleme', () => {
    const { report, errors } = runBot(90, 1);
    assert(errors.length === 0, 'Fehler im Bot-Lauf: ' + errors.join(' | ').slice(0, 600));
    assert(report, 'kein Bericht');
    const m = report.milestones, p = report.problems;
    assert(m.pop21 !== null && m.pop21 <= 8, `Kleinstadt zu spät: ${m.pop21} min (Ziel ≤ 8)`);
    assert(m.pop101 !== null && m.pop101 <= 45, `Stadt zu spät: ${m.pop101} min (Ziel ≤ 45)`);
    assert(m.pop50 !== null && m.pop50 >= 6, `50 Einwohner verdächtig früh: ${m.pop50} min (Ziel ≥ 6)`);
    assert(p.starvingMin <= 5, `zu lange Hunger: ${p.starvingMin} min`);
    assert(p.freezingMin <= 3, `zu lange Frost: ${p.freezingMin} min`);
    return `Kleinstadt ${m.pop21} · 50 Einw. ${m.pop50} · Stadt ${m.pop101} min · Kathedrale ${report.landmarks.cathedral || '–'} · ${report.seconds} s`;
  });
}

// ---------------------------------------------------------------------------------------------

let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ' – ' + r.detail : ''}`);
  if (!r.ok) failed++;
}
console.log(failed ? `\n${failed} Test(s) fehlgeschlagen – nicht hochladen!` : `\nAlle ${results.length} Tests bestanden.`);
process.exit(failed ? 1 : 0);
