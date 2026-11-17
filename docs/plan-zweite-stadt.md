# Plan: Zweite Karte und zweite Stadt

Idee von Emin, 2026-11-03. **Nur ein Plan, nichts davon ist gebaut.** Wichtigeres geht vor: Bilder, Eisenzeit, Arbeitsbewegungen.

Zeichen: 💡 Vorschlag · ❓ Frage an Emin

**Kurz gesagt:** Nach einem bestimmten Zeitalter schickt man Siedler los und gründet auf einer neuen Karte eine zweite Stadt. Neue Landschaft, neue Aufgaben, und die erste Stadt läuft weiter. So bleibt das Spiel spannend, wenn die erste Stadt fertig gebaut ist.

## Wann es losgeht

💡 **In der Antike**, als Teil des neuen Zeitalters. Dort gibt es Geld, Handel und Seefahrt, Griechen und Römer gründeten damals wirklich Tochterstädte. Die Forschung „Kolonien“ und ein Schiff oder Siedlerzug schalten die neue Karte frei.

## Die neue Karte

| Karte | Was anders ist | Besonderheit |
|---|---|---|
| 💡 **Küste und Inseln** | viel Wasser, wenig Holz | Hafen, Fischfang, Schiffe |
| Gebirgstal | viel Erz und Stein, wenig Felder | Bergbau, Nahrung muss herangeschafft werden |
| Grasland | viel Nahrung, kein Fels | Viehzucht, Stein muss herangeschafft werden |

💡 Jede Karte hat etwas im Überfluss und etwas zu wenig. Genau deshalb lohnt sich Handel zwischen den Städten.

## Wie die Städte zusammenspielen

- **Eigene Waren, eigene Einwohner:** Jede Stadt hat ihr eigenes Lager.
- **Gemeinsam:** Forschung, Zeitalter, Wissen, Gold, Schatzkiste.
- **Handelsrouten:** Man legt fest, dass zum Beispiel alle paar Minuten 50 Holz von Stadt 1 nach Stadt 2 fahren. Das geht auch, während man in der anderen Stadt spielt.
- **Weiterlaufen:** Die Stadt, die man gerade nicht ansieht, läuft vereinfacht weiter: nur Waren und Einwohner, ohne laufende Figuren. So bleibt das Handy schnell und der Akku geschont.
- **Wechseln:** ein Knopf „Städte“ mit kleinem Bild, Einwohnerzahl und Warnung, wenn dort etwas fehlt.

## Warum es Spaß macht

- Neu anfangen, ohne alles zu verlieren: Man gründet klein, kann sich aber auf die erste Stadt stützen.
- Neue Landschaft und neue Bilder statt immer derselben Karte.
- Eigene Aufträge und ein eigenes Wunderwerk je Karte.
- 💡 Später auch eine dritte Stadt oder ein Blick auf die Weltkarte mit allen Städten.

## Technik

Der große Brocken: Heute gibt es genau eine Karte und ein `state`, alle Teile des Spiels greifen direkt darauf zu.

1. **Spielstand:** Waren, Gebäude und Karte wandern je Stadt in `state.cities`, der heutige Stand wird beim Laden zur Stadt 1. Alte Spielstände bleiben dadurch gültig, wie immer in `sanitizeState`.
2. **Karte:** Der Kartengenerator bekommt Landschaftsarten. Heute sind Fluss, See und Gebirge fest eingebaut.
3. **Vereinfachte Rechnung** für die nicht sichtbare Stadt, die bisherige Offline-Rechnung ist ein guter Anfang.
4. **Speichergröße:** Zwei Karten mit 512 × 512 Feldern brauchen mehr Platz im Handy, das muss vorher gemessen werden. Eine zweite Karte kann kleiner sein.
5. **Bilder:** Hafen, Schiff, neue Geländearten, grob 30 bis 60 Stück.

Das ist ein großer Umbau, der in mehreren Sitzungen mit Emin entsteht.

## Reihenfolge

| Schritt | Inhalt |
|---|---|
| 1 | Erst fertig: Bilder Steinzeit und Bronzezeit, Eisenzeit, Arbeitsbewegungen, Antike |
| 2 | ✅ Version 185 (13.11.): Spielstand auf mehrere Städte umgestellt, ohne dass man im Spiel etwas merkt (siehe unten) |
| 3 | Kleine zweite Karte, Wechseln zwischen den Städten |
| 4 | Vereinfachtes Weiterlaufen, Handelsrouten |
| 5 | Besonderheiten der Karte, Aufträge, Wunderwerk, Bilder |

## Entscheidungen von Emin (2026-11-13)

1. **Wann:** In der **Antike**. Die Forschung „Kolonien“ und ein Siedlerschiff schalten die zweite Stadt frei. Dafür muss erst die Antike gebaut werden.
2. **Erste Landschaft:** **Küste und Inseln**.
3. **Selbst wählen:** Ja, man sucht die Landschaft aus. Später lassen sich auch die anderen gründen.
4. **Weiterlaufen:** Ja. Die Stadt, die man gerade nicht ansieht, rechnet vereinfacht weiter: Waren und Einwohner, ohne Figuren.
5. **Forschung:** Ein gemeinsamer Forschungsbaum für alle Städte.
6. **Anzahl:** Erst zwei Städte. Die Technik wird aber so gebaut, dass später mehr möglich sind.

## Emins Idee vom 17.11.: Das Meer als Übergang

- **Erste Karte:** Der Fluss endet nicht mehr in einem See, sondern in einer großen Bucht. Dahinter liegt unten das offene
  Meer bis zum Kartenrand und darüber hinaus, davor ein paar kleine Inseln. ✅ Gebaut in Version 222, für alle Spielstände
  (niemand war bis dort gekommen; unter Gebäuden bliebe das Land trotzdem stehen).
- **Zweite Karte:** beginnt am anderen Ufer desselben Meeres: sonnig, viele Inseln, Lagunen und kleine Seen.
- **Verbindung:** In der Antike fährt das Siedlerschiff von der Bucht der ersten Karte über das Meer zur zweiten. Die
  Schiffsreise (Wunderwerk-Plan, `docs/plan-wunderwerke-spaeter.md`) startet am selben Hafen.
- Später: Bilder für Meer, Brandung und Horizont mit Scenario.

## Entscheidungen von Emin (17.11.): die Inselkarte

- **Start:** eine kleine antike Siedlung mit Forum, ein paar Ziegelhäusern und den Waren aus dem Siedlerschiff. Man spielt nicht noch einmal ab der Steinzeit.
- **Größe:** 256 × 256 Felder, ein Viertel der ersten Karte. Das spart Speicher und Akku. Viel davon ist Wasser.
- **Landschaft:**
  - sonnig, ohne Gebirge
  - eine Hauptinsel mit dem Anleger, wo das Siedlerschiff ankommt
  - rundherum viele kleine Inseln
  - Lagunen und kleine Seen
- **Besonderheiten** (alle vier gewählt):
  - 🫒 **Olivenhaine und Wein** wachsen nur hier. Das Olivenöl geht in die erste Stadt, wo es Bedürfnis ist.
  - 🌉 **Inseln erschließen:** Die Nachbarinseln erreicht man über Brücken (gibt es schon) oder einen Bootsanleger. Jede Insel ist wie ein neues Landstück.
  - 🪵 **Wenig Holz und Stein:** Bauholz und Stein kommen per Schiff aus der ersten Stadt.
  - 🧂 **Salz und Fisch:** Salzgärten an den Lagunen und reicher Fischfang.
- **Handel: feste Schiffsrouten.** Man legt einmal fest, was in welchem Takt fährt, zum Beispiel alle 10 Minuten 50 Holz hin und 30 Öl zurück. Ein Schiff fährt die Route von selbst, auch während man in der anderen Stadt spielt. Man sieht es auf beiden Karten aus- und einlaufen.
- **Ablauf in der Antike:**
  1. In der Mittleren Antike baut der Spieler den Hafen selbst. Er setzt ihn ans Wasser, meist an den Fluss beim Lager, und von dort muss das Wasser bis zum Meer reichen.
  2. Die Schiffsreise beginnt: Schiffe fahren den Fluss hinunter aufs Meer und bringen Waren und Fundstücke.
  3. Mit der Forschung „Kolonien“ kann man das Siedlerschiff beladen. Es fährt los, und die zweite Stadt entsteht.
  4. Danach kommen die Schiffsrouten zwischen beiden Städten.
- 💡 **Zwischen den Städten wechseln:** über einen Knopf „Städte“, oder indem man im Hafen das Schiff antippt.
- 💡 **Kein Wunderwerk auf der Inselkarte in der Antike.** Der Leuchtturm steht am Hafen der ersten Stadt. Die zweite Stadt bekommt ihr eigenes Wunderwerk erst in einem späteren Zeitalter.

## Gebaut: Spielstand für mehrere Städte (Version 185)

- Die Stadt, die man gerade spielt, liegt wie bisher direkt im Spielstand. Dadurch bleibt das ganze Spiel unverändert.
- Neu sind `city` (die Nummer der gespielten Stadt) und `cities` (Name und Landschaft jeder Stadt). Die übrigen Städte ruhen dort mit ihren Daten in `data`.
- **Je Stadt:** Karte, Gebäude, Land, Bäume, Waren außer Wissen, Einwohner, Händler, Wunderwerke, Fundstellen, Katastrophen. Die Liste steht in `CITY_KEYS` (`neu/js/speicher.js`).
- **Gemeinsam:** Forschung, Zeitalter, Wissen, Gold und Shop, Fundstücke und Album, Aufträge, tägliche Belohnung, Einstieg, Spielzeit und Jahreszeit.
- **Alte Spielstände** werden beim Laden zur „Ersten Stadt“.
- **Ruhende Städte** werden beim Laden wie ein eigener Spielstand geprüft. Eine kaputte ruhende Stadt fällt weg, die gespielte bleibt immer erhalten.
- **Funktionen:** `addCity(name, land, seed)` legt eine ruhende Stadt an. `switchCity(i)` wechselt; danach kommen `saveGame()` und `enterGame()`.
- Im Spiel gibt es noch keinen Knopf dafür. Das kommt mit Schritt 3, zusammen mit der Antike.
- Ruhende Städte laufen noch nicht weiter, das ist Schritt 4.
