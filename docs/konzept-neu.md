# Epochia – neues Konzept (Plan)

Begonnen am 2026-10-28 mit Emin. **Noch nichts davon ist gebaut.** Wir reden jeden Punkt durch, tragen
die Entscheidungen hier ein und bauen dann **Epoche für Epoche**: erst das Fundament + die erste Epoche,
dann am Handy testen, Fehler beheben, verbessern – danach die nächste Epoche.

Zeichen: ✅ entschieden · ❓ offene Frage an Emin · 💡 Vorschlag von Claude

---

## 0 · Was wir vom jetzigen Spiel weiterverwenden

Das jetzige Spiel (Version 71, 9.200 Zeilen) hat schon viel, das bleiben kann – nur Aussehen und Bedienung
werden neu:

| Bleibt (wird angepasst) | Wird neu |
|---|---|
| Wirtschaft: Waren, Arbeiter, Bedürfnisse, Zufriedenheit, Lager | Ansicht (schräg statt von oben) |
| Baustellen mit Bauzeit, höchstens 2 gleichzeitig | Bedienung (Ziehen, Antippen, Hochheben, Drehen) |
| Weiterentwickeln von Gebäuden (Hütte → Haus …) | Forschung als Baum |
| Zeitalter-Aufbruch (Bedingungen, läuft offline weiter) | Epochen-Liste (siehe Punkt 5) |
| Karten mit Flüssen, Wald, Bergen, Jahreszeiten | Religionen |
| Landkauf, Aufträge, tägliche Belohnung, Erfolge | Startseite und Ladefenster |
| Menschen-Figuren bei der Arbeit | alle Bilder, Sounds, App-Icon, Name |
| Speichern (3 Spielstände), Export/Import, offline (PWA) | |
| Tests (`tools/test.mjs`) und Balancing-Bot | |

💡 **Technik:** Beim Neustart teilen wir `game.js` in mehrere Dateien auf (Daten / Spiellogik / Zeichnen /
Bedienung). Dann bleibt alles übersichtlich, auch wenn 9 Epochen dazukommen.

💡 **Altes Spiel nicht kaputt machen:** Das alte Spiel läuft live und hat echte Spielstände. Vorschlag:
Das neue Spiel bekommt eigene Speicherplätze (`stadtaufbau2-…`), die alten Stände bleiben unberührt.
Während wir bauen, liegt das neue Spiel unter einer eigenen Adresse (z. B. `…/stadtaufbau/neu/`), damit
du es am Handy testen kannst, ohne dass das alte Spiel kaputtgeht. Wenn die erste Epoche gut ist, wird
das neue Spiel die Hauptadresse.
✅ 2026-10-28: **Komplett neu anfangen** – alte Städte waren zum Testen und werden nicht übernommen.
Das neue Spiel bekommt trotzdem eigene Speicherplätze und wird bis zur fertigen ersten Epoche unter `…/neu/` gebaut,
damit das Spiel unter der Hauptadresse nie halb fertig ist. `CLAUDE.md` (Regeln zu alten Spielständen und für den
täglichen Agenten) wird beim Bauen an das neue Spiel angepasst.

---

## 1 · Ansicht: schräg von der Seite (isometrisch)

Gewünscht: keine Draufsicht, sondern schräg von der Seite, damit es 3D-mäßig aussieht.

💡 **Vorschlag: klassische isometrische Ansicht** wie in den bekannten Handy-Aufbauspielen:
- Jedes Feld ist eine Raute (doppelt so breit wie hoch). Gebäude stehen auf der Raute und ragen nach oben.
- Hintere Gebäude werden zuerst gezeichnet, vordere davor – so verdecken vordere Gebäude die hinteren.
- Die Spiellogik (Raster, Felder, Umkreise) bleibt gleich, nur das Zeichnen und das Antippen
  (welches Feld liegt unter dem Finger?) werden umgerechnet.
- Die vorhandenen Bilder sind schon schräg gezeichnet und passen grundsätzlich – für die neuen Bilder legen
  wir den Blickwinkel genau fest (siehe Punkt 7), damit sie exakt auf die Rauten passen.
- Gelände (Gras, Wasser, Sand, Berge, Bäume) wird als Rauten-Kacheln gezeichnet und **vorab in Stücke
  vorgezeichnet** – das behebt gleich das Ruckeln seit Version 71.

❓ Soll man die Karte drehen können (4 Richtungen)? 💡 Empfehlung: **nein** – feste Blickrichtung. Drehen
der Karte würde jedes Gebäude-Bild 4-mal brauchen.

---

## 2 · Religionen

Gewünscht: Ab einer bestimmten Epoche wählt man eine Religion; danach ändern sich die Gebäude passend.

💡 Vorschlag zum Ablauf:
- **Steinzeit bis Eisenzeit:** Naturglaube / Ahnenkult für alle (Steinkreis, Opferstein, Schamane) – keine Wahl.
- **Wahl beim Aufbruch in die Antike** (dort entstehen die ersten großen Tempel). Die Wahl gilt für den Spielstand.
- Jede Religion hat **eigene Gebäude-Bilder** für die religiösen Gebäude (Tempel, Gotteshaus, Kloster,
  Friedhof, Pilgerort …) und einen **kleinen eigenen Vorteil** (z. B. mehr Zufriedenheit, mehr Wissen, mehr Handel).
- 💡 Nur die religiösen Gebäude (und vielleicht ein paar Schmuckstücke) ändern sich, nicht jedes Haus –
  sonst bräuchte jede Religion einen kompletten eigenen Bildersatz (Bildanzahl × Religionen).

✅ 2026-10-28: **A – echte Weltreligionen.** Die Möglichkeiten waren:
- **A – echte Weltreligionen** (z. B. Christentum, Islam, Judentum, Buddhismus, Hinduismus). Dann gestalten wir
  alles respektvoll und gleichwertig, kein Glaube ist „besser“; die Vorteile sind nur kleine Spielunterschiede.
- **B – Götterwelten der Antike** (ägyptisch, griechisch-römisch, nordisch, mesopotamisch) in der Antike,
  und ab dem Mittelalter echte Weltreligionen.
- **C – ausgedachte Religionen** (z. B. Sonnenorden, Mondbund, Erdkreis) – frei gestaltbar, keine heiklen Stellen.

💡 Auswahl: Christentum, Islam, Judentum, Buddhismus, Hinduismus – je mit eigenem Gotteshaus (Kirche, Moschee,
Synagoge, Pagode/Stupa, Mandir) und eigenen Bildern; alle gleich stark, nur unterschiedliche kleine Vorteile.
✅ 2026-10-28: Auswahl passt. Wechseln geht nach einer bestimmten Zeit – ❓ wann, überlegt Emin noch.

---

## 3 · Forschungsbaum

Gewünscht: Man sieht alle Forschungen, muss aber erst die vorherigen erforschen.

💡 Vorschlag:
- Eigene Seite „Forschung“: **Baum von links nach rechts**, mit dem Finger verschiebbar und zoombar.
- Jede Epoche ist ein Abschnitt (Spalten) mit Überschrift; ganz rechts in jedem Abschnitt steht
  „Aufbruch in die nächste Epoche“.
- Jede Forschung ist eine Karte mit Bild, Name, Kosten, Dauer. Linien zeigen, was davor nötig ist.
- Farben: **erforscht** (golden), **jetzt möglich** (hell, leuchtet), **gesperrt** (grau mit 🔒 – man sieht
  trotzdem, was es bringt).
- Forschungen schalten frei: neue Gebäude, Weiterentwicklungen, Boni (mehr Produktion, mehr Wohnplätze …).
- „Sehr viele Forschungspunkte zwischen jeder Epoche“: 💡 **etwa 12–20 Forschungen je Epoche**, mehrere
  Äste nebeneinander (z. B. Nahrung · Bauen · Handwerk · Wissen/Glaube · Verteidigung).
- Im Code gibt es schon `requires` (Voraussetzungen) – das wird zum Baum ausgebaut.

✅ 2026-10-28: Forschung kostet **Wissen und Zeit**; es läuft immer nur **eine** Forschung gleichzeitig.

---

## 4 · Startseite und Ladefenster

Gewünscht: Startseite mit Bild und „Start“; danach öffnet sich die Karte.

💡 Vorschlag:
1. **Ladefenster** (beim Öffnen der App): Spielname/Logo, Ladebalken, kurzer Spruch („Die ersten Menschen
   entfachen ein Feuer …“).
2. **Startseite**: großes Bild von Emin, darauf Knöpfe **Start** (letzter Spielstand), **Spielstände** (3 Plätze),
   **Einstellungen** (Ton, Musik). Leise Musik spielt.
3. Start → kurze Blende → Karte.

Bildformat Startseite: **quer 16:9 (1920 × 1080)**, weil das Spiel immer quer läuft. In der Mitte unten
oder an einer Seite etwas Ruhe im Bild lassen, damit die Knöpfe lesbar sind; Ränder können am Handy
abgeschnitten werden (wichtige Dinge in die Mitte).
❓ Wartet auf dein Bild (und den Spielnamen).

---

## 5 · Epochen

Emins Liste:

| Abschnitt | Epoche | Unterteilung |
|---|---|---|
| Vorgeschichte | Steinzeit | Altsteinzeit · Mittelsteinzeit · Jungsteinzeit (sesshaft) |
| | Bronzezeit | |
| | Eisenzeit | |
| Historische Zeit | Antike | |
| | Mittelalter | Früh- · Hoch- · Spätmittelalter |
| | Frühe Neuzeit | Renaissance, Entdeckungen, Reformation |
| | Jüngere Neuzeit | Revolution, Industrialisierung |
| | Zeitgeschichte | 20./21. Jh., Weltkriege, Kalter Krieg, Digitalisierung |

💡 Vorschlag: **8 Epochen mit eigenem Aussehen** (eigene Bilder), die Unterteilungen (Alt-/Mittel-/Jungsteinzeit,
Früh-/Hoch-/Spätmittelalter) sind **Stufen im Forschungsbaum** mit ein paar neuen Gebäuden je Stufe:

1. Steinzeit – Altsteinzeit: Jäger und Sammler, Zelte, Feuer, keine festen Felder
   → Mittelsteinzeit: Fischfang, Boote, Pfeil und Bogen → Jungsteinzeit: **sesshaft**, Ackerbau, Vieh, Töpfern, Langhaus
2. Bronzezeit – Kupfer + Zinn schmelzen, erste Werkstätten, Handel, Grabhügel
3. Eisenzeit – Eisenerz, Schmiede, Befestigte Siedlung, Pflug
4. Antike – **Schrift**, Geld, Stein-Tempel, Märkte, Theater, Aquädukt · **Wahl der Religion**
5. Mittelalter – Burg, Mühle, Zünfte, Kathedrale; Stufen Früh/Hoch/Spät (Pest als Ereignis?)
6. Frühe Neuzeit – Druckerei, Hafen und Entdeckungen, Kolonialwaren (Zucker, Kaffee), Renaissance-Paläste
7. Jüngere Neuzeit – Dampfmaschine, Fabriken, Eisenbahn, Kohle und Stahl
8. Zeitgeschichte – Strom, Autos, Hochhäuser, Computer, Flughafen, Solar

💡 Weltkriege/Kalter Krieg: Für ein **fröhliches, ruhiges** Spiel (Punkt 8) eher nur als Forschung/Technik
erwähnen (Funk, Raumfahrt, Computer), ohne Krieg im Spiel.
✅ 2026-10-28: **8 Epochen**, die Unterteilungen sind Stufen im Forschungsbaum (wie vorgeschlagen).

---

## 6 · Größere Gebäude

Gewünscht: Gebäude sind zu klein. Emin hat am 2026-10-28 drei Beispielbilder aus einem anderen Handy-Aufbauspiel
geschickt (als Vorbild für Größe und Stimmung, nicht zum Nachbauen).

Was man auf den Beispielen sieht:
- Schrägansicht, Raute doppelt so breit wie hoch; nah herangezoomt – quer passen nur etwa **8–12 Gebäude** auf
  den Bildschirm, jedes Gebäude ist groß und detailreich (Fenster, Zäune, Säcke, Tiere, Menschen davor).
- Gebäude stehen auf einem **eigenen Grundstück** (Rasen, Zaun, Hof) – das Grundstück gehört zum Gebäude.
- Breite Straßen, viel sattes Grün, Blumen, Bäume als Lückenfüller; kräftige, helle Farben.
- Über arbeitenden Gebäuden **Sprechblasen** mit dem, was sie herstellen (Milch, Käse, Pullover).
- Beim Verschieben/Kaufen: Gebäude schwebt mit **grünen Eckmarken** am Boden, unten ein Feld
  „Kaufen für 160“ mit **✖ · ↻ · ✔**.

💡 Vorschlag daraus:
- Gebäude **belegen mehr Felder** (kleine 2×2, mittlere 3×3, große 4×4) und das Bild enthält das Grundstück.
- **Start-Zoom näher** (etwa 10 Felder quer), Herauszoomen bleibt möglich.
- Sprechblasen über Gebäuden für das, was gerade hergestellt wird (ersetzt die schwebenden Zahlen).

---

## 7 · Bilder und Sounds (Emin erzeugt, Claude liefert die Prompts)

Claude schreibt für **jedes** Bild einen Prompt; Emin erzeugt und kontrolliert; Claude schneidet zu und baut ein.
Liste der Prompts kommt in `bilder/README.md` (je Epoche ein Abschnitt), Emin hakt ab, was fertig ist.

💡 Feste Regeln für alle Gebäude-Bilder (damit alles zusammenpasst):
- **Gleicher Blickwinkel**: isometrisch, Kamera von vorne-rechts oben, Raute am Boden doppelt so breit wie hoch.
- Gleiches Licht (von links oben), gleiche Farbwelt (hell, fröhlich, sanfte Farben).
- Gebäude steht auf einer **Rauten-Bodenplatte in genau der Feldgröße** (2×2, 3×3 …) – so passt es aufs Raster.
- **Transparenter oder weißer Hintergrund**, kein Text, kein Rahmen; mindestens 1024 px.
- Entwurf Stil-Satz (wird noch an dein Beispielbild angepasst):
  > Style: bright cheerful cartoon game asset, soft warm colors, clean outlines, gentle shading, isometric view
  > (2:1 isometric angle) like a cozy mobile city building game, sunlight from top left, standing on a
  > diamond-shaped grass base, centered on a plain white background, no text, no border, consistent style

Gebraucht werden außerdem:
- **Startseiten-Bild** (16:9), **Ladefenster** (passend zum Namen), **App-Icon** (1024 × 1024, wichtiges Motiv
  in der Mitte, weil Handys die Ecken rund abschneiden).
- **Gelände** je Epoche/Jahreszeit (Gras-Raute, Wasser, Sand, Bäume, Felsen), **Forschungs-Bildchen** (klein, rund).
- **Sounds**: Hintergrundmusik je Epoche (ruhige Schleife, 1–3 Min.), Natur-Geräusche (Vögel, Wasser, Wind,
  Grillen nachts), Klicks/Knöpfe, „Bau fertig“, „Forschung fertig“, „Neue Epoche“ und ein Geräusch je Gebäude
  beim Antippen. ❓ Womit Emin Sounds erzeugt, entscheidet er später – dann passe ich die Prompts an das Werkzeug an. Format für uns: MP3 oder OGG.

---

## 8 · Stimmung: hell, fröhlich, ruhig

💡 Vorschlag:
- Helle, warme Farben, weiche Schatten, Sonne; Nacht nur sanft (blauer Schimmer, Lichter in Fenstern).
- Leise Musik und Naturgeräusche, Lautstärke getrennt einstellbar.
- Kleine lebendige Dinge: Vögel, Schmetterlinge, Rauch aus Schornsteinen, winkende Menschen, Tiere auf Weiden.
- Kein Zeitdruck, kein Verlieren.

✅ 2026-10-28: **Banditen, Brände und Seuchen fallen weg.** (Damit entfallen auch Wachen, Feuerwache, Mauerkampf.)

---

## 9 · Bedienung der Gebäude

Gewünscht:
- **Bauen:** Gebäude in der Bauleiste mit dem Finger festhalten und auf einen freien Platz ziehen.
- **Bauzeit:** jedes Gebäude hat eigene Bauzeit, höchstens 2 Baustellen gleichzeitig (gibt es schon).
- **Einmal antippen:** kleine Info unter dem Gebäude, z. B. „Haus +5 Einwohner“.
- **Drücken und halten:** Gebäude hebt sich, schwebt; frei verschieben und drehen.

💡 Vorschlag zu den Einzelheiten:
- Beim Ziehen zeigt die Raute **grün** (passt) oder **rot** (passt nicht). Nach dem Loslassen
  kommt ✔ zum Bestätigen (✅ 2026-10-28).
- Kleine Info: verschwindet nach ein paar Sekunden oder beim nächsten Tippen; tippt man **auf die Info**,
  öffnet sich das große Fenster (Arbeiter, Weiterentwickeln, Abreißen).
- Hochheben: nach ca. 0,4 s halten wackelt das Gebäude kurz und schwebt mit Schatten; daneben erscheinen
  **↻ Drehen**, **✔ Abstellen**, **✖ Zurück**.
- Drehen: 💡 **2 Richtungen** (Bild gespiegelt) – kostet keine zusätzlichen Bilder; so macht es auch das
  Beispielspiel (↻-Knopf). 4 Richtungen bräuchten je Gebäude 2 weitere Bilder (Rückseiten). ✅ 2026-10-28: 2 Richtungen.
- Unten beim Bauen/Verschieben ein Feld wie im Beispiel: Preis + **✖ · ↻ · ✔** (große, runde Knöpfe).
- Karte verschieben: mit dem Finger auf freiem Gelände ziehen; Zoomen mit zwei Fingern (wie jetzt).

---

## 10 · Spielname

✅ 2026-10-28: Das Spiel heißt **Epochia**. Ladefenster, Startseite und App-Icon werden dazu passend gestaltet.

| Name | Idee |
|---|---|
| **Zeitenwandel** | die Stadt wächst durch alle Zeiten |
| **Von Stein zu Stern** | von der Steinzeit bis zur Raumfahrt |
| **Epochia** | Fantasie-Name aus „Epoche“, international verständlich |
| **Chronopolis** | griech. „Zeit-Stadt“ |
| **Sonnental** | ruhig, fröhlich, ein Tal, das durch die Zeiten wächst |
| **Menschenzeit** | die Geschichte der Menschen |
| **Feuer bis Funk** | vom ersten Feuer bis zum Internet |
| **Aeterna** | lat. „die Ewige“ |

---

## Stand der Planung (2026-10-28, vor Neustart des Rechners)

**Erledigt in der Sitzung vom 2026-10-28:**
- Plan geschrieben (diese Datei) und Emins Entscheidungen eingetragen (Name **Epochia**, 8 Epochen, Weltreligionen,
  keine Katastrophen, Bauen mit ✔, 2 Drehrichtungen, Forschung mit Wissen + Zeit, komplett neu anfangen).
- Emins Beispielbilder ausgewertet (große Gebäude mit Grundstück, nah gezoomt, Sprechblasen, ✖ ↻ ✔).
- Epoche 1 Steinzeit ausgearbeitet: `docs/epoche-1-steinzeit.md` (Gebäude-Linien durch alle Epochen, Wohnhöhle,
  Pfahlbau, Mammutjagd, 22 Forschungen, Einstieg mit dem Stammesältesten, Aufträge, tägliche Belohnung).
- 77 Bild-Prompts: `bilder/epochia/README.md` (mit Gruppen) und `bilder/epochia/prompts.txt` (nur Text).

**Als Nächstes:**
1. Emin erzeugt **Gruppe A** (Lagerfeuer, Wohnhöhle, Sammlerin) → in `bilder/epochia/` ablegen → Claude prüft
   Blickwinkel/Grundstück, passt den Stil-Satz an → bestes Bild wird Stil-Vorlage für den Rest.
2. Emin sagt, ob Claude mit dem **Fundament** anfangen soll (Schrägansicht, Bedienung, Startseite, Forschungsbaum,
   Einstieg – mit Platzhaltern unter `…/neu/`).

**Noch offen (Emin entscheidet später):** Werkzeug für Sounds · ab wann man die Religion wechseln darf.

## Epochen im Detail

- Epoche 1 Steinzeit: [`docs/epoche-1-steinzeit.md`](epoche-1-steinzeit.md) (Entwurf)

## Reihenfolge zum Bauen

1. **Alle Punkte oben mit Emin entscheiden** (diese Datei).
2. **Fundament:** Schrägansicht, neue Bedienung, Startseite/Ladefenster, Forschungsbaum-Seite, eigene
   Speicherplätze, Aufteilung von `game.js`, Tests anpassen. Zum Testen mit den vorhandenen Bildern.
3. **Epoche 1 Steinzeit:** Gebäude, Forschungsbaum (Alt-/Mittel-/Jungsteinzeit), Prompts für alle Bilder und
   Sounds → Emin erzeugt → einbauen.
4. **Am Handy testen**, Fehler beheben, verbessern, Bot-Werte prüfen.
5. Nächste Epoche (Bronzezeit) – gleicher Ablauf.

## Entscheidungen

<!-- Hier wird jede Entscheidung mit Datum eingetragen -->
- 2026-10-28: Neustart beschlossen; vorhandene Spiellogik wird weiterverwendet; gebaut wird Epoche für Epoche.
- 2026-10-28: Name **Epochia** · komplett neu, alte Städte nicht übernehmen · 8 Epochen, Unterteilungen als
  Forschungsstufen · echte Weltreligionen · keine Banditen/Brände/Seuchen · Bauen mit ✔ · 2 Drehrichtungen ·
  Forschung kostet Wissen + Zeit, eine gleichzeitig · Sound-Werkzeug entscheidet Emin später.
