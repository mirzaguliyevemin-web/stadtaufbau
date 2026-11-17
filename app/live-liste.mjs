// Schreibt app/live.json: Liste aller App-Dateien mit Prüfsumme (SHA-256). Die Android-App liest sie von GitHub Pages
// und lädt bei einer neuen Version nur die geänderten Dateien nach (Live-Update, V218 – Emin: lieber als jedes Mal die ganze App).
// Nach jeder Versionserhöhung ausführen: node app/live-liste.mjs  (der Test „Live-Liste“ prüft das)
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appDateien } from './dateien.mjs';

export function liveListe(root) {
  const version = Number((readFileSync(join(root, 'neu/js/daten.js'), 'utf8').match(/APP_VERSION\s*=\s*(\d+)/) || [])[1]);
  // Stand der App selbst (Android-Teil). Steigt nur, wenn sich Zusatzmodule ändern – dann muss eine neue APK her.
  const nativ = Number((readFileSync(join(root, 'app/android/app/build.gradle'), 'utf8').match(/versionCode\s+(\d+)/) || [])[1]);
  const dateien = appDateien(root).map(d => [d.rel, createHash('sha256').update(readFileSync(d.src)).digest('hex'), d.url]);
  return { version, nativ, dateien };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const l = liveListe(root);
  writeFileSync(join(root, 'app/live.json'), JSON.stringify(l) + '\n');
  console.log(`app/live.json: Version ${l.version}, App-Stand ${l.nativ}, ${l.dateien.length} Dateien`);
}
