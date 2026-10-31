# Analyse 2 – Spiellogik, Zustand und Spielstände (Epochia, Version 40)

Geprüft: `neu/js/welt.js`, `neu/js/logik.js`, `neu/js/speicher.js`, `neu/js/start.js` (dazu Stellen in `leben.js`, `klang.js`,
`oberflaeche.js`, `einstieg.js`). Ausgangslage: `node neu/tools/test.mjs --quick` → „Alle 47 Epochia-Tests bestanden“.
Prüfskripte: `t1.mjs` … `t5.mjs` im selben Ordner (laufen mit `node tN.mjs`, nutzen `neu/tools/headless.mjs`).
Am Repo wurde nichts geändert.

## Kurzfazit

Die Kernlogik ist im normalen Spiel stabil: Bauplatz-Prüfung (Karte, Besitz, Belegung, Wasser/Berg/Wald/Fels, Setzling,
Drehung `& 3`), Forschung (nur eine gleichzeitig, Voraussetzungen, Kosten), Zeitalter (nur aufwärts), Ereignisse (keine
doppelten Listener, alle werden einmal beim Laden der Skripte angemeldet) und die Trennung von den `stadtaufbau-save-*`-Ständen
(einziger Zugriff auf localStorage in `speicher.js`, alle Schlüssel mit `epochia-`) sind in Ordnung. `sanitizeState` deckt
**jedes** Feld aus `newState` ab (v und mapSize setzt `newState` selbst), und es gibt kein Feld, das gespeichert, aber nicht
geladen wird. Die Schwächen liegen fast alle bei **kaputten oder fremden Daten** und an ein paar Randfällen im Ablauf.
Es gibt keinen kritischen Befund. Am schwersten wiegt Befund 1 (ein unlesbarer Spielstand wird ohne Nachfrage überschrieben).

---

## Bewiesene Befunde

### 1. Unlesbarer Spielstand wird beim Start ohne Nachfrage überschrieben – **mittel**
- **Ort:** `neu/js/start.js:56-61` (`enterGame`: `loadSlot` schlägt fehl → `startNewGame()` → `saveGame()`), dazu `neu/js/speicher.js:127-138` (`slotInfo`).
- **Nachweis (t3.mjs, Teil A):** Im Platz `epochia-save-1` steht JSON, das `sanitizeState` ablehnt (`buildings` ist kein Array):
  `slotInfo(1)` meldet `{"pop":40,"stage":"Mittelsteinzeit"}`. Die Startseite zeigt also „▶ Weiterspielen“. `enterGame()` startet
  trotzdem ein neues Spiel und schreibt es sofort auf denselben Platz (`überschrieben? true, neuer pop 6`). Bei nicht lesbarem JSON
  passiert dasselbe, dann heißt der Knopf nur „Neues Spiel“. Der alte Text ist in beiden Fällen verloren.
- **Folge:** Im Alltag selten, aber ein Fehler im Speicherformat oder in `sanitizeState` in einer späteren Version würde echte Stände
  beim ersten Öffnen endgültig löschen.
- **Vorschlag:** Einen nicht ladbaren Stand vor dem Überschreiben unter `epochia-save-N-kaputt` sichern (oder gar nicht überschreiben
  und einen Hinweis zeigen). `slotInfo` sollte dieselbe Prüfung nutzen (`sanitizeState(d) !== null`), damit die Startseite nicht
  „Weiterspielen“ verspricht.

### 2. Nachrechnen beim Zurückkehren in die App löst Toasts, `renderAll` und Klang aus – **klein**
- **Ort:** `neu/js/start.js:136-140` (`evolved` prüft nur `gameRunning`), `:151` (`huntDone`), `:161` (`disasterEnded`); `neu/js/klang.js:150`
  (`researchDone` spielt den Klang immer). Aufgerufen über `visibilitychange` → `applyOfflineProgress` (`start.js:209-214`), während `gameRunning === true` ist.
- **Nachweis (t3.mjs, Teil B):** `toast` mitgeschrieben, 1 Stunde nachgerechnet → `["[OFFLINE] ✨ 1× Jägerlager → Mammutjägerlager"]`.
  Bei `evolved` läuft dazu `renderAll()` mitten in der Schleife. Bei `researchDone` spielt `klang.js` während des Nachrechnens jedes Mal den Forschungsklang.
  Beim Kaltstart (`enterGame`) tritt das nicht auf, weil `gameRunning` dort noch `false` ist.
- **Vorschlag:** In diesen Listenern zusätzlich `!offlineRunning` prüfen (wie bei `finished`/`researchDone` in start.js). Wichtiges stattdessen in `offlineEvents` sammeln.

### 3. Lagerfeuer wird beim Laden über ein anderes Gebäude gesetzt – **klein**
- **Ort:** `neu/js/speicher.js:105-108`
- **Nachweis (t1.mjs, Teil 1):** Stand ohne Lagerfeuer, dafür mit einer Sammlerin auf (63,63). Nach dem Laden liegen
  `lagerfeuer@63,63` und `sammlerin@63,63` übereinander (4 doppelt belegte Felder). `occ` zeigt nur auf eines der beiden.
- **Vorschlag:** Erst prüfen, ob die Fläche frei ist, und sonst überlappende Gebäude entfernen oder einen freien Platz in der Nähe suchen.
  Danach erst die Überlappungs-Filterung laufen lassen (Reihenfolge tauschen).

### 4. Jagd bringt Beute, obwohl das Jägerlager abgerissen wurde – **klein**
- **Ort:** `neu/js/logik.js:211-220` (`demolish` lässt `state.hunt` stehen), `:757-767` (`updateHunt` prüft keine Lager mehr).
- **Nachweis (t3.mjs, Teil C):** Jagd gestartet, das einzige Jägerlager abgerissen, 75 s weiterlaufen lassen →
  `hunt null, camps 0, nahrung 40 -> 97`. Die volle Beute kommt also trotzdem an, und die Hälfte der Baukosten gibt es zurück.
- **Vorschlag:** Beim Abriss des letzten Lagers aus `huntCamps()` die Jagd abbrechen (`state.hunt = null`, `herdWait` setzen) oder die Beute in `updateHunt` nur auszahlen, wenn noch ein Lager steht.

### 5. Ein Schritt im Einstieg außerhalb der Liste schaltet Katastrophen für immer ab – **klein (nur kaputte Daten)**
- **Ort:** `neu/js/speicher.js:118` (jede ganze Zahl wird übernommen), `neu/js/logik.js:447` (`state.tutorial >= 0` sperrt Katastrophen).
- **Nachweis (t2.mjs, Teil 4):** `tutorial: 99` → `tutorialStep()` ist `undefined`, und Katastrophen kommen nie (`disaster: null`).
  Gegenprobe mit `tutorial: -1`: `{"id":"hochwasser",…}`.
- **Vorschlag:** In `sanitizeState` nur Werte von `-1` bis `TUTORIAL.length-1` erlauben, alles andere auf `-1` setzen.

### 6. Tägliche Belohnung mit Werten außerhalb 1–7 – **klein (nur kaputte Daten)**
- **Ort:** `neu/js/speicher.js:117`, `neu/js/logik.js:817-824`, `neu/js/oberflaeche.js:1029-1036`
- **Nachweis (t2.mjs, Teil 3):** Bei `pending` = 99, -3 oder 2.5 (mit `last` = heute) zeigt das Fenster „Tag 99 von 7“.
  `claimDailyReward()` gibt `undefined` zurück, es gibt also keine Belohnung.
- **Vorschlag:** `streak` und `pending` auf ganze Zahlen von 0 bis 7 begrenzen, `last` auf das Muster `JJJJ-MM-TT` prüfen.

### 7. `sanitizeState` übernimmt Inhalte von techs, research, stage und built ohne Prüfung – **klein (nur kaputte Daten)**
- **Ort:** `neu/js/speicher.js:93-97, 113-115`
- **Nachweis (t5.mjs, t1.mjs Teil 5/6):**
  - `techs: {faustkeil:false, mittelsteinzeit:0}` → nach dem Laden `{"faustkeil":true,"mittelsteinzeit":true}`. Es wird nur der Schlüssel geprüft, nicht der Wert.
  - `research: {id:'kupferfund', left:1}` bei leerem Forschungsbaum → nach `update(2)` ist `kupferfund` erforscht, obwohl die Voraussetzungen fehlen.
  - Alle Altsteinzeit-Forschungen einschließlich `mittelsteinzeit`, aber ohne `stage` → `stage` bleibt `alt`, und Grubenhaus zeigt „🔒 Kommt in der Mittelsteinzeit“, obwohl die Forschung dazu schon „available“ ist.
  - `built: {sammlerin:'1'}` → nach dem Bauen `"11"` (Zeichenketten werden aneinandergehängt statt addiert).
- **Vorschlag:** `techs` nur bei `=== true` übernehmen. `research` nur annehmen, wenn alle Voraussetzungen erforscht sind.
  `stage` mindestens aus den erforschten Übergängen (`effect.stage`) ableiten. In `built` und `quests` nur endliche Zahlen bzw. `true` übernehmen.

### 8. Riesige Restzeiten blockieren Bauen und Forschen für immer; Forschung lässt sich nicht abbrechen – **klein (nur kaputte Daten)**
- **Ort:** `neu/js/speicher.js:85` (`build` ohne Obergrenze), `:94-95` (`research.left` ohne Obergrenze). Eine Funktion wie `cancelResearch` gibt es nicht (`typeof cancelResearch` → `undefined`).
- **Nachweis (t1/t2 Teil 7):** `build: 1e300` an beiden Wohnhöhlen → `constructionCount()` bleibt nach 2 Stunden Spielzeit bei 2,
  jedes neue Gebäude meldet „Schon 2 Baustellen“. `research.left: 1e300` → „Es läuft schon …“, und das bleibt so.
- **Vorschlag:** `build` auf höchstens `BUILDINGS[type].time` und `research.left` auf höchstens `TECHS[id].time` begrenzen.
  Ob es einen „Forschung abbrechen“-Knopf geben soll, entscheidet Emin (Vorschlag für `docs/vorschlaege.md`).

### 9. Weitere Lücken beim Laden fremder oder kaputter Daten – **klein**
Alle in t1/t2/t5 nachgewiesen:
- Gebäude auf Wasser oder fremdem Land bleiben erhalten (`sammlerin@73,0` auf Wasser, `sammlerin@2,2` auf fremdem Land). Die Ladeprüfung (`speicher.js:98-104`) prüft nur, ob das Gebäude auf der Karte liegt und nichts überlappt.
- Zwei Lagerfeuer werden übernommen (`fires 2`).
- Steht das Lagerfeuer nicht an erster Stelle, gilt in `leben.js:87` (`const camp = state.buildings[0]`) eine Wohnhöhle als Lager (Tiere und Herde erscheinen um das falsche Gebäude).
- `seed` als Zeichenkette (`"12345"`) wird zu `1`. Damit entsteht eine völlig andere Karte, und die Gebäude stehen im Wald oder Wasser.
- `cleared` ist nicht auf die Karte begrenzt und nicht entdoppelt (`[-5, 1e12, 8000, 8000]` bleibt stehen). `buildTerrain` fängt das beim Gelände ab, aber die Liste wächst mit.
- Doppelte Setzlinge auf demselben Feld werden übernommen.
- Sehr große Werte: `playTime: 1e300` → die Spielzeit wächst nicht mehr (Tag und Wetter bleiben stehen). `res.holz: 1e308` wird übernommen.
- `mapSize: 63` (ungerade Kartengröße) → alle Gebäude bekommen halbe Koordinaten und werden verworfen, übrig bleibt nur das Lagerfeuer.
- **Vorschlag:** Beim Laden auch `placeProblem`-ähnlich prüfen (ohne Kosten und ohne Besitz-Pflicht für alte Stände), Lagerfeuer genau einmal und an Index 0,
  `seed` mit `Number()` umwandeln, `cleared` auf `0 … N*N-1` begrenzen und entdoppeln, Zeiten und Waren auf vernünftige Obergrenzen begrenzen.

### 10. Logik-Funktionen stürzen bei ungültigen Eingaben ab – **klein (über die Oberfläche derzeit nicht erreichbar)**
- `placeBuilding('sammlerin', 60.5, 70)` → `TypeError … reading 'blocks'` in `welt.js:385` (`occ[60.5]` ist `undefined`, die Prüfung „belegt“ greift nicht).
  `screenToTile` rundet mit `Math.floor` ab, deshalb tritt das im Spiel nicht auf.
- `startResearch('gibtsnicht')` → `TypeError` in `logik.js:654`.
- `buildProblem('mammutjaegerlager', …)` meldet `null`. Gebäude mit `upgradeOnly` lassen sich also direkt bauen, wenn sie aufgerufen werden. Die Bauleiste zeigt sie nicht an.
- **Vorschlag:** In `placeProblem` am Anfang `Number.isInteger(x) && Number.isInteger(y)` prüfen, in `researchProblem` prüfen, ob `TECHS[id]` existiert, und in `buildProblem` `def.upgradeOnly` ablehnen.

### 11. Nachrechnen bei großen Siedlungen ist langsam – **mittel (Zahlen gemessen, Folgen auf dem Handy vermutet)**
- **Ort:** `neu/js/logik.js:850-863` (7 200 s in 5-s-Schritten = 1 440 × `update`), `recalcStats` `:305` (zweimal `areaCoverage`, das jede Wohnung mit jeder Quelle vergleicht).
- **Nachweis (t3.mjs Teil D, t4.mjs):** 270 Gebäude, 300 Einwohner. 2 Stunden Nachrechnen dauern **4,6 s** in Node auf dem Desktop.
  Ein `recalcStats()` braucht 3,7 ms, davon `areaCoverage` je 0,9 ms. `updateProduction` braucht 1,6 ms.
  `recalcStats` läuft außerdem in **jedem Bild** (`update`).
- **Vermutung:** Auf dem iPhone dürfte das Nachrechnen mehrere Sekunden bis über 10 s blockieren (beim Start und bei jeder Rückkehr in die App).
  Im laufenden Spiel kostet `recalcStats` einen spürbaren Teil jedes Bildes.
- **Vorschlag:** Die Abdeckung (Wärme/Glaube) nur neu berechnen, wenn sich Gebäude ändern (wie `networkDirty`). Beim Nachrechnen größere Schritte nehmen (z. B. 15–30 s) oder `recalcStats` nur jeden n-ten Schritt aufrufen.

### 12. Toter Code in `addResources` – **klein**
- **Ort:** `neu/js/logik.js:43-44`: Nach `continue;` folgt eine Zeile, die nie ausgeführt wird (Rest der alten Lagergrenze).
- **Vorschlag:** Die beiden Zeilen löschen.

---

## Vermutungen / nicht vollständig bewiesen

- **Uhr verstellen bringt Vorteile (klein):** Uhr 2 h vorstellen → 2 h werden nachgerechnet und mit `savedAt` in der Zukunft gespeichert.
  Uhr zurückstellen → `secs = 0`, `enterGame` speichert sofort mit der aktuellen Zeit. Das lässt sich beliebig oft wiederholen.
  Bei der täglichen Belohnung genauso: ein Tag vor und zurück ergibt jedes Mal einen neuen Tag 1 (`logik.js:806-815`).
  Negative Zeiten selbst sind sicher abgefangen (`update` ignoriert `dt <= 0`, `applyOfflineProgress` nimmt `max(0, …)` und höchstens 2 h).
  Ob man dagegen etwas tun will, ist eine Spielentscheidung.
- **Ausnahmen in Listenern brechen den Spielschritt ab (klein):** `emit` (`logik.js:8`) hat kein try/catch. Wirft z. B. ein Listener
  von `researchDone` (Oberfläche, `openDialog`), fehlen danach `evolveBuildings()` und der Rest von `update` (Jagd, Katastrophe).
  Der Zustand ist dann halb weitergeschaltet. Nicht ausgelöst, nur aus dem Code gelesen.
- **Fehlschlag beim Speichern bleibt stumm (klein):** `saveGame()` gibt bei vollem Speicher `false` zurück, aber kein Aufrufer wertet das aus.
- **`demolish` ruft `recalcStats` nicht auf (klein):** Nach `splice` passen `stats.staff[i]` und andere Listen nach Index nicht mehr zu den Gebäuden,
  bis zum nächsten `update`. `renderAll` direkt nach dem Abriss kann also kurz falsche Arbeiterzahlen zeigen. Arbeitende Figuren in
  `leben.js` hängen am Gebäude-Objekt und verschwinden nach spätestens 1 s, das ist in Ordnung.
- **Import und Löschen setzen das Leben nicht zurück (klein):** `doImport`/`doDeleteSlot` (`oberflaeche.js:1131, 1150`) rufen kein `resetLife()` auf.
  Tiere und Figuren des alten Stands bleiben kurz stehen. `selected`/`infoFor` könnten auf einen falschen Index zeigen.

## Geprüft und in Ordnung
- Bauplatz: außerhalb der Karte, fremdes Land, belegt, Wasser, Berg, Wald und Fels werden abgelehnt. Brücke nur auf Wasser. `needsWater` wird geprüft. Drehung immer 0–3. Größere Weiterentwicklung (Grubenhaus 2×2 → Langhaus 3×3) prüft die neue Fläche.
- Gebäude-`stage` stimmt bei allen Gebäuden mit dem Zeitalter der nötigen Forschung überein (t5: keine Abweichung). Alle `upgradeTo`-Ziele gibt es.
- Forschung: nur eine gleichzeitig, Kosten werden einmal abgezogen, das Zeitalter steigt nur. `evolveBuildings` zählt beim erneuten Laden nicht doppelt.
- Migration kleiner Karten (bis V21): Setzlinge und `planted` gab es damals noch nicht (eingeführt in V23), es fehlt also nichts.
- `stadtaufbau-save-*` wird nie gelesen oder geschrieben (grep und t3 Teil A: `altes Spiel unberührt true`).
- Ereignisse: keine doppelten Listener, Reihenfolge logik → klang → leben → start, wie geplant.
- Zufall: Gelände (`seededRng(seed)`) und Wetter (`hash(slot, seed)`) sind festgelegt und wiederholbar. Katastrophen und Figuren nutzen `Math.random`, das ist so gewollt.
