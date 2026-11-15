// Stellt den Ordner www/ für die Android-App zusammen: das Spiel aus neu/ und die Bilder ohne die Originale (quelle/).
// Aufbau wie auf GitHub Pages, damit die Pfade (../bilder/epochia/…) gleich bleiben.
import { cpSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = dirname(fileURLToPath(import.meta.url));
const root = join(app, '..');
const www = join(app, 'www');
rmSync(www, { recursive: true, force: true });
mkdirSync(www);
const ohne = ['tools', 'teststand-', 'service-worker.js'];
cpSync(join(root, 'neu'), join(www, 'neu'), { recursive: true, filter: src => !ohne.some(x => src.slice(join(root, 'neu').length).replace(/^\//, '').startsWith(x)) });
const bilder = join(root, 'bilder', 'epochia');
cpSync(bilder, join(www, 'bilder', 'epochia'), { recursive: true, filter: src => !src.startsWith(join(bilder, 'quelle')) && !/\.(txt|md)$/.test(src) });
writeFileSync(join(www, 'index.html'), '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=neu/index.html"><script>location.replace("neu/index.html")</script>\n');
console.log('www/ fertig');
