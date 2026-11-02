# Epochia – Epoche 2: Bronzezeit (Entwurf)

Entwurf von Claude, 2026-11-01; offene Fragen am 2026-11-02 mit Emin entschieden, wird in Stufen gebaut (siehe „Stand des Baus“). Gehört zu `docs/konzept-neu.md`.
Alle Zahlen sind Startwerte, abgeleitet aus der Steinzeit, wie sie heute in `neu/js/daten.js` gebaut ist (Version 44);
feinjustiert wird nach dem Test am Handy und mit dem Bot.

Zeichen: ✅ entschieden · ❓ offene Frage an Emin · 💡 Vorschlag

## Stand des Baus

Gebaut, ohne Bilder: **Kupferzeit** (Version 60) und **Frühe Bronzezeit** (Version 61). Weiterentwicklungen zeigen das Bild der Vorstufe,
neue Gebäude (Kupfermine, Köhler, Schmelzofen, Zinnwäscherin, Bronzegießer, Handelsplatz) einen Platzhalter, neue Waren und Forschungen ihr Zeichen.
Der Händler ist eine Figur mit Ochsen-Zeichen und einer Blase zum Antippen, bis es Bilder gibt.

Noch nicht gebaut: Späte Bronzezeit, Häuptling-Bild, Bronzezeit-Leisten, Ereignis Erzader, Bronzezeit-Waren in der täglichen Belohnung.

Abweichungen vom Entwurf:
- Der Aufbruch wird auf einmal bezahlt (je Ware höchstens 200 wie alle Forschungen), nicht nach und nach geliefert.
- „Tauschhandel“ kommt nach „Bronzeguss“ statt direkt nach dem Übergang: Der Handelsplatz kostet Bronze, vorher könnte man ihn gar nicht bauen.
- Der Handelsplatz hat keine Arbeiter. Der erste Händler kommt 1 Minute nach dem ersten Handelsplatz, danach alle 20 (mit Rad 15) Minuten.
- Das erste Angebot bringt immer Zinn, Bernstein kommt erst mit der Späten Bronzezeit.
- Neu festgelegt (im Entwurf offen): Bronzeschmied verbraucht 1 Bronze + 1 Holz, ist wie die anderen Gebäude mit neuen Zutaten nur per Knopf umzubauen.
- Forschung verlangt Gebäude: siehe `TECH_NEEDS` in `neu/js/daten.js`.

Die Forschung „Späte Bronzezeit“ ist sichtbar, lässt sich aber erst mit dem nächsten Bauabschnitt starten.

Zum Ausprobieren: `neu/teststand-kupferzeit.txt`, `neu/teststand-fruehbronze.txt` (erzeugt mit `node neu/tools/teststand-kupferzeit.mjs`).
Durchspielen ab der Kupferzeit: `node neu/tools/bot-bronze.mjs [Minuten]`.

## Überblick

Die Bronzezeit hat – wie die Steinzeit – drei Stufen. Jede Stufe öffnet einen neuen Abschnitt im Forschungsbaum
(neuer Reiter „Bronzezeit“, der heute noch „bald“ zeigt) und neue Gebäude:

| Stufe | Thema | Gefühl im Spiel |
|---|---|---|
| **Kupferzeit** | erstes Metall: Kupfer aus dem Berg, Schmelzofen, Lehmhäuser, Gärten | aus dem Dorf wird ein Handwerkerdorf, Rauch über dem Ofen |
| **Frühe Bronzezeit** | Kupfer + Zinn = Bronze, Händler, Rad und Wagen, Pflug, Schafe und Wolle | Ochsenkarren kommen, das Dorf ist mit der Welt verbunden |
| **Späte Bronzezeit** | Bernstein, Schmuck, Himmelsscheibe, große Hallenhäuser, Grabhügel | ein reiches, stolzes Dorf mit einem Häuptling |

✅ (02.11., siehe Liste unten) **Wie lange soll die Bronzezeit dauern?** 💡 Vorschlag: etwas länger als die Steinzeit, weil mehr Ketten dazukommen –
etwa **6 Stunden reine Forschungszeit** im Spiel (die Steinzeit hat heute etwa 4 Stunden). Mit Offline-Zeit (bis 2 h)
fühlt sich das wie 2–3 Abende an.

## Übergang aus der Jungsteinzeit (so ist es heute gebaut)

- Letzte Forschung der Steinzeit: **🟠 Kupferfund** (Bild `f-kupfer` gibt es schon). Sie „macht den Aufbruch möglich“.
- Ganz rechts im Baum steht **„Aufbruch in die Bronzezeit“** (heute: „kommt bald“). Bedingungen in `daten.js`:
  alle Steinzeit-Forschungen, **Steinkreis** gebaut, **120 Einwohner**, Waren 300 Holz, 250 Stein, 300 Nahrung,
  30 Töpferwaren, 30 Werkzeug. Der Aufbruch dauert ein paar Minuten, Waren werden nach und nach geliefert, läuft offline weiter.
- Gebäude derselben Größe entwickeln sich **von selbst** weiter, sobald die nächste Stufe freigeschaltet ist
  (z. B. alle Wohnhöhlen werden Fellzelte). Größere Stufen gehen per Knopf (Grubenhaus 2×2 → Langhaus 3×3).

💡 **Was beim Aufbruch passiert:**
- Neue Stufe **Kupferzeit** beginnt; Fest-Musik, der Stammesälteste erscheint als **Häuptling** (neues Bild).
- Das **Lagerfeuer wird zum Dorfplatz** (gleiche Größe, mehr Lagerplatz) – alle anderen Gebäude bleiben, wie sie sind,
  bis ihre Forschung kommt.
- Holz- und Lederleisten bekommen den Bronzezeit-Look (`leiste-holz-bronzezeit`, `leiste-leder-bronzezeit`).
- Als Geschenk zum Aufbruch: **20 Kupfer** und **30 Kupfererz** (damit man sofort sieht, wofür die neuen Waren sind).
- Am Gebirge werden **Erzfelsen** sichtbar (grünlich-orange schimmernde Felsen) – dort lohnt sich die Kupfermine.

## Grundregel: Gebäude-Linien werden weiterentwickelt

✅ Gilt seit der Steinzeit (Wunsch Emin): Jede Linie bekommt die nächste Stufe – **gleiche Größe, mehr Leistung, neues Bild**.
Die Bauleiste zeigt jede Linie nur einmal, in der neuesten Stufe.

| Linie | Steinzeit (zuletzt) | Bronzezeit | Größe | Stufe | Mehr Leistung |
|---|---|---|---|---|---|
| Mitte | Lagerfeuer | **Dorfplatz** | 3×3 | Aufbruch | Lager 200 → 300, Wärme-Umkreis 7 → 8 |
| Wohnen | Langhaus (14) | **Lehmhaus** → **Hallenhaus** | 3×3 | Kupfer / Spät | 18 bzw. 24 Einwohner |
| Wohnen am Wasser | Pfahlbau (12) | **Fischerhaus** | 3×3 | Spät | 16 Einwohner + mehr Fisch |
| Nahrung (sammeln) | Sammlerin (8) | **Gemüsegarten** | 2×2 | Kupfer | 12 Nahrung |
| Nahrung (jagen) | Mammutjägerlager (20) | **Jagdhütte** | 3×3 | Früh | 26 Nahrung, 3 Felle |
| Nahrung (Wasser) | Fischerplatz (14) | **Fischerhütte** mit Netzen | 2×2 | Kupfer | 20 Nahrung |
| Nahrung (Feld) | Acker (30) | **Feld** mit Hakenpflug und Ochse | 3×3 | Früh | 45 Nahrung (Winter weiter 0) |
| Nahrung (Tiere) | Ziegengehege | **Viehhof** (Schafe, Rinder) | 3×3 | Früh | 14 Nahrung, **4 Wolle**, 1 Fell |
| Holz | Holzsammler (8) | **Holzfäller** mit Kupferbeil | 2×2 | Kupfer | 12 Holz |
| Bäume pflanzen | Pflanzerin | **Baumgärtnerin** 💡 (siehe Extras) | 2×2 | Früh | Setzling alle 40 s statt 60 s |
| Stein | Steinsammler (6) | **Steinbruch** | 2×2 | Kupfer | 9 Stein |
| Wissen | Höhlenmaler (4) | **Felsritzer** → **Sternkundiger** | 2×2 | Kupfer / Spät | 6 bzw. 9 Wissen |
| Wärme/Gemeinschaft | Feuerplatz | **Dorfbrunnen** | 2×2 | Kupfer | Umkreis 5 → 6, dazu +5 Zufriedenheit |
| Kleidung | Fellmacherin | **Weberin** | 2×2 | Früh | 4 Wolle → 4 Kleidung (statt 4 Felle → 2,5) |
| Werkzeug | Steinschläger | **Kupferschmied** → **Bronzeschmied** | 2×2 | Kupfer / Früh | 2 bzw. 3 Werkzeug |
| Glaube | Ahnenplatz | **Heiliger Hain** | 3×3 | Spät | Glaube-Umkreis 8 → 11 |
| Ton | Tongrube (4) | **Lehmgrube** | 2×2 | Kupfer | 6 Ton |
| Töpfern | Töpferei | **Töpferwerkstatt** mit Brennofen | 2×2 | Früh | 2 Töpferwaren statt 1,25 |
| Lager | Vorratsspeicher | **Kornspeicher** | 3×3 | Spät | Lager +150 → +250 |
| Wahrzeichen | Steinkreis | bleibt stehen; neu: **Grabhügel** | 4×4 | Spät | eigenes Wahrzeichen der Bronzezeit |
| Weg / Brücke | Trampelpfad, Brücke | bleiben (💡 Bohlenweg siehe Extras) | 1×1 | – | – |

Anmerkung: In der Steinzeit-Datei stand einmal „Feuerplatz → Dorfplatz“, in der Linien-Tabelle „Lagerfeuer → Dorfplatz“
und „Feuerplatz → Dorfbrunnen“. Dieser Entwurf nimmt die Linien-Tabelle.

✅ (02.11., siehe Liste unten) **Gebäude, die nach der Weiterentwicklung andere Zutaten brauchen** (Steinschläger → Kupferschmied braucht Kupfer,
Fellmacherin → Weberin braucht Wolle, Töpferei → Töpferwerkstatt braucht Holzkohle): Sollen die auch von selbst umgebaut
werden? Dann stünden sie still, bis die neue Ware da ist.
💡 Vorschlag: Gebäude mit **gleichen Zutaten** entwickeln sich wie bisher von selbst; Gebäude mit **neuen Zutaten** nur per
Knopf „Weiterentwickeln“ im Info-Fenster (wie Grubenhaus → Langhaus). Neu gebaute Gebäude sind immer die neueste Stufe.

## Neue Gebäude-Linien

| Gebäude | Linie | Größe | Stufe | Bauzeit | Kosten | Wirkung (je Minute, voll besetzt) |
|---|---|---|---|---|---|---|
| ⛏️ Kupfermine | Erz | 3×3 | Kupfer | 2 min | 80 Holz, 40 Stein, 10 Werkzeug | 4 Kupfererz; muss am Gebirge stehen, an Erzfelsen +50 % |
| ⚫ Köhler | Kohle | 2×2 | Kupfer | 60 s | 40 Holz, 20 Stein | 4 Holz → 2 Holzkohle (Meiler im Wald) |
| 🔥 Schmelzofen | Schmelzen | 2×2 | Kupfer | 2 min | 60 Stein, 20 Ton | 2 Kupfererz + 1 Holzkohle → 1 Kupfer |
| ⚪ Zinnwäscherin | Zinn | 2×2 | Früh | 90 s | 40 Holz, 5 Werkzeug | 1 Zinn; muss am Wasser stehen (wäscht Zinnsand aus dem Fluss) |
| 🥉 Bronzegießer | Bronze | 2×2 | Früh | 2 min | 60 Stein, 20 Kupfer | 2 Kupfer + 1 Zinn → 1 Bronze |
| 🤝 Handelsplatz | Handel | 3×3 | Früh | 3 min | 120 Holz, 60 Stein, 10 Bronze | ein Händler kommt regelmäßig (siehe „Handel“) |
| 💍 Schmuckmacherin | Schmuck | 2×2 | Spät | 2 min | 60 Holz, 40 Stein, 15 Bronze | 1 Bronze + 1 Bernstein → 1 Schmuck |
| ⛰️ Fürstenhügel | Wahrzeichen | 4×4 | Spät | 6 min | 300 Stein, 150 Holz, 30 Bronze | Glaube und Zufriedenheit im großen Umkreis, Pflicht für den Aufbruch |

Die weiterentwickelten Gebäude (Tabelle oben) kosten beim Neubau etwa das 1,3-Fache der Steinzeit-Stufe, ab der Frühen
Bronzezeit zusätzlich ein wenig Bronze (z. B. Lehmhaus 120 Holz, 60 Stein, 30 Ton; Hallenhaus 160 Holz, 80 Stein, 10 Bronze).

✅ (02.11., siehe Liste unten) **Grabhügel in einem fröhlichen Spiel?** Historisch das typische Bauwerk der Bronzezeit (Fürstengräber), aber es geht um Tod.
💡 Vorschlag: als **„Fürstenhügel“** zeigen – ein runder grüner Hügel mit Steinkranz, Blumen, Fahnen und einem Festplatz davor;
im Spiel ist er ein Ort der Ahnen und Feste, Tod wird nicht gezeigt. Alternative: „Häuptlingshalle“ als Wahrzeichen.

✅ (02.11., siehe Liste unten) **Kupfermine nur am Gebirge?** 💡 Ja: Sie muss (wie der Fischer am Wasser) direkt am Gebirge stehen; an den neuen
Erzfelsen gibt es +50 %. Das macht die großen Berge auf der Karte endlich wichtig.

## Waren

Bisher 9 Waren. Neu in der Bronzezeit: 8.

| Ware | Ab Stufe | Woher | Wofür |
|---|---|---|---|
| ⛏️ Kupfererz | Kupfer | Kupfermine, Erzader (Ereignis) | Schmelzofen |
| ⚫ Holzkohle | Kupfer | Köhler (Holz → Holzkohle) | Schmelzofen, Töpferwerkstatt |
| 🟠 Kupfer | Kupfer | Schmelzofen | Kupferschmied, Bronzegießer, Forschung |
| ⚪ Zinn | Früh | Zinnwäscherin (wenig), Händler (mehr) | Bronzegießer |
| 🥉 Bronze | Früh | Bronzegießer | Bronzeschmied, Schmuck, Bauen, Aufbruch |
| 🐑 Wolle | Früh | Viehhof | Weberin (Kleidung) |
| 🟡 Bernstein | Spät | nur vom Händler („Bernsteinstraße“) | Schmuck |
| 💍 Schmuck | Spät | Schmuckmacherin | Bedürfnis der Einwohner, Aufbruch |

Produktionsketten auf einen Blick:

```
Kupfermine ─ Kupfererz ─┐
Köhler ──── Holzkohle ──┴► Schmelzofen ─ Kupfer ─┬► Kupferschmied ─ Werkzeug (Kupferzeit)
Zinnwäscherin / Händler ─ Zinn ──────────────────┴► Bronzegießer ─ Bronze ─┬► Bronzeschmied ─ Werkzeug
Händler ─ Bernstein ───────────────────────────────────────────────────────┴► Schmuckmacherin ─ Schmuck
Viehhof ─ Wolle ─► Weberin ─ Kleidung          Lehmgrube ─ Ton ─┐
                                                Köhler ─ Holzkohle ┴► Töpferwerkstatt ─ Töpferwaren
```

✅ (02.11., siehe Liste unten) **Woher kommt das Zinn?** (Zinn war in der echten Bronzezeit selten und kam von weit her.)
💡 Vorschlag: beides – die **Zinnwäscherin** am Fluss liefert wenig (1 je Minute), der **Händler** bringt mehr.
So bleibt das Spiel auch ohne Handel spielbar, aber Handel lohnt sich.

✅ (02.11., siehe Liste unten) **Geld schon in der Bronzezeit?** 💡 Nein, noch kein Geld – Tausch beim Händler. Geld (Münzen) kommt in der Antike.

## Handel (neu)

💡 Vorschlag, so einfach wie die Mammutjagd:
- Mit einem **Handelsplatz** kommt alle **20 Minuten** (mit Forschung „Rad und Wagen“ alle 15) ein **Händler mit Ochsenkarren**
  über einen Weg zum Handelsplatz (am Fluss auch mit Boot). Er bleibt 5 Minuten.
- Antippen öffnet ein kleines Fenster mit **3 Tauschangeboten** (ab „Bernsteinstraße“ 4), z. B.:
  20 Töpferwaren → 8 Zinn · 30 Felle → 10 Zinn · 60 Nahrung → 20 Kupfererz · 15 Kleidung → 5 Bernstein · 10 Bronze → 6 Bernstein.
- Jedes Angebot geht einmal je Besuch. Die Angebote wechseln.

✅ (02.11., siehe Liste unten) **Soll der Händler auch offline kommen und tauschen?** 💡 Nein – der Händler kommt nur, solange man spielt (wie die Mammutherde);
offline läuft die Wirtschaft wie bisher weiter.

## Bedürfnisse der Einwohner

| Bedürfnis | Ab | Gedeckt durch |
|---|---|---|
| Nahrung, Wärme und Gemeinschaft, Kleidung, Glaube, Töpferwaren | Steinzeit | wie bisher (Dorfbrunnen und Dorfplatz zählen für Wärme/Gemeinschaft) |
| 🗡️ Werkzeug | Früh | Werkzeug im Lager (wenig: 0,01 je Einwohner und Minute) |
| 💍 Schmuck | Spät | Schmuck im Lager (0,02 je Einwohner und Minute, wie Töpferwaren) |

Neue Bedürfnisse zählen wie heute erst nach 10 Minuten Schonfrist und mit einem kleinen Startvorrat.
In der Kupferzeit kommt **kein** neues Bedürfnis – dort baut man erst die Metall-Kette auf.

✅ (02.11., siehe Liste unten) **Neue Bedürfnisse Werkzeug und Schmuck – passt das?** 💡 Ja, so wird Bronze nicht nur Baustoff, sondern die Leute wollen sie auch.

✅ (02.11., siehe Liste unten) **Einwohnerstufen** (z. B. Bauern → Handwerker → Edle, wie in anderen Aufbauspielen)? 💡 Noch nicht – das ist ein großer Umbau.
Erst in der Antike überlegen; in der Bronzezeit reichen bessere Häuser und neue Bedürfnisse.

## Forschungsbaum

Vier Äste wie in der Steinzeit: **Nahrung** · **Wohnen** · **Handwerk** · **Wissen, Glaube und Handel**.
Am Ende jeder Stufe ein Übergangs-Knoten; ganz rechts **Eisenfund** und der Aufbruch in die Eisenzeit.

```
KUPFERZEIT                             FRÜHE BRONZEZEIT                          SPÄTE BRONZEZEIT
Nahrung:  Gartenbau ─ Netze            Hakenpflug · Schafzucht ─ Webstuhl        Plankenboote
Wohnen:   Lehmbau ─ Brunnenbau         Brennofen                                 Hallenhaus · Kornspeicher
Handwerk: Bergbau ─ Kupferschmelze ─┬─ Zinnseifen ─ Bronzeguss ─ Bronzewerkzeug  Schmuckkunst ─┐
                    Kupferbeil      │                                                          ├─ Grabhügel ─► Eisenfund ─► [Aufbruch Eisenzeit]
                    Kupferschmied   │                                                          │
Wissen:   Felsritzungen ────────────┴► [Frühe BZ] Tauschhandel ─ Rad ─► [Späte BZ] Bernsteinstraße, Himmelsscheibe, Heiliger Hain ┘
```

Zahlen wie in `daten.js` (Grundwerte). Im Spiel gilt der Tempo-Regler wie in der Steinzeit: Wissen und Waren ×1,5, Dauer ×0,75.
Steinzeit zum Vergleich: Jungsteinzeit-Forschungen 100–150 Wissen, 14–18 min, 65–110 Einwohner; Kupferfund 150 Wissen, 40 min.

| # | Forschung (ID) | Stufe | Braucht | Einw. | Kosten | Dauer | Bringt |
|---|---|---|---|---|---|---|---|
| 1 | ⛏️ Bergbau (`bergbau`) | Kupfer | Aufbruch | 125 | 130 Wissen, 100 Holz | 12 min | Kupfermine |
| 2 | 🔥 Kupferschmelze (`kupferschmelze`) | Kupfer | 1 | 130 | 140 Wissen, 100 Stein | 13 min | Köhler, Schmelzofen |
| 3 | 🪓 Kupferbeil (`kupferbeil`) | Kupfer | 2 | 140 | 150 Wissen, 15 Kupfer | 14 min | Holzfäller, Steinbruch |
| 4 | 🔨 Kupferschmied (`kupferschmied`) | Kupfer | 2 | 140 | 150 Wissen, 20 Kupfer | 14 min | Steinschläger → Kupferschmied |
| 5 | 🥕 Gartenbau (`gartenbau`) | Kupfer | Aufbruch | 125 | 120 Wissen, 120 Nahrung | 11 min | Sammlerin → Gemüsegarten |
| 6 | 🎣 Netze (`netze`) | Kupfer | 5 | 135 | 130 Wissen, 60 Holz | 12 min | Fischerplatz → Fischerhütte |
| 7 | 🧱 Lehmbau (`lehmbau`) | Kupfer | Aufbruch | 130 | 140 Wissen, 40 Ton | 12 min | Langhaus → Lehmhaus, Tongrube → Lehmgrube |
| 8 | ⛲ Brunnenbau (`brunnenbau`) | Kupfer | 7 | 140 | 140 Wissen, 80 Stein | 13 min | Feuerplatz → Dorfbrunnen |
| 9 | 🪨 Felsritzungen (`felsritzungen`) | Kupfer | Aufbruch | 125 | 110 Wissen | 10 min | Höhlenmaler → Felsritzer |
| 10 | ➡️ **Frühe Bronzezeit** (`fruehe_bronzezeit`) | Übergang | 1–9 | 150 | 180 Wissen, 200 Nahrung, 30 Kupfer | 30 min | öffnet Stufe 2 |
| 11 | ⚪ Zinnseifen (`zinnseifen`) | Früh | 10 | 155 | 160 Wissen, 20 Werkzeug | 13 min | Zinnwäscherin |
| 12 | 🥉 Bronzeguss (`bronzeguss`) | Früh | 11 | 165 | 190 Wissen, 30 Kupfer, 10 Zinn | 15 min | Bronzegießer |
| 13 | 🗡️ Bronzewerkzeug (`bronzewerkzeug`) | Früh | 12 | 180 | 200 Wissen, 15 Bronze | 16 min | Kupferschmied → Bronzeschmied, Mammutjägerlager → Jagdhütte |
| 14 | 🤝 Tauschhandel (`tauschhandel`) | Früh | 10 | 155 | 160 Wissen, 20 Töpferwaren | 13 min | Handelsplatz, Händler |
| 15 | 🛞 Rad und Wagen (`rad`) | Früh | 14 | 170 | 190 Wissen, 150 Holz | 15 min | Bauzeiten −15 %, Händler kommt öfter |
| 16 | 🐂 Hakenpflug (`hakenpflug`) | Früh | 10 | 160 | 180 Wissen, 20 Kupfer | 14 min | Acker → Feld |
| 17 | 🐑 Schafzucht (`schafzucht`) | Früh | 10 | 160 | 180 Wissen, 150 Nahrung | 14 min | Ziegengehege → Viehhof (Wolle) |
| 18 | 🧶 Webstuhl (`webstuhl`) | Früh | 17 | 170 | 190 Wissen, 20 Wolle | 15 min | Fellmacherin → Weberin |
| 19 | 🏺 Brennofen (`brennofen`) | Früh | 10 | 160 | 170 Wissen, 30 Holzkohle | 14 min | Töpferei → Töpferwerkstatt |
| 20 | ➡️ **Späte Bronzezeit** (`spaete_bronzezeit`) | Übergang | 11–19 | 200 | 240 Wissen, 30 Bronze, 40 Kleidung | 35 min | öffnet Stufe 3 |
| 21 | 🟡 Bernsteinstraße (`bernsteinstrasse`) | Spät | 20 | 205 | 220 Wissen, 20 Bronze | 16 min | Händler bringt Bernstein, 4. Angebot |
| 22 | 💍 Schmuckkunst (`schmuckkunst`) | Spät | 21 | 215 | 240 Wissen, 20 Bronze, 10 Bernstein | 17 min | Schmuckmacherin, Bedürfnis Schmuck |
| 23 | 🌙 Himmelsscheibe (`himmelsscheibe`) | Spät | 20 | 210 | 210 Wissen, 10 Bronze | 16 min | Felsritzer → Sternkundiger, Sonnwendfest |
| 24 | 🏡 Hallenhaus (`hallenhaus`) | Spät | 20 | 210 | 230 Wissen, 150 Holz, 10 Bronze | 16 min | Lehmhaus → Hallenhaus |
| 25 | 🛶 Plankenboote (`plankenboote`) | Spät | 20 | 215 | 220 Wissen, 120 Holz | 16 min | Pfahlbau → Fischerhaus |
| 26 | 🌳 Heiliger Hain (`heiliger_hain`) | Spät | 20 | 220 | 240 Wissen, 30 Töpferwaren | 17 min | Ahnenplatz → Heiliger Hain |
| 27 | 🌾 Kornspeicher (`kornspeicher`) | Spät | 20 | 220 | 230 Wissen, 25 Töpferwaren | 17 min | Vorratsspeicher → Kornspeicher, Lager +50 % |
| 28 | ⛰️ Grabhügel (`grabhuegel`) | Spät | 22, 26 | 240 | 250 Wissen, 15 Schmuck | 18 min | Grabhügel (Wahrzeichen) |
| 29 | 🔩 Eisenfund (`eisenfund`) | Spät | 21–28 | 250 | 280 Wissen, 40 Bronze, 20 Schmuck | 40 min | macht den Aufbruch in die Eisenzeit möglich |

Das sind 27 Forschungen und 2 Übergänge (Steinzeit: 22 + 2). Reine Forschungszeit im Spiel: etwa **6 Stunden**
(Grundwerte zusammen ≈ 8 h, mal 0,75). Wissen gesamt im Spiel ≈ 8.000 – dafür braucht es etwa 6–8 Felsritzer/Sternkundige;
das prüft der Bot.

## Aufbruch in die Eisenzeit

Bedingungen (wie beim Aufbruch in die Bronzezeit, ganz rechts im Baum):
- alle Forschungen der Bronzezeit, **Grabhügel** gebaut, jedes Bronzezeit-Gebäude einmal gebaut
  (ohne Gebäude, die besonderes Gelände brauchen, wenn es auf der Karte fehlt)
- **280 Einwohner**
- Waren: 400 Holz, 300 Stein, 400 Nahrung, 60 Bronze, 30 Schmuck, 50 Werkzeug (werden nach und nach geliefert)
- läuft auch offline weiter; danach: Eisenzeit (Eisenerz, Schmiede, befestigte Siedlung – eigener Entwurf)

## Aufträge

✅ Aufträge bleiben (höchstens 3 sichtbar). Neue Aufträge für die Bronzezeit, der Reihe nach:

| ID | Auftrag | Belohnung |
|---|---|---|
| `q_b_mine` | Baue eine Kupfermine | 60 Holz, 40 Stein |
| `q_b_kupfer20` | Habe 20 Kupfer im Lager | 40 Wissen |
| `q_b_garten3` | Baue 3 Gemüsegärten | 80 Nahrung |
| `q_b_pop140` | Erreiche 140 Einwohner | 20 Holzkohle |
| `q_b_frueh` | Erreiche die Frühe Bronzezeit | 100 Holz, 20 Kupfer |
| `q_b_handel` | Baue einen Handelsplatz | 15 Töpferwaren |
| `q_b_tausch3` | Tausche 3-mal mit dem Händler | 10 Zinn |
| `q_b_bronze20` | Habe 20 Bronze im Lager | 60 Wissen |
| `q_b_viehhof2` | Baue 2 Viehhöfe | 100 Nahrung |
| `q_b_pop180` | Erreiche 180 Einwohner | 20 Werkzeug |
| `q_b_spaet` | Erreiche die Späte Bronzezeit | 20 Bronze |
| `q_b_schmuck20` | Habe 20 Schmuck im Lager | 80 Wissen |
| `q_b_pop230` | Erreiche 230 Einwohner | 150 Holz, 100 Stein |
| `q_b_grabhuegel` | Baue den Grabhügel | 30 Bronze, 150 Nahrung |
| `q_b_pop280` | Erreiche 280 Einwohner – bereit für den Aufbruch | 200 Holz, 200 Nahrung |

💡 **Tägliche Belohnung**: gleiche 7-Tage-Reihe, ab der Bronzezeit mit Bronzezeit-Waren (z. B. Tag 7: 100 Holz, 80 Stein,
100 Nahrung, 20 Kupfer, 10 Bronze). Truhe bleibt.

## Ereignisse

| Ereignis | Wann | Was passiert |
|---|---|---|
| 🛒 Händler | mit Handelsplatz, alle 20 (15) min | Ochsenkarren kommt, 3–4 Tauschangebote (siehe „Handel“) |
| ✨ Erzader | selten, an einem Fels am Gebirge | ein Fels glitzert; antippen → ein Bergmann geht hin, bringt nach 1 min 40 Kupfererz (wie die Mammutjagd) |
| ☀️ Sonnwendfest | Mitte Sommer, nach „Himmelsscheibe“ | 5 min Fest am Dorfplatz/Grabhügel: Musik, Menschen tanzen, Zufriedenheit +15 |
| 🌦️ Wetter, Naturkatastrophen | wie bisher | neue Gebäude bekommen passende Wirkungen (Feld wie Acker, Gemüsegarten wie Sammlerin, Fischerhütte wie Fischerplatz); Kupfermine und Werkstätten arbeiten drinnen |

💡 Keine neuen Katastrophen – ruhiges Spiel bleibt ruhig. Mammuts gibt es nicht mehr; neu ziehen **Schafe, Rinder und
Pferde** über die Weiden, Ochsenkarren fahren auf den Wegen.

## Kleine Lebendigkeit (Stimmung)

Menschen in Woll- und Leinenkleidung (siehe Figuren), Rauch aus Schmelzofen und Köhlermeiler, Hammerschläge beim Schmied,
Funken beim Bronzegießer, Ochsenkarren auf den Wegen, Boote mit Planken auf dem Fluss. Musik: Trommeln, Flöte und
**Luren** (die großen Bronze-Hörner der Bronzezeit).

## Einstieg und Hinweise

Der Stammesälteste ist jetzt **Häuptling** (gleicher Mann, prächtiger gekleidet). Kurze Hinweise beim ersten Mal:
1. Nach dem Aufbruch: „Wir haben Kupfer gefunden! Baue eine Kupfermine am Gebirge.“ (Pfeil auf Erzfelsen)
2. Erste Holzkohle / erster Schmelzofen: Kette Erz + Holzkohle → Kupfer erklären.
3. Erste Bronze: „Kupfer und Zinn zusammen ergeben Bronze – härter als alles bisher.“
4. Erster Händler: Tauschfenster erklären.
5. Übergänge und Aufbruch wie in der Steinzeit.

## Kleine Extras

✅ (02.11., siehe Liste unten) **Baumgärtnerin und Bohlenweg** – brauchen wir die? 💡 **Baumgärtnerin ja** (Pflanzerin pflanzt schneller, nötig weil
Holzfäller und Köhler viel Holz brauchen; kommt mit „Kupferbeil“). **Bohlenweg später** (wäre nur Optik).

## Bilder (Prompts)

Nach deinem OK kommen alle Prompts vollständig in `bilder/epochia/prompts.txt` und `README.md` (wie bei der Steinzeit).
Hier schon Aufbau und Inhalt. Neue Dateinamen beginnen mit `2-` (Steinzeit: `1-`).

**Anfang für alle Bronzezeit-Gebäude:**
> Bronze age Europe, early farmers and metalworkers, wood, wattle and daub, clay, thatch and stone, with a few shiny copper
> and bronze objects, no iron.

**Ende (Stil, gleich wie Steinzeit):**
> Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines,
> gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the
> building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible
> and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed,
> consistent style across all assets, square 1:1 format

**Winterbild** (Canva mit dem fertigen Bild als Vorlage, Datei `…-winter`):
> Same image as the reference, exactly the same building, camera angle, plot, earth base and composition, only changed to
> winter: soft white snow on the roofs, on the grass plot and on the objects, a few icicles, warm light in the windows,
> everything else unchanged, plain pure white background, no text, square 1:1 format

**Rückansicht r2** (um 180° gedreht, Datei `…-r2`, danach auch `…-r2-winter`):
> The same building as in the reference image, seen from the opposite side (turned by 180 degrees) so we see its back side,
> same style, same size, same diamond-shaped grass plot and earth base, same camera height and 2:1 isometric angle from the
> front-right, sunlight from top left, plain pure white background, no text, square 1:1 format

Gebäude am Wasser (Fischerhütte, Lehmgrube, Zinnwäscherin, Fischerhaus) brauchen zusätzlich **r1** (um 90° gedreht) und
`r1-winter`, wie Fischerplatz, Tongrube und Pfahlbau.

### Gebäude (Beschreibung, die zwischen Anfang und Ende kommt)

| Datei | Gebäude | Größe | Beschreibung (Mitte des Prompts) |
|---|---|---|---|
| `2-dorfplatz` | Dorfplatz | 3×3 | A lively village square: a big fire bowl on a stone base in the middle, benches, a wooden notice pole with a bronze gong, baskets, sacks and amphora-like clay jars, a small market table, medium plot (3x3) |
| `2-lehmhaus` | Lehmhaus | 3×3 | A cozy bronze age house with thick clay-plastered walls painted light ochre, a steep thatched roof, a wooden door with a small bronze handle, a vegetable patch and firewood, medium plot (3x3) |
| `2-hallenhaus` | Hallenhaus | 3×3 | A large proud bronze age hall house with timber posts, wattle and daub walls, a long high thatched roof, carved gable boards, a family of chickens, a fenced yard, medium plot (3x3) |
| `2-fischerhaus` | Fischerhaus | 3×3 | Houses on wooden stilts above lake water with plank walls and thatched roofs, a plank boat tied to the jetty, fishing nets drying; most of the plot is water, the front edge is shore, medium plot (3x3) |
| `2-gemuesegarten` | Gemüsegarten | 2×2 | A small fenced vegetable garden with rows of peas, beans and cabbages, a wooden hoe, a basket of vegetables, a tiny shed, small plot (2x2) |
| `2-jagdhuette` | Jagdhütte | 3×3 | A sturdy wooden hunting lodge with antlers over the door, bows and spears with bronze tips on a rack, a deer hide on a frame, a hunting dog, medium plot (3x3) |
| `2-fischerhuette` | Fischerhütte | 2×2 | A small fisher's hut at a river bank, big fishing nets hanging on poles, a small plank boat, fish drying; the back half of the plot is blue water, small plot (2x2) |
| `2-feld` | Feld | 3×3 | A golden grain field being ploughed by a friendly ox pulling a wooden ard plough, neat furrows, sheaves of wheat, a low fence, medium plot (3x3) |
| `2-viehhof` | Viehhof | 3×3 | A farmyard with a wattle fence, fluffy sheep and a brown cow, a small stable with thatched roof, a hay pile and a water trough, medium plot (3x3) |
| `2-holzfaeller` | Holzfäller | 2×2 | A woodcutter's place: neatly stacked logs, a chopping block with a copper axe, a small shed of planks, wood chips, small plot (2x2) |
| `2-baumgaertnerin` | Baumgärtnerin | 2×2 | A small tree nursery: rows of young saplings in the ground, watering jugs of clay, a little shed with seed baskets, small plot (2x2) |
| `2-steinbruch` | Steinbruch | 2×2 | A small quarry cut into a grey rock, cut stone blocks, a wooden sled, copper chisels and a wooden mallet, small plot (2x2) |
| `2-felsritzer` | Felsritzer | 2×2 | A smooth rock slab with carved pictures of boats, sun wheels and people, a carver with a hammer stone, a small fire for light, small plot (2x2) |
| `2-sternkundiger` | Sternkundiger | 2×2 | A small round hut with a viewing platform, a large green-and-gold sky disc with sun, moon and stars on a wooden stand, a few marker stones, small plot (2x2) |
| `2-dorfbrunnen` | Dorfbrunnen | 2×2 | A village well made of stones with a wooden roof and a bucket on a rope, a bench, flowers and clay jugs around it, small plot (2x2) |
| `2-weberin` | Weberin | 2×2 | A weaver's hut with an upright wooden loom with clay loom weights, colorful woolen cloth, baskets of wool, small plot (2x2) |
| `2-kupferschmied` | Kupferschmied | 2×2 | A small coppersmith's workshop: a stone anvil, copper axes and knives, a small glowing hearth with bellows, a thatched roof, small plot (2x2) |
| `2-bronzeschmied` | Bronzeschmied | 2×2 | A bronze smith's workshop: shiny bronze tools and swords on a rack, an anvil, a glowing hearth with leather bellows and sparks, small plot (2x2) |
| `2-heiliger-hain` | Heiliger Hain | 3×3 | A peaceful sacred grove: a circle of old oak trees, a carved wooden figure, a stone altar with flowers and fruit offerings, bronze sun discs hanging from branches, medium plot (3x3) |
| `2-lehmgrube` | Lehmgrube | 2×2 | A clay pit at a river bank with wooden steps, lumps of clay, wooden buckets and a wheelbarrow-like sled; the back of the plot is water, small plot (2x2) |
| `2-toepferwerkstatt` | Töpferwerkstatt | 2×2 | A pottery workshop with a dome-shaped clay kiln with smoke, decorated pots and jars on shelves, a stack of charcoal, small plot (2x2) |
| `2-kornspeicher` | Kornspeicher | 3×3 | A big granary on stone feet with a thatched roof and a ladder, sacks of grain, large clay storage jars, medium plot (3x3) |
| `2-kupfermine` | Kupfermine | 3×3 | A mine entrance into a rocky green-orange ore hill with wooden supports, a small cart on wooden rails with copper ore, baskets, a pick with a copper head, medium plot (3x3) |
| `2-koehler` | Köhler | 2×2 | A charcoal burner's place: a smoking dome-shaped charcoal pile covered with earth, stacks of logs, sacks of black charcoal, small plot (2x2) |
| `2-schmelzofen` | Schmelzofen | 2×2 | A small round clay furnace glowing orange with leather bellows, a crucible of glowing liquid copper, a pile of green ore and charcoal, small plot (2x2) |
| `2-zinnwaescherin` | Zinnwäscherin | 2×2 | A tin washing place at a river: wooden sluices and pans, dark tin sand drying, small baskets; the back of the plot is water, small plot (2x2) |
| `2-bronzegiesser` | Bronzegießer | 2×2 | A bronze caster's workshop: a glowing furnace, clay moulds, a crucible pouring golden bronze, shiny finished bronze axes, small plot (2x2) |
| `2-handelsplatz` | Handelsplatz | 3×3 | A cheerful trading place: a wooden stall with a cloth roof, an ox cart full of goods, bales, clay jars, amber and bronze rings on a table, medium plot (3x3) |
| `2-schmuckmacherin` | Schmuckmacherin | 2×2 | A small jeweler's hut: a workbench with bronze bracelets, neck rings and amber beads, tiny tools, a colorful cloth awning, small plot (2x2) |
| `2-grabhuegel` | Grabhügel | 4×4 | A big round friendly green hill mound with a ring of standing stones at its foot, flowers, colorful banners on poles and a small festive square with a fire bowl in front, large plot (4x4) |

Je Gebäude 4 Bilder (normal, Winter, r2, r2-Winter), die 4 Gebäude am Wasser 6 – zusammen **124 Gebäudebilder**.

✅ (02.11., siehe Liste unten) **Neue Baustellen-Bilder für die Bronzezeit?** 💡 Nein, die drei Steinzeit-Baustellen passen weiter.

### Waren (rund, klein) – Ende wie bei den Steinzeit-Waren („Style: round game icon …“)

| Datei | Beschreibung |
|---|---|
| `ware-kupfererz` | A chunk of rock with green and orange copper ore |
| `ware-holzkohle` | A small pile of black charcoal pieces |
| `ware-kupfer` | A shiny orange-brown copper ingot shaped like a flat bun |
| `ware-zinn` | A small silver-grey tin ingot and a few tin grains |
| `ware-bronze` | A golden-brown bronze bar with a ring on top |
| `ware-wolle` | A fluffy ball of white sheep wool |
| `ware-bernstein` | Three glowing golden-orange amber stones |
| `ware-schmuck` | A shiny bronze bracelet with amber beads |

### Forschung (rund, klein) – Ende wie bei den Steinzeit-Forschungen

`f-bergbau` a pick and a lump of copper ore · `f-kupferschmelze` a small glowing clay furnace · `f-kupferbeil` a copper axe ·
`f-kupferschmied` a hammer on an anvil with a copper knife · `f-gartenbau` a carrot, a cabbage and a hoe · `f-netze` a fishing net with fish ·
`f-lehmbau` hands smoothing a clay wall · `f-brunnenbau` a stone well with a bucket · `f-felsritzungen` a rock carving of a boat and a sun ·
`f-fruehe-bronzezeit` a sunrise over a hill with a shining bronze axe · `f-zinnseifen` a wooden pan with dark tin sand in a river ·
`f-bronzeguss` a crucible pouring golden bronze into a mould · `f-bronzewerkzeug` a bronze axe and a bronze sickle crossed ·
`f-tauschhandel` two hands exchanging a clay pot and a bronze ring · `f-rad` a wooden wheel · `f-hakenpflug` an ox head with a wooden plough ·
`f-schafzucht` a cute sheep head · `f-webstuhl` a small loom with colorful cloth · `f-brennofen` a clay kiln with a fire ·
`f-spaete-bronzezeit` a sunrise over a green hill mound with banners · `f-bernsteinstrasse` amber stones on a winding road ·
`f-schmuckkunst` a bronze neck ring with amber · `f-himmelsscheibe` a green-and-gold sky disc with sun, moon and stars ·
`f-hallenhaus` a big hall house with a long thatched roof · `f-plankenboote` a wooden plank boat with paddles · `f-heiliger-hain` an old oak tree with a sun disc ·
`f-kornspeicher` a granary on stone feet · `f-grabhuegel` a green hill mound with standing stones · `f-eisenfund` a dark reddish iron ore lump with a glint

### Figuren, Tiere, Sonstiges

| Datei | Beschreibung (Stil wie Stammesältester bzw. wie Mammut/Hirsch) |
|---|---|
| `aeltester-2` | the same friendly old tribal elder, now a bronze age chieftain: checkered woolen cloak with a big bronze brooch, a shiny bronze neck ring, a staff with a bronze sun disc, waving one hand, upper body |
| `mensch-bergmann` | a cheerful miner with a leather cap, a pick and a basket of green ore on his back, walking to the left, full body |
| `mensch-schmied` | a friendly smith with a leather apron and a bronze hammer, walking to the left, full body |
| `mensch-haendler` | a cheerful traveling trader in a colorful woolen tunic with a big bundle on his back, walking to the left, full body |
| `ochsenkarren` | a cute ox pulling a wooden two-wheeled cart with sacks and jars, walking to the left |
| `schaf`, `rind`, `pferd` | a cute sheep / a cute brown cow / a cute small brown horse, walking to the left |
| `leiste-holz-bronzezeit`, `leiste-leder-bronzezeit` | wie die Steinzeit-Leisten, mit Bronze-Nieten und Kupferbeschlägen |

✅ (02.11., siehe Liste unten) **Brauchen alle Menschen neue Kleidung** (Wolle statt Fell)? Das wären alle ~16 Menschenbilder noch einmal.
💡 Vorschlag: Erst nur **Häuptling + 3 neue Berufe** (Bergmann, Schmied, Händler) und die Tiere; die Steinzeit-Menschen
bleiben. Neue Kleidung für alle später, wenn Zeit ist.

## Für den Bau (kurz, technisch)

- `STAGES` bekommt `kupferzeit`, `fruehbronze`, `spaetbronze` mit `epoch: 'Bronzezeit'`; `NEXT_EPOCH` wird zum echten
  Übergang (Stufe `kupferzeit`); neuer `NEXT_EPOCH` für die Eisenzeit.
- Neue Gebäude-IDs (nie wieder umbenennen): `dorfplatz`, `lehmhaus`, `hallenhaus`, `fischerhaus`, `gemuesegarten`, `jagdhuette`,
  `fischerhuette`, `feld`, `viehhof`, `holzfaeller`, `baumgaertnerin`, `steinbruch`, `felsritzer`, `sternkundiger`, `dorfbrunnen`,
  `weberin`, `kupferschmied`, `bronzeschmied`, `heiliger_hain`, `lehmgrube`, `toepferwerkstatt`, `kornspeicher`, `kupfermine`,
  `koehler`, `schmelzofen`, `zinnwaescherin`, `bronzegiesser`, `handelsplatz`, `schmuckmacherin`, `grabhuegel`.
- Neue Felder im Spielstand (Händler, Erzader) in `sanitizeState` mit Standardwert; Steinzeit-Spielstände laden weiter.
- `WEATHERS`, `DISASTERS`, `SEASON_FACTORS`, `OUTDOOR_WORK` um die neuen Gebäude ergänzen; Bot lernt Mine, Schmelze, Handel.
- Größe: grob 500–800 Zeilen (Daten, Handel, Erz am Gebirge, Fenster) – wird in mehreren Schritten mit dir gebaut.

## Offene Fragen an Emin (Sammlung)

✅ **Von Emin am 2026-11-02 entschieden** (jeweils der Vorschlag):
- ✅ Dauer der Bronzezeit: etwa 6 Stunden reine Forschungszeit.
- ✅ Steinschläger → Kupferschmied, Fellmacherin → Weberin, Töpferei → Töpferwerkstatt nur per Knopf umbauen, alles andere automatisch.
- ✅ Wahrzeichen ist der **Fürstenhügel** (statt „Grabhügel“) mit Festplatz, Tod wird nicht gezeigt.
- ✅ Kupfermine an Felsen oder am Gebirge, am Gebirge bis +50 % (geändert: das Gebirge liegt 156–170 Felder vom Feuer entfernt, „nur am Gebirge“ hätte 18–20 Landstücke gekostet). Eigene Erzfelsen entfallen vorerst.
- ✅ Zinn: Zinnwäscherin (wenig) und Händler (mehr).
- ✅ Kein Geld: Tausch beim Händler; Geld kommt in der Antike.
- ✅ Händler kommt nur beim Spielen, nicht offline.
- ✅ Neue Bedürfnisse Werkzeug und Schmuck.
- ✅ Keine Einwohnerstufen, frühestens in der Antike wieder besprechen.
- ✅ Baumgärtnerin ja, Bohlenweg später.
- ✅ Keine neuen Baustellen-Bilder.
- ✅ Neue Bilder erst für Häuptling, Bergmann, Schmied, Händler und die Tiere; übrige Menschen bleiben vorerst.
- ✅ Religion: eine Wahl beim Aufbruch in die Antike, neu wählen nur beim Aufbruch in ein neues Zeitalter.

Seit Epochia Version 58 gilt auch für die Bronzezeit: Forschungen verlangen Gebäude (`TECH_NEEDS`), Aufträge je Stufe,
Wünsche des Stammes auch mit den neuen Waren (`CONFIG.wishes`).
