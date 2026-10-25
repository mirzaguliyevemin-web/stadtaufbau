# Stadtaufbau – Regeln für Claude

Aufbauspiel als PWA (reines HTML/CSS/JS mit Canvas). Läuft öffentlich über GitHub Pages:
https://mirzaguliyevemin-web.github.io/stadtaufbau/ – **jeder Push auf `main` ist sofort live**
und wird von Emin am Handy gespielt. Siehe `README.md` und `tools/README.md`.

## Sprache

Alles auf Deutsch: Texte im Spiel, Kommentare, Commit-Nachrichten, Dokumente.

## Vor jedem Push

1. `node tools/test.mjs` muss mit „Alle … Tests bestanden“ enden. Schlägt etwas fehl: nicht pushen.
2. Version an **drei** Stellen gleich erhöhen: `APP_VERSION` in `game.js`,
   `<meta name="app-version">` in `index.html`, `CACHE` in `service-worker.js`.
3. Commit mit kurzer deutscher Beschreibung, dann `git push`.

## Spielstände nie kaputt machen

Spieler haben echte Spielstände im localStorage (`stadtaufbau-save-1/2/3`). Änderungen am
Speicherformat müssen alte Stände weiter laden (Test „Alte Spielstände“). Gebäude-IDs in
`BUILDINGS` nie umbenennen oder löschen.

## Täglicher Agent (automatischer Lauf)

Erlaubt ohne Rückfrage:
- **Fehler beheben**, die Tests, Bot oder Code-Lektüre aufdecken (Absturz, falsche Anzeige, Logikfehler).
- **Kleines Balancing**: Zahlen in den Konfigurationslisten oben in `game.js` (Kosten, Produktion,
  Zeiten) um höchstens etwa 25 % pro Wert anpassen, wenn der Bot-Bericht ein klares Problem zeigt
  (Zielwerte in `tools/README.md`). Vorher und nachher je 3 Bot-Läufe vergleichen
  (`node tools/bot.mjs 90 3`).
- Tests oder Bot verbessern.

Nicht erlaubt – stattdessen als Vorschlag in `docs/vorschlaege.md` eintragen:
- neue Gebäude, neue Spielmechaniken, neue Fenster/Bedienelemente, Grafik-Umbauten,
- alles mit Server, Konten oder externen Diensten,
- große Umbauten (mehr als etwa 150 geänderte Zeilen).

Am Ende jedes Laufs:
- Kurzen Eintrag oben in `docs/agent-log.md`: Datum, Version, Bot-Werte, was geändert wurde und warum
  (oder „keine Änderung nötig“).
- Gibt es keine Code-Änderung, nur die Protokolldateien committen – **ohne** die Version zu erhöhen.
- Im Zweifel lieber nichts ändern und das Problem im Protokoll beschreiben.
