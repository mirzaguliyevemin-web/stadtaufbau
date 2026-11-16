// Epochia – Eisenzeit-Bot: spielt ab dem Test-Stand (Beginn der Kupferzeit) bis zur Keltenschrift (Ende der Eisenzeit)
// und schreibt ab dem Aufbruch in die Eisenzeit alle 20 Minuten, woran die Forschung gerade hängt.
// Aufruf: node neu/tools/bot-eisen.mjs [Stand-Datei]   (dauert rund 40 Minuten)
import fs from 'node:fs';
import { loadGame } from './headless.mjs';
import { BOT_CODE } from './bot.mjs';
const start = process.argv[2] && fs.existsSync(process.argv[2]) ? process.argv[2] : new URL('../teststand-kupferzeit.txt', import.meta.url);
const game = loadGame({ seed: 1 });
game.run(BOT_CODE);
game.run(`var botStand = ${JSON.stringify(fs.readFileSync(start, 'utf8').trim())};`);
const r = game.run(`(() => {
  importText(botStand); const log = []; let saved = null;
  for (let sec = 0; sec < 1500 * 60; sec++) {
    update(1); botLagerZaehlen(); if (sec % 3 === 0) botStep();
    if (!saved && state.techs.aufbruch_eisenzeit) { saved = btoa(unescape(encodeURIComponent(serialize()))); log.push('EISENZEIT ' + Math.round(sec/60)); }
    if (saved && sec % 1200 === 0) {
      const av = Object.keys(TECHS).filter(id => techStatus(id) === 'available' && !TECHS[id].soon);
      const cnt = {}; for (const b of state.buildings) if (/^(eisenmine|rennofen|salzsiederei|glasmacherin|gehoeft|stadthaus|eisenschmied|salzberg|ringwall|wagner|druidenhain)$/.test(b.type)) cnt[b.type + (b.build ? '*' : '')] = (cnt[b.type + (b.build ? '*' : '')] || 0) + 1;
      log.push(Math.round(sec/60) + ' ' + state.stage + ' pop=' + state.pop + ' lauf=' + (state.research ? state.research.id : '-') + ' | ' + av.map(id => id + ':' + (researchProblem(id) || 'ok')).join(' ; ') + ' | ' + JSON.stringify(cnt) + ' | eisen=' + Math.floor(state.res.eisen) + ' erz=' + Math.floor(state.res.eisenerz) + ' salz=' + Math.floor(state.res.salz) + ' glas=' + Math.floor(state.res.glas) + ' kohle=' + Math.floor(state.res.holzkohle) + ' wonders=' + JSON.stringify(state.wonders.salzberg || null));
    }
    if (state.techs.keltenschrift) { log.push('KELTENSCHRIFT ' + Math.round(sec/60)); break; }
  }
  globalThis.__e = saved;
  return log.join('\\n');
})()`);
console.log(r, game.errors.slice(-3));
