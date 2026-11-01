// Epochia – Einnahmen und Ausgaben einer festen Siedlung über ein ganzes Jahr (Stand von Emin, 01.11.: Jungsteinzeit,
// 86 Einwohner, 43 Stellen). Aufruf: node neu/tools/bilanz.mjs [Jahre je Lauf] [Läufe]
// Teil 1 (Rate): Das Lager wird jede Sekunde auf halb voll gestellt – so sieht man, was die Siedlung schaffen und
// verbrauchen würde, ohne dass volles oder leeres Lager die Zahlen verfälscht.
// Teil 2 (Lager): Dieselbe Siedlung läuft frei, wie im Spiel, ohne dass gebaut oder geforscht wird.
import { loadGame } from './headless.mjs';
import { BOT_CODE } from './bot.mjs';

const CODE = String.raw`
var SIEDLUNG = { sammlerin: 2, jaegerlager: 2, mammutjaegerlager: 1, fischerplatz: 2, acker: 1, holzsammler: 2, steinsammler: 2,
  hoehlenmaler: 3, fellmacherin: 2, steinschlaeger: 2, pflanzerin: 3 };   // 43 Stellen

function bilanzAufbau(seed) {
  startNewGame(seed);
  state.tutorial = -1;
  state.plots = state.plots.map(() => 1);
  // alles bis zur Jungsteinzeit erforscht, dazu Ackerbau (Emins Stand)
  for (const [id, t] of Object.entries(TECHS)) if (t.stage !== 'jung' || id === 'ackerbau') state.techs[id] = true;
  state.stage = 'jung';
  state.res = { nahrung: 200, holz: 2000, stein: 2000, wissen: 200, felle: 200, kleidung: 200, werkzeug: 200, ton: 0, toepferwaren: 0 };
  const hin = type => {
    const spot = botSpot(type);
    if (!spot) throw new Error('kein Platz für ' + type);
    const err = placeBuilding(type, spot.x, spot.y);
    if (err) throw new Error(type + ': ' + err);
    state.buildings[state.buildings.length - 1].build = null;
    botRoads();
  };
  for (const [type, n] of Object.entries(SIEDLUNG)) for (let k = 0; k < n; k++) hin(type);
  // Wohnungen für 86 Einwohner mit Wärme und Glaube
  while (housingTotal() < 86) hin('grubenhaus');
  for (let k = 0; k < 12; k++) { recalcStats(); const w = botUncovered('warmth', 'feuerplatz'); if (!w) break; const s = botSpot('feuerplatz', w); placeBuilding('feuerplatz', s.x, s.y); state.buildings[state.buildings.length - 1].build = null; botRoads(); }
  for (let k = 0; k < 6; k++) { recalcStats(); const w = botUncovered('belief', 'ahnenplatz'); if (!w) break; const s = botSpot('ahnenplatz', w); placeBuilding('ahnenplatz', s.x, s.y); state.buildings[state.buildings.length - 1].build = null; botRoads(); }
  state.pop = 86;
  state.needSince = { kleidung: -9999 };
  state.yearTime = 0;
  rebuildOccupancy();
  recalcStats();
}

function bilanzRate(jahre) {
  const je = {};   // Ware → Jahreszeit → { ein, aus, sec }
  for (let sec = 0; sec < jahre * CONFIG.yearSeconds; sec++) {
    const cap = storageCap();
    for (const id of Object.keys(RESOURCES)) if (id !== 'wissen') state.res[id] = cap / 2;
    state.res.wissen = 100;
    state.res.ton = state.res.toepferwaren = 0;
    const s = seasonIndex();
    update(1);
    state.pop = Math.min(state.pop, 86);
    for (const id of ['nahrung', 'holz', 'stein', 'felle', 'kleidung', 'werkzeug']) {
      const f = (stats.flows || {})[id] || { in: {}, out: {} };
      const z = ((je[id] ||= [0, 1, 2, 3].map(() => ({ ein: 0, aus: 0, sec: 0 }))))[s];
      z.ein += Object.values(f.in).reduce((a, n) => a + n, 0);
      z.aus += Object.values(f.out).reduce((a, n) => a + n, 0);
      z.sec++;
    }
  }
  return je;
}

function bilanzFrei(jahre, start) {
  Object.assign(state.res, start);
  const lager = {};
  let hunger = 0;
  for (let sec = 0; sec < jahre * CONFIG.yearSeconds; sec++) {
    update(1);
    state.pop = Math.min(state.pop, 86);
    if (state.res.nahrung < 1) hunger++;
    for (const id of ['nahrung', 'holz', 'stein', 'felle', 'kleidung', 'werkzeug']) {
      const l = (lager[id] ||= { sec: 0, voll: 0, leer: 0, summe: 0, min: Infinity });
      const n = state.res[id] || 0, cap = capOf(id);
      l.sec++; l.summe += n; l.min = Math.min(l.min, n);
      if (n >= cap * 0.95) l.voll++;
      if (n < cap * 0.05) l.leer++;
    }
  }
  return { lager, hunger: Math.round(hunger / 60), pop: Math.floor(state.pop) };
}
`;

const jahre = Number(process.argv[2]) || 2, laeufe = Number(process.argv[3]) || 3;
const WAREN = ['nahrung', 'holz', 'stein', 'felle', 'kleidung', 'werkzeug'];
const summe = {}, frei = {};
let hungerSumme = 0, popEnde = [];
for (let k = 1; k <= laeufe; k++) {
  const g = loadGame({ seed: k });
  g.run(BOT_CODE); g.run(CODE);
  g.run(`bilanzAufbau(${k * 7919})`);
  if (k === 1) console.log('Aufbau: ' + g.run(`JSON.stringify({ pop: state.pop, wohnplaetze: stats.housing, stellen: stats.jobs, besetzt: stats.workers, laune: stats.happiness, beduerfnisse: stats.needs })`));
  const je = JSON.parse(g.run(`JSON.stringify(bilanzRate(${jahre}))`));
  for (const id of WAREN) je[id].forEach((z, s) => {
    const a = ((summe[id] ||= [0, 1, 2, 3].map(() => ({ ein: 0, aus: 0, sec: 0 }))))[s];
    a.ein += z.ein; a.aus += z.aus; a.sec += z.sec;
  });
  // Teil 2: neu aufbauen, Lager halb voll
  const g2 = loadGame({ seed: k + 100 });
  g2.run(BOT_CODE); g2.run(CODE);
  g2.run(`bilanzAufbau(${k * 7919})`);
  const r = JSON.parse(g2.run(`JSON.stringify(bilanzFrei(${jahre}, { nahrung: 200, holz: 200, stein: 200, felle: 200, kleidung: 200, werkzeug: 200 }))`));
  for (const id of WAREN) { const l = r.lager[id], a = (frei[id] ||= { sec: 0, voll: 0, leer: 0, summe: 0, min: Infinity }); a.sec += l.sec; a.voll += l.voll; a.leer += l.leer; a.summe += l.summe; a.min = Math.min(a.min, l.min); }
  hungerSumme += r.hunger; popEnde.push(r.pop);
  for (const e of [...g.errors, ...g2.errors]) console.log('FEHLER: ' + e);
}
const zahl = n => (n >= 0 ? '+' : '') + n.toFixed(1).padStart(5);
console.log('\nRaten je Minute (Lager festgehalten): Einnahmen / Ausgaben / Netto je Jahreszeit, dann Jahresmittel');
for (const id of WAREN) {
  const z = summe[id].map(a => ({ ein: a.ein / a.sec, aus: a.aus / a.sec }));
  const ein = z.reduce((m, a) => m + a.ein, 0) / 4, aus = z.reduce((m, a) => m + a.aus, 0) / 4;
  console.log(id.padEnd(9) + ['Frü', 'Som', 'Her', 'Win'].map((n, s) => `${n} ${z[s].ein.toFixed(0)}/${z[s].aus.toFixed(0)}/${zahl(z[s].ein - z[s].aus)}`).join(' · ') +
    ` || Jahr ${ein.toFixed(1)}/${aus.toFixed(1)} Netto ${zahl(ein - aus)} (${ein ? Math.round(100 * (ein - aus) / ein) : 0} %)`);
}
console.log('\nFreier Lauf (Start: alles 200, nichts gebaut, nichts geforscht):');
for (const id of WAREN) {
  const a = frei[id];
  console.log(`${id.padEnd(9)} voll ${String(Math.round(100 * a.voll / a.sec)).padStart(3)} % · leer ${String(Math.round(100 * a.leer / a.sec)).padStart(3)} % · Mittel ${String(Math.round(a.summe / a.sec)).padStart(3)} · Tiefstand ${Math.round(a.min)}`);
}
console.log(`Hunger ${hungerSumme} min in ${laeufe * jahre} Jahren, Einwohner am Ende: ${popEnde.join(', ')}`);
