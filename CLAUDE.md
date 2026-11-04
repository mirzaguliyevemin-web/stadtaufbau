# Epochia – Regeln für Claude

Aufbauspiel als PWA (reines HTML/CSS/JS mit Canvas) im Ordner `neu/`. Läuft öffentlich über GitHub Pages:
https://mirzaguliyevemin-web.github.io/stadtaufbau/neu/ – **jeder Push auf `main` ist sofort live**
und wird von Emin am Handy gespielt. Die Hauptadresse `…/stadtaufbau/` leitet zu Epochia weiter.

Pläne in `docs/` (`konzept-neu.md`, `epoche-1-steinzeit.md`, `epoche-2-bronzezeit.md`, `epoche-3-eisenzeit.md`, `konzept-wunderwerke.md`, `plan-arbeitsbewegungen.md`, `plan-item-shop.md`, `plan-zweite-stadt.md`, `plan-lager.md`, `plan-design.md`).
Bilder in `bilder/epochia/` nach Art sortiert, jedes Gebäude im eigenen Ordner (`gebaeude/sammlerin/…`), Originale genauso
unter `quelle/`. Der Pfad folgt aus dem Namen (`imagePath` in `neu/js/zeichnen.js`). Neue Bilder dorthin legen, der Test „Bilder“ prüft das.

Das alte Spiel mit Draufsicht wurde am 03.11.2026 auf Emins Wunsch entfernt (zuletzt im Commit b680374 unter `archiv/altes-spiel/`). `index.html` und `service-worker.js` im Hauptordner leiten alte Installationen weiter und bleiben.

## Sprache

Alles auf Deutsch: Texte im Spiel, Kommentare, Commit-Nachrichten, Dokumente.

## Vor jedem Push

1. `node neu/tools/test.mjs` muss mit „Alle … Epochia-Tests bestanden“ enden (`--quick` ohne Bot). Schlägt etwas fehl: nicht pushen.
2. Version an **drei** Stellen gleich erhöhen: `APP_VERSION` in `neu/js/daten.js`, `<meta name="app-version">` in `neu/index.html`,
   `CACHE` in `neu/service-worker.js`.
3. Commit mit kurzer deutscher Beschreibung, dann `git push`.

## Spielstände nie kaputt machen

Spieler haben echte Spielstände im localStorage (`epochia-save-1/2/3`). Änderungen am Speicherformat müssen alte Stände weiter
laden. Gebäude- und Forschungs-IDs nie umbenennen oder löschen; neue Felder im Spielstand in `sanitizeState`
(`neu/js/speicher.js`) mit Standardwert ergänzen. Die alten Stände `stadtaufbau-…` nie anfassen.

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

Solange der Aufbau läuft, gilt: nur Fehler beheben, die Tests oder Code-Lektüre aufdecken, Tests oder Bot verbessern.
Kein Balancing, keine neuen Inhalte – Zahlen und Inhalte entstehen in Sitzungen mit Emin. Bot-Werte von
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
