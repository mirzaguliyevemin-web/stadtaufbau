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

// Spiel laden und prüfen, dass dabei keine Fehler auftreten.
// Gebaut wird in den Tests sofort (ohne Bauzeit), außer mit { buildTimes: true }; Zeitalter: { age }.
function fresh(options = {}) {
  const game = loadGame(options);
  assert(game.errors.length === 0, 'Fehler beim Start: ' + game.errors.join(' | '));
  if (!options.buildTimes) game.run('CONFIG.buildTimeBase = 0; CONFIG.buildTimePerValue = 0;');
  // Neue Spiele beginnen in der Steinzeit; die meisten Tests prüfen Gebäude aus dem Mittelalter
  if (!options.storage) game.run(`state.age = ${options.age ?? 2}; showCategory(currentCategory);`);
  return game;
}

// Testgebiet: Felder 16–47 gehören der Stadt und sind Wiese (unabhängig von der Kartengröße)
const PREP = `
  for (let y = 16; y < 48; y++) for (let x = 16; x < 48; x++) { state.plots[plotOf(x, y)] = true; state.terrain[y * N + x] = TERRAIN_ID.grass; }
`;

// Aufbruch ins nächste Zeitalter erzwingen: alles erforschen, fehlende Pflichtgebäude in Reihe `row` bauen, Aufbruch abwarten
const AGE_UP = `
  const ageUpNow = (row) => {
    for (const id of ageRequiredTechs()) if (!state.techs.includes(id)) state.techs.push(id);
    for (let xx = 16; xx < 48; xx++) placeBuilding(xx, row, 'road');
    let x = 16;
    for (const t of ageRequiredBuildings()) if (!countFinished(t)) { placeBuilding(x, row + 1, t); x += footprintSize(t)[0]; }
    advanceAge();
    for (let i = 0; i < 2000 && state.ageUp; i++) updateAgeUp(0.5);
  };
`;

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
  const r = game.run(`${PREP}
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
  game.run(`${PREP}
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
    handleTap((26 + 0.5) * T * view.zoom + view.x, (27 + 0.5) * T * view.zoom + view.y);   // Vorschau hinstellen
    render(0.016); renderPlaceBar(); confirmPending();
    CONFIG.buildTimeBase = 10; placeBuilding(40, 30, 'farm'); render(0.016); showInfo(40, 30); renderInfo();
    showCategory('demolish'); markForDemolish(24, 31); render(0.016);
    showInfo(31, 30); renderInfo(); showCityInfo(); renderInfo(); showJobsInfo(); renderInfo();
  `);
  noErrors(game, 'beim Zeichnen');
  return 'ok';
});

test('Speichern und Laden erhält die Stadt', () => {
  const a = fresh({ seed: 4 });
  const before = a.run(`${PREP}
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

test('Alte Spielstände (16×16, 32×32, 64×64) lassen sich laden', () => {
  for (const gridSize of [undefined, 32]) {
    const save = { v: 1, savedAt: Date.now(), resources: { money: 300, wood: 80 }, population: 4,
      buildings: [{ x: 0, y: 0, type: 'road' }, { x: 1, y: 0, type: 'house' }, { x: 0, y: 1, type: 'farm' }] };
    if (gridSize) save.gridSize = gridSize;
    const game = fresh({ storage: { 'stadtaufbau-save-1': JSON.stringify(save) }, seed: 5 });
    const r = game.run(`JSON.stringify({ cells: state.grid.filter(Boolean).length, farm: sizeOf(state.grid.find(c => c && c.type === 'farm')).join('x') })`);
    noErrors(game, `beim Laden (gridSize ${gridSize || 16})`);
    assert(r === '{"cells":3,"farm":"1x1"}', `gridSize ${gridSize || 16}: ${r}`);
  }
  // 64×64 (bis Version 42): Stadt, gekauftes Land, Gelände und Lager landen in der Mitte der größeren Karte
  const terrain = Array.from({ length: 64 * 64 }, (_, i) => (i % 7 === 0 ? '1' : '0')).join('');
  const save64 = { v: 1, savedAt: Date.now(), gridSize: 64, resources: { money: 300 }, population: 0, terrain,
    plots: [27, 28, 29, 35, 36], plotsGranted: 0, camps: [{ x: 60, y: 5, strength: 5, raidIn: 100 }],
    buildings: [{ x: 30, y: 31, type: 'road' }, { x: 30, y: 30, type: 'house' }] };
  const g = fresh({ storage: { 'stadtaufbau-save-1': JSON.stringify(save64) }, seed: 15 });
  const r = g.run(`const O = (N - 64) / 2; JSON.stringify({
    house: getCell(30 + O, 30 + O)?.type, bought: plotsBought(), owned: state.plots.filter(Boolean).length,
    plot29: state.plots[(3 + O / 8) * P + 5 + O / 8],
    terrain: [0, 7, 100, 4095].every(i => state.terrain[(Math.floor(i / 64) + O) * N + i % 64 + O] === (i % 7 === 0 ? 1 : 0)),
    camp: state.camps[0] && state.camps[0].x === 60 + O })`);
  noErrors(g, 'beim Laden (64×64)');
  assert(r === '{"house":"house","bought":1,"owned":5,"plot29":true,"terrain":true,"camp":true}', '64×64: ' + r);
  // Stände von vor den Zeitaltern stehen im Mittelalter, ohne Steinzeit-Aufträge
  const age = g.run(`JSON.stringify({ age: state.age, quest: activeQuests()[0]?.id, farm: isUnlocked('farm') })`);
  assert(age === '{"age":2,"quest":"roads","farm":true}', 'Zeitalter alter Stand: ' + age);
  return 'ok';
});

test('Bauzeit und höchstens 2 Baustellen', () => {
  const game = fresh({ seed: 16, buildTimes: true });
  const r = game.run(`${PREP}
    Object.assign(state.resources, { money: 9999, wood: 900, stone: 900 });
    for (let x = 24; x < 40; x++) placeBuilding(x, 32, 'road');
    const roads = getCell(30, 32)?.build === undefined;
    const a = placeBuilding(24, 31, 'house'), b = placeBuilding(25, 31, 'house'), c = placeBuilding(26, 31, 'house');
    const site = constructionCount(), activeEarly = isActive(24, 31), time = buildTimeOf('house');
    save();
    for (let i = 0; i < time * 4 + 4; i++) update(0.25);
    const done = !getCell(24, 31).build && isActive(24, 31);
    const third = placeBuilding(26, 31, 'house');
    JSON.stringify({ roads, a, b, c, site, activeEarly, done, third, time })
  `);
  noErrors(game, 'bei Baustellen');
  const o = JSON.parse(r);
  assert(o.roads && o.a && o.b && o.c === false && o.site === 2 && !o.activeEarly, 'Limit: ' + r);
  assert(o.done && o.third && o.time >= 5, 'Fertigstellung: ' + r);
  // Baustelle bleibt beim Speichern erhalten
  const b = fresh({ storage: game.storage, seed: 16, buildTimes: true });
  const after = b.run(`JSON.stringify({ build: !!getCell(24, 31)?.build, n: constructionCount() })`);
  assert(after === '{"build":true,"n":2}', 'nach dem Laden: ' + after);
  return `Haus ${o.time} s`;
});

test('Zeitalter: Steinzeit, Aufstieg, Speichern', () => {
  const game = fresh({ seed: 17, age: 0 });
  const r = game.run(`${PREP}
    const before = { house: isUnlocked('house'), hut: isUnlocked('hut'), road: JSON.stringify(costOf('road')),
      money: isResourceVisible('money'), plot: Object.keys(plotPrice()).join(), quest: activeQuests()[0].id,
      tabs: categoryTypes('housing').join() };
    const huts = [24, 25, 26].map(x => placeBuilding(x, 31, 'hut'));
    Object.assign(state.resources, { wood: 100, stone: 100 });
    const stoneBuilt = ['gatherer', 'hunter', 'woodcutter', 'stonecutter', 'fireplace'].map((t, k) => placeBuilding(30 + k, 31, t));
    state.population = 9; recalcStats(); render(0.016); showInfo(30, 31); showResourceInfo('food');
    state.resources.wood = 0;
    for (let x = 24; x < 30; x++) placeBuilding(x, 32, 'road');
    advanceAge(); const tooEarly = state.age;
    state.resources.wood = 20; placeBuilding(35, 31, 'watertrough');
    state.population = 30; Object.assign(state.resources, { wood: 100, stone: 80, food: 100 });
    const stoneTech = techStatus('stonetools'), laterTech = techStatus('irrigation'), trough = isUnlocked('watertrough');
    const notYet = canAdvanceAge();   // Höhlenmaler und Forschung fehlen noch
    state.techs.push(...ageRequiredTechs()); state.resources.wood = 100; placeBuilding(36, 31, 'painter');
    Object.assign(state.resources, { wood: 100, stone: 80, food: 100 });
    const ready = canAdvanceAge(); advanceAge();
    const during = state.age;
    for (let i = 0; i < 400 && state.ageUp; i++) updateAgeUp(0.5);
    const evolved = getCell(35, 31)?.type, troughGone = !isUnlocked('watertrough') && !categoryTypes('defense').includes('watertrough');
    const after = { age: state.age, house: isUnlocked('house'), money: isResourceVisible('money'), road: JSON.stringify(costOf('road')),
      food: state.resources.food, quest: questProgress(QUESTS.find(q => q.id === 'ageAntiquity')).done };
    showAges(); updateAgesUI(); render(0.016); save();
    state.age = 0; before.daily = JSON.stringify(dailyRewardFor(1)); state.age = 1;
    JSON.stringify({ before, huts, stoneBuilt, tooEarly, notYet, ready, during, after, stoneTech, laterTech, trough, evolved, troughGone })
  `);
  noErrors(game, 'bei den Zeitaltern');
  const o = JSON.parse(r);
  assert(!o.before.house && o.before.hut && o.before.road === '{"wood":1}' && !o.before.money, 'Steinzeit: ' + r);
  assert(o.before.daily === '{"wood":25,"food":25}', 'Tägliche Belohnung in der Steinzeit: ' + r);
  assert(o.before.plot === 'wood,food' && o.before.quest === 'paths' && !o.before.tabs.includes('farm'), 'Steinzeit: ' + r);
  assert(o.huts.every(Boolean) && o.stoneBuilt.every(Boolean) && o.tooEarly === 0 && !o.notYet && o.ready && o.during === 0, 'Aufstieg: ' + r);
  assert(o.after.age === 1 && o.after.house && o.after.money && o.after.road === '{"money":5}' && o.after.food === 0 && o.after.quest, 'Antike: ' + r);
  assert(o.stoneTech === 'available' && o.laterTech === 'later' && o.trough, 'Steinzeit-Forschung/Wassertrog: ' + r);
  assert(o.evolved === 'firestation' && o.troughGone, 'Wassertrog → Feuerwache: ' + r);
  const b = fresh({ storage: game.storage, seed: 17 });
  assert(b.run('state.age') === 1, 'Zeitalter nach dem Laden: ' + b.run('state.age'));
  return 'Steinzeit → Antike';
});

test('Offline: Forschung fertig → Aufbruch läuft weiter und endet beim Zurückkommen', () => {
  const game = fresh({ seed: 5, age: 1 });
  const r = game.run(`${PREP}${AGE_UP}
    const last = ageRequiredTechs().at(-1);
    state.techs = state.techs.filter(id => id !== last);
    for (const id of ageRequiredTechs()) if (id !== last && !state.techs.includes(id)) state.techs.push(id);
    for (const id of Object.keys(RESOURCES)) state.resources[id] = 5000;
    for (let xx = 16; xx < 48; xx++) placeBuilding(xx, 30, 'road');
    let x = 16;
    for (const t of ageRequiredBuildings()) if (!countFinished(t)) { placeBuilding(x, 31, t); x += footprintSize(t)[0]; }
    for (const id of Object.keys(RESOURCES)) state.resources[id] = 0;
    state.population = nextAge().need.population; recalcStats();
    const placed = !ageChecklist().buildingsMissing.length;
    for (const [id, n] of Object.entries(nextAge().cost)) state.resources[id] = n * 3;
    state.research = { id: last, left: 30 };
    const notYet = canAdvanceAge();
    applyOfflineProgress(Date.now() - 2 * 3600 * 1000);
    const away = { techDone: state.techs.includes(last), running: !!state.ageUp, done: state.ageUp?.done, age: state.age,
      text: popupQueue.map(p => p[2]).join(' ') + document.getElementById('event-text').textContent };
    for (let i = 0; i < 3 && state.ageUp; i++) { updateAgeUp(0.016); }
    const after = state.age;
    JSON.stringify({ placed, notYet, away, after })
  `);
  noErrors(game, 'beim Offline-Aufbruch');
  const o = JSON.parse(r);
  assert(o.placed && !o.notYet && o.away.techDone && o.away.running && o.away.age === 1, 'Offline-Forschung/Aufbruch: ' + r);
  assert(o.away.text.includes('Aufbruch') && o.away.text.includes('geschafft'), 'Meldung: ' + r);
  assert(o.after === 2, 'Zeitalter nach dem ersten Takt: ' + r);
  return 'Antike → Mittelalter offline';
});

test('Industrie und Moderne: Aufstieg und Produktionsketten', () => {
  const game = fresh({ seed: 18, age: 2 });
  const r = game.run(`${PREP}${AGE_UP}
    for (let y = 20; y < 23; y++) for (let x = 30; x < 33; x++) state.terrain[y * N + x] = TERRAIN_ID.rock;
    stats.storage = 100000; state.maxLevel = 2;
    const rich = () => { for (const id in RESOURCES) state.resources[id] = 30000; };
    rich(); state.population = 400;
    ageUpNow(40); const industry = state.age;
    rich();
    for (let x = 24; x < 46; x++) placeBuilding(x, 25, 'road');
    const coal = placeBuilding(31, 23, 'mine') && placeBuilding(30, 23, 'coalmine');
    placeBuilding(31, 24, 'road'); placeBuilding(30, 24, 'road');
    const built3 = ['steelworks', 'factory', 'tenement', 'station', 'police'].map((t, k) => placeBuilding(24 + k * 3, 26, t));
    rich(); ageUpNow(43); const modern = state.age;
    rich();
    for (let x = 24; x < 46; x++) placeBuilding(x, 28, 'road');
    const built4 = ['powerplant', 'concreteworks', 'electronicsworks', 'highrise', 'supermarket', 'university'].map((t, k) => placeBuilding(24 + k * 3, 29, t));
    for (const id in RESOURCES) state.resources[id] = Math.min(state.resources[id], 50);
    state.population = 400; recalcStats();
    for (let i = 0; i < 400; i++) update(0.25);
    render(0.016); showAges(); updateAgesUI();
    const ageList = document.getElementById('age-list').innerHTML.length;
    JSON.stringify({ ageList, industry, modern, coal, built3, built4, steel: state.produced.steel > 0, goods: state.produced.goods > 0,
      power: state.produced.power > 0, concrete: state.produced.concrete > 0, electronics: state.produced.electronics > 0 })
  `);
  noErrors(game, 'bei Industrie/Moderne');
  const o = JSON.parse(r);
  assert(o.industry === 3 && o.modern === 4 && o.coal, 'Aufstieg: ' + r);
  assert(o.ageList > 0, 'Zeitalter-Übersicht im höchsten Zeitalter ist leer: ' + r);
  assert(o.built3.every(Boolean) && o.built4.every(Boolean), 'Bauen: ' + r);
  assert(o.steel && o.goods && o.power && o.concrete && o.electronics, 'Produktion: ' + r);
  return 'Kohle → Stahl → Fabrikwaren, Strom → Beton/Elektronik';
});

test('Sägewerk braucht Holz, Gebäude weiterentwickeln', () => {
  const game = fresh({ seed: 21, age: 1 });
  const r = game.run(`${PREP}
    Object.assign(state.resources, { money: 999, wood: 0, stone: 99, food: 99 });
    for (let x = 20; x < 40; x++) placeBuilding(x, 30, 'road');
    state.resources.wood = 99;
    placeBuilding(20, 31, 'house'); placeBuilding(21, 31, 'house'); placeBuilding(22, 31, 'house');
    placeBuilding(24, 31, 'sawmill');
    state.population = 12; recalcStats();
    state.resources.wood = 0;
    for (let i = 0; i < 80; i++) update(0.25);
    const idle = { planks: state.resources.planks, waiting: getCell(24, 31).waiting };
    state.resources.wood = 60;
    for (let i = 0; i < 80; i++) update(0.25);
    const working = { planks: state.resources.planks, wood: state.resources.wood };
    // Hütte → Haus: erst ab der Antike; Abbrechen stellt die Hütte wieder her
    state.age = 0; state.resources.wood = 99;
    placeBuilding(26, 31, 'hut');
    const lockedInStone = developProblem(31 * N + 26);
    state.age = 1;
    const woodBefore = state.resources.wood;
    const started = developBuilding(26, 31);
    const during = getCell(26, 31).type, paid = woodBefore - state.resources.wood;
    demolish(26, 31);
    const cancelled = { type: getCell(26, 31)?.type, wood: state.resources.wood === woodBefore };
    developBuilding(26, 31);
    for (let i = 0; i < 20; i++) update(0.25);
    const done = { type: getCell(26, 31).type, build: !!getCell(26, 31).build };
    // Sammlerin → Farm wächst auf 2×2
    placeBuilding(28, 31, 'gatherer');
    Object.assign(state.resources, { money: 999, wood: 99 });
    const farm = developBuilding(28, 31);
    for (let i = 0; i < 40; i++) update(0.25);
    const big = sizeOf(getCell(29, 32) || {}).join('×');
    // Ausbaustufe geht nicht gratis aufs neue Gebäude über; Drehen gesperrt; Abriss-Modus bricht nur ab
    state.age = 3; state.maxLevel = 2; Object.assign(state.resources, { money: 9999, wood: 999, stone: 999, planks: 999, bricks: 999 });
    placeBuilding(30, 31, 'house'); getCell(30, 31).level = 3;
    state.population = 14; recalcStats();
    const capBefore = stats.capacity;
    developBuilding(30, 31);
    recalcStats();
    const keepsPeople = stats.capacity === capBefore;
    const levelReset = !getCell(30, 31).level;
    demolishSelection.add(31 * N + 30); sellSelection();
    const restored = { type: getCell(30, 31)?.type, level: getCell(30, 31)?.level };
    // Sägewerk ohne Arbeiter verbraucht nichts
    state.population = 0; recalcStats(); state.resources.wood = 50;
    for (let i = 0; i < 80; i++) update(0.25);
    const idleNoStaff = state.resources.wood >= 50 - 1e-9 || state.season === 'winter';
    showInfo(26, 31); save();
    JSON.stringify({ idle, working, lockedInStone, started, during, paid, cancelled, done, farm, big, keepsPeople, levelReset, restored, idleNoStaff })
  `);
  noErrors(game, 'beim Sägewerk/Weiterentwickeln');
  const o = JSON.parse(r);
  assert(o.idle.planks === 0 && o.idle.waiting === 'input', 'Sägewerk ohne Holz: ' + r);
  assert(o.working.planks > 0 && o.working.wood < 60, 'Sägewerk mit Holz: ' + r);
  assert(o.lockedInStone.includes('🔒') && o.started && o.during === 'house' && o.paid > 0, 'Weiterentwickeln: ' + r);
  assert(o.cancelled.type === 'hut' && o.cancelled.wood, 'Abbrechen: ' + r);
  assert(o.done.type === 'house' && !o.done.build && o.farm && o.big === '2×2', 'Fertig: ' + r);
  assert(o.levelReset && o.restored.type === 'house' && o.restored.level === 3, 'Ausbaustufe beim Weiterentwickeln: ' + r);
  assert(o.keepsPeople, 'Bewohner bleiben während des Weiterentwickelns: ' + r);
  assert(o.idleNoStaff, 'Sägewerk ohne Arbeiter verbraucht Holz: ' + r);
  return 'Holz → Bretter, Hütte → Haus, Sammlerin → Farm';
});

test('Mauer hält Banditen auf, Tor lässt Straßen durch', () => {
  const game = fresh({ seed: 22, age: 1 });
  const r = game.run(`${PREP}
    state.maxLevel = 1;
    Object.assign(state.resources, { money: 9999, wood: 999, stone: 999, food: 999 });
    stats.storage = 99999;
    for (let y = 27; y < 40; y++) placeBuilding(30, y, 'road');
    placeBuilding(31, 32, 'house');
    for (let x = 16; x < 48; x++) placeBuilding(x, 26, 'wall');
    const gateMade = placeBuilding(30, 26, 'road') && getCell(30, 26).type === 'gate';
    placeBuilding(30, 25, 'road');
    const gateIsRoad = hasRoadAccess(31, 32) && BUILDINGS.gate.isRoad;
    // Banditen von Norden: ohne Wachen bricht die Mauer
    state.camps.push({ x: 35, y: 8, strength: 30, raidIn: 9999 });
    startRaid(state.camps[0]);
    let sieged = false, minHp = 99;
    for (let i = 0; i < 600 && raids.length; i++) {
      updateRaids(0.25);
      if (raids[0]?.siege >= 0) { sieged = true; minHp = Math.min(minHp, getCell(raids[0].siege % N, Math.floor(raids[0].siege / N))?.hp ?? 99); }
    }
    const broken = [...Array(32)].some((_, k) => getCell(16 + k, 26) === null);
    // Mit Wachhaus an der Mauer werden sie dort abgewehrt
    for (let x = 16; x < 48; x++) if (getCell(x, 26) === null) placeBuilding(x, 26, 'wall');
    state.grid.forEach(c => { if (c) delete c.hp; });
    placeBuilding(34, 27, 'guard'); placeBuilding(35, 27, 'road'); placeBuilding(33, 27, 'house'); placeBuilding(33, 28, 'house');
    state.population = 20; recalcStats();
    const repelledBefore = state.counters.repelled || 0;
    state.camps[0].strength = 12;
    startRaid(state.camps[0]);
    for (let i = 0; i < 600 && raids.length; i++) updateRaids(0.25);
    const wallIntact = [...Array(32)].every((_, k) => getCell(16 + k, 26) !== null);
    // Straße an der Mauer entlang ziehen baut keine Tore, quer darüber genau eins
    selectedType = 'road';
    const gates = () => state.grid.filter(c => c && c.type === 'gate').length;
    const g0 = gates();
    paint = { last: { x: 17, y: 26 }, started: true }; paintTo({ x: 26, y: 26 });
    const along = gates() - g0;
    paint = { last: { x: 42, y: 23 }, started: true }; paintTo({ x: 42, y: 29 });
    const across = gates() - g0;
    paint = null; selectedType = null;
    // Großer Zeitschritt: Banditen springen nicht über die Mauer
    state.camps[0].strength = 40;
    startRaid(state.camps[0]);
    let jumped = false;
    for (let i = 0; i < 40 && raids.length; i++) { updateRaids(1.5); if (raids[0] && raids[0].y > 26.5 && raids[0].siege < 0 && !raids[0].broke) jumped = jumped || [...Array(32)].every((_, k) => getCell(16 + k, 26) !== null); }
    render(0.016); save();
    JSON.stringify({ gateMade, gateIsRoad, sieged, minHp: Math.round(minHp), broken, repelled: (state.counters.repelled || 0) - repelledBefore, wallIntact, along, across, jumped })
  `);
  noErrors(game, 'bei der Mauer');
  const o = JSON.parse(r);
  assert(o.gateMade && o.gateIsRoad, 'Tor: ' + r);
  assert(o.sieged && o.broken, 'Mauer wird zuerst angegriffen und bricht: ' + r);
  assert(o.repelled === 1 && o.wallIntact, 'Wachen wehren an der Mauer ab: ' + r);
  assert(o.along === 0 && o.across === 1, 'Tore beim Ziehen: ' + r);
  assert(!o.jumped, 'Banditen springen bei großem Zeitschritt über die Mauer: ' + r);
  return 'Mauer bricht ohne Wachen, mit Wachhaus abgewehrt';
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
    // Bonus: Holzfäller mitten im Wald
    state.terrain.fill(TERRAIN_ID.grass);
    state.terrain.fill(TERRAIN_ID.forest, 0, 5 * N);
    const bonus = terrainBonusOf('woodcutter', 2, 2, 1, 1);
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

test('Brücke und Fischerhütte', () => {
  const game = fresh({ seed: 10 });
  const r = game.run(`
    state.plots.fill(true);
    Object.assign(state.resources, { money: 9999, wood: 900, stone: 900 });
    state.terrain.fill(TERRAIN_ID.grass);
    for (let y = 30; y < 34; y++) for (let x = 20; x < 30; x++) state.terrain[y * N + x] = TERRAIN_ID.water;
    for (let y = 26; y < 38; y++) placeBuilding(24, y, 'road');          // Straße quer über den See
    const bridges = [30, 31, 32, 33].filter(y => getCell(24, y)?.type === 'bridge').length;
    const bridgeOnLand = placeBuilding(26, 26, 'bridge');
    const fishFar = placeBuilding(27, 26, 'fishery');                    // zu weit vom Wasser
    const fishOk = placeBuilding(26, 29, 'fishery');
    placeBuilding(26, 28, 'road');
    save();
    JSON.stringify({ bridges, bridgeOnLand, fishFar, fishOk, active: isActive(24, 31) })
  `);
  noErrors(game, 'bei Brücke/Fischerhütte');
  assert(r === '{"bridges":4,"bridgeOnLand":false,"fishFar":false,"fishOk":true,"active":true}', r);
  const b = fresh({ storage: game.storage, seed: 11 });
  const after = b.run(`JSON.stringify({ bridge: getCell(24, 31)?.type, water: terrainAt(24, 31) === TERRAIN_ID.water })`);
  noErrors(b, 'beim Laden mit Brücke');
  assert(after === '{"bridge":"bridge","water":true}', 'nach dem Laden: ' + after);
  return 'ok';
});

test('Ressourcen-Info: Produktion und Verbrauch', () => {
  const game = fresh({ seed: 12 });
  const r = game.run(`
    state.plots.fill(true);
    state.terrain.fill(TERRAIN_ID.grass);
    Object.assign(state.resources, { money: 9999, wood: 900, stone: 900 });
    for (let x = 24; x < 40; x++) placeBuilding(x, 32, 'road');
    placeBuilding(24, 30, 'farm'); placeBuilding(26, 31, 'woodcutter'); placeBuilding(28, 31, 'house'); placeBuilding(29, 31, 'house');
    state.population = 8; recalcStats();
    const texts = {};
    for (const id in RESOURCES) { showResourceInfo(id); texts[id] = document.getElementById('info-text').textContent; }
    const food = resourceFlows('food');
    JSON.stringify({ food: texts.food, wood: texts.wood, eat: food.uses.length, farm: food.sources.length })
  `);
  noErrors(game, 'bei der Ressourcen-Info');
  const o = JSON.parse(r);
  assert(o.eat === 1 && o.farm === 1, 'Nahrung: ' + r);
  assert(o.food.includes('Farm') && o.food.includes('Einwohner essen') && o.wood.includes('Holzfäller'), 'Text: ' + r);
  return o.food.split('\n').slice(0, 2).join(' · ');
});

test('Handwerk: Bier, Stoff, Werkzeug', () => {
  const game = fresh({ seed: 13 });
  const r = game.run(`
    state.plots.fill(true); state.maxLevel = 1;
    state.terrain.fill(TERRAIN_ID.grass);
    for (let y = 20; y < 23; y++) for (let x = 30; x < 33; x++) state.terrain[y * N + x] = TERRAIN_ID.rock;
    Object.assign(state.resources, { money: 9999, wood: 900, stone: 900, planks: 50, bricks: 50, food: 300 });
    stats.storage = 2000;
    for (let x = 24; x < 40; x++) placeBuilding(x, 25, 'road');
    const mineFar = placeBuilding(26, 24, 'mine');
    const mineOk = placeBuilding(31, 23, 'mine');
    placeBuilding(31, 24, 'road'); placeBuilding(30, 24, 'road');
    const ok = ['brewery', 'weaver', 'smithy', 'sheepfarm'].map((t, k) => placeBuilding(24 + k * 3, 26, t));
    for (let x = 24; x < 40; x++) placeBuilding(x, 28, 'road');
    for (let x = 24; x < 40; x++) placeBuilding(x, 29, 'house');
    state.population = 60; recalcStats();
    Object.assign(state.resources, { wool: 50, iron: 50 });
    for (let i = 0; i < 400; i++) update(0.25);
    state.resources.tools = 0;
    const before = buildingOutput('quarry', 1).stone;
    state.resources.tools = 10;
    const withTools = buildingOutput('quarry', 1).stone;
    JSON.stringify({ mineFar, mineOk, ok, beer: state.produced.beer > 0, cloth: state.produced.cloth > 0, tools: state.produced.tools > 0,
      toolBonus: Math.round(withTools / before * 100) / 100, lux: stats.factors.filter(f => /Bier|Kleidung/.test(f[0])).length })
  `);
  noErrors(game, 'beim Handwerk');
  const o = JSON.parse(r);
  assert(o.mineFar === false && o.mineOk === true && o.ok.every(Boolean), 'Bauen: ' + r);
  assert(o.beer && o.cloth && o.tools, 'Produktion: ' + r);
  assert(o.toolBonus > 1.15 && o.toolBonus < 1.25 && o.lux === 2, 'Wirkung: ' + r);
  return 'ok';
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
