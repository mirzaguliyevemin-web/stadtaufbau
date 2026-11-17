// Welche Dateien gehören in die Android-App? Gemeinsam für bauen.mjs (www/ zusammenstellen) und live-liste.mjs (Live-Updates).
// Aufbau wie auf GitHub Pages, damit die Pfade (../bilder/epochia/…) gleich bleiben – und jede Datei dort unter demselben Pfad liegt.
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const OHNE_NEU = ['tools', 'teststand-', 'service-worker.js'];

function walk(dir, out) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

// Liefert [{ rel: Pfad in der App, src: Datei auf der Platte, url: Pfad auf GitHub Pages }]
export function appDateien(root) {
  const liste = [];
  const neu = join(root, 'neu');
  for (const src of walk(neu, [])) {
    const r = relative(neu, src).split(sep).join('/');
    if (!OHNE_NEU.some(x => r.startsWith(x))) liste.push({ rel: 'neu/' + r, src, url: 'neu/' + r });
  }
  const bilder = join(root, 'bilder', 'epochia');
  for (const src of walk(bilder, [])) {
    const r = relative(bilder, src).split(sep).join('/');
    if (!r.startsWith('quelle/') && !/\.(txt|md)$/.test(r)) liste.push({ rel: 'bilder/epochia/' + r, src, url: 'bilder/epochia/' + r });
  }
  // Startseite der App: leitet nur auf neu/index.html weiter (liegt in app/, weil die Hauptseite auf Pages etwas anderes tut)
  liste.push({ rel: 'index.html', src: join(root, 'app', 'start.html'), url: 'app/start.html' });
  return liste;
}
