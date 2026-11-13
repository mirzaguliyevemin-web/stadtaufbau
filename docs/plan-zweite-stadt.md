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
| 2 | Spielstand auf mehrere Städte umstellen, ohne dass man im Spiel etwas merkt |
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
