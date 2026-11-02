// Epochia – erzeugt Spielstände zum Ausprobieren der Bronzezeit, ohne die ganze Steinzeit zu spielen.
// Der Bot baut mit vollem Lager ein Dorf auf. Aufruf: node neu/tools/teststand-kupferzeit.mjs
// Ergebnis: neu/teststand-kupferzeit.txt, neu/teststand-fruehbronze.txt, neu/teststand-spaetbronze.txt (jeweils Beginn der Stufe)
import fs from 'node:fs';
import { loadGame } from './headless.mjs';
import { BOT_CODE } from './bot.mjs';

function erzeuge({ stage, techStufen, einwohner, dorf, vorrat, questsOffen }) {
  const game = loadGame({ seed: 1 });
  game.run(BOT_CODE);
  const out = game.run(`(() => {
    startNewGame(20261102);
    state.tutorial = -1;
    for (const id in TECHS) if (${JSON.stringify(techStufen)}.includes(TECHS[id].stage) && !TECHS[id].soon) state.techs[id] = true;
    state.stage = ${JSON.stringify(stage)};
    evolveBuildings();
    // ein Dorf, wie es am Ende der Stufe davor etwa dasteht (Linie → Anzahl)
    const DORF = ${JSON.stringify(dorf)};
    const VORRAT = ${JSON.stringify(vorrat)};
    // beim Bauen ist alles da, auch Metall (sonst fehlen Gebäude, die Kupfer oder Bronze kosten); der echte Vorrat kommt am Ende
    const vollmachen = () => { for (const id of Object.keys(RESOURCES)) state.res[id] = Math.max(state.res[id] || 0, storageCap()); };
    const versuche = {};
    const offen = () => Object.entries(DORF).find(([line, n]) => botLineCount(line) < n && (versuche[line] || 0) < 300);
    for (let sec = 0; sec < 240 * 60 && (state.pop < ${einwohner} || offen()); sec++) {
      if (sec % 3 === 0) {
        vollmachen(); botRoads();
        if (constructionCount() < CONFIG.maxConstructions) {
          const fehlt = offen();
          // gescheitert kann auch heißen: Der Bot hat erst Land gekauft – darum mehrmals versuchen
          if (fehlt && !botTryBuild(botBest(fehlt[0]))) versuche[fehlt[0]] = (versuche[fehlt[0]] || 0) + 1;
          else if (!fehlt && stats.housing - state.pop < 6) botTryBuild(botBest('wohnen'));
        }
      }
      update(1);
    }
    vollmachen();
    Object.assign(state.res, VORRAT);
    const fehltNoch = Object.entries(${JSON.stringify(dorf)}).filter(([line, n]) => botLineCount(line) < n).map(([line]) => line);
    state.research = null;
    state.quests = Object.fromEntries(QUESTS.filter(q => !${JSON.stringify(questsOffen)}.includes(q.id)).map(q => [q.id, true]));
    return { fehltNoch, pop: state.pop, stage: state.stage, gebaeude: state.buildings.length, text: btoa(unescape(encodeURIComponent(serialize()))) };
  })()`);
  if (game.errors.length) { console.log(game.errors.join('\n')); process.exit(1); }
  return out;
}

const bronzeQuests = ['q_b_mine', 'q_b_kupfer20', 'q_b_garten3', 'q_b_pop140', 'q_b_frueh', 'q_b_handel', 'q_b_tausch3', 'q_b_bronze20', 'q_b_viehhof2', 'q_b_pop180', 'q_b_spaet', 'q_b_schmuck20', 'q_b_pop230', 'q_b_fuerstenhuegel', 'q_b_pop280'];
const stande = {
  'teststand-kupferzeit.txt': {
    stage: 'kupfer', techStufen: ['alt', 'mittel', 'jung'], einwohner: 135,
    dorf: { wohnen: 6, holz: 6, stein: 4, wissen: 4, waerme: 3, sammeln: 3, jagen: 3, feld: 4, tiere: 1, pflanzen: 2, werkzeug: 1, kleidung: 1, toepfern: 1, ton: 1, glaube: 1, lager: 1, wahrzeichen: 1 },
    vorrat: { kupfer: 20, kupfererz: 30, holzkohle: 0, zinn: 0, bronze: 0, wolle: 0, bernstein: 0, schmuck: 0 }, questsOffen: bronzeQuests,
  },
  'teststand-fruehbronze.txt': {
    stage: 'frueh', techStufen: ['alt', 'mittel', 'jung', 'kupfer'], einwohner: 155,
    dorf: { wohnen: 6, holz: 7, stein: 4, wissen: 5, waerme: 3, sammeln: 3, jagen: 3, feld: 4, tiere: 2, pflanzen: 2, erz: 2, kohle: 2, schmelzen: 2, werkzeug: 2, kleidung: 1, toepfern: 1, ton: 1, glaube: 1, lager: 1, wahrzeichen: 1 },
    vorrat: { kupfer: 60, kupfererz: 60, holzkohle: 40, zinn: 0, bronze: 0, wolle: 0, bernstein: 0, schmuck: 0 }, questsOffen: bronzeQuests.slice(5),
  },
  'teststand-spaetbronze.txt': {
    stage: 'spaet', techStufen: ['alt', 'mittel', 'jung', 'kupfer', 'frueh'], einwohner: 205,
    dorf: { wohnen: 8, holz: 8, stein: 5, wissen: 6, waerme: 4, sammeln: 3, jagen: 3, feld: 5, tiere: 3, pflanzen: 2, erz: 3, kohle: 3, schmelzen: 3, zinn: 2, bronze: 3, handel: 1, werkzeug: 3, kleidung: 2, toepfern: 2, ton: 1, glaube: 2, lager: 2, wahrzeichen: 1 },
    vorrat: { kupfer: 80, kupfererz: 80, holzkohle: 60, zinn: 30, bronze: 60, wolle: 80, bernstein: 0, schmuck: 0 }, questsOffen: bronzeQuests.slice(11),
  },
};
for (const [datei, opt] of Object.entries(stande)) {
  const out = erzeuge(opt);
  fs.writeFileSync(new URL('../' + datei, import.meta.url), out.text + '\n');
  console.log(`${datei}: ${out.stage}, ${out.pop} Einwohner, ${out.gebaeude} Gebäude, ${out.text.length} Zeichen${out.fehltNoch.length ? ' – FEHLT: ' + out.fehltNoch : ''}`);
}
