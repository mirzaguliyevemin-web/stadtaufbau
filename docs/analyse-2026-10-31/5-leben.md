# Analyse 5 – Leben auf der Karte, Zusammenspiel mit der Logik, Geräusche

Stand: Epochia V40 (Commit 0ffd5f6), 31.10.2026. Keine Dateien im Repo geändert.

## Wie geprüft

- Code gelesen: `neu/js/leben.js`, `neu/js/klang.js`, dazu `logik.js` (recalcStats, togglePause, demolish, moveBuilding,
  Jagd, Bäume), `welt.js` (buildingAt, isConnected, isPathAt), `start.js` (enterGame, Schleife, visibilitychange).
- Headless-Simulation (`analyse/leben-sim.mjs`): Spielstand laden, 240–300 s mit 30 Bildern/s `update` + `updateLife`
  über die ganze Karte, in jedem Bild für jede Figur geprüft, auf welchem Feld sie steht (Wasser, Gebirge,
  fremdes Gebäude), ob sie springt (> 0,2 Felder je Bild), ob Blick- und Laufrichtung passen, und jede Sekunde,
  ob die Zahl der Arbeiterfiguren zu `stats.staff` passt.
  - Karte A: `www/stadt90.json` (Bot-Stadt, 269 Gebäude, 150 Einwohner).
  - Karten B/C: neues Spiel + alle Gebäudetypen mit Pfad eingesetzt (`analyse/add2.js`, `www/leben-neu-1/2.json`).
- Szenarien (`analyse/leben-szen.mjs`): Haus auf Hirsch bauen, Pfad unter Spaziergänger abreißen, Gebäude verschieben,
  Neues Spiel auf dem aktiven Platz.
- Zeitmessung im echten Browser (Chromium, `analyse/b-zeit.js`, `analyse/b-spitzen.js`).

## Gute Nachricht zuerst

- **Arbeiterzahl passt zur Logik:** In 3 × 240–300 s keine einzige Abweichung zwischen Figuren und
  `min(2, stats.staff[i])` (720 Stichproben). Pausierte, unverbundene und im Bau befindliche Gebäude haben keine
  Arbeiter (`leben.js:341`, gleiche Bedingungen wie `recalcStats`, `logik.js:310`).
- Jedes Gebäude mit `workers` (14 Typen) hat einen Eintrag in `WORK` (`leben.js:224–241`). Keine Figur trägt eine
  Ware, die ihr Gebäude nicht herstellt.
- Blickrichtung: In allen Läufen läuft niemand rückwärts (die 17 bzw. 3 „falschen“ Bilder sind nur der Sprung beim
  Einbaum, s. Befund 5). Spaziergänger bleiben immer auf Pfaden/Brücken, Tiere betreten nie Wasser oder Gebäude.
- Pfad-Berechnung der Arbeiter ist im Browser billig: kurze Wege Median 0,1 ms; im Schnitt ~4 Wegsuchen je Sekunde.

## Befunde

### 1. Arbeiter laufen durch Nachbargebäude und übers Wasser – Schwere: MITTEL (gut sichtbar)
**Ort:** `leben.js:349–352` (Heimplatz), `leben.js:307–308` (Ausnahme „eigenes Gebäude“), `leben.js:318` (Ziel immer erlaubt).
**Nachweis:** Karte A: 18 von 60 Arbeitern haben ihren Heimplatz `home` (fest `b.x + s + 0.3`, rechts neben dem Haus)
*in einem anderen Gebäude* (11× Fellzelt, je 1–2× Höhlenmaler, Steinsammler, Pflanzerin, Feuerplatz) oder auf Wasser.
In 300 s standen Arbeiter in ~20 000 Bildern in fremden Gebäuden (z. B. „holzsammler/go/gebaeude:fellzelt“ 5125 Bilder)
und ~800 Bilder auf Wasser. Karten B/C ebenso (Steinsammler im Ahnenplatz/Grubenhaus, Mammutjäger durchs Acker).
**Ursache:** (a) `home` wird nicht auf Begehbarkeit geprüft. (b) `walkRoute` erlaubt alle Felder „des Gebäudes, in dem der
Start liegt“ (`home = buildingAt(ax, ay)`) – steht der Start im Nachbar-Fellzelt, darf der Weg quer durch dieses Fellzelt.
(c) Das Zielfeld ist immer erlaubt (`isGoal`), also auch der Rückweg ins fremde Gebäude bzw. aufs Wasser.
**Vorschlag:** Heimplatz einmal je Arbeiter aus `perimeter(b.x, b.y, s)` (welt.js) wählen: erstes Feld mit `walkable()`,
Pfadfelder bevorzugt; nur wenn keins frei ist, wie bisher. In `walkRoute` die Ausnahme an das *eigene* Gebäude koppeln
(zusätzlicher Parameter `own = state.buildings.indexOf(w.b)`) statt an `buildingAt(start)`.

### 2. „Vor dem Haus“-Arbeiter stehen im Nachbargebäude oder im Wasser – Schwere: MITTEL
**Ort:** `leben.js:252–255` (`workSpot` für `target: 'self'`).
**Nachweis:** Karte A: Steinschläger arbeitet 4077 Bilder lang *in* einem Fellzelt; Karte B: Steinschläger in der
Fellmacherin (4209), Karte C: Fellmacherin in der Pflanzerin (8321), Steinschläger im Wasser (4069) – also dauerhaft.
**Vorschlag:** Wie bei 1. ein begehbares Feld am Rand (rechts/unten bevorzugt) suchen, Werkstück daneben legen; findet sich
keins, `null` zurückgeben (dann bleibt der Arbeiter drinnen) – oder die Werkstatt auf der eigenen Platte zeigen.

### 3. Besucher an Feuer/Ahnenplatz laufen quer durch Gebäude, Betende knien in Nachbargebäuden – Schwere: MITTEL
**Ort:** `leben.js:574–587` (`gatherFrom` prüft nur Gelände, keine Gebäude), `leben.js:601–602` (Platz am Ahnenplatz/
Steinkreis liegt *außerhalb* der Platte, `r = s/2 + 0.3`, ohne Prüfung), `leben.js:613–617` (gerade Linie, keine Route).
**Nachweis:** Karte A: ~8 600 Bilder Besucher in Fellzelten/Holzsammlern/Jägerlager auf dem Hin- und Rückweg.
Karte B: Betende *bleiben* am Ahnenplatz 5889 Bilder im Grubenhaus knien; Karte C: 6269 Bilder im Acker und 6047 im
Ziegengehege.
**Vorschlag:** Platz `spot` für 'beten' nur nehmen, wenn `walkable(floor(spot))` (sonst nächsten Winkel/Slot), und den
Hinweg mit `walkRoute(from → spot)` wie bei den Arbeitern (einmal je Besucher, billig); `from` am besten ein Pfadfeld in
der Nähe. Alternativ: Besucher nur aus begehbaren Richtungen kommen lassen und `gatherFrom` zusätzlich `occ` prüfen lassen.

### 4. Mehr Figuren auf der Karte als Einwohner – Schwere: MITTEL (Spiellogik wirkt „falsch“)
**Ort:** `leben.js:40` (Spaziergänger `ceil(pop/2)`, max. 14), `leben.js:566–570` (Besucher je Treffpunkt `floor(pop/3)`,
3–7 je Feuer, 2–4 je Ahnenplatz – *für jeden* Treffpunkt einzeln).
**Nachweis:** Karte B/C nach 230 s: 30 Einwohner, alle 30 beschäftigt (`staffSum` 30), aber sichtbar 26 Arbeiter +
14 Spaziergänger + 16–17 Besucher = 56–57 Figuren. Karte A: 150 Einwohner, 65 beschäftigt, 60 + 14 + 18–23 – passt dort.
**Vorschlag:** Spaziergänger und Besucher aus den *freien* Leuten nehmen: `idle = floor(pop) - stats.workers`;
`want = min(14, ceil(idle/2), …)`, Besucher insgesamt auf `idle` deckeln (Summe über alle Treffpunkte).

### 5. Einbaum-Fischer springt vom Wasser ans Ufer – Schwere: NIEDRIG-MITTEL
**Ort:** `leben.js:393` (`w.x = w.sx; w.y = w.sy` am Ende der Arbeit).
**Nachweis:** 15–19 Sprünge je 240 s je Fischerplatz (Sprung bis 3 Felder), jedes Mal beim Wechsel work→back.
**Vorschlag:** Am Ende wie am Anfang zurückpaddeln: `r` die letzten 3–4 s wieder von 1 auf 0 laufen lassen
(z. B. `r = Math.min(1, w.bt/4, w.t/4)`), erst bei `w.t <= -0` aussteigen.

### 6. Gebäude verschieben: Arbeiter, Ziegen und Besucher bleiben am alten Ort – Schwere: NIEDRIG-MITTEL
**Ort:** `leben.js:352` (`home` nur beim Anlegen), `leben.js:122` (Ziegen-`home`), `leben.js:600–604` (Besucher `cx/cy/spot`).
**Nachweis:** Holzsammler um 9 Felder verschoben: der Arbeiter bleibt erhalten, `home` steht weiter auf 63.3/66.5, er läuft
nach jeder Arbeit zum alten Platz (9,4 Felder entfernt) und verschwindet dort. Ziegen grasen weiter um das alte Gehege,
bis neu geladen wird.
**Vorschlag:** `on('moved', b => { life.workers = life.workers.filter(w => w.b !== b); life.visitors = life.visitors.filter(v => v.b !== b); life.animals = life.animals.filter(a => a.pen !== b); })`
– in der nächsten Sekunde entstehen sie am neuen Ort neu.

### 7. Besetztes Gebäude ohne sichtbare Tätigkeit, wenn Wald/Felsen fehlen – Schwere: NIEDRIG-MITTEL
**Ort:** `leben.js:277–289` (Suche nur 7 bzw. 10 Felder), `leben.js:359–360` (`!spot` → still warten).
**Nachweis:** Karte A: Steinsammler @68,71 ist besetzt, aber 300 s lang nie draußen (kein Felsen im Umkreis 7).
Karte B: Holzsammler @65,68 ebenso (kein Wald). Die Logik produziert trotzdem (Holz ohne Bäume = „Fallholz“,
`logik.js:529`). Da Holzsammler den Wald im Umkreis 6 abholzen, trifft das mit der Zeit *jeden* Holzsammler ohne Pflanzerin.
**Vorschlag:** Fällt `workSpot` für wald/fels aus, auf `'self'` ausweichen (Äste/Steine vor dem Haus sammeln) – dann ist
jedes besetzte Gebäude sichtbar tätig.

### 8. Tiere bleiben in neu gebauten Häusern stecken – Schwere: NIEDRIG
**Ort:** `leben.js:143` (Schritt wird verboten, wenn das Feld nicht frei ist – auch wenn das Tier schon darin steht).
**Nachweis:** Fellzelt auf das Feld eines Hirsches gesetzt: nach 60 s steht der Hirsch noch im Haus (`hirschImHaus: true`),
und bleibt dort, da jeder Schritt im selben besetzten Feld beginnt. Gilt auch für Ziegen und Mammuts.
**Vorschlag:** Steht ein Tier auf einem besetzten Feld (`occ`), es entfernen (wird neu verteilt) oder den Schritt erlauben,
solange es das Feld verlässt.

### 9. Spaziergänger springt, wenn sein Pfad abgerissen wird – Schwere: NIEDRIG
**Ort:** `leben.js:53` (`w.to = w.from = paths[0]`).
**Nachweis:** Pfadfeld vor einem Spaziergänger abgerissen → Sprung um 6,1 Felder zum ersten Pfad der Liste.
**Vorschlag:** Statt Teleport den Spaziergänger entfernen (`w.gone = true` und filtern); er wird an einem zufälligen Pfad
neu angelegt. Gleiches gilt bei Arbeitern, die beim Pausieren/Abriss sofort verschwinden (`leben.js:345`) – vertretbar.

### 10. „Neues Spiel“ auf dem aktiven Platz ohne `resetLife` – Schwere: NIEDRIG
**Ort:** `oberflaeche.js:1133` (`doDeleteSlot`: `startNewGame(); saveGame(); renderAll();`).
**Nachweis:** Nach `startNewGame()` bleiben 8 Tiere, 2 Spaziergänger und 1 Besucher aus der alten Karte bestehen (Hirsche
mit `home` aus der alten Welt, Mammutherde an alter Stelle). Spaziergänger springen auf `paths[0]` (Befund 9).
`enterGame` ruft `resetLife` richtig auf (`start.js:50`).
**Vorschlag:** In `doDeleteSlot` vor `startNewGame()` auch `resetLife()` aufrufen; in `resetLife` zusätzlich
`life.huntRoute = null; life.herdTimer = 0;` setzen.

### 11. Jagdweg: Umweg-Suche nur 8 Felder über das Rechteck hinaus – Schwere: NIEDRIG
**Ort:** `leben.js:304` (`x0 = min − 8 …`), `leben.js:164` (ohne Weg: gerade Linie, also übers Wasser).
Die Herde wird nur dort gesetzt, wo vom **Lagerfeuer** aus ein Weg existiert (`leben.js:99`), die Jäger starten aber
am **Jägerlager**. Liegt die einzige Brücke mehr als 8 Felder seitlich, findet `walkRoute` nichts → Jäger laufen
geradeaus übers Wasser. (Nur Code-Lektüre, kein Fall in den Testkarten.)
**Vorschlag:** Herde mit der Route vom ersten Jagdlager (`huntCamps()[0]`) prüfen; Rand für Jagd/Herde größer (z. B. 20).

### 12. Gezeigte Arbeit ohne echte Arbeit – Schwere: NIEDRIG (Info)
- Pro Gebäude höchstens 2 Figuren (`leben.js:342`): Jägerlager (3), Acker (3), Mammutjägerlager (4) zeigen weniger als
  ihr Personal. Gewollt, aber im Infofenster evtl. erklären.
- Verarbeiter ohne Rohstoff (Fellmacherin ohne Felle, Steinschläger ohne Stein, Töpferei ohne Ton) und der Acker im
  Winter (`SEASON_FACTORS.acker[3] = 0`) arbeiten sichtbar weiter, obwohl nichts entsteht (`leben.js:339–344`).
  Vorschlag: bei `outputPerMinute(i)` ≈ 0 bzw. fehlendem Rohstoff keine Arbeiter schicken (oder sie stehen untätig vor dem Haus).
- Holzsammler hackt an „seinem“ Baum (Zufall in `workSpot`), gefällt wird aber der nächste Baum laut `nearestTree` –
  der umkippende Baum ist meist ein anderer. Rein optisch.
- In der Ruhephase verschwinden Arbeiter am Heimplatz *vor* dem Haus (nicht im Haus) – wirkt wie Ein-/Ausblenden.

## Leistung

Gemessen im Browser (Desktop-Chromium, Karte A, 128 × 128, 269 Gebäude, 60 Arbeiter, 89 Figuren):
- `updateLife` je Bild: Median 0,1 ms, 99 % 8,3 ms, max 17 ms.
- `walkRoute`: kurz (Arbeiter) Median 0,1 ms; lang (26 × 20 Felder) Median 0,6 ms, 95 % 16 ms, max 47 ms.
  Im Spielbetrieb ~4 Aufrufe/s, max. 3 in einem Bild, längster Einzelaufruf 8,8 ms = Herden-Prüfung vom Lagerfeuer
  (bis zu 6 Versuche alle 20 s, `leben.js:99`). Auf dem iPhone grob ×2–3 → gelegentlich ein Ruckler von 20–30 ms.
  - Kosten je Aufruf: neues `Int32Array(W*H)`, Array-Literal der 8 Richtungen je Knoten, Pfeilfunktion `ok` – 
    alles klein. Verbesserung: Richtungen als Konstante außerhalb, `prev` wiederverwenden, Herden-Prüfung auf 1–2
    Versuche je Bild verteilen.
- Je Bild neu angelegt: `pathTiles()` (läuft alle Gebäude durch, `leben.js:39`), mehrere `filter`-Arrays in
  `updateAnimals`, ~90 Zeichen-Objekte mit Closures in `lifeObjects`. Bei 89 Figuren unkritisch; `pathTiles` könnte bei
  `networkDirty` zwischengespeichert werden.
- Headless-Messungen sind wegen `vm`-Kontext ~10× langsamer und nicht aussagekräftig (nur Browserwerte nehmen).

## Geräusche (`klang.js`)

- **Lautstärke:** Master 0,55; lauteste Summen (Trommel, Hacken, Donner) erreichen ~0,4–0,45 → kein Übersteuern.
  Rechteck-Töne (`muenze`, `fehler`) sind mit 0,06 bewusst leise. In Ordnung.
- **Häufigkeit:** Nur bei Ereignissen (Antippen, Bauen, Fertig, Forschung, Baumfall, Donner, Katastrophe), Sperre
  0,12 s je Geräusch. Baumfall in Karte A: 1,5 je Minute – unkritisch. Aber: `treeFelled` spielt auch für Bäume weit
  außerhalb des Bildes (`klang.js:151`) – Vorschlag: nur wenn das Feld sichtbar ist (`visibleRange()`).
- **Hintergrund:** Kein Dauerklang; offline nachgerechnete Ereignisse sind stumm (`offlineRunning`). Der
  `AudioContext` läuft im Hintergrund aber weiter (nie `suspend()`). Vorschlag: bei `visibilitychange` hidden
  `audio.suspend()`, beim nächsten Antippen wieder `resume()` (spart Akku auf dem iPhone).
- **iPhone, MITTEL:** `unlockAudio` weckt nur bei `state === 'suspended'` (`klang.js:22`). Safari setzt nach Anruf,
  Siri, Wecker oder Wechsel zu einer anderen Audio-App den Zustand **`'interrupted'`** – dann bleibt das Spiel stumm, bis
  neu geladen wird (`playSound` verlangt `'running'`, `klang.js:137`). Vorschlag: `if (audio.state !== 'running') audio.resume()`.
- **iPhone, Info:** `pointerdown` mit Finger zählt in WebKit nicht als Nutzer-Geste; erst `touchend` (ist mit
  registriert) entsperrt – also klappt es ab der ersten Berührung. Web Audio folgt auf dem iPhone dem
  **Stumm-Schalter**: Ist er an, kommt kein Ton. Falls Emin „kein Ton“ meldet: zuerst Schalter prüfen. (Mit
  `navigator.audioSession.type = 'playback'` ab iOS 17 ließe sich das umgehen – würde aber den Schalter ignorieren.)

## Reihenfolge-Empfehlung

1. Befunde 1 + 2 (Heimplatz/Werkplatz begehbar wählen, `walkRoute`-Ausnahme an eigenes Gebäude) – ~25 Zeilen, größter
   sichtbarer Effekt.
2. Befund 3 (Besucher-Platz prüfen, Hinweg per `walkRoute`) – ~15 Zeilen.
3. Befund 4 (Figuren aus freien Einwohnern) – ~5 Zeilen.
4. `klang.js` 'interrupted' – 1 Zeile.
5. Befunde 5, 6, 8, 9, 10 – je 1–5 Zeilen.

## Skripte

`/tmp/claude-1000/-home-emin-Projekte-spiel-aufbau/bcba9824-4c2d-4981-aef6-611486c4aa15/scratchpad/analyse/`:
`leben-sim.mjs` (Prüf-Simulation, `SAVE=… node leben-sim.mjs seed sekunden [zusatz.js]`), `leben-szen.mjs` (Szenarien),
`leben-home.mjs` (Heimfelder), `leben-neu.mjs` + `add2.js` (Testkarten mit allen Gebäuden), `b-zeit.js`,
`b-spitzen.js` (Browser-Zeitmessung über `foto.mjs`).
