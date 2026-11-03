# Plan: Item-Shop mit echtem Geld

Stand 2026-11-03. **Schritt 1 ist zum Ausprobieren gebaut, ohne echtes Geld.** Wunsch von Emin: Im Shop kann man mit Geld zum Beispiel Materialien für die Wunderwerke und Beschleunigungen für Forschung und Gebäudebau kaufen.

Zeichen: 💡 Vorschlag · ❓ Frage an Emin · ⚠️ muss vor dem Start geklärt sein

## 1 · Was verkauft wird

| Ware | Was sie tut | Grenze | Vorschlag |
|---|---|---|---|
| **Beschleunigung Forschung** | zieht bei der laufenden Forschung Zeit ab: 15 Minuten, 1 Stunde oder „sofort fertig“ | nicht beim Aufbruch ins nächste Zeitalter? ❓ | 💡 verkaufen |
| **Beschleunigung Bau** | wie oben, für Baustellen und Abschnitte der Wunderwerke | keine | 💡 verkaufen |
| **Fundstücke** | ein Stück nach Wahl, das gerade fehlt | nur Stücke, die man gerade finden kann, nur so viele, wie das Wunderwerk noch braucht | 💡 verkaufen |
| **Warenpaket** | Holz, Stein, Nahrung, Bronze und so weiter, passend zum Zeitalter | geht übers Lager hinaus, wie die Tagesbelohnung | 💡 verkaufen |
| **Zweite Bauschlange** | dauerhaft eine Baustelle mehr | einmalig | 💡 guter Preis, wirkt nicht aufdringlich |
| **Schmuck** | Deko-Gebäude, Rahmen, Profilbilder | keine | 💡 verkaufen, ändert nichts am Spielablauf |
| **Glücks- und Überraschungskisten** | zufälliger Inhalt | – | 💡 **nicht** verkaufen: rechtlich heikel und unbeliebt |

Alles im Shop bleibt auch ohne Geld erreichbar, nur langsamer. Bisher kann man im Spiel nie stecken bleiben, das soll so bleiben. Fundstücke haben ihre Ersatzwege schon, und das Spiel wird nicht absichtlich langsamer gemacht, damit jemand kauft. Für den Shop wird die Steinzeit-Dauer nicht verlängert.

## 2 · Bezahlart im Spiel

❓ **Direkt in Euro oder über eine Spielwährung?**

| | Direkt in Euro | Spielwährung (zum Beispiel „Goldstücke“) |
|---|---|---|
| Einfachheit | jeder Kauf ein Bezahlvorgang | einmal Gold kaufen, dann viele kleine Käufe mit einem Tipp |
| Kleine Beträge | Beschleunigung für 15 Minuten lohnt sich kaum | gut möglich |
| Kostenlos verdienen | geht nicht | Aufträge, Stufen und Truhe können etwas Gold geben |
| Recht | unkompliziert | ⚠️ die EU sieht Spielwährung kritisch: Preise müssen klar in Euro erkennbar sein, kein Zwang zu großen Paketen |

💡 **Vorschlag: Spielwährung, weil Beschleunigungen kleine Beträge sind.** Jeder Preis zeigt zusätzlich den Euro-Wert an. Gold verfällt nie, und man kann es in kleinen Paketen kaufen.

Beispielpreise, müssen im Spiel erprobt werden:

| Paket | Gold | Preis |
|---|---|---|
| Klein | 100 | 0,99 € |
| Mittel | 550 | 4,99 € |
| Groß | 1.200 | 9,99 € |

| Ware | Gold |
|---|---|
| 15 Minuten Beschleunigung | 10 |
| 1 Stunde Beschleunigung | 30 |
| Fundstück | 25–60, je nach Seltenheit |
| Warenpaket | 30–100, wächst mit dem Zeitalter |

## 3 · So sieht es im Spiel aus

- **Knopf „Shop“** in der Seitenleiste, gleich gestaltet wie die anderen Fenster.
- **Beschleunigen** direkt an der Baustelle, im Forschungsfenster und im Wunderwerk-Fenster.
- **Fehlendes Fundstück:** Im Wunderwerk-Fenster steht neben dem kostenlosen Weg auch „kaufen“, ohne Druck.
- **Keine aufdringliche Werbung:** keine Pop-ups beim Start, kein Countdown für Angebote, keine Fake-Rabatte.

## 4 · Technik

Das Spiel läuft heute im Browser, der Spielstand liegt auf dem Handy und lässt sich dort ändern. **Für echtes Geld reicht das nicht.**

1. **Konto wird Pflicht zum Kaufen.** Die Anmeldung gibt es schon (Supabase), Spielen bleibt ohne Konto möglich.
2. **Das Gold liegt auf dem Server, nicht im Spielstand.** Jede Buchung wird dort gespeichert: gekauft, ausgegeben, wofür.
3. **Zahlung wird vom Server bestätigt.** Erst wenn der Zahlungsanbieter dem Server die Zahlung bestätigt, gibt es Gold. Das Handy allein kann das nicht auslösen.
4. **Offline:** Kaufen geht nur online, schon gekaufte Beschleunigungen wirken dann im Spielstand. Wenn ein Stand aus der Cloud oder von einem anderen Gerät kommt, bleibt das Gold trotzdem richtig.
5. **Wiederherstellen und Rückgabe:** Bei Erstattung wird das Gold zurückgebucht, auf einem neuen Gerät ist es automatisch da.

**Bezahlweg:**

| Weg | Wann | Anmerkung |
|---|---|---|
| **Google Play Billing** | wenn das Spiel im Play Store ist | ⚠️ dort für digitale Waren in der Regel Pflicht, Google behält einen Anteil (oft 15 %, aktuelle Regeln prüfen) |
| **Stripe, Paddle oder ähnlich** | Web-Version | Anbieter wie Paddle übernehmen auch Umsatzsteuer im Ausland |
| **Testkäufe** | zuerst | Familie probiert alles, ohne dass echtes Geld fließt |

💡 Für Web und Play Store wird es getrennte Bezahlwege geben, das Gold auf dem Konto ist dasselbe.

## 5 · Muss vor dem ersten echten Verkauf geklärt sein

⚠️ Das ist keine Rechtsberatung. Vor dem Start sollte das eine Fachperson prüfen (Steuerberatung, Anwalt).

- **Gewerbe und Steuern:** Wer verkauft, braucht in der Regel ein angemeldetes Gewerbe und muss Umsatzsteuer abführen.
- **Impressum, AGB, Datenschutz:** Pflicht, die Datenschutzerklärung muss die Zahlungsanbieter nennen.
- **Widerrufsrecht:** Bei digitalen Waren muss der Kunde dem sofortigen Start ausdrücklich zustimmen, sonst kann er widerrufen.
- **Kinder:** Spiele ohne Altersgrenze sprechen auch Kinder an. Keine Kauf-Aufforderungen an Kinder, und Kindern kann man keine wirksamen größeren Käufe abnehmen. Familie spielt mit: Kaufsperre oder Passwort vor dem Kauf einbauen.
- **Musikrechte:** Die Lizenz der Musik (AIMusicAI) ist für kommerzielle Nutzung noch ungeklärt, die Bilder aus Canva sollten ebenso geprüft werden.

## 6 · Reihenfolge

| Schritt | Inhalt | Geld? |
|---|---|---|
| 1 | Shop-Fenster und Beschleunigungen im Spiel, bezahlt mit Gold, das man nur verdient (Aufträge, Truhe) | nein |
| 2 | Du spielst damit: Sind die Preise fair, macht es Spaß? | nein |
| 3 | Gold auf dem Server, jede Buchung gespeichert | nein |
| 4 | Testkäufe mit dem Testmodus des Anbieters | nur Test |
| 5 | Recht und Steuern klären, Web-Zahlung freischalten | ja, kleine Runde |
| 6 | Mit dem Play Store: Google Play Billing | ja |

💡 Der Shop kommt am besten **nach** der Eisenzeit und den Arbeitsbewegungen. Wer Geld ausgibt, erwartet ein fertiges und schönes Spiel, und Schritt 1 lässt sich schon vorher zum Ausprobieren bauen.

## 7 · Entscheidungen von Emin (2026-11-03)

1. **Spielwährung** (Gold), der Euro-Wert steht beim Preis.
2. Gold kann man auch **ohne Geld verdienen**: Aufträge 5, Wünsche 2, große Truhe 20.
3. Den Aufbruch ins nächste Zeitalter darf man **beschleunigen**; das Pflicht-Wunderwerk bleibt Pflicht.
4. Kostenlose Stufen-Geschenke bleiben **Schmuck**, nur der Shop verkauft Spielhilfen.
5. Verkauft wird von **Emin mit Gewerbe**.
6. **Erst ohne Geld ausprobieren:** Schritt 1 ist gebaut (`neu/js/shop.js`). Im Testmodus ist Gold kostenlos, die Preise sind Startwerte. Schmuck und der Server kommen später.
