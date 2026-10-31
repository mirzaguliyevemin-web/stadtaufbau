# Epochia – Analyse Wirtschaft und Rechenwege (Version 40)

Geprüft: `neu/js/daten.js`, `neu/js/logik.js`, Anzeige in `neu/js/oberflaeche.js` (resourceTip, infoText, Gebäudefenster),
`neu/js/welt.js` (Wege, Räumen), `neu/js/speicher.js`, `neu/js/start.js` (Schleife, Offline).
Nachweis-Skripte: `exp1.mjs` … `exp6.mjs` im selben Ordner (laufen mit `node exp1.mjs` usw., ändern nichts im Repo).

Bot-Werte (`node neu/tools/bot.mjs 90 3`): in keinem der 3 Läufe Mittelsteinzeit in 90 min; Ende 115 / 123 / 122 Einwohner,
6 Forschungen, Hunger 0 min, unzufrieden 0 min, Lager Nahrung/Holz/Stein/Felle am Anschlag (199–200), Wissen 184–210 (Grenze 210).

---

## A. Bewiesene Fehler

### A1 – Verarbeiter verbrauchen Rohstoffe auch bei vollem Lager (mittel)
`logik.js:597–610`: Die Verbrauchsmenge wird abgezogen, bevor `addResources` (Z. 610) das Ergebnis am Lagerplatz kappt.
Ist das Erzeugnis voll, verschwinden die Rohstoffe ersatzlos.
**Nachweis (exp1, Fall 1):** Steinschläger, Werkzeug 200/200, 60 s: Werkzeug bleibt 200, Stein 100 → 98,05, Holz 100 → 99,02.
Gilt genauso für Fellmacherin (Felle) und Töpferei (Ton, Holz). Mit zwei Steinschlägern und vollem Werkzeuglager gehen ~4 Stein/min verloren.
**Vorschlag:** Vor dem Verbrauch `f` zusätzlich begrenzen auf den Platz im Lager: für jedes Erzeugnis
`room = cap − res`; ist `room <= 0`, `f = 0`; sonst `f = min(f, room*60/(n*dt))`. Danach erst verbrauchen.

### A2 – Holzsammler fällt Bäume, obwohl das Holzlager voll ist (klein–mittel)
`logik.js:611`: `chopTrees` bekommt die *theoretische* Holzmenge, nicht die tatsächlich eingelagerte.
**Nachweis (exp4, B):** Holz 200/200, 30 min: 13 Bäume gefällt, Holz bleibt 200. Der Wald (und damit der Geländebonus) schrumpft für nichts.
**Vorschlag:** In `updateProductionStep` die Differenz `state.res.holz` vorher/nachher an `chopTrees` geben.

### A3 – Wohnung im Umbau oder ohne Weg: Einwohner verschwinden sofort und endgültig (mittel)
`logik.js:633–634` (`if (room < 0) state.pop = stats.housing`) zusammen mit `housingTotal` (Z. 269–273, zählt nur fertige, verbundene Wohnungen)
und `upgradeBuilding` (Z. 248, setzt `b.build`).
**Nachweis (exp1, Fall 2):** 2 Grubenhäuser voll (12 Einwohner), eines wird Baustelle → nach 1 s nur noch 6 Einwohner.
Beim Umbau Grubenhaus → Langhaus (270 s Bauzeit) verliert man also sofort 6 Leute; ebenso beim versehentlichen Abreißen eines
Pfadstücks (alle dahinterliegenden Wohnungen „ohne Weg“). Nachwachsen dauert je Person 45 s – bei Forschungen mit
Einwohner-Mindestzahl (bis 110/120) besonders ärgerlich.
**Vorschlag:** Bei Wohnungsmangel nicht sofort kappen, sondern langsam abwandern lassen (z. B. 1 Person je `growthSeconds`),
oder Wohnungen während des Umbaus mit dem alten Wert weiterzählen (`b.from`).

### A4 – Sackgasse „0 Einwohner und 0 Nahrung“ (mittel)
`logik.js:635`: Zuzug nur bei `state.res.nahrung > 1`. Ohne Einwohner arbeitet niemand, also entsteht keine Nahrung.
**Nachweis (exp4, A):** Start-Pfade abgerissen → Einwohner 6 → 0; Nahrung 0; Wege wieder gebaut (6 Wohnplätze, verbundene Sammlerin) →
nach 1 Stunde immer noch 0 Einwohner, 0 Nahrung. Rauskommen geht nur über Zufall (Auftrag „Jägerlager“ +40 Nahrung, falls noch offen,
oder die Tagesbelohnung am nächsten Tag).
**Vorschlag:** Zuzug erlauben, wenn `state.pop === 0` (oder `state.pop < 2`), unabhängig vom Vorrat; alternativ Mindestzuzug von 1 Person.

### A5 – Kostenloser Aufstieg + Abriss-Erstattung = Gewinn (klein, Ausnutzbar)
`logik.js:696–713` (`evolveBuildings`) baut gleich große Folgestufen kostenlos um – bei jeder abgeschlossenen Forschung **und bei jedem
Laden** (`speicher.js:120`). `refundOf` (Z. 195–200) erstattet aber die Hälfte der Kosten der *neuen* Stufe.
**Nachweis (exp1, Fall 3):** Jägerlager kostet 20 Holz/10 Stein → wird zu Mammutjägerlager → Abriss bringt 30 Holz/20 Stein.
Da das Jägerlager nach „Mammutjagd“ weiter in der Leiste steht, reicht: Jägerlager bauen → Seite neu laden → Abreißen = +10 Holz +10 Stein.
Gleiches Muster Fellzelt (15 Holz, 2 Felle) → Grubenhaus (Erstattung 15 Holz, 10 Stein).
Nebenwirkung: Der Knopf „Weiterentwickeln zu Mammutjägerlager“ (60 Holz/40 Stein) ist Geldverschwendung, weil das spätestens beim
nächsten Laden umsonst passiert (der Bot bezahlt ihn sogar, `bot.mjs` botStep).
**Vorschlag:** Erstattung aus dem tatsächlich Bezahlten berechnen (z. B. `b.paid` beim Bauen merken, Standard = Kosten der Stufe 0 der Linie),
und entscheiden, ob gleich große Stufen kostenlos oder per Knopf kommen – nicht beides.

### A6 – Anzeige „Stellt her“ ignoriert fehlende Rohstoffe (klein)
`logik.js:497–503` (`outputPerMinute`) rechnet ohne Rohstoffmangel; benutzt in `oberflaeche.js:352–353`, `609–610`, `683ff.`
**Nachweis (exp4, C):** Fellmacherin ohne Felle: Info zeigt „+1.7 🧥/min“, der echte Fluss (`stats.flows.kleidung.in`) ist 0.
Der Hinweis „❗ Es fehlt Felle“ steht daneben – widersprüchlich. Auch „Braucht: 🦌 4/min“ (Z. 611) zeigt den Grundwert statt `4 × Faktor`.
**Vorschlag:** In `updateProductionStep` das tatsächliche `f` je Gebäude in `stats.realFactor[i]` merken und in der Anzeige verwenden.

### A7 – Gebäudefenster sagt „Hat es warm“, Bedürfnis zählt es nicht (klein)
`oberflaeche.js:599` (und 602 für Glaube) prüft nur `!s.build`, nicht `isConnected`; die Logik `areaCoverage` (`logik.js:290`) verlangt einen Weg.
**Nachweis (exp4, E):** Feuerplatz ohne Weg neben einer Wohnhöhle: Fenster „🔥 Hat es warm“, Bedürfnis Wärme 67 % (diese Wohnung zählt als kalt).
Außerdem zeigt Z. 601 ab Mittelsteinzeit „Kein Ahnenplatz in der Nähe“, obwohl das Bedürfnis Glaube erst mit „Ahnenkult“ zählt (`activeNeeds`).
**Vorschlag:** Dieselbe Bedingung wie in `areaCoverage` benutzen (Hilfsfunktion `coveredBy(key, h)`), Glaube-Zeile nur bei `activeNeeds()`.

### A8 – Fellzelt-Text „Platz für 4 Menschen“ stimmt nie (klein)
`daten.js:175` vs. `daten.js:305` (Forschung „Fellzelte“ gibt `housing: { fellzelt: 1 }`). Da das Fellzelt nur mit dieser Forschung baubar ist,
hat es immer 5 Plätze. **Nachweis (exp4, D):** `housingOf('fellzelt') = 5`, Text „4“.
**Vorschlag:** Text auf 5 ändern oder den Bonus direkt in `housing: 5` stecken.

### A9 – Offline-Nachrechnen ist bei großer Siedlung sehr langsam (mittel; Zahlen bewiesen am PC, Handy = Vermutung)
`logik.js:850–870` rechnet 2 h in 1440 Schritten à 5 s; jeder Schritt macht `recalcStats` + `outputFactor` für alle Gebäude.
**Nachweis (exp5):** Bot-Stand nach 90 min (251 Gebäude, davon 180 Pfade, 107 Einwohner): 2 h offline = **9,6 s** Rechenzeit in Node am PC,
ein `update(1)` ≈ 6 ms. Je `update` wird `activeEffects()` 38-mal und `isConnected` 587-mal aufgerufen.
Messung (exp3): `effectFactor` für alle Gebäude 4,8 ms, `terrainBonus` 2,3 ms, `techSum` 1,2 ms, `areaCoverage` 1 ms.
Auf dem iPhone dürfte die Seite beim Zurückkehren mehrere bis viele Sekunden einfrieren; auch im laufenden Spiel kostet jedes Bild ~6 ms
nur für die Logik (Vermutung: Ruckeln in großen Siedlungen).
**Vorschlag:** Wie `productionCap` je Schritt einmal zwischenspeichern: `activeEffects()`, `techSum('bonus', typ)` je Typ, `seasonIndex()`;
`terrainBonus` je Gebäude merken, bis sich Gelände ändert (`onTerrainChanged`); `recalcStats` im Live-Spiel nur alle 0,25 s.
Offline evtl. größere Schritte (10–15 s) – exp2 zeigt, dass 0,25 s / 1 s / 5 s praktisch dasselbe Ergebnis liefern
(Nahrung 199,9 / 199,6 / 198,2, alles andere gleich).

### A10 – Toter Code in `addResources` (klein)
`logik.js:43–44`: `continue;` und danach eine unerreichbare alte Zeile. Harmlos, aber verwirrend. **Vorschlag:** beide Zeilen löschen.

---

## B. Geprüft und in Ordnung (bewiesen)

- **Einheiten:** Raten in `BUILDINGS` sind je Minute, Logik rechnet überall `× dt / 60` (Produktion, Verbrauch, Essen, Waren). Stimmt.
- **Rohstoffmangel-Formel** `logik.js:600–601`: `f = min(f, res·60/(n·dt))` – korrekt, auch bei zwei Rohstoffen.
- **Tempo-Regler** (`daten.js:338–351`) wird genau einmal angewendet; keine doppelte Anwendung gefunden. Wirkt nur auf `produces`,
  nicht auf `consumes` und nicht auf Jagdbeute/Forschungskosten außer Wissen (siehe C4).
- **Offline = Online:** exp2 – 2 h mit dt 0,25 / 1 / 5 s und `applyOfflineProgress` geben gleiche Einwohner (54), Forschungen, Lager.
- **Negative/kaputte Zeit:** `update` ignoriert `dt ≤ 0`/NaN, kappt auf 5 s; `sanitizeState` verwirft negative/NaN-Werte.
- **Kein Teilen durch 0:** `areaCoverage` (total 0 → 1), `resourceTip` (nur bei `net < −0,01`), Verbrauch (`need > 0`).
- **Lager > Kapazität** bleibt erhalten und wird korrekt nicht weiter befüllt. `canAfford` mit 1e-9-Toleranz, `payCost` kappt bei 0.
- **Wissensspeicher** (`knowledgeCap`): Alt 210, Mittel 360, Jung 450 – immer ≥ 2 × teuerste Forschung, also keine Wissens-Sackgasse.
- **Lager für Kosten:** Alle Forschungs-/Baukosten ≤ 200; Aufbruch (300 Holz/Nahrung) ist mit „Vorratshaltung“ (Pflicht-Forschung) genau
  erreichbar: round(200 × 1,5) = 300.
- **Kein Kreislauf „Ware nur aus sich selbst“:** Felle (Jägerlager), Werkzeug, Kleidung, Ton, Töpferwaren entstehen alle aus Gebäuden,
  die nur Holz/Stein (bzw. Werkzeug aus Steinschläger) kosten.
- **Holz/Stein-Sackgasse** (Holz < 15, Stein < 5, kein Sammler): Bäume fällen/Felsen abtragen (`welt.js:207–216`) gibt kostenlos 3 Holz/Stein.
- **Wetter-Wahrscheinlichkeiten** summieren je Jahreszeit auf 1,00.
- **resourceTip:** Einnahmen/Ausgaben kommen aus `stats.flows`, das mit dem tatsächlichen Faktor (inkl. Rohstoffmangel) gebildet wird – stimmt mit der Logik.

---

## C. Balancing-Auffälligkeiten (nur Bericht, keine Änderung)

**C1 – Forschungszeit ist die harte Untergrenze, Einwohnerzahlen bremsen nie.** Reine Forschungszeit (nacheinander): Altsteinzeit 84 min
(99 mit Mammutjagd), Mittel 146 min, Jung 246 min, gesamt 8,2 h. Der Kommentar im Bot („Mittelsteinzeit nach gut 1 Stunde“) ist damit
nicht erreichbar. Gleichzeitig hat der Bot nach 90 min in der *Altsteinzeit* 115–123 Einwohner – die Einwohner-Mindestwerte der Forschungen
(25 … 120) spielen praktisch keine Rolle.

**C2 – Wissen läuft voll.** Altsteinzeit braucht insgesamt 408 Wissen in ≥ 84 min (≈ 4,9/min); 2 Höhlenmaler mit Bonus reichen.
Im Bot steht Wissen am Ende bei 184–210 von 210 → Höhlenmaler arbeiten großteils für nichts.

**C3 – Lager ab ~60 min dauerhaft voll** (Nahrung, Holz, Stein, Felle je 199–200 im Bot). Zusammen mit A1/A2 wird dann Rohstoff/Wald verschwendet.

**C4 – Felle-Kette knapp, Töpferwaren sehr knapp.** Fellmacherin braucht 4 Felle/min (Verbrauch nicht vom Tempo gekürzt), ein Jägerlager liefert
0,8 Felle/min Grundwert (Tempo 0,8). Kleidung: 0,02 × Einwohner/min → bei 120 Einwohnern 2,4/min > 2,0/min einer voll besetzten
Fellmacherin. Töpferwaren: Töpferei 1/min, bei 100 Einwohnern Verbrauch 2/min → mindestens 2–3 Töpfereien + 2 Tongruben nur zum Halten,
dazu 15 + 20 + 30 für Forschungen/Aufbruch. Jagdbeute (6 Felle) wurde vom Tempo-Regler nicht gekürzt, Jägerlager-Felle schon – uneinheitlich.

**C5 – Hunger hat kaum Folgen.** Einwohner sterben/ziehen bei Hunger nie weg (`updatePopulation`), nur Zufriedenheit sinkt um 1/(Anzahl
Bedürfnisse) (exp1, Fall 4: 1 h ohne Nahrung → 6 Einwohner bleiben, Zufriedenheit 50 %, Gebäude 75 %). Zuzug läuft auch bei negativer
Nahrungsbilanz, solange > 1 Nahrung im Lager ist.

**C6 – Ein einziges Stück Ware erfüllt das Bedürfnis für alle** (`logik.js:327`, `res > 0.01`). Kleidung/Töpferwaren wirken binär.

**C7 – Katastrophen + Wetter stapeln sich stark** (exp1, Fälle 5/6): Kältewelle + Schnee → Nahrungsverbrauch × 2,5, Jäger × 0,35,
Fischer × 0,24, Laune −25. Fieber + Gewitter → Fischer × 0,2, Sammlerin × 0,3, Laune −25, kein Zuzug. Im Winter der Jungsteinzeit (Acker × 0)
ist Hunger dann sehr wahrscheinlich (Vermutung, Bot erreicht die Jungsteinzeit nicht).

**C8 – Mammutjägerlager-Aufstieg kostet 4 statt 3 Arbeiter** – beim kostenlosen Umbau fehlt danach unbemerkt ein Arbeiter je Lager.

---

## D. Vermutungen / nicht abschließend geprüft

- **D1** Fieber („nur die Hälfte kann arbeiten“) halbiert die Leistung über `effectFactor`, die Anzeige „👤 2/2“ bleibt aber voll – verwirrend.
- **D2** `stats.staff` ist nach `demolish` (Index-Verschiebung durch `splice`) bis zum nächsten `update` falsch zugeordnet; Anzeige kann einen
  Moment falsche Arbeiterzahlen zeigen (`logik.js:211–220`, kein `recalcStats`).
- **D3** `resourceTip` zeigt bei vollem Lager weiter „Zusammen: +X je Minute“, obwohl nichts mehr dazukommt (Raten zählen die theoretische Erzeugung).
  Ebenso Verbrauch „−X“ bei leerem Lager.
- **D4** Schleife kappt `dt` auf 0,25 s (`start.js:113`): unter 4 Bildern/s läuft die Spielzeit langsamer als die echte Zeit.
- **D5** Wettertexte unvollständig (Sonnig: Ziegen +10 % fehlt im Text; Regen „draußen −10 %“ gilt nur für die aufgezählten Gebäude).
