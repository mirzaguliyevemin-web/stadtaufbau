// Epochia – Balancing-Bot: spielt die Steinzeit ohne Browser und misst, wie lange die Stufen dauern.
// Aufruf: node neu/tools/bot.mjs [Minuten] [Läufe]   (Ziel laut Plan: Steinzeit in 45–60 Spielminuten)
import { loadGame } from './headless.mjs';
import { fileURLToPath } from 'node:url';

// Der Bot läuft im Spiel selbst (gleiche Funktionen wie die Oberfläche benutzt)
const BOT_CODE = String.raw`
var botReport = { mittelsteinzeit: null, jungsteinzeit: null, kupferfund: null, hungerMin: 0, lowHappyMin: 0, pop: [], built: 0, blocked: {} };

function botCount(type) { return state.buildings.filter(b => b.type === type).length; }
function botLine(line) { return state.buildings.filter(b => BUILDINGS[b.type].line === line).length; }

// Wegeraster wie ein Spieler, der Wege mit einplant: jede 5. Reihe und Spalte bleibt für Trampelpfade frei
function botOnRoadGrid(x, y, s) {
  for (let k = 0; k < s; k++) if ((x + k) % 5 === 0 || (y + k) % 5 === 0) return true;
  return false;
}

// Freien Platz suchen: nur im eigenen Land, nah am Lagerfeuer zuerst. Ergebnis merken, bis sich etwas ändert.
var botSpotCache = {};
function botSpot(type) {
  const key = type + ':' + state.buildings.length + ':' + state.plots.join('') + ':' + state.cleared.length;
  if (key in botSpotCache) return botSpotCache[key];
  const c = Math.floor(N / 2);
  let best = null, bestD = Infinity;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (!isOwned(x, y)) continue;
      const d = Math.abs(x - c) + Math.abs(y - c);
      if (d >= bestD || (!BUILDINGS[type].needsWater && botOnRoadGrid(x, y, BUILDINGS[type].size)) || placeProblem(type, x, y)) continue;
      best = { x, y }; bestD = d;
    }
  return (botSpotCache[key] = best);
}

function botBest(line) {
  const e = barEntries().find(e => !e.locked && BUILDINGS[e.type].line === line);
  return e ? e.type : null;
}

function botTryBuild(type) {
  if (!type) return false;
  if (!canAfford(BUILDINGS[type].cost)) { botReport.blocked[type] = (botReport.blocked[type] || 0) + 1; return false; }
  const spot = botSpot(type);
  if (!spot) {
    // kein Platz: Land dazukaufen
    for (let p = 0; p < state.plots.length; p++) if (canBuyPlot(p) && buyPlot(p)) return false;
    return false;
  }
  if (placeBuilding(type, spot.x, spot.y)) return false;
  botReport.built++;
  botRoads();
  return true;
}

function botUpgradeHousing() {
  for (let i = 0; i < state.buildings.length; i++) {
    const b = state.buildings[i];
    if (BUILDINGS[b.type].housing && upgradeTarget(b) && !upgradeProblem(i)) { upgradeBuilding(i); return true; }
  }
  return false;
}

function botResearch() {
  if (state.research) return;
  const ids = Object.keys(TECHS).filter(id => !researchProblem(id));
  if (!ids.length) return;
  ids.sort((a, b) => (TECHS[b].transition ? 1 : 0) - (TECHS[a].transition ? 1 : 0) || TECHS[a].cost.wissen - TECHS[b].cost.wissen);
  startResearch(ids[0]);
}

function botWants() {
  const w = [];
  const pop = state.pop, food = stats.rates.nahrung || 0;
  if (stats.housing - pop < 3) w.push('__house');
  if (botCount('hoehlenmaler') < 1 + Math.floor(pop / 8)) w.push('hoehlenmaler');
  if (botCount('holzsammler') < 2 + Math.floor(pop / 12)) w.push('holzsammler');
  if (botCount('steinsammler') < 1 + Math.floor(pop / 15)) w.push('steinsammler');
  const hunters = botCount('jaegerlager') + botCount('mammutjaegerlager');
  if (food < 2 + pop * 0.1) w.push(botBest('feld') || botBest('fischen') || (hunters < 3 ? 'jaegerlager' : null) || 'sammlerin');
  if ((stats.needs.waerme ?? 1) < 1) w.push('feuerplatz');
  if (stageReached('mittel') && (stats.needs.glaube ?? 1) < 1) w.push('ahnenplatz');
  if (botCount('jaegerlager') + botCount('mammutjaegerlager') < 1 + Math.floor(pop / 25)) w.push('jaegerlager');
  if (isUnlocked('steinschlaeger') && botCount('steinschlaeger') < 1 + Math.floor(pop / 30)) w.push('steinschlaeger');
  if (isUnlocked('fellmacherin') && (botCount('fellmacherin') < 1 || state.res.kleidung < 5 && botCount('fellmacherin') < 1 + Math.floor(pop / 40))) w.push('fellmacherin');
  if (isUnlocked('tongrube') && botCount('tongrube') < Math.max(1, botCount('toepferei'))) w.push('tongrube');
  if (isUnlocked('toepferei') && botCount('toepferei') < 1 + Math.floor(pop / 40)) w.push('toepferei');
  if (isUnlocked('ziegengehege') && botCount('ziegengehege') < 1) w.push('ziegengehege');
  if (isUnlocked('vorratsspeicher') && Object.values(state.res).some(n => n >= storageCap() - 1) && botCount('vorratsspeicher') < 3) w.push('vorratsspeicher');
  if (isUnlocked('steinkreis') && botCount('steinkreis') < 1) w.push('steinkreis');
  return w.filter(Boolean);
}

// Notfall wie ein Spieler: Baum fällen oder Felsen abtragen
function botClear(kind) {
  const c = Math.floor(N / 2);
  for (let r = 1; r < N; r++)
    for (let y = c - r; y <= c + r; y++)
      for (let x = c - r; x <= c + r; x++)
        if (terrainAt(x, y) === TERRAIN[kind] && clearTile(x, y)) { botReport.cleared = (botReport.cleared || 0) + 1; return; }
}

// Wege zum Lagerfeuer legen, wo sie fehlen
function botRoads() {
  for (let i = 0; i < state.buildings.length; i++) {
    if (isConnected(i)) continue;
    if (pathRoute(i) === null) botClearLanes(state.buildings[i]);
    if (!buildRoute(i)) botReport.roads = (botReport.roads || 0) + 1;
  }
}

// Bäume und Felsen auf den Wegelinien rund um ein Gebäude räumen (wie ein Spieler)
function botClearLanes(b) {
  const s = BUILDINGS[b.type].size, c = Math.floor(N / 2);
  const x0 = Math.min(b.x, c) - 2, x1 = Math.max(b.x + s, c) + 2, y0 = Math.min(b.y, c) - 2, y1 = Math.max(b.y + s, c) + 2;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if ((x % 5 === 0 || y % 5 === 0) && terrainAt(x, y) && terrainAt(x, y).clear) clearTile(x, y);
}

function botStep() {
  botResearch();
  botRoads();
  if (state.res.holz < 15 && botCount('holzsammler') === 0) botClear('wald');
  if (state.res.stein < 5 && botCount('steinsammler') === 0) botClear('fels');
  if (state.res.holz < 15 && state.res.stein < 5) { botClear('wald'); botClear('fels'); }
  if (constructionCount() >= CONFIG.maxConstructions) return;
  for (const want of botWants()) {
    if (want === '__house') {
      if (botUpgradeHousing() || botTryBuild(botBest('wohnen'))) return;
      continue;
    }
    if (!isUnlocked(want)) continue;
    if (botTryBuild(want)) return;
  }
  // Jägerlager weiterentwickeln, wenn möglich
  for (let i = 0; i < state.buildings.length; i++)
    if (state.buildings[i].type === 'jaegerlager' && !upgradeProblem(i)) { upgradeBuilding(i); return; }
}

function botRun(minutes, seed) {
  startNewGame(seed);
  state.tutorial = -1;
  for (let sec = 0; sec < minutes * 60; sec++) {
    update(1);
    if (sec % 3 === 0) botStep();
    // Nahrung erst mal knapp, aber nicht ganz leer, zählt nicht als Hunger
    if (sec % 60 === 59) {
      if (state.res.nahrung < 1) botReport.hungerMin++;
      if (stats.happiness < 50) botReport.lowHappyMin++;
      botReport.pop.push(state.pop);
    }
    for (const id of ['mittelsteinzeit', 'jungsteinzeit', 'kupferfund'])
      if (state.techs[id] && botReport[id] === null) botReport[id] = Math.round(sec / 6) / 10;
  }
  botReport.final = { pop: state.pop, stage: state.stage, techs: Object.keys(state.techs).length, res: Object.fromEntries(Object.entries(state.res).map(([k, v]) => [k, Math.floor(v)])) };
  return botReport;
}
`;

export function runBot(minutes = 90, seed = 1) {
  const game = loadGame({ seed });
  game.run(BOT_CODE);
  const report = game.run(`botRun(${minutes}, ${seed * 7919})`);
  return { report, errors: game.errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const minutes = Number(process.argv[2]) || 90;
  const runs = Number(process.argv[3]) || 1;
  for (let k = 1; k <= runs; k++) {
    const { report, errors } = runBot(minutes, k);
    if (errors.length) { console.log('Fehler:', errors.join('\n')); process.exit(1); }
    const fmt = v => (v === null ? '–' : v + ' min');
    console.log(`Lauf ${k}: Mittelsteinzeit ${fmt(report.mittelsteinzeit)} · Jungsteinzeit ${fmt(report.jungsteinzeit)} · Kupferfund ${fmt(report.kupferfund)}`);
    console.log(`  Ende: ${report.final.pop} Einwohner, ${report.final.techs} Forschungen, Hunger ${report.hungerMin} min, unzufrieden ${report.lowHappyMin} min`);
    console.log(`  Einwohner je 10 min: ${report.pop.filter((_, i) => i % 10 === 9).join(' · ')}`);
    console.log(`  Waren: ${JSON.stringify(report.final.res)}`);
    console.log(`  Fehlte oft: ${Object.entries(report.blocked).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, n]) => t + ' ' + n).join(', ')}`);
  }
}
