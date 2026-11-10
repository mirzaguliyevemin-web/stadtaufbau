# Plan: Stufen für Produktionsgebäude (3 je Zeitalter, bis Stufe 24)

Wunsch Emin, 07.11.2026: Produktionsgebäude sollen sich von Stufe 1 bis Stufe 5 ausbauen lassen. Bisher steigt der
Ertrag nur, wenn man immer mehr Gebäude baut – das wird schnell eng und mühsam.

Stand: **gebaut mit Version 132** (Emin, 07.11.: alle 💡-Vorschläge). Zahlen in `CONFIG.levels` (`neu/js/daten.js`), Logik `levelUp`/`levelProblem`/`workersOf`/`levelFactor` in `neu/js/logik.js`, Knopf im Gebäudefenster, Stufenschild an der vorderen Ecke, Gold-Beschleunigen im Shop, Bot baut aus (`botTryLevel`). Aufträge zum Ausbauen seit Version 140 (Stufe 2 bis 9, `goal.level` in `QUESTS`). Lager-Stufen seit 10.11. (+30 % Platz je Stufe, `storagePerLevel`); Wohnhäuser bekommen keine Stufen (Emin, 10.11.: entwickeln sich schon weiter). Noch offen:, Balancing nach Emins Spielprobe.

## Neu seit Version 136 (Emin, 07.11.2026): 3 Stufen je Zeitalter, zwei Wohn-Reihen

| Zeitalter | Stufen | Extra-Ware für die letzte Stufe |
|---|---|---|
| Steinzeit | 1–3 | Werkzeug (3) |
| Bronzezeit | 4–6 | Bronze (4) |
| Eisenzeit | 7–9 | Eisen (5) |
| Antike … Zeitgeschichte | 10–24 | kommt mit dem Zeitalter |

- Weitergezählt, die Stufe bleibt beim Weiterentwickeln (Sammlerin Stufe 5 → Gemüsegarten Stufe 5).
- Je Stufe +50 % vom Grundwert (Stufe 3 ×2, Stufe 9 ×5), alle 2 Stufen ein Arbeiter mehr (Sammlerin: 2 · 2 · 3 · 3 · 4 · 4 · 5 · 5 · 6).
- Kosten: Baukosten × (1 + 0,5 × (Stufe − 1)), Bauzeit × Stufe. Gilt auch für alle Nahrungsgebäude.
- Wohnen getrennt: kleines Haus (2×2) Wohnhöhle → Fellzelt → Grubenhaus → **Flechtwerkhaus** (Bronzezeit, 8) → **Steinhaus**
  (Eisenzeit, 10), wird später immer feiner. Großes Wohnhaus (3×3, eigene Reihe `grosswohnen`) Langhaus → Lehmhaus →
  Hallenhaus → Gehöft → Stadthaus, später mehrstöckig. Flechtwerkhaus und Steinhaus zeigen bis zu ihren Canva-Bildern das Grubenhaus.

Die Abschnitte darunter sind der erste Entwurf (Version 132, Stufen 1–5).

## Wie es heute ist

- 54 Gebäude haben Arbeiter, 53 stellen etwas her (`produces` in `neu/js/daten.js`).
- Ertrag je Gebäude = Grundwert × Anteil besetzter Arbeiter × Jahreszeit × Laune × Gelände × Forschung × Wunderwerk
  (`outputFactor` in `neu/js/logik.js`).
- „Weiterentwicklung“ gibt es schon, aber das ist etwas anderes: Mit dem Zeitalter wird ein Gebäude zu einem neuen Gebäude
  (Sammlerin → Gemüsegarten → Obstgarten). Das bleibt so. Die neue Stufe ist eine zweite Achse **innerhalb** eines Gebäudes.
- Höchstens 2 Baustellen gleichzeitig (+1 mit Shop-Platz), Lager 200 je Ware am Anfang.

## Grundidee

- Jedes Produktionsgebäude hat eine Stufe 1–5 (neu gebaut = Stufe 1).
- Im Info-Fenster des Gebäudes gibt es den Knopf **„Ausbauen auf Stufe 2“** mit Kosten und Bauzeit.
- Ausbau zählt als Baustelle (wie Bauen), am Gebäude sieht man ein Gerüst; danach steigt der Ertrag.
- Die Stufe bleibt bei der Weiterentwicklung erhalten: Sammlerin Stufe 3 → Gemüsegarten Stufe 3.
- Am Gebäude zeigt ein kleines Schild/Sterne die Stufe (kein neues Bild je Stufe – das wären über 250 Canva-Bilder).

## Fragen an Emin

**1. Was bringt eine höhere Stufe?**
- a) Nur mehr Ertrag, gleich viele Arbeiter (Stufe 5 = 3× Ertrag). Weniger Einwohner nötig – das Spiel wird deutlich leichter.
- b) Mehr Arbeiterplätze und Ertrag im gleichen Maß (Stufe 5 = 3× Arbeiter, 3× Ertrag). Spart Platz und Bauarbeit,
  aber Einwohner bleiben der Engpass – das Gleichgewicht bleibt fast wie heute.
- 💡 c) Mischung: je Stufe +1 Arbeiterplatz und +50 % Ertrag (Stufe 5: Ertrag ×3, Arbeiter z. B. 2 → 6).
  Jeder Arbeiter ist auf höherer Stufe etwas wertvoller – Ausbauen lohnt sich, macht das Spiel aber nicht zu leicht.

**2. Was kostet der Ausbau?**
- 💡 Gleiche Baustoffe wie das Gebäude, mal 1,5 / 2,5 / 4 / 6 für Stufe 2 / 3 / 4 / 5; ab Stufe 4 zusätzlich Werkzeug
  (in der Bronzezeit Bronze). Bauzeit = Bauzeit × Stufe.
- Läuft das Gebäude während des Ausbaus weiter? 💡 Ja, auf der alten Stufe (sonst bestraft der Ausbau).

**3. Wann darf man welche Stufe?**
- a) Alle 5 Stufen sofort.
- 💡 b) Steinzeit bis Stufe 3, Bronzezeit bis Stufe 4, Eisenzeit bis Stufe 5 – so gibt es in jedem Zeitalter etwas Neues.
- c) Stufen über Forschungen freischalten (z. B. „Bessere Werkzeuge“ → Stufe 3).

**4. Welche Gebäude?**
- 💡 Alle, die etwas herstellen (auch Wissen). Wohnhäuser, Lager und Wärme-/Glaubensgebäude erstmal nicht.
- Später denkbar: Lager mit Stufen (mehr Platz) und Wohnhäuser mit Stufen (mehr Einwohner) – getrennt besprechen.

## Was sich dadurch noch ändern muss (die „anderen Sachen“)

- **Lager:** Mit mehr Ertrag ist das Lager schneller voll. Eventuell Lager-Stufen oder größere Lager.
- **Forschung:** Braucht heute Einwohner und Waren; wenn Waren schneller kommen, geht Forschung schneller. Prüfen mit dem Bot.
- **Aufträge:** „Baue 2 Sammlerinnen“ bleibt; neue Aufträge wie „Baue eine Sammlerin auf Stufe 3 aus“.
- **Bäume und Felsen:** Holzsammler/Steinbruch auf Stufe 5 fällen und brechen 3× so schnell – Wald ist schneller leer.
  Eventuell braucht die Pflanzerin auch Stufen.
- **Shop:** Ausbau mit Gold beschleunigen (wie Bauen).
- **Bot:** muss Ausbauen lernen, sonst sagen die Testwerte nichts mehr.
- **Spielstände:** neues Feld `level` je Gebäude, alte Gebäude starten auf Stufe 1 (`sanitizeState`).
- **Abreißen:** Rückgabe auch für bezahlte Ausbauten (Hälfte).

## Umfang

Grob 250–350 Zeilen: Daten (Stufen-Tabelle in `CONFIG`), Logik (Ausbau, Ertrag, Arbeiter), Info-Fenster mit Knopf,
Stufenschild beim Zeichnen, Speichern, Tests, Bot. In einer Sitzung mit Emin baubar, sobald die Fragen entschieden sind.
