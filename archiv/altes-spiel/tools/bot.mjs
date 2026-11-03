// Balancing-Bot von der Kommandozeile:  node tools/bot.mjs [Minuten] [Läufe]
// Beispiel: node tools/bot.mjs 90 3   → drei Läufe à 90 Spielminuten, mit Zusammenfassung
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './headless.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const BOT = fs.readFileSync(path.join(DIR, 'balance-bot.js'), 'utf8');

export function runBot(minutes = 90, seed = 1) {
  const game = loadGame({ seed });
  game.run(BOT);
  const report = game.run(`runBalanceBot(${minutes})`);
  return { report, errors: game.errors };
}

// Direkt aufgerufen: Läufe ausführen und lesbar ausgeben
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const minutes = Number(process.argv[2] || 90);
  const runs = Number(process.argv[3] || 1);
  const all = [];
  for (let n = 1; n <= runs; n++) {
    const { report, errors } = runBot(minutes, n);
    all.push(report);
    console.log(`\n=== Lauf ${n} (Zufall ${n}) – ${report?.seconds ?? '?'} s Rechenzeit ===`);
    if (errors.length) console.log('FEHLER:\n' + errors.join('\n'));
    if (!report) continue;
    for (const line of report.snapshots.filter((_, i) => i % 2 === 0)) console.log('  ' + line);
    console.log('  Meilensteine (Spielminuten):', JSON.stringify(report.milestones));
    console.log('  Zeitalter (Spielminute des Aufstiegs):', JSON.stringify(report.ages));
    console.log('  Sehenswürdigkeiten:', JSON.stringify(report.landmarks));
    console.log('  Forschung:', report.techs.join(' '));
    console.log('  Probleme:', JSON.stringify(report.problems));
    console.log('  Banditen:', JSON.stringify(report.bandits), ' Karren:', report.carts);
    console.log('  Land:', JSON.stringify(report.plots), ' Ausbau:', JSON.stringify(report.upgrades));
    console.log('  Aufträge:', report.quests, ' offen:', report.openQuests.join(','), ' Erfolge:', report.achievements);
    console.log('  Engpässe (wie oft fehlte etwas):', JSON.stringify(report.want));
  }
  if (runs > 1) {
    const avg = key => {
      const v = all.map(r => r?.milestones[key]).filter(x => x !== null && x !== undefined);
      return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '–';
    };
    console.log('\n=== Durchschnitt ===');
    for (const key of ['pop21', 'pop50', 'pop101', 'pop150', 'pop200']) console.log(`  ${key}: ${avg(key)} min`);
  }
}
