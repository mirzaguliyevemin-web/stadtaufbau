// Epochia – Bronzezeit-Bot: spielt ab dem Test-Stand (Beginn der Kupferzeit) und misst, ob und wann die Forschungen durchlaufen.
// Aufruf: node neu/tools/bot-bronze.mjs [Minuten] [Stand-Datei]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadGame } from './headless.mjs';
import { BOT_CODE } from './bot.mjs';

export function runBronzeBot(minutes = 600, file = new URL('../teststand-kupferzeit.txt', import.meta.url)) {
  const game = loadGame({ seed: 1 });
  game.run(BOT_CODE);
  game.run(`var botStand = ${JSON.stringify(fs.readFileSync(file, 'utf8').trim())};`);
  const report = game.run(`(() => {
    importText(botStand);
    const zeit = {}, start = state.playTime, was = {};
    let voll = {}, leer = {}, sec = 0, stand = null;
    for (; sec < ${minutes} * 60; sec++) {
      update(1);
      botLagerZaehlen();
      if (sec % 3 === 0) botStep();
      for (const id in TECHS) if (state.techs[id] && zeit[id] === undefined) zeit[id] = Math.round(sec / 60);
      if (!stand && state.stage === 'frueh') stand = btoa(unescape(encodeURIComponent(serialize())));
      if (sec % 60 === 0) for (const id in RESOURCES) { if ((state.res[id] || 0) < 1 && stageReached(RESOURCES[id].from || 'alt')) leer[id] = (leer[id] || 0) + 1; }
      if (state.techs.eisenfund && !techBuildGaps('aufbruch_eisenzeit').length && state.pop >= TECHS.aufbruch_eisenzeit.population) { was.ziel = Math.round(sec / 60); break; }
    }
    const counts = state.buildings.reduce((m, b) => (BUILDINGS[b.type].isPath ? 0 : m[b.type] = (m[b.type] || 0) + 1, m), {});
    return { min: Math.round(sec / 60), ziel: was.ziel ?? null, stage: state.stage, pop: state.pop, happy: stats.happiness, zeit, leer, counts, res: Object.fromEntries(Object.entries(state.res).map(([k, v]) => [k, Math.floor(v)])), wait: botReport.wait, missing: botReport.missing, blocked: botReport.blocked, trades: botReport.trades || 0, needs: stats.needs, jobs: stats.jobs, workers: stats.workers, housing: stats.housing, stand };
  })()`);
  return { report, errors: game.errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { report: r, errors } = runBronzeBot(Number(process.argv[2]) || 600, process.argv[3] || undefined);
  const { stand, ...rest } = r;
  console.log(JSON.stringify(rest, null, 1));
  if (errors.length) { console.log('Fehler:', errors.join('\n')); process.exit(1); }
}
