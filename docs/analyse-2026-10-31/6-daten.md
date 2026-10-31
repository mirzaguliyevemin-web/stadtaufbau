# Epochia – Daten-Konsistenz und Abgleich mit den Plänen (Version 40)

Prüfskript: `analyse/daten-check.mjs` (lädt `neu/js/daten.js` per `vm`, prüft Referenzen, Bilder, Kosten, Waren).

## Ergebnis in Kürze
Alle Verweise sind gültig: Gebäude-IDs in TECHS-Wirkungen, requires, QUESTS, SEASON_FACTORS, WEATHERS, DISASTERS,
OUTDOOR_WORK, upgradeTo, NEXT_EPOCH. Alle Waren in cost, produces, consumes und Belohnungen sind bekannt, alle stage-Werte stehen in STAGES.
Die Wetter-Wahrscheinlichkeiten ergeben je Jahreszeit zusammen 1. Jede Ware hat einen Erzeuger und einen Verbraucher.
Alle Haupt-, Winter-, Waren- und Forschungsbilder sind vorhanden. Die Version steht an allen 3 Stellen auf 40
(daten.js:5, index.html:6, service-worker.js:3). Es gibt **keinen kritischen Fehler**.

## Befunde

| # | Schwere | Ort | Befund / Nachweis | Vorschlag |
|---|---|---|---|---|
| 1 | mittel (Plan) | daten.js:353-357 | `NEXT_EPOCH.population: 120`, Plan (epoche-1 „Aufbruch“) sagt **60 Einwohner**. Die Plan-Bedingung „jedes Steinzeit-Gebäude einmal gebaut“ fehlt (nur `buildings: ['steinkreis']`). Dauer 3 min/Lieferung nicht umgesetzt (`available:false`, nur Anzeige oberflaeche.js:858/921). | Mit Emin klären: Plan anpassen oder Daten. Erst beim Bau der Bronzezeit wichtig. |
| 2 | mittel | daten.js:356 + logik.js:14-17 | NEXT_EPOCH kostet 300 Holz/300 Nahrung, der Grundspeicher hat 200. Erreichbar nur mit Vorratshaltung (200×1,5 = **genau 300**) oder Vorratsspeicher. Ohne Speicher ist es sehr knapp (es muss randvoll sein). | Ist durch requires (alle Forschungen) gesichert; trotzdem Hinweis/Test „Kosten ≤ Lager“ ergänzen. |
| 3 | niedrig | daten.js:205-209, logik.js:105/700-712 | Mammutjägerlager ist `upgradeOnly`. In der Bauleiste bleibt nach „Mammutjagd“ das Jägerlager. Neu gebaute Jägerlager entwickeln sich **nicht** automatisch weiter: `evolveBuildings` läuft nur bei researchDone und beim Laden (speicher.js:120). Das ist mit Wohnhöhle→Fellzelt nicht einheitlich (auch dort: Neubau nach Forschung zeigt jedoch gleich den neuen Typ). | Absicht? Sonst `evolveBuildings()` auch bei Bau-Ende aufrufen oder im Info-Fenster deutlicher den Umbau anbieten. |
| 4 | niedrig (Plan) | daten.js:205-209 | Plan: „ab der Jungsteinzeit wird das Mammutjägerlager zur Jagdhütte weiterentwickelt“. Es gibt keine Jagdhütte. Nach dem Aussterben (logik.js:719) bleibt das Mammutjägerlager mit voller Leistung. | Als offener Punkt in die Pläne/Vorschläge aufnehmen. |
| 5 | niedrig (Plan) | daten.js:309-333 | Die Zahlen weichen stark vom Plan ab (Einwohner: Mittelsteinzeit 25 statt 15, Jungsteinzeit 60 statt 30; Wissen ×1,5 bis ×3; Zeiten deutlich länger, über CONFIG.tempo). Die Tabelle im Plan ist veraltet, nur zum Teil unter „Abweichungen“ beschrieben. | Plan-Tabelle aktualisieren oder auf daten.js verweisen. |
| 6 | niedrig (Plan) | welt.js:231 | Land kostet Holz + **Stein** (30+15n / 20+10n, Obergrenze 140). Plan („Abweichungen“): Holz + **Nahrung**, 30+20n. | Plan nachziehen. |
| 7 | niedrig (Bilder) | bilder/epochia | **Rückansichten (views) fehlen** für 10 Gebäude: acker, ziegengehege, pflanzerin, fellmacherin, steinschlaeger, ahnenplatz, toepferei, vorratsspeicher, steinkreis, lagerfeuer (+ bruecke). **Winterbilder der Rückansicht r2 fehlen** für 11 Gebäude: wohnhoehle, fellzelt, grubenhaus, langhaus, sammlerin, jaegerlager, mammutjaegerlager, holzsammler, steinsammler, hoehlenmaler, feuerplatz. Außerdem fehlt `bruecke-winter`. Das passt zum bekannten offenen Punkt. Folge: zeichnen.js:105-106 fordert diese Namen an → bei jedem Start 404-Anfragen, Platzhalter bzw. Sommerbild. | Bilder nachliefern, solange unverändert lassen. |
| 8 | niedrig | daten.js:287-291 | `pfad` hat kein `bild`-Feld, obwohl es `bilder/epochia/pfad.webp` gibt (wird vermutlich direkt im Zeichnen genutzt). Nur ein Schönheitsfehler. | – |
| 9 | niedrig | daten.js:333 | „Kupferfund“ hat eine leere Wirkung und schaltet nichts frei. Er wirkt nur über `NEXT_EPOCH.requires = Object.keys(TECHS)`. Der Plan sagt dasselbe („macht den Aufbruch möglich“). Für Spieler sieht das aber wie eine Forschung ohne Nutzen aus, solange die Bronzezeit „bald“ kommt. Auch Mammutjagd/Einbaum/Grubenhaus usw. haben `effect:{}`, schalten aber Gebäude frei – das ist in Ordnung. | Im Text der Forschung den Zweck nennen. |
| 10 | niedrig | logik.js:42-43 | Toter Code nach `continue;` in `addResources`. | Löschen (Aufräumen). |
| 11 | niedrig | service-worker.js:4-22 | ASSETS enthalten alle 12 JS-Dateien, CSS, die Schrift und die Icons. **Kein einziges Bild** (`../bilder/epochia/*.webp`, logo, ladebild, start) ist vorgeladen. Bilder kommen erst per Laufzeit-Cache dazu (`fetch` mit `no-cache` → bei jedem Start eine Nachfrage für rund 200 Bilder). Wer offline zuerst startet oder dessen Cache durch eine neue Version (alter CACHE gelöscht!) geleert wurde, hat bis zum nächsten Online-Start nur Platzhalter. | Wenigstens logo, ladebild, start, wiese, pfad und die Gebäude-Grundbilder in ASSETS aufnehmen oder beim Versionswechsel den Bild-Cache getrennt halten (z. B. eigener Cache „epochia-bilder“, der nicht gelöscht wird). |
| 12 | Info | daten.js:64, logik.js:30-34 | knowledgeCap: Altsteinzeit 210 (teuerste 105), Mittelsteinzeit 360 (180), Jungsteinzeit 450 (225). Alles bezahlbar. Andere Forschungskosten sind höchstens 150 (≤ 200 Lager). Gebäudekosten höchstens 200 Stein (Steinkreis) = genau Grundlager. | ok |
| 13 | Info | Bedürfnisse | Wärme: lagerfeuer/feuerplatz/steinkreis. Glaube: ahnenplatz/steinkreis. Kleidung/Töpferwaren/Nahrung haben Erzeuger. Wohnraum: Altsteinzeit 3 bzw. 5 (Fellzelt+Forschung), reicht für die geforderten 25 Einwohner. | ok |
| 14 | Info | QUESTS | Alle lösbar. `built` zählt Weiterentwicklungen mit (logik.js:706), also klappt „3 Fellzelte“ auch über die Wohnhöhlen-Weiterentwicklung. | ok |
| 15 | Info | Plan-Ergänzungen | Pflanzerin, Brücke, Naturkatastrophen, Wetter und Tongrube r1/r2 sind nicht im Steinzeit-Plan beschrieben (später ergänzt). | Plan ergänzen. |
