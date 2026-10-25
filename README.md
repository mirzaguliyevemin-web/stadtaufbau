# Stadtaufbau

Ein kleines Aufbauspiel als PWA – fürs Handy (Touch), Tablet und den PC (Maus und Tastatur).
Straßen legen, Häuser bauen, Rohstoffe produzieren und verarbeiten, Einwohner versorgen und
durch Dorf, Kleinstadt und Stadt wachsen.

**Spielen:** https://mirzaguliyevemin-web.github.io/stadtaufbau/

Auf dem Handy über „Zum Startbildschirm hinzufügen“ installierbar; danach auch offline spielbar.

## Technik

Reines HTML, CSS und JavaScript mit Canvas – kein Framework, kein Build-Schritt.

| Datei | Inhalt |
|---|---|
| `index.html` | Seitengerüst |
| `style.css` | Aussehen |
| `game.js` | Spiel – alle Gebäude, Ressourcen, Aufträge usw. stehen als Listen oben in der Datei |
| `manifest.json`, `service-worker.js` | Installation und Offline-Betrieb |

Lokal starten: `python3 -m http.server 8000` und `http://localhost:8000` öffnen.

Bei jeder Änderung die Version an drei Stellen gemeinsam erhöhen: `APP_VERSION` in `game.js`,
`<meta name="app-version">` in `index.html` und `CACHE` in `service-worker.js`.
