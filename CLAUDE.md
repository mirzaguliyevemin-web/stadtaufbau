# Stadtaufbau – Regeln für Claude

Aufbauspiel als PWA (reines HTML/CSS/JS mit Canvas). Läuft öffentlich über GitHub Pages:
https://mirzaguliyevemin-web.github.io/stadtaufbau/ – **jeder Push auf `main` ist sofort live**
und wird von Emin am Handy gespielt. Siehe `README.md` und `tools/README.md`.

## Zwei Spiele im Repo

- **Altes Spiel** (Hauptadresse): `index.html`, `game.js`, `style.css`, `service-worker.js`.
- **Epochia** (Neustart, im Aufbau): Ordner `neu/`, live unter `…/stadtaufbau/neu/`. Pläne in `docs/konzept-neu.md`
  und `docs/epoche-1-steinzeit.md`, Bilder in `bilder/epochia/`. Wenn die erste Epoche fertig ist, wird Epochia die
  Hauptadresse.

## Sprache

Alles auf Deutsch: Texte im Spiel, Kommentare, Commit-Nachrichten, Dokumente.

## Vor jedem Push

1. `node tools/test.mjs` muss mit „Alle … Tests bestanden“ enden. Schlägt etwas fehl: nicht pushen.
   Das schließt die Epochia-Tests (`node neu/tools/test.mjs`) mit ein.
2. Version des **geänderten** Spiels an **drei** Stellen gleich erhöhen:
   - altes Spiel: `APP_VERSION` in `game.js`, `<meta name="app-version">` in `index.html`, `CACHE` in `service-worker.js`;
   - Epochia: `APP_VERSION` in `neu/js/daten.js`, `<meta name="app-version">` in `neu/index.html`,
     `CACHE` in `neu/service-worker.js`.
3. Commit mit kurzer deutscher Beschreibung, dann `git push`.

## Spielstände nie kaputt machen

Spieler haben echte Spielstände im localStorage (`stadtaufbau-save-1/2/3`). Änderungen am
Speicherformat müssen alte Stände weiter laden (Test „Alte Spielstände“). Gebäude-IDs in
`BUILDINGS` nie umbenennen oder löschen.
Epochia speichert getrennt in `epochia-save-1/2/3` und darf die `stadtaufbau-…`-Stände nie anfassen. Auch dort
Gebäude- und Forschungs-IDs nicht umbenennen; neue Felder im Spielstand in `sanitizeState` (`neu/js/speicher.js`)
mit Standardwert ergänzen.

## Fehler und Wünsche von Emin (`docs/wuensche.md`)

Emin trägt dort selbst Fehler und Wünsche ein. **Diese Liste hat Vorrang vor allem anderen** –
zuerst lesen, dann abarbeiten:
- **Fehler:** beheben.
- **Wünsche:** umsetzen, wenn sie klar beschrieben und überschaubar sind (Emin hat sie ausdrücklich
  gewünscht, die Einschränkungen unten für eigene Ideen gelten hier nicht). Nur bei großen Umbauten
  (mehr als etwa 300 Zeilen) oder unklarer Beschreibung: stehen lassen und darunter mit „→ Frage:“
  notieren, was unklar ist bzw. dass es in einer Sitzung mit Emin gebaut wird.
- Erledigte Punkte nach „Erledigt“ verschieben, mit Datum, Version und einem Halbsatz, was gemacht wurde.

## Täglicher Agent (automatischer Lauf)

Erlaubt ohne Rückfrage:
- **Fehler beheben**, die Tests, Bot oder Code-Lektüre aufdecken (Absturz, falsche Anzeige, Logikfehler).
- **Kleines Balancing**: Zahlen in den Konfigurationslisten oben in `game.js` (Kosten, Produktion,
  Zeiten) um höchstens etwa 25 % pro Wert anpassen, wenn der Bot-Bericht ein klares Problem zeigt
  (Zielwerte in `tools/README.md`). Vorher und nachher je 3 Bot-Läufe vergleichen
  (`node tools/bot.mjs 90 3`).
- Tests oder Bot verbessern.

Für **Epochia** gilt solange der Aufbau läuft: nur Fehler beheben, die Tests oder Code-Lektüre aufdecken.
Kein Balancing, keine neuen Inhalte – die Zahlen und Inhalte entstehen in Sitzungen mit Emin. Bot-Werte von
`node neu/tools/bot.mjs 90 3` ins Protokoll schreiben.

Nicht erlaubt – stattdessen als Vorschlag in `docs/vorschlaege.md` eintragen:
- neue Gebäude, neue Spielmechaniken, neue Fenster/Bedienelemente, Grafik-Umbauten,
- alles mit Server, Konten oder externen Diensten,
- große Umbauten (mehr als etwa 150 geänderte Zeilen).

Am Ende jedes Laufs:
- Kurzen Eintrag oben in `docs/agent-log.md`: Datum, Version, Bot-Werte, was geändert wurde und warum
  (oder „keine Änderung nötig“).
- Gibt es keine Code-Änderung, nur die Protokolldateien committen – **ohne** die Version zu erhöhen.
- Im Zweifel lieber nichts ändern und das Problem im Protokoll beschreiben.
