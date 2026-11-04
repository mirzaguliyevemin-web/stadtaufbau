# Plan: Lagerfenster, kurze Leiste und Träger

Stand 2026-11-04. **Schritt 1 gebaut in Version 88 (`neu/js/lager.js`), die Träger folgen.** Wunsch von Emin: Die Leiste oben wird immer voller (Jungsteinzeit 9 Waren, späte Eisenzeit 22, dazu Einwohner, Laune und Wetter). Oben bleiben nur zwei wichtige Waren, alles andere steht im Lager, und die Arbeiter bringen die Waren dorthin.

## 1 · Entscheidungen von Emin (04.11.)

1. **Träger nur sichtbar.** Waren werden weiter direkt verbucht, Balance und die gemessenen Zeiten bleiben gültig.
2. **Oben bleiben Nahrung und Wissen.**
3. **Kein neues Gebäude.** Das Lagerfeuer ist das erste Lager, später kommen Vorratsspeicher, Kornspeicher und Vorratshof dazu.
4. **Warenwarnung:** Eine Ware erscheint oben, wenn sie bald leer ist.
5. **Verlustmeldung:** Sinkt eine Ware, weil die Ausgaben höher sind als die Einnahmen, kommt eine kurze Meldung, zum Beispiel bei schlechtem Wetter.

## 2 · Die Leiste

Links: 🍖 Nahrung, 💡 Wissen, 📦 Lager, dazu vorübergehend gewarnte Waren. Rechts wie bisher: Einwohner, Laune, Wetter.

**Warnung „bald leer“:** Die Ware erscheint, wenn der Bestand bei gleichem Verlauf in unter 5 Minuten aufgebraucht ist oder schon bei 0 steht und jemand sie braucht. Sie verschwindet erst wieder, wenn sie über 10 Minuten reichen würde oder wieder steigt, damit sie nicht flackert. Es erscheinen höchstens 4 Waren gleichzeitig, die dringendsten zuerst. Volle Lager werden nur im Fenster markiert. Die Zeiten sind Startwerte.

Waren, die bei 0 stehen und von niemandem gebraucht werden, lösen nichts aus. Beim Bauen, Forschen und bei Aufträgen zählt weiter, was die jeweiligen Fenster anzeigen. Beim Bau prüfen, dass überall Bestand und Bedarf zu sehen sind, wo bisher der Blick in die Leiste nötig war.

## 3 · Das Lagerfenster

Öffnet sich über den Knopf 📦 oder durch Antippen von Lagerfeuer, Vorratsspeicher, Kornspeicher oder Vorratshof. Bei den Gebäuden öffnet das Infofeld das Lager, „Mehr“ führt weiter zu den Gebäudeangaben.

Kopf: Platz je Ware. Jede Zeile: Bild, Name, Menge, Plus oder Minus je Minute, Hinweis „voll“ oder „bald leer“. Tippen öffnet die bekannten Einnahmen und Ausgaben (`resourceTip`) mit Rückweg ins Lager. Gezeigt wird nur, was schon sichtbar wäre (`visibleResources`).

| Bereich | Waren |
|---|---|
| Nahrung und Versorgung | Nahrung, Kleidung, Töpferwaren, Salz, Wein |
| Rohstoffe | Holz, Stein, Felle, Ton, Wolle, Kupfererz, Eisenerz, Zinn, Holzkohle, Bernstein |
| Werkstoffe und Waren | Werkzeug, Kupfer, Bronze, Eisen, Glas, Schmuck |
| Wissen | Wissen, mit eigenem Speicher |
| Besonderes | Fundstücke: Anzahl und wie viele das Wunderwerk noch braucht, nur bereits entdeckte |

Die Einteilung steht in `LAGER_GROUPS` (`neu/js/daten.js`). Ein Test prüft, dass jede Ware einen Bereich hat, damit keine künftige Ware im Fenster fehlt.

## 4 · Verlustmeldung

Kurze Meldung über das vorhandene `toast`, Beispiel: „📉 Holz −3 je Minute · Dauerregen“.

- **Auslöser:** `stats.rates` der Ware bleibt mindestens 60 Sekunden negativ, bei mindestens −0,5 je Minute, es sind mehr als 5 Stück da, und die Ware wäre in unter 60 Minuten leer. So melden sich kleine Verluste aus großen Vorräten nicht.
- **Grund:** die wirkenden Wetterfolgen, die `resourceTip` schon ermittelt, aber nur solche, die schaden (Sonne erklärt keinen Verlust). Ohne Wetter steht dort „mehr Ausgaben als Einnahmen“.
- **Nicht zu oft:** dieselbe Ware höchstens alle 20 Minuten, zwischen zwei Meldungen mindestens 5 Minuten, mehrere Waren in einer Meldung. Hält der Verlust an, kommt nach der Pause eine neue Meldung.
- **Keine Meldung** während der Berechnung der Abwesenheit und in der Einführung.
- **Einmalige Zahlungen** (Bau, Forschung) lösen nichts aus, sie stecken nicht in `stats.rates`.
- **Winter:** Nahrung sinkt dort immer. Sie wird einmal je Winter gemeldet und taucht nicht laufend auf.

❓ Beim Testen beobachten: Zwischenwaren wie Erz oder Holzkohle werden oft bis auf wenig verbraucht. Melden sie sich zu oft, bekommen sie eine höhere Schwelle oder werden nur noch als „bald leer“ gemeldet. Alle Zahlen sind Startwerte.

## 5 · Träger (Schritt 2)

Nur Darstellung in `neu/js/leben.js`, nichts davon landet im Spielstand.

- Von Gebäuden, die etwas herstellen, läuft ab und zu eine Figur über die Pfade zum nächsten Lager und mit leeren Händen zurück. Sie trägt das Warenbild, Holz und Beeren nutzen die vorhandenen Figuren.
- Ziel ist der kürzeste Weg über das Pfadnetz zu Lagerfeuer oder Speicher. Das erweitert die Regel „ohne Weg arbeitet niemand“ um ein Bild.
- **Höchstens etwa 12 Träger gleichzeitig**, damit das Handy flüssig bleibt, und nur im sichtbaren Kartenausschnitt. Ohne laufende Herstellung kein Träger.
- Keine neuen Canva-Bilder nötig. Passt später zu den Bildern aus `docs/plan-arbeitsbewegungen.md`.

## 6 · Was sonst angepasst wird

| Stelle | Änderung |
|---|---|
| `neu/js/oberflaeche.js`, `renderTopbar` | kurze Leiste, Warnungen, Lagerknopf |
| `neu/js/einstieg.js:94` | Gewonnene Waren fliegen zum Lagerknopf, wenn die Ware nicht oben steht |
| `neu/js/einstieg.js` | Einführungstexte prüfen, die auf die Leiste zeigen; Leiste bleibt Hindernis für den Ältesten |
| `neu/style.css` | Leiste auf schmalen Handys, Fenster mit Bereichen |
| `neu/js/daten.js` | `LAGER_GROUPS` und `CONFIG.stockWatch` |
| `neu/tools/test.mjs` | Tests zu Bereichen, Warnung und Meldung |

**Spielstände:** kein neues Feld nötig. Die Pausen der Meldungen gelten nur bis zum Neuladen. Testspieler und Balance sind nicht betroffen, weil sich die Spielrechnung nicht ändert.

## 7 · Reihenfolge

1. Leiste, Lagerfenster, Warnung und Verlustmeldung bauen, Emin testet am Handy.
2. Schwellen nach Emins Eindruck anpassen.
3. Sichtbare Träger.
