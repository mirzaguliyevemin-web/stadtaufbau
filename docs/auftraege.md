# Aufträge in Epochia

Stand: Version 139 (07.11.2026). Die Tabellen unten sind aus `QUESTS` in `neu/js/daten.js` erzeugt.
Insgesamt **77 Aufträge**: Altsteinzeit 24, Mittelsteinzeit 10, Jungsteinzeit 13, Kupferzeit 6, Frühe Bronzezeit 6,
Späte Bronzezeit 4, Eisenzeit 14. Nach dem letzten Eisenzeit-Auftrag ist die Liste leer, bis die Antike kommt.

## So funktioniert die Liste

- **Höchstens 3 Aufträge** sind gleichzeitig zu sehen (Knopf „Aufträge“ links).
- **Reihenfolge:** Das Spiel geht die Liste von oben nach unten durch und zeigt zuerst Aufträge, die **schon erfüllt** sind
  oder die man **jetzt angehen kann**. Gesperrte Aufträge (Gebäude oder Forschung fehlt noch) rutschen nach hinten, damit sie
  die Liste nicht verstopfen (Wunsch Emin, 02.11.).
- **Fernziele** („Erreiche die Mittelsteinzeit“, „Brich in die Bronzezeit auf“ …) kommen erst auf einen Platz, wenn sonst nichts
  zu tun ist.
- **Abholen:** Ist ein Auftrag erfüllt, erscheint „🎁 Abholen“. Erst dann gibt es die Belohnung, und der nächste Auftrag rückt nach.
  Jeder Auftrag gibt zusätzlich **5 Gold** (für den Shop).
- Aufträge aus späteren Zeitaltern können schon früher auftauchen, wenn vorher alles erledigt ist. Sie bleiben dann aber gesperrt,
  bis das Gebäude oder die Ware freigeschaltet ist.

## Wie gezählt wird

| Art | Was zählt |
|---|---|
| **Bauen** („Baue 2 Sammlerinnen“) | alle jemals **fertig gebauten** Gebäude dieser Art, auch abgerissene. Weiterentwickelte zählen für die neue Art mit (aus 3 Sammlerinnen werden in der Kupferzeit 3 Gemüsegärten) |
| **Bauen, auch weiterentwickelte** („Habe 8 Wohnungen“, „Baue 4 Jägerlager“) | was **jetzt steht**, ab dieser Stufe aufwärts: Fellzelte zählen als Wohnhöhlen, Mammutjägerlager als Jägerlager. Seit Version 136 zählen auch große Wohnhäuser (Langhaus …) als Wohnungen |
| **Einwohner** | wie viele Menschen jetzt im Dorf leben |
| **Vorrat** („Habe 100 Holz im Lager“) | was **gerade** im Lager liegt (das Lager muss groß genug sein) |
| **Forschung / Zeitalter** | abgeschlossene Forschungen bzw. die eine Übergangs-Forschung |
| **Land** | gekaufte Landstücke |
| **Wünsche, Mammutjagd, Händler** | wie oft man das schon gemacht hat |

## Besondere Aufträge

- **🙏 Wünsche des Stammes** (4 Aufträge: 1, 3, 6 und 12 Wünsche): Ein Wunsch ist eine Bitte um eine Ware, z. B. „Der Stamm möchte ein
  großes Festmahl feiern“ (150 Nahrung). Gewünscht wird nur, was das Dorf schon herstellt. Erfüllt man ihn, gibt es Wissen,
  2 Gold, und die laufende Forschung wird **90 Sekunden kürzer**. Danach kommt **5 Minuten** lang kein neuer Wunsch; ein offener
  Wunsch wechselt nach **10 Minuten** zu einer anderen Ware. Je Zeitalter wollen und geben Wünsche 25 % mehr. Es ist immer nur
  **ein** Wunsch-Auftrag gleichzeitig in der Liste.
- **🦣 Mammutjagd** (Nr. 23): Erst nach der Forschung „Mammutjagd“. Zieht eine Herde vorbei, schickt man die Jäger los. Sterben die
  Mammuts aus, bevor man gejagt hat, **verschwindet der Auftrag** (er wäre sonst nicht mehr zu schaffen).
- **🤝 Händler** („Tausche 3-mal mit dem Händler“): erst nach der Forschung „Tauschhandel“.
- **🏛️ Wunderwerke**: Steinkreis (Jungsteinzeit), Fürstenhügel (Späte Bronzezeit) und Ringwall (Eisenzeit) haben je einen Auftrag
  mit großer Belohnung.
- **🚀 Aufbruch**: Am Ende jedes Zeitalters steht „Erreiche … Einwohner – bereit für den Aufbruch“ (120, 280, 480) mit der größten
  Belohnung des Zeitalters.

## Alle Aufträge

### Altsteinzeit

| Nr. | Auftrag | Art | Kommt … | Belohnung |
|---|---|---|---|---|
| 1 | Baue 2 Sammlerinnen | Bauen | sofort | 🪵 20 Holz + 🪙 5 Gold |
| 2 | Erreiche 10 Einwohner | Einwohner | sofort | 🍖 30 Nahrung + 🪙 5 Gold |
| 3 | Schließe eine Forschung ab | Forschung | sofort | 💡 10 Wissen + 🪙 5 Gold |
| 4 | Habe 100 Holz im Lager | Vorrat | sobald es einen Hersteller für Holz gibt | 🪨 30 Stein + 🪙 5 Gold |
| 5 | Baue ein Jägerlager | Bauen | sofort | 🍖 40 Nahrung + 🪙 5 Gold |
| 6 | Baue 2 Holzsammler | Bauen | sofort | 🪨 15 Stein + 🪙 5 Gold |
| 7 | Baue 2 Steinsammler | Bauen | sofort | 🪵 15 Holz + 🪙 5 Gold |
| 8 | Lege 30 Felder Trampelpfad | Bauen | sofort | 🪵 30 Holz + 🪙 5 Gold |
| 9 | Erreiche 15 Einwohner | Einwohner | sofort | 💡 20 Wissen + 🪙 5 Gold |
| 10 | Baue 2 Feuerplätze | Bauen | sofort | 🍖 30 Nahrung + 🪙 5 Gold |
| 11 | Baue 2 Höhlenmaler | Bauen | sofort | 💡 10 Wissen + 🪙 5 Gold |
| 12 | Erfülle einen Wunsch des Stammes | Wünsche | sofort | 💡 10 Wissen + 🪙 5 Gold |
| 13 | Baue eine Pflanzerin | Bauen | sofort | 🪵 25 Holz + 🪙 5 Gold |
| 14 | Kaufe ein neues Landstück | Land | sofort | 🪨 40 Stein + 🪙 5 Gold |
| 15 | Baue 2 Jägerlager | Bauen | sofort | 🍖 40 Nahrung, 🦌 5 Felle + 🪙 5 Gold |
| 16 | Erreiche 20 Einwohner | Einwohner | sofort | 🪵 40 Holz + 🪙 5 Gold |
| 17 | Habe 8 Wohnungen | Bauen (auch weiterentwickelte zählen) | sofort | 🪨 40 Stein + 🪙 5 Gold |
| 18 | Baue 3 Höhlenmaler | Bauen | sofort | 💡 15 Wissen + 🪙 5 Gold |
| 19 | Baue 3 Feuerplätze | Bauen | sofort | 🍖 40 Nahrung + 🪙 5 Gold |
| 20 | Baue 3 Fellzelte | Bauen | sobald Fellzelt freigeschaltet ist (Fellzelte) | 🪵 40 Holz, 🦌 4 Felle + 🪙 5 Gold |
| 21 | Erreiche 25 Einwohner | Einwohner | sofort | 🦌 5 Felle, 💡 10 Wissen + 🪙 5 Gold |
| 22 | Erfülle 3 Wünsche des Stammes | Wünsche | sofort | 💡 20 Wissen + 🪙 5 Gold |
| 23 | Schicke die Jäger auf Mammutjagd | Mammutjagd | nach Forschung „Mammutjagd“ | 🪵 40 Holz, 🪨 30 Stein + 🪙 5 Gold |
| 24 | Erreiche die Mittelsteinzeit | Zeitalter-Ziel | Fernziel – rückt erst nach, wenn sonst nichts zu tun ist | 🪵 60 Holz, 🪨 60 Stein + 🪙 5 Gold |

### Mittelsteinzeit

| Nr. | Auftrag | Art | Kommt … | Belohnung |
|---|---|---|---|---|
| 25 | Erreiche 30 Einwohner | Einwohner | sofort | 🗡️ 10 Werkzeug + 🪙 5 Gold |
| 26 | Kaufe 3 neue Landstücke | Land | sofort | 🪵 60 Holz + 🪙 5 Gold |
| 27 | Baue 4 Jägerlager | Bauen (auch weiterentwickelte zählen) | sofort | 🍖 60 Nahrung, 🦌 10 Felle + 🪙 5 Gold |
| 28 | Baue einen Fischerplatz | Bauen | sobald Fischerplatz freigeschaltet ist (Einbaum) | 🍖 60 Nahrung + 🪙 5 Gold |
| 29 | Baue 2 Steinschläger | Bauen | sobald Steinschläger freigeschaltet ist (Feine Klingen) | 🪨 50 Stein + 🪙 5 Gold |
| 30 | Baue 2 Fellmacherinnen | Bauen | sobald Fellmacherin freigeschaltet ist (Fellbearbeitung) | 🦌 15 Felle + 🪙 5 Gold |
| 31 | Baue einen Ahnenplatz | Bauen | sobald Ahnenplatz freigeschaltet ist (Ahnenkult) | 💡 30 Wissen + 🪙 5 Gold |
| 32 | Habe 20 Kleidung im Lager | Vorrat | sobald es einen Hersteller für Kleidung gibt | 💡 30 Wissen + 🪙 5 Gold |
| 33 | Erfülle 6 Wünsche des Stammes | Wünsche | sofort | 💡 30 Wissen + 🪙 5 Gold |
| 34 | Erreiche die Jungsteinzeit | Zeitalter-Ziel | Fernziel – rückt erst nach, wenn sonst nichts zu tun ist | 🪵 100 Holz, 🪨 80 Stein + 🪙 5 Gold |

### Jungsteinzeit

| Nr. | Auftrag | Art | Kommt … | Belohnung |
|---|---|---|---|---|
| 35 | Baue 2 Äcker | Bauen | sobald Acker freigeschaltet ist (Ackerbau) | 🗡️ 10 Werkzeug + 🪙 5 Gold |
| 36 | Erreiche 60 Einwohner | Einwohner | sofort | 🏺 10 Töpferwaren + 🪙 5 Gold |
| 37 | Baue ein Ziegengehege | Bauen | sobald Ziegengehege freigeschaltet ist (Viehzucht) | 🦌 15 Felle + 🪙 5 Gold |
| 38 | Baue 3 Langhäuser | Bauen | sobald Langhaus freigeschaltet ist (Langhausbau) | 🪵 80 Holz + 🪙 5 Gold |
| 39 | Erreiche 80 Einwohner | Einwohner | sofort | 🪵 80 Holz, 🪨 60 Stein + 🪙 5 Gold |
| 40 | Baue einen Vorratsspeicher | Bauen | sobald Vorratsspeicher freigeschaltet ist (Vorratshaltung) | 🍖 100 Nahrung + 🪙 5 Gold |
| 41 | Habe 40 Kleidung im Lager | Vorrat | sobald es einen Hersteller für Kleidung gibt | 🦌 20 Felle + 🪙 5 Gold |
| 42 | Erreiche 100 Einwohner | Einwohner | sofort | 🗡️ 20 Werkzeug + 🪙 5 Gold |
| 43 | Habe 30 Töpferwaren im Lager | Vorrat | sobald es einen Hersteller für Töpferwaren gibt | 💡 40 Wissen + 🪙 5 Gold |
| 44 | Erfülle 12 Wünsche des Stammes | Wünsche | sofort | 💡 40 Wissen + 🪙 5 Gold |
| 45 | Baue einen Steinkreis | Bauen | sobald Steinkreis freigeschaltet ist (Sternenkunde) | 🪵 100 Holz, 🍖 100 Nahrung + 🪙 5 Gold |
| 46 | Erreiche 120 Einwohner – bereit für den Aufbruch | Einwohner | sofort | 🪵 150 Holz, 🍖 150 Nahrung + 🪙 5 Gold |

### Kupferzeit

| Nr. | Auftrag | Art | Kommt … | Belohnung |
|---|---|---|---|---|
| 47 | Brich in die Bronzezeit auf | Zeitalter-Ziel | Fernziel – rückt erst nach, wenn sonst nichts zu tun ist | 🪵 100 Holz, 🪨 100 Stein + 🪙 5 Gold |
| 48 | Baue eine Kupfermine | Bauen | sobald Kupfermine freigeschaltet ist (Bergbau) | 🪵 60 Holz, 🪨 40 Stein + 🪙 5 Gold |
| 49 | Habe 20 Kupfer im Lager | Vorrat | sobald es einen Hersteller für Kupfer gibt | 💡 40 Wissen + 🪙 5 Gold |
| 50 | Baue 3 Gemüsegärten | Bauen | sobald Gemüsegarten freigeschaltet ist (Gartenbau) | 🍖 80 Nahrung + 🪙 5 Gold |
| 51 | Erreiche 140 Einwohner | Einwohner | sofort | ⚫ 20 Holzkohle + 🪙 5 Gold |
| 52 | Erreiche die Frühe Bronzezeit | Zeitalter-Ziel | Fernziel – rückt erst nach, wenn sonst nichts zu tun ist | 🪵 100 Holz, 🟠 20 Kupfer + 🪙 5 Gold |

### Frühe Bronzezeit

| Nr. | Auftrag | Art | Kommt … | Belohnung |
|---|---|---|---|---|
| 53 | Baue einen Handelsplatz | Bauen | sobald Handelsplatz freigeschaltet ist (Tauschhandel) | 🏺 15 Töpferwaren + 🪙 5 Gold |
| 54 | Tausche 3-mal mit dem Händler | Händler | nach Forschung „Tauschhandel“ | ⚪ 10 Zinn + 🪙 5 Gold |
| 55 | Habe 20 Bronze im Lager | Vorrat | sobald es einen Hersteller für Bronze gibt | 💡 60 Wissen + 🪙 5 Gold |
| 56 | Baue 2 Viehhöfe | Bauen | sobald Viehhof freigeschaltet ist (Schafzucht) | 🍖 100 Nahrung + 🪙 5 Gold |
| 57 | Erreiche 180 Einwohner | Einwohner | sofort | 🗡️ 20 Werkzeug + 🪙 5 Gold |
| 58 | Erreiche die Späte Bronzezeit | Zeitalter-Ziel | Fernziel – rückt erst nach, wenn sonst nichts zu tun ist | 🥉 20 Bronze + 🪙 5 Gold |

### Späte Bronzezeit

| Nr. | Auftrag | Art | Kommt … | Belohnung |
|---|---|---|---|---|
| 59 | Habe 20 Schmuck im Lager | Vorrat | sobald es einen Hersteller für Schmuck gibt | 💡 80 Wissen + 🪙 5 Gold |
| 60 | Erreiche 230 Einwohner | Einwohner | sofort | 🪵 150 Holz, 🪨 100 Stein + 🪙 5 Gold |
| 61 | Baue den Fürstenhügel | Bauen | sobald Fürstenhügel freigeschaltet ist (Fürstenhügel) | 🥉 30 Bronze, 🍖 150 Nahrung + 🪙 5 Gold |
| 62 | Erreiche 280 Einwohner – bereit für den Aufbruch | Einwohner | sofort | 🪵 200 Holz, 🍖 200 Nahrung + 🪙 5 Gold |

### Eisenzeit

| Nr. | Auftrag | Art | Kommt … | Belohnung |
|---|---|---|---|---|
| 63 | Baue eine Eisenmine | Bauen | sobald Eisenmine freigeschaltet ist (Eisenbergbau) | 🪵 200 Holz, 🪨 100 Stein + 🪙 5 Gold |
| 64 | Baue einen Rennofen | Bauen | sobald Rennofen freigeschaltet ist (Rennofen) | ⚫ 40 Holzkohle + 🪙 5 Gold |
| 65 | Habe 20 Eisen im Lager | Vorrat | sobald es einen Hersteller für Eisen gibt | 💡 100 Wissen + 🪙 5 Gold |
| 66 | Baue 5 Gehöfte | Bauen | sobald Gehöft freigeschaltet ist (Gehöfte) | 🪵 200 Holz + 🪙 5 Gold |
| 67 | Erreiche 320 Einwohner | Einwohner | sofort | 🔩 20 Eisen + 🪙 5 Gold |
| 68 | Erreiche die Mittlere Eisenzeit | Zeitalter-Ziel | Fernziel – rückt erst nach, wenn sonst nichts zu tun ist | 🔩 20 Eisen, 🍖 200 Nahrung + 🪙 5 Gold |
| 69 | Baue eine Salzsiederei | Bauen | sobald Salzsiederei freigeschaltet ist (Salzbergbau) | 🪵 200 Holz + 🪙 5 Gold |
| 70 | Habe 30 Salz im Lager | Vorrat | sobald es einen Hersteller für Salz gibt | 💡 120 Wissen + 🪙 5 Gold |
| 71 | Baue 3 Druiden | Bauen | sobald Druide freigeschaltet ist (Druiden) | 🧥 30 Kleidung + 🪙 5 Gold |
| 72 | Erreiche 380 Einwohner | Einwohner | sofort | 🔩 30 Eisen + 🪙 5 Gold |
| 73 | Erreiche die Späte Eisenzeit | Zeitalter-Ziel | Fernziel – rückt erst nach, wenn sonst nichts zu tun ist | 🧂 40 Salz + 🪙 5 Gold |
| 74 | Baue eine Glasmacherin | Bauen | sobald Glasmacherin freigeschaltet ist (Glas) | ⚫ 60 Holzkohle + 🪙 5 Gold |
| 75 | Baue 4 Stadthäuser | Bauen | sobald Stadthaus freigeschaltet ist (Stadthäuser) | 🪨 200 Stein + 🪙 5 Gold |
| 76 | Baue den Ringwall | Bauen | sobald Ringwall freigeschaltet ist (Ringwall) | 🔩 40 Eisen, 🍖 300 Nahrung + 🪙 5 Gold |
| 77 | Erreiche 480 Einwohner – bereit für den Aufbruch | Einwohner | sofort | 🪵 300 Holz, 🍖 300 Nahrung + 🪙 5 Gold |


## Auffällig (zum Besprechen)

- Die **Bronzezeit hat nur 16 Aufträge**, die Altsteinzeit allein 24. In der Späten Bronzezeit gibt es nur 4.
- Für die neuen **Stufen** (Ausbauen) gibt es noch keinen Auftrag, z. B. „Baue eine Sammlerin auf Stufe 3 aus“.
- Für die neuen Häuser **Flechtwerkhaus** und **Steinhaus** gibt es noch keine Aufträge.
- „Habe 20 Kupfer/Bronze/Eisen im Lager“: Die Metallreserve der Werkstätten kann das Erreichen verzögern.
