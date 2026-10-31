# 7 – Spieltest Epochia (Version 40): durchspielen und messen

Stand: 31.10.2026, Code `neu/` (APP_VERSION 40). Nichts im Repo geändert.

## Wie gemessen wurde

| Werkzeug | Was |
|---|---|
| `node neu/tools/bot.mjs 400 3` | offizieller Bot, 3 Seeds à 400 Spielminuten (Datei `analyse/bot400.txt`) |
| `analyse/lauf.mjs` | gleicher Bot, aber misst zusätzlich: Zeitpunkt jeder Forschung, Leerlauf (keine Forschung **und** keine Baustelle), Grund, warum keine Forschung läuft, Lager voll/leer je Ware, Zufriedenheit, Katastrophen; löst Aufträge ein; optional Mammutjagd und Winterstart |
| `analyse/lauf3.mjs` | „Menschlicher“ Bot: handelt nur **alle 60 s** bzw. **alle 300 s** und trägt Felsen/Bäume ab, wenn Stein/Holz knapp ist |
| `analyse/szenarien.mjs` | schlechtes/ungewöhnliches Spiel (Ausgabe `szenarien.txt`) |
| `analyse/sk.mjs`, `prof.mjs` | Rechenzeit Offline-Nachrechnung und `update()` |
| Chromium (`foto.mjs` + `browser.js`) | 4 Spielstunden Bot im echten Browser mit Zeichnen, Katastrophen-Fenster, Forschung, Aufträge, 8 h offline – auf Konsolenfehler achten (`browser-4h.png`) |

**Grenzen des Bots (verfälschen Messwerte):**
- Handelt alle 3 s fehlerfrei und ohne Pause → baut viel mehr als ein Mensch (Endstand 1 100–1 400 Wegfelder, 70 Grubenhäuser, 540 Einwohner). Bauleistung ist bei ihm nie der Engpass.
- Jagt nicht (eigene Läufe mit Jagd: siehe unten – ändert nichts).
- Baut den **Steinkreis nie**: Er steht als letzter Wunsch hinter dem Ahnenplatz, der Stein fressen darf (409× „zu teuer“). Darum kann der Bot das Ende („Aufbruch“) nie prüfen.
- Weicht Problemen mit Platz aus, indem er Land kauft; legt Wege im Raster (jede 5. Reihe frei).
- Hat kein Hunger-/Kleidungs-Gespür: baut Fellmacherin nur nach Zählregel.
- Löst im Original keine Aufträge ein (in `lauf.mjs` schon).

## 1. Durchspiel-Messungen

### Zeit bis zu den Zeitaltern (Spielminuten)

| Lauf | Handelt alle | Mittelsteinzeit | Jungsteinzeit | Kupferfund (= Ende Steinzeit) | Einwohner am Ende |
|---|---|---|---|---|---|
| bot.mjs Seed 1 | 3 s | 107,9 | 282,9 | – (nach 400 min nicht) | 430 |
| bot.mjs Seed 2 | 3 s | 103,5 | 264,0 | – | 473 |
| bot.mjs Seed 3 | 3 s | 103,1 | 263,6 | – | 442 |
| lauf.mjs Seed 1, ohne Jagd | 3 s | 102,4 | 266,4 | **512,4** | 540 |
| lauf.mjs Seed 1, **mit Jagd** | 3 s | 102,4 | 266,4 | **512,4** | 540 |
| lauf.mjs Seed 3, ohne Jagd | 3 s | 100,7 | 282,9 | **528,9** | 534 |
| lauf3 Seed 1 | 60 s | 115 | 261 | **509** | 566 |
| lauf3 Seed 2 | 60 s | 98 | 259 | **506** | 582 |
| lauf3 Seed 1 | 300 s | 160 | – (bleibt hängen, s. B2) | – | 212 |

Weitere 12-h-Läufe (Seeds 2 und 4, Winterstart) waren bei Berichtsende noch nicht fertig (der Bot wird mit >500 Gebäuden sehr langsam); die drei bot.mjs-Seeds zeigen aber dasselbe Bild (±5 min).

**Untergrenze aus den Daten:** Summe aller Forschungszeiten (inkl. Tempo 1,5) = **490,5 min**, davon bis Mittelsteinzeit 84 min. Gemessen: Ende nach 506–529 min – also **96 % der Steinzeit ist reine Forschungs-Wartezeit**; ob man alle 3 s oder alle 60 s handelt, ändert das Ende um 3 min.

### Zeit bis jede Forschung (Seed 1, 3-s-Bot; 60-s-Spieler fast gleich)

| Forschung | min | | Forschung | min |
|---|---|---|---|---|
| Feuer hüten | 23,2 | | Grubenhaus | 199,9 |
| Flechtkörbe | 30,8 | | Ahnenkult | 217,9 |
| Faustkeil | 38,3 | | **Jungsteinzeit** | 266,4 |
| Speerspitzen | 49,9 | | Ackerbau | 287,4 |
| Fellzelte | 60,4 | | Sichel | 309,9 |
| Höhlenmalerei | 72,4 | | Töpfern | 330,9 |
| **Mittelsteinzeit** | 102,4 | | Langhausbau | 353,4 |
| Mammutjagd | 117,4 | | Viehzucht | 377,4 |
| Pfeil und Bogen | 132,4 | | Pfahlbauten | 401,4 |
| Feine Klingen | 147,4 | | Vorratshaltung | 425,4 |
| Einbaum | 165,4 | | Sternenkunde | 452,4 |
| Fellbearbeitung | 183,4 | | **Kupferfund** | 512,4 |

Die Abstände nach der Mittelsteinzeit entsprechen exakt den Forschungsdauern (15 / 15 / 18 / 18 / 16,5 / 18 / 45 … / 60 min) → eine Forschung startet sofort, wenn die vorige endet.

### Einwohnerkurve (Seed 1, 3-s-Bot, je 30 min)

`35 · 75 · 115 · 155 · 187 · 226 · 270 · 309 · 339 · 378 · 427 · 458 · 480 · 506 · 522 · 540 (ab 500 min fest)`

Fast gerade Linie mit ~13 Einwohnern je 10 min (Zuzug alle 45 s, solange Wohnraum frei ist). Der Bedarf laut Forschungen: 110 Einwohner für Kupferfund – erreicht nach ~85 min, also **viel zu früh**; die Einwohnerzahl ist nie die Hürde.

### Hunger, Zufriedenheit, Lager

| Messgröße (Seed 1, 720 min) | 3-s-Bot | 60-s-Spieler |
|---|---|---|
| Minuten mit Nahrung < 1 | 0 | 0 |
| niedrigste Zufriedenheit | 58 % | 42 % |
| Minuten unter 50 % | 0 | 8 |
| **Holz am Lagerlimit** | 500 min | 372 min |
| **Felle am Lagerlimit** | 613 min | 428 min |
| **Wissen am Limit** | 539 min | 421 min |
| Werkzeug am Limit | 471 min | 357 min |
| Stein am Limit | 377 min | 278 min |
| Nahrung am Limit | fast immer ≈ 197–199 (zählt als „Limit −1“ nur 97 min) | dito |
| Wartegrund „keine Forschung startbar“ | 18 min „Wissen fehlt“ (nur Altsteinzeit), 3,5 min „Kleidung fehlt“ | 16 min Wissen |

→ Ab etwa Minute 60 sind fast alle Lager dauerhaft voll. Wissen staut sich am eigenen Limit (210/360/450), während die Forschung läuft: Höhlenmaler arbeiten 70 % der Zeit umsonst.

### Leerlauf (keine Forschung **und** keine Baustelle)

- 3-s-Bot: nur kurze Lücken (2–3 min in den ersten 10 min, dann praktisch keine) – aber das liegt daran, dass er ununterbrochen Wege/Häuser baut.
- Inhaltlicher Leerlauf: Nach **Minute ~60** gibt es nichts mehr, das die Wartezeit verkürzt. Wohnraum, Nahrung, Rohstoffe – alles im Überfluss, man wartet nur auf den Forschungsbalken (15–60 min je Stufe; Jungsteinzeit 45 min, Kupferfund 60 min).
- Nach Kupferfund: 208 min echter Leerlauf (Bronzezeit „bald“) – erwartbar, aber das Spiel sagt außer im Forschungsbaum nichts dazu.

### Katastrophen (gemessen und erzwungen, mitten im Spiel bei ~264 Einwohnern)

| Katastrophe | Folge im Lauf | Bewertung |
|---|---|---|
| Dürre (Min. 165, natürlich) | Nahrung 199 → 199 | spürt man nicht |
| Fieber (Min. 477, natürlich) | Nahrung 971 → 972 | spürt man nicht |
| Hochwasser (erzwungen) | Nahrung min. 142 (−30 % sofort), danach voll | leicht |
| Waldbrand (erzwungen) | Felle 192 → 8, Holz 200 → 122 | mittel, nur Felle |
| **Kältewelle** (erzwungen, 264 Einw.) | Nahrung fiel auf **0** | spürbar |
| **Kältewelle** (natürlich, Seed 2, 582 Einw.) | Nahrung 971 → 63 | spürbar, aber überlebt |
| 2 h offline mit Waldbrand | Zufriedenheit 95 → 80 | ok |

Katastrophen sind (bis auf die Kältewelle) zahnlos, weil die Lager immer voll sind und Hunger keine echte Folge hat (siehe B4).

## 2. Schlecht / ungewöhnlich spielen

| Szenario | Ergebnis | Sackgasse? |
|---|---|---|
| A: Nichts bauen, 8 h warten | Nahrung nach ~16 min leer, 6 Einwohner bleiben, Laune 35 %. Danach 3 h Bot: 235 Einw., Mittelsteinzeit | nein |
| B: 2 h nur Wohnhöhlen | Stein auf 2, 8 Höhlen, 17 Einw., Laune 10 %. Danach normal erholt | nein |
| C1: sofort alles abreißen (auch Start-Höhlen) | 0 Einwohner, 39 Nahrung. Bot nach 3 h nur 6 Einw. und Stein 3 (Bot-Schwäche) | fast |
| C2: nach 90 min alles abreißen, Nahrung 0 | gerettet nur durch **nicht abgeholte Auftrags-Belohnung** (Nahrung) | knapp nein |
| **C3: 0 Einwohner + 0 Nahrung** | nach 4 h: 0 Einwohner, Wohnraum 6, Laune 50 %, nichts passiert | **JA** (bis zur nächsten Tagesbelohnung am Folgetag) |
| D: Wege vergessen | 2 h: 12 Einw., 0 Forschungen; Gebäude zeigen 🛤️❗-Blase | nein (gut angezeigt) |
| E: 8 h offline | wird auf 2 h gekappt, Fenster sagt „2 h 0 min weg“, Ereignisse (Zeitalter, Waldbrand) erscheinen; Speichern/Laden danach ok | nein |
| F: keine Nahrungsgebäude | 2 h: Bevölkerung bleibt 6, keine Strafe außer Laune 50 % | nein |
| G: Winterstart | Lauf lief bei Berichtsende noch | – |
| H: kaputte Spielstände (`{}`, `null`, NaN, `pop:500`, unbekannte Forschung, `left: Infinity`, `stage:"bronze"`) | werden abgewiesen oder repariert; kein Absturz | nein; `{"buildings":[]}` lädt aber als Lager **ohne Wohnung, 0 Einw., 0 Nahrung** → wie C3 |
| 1-Minuten-Spieler **ohne** Felsen räumen | nach 10 h: **9 Einwohner, 0 Forschungen** (Stein 6, kein Höhlenmaler) | weich (Ältesten-Hinweis „Felsen abtragen“ existiert) |
| 5-Minuten-Spieler | bleibt ab Min. 283 stehen: 212 Einw., Laune 37–42 %, Kleidung 0, Jungsteinzeit nie | **praktisch ja** (B2) |

**Konsolenfehler/Abstürze:** keine – weder headless (alle Szenarien, `game.errors` leer) noch im echten Chromium (4 Spielstunden mit Zeichnen, Katastrophen-Fenster, Forschungsbaum, Aufträge, Offline-Fenster).

## 3. Befunde (Schwere · Nachweis)

### B1 – Hoch (Spielspaß): Die Steinzeit ist ein Forschungs-Timer, das Bauen zählt ab Minute ~60 nicht mehr
- Ende nach 506–512 min, Untergrenze aus Forschungszeiten 490,5 min. 60-s-Spieler und 3-s-Bot liegen gleichauf; Mammutjagd an/aus ergibt **identische** Zeiten und Einwohner (30 Jagden ohne jede Wirkung).
- Lager ab ~60 min dauerhaft voll (Tabelle oben), Wissen 70 % der Zeit am Limit.
- Folge: Ab der Mittelsteinzeit gibt es keine Entscheidung, die schneller macht. Nur die Forschung mit Waren-Kosten (Kleidung, Töpferwaren, Werkzeug) verlangt zwischendurch kurz etwas.
- Ziel-Widerspruch: `docs/epoche-1-steinzeit.md` sagt 45–60 min, Kommentar im Bot 6 h, `daten.js` „≈ 8 h“. Gemessen: **8,5 h**, Mittelsteinzeit 1 h 40 min (Ziel im Bot: „gut 1 Stunde“).

### B2 – Hoch: Kleidungs- (und Töpferwaren-)Falle bei vielen Einwohnern
- Bedarf 0,02 je Einwohner und Minute: 212 Einw. = 4,2 Kleidung/min, 540 Einw. = 10,8/min. Eine Fellmacherin macht 2/min (braucht 4 Felle/min ≈ 3–5 Jagdlager).
- Sobald „Fellbearbeitung“ fertig ist, zählt das Bedürfnis **sofort** mit 0 → Laune springt um 20–25 Punkte nach unten (gemessen 76 % → 49 %; mit „Ahnenkult“ und schlechter Wärme-Abdeckung 37 %). Unter 50 % zieht niemand mehr zu und alles arbeitet langsamer.
- Jungsteinzeit kostet 20 Kleidung **im Lager** – bei 200+ Einwohnern wird der Vorrat schneller aufgegessen, als eine Fellmacherin ihn füllt. Der 5-Minuten-Spieler kam deshalb in 5 Stunden nicht weiter (Wartegrund „Es fehlt Kleidung“: 308 min).
- Gleiches Muster bei Töpfern (Laune 85 % → 59 % bei Min. 340 im 3-s-Lauf).
- Je mehr Einwohner (die automatisch zuziehen), desto schwerer – das widerspricht dem Gefühl „größer = besser“, und das Spiel erklärt es nicht.

### B3 – Mittel: Sackgasse „0 Einwohner und 0 Nahrung“
- Nachweis C3 und kaputter Stand `{"buildings":[]}`: Zuzug braucht `nahrung > 1` (`updatePopulation`), Nahrung braucht Arbeiter → nach 4 h unverändert 0. Ausweg nur über eine noch offene Auftrags-Belohnung oder die Tagesbelohnung am nächsten Kalendertag.
- Entsteht, wenn man die beiden Start-Wohnhöhlen abreißt, während die Nahrung leer ist (Start-Höhlen sind abreißbar). Selten, aber für ein Kind nicht ausgeschlossen.
- Nebenbei: `demolish` setzt `pop = max(housing, 1)`, eine Sekunde später setzt `updatePopulation` auf 0 – uneinheitlich.

### B4 – Mittel: Hunger hat kaum Folgen
- Bevölkerung sinkt nie durch Hunger (nur durch Abreißen). Ohne jedes Nahrungsgebäude bleiben 6 Einwohner für immer (Szenario F), Laune genau 50 %.
- Dadurch sind Dürre, Fieber, Hochwasser ohne Wirkung; Mammutjagd und Fischer bringen nichts Messbares.
- Kein Ältesten-Hinweis bei leerer Nahrung (es gibt nur Hinweise für unbesetzte Gebäude und Mammutherden).

### B5 – Mittel: Leistung bei großen Siedlungen (Bezug zum offenen Ruckel-Fehler)
- Mit 135 Gebäuden + 387 Wegen: `update(1/60)` ≈ 8 ms (Desktop-Node, Rechner ausgelastet): `recalcStats` 3,6 ms (davon `areaCoverage` 2,3 ms je Aufruf, Häuser × Quellen), `updateProduction` 3,4 ms (je Gebäude `activeEffects`/`currentWeather`/`countTerrainNear` pro Bild).
- Offline-Nachrechnung 2 h = 1 440 Schritte ≈ **10 s** auf dem Desktop. Auf dem Handy vermutlich deutlich länger (Startbildschirm hängt). Bot-Siedlungen sind größer als echte, aber 100+ Gebäude erreicht auch Emin.

### B6 – Niedrig: Ziele werden ab Mittelsteinzeit unklar
- Aufträge enden mit „60 Einwohner“ (erreicht bei Min. ~266 bzw. schon viel früher an Einwohnern). Danach: „Alle Aufträge erledigt – neue kommen mit der nächsten Epoche“. Die ganze Jungsteinzeit (≈ 4 h) hat keine Aufträge.
- Belohnungen wie „+60 Holz“ verpuffen, weil das Lager ohnehin voll ist.
- Nach Kupferfund kein Abschluss-Moment (nur „Bronzezeit bald“ im Forschungsbaum).

### B7 – Niedrig: Offline-Fenster sagt „2 h 0 min weg“ nach 8 h Abwesenheit
- Richtig gekappt (`maxOfflineHours: 2`), aber für den Spieler sieht es falsch aus. Besser: „Du warst 8 h weg – dein Stamm hat 2 h weitergearbeitet“.

### B8 – Niedrig: Stein-Falle für Anfänger
- 1-Minuten-Spieler ohne Felsenräumen: Stein 6, alle Leute bei Jägern/Holz, Steinsammler unbesetzt → 10 h lang 9 Einwohner, keine Forschung. Der Älteste weist darauf hin („Felsen abtragen“, „Pause“), darum nur niedrig. Höhlenmaler braucht 15 Stein – ohne ihn gibt es nie Wissen.

### Keine Befunde
- Keine Abstürze, keine Konsolenfehler, kaputte Stände werden sauber repariert, Speichern/Laden nach Offline ok, Wege-Fehler sichtbar markiert.

## 4. Spielspaß-Kurve

| Phase | Spielzeit | Eindruck |
|---|---|---|
| Einstieg | 0–25 min | gut geführt (Ältester), schnelle Erfolge, Aufträge passen. Erste 20 min aber zäh: Wissen 10 → 18 für die erste Forschung bei 2 Wissen/min. |
| Altsteinzeit | 25–100 min | beste Phase: jede 8–10 min eine Forschung, neue Wohnstufe, Mammutjagd in Sicht. |
| Mittelsteinzeit | 100–270 min | wird **langweilig**: Lager voll, 15–18-min-Forschungen hintereinander, Jagd ohne Nutzen. Dann plötzlich **zu schwer**: Kleidung/Glaube drücken die Laune unter 50 % (B2). |
| Jungsteinzeit | 270–510 min | lange Wartezeiten (45 + 14–60 min), keine Aufträge mehr, Töpferwaren-Delle. |
| Ende | ab 510 min | nichts mehr zu tun, kein Abschluss. |

Ist das nächste Ziel klar? In der Altsteinzeit ja (Aufträge + Forschungsbaum). Ab Mittelsteinzeit nur über den Forschungsbaum; warum die Laune fällt (neues Bedürfnis), erklärt niemand aktiv.

## 5. Vorschläge (für eine Sitzung mit Emin – nichts davon ist umgesetzt)

1. **Zielzeit festlegen** (45 min, 6 h oder 8 h?) und Forschungszeiten danach richten. Wenn lang: Wartezeit mit Sinn füllen (Forschung schneller durch mehr Wissen/Höhlenmaler – z. B. Wissen über dem Bedarf verkürzt die laufende Forschung; oder zwei Forschungen parallel ab Mittelsteinzeit).
2. **Neues Bedürfnis weich einführen**: erst nach z. B. 10 min oder erst, wenn das erste Gebäude dafür steht, zählen; oder als Bonus statt Strafe (Kleidung gibt +Laune, fehlt sie, kein Abzug).
3. **Kleidungs-/Töpferwaren-Verbrauch** an Einwohnerzahl prüfen (0,02 → 0,01?) oder Fellmacherin stärker; Jungsteinzeit-Kosten „20 Kleidung“ erreichbar machen.
4. **Sicherheitsnetz** gegen C3: Wenn 0 Einwohner und 0 Nahrung → kleiner Zuschuss (z. B. 20 Nahrung „Wanderer bringen Vorräte“) oder Start-Wohnhöhlen nicht abreißbar / mind. 1 Einwohner.
5. **Hunger spürbar** machen (z. B. Leute ziehen langsam weg) und Ältesten-Hinweis bei leerer Nahrung – dann bekommen Jagd, Fischer, Katastrophen Gewicht.
6. **Lagergrenze** bremst früh (200) und ist später irrelevant; Vorratsspeicher früher (Mittelsteinzeit) oder Lager wichtiger machen.
7. **Aufträge für Mittel- und Jungsteinzeit** (Fellmacherin, Ahnenplatz, Steinkreis, Töpferwaren …) und ein Abschluss-Fenster nach Kupferfund.
8. **Leistung**: `areaCoverage` und Gelände-Bonus nur bei Änderungen neu rechnen; Offline-Rechnung mit größeren Schritten (z. B. 30 s) oder in Häppchen mit Fortschrittsanzeige.
9. **Bot verbessern**: Steinkreis vor Ahnenplatz einplanen, Fellmacherin nach Kleidungsbedarf, Felsen räumen bei Steinmangel, Aufträge einlösen, optional „Mensch-Takt“ (alle 60 s) – sonst misst der Bot die Bauleistung eines Roboters.

## 6. Gesamtnote: 6 / 10

- **+** Stabil: keine Abstürze, robuste Spielstände, Offline-Kappung, sichtbare Weg-Fehler, guter Einstieg und eine runde erste Stunde.
- **−** Die Länge kommt fast nur aus Forschungs-Timern (96 %), Bauen/Planen hat ab Minute 60 kaum Einfluss, Lager laufen über, Jagd und die meisten Katastrophen sind ohne Wirkung.
- **−** Bruch in der Mittelsteinzeit: neue Bedürfnisse senken die Laune schlagartig, Kleidung skaliert mit der (automatisch wachsenden) Einwohnerzahl – ein gelegentlicher Spieler bleibt dort stecken.
- **−** Eine echte (seltene) Sackgasse (0 Einwohner + 0 Nahrung) und spürbare Rechenlast in großen Siedlungen.

Rohdaten: `analyse/lauf-*.json`, `analyse/out-*.txt`, `analyse/slowx*.txt`, `analyse/bot400.txt`, `analyse/szenarien.txt`, `analyse/browser-4h.png`.
