# Plan: Der Händler aus dem Süden (Eisenzeit)

Entwurf von Claude, 2026-11-11. **Noch nicht gebaut, Emin entscheidet.** Alle Zahlen sind Startwerte.

Zeichen: 💡 Vorschlag · ❓ Frage an Emin

**Kurz gesagt:** In der Späten Eisenzeit kommt ab und zu ein Händler mit einem Esel voller Amphoren über die Alpen. Er kommt seltener als der normale Händler, bleibt länger und bringt Wein und Glas. Dafür will er, was im Norden reich macht: Salz, Eisen und Felle.

## 1 · Was ihn vom normalen Händler unterscheidet

| | Normaler Händler | Händler aus dem Süden |
|---|---|---|
| Ab wann | erster Handelsplatz (Bronzezeit) | Forschung „Weinhandel“ (Späte Eisenzeit) |
| Wie oft | alle 20 Minuten (15 mit „Rad und Wagen“) | alle 45 Minuten |
| Wie lange | 5 Minuten | 10 Minuten |
| Was er bringt | Zinn, Erz, Wolle, Bernstein … | Wein und Glas |
| Angebote | 3 bis 5, gewürfelt | immer dieselben 3 |
| Aussehen | Mann mit Ochse 🐂 | Mann mit Esel 🫏 und Amphoren |

Gleich bleibt: Er kommt nur, solange man spielt, nicht offline. Kein Geld, nur Ware gegen Ware. Jedes Angebot geht einmal je Besuch. Er braucht einen Handelsplatz oder Handelshof, der an den Weg angeschlossen ist.

💡 **Wein gibt es nur noch beim Händler aus dem Süden.** Der normale Händler verliert seine zwei Wein-Angebote (20 Salz → 25 Wein, 25 Kleidung → 20 Wein). Begründung: Wein ist dann das Erkennungszeichen des Südens, und sein Besuch wird ein kleines Fest. Wein ist nur ein Bonus für die Laune (+6), es schadet also nicht, wenn er mal fehlt.

💡 **Glas bleibt auch beim normalen Händler** (25 Salz → 6 Glas). Begründung: Glas ist Pflicht für „Keltenschrift“ (20) und den Aufbruch in die Antike (30). Fehlt der Glasmacherin Holzkohle, soll man nicht 45 Minuten auf den Süden warten müssen. Der Süden bringt Glas nur günstiger.

## 2 · Startwerte

- **Erster Besuch:** 5 Minuten, nachdem „Weinhandel“ fertig ist. Danach alle **45 Minuten** von Ankunft zu Ankunft.
- **Bleibt 10 Minuten**, damit man ihn auch bei kurzem Spielen am Handy nicht verpasst.
- Ist gerade der normale Händler da, wartet der Südhändler, bis dieser weg ist. So gibt es nie zwei Blasen am selben Platz.
- Ankunft mit Meldung: „🫏 Ein Händler aus dem Süden ist da – er bringt Wein und Glas!“

| Du gibst | Du bekommst | Warum diese Menge |
|---|---|---|
| 30 🧂 Salz | 60 🍇 Wein | Wein: 400 Einwohner trinken 2 je Minute, 60 reichen 30 Minuten. Salz: 3 Siedereien und Salzberg machen 13 je Minute, das Bedürfnis frisst 8, übrig sind etwa 5 je Minute, also gut 200 bis zum nächsten Besuch. |
| 40 🦌 Felle | 30 🍇 Wein | Felle braucht in der Eisenzeit kaum jemand mehr, Jagdhof (4) und Rindergut (2) lassen sie liegen. So werden sie wieder wertvoll. |
| 20 🔩 Eisen | 10 🟢 Glas | 3 Rennöfen machen 3 Eisen je Minute, 20 sind 7 Minuten. Eine Glasmacherin braucht für 10 Glas 10 Minuten und 20 Holzkohle. Das ist ein guter, aber kein zu guter Tausch. |

Beide Wein-Angebote zusammen bringen 90 Wein, das reicht bei 400 Einwohnern 45 Minuten, also genau bis zum nächsten Besuch. Alle Mengen liegen weit unter dem Lagerplatz (in der Eisenzeit mehrere hundert je Ware), nichts geht verloren.

## 3 · Aussehen

- **Figur:** ein Mann mit Hut und hellem Umhang, daneben ein Esel mit zwei Amphoren auf dem Rücken. Er steht auf der anderen Seite des Handelsplatzes als der normale Händler.
- **Blase zum Antippen:** 🍇 statt 🤝, damit man ihn sofort erkennt.
- **Vorläufig:** Es gibt noch kein Händlerbild in `bilder/epochia/figuren/`, auch der normale Händler ist ein einfacher Mann (`mensch-mann`) mit Ochsen-Zeichen. Der Südhändler nutzt vorläufig `mensch-mann` mit dem Zeichen 🫏 und eine kleine 🏺 daneben. Im Fenster steht das Zeichen 🫏.
- **Später als Canva-Bilder:** `figuren/mensch-suedhaendler.webp` (Mann mit Hut), `figuren/esel-amphoren.webp` (Esel mit Last), dazu ein kleines Bild für das Fenster. Zusammen 2–3 Bilder. Der normale Händler bräuchte genauso noch ein eigenes Bild mit Ochsenkarren.

## 4 · Technik in Kürze

- `CONFIG.suedhaendler` in `daten.js`: `requires: 'weinhandel'`, `firstWait: 300`, `every: 2700`, `stay: 600`, die 3 Angebote.
- Neues Feld im Spielstand `state.suedhaendler = { wait, left, visit, done }`. In `sanitizeState` mit Standardwert `{ wait: 300, left: 0, visit: 0, done: [] }`, `done` nur mit bekannten Angebots-IDs. Alte Stände laden einfach ohne ihn.
- `logik.js`: `updateSuedhaendler(dt)` wie `updateTrader` (nicht offline, wartet auf den normalen Händler), `suedhaendlerHere()`. `tradeProblem`/`doTrade` bekommen einen Schalter für den Händler, statt sie zu verdoppeln.
- Aus `CONFIG.trader.offers` fallen `salz_wein` und `kleid_wein` weg. Wer sie gerade im Spielstand als getauscht stehen hat, verliert nur diesen Eintrag, das ist harmlos.
- `leben.js`: Figur, Esel und Blase wie beim Wanderer. `oberflaeche.js`: Fenster und Karte bei den Aufträgen wie `traderHtml`/`traderCardHtml`.
- **Umfang:** etwa 130–150 Zeilen (Wanderer waren 119).
- **Tests:** kommt nicht vor „Weinhandel“, nicht offline, nicht zusammen mit dem normalen Händler; kommt nach 5 Minuten, geht nach 10; Tausch zieht Ware ab und gibt Wein/Glas; jedes Angebot nur einmal; bleibt nach Speichern und Laden erhalten; alter Stand ohne Feld lädt. Der Testspieler spielt die Eisenzeit noch nicht, die Bot-Werte ändern sich also nicht.

## 5 · Fragen an Emin

❓ **Soll Wein beim normalen Händler ganz wegfallen?**
💡 Ja, Wein nur noch aus dem Süden, Glas bei beiden (siehe oben).

❓ **Kommt er immer wieder oder nur einmal, wie der Wanderer?**
💡 Immer wieder, alle 45 Minuten. Wein ist sonst nirgends zu bekommen, ein einziger Besuch wäre zu wenig.

❓ **Soll er auch etwas ganz Seltenes mitbringen, zum Beispiel ein neues Fundstück (Glasarmreif, Korallenperle) für das Album?**
💡 Erst einmal nicht, damit es klein bleibt. Später als viertes Angebot, wenn es Bilder dafür gibt.

❓ **Soll der Salzberg oder der Handelshof ihn öfter kommen lassen?**
💡 Nein, er kommt immer alle 45 Minuten. Das ist leichter zu verstehen, und das Besondere bleibt.
