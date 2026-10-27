# Fehler und Wünsche von Emin

Einfach unten eine Zeile hinzufügen – auch am Handy auf github.com (Datei öffnen → Stift ✏️ →
„Commit changes“). Der tägliche Agent liest diese Liste jede Nacht, Claude zu Beginn jeder Sitzung.
Stichworte reichen, z. B. „- Farm zeigt falsche Arbeiterzahl nach dem Verschieben“.

## Fehler

<!-- Hier gefundene Fehler eintragen -->

## Wünsche

<!-- Hier Veränderungswünsche eintragen -->

## Erledigt

<!-- Claude verschiebt erledigte Punkte hierher, mit Datum und Version -->
- 2026-10-26, Version 43 – Wunschliste aus der Sitzung:
  - Forschung, Aufträge, Einstellungen als ganze Seite mit „← Zurück“; alle Fenster haben „← Zurück“,
    auch die Zurück-Geste am Handy schließt Fenster statt das Spiel.
  - Bauleiste am Handy: passt ein Name nicht, zeigt die Reihe nur Bilder (Kosten in der Kurzinfo).
  - Gebäude erst als Vorschau aufs Feld stellen (grün = passt, rot = passt nicht, mit dem Finger verschiebbar),
    gebaut wird erst mit ✔.
  - Bauzeit für alle Gebäude (Straßen, Brücken, Mauern sofort), Baustelle mit Gerüst und Restzeit.
  - Höchstens 2 Baustellen gleichzeitig (VIP-Modus mit mehr Baustellen steht als Plan in `vorschlaege.md`).
  - Karte 96 × 96 statt 64 × 64 (alte Städte liegen in der Mitte, gekauftes Land bleibt).
  - Menschen als kleine Figuren: Bauern hacken, Fischer angeln, Sägewerker sägen, Steinbrecher schlagen,
    Schmiede hämmern, Gelehrte lesen, Händler tragen Kisten.
  - Eigene Geräusche beim Antippen von Gebäuden (Säge, Amboss, Schaf, Glocke …), selbst erzeugt.
  - Raster nur noch beim Bauen/Verschieben sichtbar.
  - Offen: neue Gebäudebilder je Zeitalter – wartet auf Bilder von Emin (Ordner `bilder/`).
- 2026-10-26, Version 44 – 5 Zeitalter (Plan in `docs/zeitalter.md`): neue Städte starten in der Steinzeit
  (nur Holz, Stein, Nahrung; Hütte, Sammlerin, Jägerlager, Holzfäller, Steinsammler, Feuerstelle), Aufstieg
  zur Antike und zum Mittelalter über das Zeitalter-Fenster (oben antippen). Industrie und Moderne folgen.
- 2026-10-26, Version 46–49 – obere und untere Leiste in Holz/Pergament; Steinzeit schwerer; Forschung schon in der
  Steinzeit (Höhlenmaler, 4 Forschungen); Wassertrog löscht Brände und wird in der Antike zur Feuerwache;
  Seuchen erst ab der Antike; gesperrte Gebäude mit 🔒.
- 2026-10-26, Version 50–51 – Gebäudebilder aus Canva (Farm, Hütte, Sammlerin, Jägerlager, Kohlebergwerk, Stahlwerk,
  Fabrik, Mietshaus, Bahnhof, Polizeiwache, Uhrturm, Kraftwerk); Zeitalter Industrie und Moderne mit 6 neuen Waren,
  16 neuen Gebäuden, 5 Forschungen und 13 Aufträgen (Plan: `docs/zeitalter.md`).
- 2026-10-27, Version 52–54 – zweite Wunschliste (mit Bildern):
  - Bauleiste unten sprang beim Scrollen jede Sekunde zurück – behoben.
  - Querformat: flache Leiste oben, Bauleiste als Spalte rechts; hochkant erscheint „Handy drehen“ (Knopf für Vollbild quer).
  - Zwei-Finger-Zoom auf den Leisten vergrößert nicht mehr die Seite.
  - Sägewerk macht aus Holz Bretter (braucht Holz vom Holzfäller, sonst steht es still); die Schreinerei war doppelt und wird zum Sägewerk.
  - Zeitalter-Aufbruch oben in der Forschung: alle Forschungen des Zeitalters, jedes Gebäude einmal gebaut, genug Einwohner;
    der Aufbruch dauert 1:30–5 Min., Waren werden nach und nach geliefert (kein „99/100“-Problem mehr).
  - Gebäude weiterentwickeln im Info-Fenster (Hütte → Haus → Mietshaus → Hochhaus, Sammlerin → Farm, Steinsammler → Steinbruch …).
  - Mauer mit Funktion: Banditen müssen sie erst aufbrechen, Wachen wehren sie dort ab; neues Tor – zieht man eine Straße über
    die Mauer, entsteht automatisch ein Tor.
  - Straßen je Zeitalter: Trampelpfad, Pflaster, Asphalt mit Mittelstreifen; jedes Gebäude hat eine Tür, ein Weg führt zur Straße.
  - Langsamer: Forschung dauert doppelt so lange, Farm/Steinbruch/Steinsammler/Fischerhütte liefern weniger.
- 2026-10-27, Version 55 – Tägliche Belohnung in der Steinzeit ohne Geld: statt Geld je zur Hälfte Holz und Nahrung.
- 2026-10-27, Version 59 – Zeitalter-Aufbruch läuft offline weiter; wird offline die letzte Forschung fertig, beginnt er von selbst,
  beim Zurückkommen wechselt das Zeitalter sofort mit Meldung.
- 2026-10-27, Version 60 – Rückmeldung: Weg zur Farm sitzt an der Bildspitze; Spiel startet immer quer (hochkant gehaltenes
  Handy zeigt es gedreht, abschaltbar in den Einstellungen); Antippen eines Gebäudes beendet die Bauauswahl (setzte sonst das
  alte Gebäude); Wassertrog wird per Weiterentwickeln zur Feuerwache 2×1; Knopf oben rechts blendet die Leisten aus und ein.
