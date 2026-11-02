// Epochia – Balancing-Bot: spielt die Steinzeit ohne Browser und misst, wie lange die Stufen dauern.
// Aufruf: node neu/tools/bot.mjs [Minuten] [Läufe]   (Ziel seit 30.10.: Steinzeit in etwa 6 Stunden, Mittelsteinzeit nach gut 1 Stunde)
//
// Der Bot soll sich wie ein vernünftiger Spieler verhalten (seit 01.11.), damit seine Zeiten etwas über echte Spieler sagen:
// - er plant nach Bedarf: Nahrung nach dem, was die Gebäude schaffen KÖNNTEN (nicht nach der Rate, die bei vollem Lager
//   auf 0 fällt – daran baute der alte Bot Dutzende Sammlerinnen), Wissen nach den noch offenen Forschungen,
//   Waren (Felle, Kleidung, Werkzeug, Ton, Töpferwaren) nach Bedürfnissen, Verarbeitern und Forschungskosten;
// - fehlen Arbeiter, pausiert er Gebäude, deren Waren ohnehin voll im Lager liegen, und baut eher Wohnungen;
// - Feuerplätze und Ahnenplätze stellt er dorthin, wo Wohnungen noch ohne Wärme bzw. Glauben sind;
// - er holt Auftrags-Belohnungen ab und jagt Mammuts, wenn eine Herde da ist (mit etwas Verzögerung wie ein Mensch).
// Er benutzt nur Aktionen, die ein Spieler auch hat (bauen, Weg, Land kaufen, Bäume fällen, Pause, Forschung, Jagd, Aufträge).
import { loadGame } from './headless.mjs';
import { fileURLToPath } from 'node:url';

// Der Bot läuft im Spiel selbst (gleiche Funktionen wie die Oberfläche benutzt)
export const BOT_CODE = String.raw`
var botReport = { mittelsteinzeit: null, jungsteinzeit: null, kupferfund: null, hungerMin: 0, lowHappyMin: 0, pop: [], built: 0,
  blocked: {}, missing: {}, wait: {}, log: [], hunts: 0, quests: 0, paused: 0, lager: {} };

// Lager-Statistik je Ware: Anteil der Spielzeit mit vollem (≥ 95 %) und leerem (< 5 %) Lager und mittlerer Bestand.
// Gezählt wird erst, wenn die Ware im Spiel ist (seit sie zum ersten Mal im Lager lag).
function botLagerZaehlen() {
  for (const id of Object.keys(RESOURCES)) {
    const n = state.res[id] || 0, cap = capOf(id);
    const l = botReport.lager[id] || (n > 0 ? (botReport.lager[id] = { sec: 0, voll: 0, leer: 0, summe: 0, stufe: {} }) : null);
    if (!l) continue;
    const st = (l.stufe[state.stage] ||= { sec: 0, voll: 0 });
    l.sec++; st.sec++;
    l.summe += n;
    if (n >= cap * 0.95) { l.voll++; st.voll++; }
    if (n < cap * 0.05) l.leer++;
  }
}

function botCount(type) { return state.buildings.filter(b => b.type === type).length; }
function botLineCount(line) { return state.buildings.filter(b => BUILDINGS[b.type].line === line).length; }

// Wegeraster wie ein Spieler, der Wege mit einplant: jede 5. Reihe und Spalte bleibt für Trampelpfade frei
function botOnRoadGrid(x, y, s) {
  for (let k = 0; k < s; k++) if ((x + k) % 5 === 0 || (y + k) % 5 === 0) return true;
  return false;
}

// Freien Platz suchen: nur im eigenen Land, nah an einem Ziel (sonst am Lagerfeuer). Ergebnis merken, bis sich etwas ändert.
var botSpotCache = {};
function botSpot(type, near, anyGrid) {
  const c = Math.floor(N / 2), tx = near ? Math.round(near.x) : c, ty = near ? Math.round(near.y) : c;
  const key = (anyGrid ? '*' : '') + type + ':' + tx + ':' + ty + ':' + state.buildings.length + ':' + plotsBought() + ':' + state.cleared.length + ':' + state.saplings.length;
  if (key in botSpotCache) return botSpotCache[key];
  const def = BUILDINGS[type], s = def.size, half = s / 2;
  // nah an einem Ziel (Wärme/Glaube für eine Wohnung): nur Plätze, von denen aus das Ziel im Umkreis liegt
  const reach = near ? (def.belief || warmthRadius(def)) : Infinity;
  const y0 = near ? Math.max(landBox.y0, Math.floor(ty - reach - s)) : landBox.y0, y1 = near ? Math.min(landBox.y1, Math.ceil(ty + reach)) : landBox.y1;
  const x0 = near ? Math.max(landBox.x0, Math.floor(tx - reach - s)) : landBox.x0, x1 = near ? Math.min(landBox.x1, Math.ceil(tx + reach)) : landBox.x1;
  let best = null, bestD = Infinity;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (!isOwned(x, y)) continue;
      const d = Math.abs(x + half - tx) + Math.abs(y + half - ty);
      if (d >= bestD || near && Math.hypot(x + half - near.x, y + half - near.y) > reach) continue;
      if ((!def.needsWater && !anyGrid && botOnRoadGrid(x, y, s)) || placeProblem(type, x, y)) continue;
      best = { x, y }; bestD = d;
    }
  // zwischen den Wohnungen ist alles voll: dann auch auf die freigehaltenen Wegelinien (der Weg geht außen herum)
  if (!best && near && !anyGrid) best = botSpot(type, near, true);
  if (Object.keys(botSpotCache).length > 500) botSpotCache = {};
  return (botSpotCache[key] = best);
}

function botBest(line) {
  const e = barEntries().find(e => !e.locked && BUILDINGS[e.type].line === line);
  return e ? e.type : null;
}

// Wann zuletzt welche Ware zum Bauen fehlte (Spielsekunden) – so merkt der Bot Engpässe wie ein Spieler
var botShort = {};
function botNoteMissing(cost) {
  for (const [id, n] of Object.entries(cost || {})) if ((state.res[id] || 0) < n) botShort[id] = state.playTime;
}
function botRecentlyShort(id, sec = 180) { return botShort[id] !== undefined && state.playTime - botShort[id] < sec; }

function botTryBuild(type, near) {
  if (!type || !isUnlocked(type)) return false;
  if (!canAfford(BUILDINGS[type].cost)) {
    botReport.blocked[type] = (botReport.blocked[type] || 0) + 1;
    for (const [id, n] of Object.entries(BUILDINGS[type].cost)) if ((state.res[id] || 0) < n) botReport.missing[id] = (botReport.missing[id] || 0) + 1;
    botNoteMissing(BUILDINGS[type].cost);
    return false;
  }
  const spot = botSpot(type, near);
  if (!spot && near) return false;   // an dieser Wohnung ist kein Platz – nächstes Mal eine andere
  if (!spot) {
    // kein Platz: Land dazukaufen – und wenn das zu teuer ist, wie ein Spieler Bäume fällen, um Platz zu schaffen
    for (let p = 0; p < state.plots.length; p++) if (canBuyPlot(p) && buyPlot(p)) return false;
    botNoteMissing(plotPrice());
    for (let k = 0; k < 4; k++) botClear('wald');
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
    if (!BUILDINGS[b.type].housing || !upgradeTarget(b)) continue;
    if (!upgradeProblem(i)) { upgradeBuilding(i); return true; }
  }
  return false;
}

// ---------------------------------------------------------------------
// Planung: was die Gebäude schaffen könnten und was gebraucht wird
// ---------------------------------------------------------------------

// Was ein Gebäude bei voller Besetzung je Minute herstellen würde (Baustellen zählen mit – sie sind schon geplant).
// season: Jahreszeit (0–3), sonst die jetzige. Wetter zählt nicht (wechselt alle paar Minuten).
function botPotential(b, res, season) {
  const def = BUILDINGS[b.type];
  if (!def.produces || !def.produces[res]) return 0;
  const sf = SEASON_FACTORS[b.type] ? SEASON_FACTORS[b.type][season === undefined ? seasonIndex() : season] : 1;
  return def.produces[res] * sf * happinessFactor() * (1 + terrainBonus(b)) * (1 + techSum('bonus', b.type));
}
function botSupply(res, season) {
  let n = 0;
  for (const b of state.buildings) n += botPotential(b, res, season);
  return n;
}

// Laufender Verbrauch je Minute: Einwohner (Nahrung, Waren-Bedürfnisse) und Verarbeiter bei voller Besetzung
function botUse(res, pop = state.pop, season = seasonIndex()) {
  let n = pop * upkeepPerHead(res, pop);
  if (res === 'nahrung') n *= CONFIG.foodSeason[season];
  else if (activeNeeds().some(nd => nd.kind === 'stock' && nd.id === res)) n += pop * (activeNeeds().find(nd => nd.id === res).perPerson || CONFIG.goodsPerPerson);
  for (const b of state.buildings) {
    const c = BUILDINGS[b.type].consumes;
    if (c && c[res] && !b.paused) n += c[res];
  }
  return n;
}

// Ziel der laufenden Stufe: der Übergang ins nächste Zeitalter (in der Jungsteinzeit der Kupferfund)
function botGoal() {
  const t = Object.keys(TECHS).find(id => TECHS[id].transition && TECHS[id].stage === state.stage && !state.techs[id]);
  return t || (!state.techs.kupferfund ? 'kupferfund' : null);
}

// Alle noch offenen Forschungen dieser Stufe (sie werden alle für das Ziel gebraucht) + das Ziel selbst
function botOpenTechs() {
  return Object.keys(TECHS).filter(id => !state.techs[id] && (TECHS[id].stage === state.stage || id === botGoal()));
}

// Was die nächsten Forschungen an einer Ware kosten (größter Einzelbetrag – so viel muss auf einmal im Lager sein)
function botResearchNeed(res) {
  let most = 0;
  for (const id of botOpenTechs()) {
    if (state.research && state.research.id === id) continue;
    most = Math.max(most, TECHS[id].cost[res] || 0);
  }
  return Math.min(most, storageCap());
}

// Wissen je Minute, das gebraucht wird, damit die Forschung nie auf Wissen warten muss
function botKnowledgeRate() {
  let cost = 0, time = state.research ? state.research.left : 0;
  for (const id of botOpenTechs()) {
    if (state.research && state.research.id === id) continue;
    cost += TECHS[id].cost.wissen || 0;
    time += TECHS[id].time;
  }
  if (!cost) return 0;
  return Math.max(0, cost - state.res.wissen) / Math.max(5, time / 60);
}

// Wer stellt eine Ware her (neueste freigeschaltete Stufe)?
var BOT_MAKER = { bronze: 'bronze', zinn: 'zinn', wolle: 'tiere', kupfer: 'schmelzen', holzkohle: 'kohle', kupfererz: 'erz', holz: 'holz', stein: 'stein', wissen: 'wissen', felle: 'jagen', kleidung: 'kleidung', werkzeug: 'werkzeug', ton: 'ton', toepferwaren: 'toepfern' };

// Braucht eine Ware einen weiteren Hersteller? Vergleicht, was alle Hersteller schaffen könnten, mit dem Bedarf
// (laufender Verbrauch + Vorrat für die nächste Forschung, aufzufüllen in etwa 15 Minuten).
function botNeedsMore(res, extra = 0) {
  const want = botUse(res) * 1.15 + Math.max(0, botResearchNeed(res) - state.res[res]) / 15 + extra;
  return want > 0.05 && botSupply(res) < want;
}

// Nahrung: genug für jetzt (und die nächsten Zuzügler) und – ab dem Herbst – für den langen Winter
function botFoodShort() {
  const eat = botUse('nahrung', state.pop + 6) * effectFood();
  const stockNeed = Math.max(0, botResearchNeed('nahrung') - state.res.nahrung) / 20;
  if (botSupply('nahrung') < eat * 1.3 + 1 + stockNeed) return true;   // etwas Puffer: Gewitter und Zuzug kommen immer dazwischen
  const s = seasonIndex();
  if (s >= 2) {
    // im Winter fehlt höchstens so viel, wie der Vorrat für eine Jahreszeit (30 min) hergibt
    const winterEat = botUse('nahrung', state.pop + 10, 3) * 1.1;
    const reserve = (s === 3 ? state.res.nahrung : storageCap() * 0.8) / 30;
    if (botSupply('nahrung', 3) + reserve < winterEat) return true;
  }
  return false;
}

function botFoodType() {
  // am Anfang die billige Sammlerin; Jäger bringen auch Felle und werden mit der Mammutjagd viel stärker
  const hunters = botLineCount('jagen');
  const wantHunters = state.pop < 12 ? 0 : 1 + Math.floor(state.pop / (state.techs.mammutjagd ? 20 : 35));
  return botBest('feld') || botBest('fischen') || (hunters < wantHunters ? botBest('jagen') : null) || 'sammlerin';
}

// Wohnung ohne Wärme bzw. Glauben im Umkreis (für die Platzwahl des nächsten Feuer- oder Ahnenplatzes)
// (die erste, an der noch ein Platz frei ist – sonst null)
function botUncovered(key, type) {
  if (!type || !isUnlocked(type)) return null;
  const sources = state.buildings.filter(b => BUILDINGS[b.type][key]);   // Baustellen zählen mit
  for (const h of state.buildings) {
    if (!housingOf(h.type)) continue;
    const ok = sources.some(s => {
      const def = BUILDINGS[s.type];
      const r = key === 'warmth' ? warmthRadius(def) : def.belief;
      return distance(s, h) <= r + BUILDINGS[h.type].size / 2;
    });
    if (!ok && botSpot(type, centerOf(h))) return centerOf(h);
  }
  return null;
}

// Arbeiter fehlen? (Arbeitsplätze, die niemand besetzt)
function botWorkersShort() { return stats.jobs - stats.workers; }

function botWants() {
  const w = [];
  const pop = state.pop;
  const labourShort = botWorkersShort() > 2;
  const food = botFoodShort();
  const starving = state.res.nahrung < 20 && (stats.rates.nahrung || 0) < 0;
  if (starving) w.push(['food']);
  // der erste Höhlenmaler gleich zu Beginn (ohne Wissen keine Forschung)
  if (botLineCount('wissen') === 0) w.push(['hoehlenmaler']);
  // Wohnraum: immer ein paar Plätze frei (Zuzug alle 45 s); fehlen Arbeiter, erst recht
  if (stats.housing - pop < 3 || labourShort && stats.housing - pop < 6) w.push(['house']);
  if (food) w.push(['food']);
  // Was die nächsten Forschungen an Gebäuden verlangen
  for (const id of Object.keys(TECHS)) {
    if (techStatus(id) !== 'available') continue;
    for (const g of techBuildGaps(id)) {
      const type = botBest(BUILDINGS[g.type].line);
      if (type) w.push([type]);
    }
  }
  // Wissen: so viele Höhlenmaler, dass die Forschung nicht warten muss
  if (botGoal() && botSupply('wissen') < botKnowledgeRate() * 1.1) w.push(['hoehlenmaler']);
  // Bedürfnisse Wärme und Glaube
  if ((stats.needs.waerme ?? 1) < 1) { const h = botUncovered('warmth', botBest('waerme')); if (h) w.push([botBest('waerme'), h]); }
  if ((stats.needs.glaube ?? 1) < 1) { const h = botUncovered('belief', botBest('glaube')); if (h) w.push([botBest('glaube'), h]); }
  // Waren für Bedürfnisse, Verarbeiter und Forschung (Verarbeiter zuerst, dann ihre Rohstoffe)
  for (const res of ['bronze', 'kupfer', 'zinn', 'wolle', 'kleidung', 'toepferwaren', 'werkzeug', 'felle', 'ton', 'holzkohle', 'kupfererz']) {
    const type = botBest(BOT_MAKER[res]);
    if (type && isUnlocked(type) && botNeedsMore(res)) w.push([type]);
  }
  // Holz und Stein: Grundbedarf wächst mit dem Stamm. Fehlte es zuletzt beim Bauen oder Forschen (und wird nicht
  // gerade schon ein Sammler gebaut), kommt ein Sammler dazu – so wie ein Spieler auf leere Lager reagiert.
  const rawBase = { holz: 3 + pop * 0.12, stein: 2 + pop * 0.08 };
  for (const res of ['holz', 'stein']) {
    const type = botBest(BOT_MAKER[res]);
    const building = state.buildings.some(b => b.build && b.type === type);
    const short = botRecentlyShort(res, 120) && state.res[res] < 40 && !building && botSupply(res) < 6 + pop * 0.4;
    if (short || !labourShort && botNeedsMore(res, rawBase[res])) w.push([type]);
  }
  if (botCount('pflanzerin') < Math.floor(botCount('holzsammler') / 3)) w.push(['pflanzerin']);
  // Lager zu klein für die Forschungskosten oder ständig voll
  if (isUnlocked('vorratsspeicher') && botCount('vorratsspeicher') < 3 &&
      Object.entries(state.res).some(([id, n]) => !RESOURCES[id].knowledge && n >= storageCap() - 1)) w.push(['vorratsspeicher']);
  if (isUnlocked('steinkreis') && botCount('steinkreis') < 1) w.push(['steinkreis']);
  return w;
}

// Fehlen Arbeiter, pausiert der Spieler Gebäude, deren Waren ohnehin voll im Lager liegen – und lässt sie weiterlaufen,
// sobald wieder Platz ist (die freien Leute gehen ans nächste Gebäude, das welche braucht)
function botBalanceWorkers() {
  const full = (id, share) => (state.res[id] || 0) >= capOf(id) * share;
  for (let i = 0; i < state.buildings.length; i++) {
    const b = state.buildings[i], def = BUILDINGS[b.type];
    if (b.paused && Object.keys(def.produces || {}).some(id => !full(id, 0.85))) togglePause(i);
  }
  if (botWorkersShort() <= 0) return;
  for (let i = 0; i < state.buildings.length; i++) {
    const b = state.buildings[i], def = BUILDINGS[b.type];
    if (b.paused || b.build || !def.workers || !def.produces) continue;
    if (Object.keys(def.produces).every(id => full(id, 0.98))) { togglePause(i); botReport.paused++; return; }
  }
}

// Forschung: wie ein Spieler – was gerade geht, zuerst der Übergang, sonst das Günstigste.
// Wartet sie, merkt sich der Bot, woran es liegt (für den Bericht).
function botResearch() {
  if (state.research) return;
  const open = Object.keys(TECHS).filter(id => techStatus(id) === 'available');
  if (!open.length) return;
  open.sort((a, b) => (TECHS[b].transition ? 1 : 0) - (TECHS[a].transition ? 1 : 0) || TECHS[a].cost.wissen - TECHS[b].cost.wissen);
  const ready = open.find(id => !researchProblem(id));
  if (ready) { startResearch(ready); botReport.log.push(Math.round(state.playTime / 60) + ':' + ready); return; }
  // Grund fürs Warten (nur für den Bericht)
  const t = TECHS[open[0]];
  let why = 'sonstiges';
  if (t.population && state.pop < t.population) why = 'Einwohner';
  else if (techBuildGaps(open[0]).length) why = 'Gebäude';
  else { const miss = Object.keys(t.cost).find(id => (state.res[id] || 0) < t.cost[id]); if (miss) why = RESOURCES[miss].name; }
  botReport.wait[why] = (botReport.wait[why] || 0) + 3 / 60;
  botNoteMissing(t.cost);
}

// Mammutjagd: Zieht eine Herde vorbei, schickt der Spieler die Jäger los – aber nicht sofort, er schaut ja nicht ständig hin
var botHerdSince = null;
function botHunt() {
  if (huntProblem()) { botHerdSince = null; return; }
  if (botHerdSince === null) botHerdSince = state.playTime;
  if (state.playTime - botHerdSince >= 90 && !startHunt()) { botReport.hunts++; botHerdSince = null; }
}

// Händler: tauscht, was er kann, wenn danach noch genug von der Ware übrig bleibt
function botTrade() {
  if (!traderHere()) return;
  for (const o of traderOffers()) {
    const spare = Object.entries(o.give).every(([id, n]) => (state.res[id] || 0) >= n * 2);
    if (spare && !doTrade(o.id)) botReport.trades = (botReport.trades || 0) + 1;
  }
}

function botQuests() {
  for (const q of activeQuests()) if (questDone(q) && claimQuest(q.id)) botReport.quests++;
}

// Notfall wie ein Spieler: Baum fällen oder Felsen abtragen
// (nur auf eigenem Land suchen – die ganze große Karte Ring für Ring abzusuchen, dauerte viel zu lange)
function botClear(kind) {
  const c = Math.floor(N / 2), ps = CONFIG.plotSize, id = TERRAIN[kind].id;
  let best = null, bestD = Infinity;
  for (let p = 0; p < state.plots.length; p++) {
    if (state.plots[p] !== 1) continue;
    const px = (p % PLOTS) * ps, py = Math.floor(p / PLOTS) * ps;
    for (let y = py; y < py + ps; y++)
      for (let x = px; x < px + ps; x++) {
        if (terrain[y * N + x] !== id || occ[y * N + x]) continue;
        const d = Math.max(Math.abs(x - c), Math.abs(y - c));
        if (d < bestD) { best = [x, y]; bestD = d; }
      }
  }
  if (best && clearTile(best[0], best[1])) botReport.cleared = (botReport.cleared || 0) + 1;
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
  botQuests();
  botHunt();
  botTrade();
  botResearch();
  botRoads();
  botBalanceWorkers();
  if (state.res.holz < 15 && botCount('holzsammler') === 0) botClear('wald');
  if (state.res.stein < 5 && botCount('steinsammler') === 0) botClear('fels');
  if (state.res.holz < 15 && state.res.stein < 5) { botClear('wald'); botClear('fels'); }
  if (constructionCount() >= CONFIG.maxConstructions) return;
  for (const [want, near] of botWants()) {
    if (want === 'house') {
      if (botUpgradeHousing() || botTryBuild(botBest('wohnen'))) return;
      continue;
    }
    if (want === 'food') {
      if (botTryBuild(botFoodType())) return;
      continue;
    }
    if (botTryBuild(want, near)) return;
  }
}

function botRun(minutes, seed) {
  startNewGame(seed);
  state.tutorial = -1;
  for (let sec = 0; sec < minutes * 60; sec++) {
    update(1);
    botLagerZaehlen();
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
  botReport.final = { needs: JSON.stringify(stats.needs), counts: JSON.stringify(state.buildings.reduce((m, b) => (m[b.type] = (m[b.type] || 0) + 1, m), {})), jobs: stats.jobs, workers: stats.workers, housing: stats.housing, pop: state.pop, stage: state.stage, techs: Object.keys(state.techs).length, res: Object.fromEntries(Object.entries(state.res).map(([k, v]) => [k, Math.floor(v)])) };
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
    console.log(`  Bedürfnisse: ${report.final.needs} · Arbeit ${report.final.workers}/${report.final.jobs} · Wohnplätze ${report.final.housing}`);
    console.log(`  Gebäude: ${report.final.counts}`);
    console.log(`  Fehlte oft: ${Object.entries(report.blocked).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, n]) => t + ' ' + n).join(', ')}`);
    console.log(`  Dabei fehlte: ${Object.entries(report.missing).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t, n]) => t + ' ' + n).join(', ')}`);
    console.log(`  Forschung wartete auf: ${Object.entries(report.wait).sort((a, b) => b[1] - a[1]).map(([t, n]) => t + ' ' + Math.round(n) + ' min').join(', ') || 'nichts'}`);
    console.log(`  Forschungen (Start in min): ${report.log.join(' ')}`);
    for (const [id, l] of Object.entries(report.lager))
      console.log(`  Lager ${id.padEnd(12)} voll ${String(Math.round(100 * l.voll / l.sec)).padStart(3)} % · leer ${String(Math.round(100 * l.leer / l.sec)).padStart(3)} % · Mittel ${String(Math.round(l.summe / l.sec)).padStart(3)} · voll je Stufe: ${Object.entries(l.stufe).map(([s, st]) => s + ' ' + Math.round(100 * st.voll / st.sec) + ' %').join(', ')}`);
    console.log(`  Mammutjagden ${report.hunts} · Aufträge ${report.quests} · Pausen ${report.paused}`);
  }
}
