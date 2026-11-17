// Stellt den Ordner www/ für die Android-App zusammen: das Spiel aus neu/ und die Bilder ohne die Originale (quelle/).
// Welche Dateien hineinkommen, steht in dateien.mjs (dieselbe Liste nutzen die Live-Updates).
import { copyFileSync, rmSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appDateien } from './dateien.mjs';

const app = dirname(fileURLToPath(import.meta.url));
const www = join(app, 'www');
rmSync(www, { recursive: true, force: true });
for (const d of appDateien(join(app, '..'))) {
  mkdirSync(dirname(join(www, d.rel)), { recursive: true });
  copyFileSync(d.src, join(www, d.rel));
}
console.log('www/ fertig');
