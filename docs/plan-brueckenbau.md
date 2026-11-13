# Plan: Brücken von Ufer zu Ufer bauen

Stand 2026-11-11. Wunsch von Emin: An beiden Seiten des Flusses einen Punkt setzen, dazwischen entsteht die Brücke. Der Bau kostet Waren und dauert eine Weile.

Zeichen: 💡 Vorschlag · ❓ Frage an Emin

## 1 · Heute

- Eine Brücke ist ein Weg, der über Wasser gemalt wird. Jedes Wasserfeld wird sofort zu einem Brückenfeld und kostet 8 Holz.
- Seit heute gibt es auch schräge Brücken. Sie verlaufen auf dem Bildschirm senkrecht oder waagerecht, und ihre Felder sind über Eck verbunden.
- Nachteile:
  - Man malt leicht aus Versehen eine Brücke, wenn der Finger beim Malen eines Weges übers Wasser rutscht.
  - Eine Brücke ist kein richtiges Bauwerk: Sie hat keine Bauzeit, und man sieht keine Baustelle.

## 2 · So soll es werden

1. In der Bauleiste unter „Wege“ auf **Brücke** tippen.
2. Der Älteste sagt: „Tipp auf ein Ufer.“ Erlaubt sind nur Landfelder, die direkt am Wasser liegen. Diese Felder leuchten.
3. **Erster Punkt** antippen: Dort steht ein Pflock mit Fähnchen.
4. **Zweiter Punkt** am anderen Ufer antippen. Erlaubt sind nur Ufer, die vom ersten Punkt aus erreichbar sind:
   - gerade entlang der Rauten oder schräg über Eck, also auf dem Bildschirm senkrecht oder waagerecht,
   - dazwischen nur Wasser,
   - nicht länger als erlaubt (siehe 3).
5. Eine **Vorschau** der Brücke erscheint, halb durchsichtig. Darunter steht die Leiste mit Länge, Kosten und Bauzeit, zum Beispiel „Brücke · 4 Felder · 32 🪵 12 🪨 · 2:00 min“. Mit ✔ bestätigen, mit ✕ abbrechen.
6. Während der **Baustelle** zeigt die Brücke ein Gerüst, Balken und Restzeit, wie andere Baustellen. Man kann noch nicht darüber gehen.
7. Wenn sie **fertig** ist, gehört die Brücke zum Wegenetz. Ein Geräusch ertönt, und eine Meldung „Die Brücke steht!“ erscheint.

Pfade lassen sich dann nicht mehr übers Wasser malen. Der Weg hört am Ufer auf, und ein Hinweis erklärt: „Für den Fluss: Brücke in der Bauleiste.“

## 3 · Kosten, Zeit und Länge

💡 Vorschlag, im Spiel zu erproben:

| Zeitalter | Brücke | Kosten je Wasserfeld | Bauzeit je Feld | Größte Länge |
|---|---|---|---|---|
| Steinzeit | Stammbrücke mit Seilen | 8 Holz, 2 Stein | 30 Sekunden | 4 Felder |
| Bronzezeit | Bohlenbrücke auf Pfählen | 10 Holz, 4 Stein, 1 Bronze | 25 Sekunden | 6 Felder |
| Eisenzeit | Steinbogenbrücke | 6 Holz, 12 Stein, 1 Eisen | 20 Sekunden | 8 Felder |

- Abreißen gibt wie bei Gebäuden einen Teil der Kosten zurück.
- ❓ Soll eine Brücke wie ein Gebäude einen Platz in der Bauschlange belegen? 💡 Ja, sonst wäre der Bau-Platz aus dem Shop dafür wertlos.
- ❓ Soll man den Bau mit Gold aus dem Shop beschleunigen können? 💡 Ja, wie bei Gebäuden.
- ❓ Sollen Arbeiter oder Träger beim Bau zu sehen sein? 💡 Erst nicht, das kommt mit den Arbeitsbewegungen.

## 4 · Aussehen

- Alle Bilder kommen aus Canva. Je Zeitalter braucht es drei Richtungen (entlang der Rauten, auf dem Bildschirm senkrecht, auf dem Bildschirm waagerecht), jeweils mit einem Winterbild.
- Die Steinzeit hat davon schon:
  - die gerade Brücke mit Winterbild,
  - die senkrechte Brücke (seit heute, Winterbild fehlt).
- Dazu kommt ein Bild für die Baustelle, ein halbfertiger Steg mit Gerüst, und zwei kleine Bilder für die Uferpflöcke.
- ❓ Sollen ältere Brücken beim Aufstieg ins nächste Zeitalter von selbst ihr Aussehen wechseln, oder bleiben sie, bis man sie umbaut? 💡 Sie wechseln von selbst, so wie der Lagerfeuerplatz.

## 5 · Spielstände

- Brücken in alten Spielständen bleiben erhalten und gelten als fertig. Die ID `bruecke` bleibt.
- Neue Angaben im Spielstand: Baufortschritt und, falls nötig, Zeitalter der Brücke. Sie bekommen in `sanitizeState` einen Standardwert.

## 6 · Umfang

- **Spiel:** Brückenwahl mit zwei Punkten und Vorschau, Baustelle, Bauzeit, Kosten je Zeitalter, Hinweis beim Pfad-Malen, Tests. Etwa 250 bis 350 Zeilen.
- **Bilder aus Canva:** etwa 3 Zeitalter × 3 Richtungen × 2 (Sommer und Winter), dazu Baustelle und Pflöcke. Insgesamt rund 20 Bilder, davon 3 fertig.

## 7 · Reihenfolge

1. ✅ Fragen beantwortet (siehe 8). Die Zahlen in 3 werden im Spiel erprobt.
2. ✅ Gebaut in Version 172 (12.11.2026):
   - In der Bauleiste unter „Wege“ auf 🌉 tippen. Die möglichen Ufer leuchten gelb. Nach dem ersten Ufer steht dort ein Pflock mit Fähnchen, und die erreichbaren Ufer gegenüber leuchten grün.
   - Sind beide Ufer gewählt, erscheint die Vorschau mit Länge, Kosten und Bauzeit. Mit ✔ wird gebaut.
   - Die Ufer bekommen dabei ein Stück Pfad (1 Holz je Feld).
   - Die Brücke belegt **einen** Platz in der Bauschlange. Sie lässt sich mit Gold oder ⚡ beschleunigen und erscheint dafür in der Liste nur einmal.
   - Auf der Baustelle stehen Pfähle mit Querbalken. Die Brücke wird nach und nach sichtbar, darüber laufen Balken und Restzeit. Erst die fertige Brücke trägt Wege. Dann kommt die Meldung „Die Brücke steht!“.
   - Abreißen nimmt die ganze Brücke weg und gibt einen Teil zurück.
   - Pfade malen geht nicht mehr übers Wasser. Stattdessen kommt der Hinweis auf die Brücke. „Weg bauen“ führt nicht mehr durchs Wasser.
   - Kosten, Zeit und Länge je Zeitalter stehen in `BRIDGE_ERAS` (neu/js/daten.js).
   - Pflöcke und Gerüst sind vorerst gezeichnet. Bilder aus Canva können folgen.
   - Alte Brücken bleiben einzelne, fertige Brückenfelder.
3. ✅ Version 173: Schräge senkrechte Brücken haben keine Lücken mehr. Sie zeigen jetzt einen durchgehenden Steg aus quer liegenden Stämmen (neues Bild aus Canva, wiederholt sich nahtlos), an den Ufern stehen Pfosten.
4. ✅ Version 176: In der Bronzezeit zeigen alle Brücken die Bohlenbrücke mit Geländer (gerade, waagerecht und als Steg, Bilder aus Canva). Fehlt ein Bild eines Zeitalters, bleibt das des vorigen. Winterbilder der Bronzezeit fehlen noch.
5. ✅ Version 177: In der Eisenzeit zeigen gerade und waagerechte Brücken die Steinbrücke mit Brüstung. Seit Version 178 auch der senkrechte Steg aus Steinplatten.
6. ✅ Version 179: Der Uferpflock mit rotem Fähnchen ist ein Bild aus Canva.
7. Winterbilder der Bronze- und Eisenzeit und das Baustellenbild, sobald die Bilder da sind.

## 8 · Entscheidungen von Emin (2026-11-12)

1. Eine Brücke **belegt einen Platz in der Bauschlange**.
2. Der Bau lässt sich **mit Gold beschleunigen**.
3. **Arbeiter beim Bau** sollen zu sehen sein, das hat aber keine Eile (kommt mit den Arbeitsbewegungen).
4. Alte Brücken **wechseln beim neuen Zeitalter von selbst ihr Aussehen**. Emin hat dazu noch eine Idee, die besprechen wir später.
