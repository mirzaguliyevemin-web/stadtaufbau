// Epochia – erzeugt einen Spielstand zum Ausprobieren der Kupferzeit, ohne die ganze Steinzeit zu spielen.
// Der Bot baut mit vollem Lager ein Dorf auf. Aufruf: node neu/tools/teststand-kupferzeit.mjs [Datei]
import fs from 'node:fs';
import { loadGame } from './headless.mjs';
import { BOT_CODE } from './bot.mjs';

const game = loadGame({ seed: 1 });
game.run(BOT_CODE);
const out = game.run(`(() => {
  startNewGame(20261102);
  state.tutorial = -1;
  for (const id in TECHS) if (TECHS[id].stage !== 'kupfer') state.techs[id] = true;
  state.stage = 'kupfer';
  evolveBuildings();
  // ein Dorf, wie es am Ende der Steinzeit etwa dasteht (Linie → Anzahl)
  const DORF = { wohnen: 6, holz: 3, stein: 3, wissen: 4, waerme: 3, sammeln: 3, jagen: 3, feld: 2, tiere: 1, pflanzen: 1, werkzeug: 1, kleidung: 1, toepfern: 1, ton: 1, glaube: 1, lager: 1, wahrzeichen: 1 };
  const vollmachen = () => { for (const id of Object.keys(RESOURCES)) if (id !== 'kupfer' && id !== 'kupfererz' && id !== 'holzkohle') state.res[id] = Math.max(state.res[id] || 0, storageCap()); };
  for (let sec = 0; sec < 120 * 60 && state.pop < 135; sec++) {
    if (sec % 3 === 0) {
      vollmachen(); botRoads();
      if (constructionCount() < CONFIG.maxConstructions) {
        const fehlt = Object.entries(DORF).find(([line, n]) => botLineCount(line) < n);
        if (fehlt && !botTryBuild(botBest(fehlt[0]))) DORF[fehlt[0]] = 0;
        else if (!fehlt && stats.housing - state.pop < 6) botTryBuild(botBest('wohnen'));
      }
    }
    update(1);
  }
  vollmachen();
  state.res.kupfer = 20; state.res.kupfererz = 30;
  state.research = null;
  state.quests = Object.fromEntries(QUESTS.filter(q => !q.id.startsWith('q_b_') || q.id === 'q_b_aufbruch').map(q => [q.id, true]));
  return { pop: state.pop, gebaeude: state.buildings.length, text: btoa(unescape(encodeURIComponent(serialize()))) };
})()`);
const ziel = process.argv[2] || new URL('../teststand-kupferzeit.txt', import.meta.url);
fs.writeFileSync(ziel, out.text + '\n');
console.log(`${out.pop} Einwohner, ${out.gebaeude} Gebäude, ${out.text.length} Zeichen`);
if (game.errors.length) { console.log(game.errors.join('\n')); process.exit(1); }
