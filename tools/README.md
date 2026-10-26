# Werkzeuge

Alles läuft mit Node (ab Version 18) direkt im Repo – ohne Browser, ohne Installation.

| Datei | Zweck |
|---|---|
| `headless.mjs` | Lädt `game.js` in Node mit Platzhaltern für Seite, Canvas und Speicher (`loadGame({ storage, seed })`) |
| `balance-bot.js` | Bot, der das Spiel automatisch spielt und einen Bericht erstellt (`runBalanceBot(minuten)`) |
| `bot.mjs` | Bot von der Kommandozeile starten |
| `test.mjs` | Automatische Tests – Code 1 bei Fehlschlag |

## Befehle

```bash
node tools/test.mjs --quick   # schnelle Tests (Sekunden)
node tools/test.mjs           # alle Tests inkl. 90-Minuten-Bot (ca. 4 Minuten)
node tools/bot.mjs 90 3       # drei Bot-Läufe à 90 Spielminuten mit Zusammenfassung
```

In den Tests wird ohne Bauzeit gebaut (`fresh()` setzt sie auf 0), außer im Test „Bauzeit“.
Der Bot spielt mit echter Bauzeit und höchstens `CONFIG.maxConstructions` Baustellen.

## Bot-Bericht lesen

- **Meilensteine:** Spielminute, in der 21 / 50 / 101 / 150 / 200 Einwohner erreicht wurden
  (21 = Kleinstadt, 101 = Stadt).
- **Probleme:** Minuten mit niedriger Zufriedenheit, Hunger oder Frost.
- **Engpässe:** wie oft dem Bot etwas zum Bauen fehlte – zeigt, welche Ressource knapp ist.

Der Bot spielt schneller als ein Mensch; reale Spieler brauchen etwa 1,5- bis 2-mal so lange.

## Zielwerte (Bot, Zufall 1)

| Wert | Ziel |
|---|---|
| Kleinstadt (21 Einw.) | 3–8 min |
| 50 Einwohner | 6–25 min |
| Stadt (101 Einw.) | 15–45 min |
| Antike erreicht (Bot) | 3–10 min |
| Hunger / Frost | höchstens 5 / 3 min |
