# Fehler und Wünsche von Emin

Einfach unten eine Zeile hinzufügen – auch am Handy auf github.com (Datei öffnen → Stift ✏️ →
„Commit changes“). Der tägliche Agent liest diese Liste jede Nacht, Claude zu Beginn jeder Sitzung.
Stichworte reichen, z. B. „- Farm zeigt falsche Arbeiterzahl nach dem Verschieben“.

## Fehler

<!-- Hier gefundene Fehler eintragen -->
- Spiel ruckelt etwas seit den Gelände-Bildern (Version 71).
  → Frage: wird am 2026-10-28 in einer Sitzung mit Emin gebaut (Gelände vorab in Bildstücke zeichnen statt jedes Bild
  in jedem Bild neu) – der tägliche Agent bitte nicht anfassen.
  → 2026-10-28: Im neuen Spiel Epochia (`neu/`) wird der Boden schon vorab in Stücke gezeichnet. Das alte Spiel
  bleibt vorerst, wie es ist – Emin sagt, ob es dort noch behoben werden soll.

## Wünsche

<!-- Hier Veränderungswünsche eintragen -->
- Gebäude 4× drehen: Dreh-Ansichten für die übrigen Gebäude (Canva, nach und nach). Wasser-Gebäude sind fertig (Emin, 31.10.).

## Erledigt

<!-- Claude verschiebt erledigte Punkte hierher, mit Datum und Version -->
- 2026-10-31, Epochia Version 23 – Bäume werden echt gefällt: Hat ein Holzsammler 20 Holz beisammen, kippt der nächste Baum
  im Umkreis um und verschwindet (Krachen). Ohne Wald sammelt er nur noch Fallholz. Neues Gebäude **Pflanzerin** (Altsteinzeit,
  Bild aus Canva) setzt jede Minute einen Setzling, nach 10 Minuten (im Winter langsamer) ist ein Baum daraus gewachsen.
  In späteren Zeitaltern kommt dafür der Förster.
- 2026-10-31, Epochia Version 23 – Gebäude 4× drehen (↻): Fischerplatz, Tongrube und Pfahlbau haben neue Ansichten aus Canva
  (Wasser hinten, rechts, vorne, links) und drehen sich beim Platzieren von selbst zum Fluss. Andere Gebäude: vorne,
  gespiegelt (weitere Ansichten folgen).
- 2026-10-31, Epochia Version 22 – Emins Liste vom 31.10. (Teil 1):
  - Wetter wirkt: Sonne +15 % Sammlerinnen/Äcker, Regen hilft Äckern und bremst Jäger, Hagel zerschlägt die Ernte, Schnee
    macht hungrig; neu **Gewitter** (Blitze, Donner, draußen −40 %, kein Zuzug) und **Sturm** (Bäume biegen sich, Fischer
    bleiben an Land, Windbruch +20 % Holz). Alles steht im Wetter-Fenster oben rechts.
  - Tag + Nacht dauern jetzt 30 Minuten, jede Jahreszeit 30 Minuten (Jahr = 2 Stunden), Wetter hält 6 Minuten.
  - **Naturkatastrophen** (sehr selten, etwa alle 3 Spielstunden, nie in der ersten Dreiviertelstunde): Dürre, Hochwasser,
    Waldbrand (Bäume verbrennen), Kältewelle, Fieber – mit Meldung, Färbung der Karte und Restzeit.
  - Wissen hat überall dasselbe Bild (Leiste, Forschungsfenster, Sprechblasen über den Gebäuden).
  - Fehler: Baum/Felsen direkt neben einem Gebäude ließ sich nicht antippen – jetzt wird pixelgenau am Gebäudebild geprüft.
  - Bauleiste zeigt nur Gebäude des eigenen Zeitalters; Gesperrtes nennt die nötige Forschung und öffnet sie beim Antippen.
  - Zurück-Knopf und Zurück-Geste: Menü → Spielstände → Zurück führt ins Menü; Dialoge schließen zuerst.
  - Langsamer: Forschung doppelt so lang und +50 % Wissenskosten, Höhlenmaler −30 % Wissen, Holz/Stein/Ton/Felle −20 %,
    Bauzeiten +50 % (Regler `CONFIG.tempo` in `neu/js/daten.js`). Bot: Mittelsteinzeit nach ≈ 2,5–3 Stunden.
  - Treffpunkte: Leute sitzen am Feuer, tanzen abends ums Feuer, beten am Ahnenplatz/Steinkreis.
  - Geräusche: jedes Gebäude klingt beim Antippen anders (Feuer knistert, Axt, Ziege, Horn …), dazu Bauen, Fertig,
    Forschung, Belohnung, Donner (mit Code erzeugt, abschaltbar im Menü).
  - Infos zum Selbst-Abrufen: Gebäude-Fenster „ℹ️ Was bewirkt das genau?“ (Umkreis, Bedürfnis, Rechnung der Produktion);
    Waren oben antippen = Einnahmen und Ausgaben je Gebäude; Einwohner, Zufriedenheit und Wetter ebenso.
  - iPhone: Drehen verzerrt nichts mehr; hochkant kommt ein Hinweis, das Handy quer zu halten.
  - Knopf 📐 Grundriss: Gebäude nur als flache Platten, um Wege dahinter zu bauen.
- 2026-10-31, Epochia Version 22 – Bot und Tests: Der Bot hing mit der großen Karte über eine Stunde – jetzt 20 Sekunden.
- 2026-10-31, Epochia Version 22 – Arbeitende Menschen (Teil 2): Fischer stechen am Ufer mit dem Speer (es spritzt), der
  zweite paddelt im Einbaum (Bild aus Canva) hinaus; Höhlenmaler tupfen Farbe an die Felsen und bringen Wissen heim; die
  Tongrube gräbt am Ufer und trägt Ton; Fellmacherin schabt ein Fell, Steinschläger schlägt Splitter, Töpferin formt einen
  wachsenden Topf – jeweils direkt vor ihrem Haus.
- 2026-10-31, Epochia Version 22 – Fehler: Bei Spielbeginn im Frühling zeigten manche Gebäude kurz das Winterbild.
- 2026-10-31, Epochia Version 22 – Karte viermal so groß (128 × 128 Felder); alte Spielstände liegen mit allen Gebäuden, Land
  und Wegen genau in der Mitte, das Gelände dort bleibt Feld für Feld gleich.
- 2026-10-31, Epochia Version 22 – Gebirge: zwei Bergketten in den Ecken der neuen Karte mit Vorbergen aus Felsen; Bilder aus
  Canva (großer Schneegipfel, Felsberg, Gebirgsboden). Gebirge kann man nicht bebauen und nicht abtragen.
- 2026-10-31, Epochia Version 21 – Arbeitende Menschen (Teil 1): Holzsammler gehen zu Bäumen und hacken mit der Axt (Späne
  fliegen), Steinsammler schlagen mit der Spitzhacke am Felsen (Splitter), Sammlerinnen pflücken Beeren, Jäger ziehen in den
  Wald; alle tragen die Beute (Holz, Stein, Nahrung) zurück. So viele Figuren, wie dort arbeiten (höchstens 2 je Gebäude).
- 2026-10-30, Epochia Version 20 – Brücke: Pfade gehen nicht mehr aufs Wasser; malt man einen Pfad über den Fluss, entsteht dort
  automatisch eine Holzbrücke (8 Holz je Feld, Bild aus Canva, auch in der Bauleiste unter Wege). Auch „Weg bauen“ nutzt Brücken.
- 2026-10-30, Epochia Version 20 – Forschungsleiste mitten auf der Karte entfernt: Restzeit und Balken stehen am Forschung-Knopf.
- 2026-10-30, Epochia Version 20 – Flussufer schöner: runde, geschwungene Uferlinie statt Rauten, neue Ufer-Textur mit Kieseln
  und Strandgras (Canva), dunkler nasser Sand am Wasser, heller Schaumsaum, weicher Übergang zur Wiese.
- 2026-10-30, Epochia Version 20 – Offline werden höchstens 2 Stunden nachgerechnet (vorher 8).
- 2026-10-30, Epochia Version 20 – Wege zu Gebäuden: nur noch ein Zugang je Gebäude (an der Vorderseite, möglichst mittig)
  statt mehrerer Stummel.
- 2026-10-30, Epochia Version 19 – Trampelpfade schöner: neue Erd-Textur mit Steinchen (Canva), Pfade sind zusammenhängende,
  runde Wege mit dunklerem Rand und führen bis an die Gebäude (statt einzelner Sand-Rauten); im Winter leicht verschneit.
- 2026-10-30, Epochia Version 19 – Untere Leiste am Handy war zu hoch: Karten liegen quer, Kategorien als kleine Symbole links
  in der Leiste (etwa halb so hoch); Knopf ▾ klappt die Leiste ganz ein, „🔨 Bauen“ wieder auf (bleibt gespeichert).
- 2026-10-30, Epochia Version 18 – Update-Meldung: Ist eine neue Version online, erscheint oben „✨ Neue Version … ist da!“ mit
  Knopf „🔄 Jetzt aktualisieren“ (speichert und lädt neu); im Menü „🔄 Nach Updates suchen“.
- 2026-10-30, Epochia Version 18 – Forschungsfenster neu: Reiter je Zeitalter mit Fortschritt (z. B. 3/7), Karten in Spalten,
  Pfeile nur zwischen Nachbarspalten (nichts läuft mehr hinter Karten), Übergang als eigene Karte „braucht alle Forschungen“,
  Baum passt sich dem Bildschirm an; am Handy stehen die Infos rechts neben dem Baum.
- 2026-10-30, Epochia Version 18 – Leisten im Stil des Zeitalters (Canva): unten Holzstämme mit Seilbindung, oben Leder mit Naht.
- 2026-10-30, Epochia Version 18 – Winterbilder für alle 23 Gebäude aus Canva (Schnee auf Dächern und Platte, Eiszapfen,
  Feuer brennen weiter, Wasser am Rand gefroren); im Winter wechseln die Gebäude versetzt aufs verschneite Bild.
  Jahreszeiten-Bilder laden im Hintergrund nach, damit der Start nicht länger dauert.
- 2026-10-30, Epochia Version 17 – Tag und Nacht, Wetter und Jahreszeiten: Abendrot, dunkle Nacht mit leuchtenden Feuern;
  Sonne, Wolken (ziehende Schatten), Regen mit Spritzern, Hagel, Schnee – je nach Jahreszeit; Schneedecke im Winter,
  Herbstfarben und fallendes Laub, Blütenblätter im Frühling; Bäume aus Canva je Jahreszeit (Blüten, buntes Laub, kahl
  und verschneit). Oben rechts zeigt das Symbol Jahreszeit und Wetter, antippen nennt auch die Tageszeit. Bisher nur fürs
  Auge – keine Wirkung auf die Wirtschaft. Zeiten (Tag 160 s, Wetter 75 s) stehen in `CONFIG` und werden später angepasst.
- 2026-10-30, Epochia Version 16 – letzte Bilder aus Canva: Truhe (Belohnungs-Knopf und -Fenster), Schriftband aus Leder hinter
  den Seitentiteln, rundes Logo im Menü. Damit sind alle 80 Bild-Prompts erledigt.
- 2026-10-30, Epochia Version 15 – Mammutjagd: nach der Forschung „Mammutjagd“ ein Mammut antippen, die Jäger ziehen los und
  bringen nach 1 Minute Fleisch und Felle (mit Mammutjägerlager mehr); danach kommt nach ein paar Minuten die nächste Herde.
  Der Stammesälteste erklärt es beim ersten Mal. Ab der Jungsteinzeit sind die Mammuts ausgestorben.
- 2026-10-30, Epochia Version 14 – alle 24 Forschungen haben Bilder aus Canva.
- 2026-10-30, Epochia Version 13 – Gebäude entwickeln sich mit dem Zeitalter weiter (z. B. alle Wohnhöhlen werden Fellzelte),
  in der Leiste und auf dem Feld; gilt auch für alte Spielstände.
- 2026-10-30, Epochia Version 13 – Ränder der Gebäude passten nicht zusammen (mal Holz, mal Stein, mal nur Gras): alle haben
  jetzt denselben Erdsockel (Textur aus Canva).
- 2026-10-30, Epochia Version 13 – Baum antippen zeigt eine Axt, Felsen eine Spitzhacke; darauf tippen fällt bzw. trägt ab
  (mit Fallbewegung).
- 2026-10-30, Epochia Version 13 – Waren-Symbole aus Canva (statt Emojis), auch bei Kosten und Belohnungen.
- 2026-10-30, Epochia Version 12 – Zeitalter kamen viel zu schnell, man brauchte nur 3 Häuser: Forschungen dauern etwa fünfmal
  so lang, kosten mehr Wissen und Waren und brauchen eine Mindestzahl Einwohner (Steinzeit ≈ 6 Stunden, Bronzezeit-Aufbruch
  mit 120 Einwohnern); Landpreis bleibt unter dem Lagerplatz.
- 2026-10-30, Epochia Version 12 – Beine von Rehen & Co. bewegten sich nicht: Vorder- und Hinterbeine schwingen beim Laufen.
- 2026-10-30, Epochia Version 12 – Einwohnerzahl oben war nicht zu sehen: obere Leiste repariert, Seitenknöpfe rutschen darunter.
- 2026-10-30, Epochia Version 12 – Bauleiste mit Kategorien (Wohnen, Nahrung, Rohstoffe, Handwerk, Feuer & Glaube, Wege).
- 2026-10-30, Epochia Version 11 – mehr Leben: Menschen laufen auf den Trampelpfaden, Hirsche und eine Mammutherde ziehen
  umher, Ziegen grasen am Gehege, Fische springen, Vögel fliegen vorbei, Schmetterlinge über den Blumen (Bilder aus Canva).
- 2026-10-30, Epochia Version 10 – Forschung, Aufträge und Menü neu gestaltet (Epochen-Streifen und Banner, leuchtende
  Karten, Detailkarte; Auftragskarten mit Bild, Balken und Belohnung; Menü mit Kacheln und Schaltern);
  ⏸ Pause direkt in der kleinen Gebäude-Info.
- 2026-10-30, Epochia Version 9 – Sackgasse „Steinsammler ohne Personal, kein Stein für eine Wohnhöhle“: Gebäude lassen sich
  pausieren (⏸ im Gebäudefenster, die Leute arbeiten dann anderswo); der Stammesälteste erklärt, was hilft, wenn ein Gebäude
  ohne Arbeiter dasteht (auch: Felsen antippen gibt Stein).
- 2026-10-30, Epochia Version 8 – Leben im Bild: Wasser fließt und glitzert, Feuer flackert mit Funken, Rauch steigt aus
  Lagerfeuer, Feuerstellen, Langhaus und Töpferei, Bäume wiegen sich im Wind.
- 2026-10-30, Epochia Version 8 – Gebäude standen unterschiedlich hoch (verschieden dicke Sockel in den Bildern):
  jetzt haben alle dieselbe Sockelhöhe.
- 2026-10-30, Epochia Version 7 – Gelände und Wege als Bilder (Canva): Wiese, Wasser, Sand und Trampelpfad als Boden-Texturen,
  dazu Birke, Busch und Blumen.
- 2026-10-30, Epochia Version 6 – Gebäude standen schief, Wege sahen neben Gebäuden abgeschnitten aus bzw. hatten Lücken:
  Raster an den Blickwinkel der Bilder angepasst, jedes Bild wird an den Ecken seines Erdsockels genau auf die Felder gesetzt.
- 2026-10-30, Epochia Version 6 – Wege ließen sich nicht löschen: im Wege-Modus auf einen Weg tippen (oder darüber wischen) löscht ihn.
- 2026-10-30, Epochia Version 6 – neue Bilder aus Canva: Baustelle 3×3 und 4×4, Laubbaum, Tanne, große und kleine Felsen.
- 2026-10-27, Version 70 – Preisschilder der Landstücke überlappten weit herausgezoomt – jetzt passen sie in ihr Landstück.
- 2026-10-27, Version 69 – Design: neue Karten haben Flüsse.
- 2026-10-27, Version 71 – Gelände mit Emins Bildern: Gras, Wasser, Sand, Bäume je Jahreszeit, Berge, Büsche.
- 2026-10-27, Version 68 – Bauleiste (und Fenster) ließen sich am hochkant gehaltenen, gedrehten Handy nicht scrollen – behoben.
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
