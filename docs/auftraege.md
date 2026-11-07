# Aufträge in Epochia

Stand: Version 141 (07.11.2026, nach der Prüfung der Spiellogik). Die Tabellen unten sind aus `QUESTS` in `neu/js/daten.js` erzeugt.
Insgesamt **104 Aufträge**: Altsteinzeit 24, Mittelsteinzeit 12, Jungsteinzeit 14, Kupferzeit 12, Frühe Bronzezeit 11, Späte Bronzezeit 11, Frühe Eisenzeit 8, Mittlere Eisenzeit 6, Späte Eisenzeit 6.
Nach dem letzten Eisenzeit-Auftrag ist die Liste leer, bis die Antike kommt.

## So funktioniert die Liste

- **Höchstens 3 Aufträge** sind gleichzeitig zu sehen (Knopf „Aufträge“ links).
- **Nur aus dem eigenen Zeitalter** (seit Version 141): Ein Auftrag erscheint erst, wenn sein Abschnitt erreicht ist. Vorher
  waren z. B. Einwohner-Aufträge der Eisenzeit schon in der Steinzeit erfüllt und schenkten Eisen.
- **Reihenfolge:** zuerst **erfüllte** Aufträge, dann was man **jetzt angehen kann**, dann Stufen-Aufträge, zuletzt gesperrte
  und **Fernziele** („Erreiche die Mittelsteinzeit“ …).
- Es ist immer nur **ein offener Wunsch-Auftrag** und **ein offener Stufen-Auftrag** gleichzeitig in der Liste.
- **Abholen:** Ist ein Auftrag erfüllt, erscheint „🎁 Abholen“. Erst dann gibt es die Belohnung, und der nächste Auftrag rückt nach.
  Jeder Auftrag gibt zusätzlich **5 Gold** (für den Shop).

## Wie gezählt wird

| Art | Was zählt |
|---|---|
| **Bauen** („Baue 2 Sammlerinnen“) | alle jemals **fertig gebauten** Gebäude dieser Art, auch abgerissene – oder was davon jetzt steht, auch weiterentwickelt (seit Version 141: 2 Bronzeschmiede zählen für „Baue 2 Kupferschmiede“) |
| **Habe** („Habe 6 Dorfbrunnen“, „Baue 4 Jägerlager“) | was **jetzt steht**, ab dieser Stufe aufwärts: Mammutjägerlager zählen als Jägerlager. Die Zahl liegt über dem, was man von selbst durch Weiterentwickeln bekommt. Nur bei „Habe 8 Wohnungen“ zählen auch große Wohnhäuser |
| **Stufe** („Baue ein Gebäude auf Stufe 3 aus“) | ausgebaute Gebäude; erscheint erst, wenn die Stufe im Zeitalter erlaubt ist und jemand die Extra-Ware (Werkzeug, Bronze, Eisen) herstellt |
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
| 17 | Habe 8 Wohnungen | Habe (zählt, was jetzt steht) | sofort | 🪨 40 Stein + 🪙 5 Gold |
| 18 | Baue 3 Höhlenmaler | Bauen | sofort | 💡 15 Wissen + 🪙 5 Gold |
| 19 | Baue 3 Feuerplätze | Bauen | sofort | 🍖 40 Nahrung + 🪙 5 Gold |
| 20 | Habe 10 Fellzelte | Habe (zählt, was jetzt steht) | sobald Fellzelt freigeschaltet ist (Fellzelte) | 🪵 40 Holz, 🦌 4 Felle + 🪙 5 Gold |
| 21 | Erreiche 25 Einwohner | Einwohner | sofort | 🦌 5 Felle, 💡 10 Wissen + 🪙 5 Gold |
| 22 | Erfülle 3 Wünsche des Stammes | Wünsche | sofort | 💡 20 Wissen + 🪙 5 Gold |
| 23 | Schicke die Jäger auf Mammutjagd | Mammutjagd | nach Forschung „Mammutjagd“ | 🪵 40 Holz, 🪨 30 Stein + 🪙 5 Gold |
| 24 | Erreiche die Mittelsteinzeit | Zeitalter-Ziel | Fernziel – rückt erst nach, wenn sonst nichts zu tun ist | 🪵 60 Holz, 🪨 60 Stein + 🪙 5 Gold |

### Mittelsteinzeit

| Nr. | Auftrag | Art | Kommt … | Belohnung |
|---|---|---|---|---|
| 25 | Erreiche 30 Einwohner | Einwohner | sofort | 🗡️ 10 Werkzeug + 🪙 5 Gold |
| 26 | Kaufe 3 neue Landstücke | Land | sofort | 🪵 60 Holz + 🪙 5 Gold |
| 27 | Baue 4 Jägerlager | Habe (zählt, was jetzt steht) | sofort | 🍖 60 Nahrung, 🦌 10 Felle + 🪙 5 Gold |
| 28 | Baue einen Fischerplatz | Bauen | sobald Fischerplatz freigeschaltet ist (Einbaum) | 🍖 60 Nahrung + 🪙 5 Gold |
| 29 | Baue 2 Steinschläger | Bauen | sobald Steinschläger freigeschaltet ist (Feine Klingen) | 🪨 50 Stein + 🪙 5 Gold |
| 30 | Baue 2 Fellmacherinnen | Bauen | sobald Fellmacherin freigeschaltet ist (Fellbearbeitung) | 🦌 15 Felle + 🪙 5 Gold |
| 31 | Baue einen Ahnenplatz | Bauen | sobald Ahnenplatz freigeschaltet ist (Ahnenkult) | 💡 30 Wissen + 🪙 5 Gold |
| 32 | Habe 20 Kleidung im Lager | Vorrat | sobald es einen Hersteller für Kleidung gibt | 💡 30 Wissen + 🪙 5 Gold |
| 33 | Erfülle 6 Wünsche des Stammes | Wünsche | sofort | 💡 30 Wissen + 🪙 5 Gold |
| 34 | Baue ein Gebäude auf Stufe 2 aus | Stufe | sobald Stufe 2 erlaubt ist | 🪵 40 Holz + 🪙 5 Gold |
| 35 | Baue 3 Gebäude auf Stufe 2 aus | Stufe | sobald Stufe 2 erlaubt ist | 🪨 50 Stein + 🪙 5 Gold |
| 36 | Erreiche die Jungsteinzeit | Zeitalter-Ziel | Fernziel – rückt erst nach, wenn sonst nichts zu tun ist | 🪵 100 Holz, 🪨 80 Stein + 🪙 5 Gold |

### Jungsteinzeit

| Nr. | Auftrag | Art | Kommt … | Belohnung |
|---|---|---|---|---|
| 37 | Baue 2 Äcker | Bauen | sobald Acker freigeschaltet ist (Ackerbau) | 🗡️ 10 Werkzeug + 🪙 5 Gold |
| 38 | Erreiche 60 Einwohner | Einwohner | sofort | 🏺 10 Töpferwaren + 🪙 5 Gold |
| 39 | Baue ein Ziegengehege | Bauen | sobald Ziegengehege freigeschaltet ist (Viehzucht) | 🦌 15 Felle + 🪙 5 Gold |
| 40 | Baue 3 Langhäuser | Bauen | sobald Langhaus freigeschaltet ist (Langhausbau) | 🪵 80 Holz + 🪙 5 Gold |
| 41 | Erreiche 80 Einwohner | Einwohner | sofort | 🪵 80 Holz, 🪨 60 Stein + 🪙 5 Gold |
| 42 | Baue einen Vorratsspeicher | Bauen | sobald Vorratsspeicher freigeschaltet ist (Vorratshaltung) | 🍖 100 Nahrung + 🪙 5 Gold |
| 43 | Habe 40 Kleidung im Lager | Vorrat | sobald es einen Hersteller für Kleidung gibt | 🦌 20 Felle + 🪙 5 Gold |
| 44 | Erreiche 100 Einwohner | Einwohner | sofort | 🗡️ 20 Werkzeug + 🪙 5 Gold |
| 45 | Habe 30 Töpferwaren im Lager | Vorrat | sobald es einen Hersteller für Töpferwaren gibt | 💡 40 Wissen + 🪙 5 Gold |
| 46 | Erfülle 12 Wünsche des Stammes | Wünsche | sofort | 💡 40 Wissen + 🪙 5 Gold |
| 47 | Baue ein Gebäude auf Stufe 3 aus | Stufe | sobald Stufe 3 erlaubt ist und jemand Werkzeug herstellt | 🗡️ 15 Werkzeug + 🪙 5 Gold |
| 48 | Baue einen Steinkreis | Bauen | sobald Steinkreis freigeschaltet ist (Sternenkunde) | 🪵 100 Holz, 🍖 100 Nahrung + 🪙 5 Gold |
| 49 | Erreiche 120 Einwohner – bereit für den Aufbruch | Einwohner | sofort | 🪵 150 Holz, 🍖 150 Nahrung + 🪙 5 Gold |
| 50 | Brich in die Bronzezeit auf | Zeitalter-Ziel | Fernziel – rückt erst nach, wenn sonst nichts zu tun ist | 🪵 100 Holz, 🪨 100 Stein + 🪙 5 Gold |

### Kupferzeit

| Nr. | Auftrag | Art | Kommt … | Belohnung |
|---|---|---|---|---|
| 51 | Baue eine Kupfermine | Bauen | sobald Kupfermine freigeschaltet ist (Bergbau) | 🪵 60 Holz, 🪨 40 Stein + 🪙 5 Gold |
| 52 | Habe 60 Kupfer im Lager | Vorrat | sobald es einen Hersteller für Kupfer gibt | 💡 40 Wissen + 🪙 5 Gold |
| 53 | Habe 6 Gemüsegärten | Habe (zählt, was jetzt steht) | sobald Gemüsegarten freigeschaltet ist (Gartenbau) | 🍖 80 Nahrung + 🪙 5 Gold |
| 54 | Erreiche 140 Einwohner | Einwohner | sofort | ⚫ 20 Holzkohle + 🪙 5 Gold |
| 55 | Baue ein Gebäude auf Stufe 4 aus | Stufe | sobald Stufe 4 erlaubt ist | 🟠 15 Kupfer + 🪙 5 Gold |
| 56 | Habe 12 Flechtwerkhäuser | Habe (zählt, was jetzt steht) | sobald Flechtwerkhaus freigeschaltet ist (Lehmbau) | 🟤 30 Ton + 🪙 5 Gold |
| 57 | Habe 6 Dorfbrunnen | Habe (zählt, was jetzt steht) | sobald Dorfbrunnen freigeschaltet ist (Brunnenbau) | 🍖 60 Nahrung + 🪙 5 Gold |
| 58 | Baue 2 Kupferschmiede | Bauen | sobald Kupferschmied freigeschaltet ist (Kupferschmied) | 🪨 60 Stein + 🪙 5 Gold |
| 59 | Habe 7 Felsritzer | Habe (zählt, was jetzt steht) | sobald Felsritzer freigeschaltet ist (Felsritzungen) | 💡 40 Wissen + 🪙 5 Gold |
| 60 | Habe 6 Lehmhäuser | Habe (zählt, was jetzt steht) | sobald Lehmhaus freigeschaltet ist (Lehmbau) | 🪵 80 Holz + 🪙 5 Gold |
| 61 | Erfülle 15 Wünsche des Stammes | Wünsche | sofort | 💡 50 Wissen + 🪙 5 Gold |
| 62 | Erreiche die Frühe Bronzezeit | Zeitalter-Ziel | Fernziel – rückt erst nach, wenn sonst nichts zu tun ist | 🪵 100 Holz, 🟠 20 Kupfer + 🪙 5 Gold |

### Frühe Bronzezeit

| Nr. | Auftrag | Art | Kommt … | Belohnung |
|---|---|---|---|---|
| 63 | Baue einen Handelsplatz | Bauen | sobald Handelsplatz freigeschaltet ist (Tauschhandel) | 🏺 15 Töpferwaren + 🪙 5 Gold |
| 64 | Tausche 3-mal mit dem Händler | Händler | nach Forschung „Tauschhandel“ | ⚪ 10 Zinn + 🪙 5 Gold |
| 65 | Habe 20 Bronze im Lager | Vorrat | sobald es einen Hersteller für Bronze gibt | 💡 60 Wissen + 🪙 5 Gold |
| 66 | Habe 4 Viehhöfe | Habe (zählt, was jetzt steht) | sobald Viehhof freigeschaltet ist (Schafzucht) | 🍖 100 Nahrung + 🪙 5 Gold |
| 67 | Erreiche 180 Einwohner | Einwohner | sofort | 🗡️ 20 Werkzeug + 🪙 5 Gold |
| 68 | Baue 2 Weberinnen | Bauen | sobald Weberin freigeschaltet ist (Webstuhl) | 🐑 15 Wolle + 🪙 5 Gold |
| 69 | Habe 30 Wolle im Lager | Vorrat | sobald es einen Hersteller für Wolle gibt | 🧥 20 Kleidung + 🪙 5 Gold |
| 70 | Baue 2 Bronzeschmiede | Bauen | sobald Bronzeschmied freigeschaltet ist (Bronzewerkzeug) | ⚪ 10 Zinn + 🪙 5 Gold |
| 71 | Habe 4 Jagdhütten | Habe (zählt, was jetzt steht) | sobald Jagdhütte freigeschaltet ist (Bronzewerkzeug) | 🦌 20 Felle + 🪙 5 Gold |
| 72 | Habe 150 Werkzeug im Lager | Vorrat | sobald es einen Hersteller für Werkzeug gibt | 💡 60 Wissen + 🪙 5 Gold |
| 73 | Erreiche die Späte Bronzezeit | Zeitalter-Ziel | Fernziel – rückt erst nach, wenn sonst nichts zu tun ist | 🥉 20 Bronze + 🪙 5 Gold |

### Späte Bronzezeit

| Nr. | Auftrag | Art | Kommt … | Belohnung |
|---|---|---|---|---|
| 74 | Habe 20 Schmuck im Lager | Vorrat | sobald es einen Hersteller für Schmuck gibt | 💡 80 Wissen + 🪙 5 Gold |
| 75 | Erreiche 230 Einwohner | Einwohner | sofort | 🪵 150 Holz, 🪨 100 Stein + 🪙 5 Gold |
| 76 | Baue ein Gebäude auf Stufe 6 aus | Stufe | sobald Stufe 6 erlaubt ist und jemand Bronze herstellt | 🥉 20 Bronze + 🪙 5 Gold |
| 77 | Habe 10 Hallenhäuser | Habe (zählt, was jetzt steht) | sobald Hallenhaus freigeschaltet ist (Hallenhaus) | 🪵 120 Holz + 🪙 5 Gold |
| 78 | Habe 4 Heilige Haine | Habe (zählt, was jetzt steht) | sobald Heiliger Hain freigeschaltet ist (Heiliger Hain) | 🍖 120 Nahrung + 🪙 5 Gold |
| 79 | Habe 9 Sternkundige | Habe (zählt, was jetzt steht) | sobald Sternkundiger freigeschaltet ist (Himmelsscheibe) | 💡 60 Wissen + 🪙 5 Gold |
| 80 | Habe 3 Kornspeicher | Habe (zählt, was jetzt steht) | sobald Kornspeicher freigeschaltet ist (Kornspeicher) | 🍖 150 Nahrung + 🪙 5 Gold |
| 81 | Baue 2 Fischerhäuser | Bauen | sobald Fischerhaus freigeschaltet ist (Plankenboote) | 🪵 120 Holz + 🪙 5 Gold |
| 82 | Erfülle 20 Wünsche des Stammes | Wünsche | sofort | 💡 80 Wissen + 🪙 5 Gold |
| 83 | Baue den Fürstenhügel | Bauen | sobald Fürstenhügel freigeschaltet ist (Fürstenhügel) | 🥉 30 Bronze, 🍖 150 Nahrung + 🪙 5 Gold |
| 84 | Erreiche 280 Einwohner – bereit für den Aufbruch | Einwohner | sofort | 🪵 200 Holz, 🍖 200 Nahrung + 🪙 5 Gold |

### Frühe Eisenzeit

| Nr. | Auftrag | Art | Kommt … | Belohnung |
|---|---|---|---|---|
| 85 | Baue eine Eisenmine | Bauen | sobald Eisenmine freigeschaltet ist (Eisenbergbau) | 🪵 200 Holz, 🪨 100 Stein + 🪙 5 Gold |
| 86 | Baue einen Rennofen | Bauen | sobald Rennofen freigeschaltet ist (Rennofen) | ⚫ 40 Holzkohle + 🪙 5 Gold |
| 87 | Habe 60 Eisen im Lager | Vorrat | sobald es einen Hersteller für Eisen gibt | 💡 100 Wissen + 🪙 5 Gold |
| 88 | Baue 5 Gehöfte | Bauen | sobald Gehöft freigeschaltet ist (Gehöfte) | 🪵 200 Holz + 🪙 5 Gold |
| 89 | Erreiche 320 Einwohner | Einwohner | sofort | 🔩 20 Eisen + 🪙 5 Gold |
| 90 | Baue ein Gebäude auf Stufe 7 aus | Stufe | sobald Stufe 7 erlaubt ist | 🔩 15 Eisen + 🪙 5 Gold |
| 91 | Habe 15 Steinhäuser | Habe (zählt, was jetzt steht) | sobald Steinhaus freigeschaltet ist (Gehöfte) | 🪨 120 Stein + 🪙 5 Gold |
| 92 | Erreiche die Mittlere Eisenzeit | Zeitalter-Ziel | Fernziel – rückt erst nach, wenn sonst nichts zu tun ist | 🔩 20 Eisen, 🍖 200 Nahrung + 🪙 5 Gold |

### Mittlere Eisenzeit

| Nr. | Auftrag | Art | Kommt … | Belohnung |
|---|---|---|---|---|
| 93 | Baue eine Salzsiederei | Bauen | sobald Salzsiederei freigeschaltet ist (Salzbergbau) | 🪵 200 Holz + 🪙 5 Gold |
| 94 | Habe 80 Salz im Lager | Vorrat | sobald es einen Hersteller für Salz gibt | 💡 120 Wissen + 🪙 5 Gold |
| 95 | Habe 12 Druiden | Habe (zählt, was jetzt steht) | sobald Druide freigeschaltet ist (Druiden) | 🧥 30 Kleidung + 🪙 5 Gold |
| 96 | Erreiche 380 Einwohner | Einwohner | sofort | 🔩 30 Eisen + 🪙 5 Gold |
| 97 | Erfülle 25 Wünsche des Stammes | Wünsche | sofort | 💡 120 Wissen + 🪙 5 Gold |
| 98 | Erreiche die Späte Eisenzeit | Zeitalter-Ziel | Fernziel – rückt erst nach, wenn sonst nichts zu tun ist | 🧂 40 Salz + 🪙 5 Gold |

### Späte Eisenzeit

| Nr. | Auftrag | Art | Kommt … | Belohnung |
|---|---|---|---|---|
| 99 | Baue eine Glasmacherin | Bauen | sobald Glasmacherin freigeschaltet ist (Glas) | ⚫ 60 Holzkohle + 🪙 5 Gold |
| 100 | Baue 4 Stadthäuser | Bauen | sobald Stadthaus freigeschaltet ist (Stadthäuser) | 🪨 200 Stein + 🪙 5 Gold |
| 101 | Baue den Ringwall | Bauen | sobald Ringwall freigeschaltet ist (Ringwall) | 🔩 40 Eisen, 🍖 300 Nahrung + 🪙 5 Gold |
| 102 | Baue ein Gebäude auf Stufe 9 aus | Stufe | sobald Stufe 9 erlaubt ist und jemand Eisen herstellt | 🔩 30 Eisen, 🍖 200 Nahrung + 🪙 5 Gold |
| 103 | Baue 3 Eisenschmiede | Bauen | sobald Eisenschmied freigeschaltet ist (Eisenschmiede) | 🔩 20 Eisen + 🪙 5 Gold |
| 104 | Erreiche 480 Einwohner – bereit für den Aufbruch | Einwohner | sofort | 🪵 300 Holz, 🍖 300 Nahrung + 🪙 5 Gold |

## Geändert nach der Prüfung (Version 141, 07.11.2026)

Drei Agenten haben Steinzeit, Bronzezeit und Eisenzeit mit dem Bot durchgespielt. Umgesetzt (Emin: „alles umsetzen“):
- Aufträge nur noch im eigenen Zeitalter; erfüllte zuerst; höchstens ein offener Stufen-Auftrag.
- Rund 20 Aufträge erfüllten sich durch das automatische Weiterentwickeln von selbst – jetzt „Habe …“ mit mehr als man geschenkt bekommt.
- „Habe 20 Werkzeug/Kupfer/Eisen/Salz“ war sofort erfüllt – jetzt 150 Werkzeug, 60 Kupfer, 60 Eisen, 80 Salz.
- Stufe 3 und 6 erscheinen erst, wenn jemand Werkzeug bzw. Bronze herstellt.
- Eisen hat eine Reserve von 30 (wie Kupfer und Bronze); Wahrzeichen gibt es nur einmal.
- Gehöft und Stadthaus nur noch per Umbau-Knopf (brauchen Eisen), statt kostenlos von selbst.
- Steinkreis braucht weniger Fundstücke (2 Sternkarten, 3 Findlinge, 2 Blumenkränze); Fundstellen nur noch für fehlende Stücke.
- Bernstein beim Händler 18/20 statt 10/12, Aufbruch in die Eisenzeit braucht weniger Schmuck; Wünsche nach Eisen, Salz, Glas kleiner.
- Bot erfüllt Wünsche und baut für Stufen-Aufträge gezielt ein Gebäude aus.

Offen: Die Einwohner-Grenzen der Forschungen bremsen nie (der Bot hat immer viel mehr Einwohner). Erst nach Emins Spielprobe ändern.
Die Kupfermine braucht Felsen in der Nähe – der Bot fand lange keinen Platz; mit einem echten Spielstand prüfen.
