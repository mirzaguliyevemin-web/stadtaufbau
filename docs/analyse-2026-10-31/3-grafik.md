# Epochia – Analyse Grafik, Farben, Darstellung, Leistung (Stand V40)

Fotos liegen in `scratchpad/analyse/` (Präfix `g3-`). Messskripte dort ebenfalls (`g3-*.js`).
Vorsicht bei Millisekunden: gemessen im Headless-Chromium **ohne GPU** und mit 6–7 parallel laufenden Browsern anderer
Agenten. Absolute Zeiten sind darum zu hoch und schwanken; die **Verhältnisse** und die **Zählungen** sind belastbar.

Schwere: **Hoch** = sichtbar falsch oder spürbares Ruckeln/Risiko auf dem iPhone · **Mittel** = stört oder kostet Leistung ·
**Niedrig** = Schönheitsfehler, toter Code.

---

## A. Layout (Hochformat, Querformat, kleine Handys, Safe-Area, Touch-Ziele)

### A1 – Hoch: Auf kleinen Handys ist der Menü-Knopf nicht erreichbar
- `style.css:138-145` (`#side` beginnt bei `--top-h + 6px`, 5 Knöpfe à 54/46 px, keine Höhenbegrenzung).
- Nachweis (Messung `g3-chip.js`):
  - 568×320 quer (iPhone SE 1. Gen.): `#btn-menu` liegt bei y = 288–334 px, Fensterhöhe 320, Bauleiste beginnt bei 260 →
    **Menü komplett verdeckt bzw. außerhalb**, „Grundriss“ halb verdeckt. Foto: `g3-klein-quer.png`.
  - 320×568 hoch: Oberleiste ist dort 170–235 px hoch (siehe A2), die Seitenknöpfe rutschen nach unten, Menü verschwindet
    hinter der Bauleiste. Foto: `g3-klein-hoch2.png` (nur 4 Knöpfe sichtbar).
  - 667×375 und 844×390 passen gerade noch (Menü-Unterkante 302 vs. Leiste 315/330).
- Vorschlag: `#side { max-height: calc(100% - var(--top-h) - var(--bar-h) - 12px); overflow-y: auto }` oder bei
  `max-height: 360px` Knöpfe kleiner (z. B. 44 px hoch, ohne Beschriftung) bzw. zweispaltig. Alternativ „Grundriss“ ins Menü.

### A2 – Hoch: Oberleiste im Hochformat riesig, Ledernaht wird aufgeblasen
- `style.css:112-128` (`#topbar` + `.chips.right { flex: none; flex-wrap: nowrap }`) und Hintergrund
  `var(--bar-leather) bottom left / auto 100% repeat-x`.
- Die rechten Chips (Einwohner, Zufriedenheit, Wetter) beanspruchen ihre volle Breite, für die 7 Waren bleibt im Hochformat
  nur ein schmaler Streifen → die Waren stapeln sich.
  - 390×844: Oberleiste 106 px (4 Reihen), Foto `g3-hoch-tag.png`.
  - 320×568: Oberleiste **235 px = 41 % des Bildschirms**, eine Ware pro Reihe, Foto `g3-klein-hoch2.png`.
- Weil das Leder auf `auto 100%` skaliert wird, wächst die Ziernaht mit: auf den Fotos sind die „Stiche“ 60–80 px große,
  unscharfe Würste.
- Vorschlag: im Hochformat die Leiste umbrechen lassen (`#topbar { flex-wrap: wrap }`, rechte Chips in eigene Zeile oder
  rechts oben über den Waren), Waren-Chips kompakter (Zahl ohne Polster, 2 Zeilen à 4). Leder mit fester Höhe kacheln:
  `background-size: auto 48px; background-repeat: repeat` (Naht nur unten als zweite Ebene).

### A3 – Mittel: Touch-Ziele unter 44 px
- Messung `g3-chip.js` (alle Formate):
  - Waren-Chips oben 56–62 × **28 px**, rechte Chips 30–81 × **23 px** (`style.css:126-134`).
  - Kategorie-Reiter quer 32 × **24 px** (`style.css:673`), hoch 42 × 31 px.
  - Bauleisten-Klappknopf 34 × 30 px (`style.css:651-658`).
  - Zurück-Knopf der Seiten im Querformat ca. 26 px hoch (`style.css:639`), Schalter 50 × 28 (`style.css:595`).
- Die Chips öffnen Info-Fenster; Fehltipper aufs Spielfeld sind wahrscheinlich.
- Vorschlag: sichtbare Größe lassen, aber Trefferfläche vergrößern (`padding` + negative `margin`, oder `::after` mit
  `inset: -8px`). Reiter quer mindestens 40 × 36.

### A4 – Mittel: feste Abstände statt `--top-h`
- `oberflaeche.js:460` und `:465`: Info-Blase/Werkzeug `Math.max(50, …)` – im Hochformat ist die Oberleiste 106–235 px hoch,
  die Blase kann über die Waren-Chips rutschen.
- `#toast { top: 50px }` (`style.css:326-329`) liegt im Hochformat mitten auf der Oberleiste.
- Vorschlag: `getComputedStyle`-Wert bzw. `topbarHeight` (gibt es schon, `oberflaeche.js:151`) statt 50 verwenden;
  Toast `top: calc(var(--top-h, 40px) + 8px)`.

### A5 – Niedrig: Safe-Area oben fehlt, 100vh
- `style.css:13-16` definiert `--safe-l/r/b`, aber kein `--safe-t`; `#update-banner` (`style.css:310-311`) benutzt
  `var(--safe-t, 0px)` → immer 0. `#topbar` hat oben kein `env(safe-area-inset-top)`.
  Solange kein `apple-mobile-web-app-status-bar-style: black-translucent` gesetzt ist, liegt der Inhalt unter der
  Statusleiste – also heute unkritisch, aber eine Falle, falls das jemand ergänzt.
- `style.css:359` `#dialog-box { max-height: calc(100vh - 24px) }`: in Safari (nicht als App) ist `100vh` höher als der
  sichtbare Bereich → untere Knöpfe langer Fenster können unter der Werkzeugleiste liegen. Vorschlag `100dvh` (mit
  `100vh` als Rückfall davor).
- `index.html:7` `theme-color #3d7a2a` (grün) passt nicht zur braunen Lederleiste (`#c97a35`) – auf Android/Safari-Tönung
  sieht man einen grünen Streifen über braunem Leder.

---

## B. Farben und Kontrast

### B1 – Mittel: Weiße Schrift auf hellen Knöpfen (deutlich unter WCAG)
Gemessen mit `g3-kontrast.mjs` (WCAG-Formel; Ziel 4,5 für normale, 3,0 für große/fette ≥ 18,7 px Schrift):

| Stelle | Kontrast |
|---|---|
| `.btn.primary` weiß auf `#7ed957` (oben) / `#4caf50` (unten), `style.css:58` | **1,76 / 2,78** |
| `.round.yes` weiß auf `#7ed957`, `style.css:283` | **1,76** |
| `.round.turn` weiß auf `#6fb6ec`, `style.css:282` | **2,19** |
| `.btn.danger` weiß auf `#f37b65`, `style.css:59` | 2,68 |
| `.day.today` weiß auf Gold `#f2b632`, `style.css:375` | **1,82** |
| Abzeichen weiß auf `--red` | 3,83 |

Der Textschatten hilft etwas, trotzdem schwer lesbar in der Sonne. Vorschlag: dunkleres Grün (`#3e9d3f` → `#2e7d32`) als
Grundton der Primärknöpfe bzw. dunkle Schrift (`--ink`) auf Gold/Hellgrün.

### B2 – Mittel: Warnfarben in der Oberleiste zu schwach
- `style.css:135` `.chip.empty b { color: var(--red) }` → `#e0533f` auf Papier **3,57**.
- `style.css:136` `.chip.full b { color: #b07800 }` → **3,53** (Schrift 14 px).
- Grau-Texte: `#a08a6a` (Schalter-Erklärung, Versionszeile) **3,08–3,26**; gesperrte Forschungsknoten `#8a7a62` auf
  `#ece0c7` **3,18**; `nreq` `#a0662a` 3,62.
- Vorschlag: für Text eine eigene dunklere Stufe: Rot `#c0392b` (5,06 – gibt es schon als `.bad`), Bernstein `#8a5a00`,
  Grau `#7a5e3c`.

### B3 – Mittel: Palette zerfasert (viele fast gleiche Töne, hart codiert)
- **Rot**: `--red #e0533f`, `.bad/.cost.short #c0392b` (`style.css:64`, `:258`), Leinwand-„!“ `#d6332a` (`zeichnen.js:1008`),
  Geist `#ff5a4a`/`rgba(235,70,60)` (`zeichnen.js:1065-1067`), Knopf `#f37b65→#d9472f`.
- **Grün**: `--green #4caf50`, `--green-dark`, `#7ed957`, `#9be067` (4× Balken), `#8fd14f` (Bau-Balken `zeichnen.js:959`),
  `#5cb84e`, `#8fd36a`, `#3fdc4f`, `rgba(90,220,90)`.
- **Gold/Bernstein**: `--gold #f2b632`, `#e7a92e`, `#f2c94c`, `#d9a227`, `#e0a52a`, `#ffe066`, `#b07800`, `#b06a00`.
- **Grau-Braun-Text**: `#8a6a44` (≈ 12×), `#a08a6a`, `#8a7a62`, `#6b5a3a`.
- Bedeutung ist aber durchgehend stimmig: Rot = fehlt/geht nicht, Grün = läuft/passt/fertig, Bernstein = Lager voll/Hinweis.
- Vorschlag: in `:root` Text-Stufen ergänzen (`--text-muted`, `--text-bad`, `--text-warn`, `--bar-fill`) und Leinwand-Farben
  in einer kleinen Tabelle oben in `zeichnen.js` (`COLORS = { ok, bad, progress … }`) bündeln.

### B4 – Niedrig/Mittel: Bauvorschau nur über Rot/Grün unterscheidbar
- `zeichnen.js:1062-1069` (`drawGhost`): passt = grün, passt nicht = rot, gleiche Form. Leuchtdichte-Kontrast der beiden
  Töne zur Wiese 1,58 bzw. 1,08 – für Rot-Grün-Schwäche (≈ 8 % der Jungen) praktisch gleich.
- Die Aktionsleiste schreibt den Grund dazu, darum nur Niedrig/Mittel. Vorschlag: bei „passt nicht“ zusätzlich gestrichelte
  Raute oder ein ✖ in der Mitte, bei „passt“ ein ✔.

### B5 – Gut gelöst (zur Einordnung)
- Nacht (`g3-nacht.png`): Dunkelheit mit Lichtlöchern um Feuer, Blasen und Vorschau werden danach gezeichnet und bleiben
  hell lesbar. Leisten (Leder/Holz) sind nicht abgedunkelt, Text liegt immer auf Papier-Chips → lesbar.
- Winter (`g3-winter.png`), Gewitter (`g3-regen.png`), Grundriss (`g3-grund.png`) sehen stimmig aus.

---

## C. Darstellung (Zeichenreihenfolge, Drehung, Bilder)

### C1 – Mittel: fehlende Bilder (15 Anfragen ins Leere bei jedem Start)
Gemessen im Browser (`g3-bilder.js`): 174 Namen angefragt, 159 geladen. Es fehlen:
- **Neu in V40, Dateien gibt es noch nicht:** `mensch-hirte`, `mensch-frau-pflanzt`, `mensch-frau-grabstock-unten`
  (`leben.js:6`, `:239`, `:243`, `:688`). Rückfall funktioniert (normale Figur bzw. ohne Arbeitshaltung), aber die neuen
  Arbeitsposen von V40 sind darum **auf dem Handy gar nicht zu sehen**: der Grabstock-Wechsel braucht beide Bilder
  (`leben.js:431-432`), Hirte und Pflanzerin fallen auf die Standardfigur zurück.
- **Winter-Rückansichten** (bekannte offene Aufgabe): `1-{wohnhoehle, fellzelt, grubenhaus, langhaus, sammlerin, jaegerlager,
  mammutjaegerlager, holzsammler, steinsammler, hoehlenmaler, feuerplatz}-r2-winter`. Folge: gedrehte Gebäude (Drehung 2/3)
  stehen im Winter ohne Schnee zwischen verschneiten.
- `bruecke-winter` wird angefragt (weil `bruecke` in `BUILDINGS` ein `bild` hat, `zeichnen.js:104-107`), aber Brücken werden
  in `drawBridgeSprite` (`zeichnen.js:1170`) immer mit `images.bruecke` gezeichnet – ein Winterbild würde nie benutzt.
- Vorschlag: `imageNames()` nur Varianten anfragen, die es gibt (Liste in `daten.js`, z. B. `winterViews: ['r1']`), oder die
  Fehlversuche einmal merken. `bruecke` aus der Winterliste nehmen.

### C2 – Niedrig: ungenutzte bzw. tote Bildpfade
- `leiste-holz-steinzeit` / `leiste-leder-steinzeit` werden nur per CSS geladen (`oberflaeche.js:118-125`), nicht in
  `images`. `drawBridge` (`zeichnen.js:1209`) fragt aber `images['leiste-holz-steinzeit']` ab → immer der Rückfall `#9a6332`.
  Der ganze Zweig ist zudem tot, weil `bruecke.webp` existiert. Kann weg oder `leiste-holz-…` in `imageNames()` aufnehmen.
- `#research-pill` (`index.html:46`, `style.css:168-178`) wird seit V39 nur noch versteckt (`oberflaeche.js:226`) – toter
  Baustein.
- Sonst keine verwaisten Bilder in `bilder/epochia/` (alle anderen Dateien werden benutzt).
- `bilder/epochia/quelle/` = **171 MB PNG-Quellen** im öffentlichen Repo (nicht im `.gitignore`). Werden vom Spiel nicht
  geladen, machen aber jedes Klonen/den Pages-Upload groß. Vorschlag: außerhalb des Repos ablegen oder `.gitignore`.

### C3 – Niedrig: Tiefensortierung – Gleichstand nur nach Einfüge-Reihenfolge
- `zeichnen.js:1270-1284`: Gebäude bekommen `d = x + y + size` (Mitte), Bäume/Felsen `x + y + 1`, Figuren `x + y - 0.5`.
  Bei gleichem `d` entscheidet `(a.x || 0) - (b.x || 0)`; Gebäude haben kein `x` → 0 → Reihenfolge = Reihenfolge in
  `state.buildings`. Beispiel: 4×4-Gebäude bei (0,0) und 2×2 bei (4,−2) haben beide d = 4; das hintere kann je nach
  Baureihenfolge über die rechte Ecke des vorderen gemalt werden.
- In den Fotos (`g3-zoom.png`, `g3-quer-tag.png`) keine sichtbaren Fehler gefunden; Figuren vor/hinter Gebäuden stimmen.
- Vorschlag: zweiter Schlüssel = Vorderecke (`x + y + 2·size`) bzw. für Gebäude `o.x = b.x` mitgeben.
- Mammuts (56 px hoch) haben einen Punkt als Tiefe (`leben.js:772`) – ein Baum knapp dahinter kann ihren Rücken
  überdecken. Akzeptabel.

### C4 – Niedrig: Winterbild-Wechsel vor dem Schnee
- `buildingView` (`zeichnen.js:1112`) schaltet ab Winterbeginn gestaffelt (bis 15 s) auf `-winter`, die Schneedecke am
  Boden wächst aber über 40 s (`logik.js:397`). In den ersten Sekunden stehen einzelne verschneite Häuser auf grüner
  Wiese (`g3-regen.png`, linke Mitte). Vorschlag: Winterbild erst ab `snowCover() > 0.4`.

### C5 – Niedrig: Grundriss nachts komplett dunkel
- Im Grundriss werden keine Feuer gezeichnet (`zeichnen.js:1088`), darum meldet niemand Lichter an
  (`addLight`) → nachts ist die Karte im Grundriss ohne jeden Lichtpunkt. Vorschlag: im Grundriss `darkness` halbieren
  oder Lichter trotzdem anmelden.

### C6 – Niedrig: CSS-Kleinigkeiten
- `@keyframes glow` ist zweimal definiert (`style.css:304` und `:537`); die zweite gewinnt, der gelbe Leuchtrahmen
  des Einstiegs (`.glow`) benutzt damit die Forschungs-Animation (nur 50 %-Stufe). Eine umbenennen (`glow-node`).
- `.logo` setzt `font-weight` doppelt (700 und 900, `style.css:89-93`); Fredoka liegt nur bis 700 vor → künstlich fett.
- `.side-btn.on { background-color }` (`style.css:692`) wird vom Verlauf aus `.side-btn { background: linear-gradient }`
  überdeckt; sichtbar ist nur der Rahmen (Foto `g3-grund.png` zeigt dennoch hellen Knopf – evtl. setzt JS das; prüfen).
- Schriftgrößen 9–11 px in Leiste und Forschung (`.bar-item .costs` 10 px, `.side-btn span` 10 px, `.node .nsub` 9–10 px, `style.css:517`, `:636`
  im Querformat) sind auf dem Handy an der Grenze.

---

## D. Leistung

### D1 – Hoch: 70–75 % der Bäume/Felsen werden außerhalb des Bildschirms gezeichnet
- `zeichnen.js:371-382` `visibleRange()` liefert ein achsparalleles Rechteck in **Feld**-Koordinaten. Der Bildschirm ist
  darin aber eine Raute → die Ecken des Rechtecks liegen außerhalb. `drawScene` (`zeichnen.js:1264-1270`) legt für jedes
  Wald-/Felsfeld darin ein Objekt an, sortiert und zeichnet es.
- Nachweis `g3-cull.js` (Spielstand stadt90, Start-Zoom):
  - 844×390 quer: **574 gezeichnet, 178 wirklich sichtbar**.
  - 390×844 hoch: **1680 gezeichnet, 433 sichtbar**.
  - Je Baum: `save`/`transform`/`drawImage`/`restore` + Objekt + Pfeilfunktion + Sortierung.
- Vorschlag: in der Schleife `tileToScreen(x+0.5, y+0.5)` prüfen und Felder außerhalb von
  `[-Rand, viewW+Rand] × [-Rand, viewH+Rand·2]` überspringen (gilt genauso für Gebäude, Figuren, Wasser-Glitzern).
  Erwartung: Zeichenzeit für Gelände ÷ 3.

### D2 – Hoch: `windStrength()` je Baum und Bild
- `zeichnen.js:546` ruft in `drawTerrainObject` für **jeden** Baum `windStrength()` → `currentWeather()`
  (`logik.js:384-392`) → bis zu 3× `weatherInSlot` mit `Object.entries(WEATHERS)` + neues Objekt per Spread.
- Messung `g3-obj.js`: Start-Zoom 461 Bäume → **≈ 4,4 ms je Bild** nur dafür; ganz herausgezoomt 1679 Bäume → ≈ 11 ms
  (Desktop, unter Last; Budget bei 60 fps = 16,7 ms).
- Ähnlich, aber billiger: `treeSeasonName` → `staggeredSeason` → `seasonIndex()` + `snowCover()` je Baum (0,2 ms).
- Vorschlag: `windStrength()`, `snowCover()`, `seasonIndex()` einmal pro Bild am Anfang von `drawScene` ausrechnen und
  als Variable benutzen (auch `drawMountain`, `drawPaths`, `buildingView`).

### D3 – Mittel: Jeder gefällte/nachgewachsene Baum wirft alle Bodenstücke weg
- `zeichnen.js:198` `onTerrainChanged() { chunks = []; }`, aufgerufen bei jedem Fällen (`welt.js:214`), jedem fertigen
  Setzling (`logik.js:562`) und beim Laden jeder Bodentextur (`zeichnen.js:28`, 7× beim Start).
- Messung `g3-chunk.js`: 15 Geländeänderungen in 10 min Spielzeit (Holzsammler + Pflanzerin) ≈ alle 40 s; danach müssen
  alle sichtbaren Stücke neu gemalt werden: 16 Stücke × 11 ms ≈ **180 ms Ruckler** (Desktop), ganz herausgezoomt
  36 Stücke ≈ 400 ms.
- Vorschlag: `onTerrainChanged(x, y)` → nur das Stück mit (x, y) und die Nachbarn im 2-Feld-Rand auf `null` setzen
  (`renderChunk` zeichnet ohnehin `x0-2 … x0+CHUNK+1`). Zusätzlich höchstens 1–2 Stücke pro Bild neu malen (Rest im
  nächsten Bild), damit es nie hakt.

### D4 – Mittel: Speicher – Bodenstücke 104 MB + Bilder 121 MB
- `zeichnen.js:289-296`: jedes Stück ist 1024 × 706 px (fest, unabhängig von Zoom und DPR), ganz herausgezoomt sind alle
  36 im Speicher: **104 MB**. Dazu dekodierte Bilder: 159 Bilder = 30 Megapixel ≈ **121 MB** (davon Gebäude 24 MP, die
  Winterbilder ~ die Hälfte, die ganzjährig geladen bleiben; `start.webp`/`ladebild.webp` 2,9 MP bleiben im Spiel geladen).
- Zusätzlich legt `measurePlate` (`zeichnen.js:43`) für **jedes** Bild eine eigene 512er-Leinwand an und `alphaAt`
  (`zeichnen.js:669`) für jedes angetippte Bild eine weitere. Safari gibt Leinwand-Speicher erst beim GC frei und hat ein
  festes Limit für Canvas-Speicher (Fehlermeldung „Total canvas memory use exceeds the maximum limit“) – bei ~230 MB
  Grundlast ist das auf älteren iPhones knapp (Absturz/weiße Karte möglich).
- Vorschläge: eine Hilfsleinwand für `measurePlate`/`alphaAt` wiederverwenden und danach `width = height = 0`;
  Bodenstücke beim Herauszoomen (zoom < 0.5) in halber Auflösung malen oder nur die zuletzt benutzten ~20 behalten;
  Winterbilder erst kurz vor dem Winter laden (Herbst) und im Frühling wieder freigeben.

### D5 – Mittel: Qualitätsregelung reagiert auf Bildrate statt auf Rechenzeit
- `start.js:95-106`: unter 45 fps wird `renderScale` gesenkt. Im **Stromsparmodus** des iPhones (und bei manchen
  Bildschirmen) liefert Safari nur 30 fps – dann sinkt die Auflösung dauerhaft auf 1× (unscharf), obwohl das Zeichnen
  schnell genug wäre, und steigt nie wieder (`fps > 57` wird nie erreicht).
- Vorschlag: Zeit von `drawScene` mit `performance.now()` messen (z. B. > 12 ms im Mittel → runter, < 6 ms → hoch) statt
  Bilder pro Sekunde zu zählen.

### D6 – Mittel: Erstes Bild nach dem Laden / beim Jahreszeitwechsel stockt (Bilder dekodieren)
- Messung `g3-chunk.js`: erstes `drawScene` nach `enterGame` 1510 ms, zweites 40 ms (Software-Rendering). Neben dem
  Malen der 16 Bodenstücke dekodiert der Browser alle sichtbaren Gebäudebilder beim ersten `drawImage`. Dasselbe passiert,
  wenn im Winter ~60 Winterbilder erstmals gezeichnet werden.
- Vorschlag: in `loadImage` nach `onload` `img.decode()` abwarten (bzw. `createImageBitmap`), Winterbilder im Herbst
  vorab einmal dekodieren.

### D7 – Niedrig: pro Bild neu erzeugt
- Je Feuer und Bild ein `createRadialGradient` (`zeichnen.js:778`), dazu je Licht zwei weitere in `drawDayNight`
  (`wetter.js:221`, `:234`) und je Wolke eins (`wetter.js:143`). Bei ~40 Feuern im Bild ≈ 120 Verläufe/Bild. Vorschlag:
  ein vorgezeichnetes Leuchtbild (kleine Leinwand mit Verlauf) und `drawImage` skaliert + `globalAlpha`.
- `drawSmoke` (`zeichnen.js:798-811`): je Rauchquelle 7 Kreise mit neuem `rgba(…)`-String; im Lager mit vielen Zelten
  ~20 Quellen = 140 Strings/Bild. Vorschlag: feste Farbe + `globalAlpha`.
- Je Objekt eine Pfeilfunktion `draw: () => …` (`leben.js:762`, `:772`), je Gebäude ein Abschluss `lastImagePoint`
  (`zeichnen.js:720`), `drawPaths` legt jedes Bild ein Muster + `DOMMatrix` an (`zeichnen.js:1154`). Einzeln billig,
  zusammen GC-Druck.
- `mountainAt` (`zeichnen.js:466-475`) prüft je Bergfeld und Bild 8 Nachbarn – Ergebnis ist fest, könnte einmal je
  Gelände berechnet werden.
- `drawImageOnTiles` setzt je Gebäude ein `clip` (`zeichnen.js:707-711`) – auf dem iPhone spürbar teurer als ein
  einfaches `drawImage`. Alternative: den Sockelabschnitt einmal je Bild in eine Leinwand „vorschneiden“ (Cache je Bild +
  Spiegelung).

### D8 – Niedrig: Laden
- Service-Worker (`service-worker.js:40-52`) holt jedes Bild „Netz zuerst“ mit `cache: 'no-cache'` → bei jedem Start
  ~160 Nachfragen (plus 15 ins Leere, siehe C1), auf schwachem Mobilfunk langsamer Ladebalken. Vorschlag: Bilder
  „Cache zuerst“ (sie ändern sich mit der Versionsnummer ohnehin), nur HTML/JS „Netz zuerst“.
- Bildgrößen selbst sind gut gewählt (Gebäude 512–768 px breit, gesamt 7,5 MB WebP; keine Datei über 1600 px).
  Bei Zoom 2,2 und DPR 2 wird ein 4×4-Gebäude auf ~1130 Gerätepixel gestreckt (Bild 768) – leicht weich, vertretbar.
- Bodenstücke haben feste Auflösung (1 Bildpunkt pro Welt-Pixel): bei Zoom 2,2 × DPR 2 = 4,4-fach vergrößert → Boden
  sichtbar weicher als Gebäude (`g3-zoom.png`). Optional bei hohem Zoom Stücke in doppelter Auflösung.

---

## E. Kurz-Prioritäten

1. **A1** Menü auf kleinen Handys erreichbar machen (reine CSS-Änderung).
2. **D1 + D2** Gelände außerhalb des Bildschirms überspringen, Wind/Jahreszeit einmal pro Bild – größter Leistungsgewinn mit
   wenigen Zeilen.
3. **A2** Oberleiste im Hochformat kompakter, Leder nicht strecken.
4. **D3** Bodenstücke nur örtlich neu malen (Ruckler alle ~40 s).
5. **B1/B2** Kontraste der Knöpfe und Warnzahlen.
6. **C1** fehlende Bilder für V40-Posen und Winter-Rückansichten (Emin) bzw. Anfragen abstellen.
