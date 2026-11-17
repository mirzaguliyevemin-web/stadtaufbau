# Fehler und Wünsche von Emin

Einfach unten eine Zeile hinzufügen – auch am Handy auf github.com (Datei öffnen → Stift ✏️ →
„Commit changes“). Der tägliche Agent liest diese Liste jede Nacht, Claude zu Beginn jeder Sitzung.
Stichworte reichen, z. B. „- Farm zeigt falsche Arbeiterzahl nach dem Verschieben“.

## Fehler

<!-- Hier gefundene Fehler eintragen -->

## Wünsche

<!-- Hier Veränderungswünsche eintragen -->
- Bronzezeit (Emin, 02.11.): alle drei Stufen gebaut, Bilder eingebaut (Version 153/158). Offen nach Scenario Pro: Arbeiterbilder in Bronzezeit-Kleidung. Plan: `docs/epoche-2-bronzezeit.md`.

- Wunderwerke je Zeitalter (Emin, 01.11.): Steinzeit und Bronzezeit gebaut (Fundstücke, Schatzkiste, Höhle der Geschichten, Steinkreis, Halle der Himmelsscheibe). Eisenzeit-Wunderwerk (Salzberg) gebaut, alle Fundstück-Bilder bis zur Eisenzeit da (Stand 16.11.). Offen: spätere Zeitalter mit deren Bau. Plan: `docs/konzept-wunderwerke.md`.

- Arbeitsbewegungen (Emin, 03.11.): 74 Bilder mit je 3 Stufen, Plan `docs/plan-arbeitsbewegungen.md`. Item-Shop: Plan `docs/plan-item-shop.md`; Emin probiert Schritt 1 ohne Geld aus, Preise danach anpassen.

- Eisenzeit (Emin, 03.11.): Technik mit vorläufigen Bildern gebaut (Version 86). Offen: etwa 200 Bilder, später nach den Bildern für Steinzeit und Bronzezeit. Plan: `docs/epoche-3-eisenzeit.md`.

- Design (Emin, 04.11.): Schritt 1–3 gebaut (Version 95), Leisten, Titelband und Symbole gemalt (Version 105). Alle Warenbilder da (Version 106), Boden neu mit Scenario (Version 187). Offen: prüfen, welche Gebäude noch zu dunkel sind. Plan: `docs/plan-design.md`.

- Zweite Karte und zweite Stadt (Emin, 03.11.): nur ein Plan, wichtigere Sachen gehen vor. Plan: `docs/plan-zweite-stadt.md`, → Frage: 6 Fragen an Emin, wenn es so weit ist.


- Wasserfall als echtes Video (Emin, 17.11.): das gemalte Bild (Version 216/217) später durch einen bewegten Wasserfall ersetzen (Video bzw. Bildfolge mit Scenario), wenn genug Credits da sind – keine Eile.
- 2026-11-17, Epochia Version 218 – Emin: Live-Updates statt jedes Mal die ganze App: die Android-App liest app/live.json (Dateiliste mit Prüfsummen) von GitHub Pages und lädt nur geänderte Dateien nach (Capgo-Modul ohne fremden Server); neue APK nur noch bei Änderungen am Android-Teil. Startet eine Fassung nicht, springt die App auf die vorige zurück.

## Erledigt
- 2026-11-17, Epochia Version 217 – Emin: unterer Teil des Wasserfalls wirkte verschoben (Fluss biegt gleich danach ab, Becken lag auf der Wiese): das Bild richtet sich jetzt nach dem Flusslauf unterhalb und neigt sich leicht dorthin; Schaumflocken treiben vom Becken flussab, oberhalb ziehen feine Linien zur Kante.
- 2026-11-17, Epochia Version 216 – Emin: Wasserfall passte im Stil nicht (zu eckig, Felsen künstlich, Farben): jetzt ein gemaltes Bild (Scenario, halb-realistisch wie Berge und Gelände) mit mehreren Wasserströmen zwischen bemoosten Felsen, Tannen an den Seiten und Becken unten; oben und unten weich in den Fluss ausgeblendet, darüber gleiten helle Wasserstreifen und Gischt steigt auf. Die gezeichnete Fassung bleibt nur als Ersatz, falls das Bild nicht lädt.
- 2026-11-17, Epochia Version 215 – Emin: Wasserfall schöner und höher: etwa dreimal so hoch, Felswand dahinter, helle Kante oben, Wasserstreifen werden beim Fallen schneller, Steine auf der Kante teilen den Vorhang, unten Schaumkranz, Wellenringe und aufsteigende Gischt, an den Seiten unregelmäßige Felsbrocken statt einer Felssäule.
- 2026-11-17, Epochia Version 214 – Emin: Update in der App starten statt jedes Mal den Link öffnen: Die Android-App fragt beim Start und alle 30 min bei GitHub nach der neuesten App-Fassung (Release „app-vNNN“) und zeigt dann „Neue Version … – ⬇️ Herunterladen“; der Knopf lädt die neue App im Browser, Android fragt danach nur noch „Aktualisieren?“. Auch „Menü → Nach Updates suchen“ prüft in der App jetzt die App-Fassung.
- 2026-11-16, Epochia Version 213 – aus der großen Prüfung: Figuren, die knapp vor der rechten oder linken Kante eines großen Gebäudes stehen, werden nicht mehr vom Gebäudebild verdeckt.
- 2026-11-16, Epochia Version 212 – aus der großen Prüfung: Die verschneiten Fassungen von Hügeln, Bergen, Felsen, Bäumen und Gebäuden ohne Winterbild werden in den letzten Herbstminuten nach und nach vorgerechnet – vorher kamen sie alle im ersten Winterbild auf einmal (spürbares Stocken).
- 2026-11-16, Epochia Version 211 – aus der großen Prüfung: Im Hintergrund schläft der ganze Ton (in der Android-App blieb der Audio-Ausgang offen und zog Akku); sind Geräusche und Musik aus, wird der Ton gar nicht erst angelegt; ohne Konto erinnert das Spiel höchstens einmal die Woche ans Exportieren des Spielstands.
- 2026-11-16, Epochia Version 210 – aus der großen Prüfung, Bedienung: Seitenknöpfe zeigen auf hohen Handys hochkant ihren Namen (kleine bleiben schlank); größere Tippflächen für die Anzeigen oben, ⓘ an den Baukarten und die Reiter quer; Seitenkopf, Fenster und Forschungsdetail halten Abstand zu Kerbe und Kamera; „Epoche“ → „Zeitalter“; Forschungsliste sagt „noch 2 bauen“ statt nur „🔨 2“; Startseite „Vom Lagerfeuer zur Stadt“; veraltete Punkte in Wünsche und Plänen berichtigt, nie benutzter Code entfernt.
- 2026-11-16, Epochia Version 209 – aus der großen Prüfung, Tempo und Akku: Die Schneedecke liegt jetzt fest in den vorgezeichneten Bodenstücken statt in jedem Bild über den ganzen Bildschirm gemalt zu werden (Winterbild im Test etwa 7-mal schneller); höchstens 60 Bilder pro Sekunde, beim reinen Zuschauen 30 (S23 zeichnete 120); beim Zurückkommen ins Spiel wird nur neu gemalt, wenn Bilder wirklich verloren sind oder das Spiel länger weg war; verworfene Leinwände geben ihren Speicher sofort frei; Sockel werden nur noch bei Gebäudebildern vermessen (schnellerer Start).
- 2026-11-16, Epochia Version 208 – aus der großen Prüfung: Die Eisenzeit-Gebäude (Eisenpflug-Feld, Obstgarten, Jagdhof, Fischerei, Rindergut, Holzhof, Großer Steinbruch, Tuchmacherin u. a.) richten sich jetzt nach Wetter, Jahreszeit und Katastrophen wie ihre Bronzezeit-Vorstufe – vorher brachte z. B. das Eisenpflug-Feld im Winter vollen Ertrag, obwohl dort „im Winter nichts“ steht. Bot (bot-eisen.mjs, mit V207/V208): Eisenzeit ab 535 min wie vorher, Keltenschrift nach 1302 statt 1156 min – die Eisenzeit dauert damit etwa 23 % länger, keine Sperre. Emin (17.11.): erstmal so lassen.
- 2026-11-16, Epochia Version 207 – Wunsch Emin: große Prüfung mit fünf Prüfern, erste Runde Fehler behoben. Alte Zwischenspeicher-Fassungen (seit V61 über 100 Kopien aller Bilder am Handy) werden gelöscht; Geisterfinger nach dem Verlassen der App (jeder Tipp wurde Zoom) weg; Android-App: Zurück-Taste schließt Fenster statt die App; Werkstatt ohne Rohstoffe hielt ihr volles Lager ewig voll; Abriss erstattet auch bei vollem Lager, Stufen zum bezahlten Preis und den laufenden Ausbau; Wagner wirkt nur besetzt und am Weg; Speichern meldet, wenn es scheitert; Import hebt den alten Stand auf (zurückholbar) und lädt auch Codes mit Text dahinter; beim Bauen liegen ▾ und Meldungen nicht mehr auf dem Bau-Fenster; Seitenknöpfe nicht mehr unter den Reitern; Sprechblase nicht über dem Menü; „Wunsch in 0 s“ und verlorene Eingaben im Konto behoben; kaputte Stände (Jagd außerhalb der Karte, Tagesbelohnung) stürzen nicht ab.
- 2026-11-16, Epochia Version 206 – Wunsch Emin: Gelände bei Wetter und Jahreszeiten geprüft (Fluss, Sand, Wiese, Wald, Felsen, Hochgebirge, Bergland, Hügel; Frühling bis Winter, Schneeanfang und Tauwetter, alle Wetter, Abend, Nacht, Dürre, Kältewelle, Hochwasser, Waldbrand). Behoben: Hügel blieben im Winter grün – jetzt verschneite Kuppen mit Licht und Schatten; beim Schneeanfang und Tauwetter lag ein milchiger Schleier über allem – jetzt kommt und geht der Schnee in Flecken, auch auf Hügeln, Felsen, Büschen und Bergland; Vögel fliegen nicht mehr nachts und bei Gewitter, Hagel oder Sturm; Schmetterlinge nur bei Tag, ohne Schnee und bei ruhigem Wetter; keine springenden Fische unter dem Eisschimmer.
- 2026-11-16, Epochia Version 205 – Wunsch Emin: alle Figuren und jede Arbeitsbewegung aller Arbeiterarten geprüft (41 Bewegungen, je 8 Momente plus Hin- und Rückweg). Behoben: schwebende Warenbilder über dem Kopf (Fischer, Höhlenmaler, Felsritzer), schwebende Farbtupfen beim Höhlenmaler und Erdkrümel über der Pflanzerin, weiße Hintergrundreste im Bild des laufenden Hirten, des Jägers und des Speerfischers, bunte Funken-Quadrate bei der Glasmacherin; Späne (Bergmann), Splitter (Felsritzer), Spritzer (Netzfischer, Zinnwäscherin) kommen jetzt genau beim Schlag bzw. Wurf, Erde am Acker fliegt am Boden statt in der Luft. Offen für die neuen Bilder: Bronze- und Eisenzeit-Arbeiter laufen noch im Steinzeit-Fell zur Arbeit.
- 2026-11-16, Epochia Version 204 – Frage Emin (Bildschirmfoto): Neben der Sammlerin hüpfte ein roter Punkt auf und ab – eine früher gemalte „Beere“, die in den Korb fliegen sollte. Entfernt; das Pflücken zeigen die Figurenbilder selbst.
- 2026-11-16, Epochia Version 203 – Wunsch Emin (Export/Import zu umständlich, viel zu viel Text): Der Spielstand wird als gepackter, etwa neunmal kürzerer Code exportiert und mit einem Tipp geteilt (iPhone) oder kopiert. Beim Importieren reicht „Einfügen und laden“ (aus der Zwischenablage), alternativ „Datei wählen“; der Text selbst ist nur noch aufklappbar. Alte exportierte Texte laden weiter. Hinweis: Das Konto (Cloud-Sicherung) ist zurzeit nicht erreichbar, das Supabase-Projekt ist vermutlich pausiert.
- 2026-11-16, Epochia Version 202 – Fehler von Emin (PWA ruckelt auf dem iPhone): Die Uferform des fließenden Wassers wurde seit V198 in jedem Bild viermal neu aufgebaut. Jetzt wird sie für einen etwas größeren Ausschnitt einmal berechnet und wiederverwendet (Wasser je Bild am Rechner 6 ms → unter 0,3 ms, ganzes Bild etwa 11 → 5 ms). Der Schaumsaum atmet nur noch in der Helligkeit.
- 2026-11-16, Epochia Version 201 – Fischerhütte im neuen Stil (Säulenfüße und Boot neu vermessen, Boot liegt weiter auf eigenem Wasserfeld). Spielfluss Eisenzeit geprüft: Bot kann jetzt Eisen, Salz und Glas herstellen und den Salzberg bauen (neu/tools/bot-eisen.mjs); er erreicht die Keltenschrift nach 1156 min ab Kupferzeit (Eisenzeit ab 535 min), keine Sperre gefunden. Bremse wie in der Bronzezeit: Ton (Rennofen kostet 30 Ton) – Entscheidung bei Emin.
- 2026-11-16, Epochia Version 200 – Wunsch Emin: Steinzeit-Gebäude im neuen halb-realistischen Stil (Scenario), Sommer und Winter, Vorderansicht: 24 Gebäude (alle außer Fischerhütte, deren Säulen und Boot im Spiel genau vermessen sind). Rückansichten und Arbeiter folgen mit dem Pro-Plan; neue Figuren-Proben liegen in ~/Bilder/epochia-scenario-probe.
- 2026-11-16, Epochia Version 199 – Fehler beim Prüfen des Spielflusses (Bot): Die Erzader konnte tief im Hochgebirge entstehen, wo niemand hinkommt; sie blieb liegen und es kam keine neue – ohne Goldblättchen wurde die Halle der Himmelsscheibe nie fertig, kein Aufbruch in die Eisenzeit. Jetzt entstehen Fundstellen im Gebirge nur im Bergland oder am Rand des Hochgebirges, festsitzende verschwinden (auch in alten Ständen), der Bergmann kommt aus der nächsten erreichbaren Mine. Bot: Eisenzeit nach 535 min ab Kupferzeit (vorher nie).
- 2026-11-16, Epochia Version 198 – Fehler von Emin (Bildschirmfotos 15.11.): Ufer hatten Wolken-Bögen und Treppenstufen – Sand, Wasser und Gebirge haben jetzt einen weich geschwungenen Rand (weichgezeichnete Feldkarte statt Kreisen). Im See lag ein Rautenmuster aus hellen Nähten (Wassertiefe an den Kachelrändern) – weg; die zweite Wasserlage ist größer und versetzt, damit sich die Wiederholung des Wasserbilds nicht mehr abzeichnet.
- 2026-11-16, Epochia Version 197 – Fehler beim Prüfen des Spielflusses: Das Gebirge lag auf jeder Karte über 200 Felder vom Lager, darum konnte in der Kupferzeit niemand neue Kupferminen bauen (Bot blieb dort stehen). Jetzt zieht sich auf jeder Karte ein Gebirgsausläufer bis etwa 35–45 Felder ans Lager, möglichst auf derselben Flussseite: innen Hochgebirge, am Rand Bergland für Minen, Felsen am Fuß. Alte Stände bekommen ihn beim Laden, nie unter Gebäuden, Wegen oder Wasser; die Lage wird gemerkt. Bot erreicht jetzt die Frühe Bronzezeit (Minute 416). Aufräumen: Brückenbau-Wunsch steht als fertig (seit V172).
- 2026-11-15, Epochia Version 196 – Wunsch Emin (Forschungsboni zu hoch): Flechtkörbe, Speerspitzen, Pfeil und Bogen, Faustkeil, Höhlenmalerei und Sichel geben je +15 % statt 30–50 % (Jäger zusammen +30 % statt +90 %); die Boni gelten jetzt auch für die Eisenzeit-Weiterentwicklungen (Obstgarten, Jagdhof, Holzhof, Großer Steinbruch, Druide, Eisenpflug-Feld). Bot: Jungsteinzeit 123 statt 117 min.
- 2026-11-15, Epochia Version 195 – Fehler aus der Bilder-Analyse (docs/plan-bilder-neu.md): Eisenzeit-Gebäude zeigen das Bild ihres Bronzezeit-Vorgängers statt eines Steinzeit-Bildes (Gehöft/Stadthaus = Hallenhaus usw.); am Viehhof laufen Schafe, am Rindergut Rinder (eingefärbte Ziegen bis zu eigenen Bildern); Eisenmine trägt den Erzkorb; Druide, Eisenschmied, Rennofen, Salzsiederei, Wagner, Glasmacherin, Eisenmine mit passender Bewegung; Besucher am Heiligen Hain, Druidenhain, Fürstenhügel und Badehaus.
- 2026-11-15, Epochia Version 194 – Wunsch Emin: große Prüfung aller 110 Aufträge gegen Zeitalter, Forschung, Gebäude, Lager und neue Regeln – keiner unmöglich; Landkauf-Aufträge ausgeblendet; „Baue 3 Eisenschmiede“ wird „Baue 5 Eisenschmiede“ (den Eisenschmied gibt es schon ab der Frühen Eisenzeit).
- 2026-11-15, Epochia Version 193 – Fehler/Idee von Emin (graue, ungeladene Rauten am iPhone; „Karte als feste gezeichnete Fläche“): Übersichtskarte – die ganze Karte wird beim Betreten in grober Auflösung vorgemalt (unter 2 s am Rechner), weit herausgezoomt wird nur sie gezeichnet, nah liegt sie unter den scharfen Bodenstücken, wo eins fehlt. Nur sichtbare Bodenstücke werden gemalt, weniger Zeichenflächen-Speicher (Safari), Wellen erst ab halbem Zoom.
- 2026-11-15, Epochia Version 192 – Fehler von Emin: viele ungeladene, weiße Kartenbereiche. Beim Betreten malt das Spiel den Boden ums Dorf schon im Ladefenster vor („Die Landschaft wird gemalt …“), weit herausgezoomt dürfen mehr (kleinere) Bodenstücke im Speicher bleiben, und was noch fehlt, ist wiesengrün statt weiß.
- 2026-11-15, Epochia Version 191 – Fehler von Emin („Wo ist der Fluss?“): Im Winter lag die Schneewiese über dem Fluss. Schnee wird jetzt vor dem Wasser gezeichnet, das Wasser bekommt im Winter einen hellen Eisschimmer.
- 2026-11-15, Epochia Version 190 – Wunsch Emin: zwei Arten Gebirge – Hochgebirge (Schneegipfel und lange Grate in zusammenhängenden Zügen, unbebaubar) und Bergland (Vorberge, mittlere Berge, Felsplateaus ohne Schnee; Minen und Steinbrüche überall, Wege und Fußgänger dürfen hinein); 10 verschiedene Bergbilder, zufällig gespiegelt.
- 2026-11-15, Epochia Version 189 – Wünsche Emin: keine Wolken und kein Landkauf mehr, die ganze Karte gehört dazu (auch in alten Spielständen, Land-Aufträge fallen weg); Steinbruch, Kupfer- und Eisenmine nur noch am Gebirge (bis 2 Felder hinein, bestehende bleiben stehen); Gebirge mit Vorbergen am Rand, mittleren Bergen und hohen Schneegipfeln innen, Gipfel drei- bis viermal so hoch wie ein Baum; Boden weit herausgezoomt in geringerer Auflösung (schneller, weniger Speicher).
- 2026-11-15, Epochia Version 188 – Wunsch Emin: Hügel nur zum Ansehen am Gebirgsrand (2–6 Felder vor dem Gebirge, bebaubar, ohne Spielwirkung, auch in alten Spielständen), zwei Hügelbilder aus Scenario, im Winter verschneit.
- 2026-11-15, Epochia Version 187 – Fehler von Emin: Beim Abholen von Glitzer lief die Person trotz Brücke übers Wasser (der Weg wurde nur nah an der geraden Strecke gesucht). Jetzt sucht sie auch weiter entfernte Brücken, Brücken im Bau tragen noch nicht, und ohne Brücke kommt „Dorthin führt kein Weg – baue eine Brücke“.
- 2026-11-15, Epochia Version 187 – Wunsch Emin: neues Gelände im halb-realistischen Stil aus Scenario (Wiese, Wasser, Sand, Pfad, Gebirgsboden, Erdsockel, Laubbaum/Birke je 4 Jahreszeiten, Tanne Sommer/Winter, Berge, Felsen, Busch, Blumen, Setzling); im Winter verschneite Wiese statt weißem Schleier.
- 2026-11-15, Epochia Version 186 – Fehler von Emin (Späte Bronzezeit): „Habe 7 Felsritzer“, aber Felsritzer lassen sich nicht mehr bauen – Auftrag sagt jetzt „Sternkundiger zählt mit“ (zählte schon, stand nur nicht da) und zeigt dessen Bild; Bernstein erklärt im Lager, dass es ihn nur beim Händler gibt, ab der Forschung „Bernsteinstraße“.
- 2026-11-11, Epochia (gesammelt) – Wunsch Emin: Wege und Brücken auch senkrecht und waagerecht auf dem Bildschirm statt Zickzack. Wegfelder, die sich nur an einer Ecke berühren, sind verbunden (Wegenetz, Figuren, Träger); schräg gezogen entsteht eine gerade schräge Reihe; schräge Brücken mit eigenem Bohlenbelag (selbst gezeichnet, ein Canva-Bild kann später folgen).
- 2026-11-11, Epochia (gesammelt) – Fehler von Emin: Restzeit über Baustellen kaum lesbar (weiße Zahl auf Schnee, dazu von Schneefall und Nacht überdeckt). Zeit steht jetzt auf einem dunklen Schild, Balken und Zeit werden nach Wetter und Nacht gezeichnet.
- 2026-11-11, Epochia Version 161 – Fehler von Emin: Land kaufen – Fenster schloss sich manchmal sofort oder kaufte ohne Nachfrage. Der Browser schickte nach dem Tipp auf die Wolken noch einen Klick an dieselbe Stelle hinterher, der den Hintergrund bzw. „Kaufen“ traf; dieser Nachklick wird jetzt verschluckt (auch bei allen anderen Fenstern, die ein Tipp auf die Karte öffnet).

<!-- Claude verschiebt erledigte Punkte hierher, mit Datum und Version -->
- 2026-11-11, Epochia Version 160 – Shop: Reiter (Schneller, Waren, Deko, Gold), große Gold-Karten, Zeitalter-Paket je Zeitalter, Deko zum Kaufen und Aufstellen (14 Stücke, Bilder folgen), Fundstück-Bild Lederrucksack.
- 2026-11-11, Epochia Version 159 – Bilder: Händler aus dem Süden mit Esel, normaler Händler als Figur, Fundstücke Goldblättchen, Zinn-Perle, Großer Bernstein, Teil der Himmelsscheibe, Salzkristall.
- 2026-11-11, Epochia Version 158 – Wunsch Emin: Händler aus dem Süden (ab „Weinhandel“ alle 45 Minuten, 10 Minuten lang, Wein und Glas gegen Salz, Felle, Eisen; Wein nur noch bei ihm), alle fehlenden Winterbilder (Handelsplatz, Fürstenhügel, Flechtwerkhaus, Halle, Höhle, Steinkreis, Steinhaus, Baustellen), Baustellen zeigen im Winter Schnee.
- 2026-11-08, Epochia Version 153 – Wunsch Emin (Arbeitsbewegungen Bronzezeit aus Canva): Bergmann der Kupfermine schlägt mit der Hacke und trägt das Erz im Korb, Schmelzofen-Arbeiter tritt den Blasebalg, Bronzegießer kippt den Tiegel, Köhler stochert im Meiler, Zinnwäscherin schwenkt die Pfanne, Schmuckmacherin klopft den Armreif (je 3 Bilder); Kupfer- und Bronzeschmied hämmern am Amboss (2 Bilder, Zwischenbild folgt).
- 2026-11-08, Epochia Version 152 – Wünsche Emin: Bilder aufgeräumt (ungenutzte Lederleiste entfernt, Originale an den richtigen Ort, Brücken haben wieder ihr Holzmuster – wurde seit dem hellen Design nicht mehr geladen), Töpferei-Rückseite im Winter neu aus Canva; ⚡-Knopf am Gebäude zum Beschleunigen von Bau und Ausbau mit Beschleunigungssteinen (jeder spart 5 Minuten, 3 zum Ausprobieren, weitere im Shop); „Neu“ in der Bauleiste nur noch für wirklich neue Gebäude, nicht für Weiterentwicklungen (Pflanzerin → Baumgärtnerin); starrer gemalter Rauch aus 10 Bildern entfernt (Feld, Felsritzer, Hallenhaus, Köhler, Kupferschmied, Töpferwerkstatt, Töpferei-Rückseite im Winter), dort steigt jetzt bewegter Rauch auf (neu/tools/rauch-weg.py); Tägliche Belohnung hochkant kompakt: Tag 1–6 in drei Spalten, große Truhe als breite Zeile.
- 2026-11-08, Epochia Version 150–151 – Wunsch Emin (Canva weiter): Winterbilder von Jagdhütte und Feld; neues Werkzeug platte-fuellen.py schließt Schnee-Lücken am Plattenrand.
- 2026-11-08, Epochia Version 142 – Wunsch Emin: Ladebildschirm mit Ladebalken und Prozent; nacheinander „✔ … geladen“ (Wiesen, Häuser, Wunderwerke …). Beim Tageslauf geprüft, war schon gebaut.
- 2026-11-07, Epochia Version 149 – Fehler Emin: Nach einmal Quer ließ sich Android nicht zurück auf hochkant drehen – Drehung wird bei jedem Drehen und jeder Berührung neu freigegeben; Bauleiste hochkant ohne leeren Streifen links, Kategorien enden vor dem ▾-Knopf.
- 2026-11-07, Epochia Version 148 – Wunsch Emin: Lager zeigt Einnahmen (▲ grün) und Ausgaben (▼ rot) je Minute getrennt; bei vollem Lager zählt, was die Gebäude herstellen könnten.
- 2026-11-07, Epochia Version 147 – Fehler Emin: Android blieb quer (installiertes Spiel merkt sich das alte Manifest) – Drehung wird beim Start freigegeben; ⓘ in der Bauleiste verdeckte das Gebäudebild – sitzt jetzt außen auf der Kartenecke.
- 2026-11-07, Epochia Version 146 – Wunsch Emin: Hochkant und quer frei wählbar, auch auf Android (manifest „any“), Hinweis „Dreh dein Handy quer“ entfällt; ⓘ in der Bauleiste links über dem Bild (verdeckte die Kosten). Design-Kontrolle auf iPhone, Android und Rechner (6 Größen, 17 Fenster): Hinweis über Seiten weg, Schatzkiste hochkant lesbar, Hinsetz-Leiste mit Platz für den Text, Shop gleich breit, „Zurück“ einzeilig, Abstand oben für Kerbe/Kamera-Insel.
- 2026-11-07, Epochia Version 145 – Fehler Emin: Im Winter fehlten Häuser ohne eigenes Winterbild (die selbst verschneiten Bilder wurden nach dem Leeren durch Chrome nicht neu angelegt). Wunsch Emin: Info vor dem Bauen – ⓘ an jeder Karte der Bauleiste und Kurzinfo mit ⓘ beim Hinsetzen. Bild Steinhaus aus Canva.
- 2026-11-07, Epochia Version 143 – Fehler Emin: Boden, Wolken, Pfahlbau und Fischer verschwanden am Handy (Chrome leert vorgezeichnete Leinwände, wenn das Spiel im Hintergrund war). Jetzt werden sie beim Zurückkommen und bei jeder Meldung von Chrome neu angelegt. Wünsche von Emins Bruder (iPhone): runde Wolkenschatten entfernt; „Erst bauen“ in der Forschung führt zur Karte und legt das Gebäude bereit (oder zeigt es in der Leiste, wenn Waren fehlen); neuer 🔨-Knopf mit einer Liste aller Gebäude, die man ausbauen kann.
- 2026-11-07, Epochia Version 142 – Wunsch Emin (alle Empfehlungen der Design-Bewertung): Blasen nur bei Problemen und ruhig, Herstellung als aufsteigendes „+13“, Einstellung im Menü; fertige Wunderwerke zeigen nur Effekte; kleines Gebäudefenster als schmale Leiste mit runden Knöpfen und ⬆ zum Ausbauen; großes Fenster mit Kacheln, ✕ oben, Abreißen als Text; Ladebalken mit Prozent und Ladeschritten; Meldungen unten statt über den Titeln; schmalere Seitenleiste. Schatzkiste: Tauschen nur bei fehlenden Stücken, Doppelte gegen Wissen abgeben. Pfahlbau ohne gemaltes Wasser, darunter ist der Fluss der Karte (neu/tools/wasser-weg.py).
- 2026-11-07, Epochia Version 141 – Wunsch Emin („alles umsetzen“ nach der Prüfung der Spiellogik): Aufträge nur im eigenen Zeitalter, keine Aufträge mehr, die sich von selbst erfüllen, Eisen-Reserve, Wahrzeichen nur einmal, Gehöft/Stadthaus per Knopf, Steinkreis mit weniger Fundstücken, mehr Bernstein, kleinere Eisen-/Salz-/Glas-Wünsche, Fundstellen nur für fehlende Stücke (Einzelheiten in docs/auftraege.md).
- 2026-11-07, Epochia Version 140 – Wunsch Emin: 27 neue Aufträge (Stufen, neue Häuser, Bronzezeit, Eisenzeit; Liste in docs/auftraege.md); Häuser, die sich von selbst weiterentwickeln, zeigen keinen Knopf mehr, sondern „Von selbst und kostenlos“.
- 2026-11-07, Epochia Version 139 – Fehler Emin: runde Schatten wanderten beim Verschieben mit dem Bildschirm. Die Wolkenschatten (bewölktes Wetter) liegen jetzt auf der Karte und ziehen über das Land.
- 2026-11-07, Epochia Version 138 – Fehler Emin: Gebäude verschwinden am Handy, beim Verschieben kurz sichtbar. Ursache wahrscheinlich ein Fehler beim Zeichnen eines einzelnen Objekts, der die ganze Zeichenschleife abbrach (am PC nicht nachstellbar). Jetzt wird jedes Objekt einzeln abgesichert; Fehler stehen im Menü unter „Letzte Fehler“ (für die genaue Ursache).
- 2026-11-07, Epochia Version 136 – Wunsch Emin: Stufen an die Zeitalter angepasst (3 je Zeitalter, weitergezählt bis 24; jetzt bis 9 spielbar), zwei Wohn-Reihen: kleines Haus wird feiner (neu Flechtwerkhaus, Steinhaus), Langhaus ist eigene Reihe und muss nicht mehr ins kleine Haus passen.
- 2026-11-07, Epochia Version 132 – Wunsch Emin: Produktionsgebäude haben Stufen 1–5 (je Stufe +1 Arbeiter und +50 % Ertrag; Ausbau kostet Baukosten ×1,5/2,5/4/6, ab Stufe 4 Werkzeug; Steinzeit bis 3, Bronzezeit 4, Eisenzeit 5; Stufe bleibt beim Weiterentwickeln, Bot baut mit aus). Plan: `docs/plan-stufen.md`.
- 2026-11-07, Epochia Version 131 – Wunsch Emin: Wasser in den Gebäudebildern hat die Farbe des Flusses (`neu/tools/wasser-farbe.py`).
- 2026-11-04, Epochia Version 95 – Wunsch Emin: helles Design mit eigener Farbwelt für Steinzeit, Kupferzeit, Bronzezeit und Eisenzeit statt Braun; neues Lager mit Bereichen, Füllstand und knappen Waren oben; Wege, Erdsockel und Wiese heller.
- 2026-11-04, Epochia Version 94 – Wunsch Emin: Axt und Hacke schwingen weicher (Zwischenbild, je 3 Haltungen), die Füße bleiben dabei an derselben Stelle.
- 2026-11-04, Epochia Version 93 – Wunsch Emin: Töpferin sitzt am Brett, formt den Ton, glättet den Rand und betrachtet den fertigen Topf (3 Bilder).
- 2026-11-04, Epochia Version 92 – Wunsch Emin: Hirte am Zaun hebt den Stab und ruft die Ziegen (3 Bilder), Arbeiter der Tongrube trägt auf dem Rückweg einen Korb mit Ton auf der Schulter.
- 2026-11-04, Epochia Version 91 – Wunsch Emin: Fellmacherin kniet und schabt das Fell (3 Bilder), Steinschläger sitzt am Arbeitsstein, hebt den Schlagstein und schlägt zu, Splitter fliegen (3 Bilder).
- 2026-11-04, Epochia Version 90 – Wunsch Emin: Mammutjäger holt mit dem Speer aus und wirft (3 Bilder, Speer fliegt), Höhlenmaler taucht den Pinsel ein und malt in Kopfhöhe und hoch oben (3 Bilder).
- 2026-11-04, Epochia Version 89 – Wunsch Emin: Jäger spannt den Bogen und schießt (3 Bilder, Pfeil fliegt), kommt mit Hirsch über der Schulter zurück.
- 2026-11-03, Epochia Version 87 – Fehler von Emin: Fischerhütten hatten im Winter ein halbes Boot im Wasser. Das gemalte Boot wurde nur aus dem Sommerbild gelöst, jetzt auch aus dem Winterbild.
- 2026-11-03, Epochia Version 86 – Wunsch Emin: Eisenzeit als Technik: drei Stufen, 31 Forschungen (gut 7 Stunden) bis zur noch gesperrten Antike, 27 Gebäude, Eisen, Salz, Glas, Wein, Bedürfnis Salz, 15 Aufträge, Salzberg mit 4 Fundstücken; vorläufige Bilder. Aufbruch aus der Bronzezeit ist frei, Metallreserve schützt jetzt auch ihn. Gesperrter Aufbruch sagt ehrlich „kommt mit dem nächsten Ausbau“.
- 2026-11-03, Epochia Version 85 – Wunsch Emin: Item-Shop zum Ausprobieren ohne echtes Geld: Gold, Beschleunigen von Forschung, Bau und Wunderwerk, fehlende Fundstücke, Warenpakete, eine Baustelle mehr.
- 2026-11-03, Epochia Version 84 – Wunsch Emin: Technik für weiche Arbeitsbewegungen mit 3 Bildern; jede Arbeit hat eine eigene Bewegung, Kupfermine, Köhler, Schmelzofen, Gießer, Zinnwäscherin und Schmuckmacherin zeigen jetzt Menschen; Fundstück-Bilder Muschel und Stoßzahn.
- 2026-11-03, Epochia Version 83 – Wunsch Emin: letzte Winterbilder der Rückseiten (Töpferei, Vorratsspeicher), erste Fundstück-Bilder (Rötel, Holzkohle, Adlerfeder).
- 2026-11-03, Epochia Version 82 – Wunsch Emin: altes Spiel und ungenutzte Dateien entfernt (alte Fischerplatz-Bilder, zwei alte Zweige, nicht mehr gebrauchte Werkzeuge); Winterbilder der Rückseiten von Steinschläger und Ahnenplatz.
- 2026-11-03, Epochia Version 81 – Wunsch Emin: Ordner aufgeräumt: altes Spiel entfernt, Hauptadresse leitet zu Epochia, Bilder nach Art und Gebäude sortiert. Der alte Ruckel-Fehler entfällt damit. Dazu Baustufen des Steinkreises, Winterbilder von Höhle, Halle, Feuerplatz- und Fellmacherin-Rückseite.
- 2026-11-03, Epochia Version 80 – Wunsch Emin: Fundstellen glitzern und pulsieren richtig (drehender Stern, Lichtwellen, Funken, Farbe je Gelände), ohne Canva-Bilder; Bild der halb fertigen Halle.
- 2026-11-03, Epochia Version 79 – Wunsch Emin: Halle der Himmelsscheibe (4 Abschnitte setzen die Scheibe aus 5 Teilen zusammen, Goldblättchen, Zinn-Perlen, großer Bernstein vom Händler; Bronzegießer +20 %, Händler 5 Minuten früher, Großes Sonnwendfest), Bilder der Höhle.
- 2026-11-03, Epochia Version 78 – Fehler von Emin: Ältester meldete direkt nach dem Bau „hier arbeitet niemand“, obwohl Leute frei waren (Arbeiter werden nur 4× je Sekunde verteilt). Wunsch Emin: Wunderwerke Schritt 3: Steinkreis in 4 Abschnitten (Sternkarten, Riesenfindlinge rollen, Sonnenstein, Blumenkränze), Sonnenkalender warnt vor Katastrophen, Äcker +10 %, Sonnwendfest mit Geschenk; fertiger Steinkreis und alte Baustelle bleiben erhalten. Schritt 2: Höhle der Geschichten (4 Kapitel mit Fundstücken, Platz selbst wählen an Felsen, Wissen, Bonus, Wärme, Geschichtenabend, Fest im Herbst, Album-Seite, eigenes Bild).
- 2026-11-03, Epochia Version 76 – Wunsch Emin: Wunderwerke Schritt 1: Fundstücke (glitzernde Stellen, Glut nachts, Sternschnuppe, Glück bei der Arbeit, Jagd, Hochwasser, Tag-7-Truhe, Fundkorb offline), Schatzkiste mit Tausch 3 gegen 1; Erzader bringt 40 Kupfererz, jede 3. dazu ein Goldblättchen. Fundstück-Bilder ab 27.11., bis dahin Emojis.
- 2026-11-03, Epochia Version 75 – Wunsch Emin: echte, geschlossene Rückseiten für Sammlerin und Langhaus (Canva), beim Langhaus steigt der Rauch jetzt aus dem Dach. Winterbilder dazu in Version 76.
- 2026-11-03, Epochia Version 74 – Wunsch Emin: Warnung, wenn die Einwohner eine Ware schneller verbrauchen, als sie für den Aufbruch zusammenkommt (Forschungsfenster, Zielzeile, einmal vom Ältesten); Ältester nennt nach einer Minute, wo Arbeiter fehlen und welches Gebäude mit vollem Lager man pausieren kann, Einwohner-Fenster listet fehlende Stellen; Jägerlager und Mammutjägerlager 20 % weniger Nahrung (Jungsteinzeit voll 75–77 → 55–65 %, ab Früher Bronzezeit kaum Wirkung, dort füllt der Viehhof).
- 2026-11-03, Epochia Version 73 – Emins Entscheidungen zur Analyse: Forschungen kosten 50 % mehr Waren, Wünsche ebenso, Lager wächst je Zeitalter (200–700); Ackerbau, Vieh und Ton-Kette (Jungsteinzeit und ihre Weiterentwicklungen) brauchen je 1 Arbeiter mehr (mehr Stellen überall ließ die späte Bronzezeit im Test stocken); Tagesbelohnung wächst mit dem Zeitalter, ein verpasster Tag bricht die Reihe nicht; Bronzeschmied macht 4 Werkzeuge; Händler-Knopf am Rand und größere Blase; „Willkommen zurück“ nennt Hunger und Verluste; 10 Minuten Schonfrist für Glaube; im Einstieg gilt beim Tippen der gezeigte Bauplatz; größere Tippflächen; Warenleiste einzeilig auf sehr kleinen Handys.
- 2026-11-02, Epochia Version 72 – Wunsch Emin nach der großen Analyse: Forschung vormerken (startet von selbst, auch offline), Belohnungen und Tausch gehen übers Lager hinaus, Händler-Abstand richtig, Schmuck-Bedarf 0,003, Werkstätten lassen Metall liegen; Fehler behoben: Mammut-Auftrag hing, Wünsche hingen, Wunsch-Aufträge verstopften die Liste, leere Karte beim Wechsel der Qualität, falsche Anzeige „leer in …“, schräges Ziehen aus der Bauleiste, Texte, abgeschnittene Kosten.
- 2026-11-02, Epochia Version 63–71 – Bilder: 8 Bronzezeit-Gebäude (nur Vorderansicht), 13 von 19 fehlenden Winterbildern der Steinzeit; Freistellen lässt Schnee ganz (`--schnee`).
- 2026-11-02, Epochia Version 62 – Wunsch Emin: Späte Bronzezeit (Bernstein vom Händler, Schmuck, Hallenhaus, Fischerhaus, Sternkundiger, Heiliger Hain, Kornspeicher, Fürstenhügel, Sonnwendfest), ohne Bilder.
- 2026-11-02, Epochia Version 61 – Wunsch Emin: Frühe Bronzezeit (Zinn, Bronze, Wolle, Händler, Bedürfnis Werkzeug, Weiterentwicklungen), ohne Bilder.
- 2026-11-02, Epochia Version 60 – Wunsch Emin: Kupferzeit als erste Stufe der Bronzezeit (Aufbruch, Dorfplatz, Kupfermine, Köhler, Schmelzofen, 9 Weiterentwicklungen, 10 Forschungen, 4 neue Aufträge), noch mit Platzhaltern statt Bildern.
- 2026-11-02, Epochia Version 59 – Fehler von Emin: Zurück-Knopf auf der Aufträge-Seite träge. Die Karte wurde hinter ganzseitigen Fenstern weitergezeichnet; jetzt ruht sie dort (Messung mit Emins Stand: Zurück etwa halb so lange). Am Handy noch zu bestätigen.
- 2026-11-02, Epochia Version 58 – Emins Liste: Wohnhöhle und Höhlenmaler haben echte, geschlossene Rückseiten (Canva; vorher zwei Bilder für dieselbe Seite); ein einheitlicher Holzrahmen für alle Fenster und Sprechblasen, Tägliche Belohnung neu mit Warenbildern; gegen „man kann nur noch forschen“: Forschungen verlangen Gebäude, 24 neue Aufträge (gesperrte verstopfen die Liste nicht mehr), Wünsche des Stammes (Waren abgeben → Wissen und kürzere Forschung); Anzeige „Mittelsteinzeit → Mittelsteinzeit“ behoben.
- 2026-11-01, Epochia Version 57 – Wunsch Emin: See doppelt so breit (neue Spiele, `mapGen 3`). Fehler behoben: Fluss riss bei manchen Karten am Lager ab bzw. lag zu nah am Lager; Stände mit `mapGen 2` behalten ihre Karte.
- 2026-11-01, Epochia Version 56 – Fischer am Ufer hält den Speer fest in beiden Händen, holt aus und sticht zu, es spritzt (Canva).
- 2026-11-01, Epochia Version 55 – Wünsche Emin: viel größere Karte (512 × 512, alte Stände liegen in der Mitte), Fluss von der Quelle im Gebirge bis zum See, Wolken über nicht gekauftem Land; Einstieg neu: der Älteste läuft auf der Karte mit (Entwurf B); mehr Verbrauch (Nahrung, Feuerholz, Stein, Werkzeug), Überschuss nur noch knapp; Fischer paddelt sichtbar; kein automatischer Dunkelmodus am Handy.
- 2026-11-01, Epochia Version 54 – Wunsch Emin: Fischerplatz auf Säulen ohne gemaltes Wasser, Boot liegt immer auf einem Wasserfeld (alte Fischerplätze bleiben, wo sie sind). Rückansichten ohne eigenes Winterbild werden vom Spiel selbst verschneit (eigene Canva-Winterbilder folgen nach dem 27.11.).
- 2026-11-01, Epochia Version 53 – Im Winter liegt Schnee auch auf Felsen, Bergen und Büschen (vom Spiel selbst gezeichnet, ohne Canva).
- 2026-11-01, Epochia Version 52 – Neuer Fluss in neuen Spielen (breit, Schleifen, seicht/tief, Sandbänke, Wasserfall; alte Stände behalten ihre Karte), Konto mit Cloud-Sicherung (Menü → Konto), Knopf „Neu starten“, neue Startseite und Spielstände, gemalter Rauch und weiße Flecken aus den Gebäudebildern entfernt, Winterbilder neu freigestellt.
- 2026-11-01, Epochia Version 51 – Neues Forschungsfenster (Entwurf C von Emin gewählt, auch Handy quer), bewegtes Feuer und Rauch in den Rückansichten statt gemaltem Rauch, Einwohner-Fenster nennt Leute ohne Arbeit, Winterbilder sauber freigestellt, Winter Sammlerin.
- 2026-11-01, Epochia Version 50 – Emins Liste: Fellmacherin, Steinschläger, Töpferei arbeiten auf ihrem Grundstück statt davor; Beter knien auf dem Ahnenplatz/Steinkreis; Frauen knien beim Beten (Canva-Bild); Lichter flackern beim Verschieben nicht mehr schneller; weicheres, wärmeres Licht nachts; näher heranzoomen (bis 3,5); lange Brücken sehen durchgehend aus (keine gestapelten Bilder, weiße Streifen weg).
- 2026-11-01, Epochia Version 49 – Wunsch Emin: Fackeln am Trampelpfad (jedes zweite Feld, das Spiel schaut beim Bauen auf die Nachbarfelder; alte Wege bekommen sie einmalig), nachts warmer Lichtschein; später werden es Laternen (CONFIG.pathLights je Zeitalter). Winterbilder Rückansicht Grubenhaus und Langhaus.
- 2026-11-01, Epochia Version 48 – Wunsch Emin: Steinsammler bauen kleine Felsen in der Nähe nach und nach ab (alle 40 Stein ein Felsfeld, zerbröselt sichtbar), das Gebirge gibt Stein ohne Ende und zählt für den Bonus. Fehler: Fellmacherinnen legten das Fell auf den Boden – jetzt halten sie es in den Händen. Rückansicht Pflanzerin, erste Winterbilder der Rückansichten (Wohnhöhle, Fellzelt).
- 2026-11-01, Epochia Version 47 – Fehler von Emin: Waren blieben bei 199 von 200 hängen (Verbrauch nahm nach dem Auffüllen gleich wieder etwas weg), Forschungen für 200 waren nie bezahlbar – volles Lager mit Überschuss bleibt jetzt bei 200. Rückansichten (Canva) für Vorratsspeicher, Steinkreis, Lagerfeuer.
- 2026-11-01, Epochia Version 46 – Fehler von Emin: Fischer hielt den Speer waagrecht wie ein Gewehr – jetzt sticht er steil von oben ins Wasser (mit Steinspitze). Fischerplatz, Tongrube und Pfahlbau stehen halb im Fluss ohne Erdsockel, das Wasser im Bild geht in den Fluss über (alte Gebäude bleiben, wo sie sind). Rückansichten (Canva) für Ziegengehege, Fellmacherin, Steinschläger, Ahnenplatz, Töpferei.
- 2026-11-01, Epochia Version 45 – Letzte drei Arbeiterbilder (Canva): Bäuerin mit Grabstock unten (Acker gräbt jetzt im Wechsel), Hirte mit Hirtenstab am Ziegengehege, Pflanzerin kniet beim Setzen; Rückansicht Acker.
- 2026-10-31, Epochia Version 44 – Balancing nach Emins Entscheidung: Forschungszeiten halbiert (dafür 50 % mehr Waren), neue Waren-Bedürfnisse mit 10 Min. Schonfrist + 20 Startvorrat, Fellmacherin/Töpferei +25 %, Hunger senkt Laune und lässt Einwohner wegziehen (nie unter 3), 9 neue Aufträge bis 120 Einwohner, Mammutjagd bringt 150 Nahrung, 15 Felle, 10 Wissen.
- 2026-10-31, Epochia Version 43 – Große Analyse Teil C+D: Zurück-Taste bricht Bauen/Wege-Malen ab, Wege vom Wegende weiterziehen (Tippen löscht), kein Weg beim Zoomen, Menü-Knopf nie unter der Bauleiste, obere Leiste hochkant kompakt, Fenster passen auf iPhone-Safari, kaputter Spielstand wird aufgehoben, Löschen/Import setzen sauber zurück, Hinweise nach Platzwechsel; Arbeiter/Besucher nie in fremden Häusern oder im Wasser, Figuren nur aus freien Einwohnern, Textfehler.
- 2026-10-31, Epochia Version 42 – Große Analyse Teil A+B: weniger Rechenlast (Wetter/Geländebonus gemerkt, Statistik 4×/s, Bäume außerhalb des Bildes nicht zeichnen, Boden nach Baumfall stückweise neu, Qualität nach Rechenzeit); volles Lager verbraucht nichts mehr, keine Bäume umsonst gefällt, Einwohner ziehen nach und nach aus, Neustart aus 0 Einwohnern, Abriss-Erstattung nach Bezahltem, Jägerlager entwickelt sich sofort, Anzeigen korrigiert.
- 2026-10-31, Epochia Version 41 – Hintergrundmusik von Emin (Mureka/AIMusicAI): Hauptmelodie am Tag, Lagerfeuer abends/nachts, Winterlied, Festlied beim neuen Zeitalter, sanft überblendet, Schalter im Menü; Ton nach Anruf/Siri auf dem iPhone wieder an.
- 2026-10-31, Epochia Version 40 – Arbeiter auch bei Acker (graben auf dem Feld), Ziegengehege (Hirte am Zaun) und Pflanzerin (kniet am Setzling); Bild Bäuerin „Grabstock oben“ (Canva). Es fehlen noch: Grabstock unten, Hirte, Pflanzerin kniend – bis dahin normale Figuren.
- 2026-10-31, Epochia Version 39 – Forschung: Restzeit auf der Karte im Baum läuft jetzt mit (auch „Läuft … noch“ rechts), doppelte Zeitanzeige oben entfernt.
- 2026-10-31, Epochia Version 38 – Übers-Wasser-Laufen auch bei Mammutjägern (Wegsuche, Herde nur zu Fuß erreichbar), Besuchern am Feuer/Ahnenplatz und fliehenden Mammuts behoben.
- 2026-10-31, Epochia Version 37 – iPhone: Ressourcen-Leiste und Wissen-Anzeige flattern nicht mehr (nur Zahlen werden getauscht, Bilder bleiben stehen; auch Bauleiste).
- 2026-10-31, Epochia Version 36 – Rückansicht Feuerplatz (Canva).
- 2026-10-31, Epochia Version 35 – Rückansichten (Canva) für Wohnhöhle, Fellzelt, Grubenhaus, Langhaus, Sammlerin, Jägerlager,
  Mammutjägerlager, Holzsammler, Steinsammler, Höhlenmaler: Mit ↻ gibt es jetzt vier Richtungen (vorne, gespiegelt, Rückseite,
  Rückseite gespiegelt).
- 2026-10-31, Epochia Version 34 – Sammlerin bückt sich beim Pflücken zum Busch (Canva-Bild mit Korb).
- 2026-10-31, Epochia Version 33 – Steinsammler und Tongrube halten die Spitzhacke richtig in den Händen (ausholen und zuschlagen, Canva).
- 2026-10-31, Epochia Version 32 – Fehler: Arbeiter liefen übers Wasser – jetzt suchen sie sich einen Fußweg über Land, Pfade und
  Brücken (nie durchs Wasser oder Gebirge); ist ein Baum nur übers Wasser erreichbar, nehmen sie einen anderen.
- 2026-10-31, Epochia Version 32 – Holzfäller halten die Axt richtig in den Händen (zwei Canva-Haltungen: ausholen und zuschlagen).
- 2026-10-31, Epochia Version 31 – Fehler: Frauen liefen rückwärts (Bild beim Einbauen falsch gespiegelt) – behoben.
- 2026-10-31, Epochia Version 30 – Fehlt einem Gebäude eine Ware, zeigt die Blase das Warenbild mit rotem „!“ (statt eines
  Emojis), und die Info sagt, was fehlt und woher es kommt (z. B. „Es fehlt Felle – kommt von: Jägerlager, Mammutjagd“).
- 2026-10-31, Epochia Version 30 – Menschenbilder (Canva): Jäger laufen mit Speer, Steinsammler tragen den Stein nur auf dem Rückweg,
  am Ahnenplatz/Steinkreis kniet man zum Beten.
- 2026-10-31, Epochia Version 29 – Kleine Gebäude-Info: „Antippen für mehr“ war schwer zu treffen (man traf Pause) – jetzt zwei
  gleich große Knöpfe mit Abstand: „⏸ Pause“ und „ℹ️ Mehr“.
- 2026-10-31, Epochia Version 28 – Ruckeln am iPhone: Läuft das Spiel unter etwa 45 Bildern pro Sekunde, zeichnet es automatisch mit
  weniger Bildpunkten (bei feinen Handy-Bildschirmen kaum sichtbar); läuft es lange flüssig, wird es wieder feiner. Erd-Muster
  der Gebäudesockel wird nur noch einmal je Bild erzeugt (vorher für jedes Gebäude).
- 2026-10-31, Epochia Version 27 – Wissen gedrosselt: Höhlenmaler machen halb so viel Wissen, Wissen hat einen eigenen Speicher
  (2 × teuerste Forschung des Zeitalters, z. B. 450 in der Jungsteinzeit) statt sich endlos anzuhäufen. Bot: Wissen am Ende 450
  statt 15.000–17.000, Zeiten gleich (Mittelsteinzeit ≈ 105 min, Jungsteinzeit ≈ 270 min, kein Hunger).
- 2026-10-31, Epochia Version 27 – Menschenbilder (Canva): Leute am Feuer sitzen jetzt richtig im Schneidersitz (kein grauer Fleck);
  Spaziergänger und Arbeiter auf dem Hinweg haben leere Hände – Holz bzw. Beerenkorb trägt nur, wer sie wirklich heimbringt.
- 2026-10-31, Epochia Version 26 – Winterbilder (Canva) für alle neuen Dreh-Ansichten von Fischerplatz, Tongrube, Pfahlbau und für
  die Pflanzerin.
- 2026-10-31, Epochia Version 25 – Kleidung und Glaube zählen erst als Bedürfnis, wenn ihr Gebäude freigeschaltet ist (keine
  schlechte Laune mehr zu Beginn der Mittelsteinzeit); Forschung 1,5-mal statt doppelt so lang (Steinzeit ≈ 8 h).
  Bot: Mittelsteinzeit ≈ 100 min, Jungsteinzeit ≈ 260–290 min, kein Hunger.
- 2026-10-31, Epochia Version 24 – Ergebnisse der Test-Agenten behoben:
  - **Fehler: Jungsteinzeit war nicht erforschbar** (kostete 180 Wissen, Lager fasste nur 150). Wissen hat jetzt kein Lagerlimit.
  - Zuzug alle 45 statt 15 Sekunden, Lager 200 statt 150, Land kostet Holz + Stein statt Nahrung (keine Hunger-Sackgasse mehr).
    Bot (5 Läufe): Mittelsteinzeit 126–138 min, Jungsteinzeit 340–352 min, Hunger 0–10 min (vorher bis 264 min).
  - Beim Bauen den Baum/Felsen unter dem geplanten Gebäude antippen fällt ihn (wie die Meldung sagt).
  - Pfad schräg ziehen ergibt einen zusammenhängenden Weg; wird nichts gebaut, kommt ein Hinweis.
  - Setzlinge: Pfade dürfen darüber, antippen = ausreißen; gepflanzter Baum auf altem Felsen bleibt nach dem Laden ein Baum.
  - Zurück-Taste: keine toten Einträge mehr, kein versehentliches Verlassen der App.
  - Offline: Katastrophen und neue Zeitalter stehen in „Willkommen zurück“ (statt sofort überdeckt); Nachrechnen schneller.
  - Einstieg: 10 Wissen zum Start, „Feuer hüten“ (günstigste Forschung) ist vorausgewählt, Hinweis auf den Weg beim Höhlenmaler;
    Dreh-Hinweis hochkant nicht mehr über dem Ältesten; Waren-Fenster nennt nur Wetter, das diese Ware betrifft.
- 2026-10-31, Epochia Version 23 – Bäume werden echt gefällt: Hat ein Holzsammler 20 Holz beisammen, kippt der nächste Baum
  im Umkreis um und verschwindet (Krachen). Ohne Wald sammelt er nur noch Fallholz. Neues Gebäude **Pflanzerin** (Altsteinzeit,
  Bild aus Canva) setzt jede Minute einen Setzling, nach 10 Minuten (im Winter langsamer) ist ein Baum daraus gewachsen.
  In späteren Zeitaltern kommt dafür der Förster.
- 2026-10-31, Epochia Version 23 – Gebäude 4× drehen (↻): Fischerplatz, Tongrube und Pfahlbau haben neue Ansichten aus Canva
  (Wasser hinten, rechts, vorne, links) und drehen sich beim Platzieren von selbst zum Fluss. Andere Gebäude: vorne,
  gespiegelt (weitere Ansichten folgen).
- 2026-10-31, Epochia Version 22 – Emins Liste vom 31.10. (Teil 1):
  - Wetter wirkt: Sonne +15 % Sammlerinnen/Äcker, Regen hilft Äckern und bremst Jäger, Hagel zerschlägt die Ernte, Schnee
    macht hungrig; neu **Gewitter** (Blitze, Donner, draußen −40 %, kein Zuzug) und **Sturm** (Bäume biegen sich, Fischer
    bleiben an Land, Windbruch +20 % Holz). Alles steht im Wetter-Fenster oben rechts.
  - Tag + Nacht dauern jetzt 30 Minuten, jede Jahreszeit 30 Minuten (Jahr = 2 Stunden), Wetter hält 6 Minuten.
  - **Naturkatastrophen** (sehr selten, etwa alle 3 Spielstunden, nie in der ersten Dreiviertelstunde): Dürre, Hochwasser,
    Waldbrand (Bäume verbrennen), Kältewelle, Fieber – mit Meldung, Färbung der Karte und Restzeit.
  - Wissen hat überall dasselbe Bild (Leiste, Forschungsfenster, Sprechblasen über den Gebäuden).
  - Fehler: Baum/Felsen direkt neben einem Gebäude ließ sich nicht antippen – jetzt wird pixelgenau am Gebäudebild geprüft.
  - Bauleiste zeigt nur Gebäude des eigenen Zeitalters; Gesperrtes nennt die nötige Forschung und öffnet sie beim Antippen.
  - Zurück-Knopf und Zurück-Geste: Menü → Spielstände → Zurück führt ins Menü; Dialoge schließen zuerst.
  - Langsamer: Forschung doppelt so lang und +50 % Wissenskosten, Höhlenmaler −30 % Wissen, Holz/Stein/Ton/Felle −20 %,
    Bauzeiten +50 % (Regler `CONFIG.tempo` in `neu/js/daten.js`). Bot: Mittelsteinzeit nach ≈ 2,5–3 Stunden.
  - Treffpunkte: Leute sitzen am Feuer, tanzen abends ums Feuer, beten am Ahnenplatz/Steinkreis.
  - Geräusche: jedes Gebäude klingt beim Antippen anders (Feuer knistert, Axt, Ziege, Horn …), dazu Bauen, Fertig,
    Forschung, Belohnung, Donner (mit Code erzeugt, abschaltbar im Menü).
  - Infos zum Selbst-Abrufen: Gebäude-Fenster „ℹ️ Was bewirkt das genau?“ (Umkreis, Bedürfnis, Rechnung der Produktion);
    Waren oben antippen = Einnahmen und Ausgaben je Gebäude; Einwohner, Zufriedenheit und Wetter ebenso.
  - iPhone: Drehen verzerrt nichts mehr; hochkant kommt ein Hinweis, das Handy quer zu halten.
  - Knopf 📐 Grundriss: Gebäude nur als flache Platten, um Wege dahinter zu bauen.
- 2026-10-31, Epochia Version 22 – Bot und Tests: Der Bot hing mit der großen Karte über eine Stunde – jetzt 20 Sekunden.
- 2026-10-31, Epochia Version 22 – Arbeitende Menschen (Teil 2): Fischer stechen am Ufer mit dem Speer (es spritzt), der
  zweite paddelt im Einbaum (Bild aus Canva) hinaus; Höhlenmaler tupfen Farbe an die Felsen und bringen Wissen heim; die
  Tongrube gräbt am Ufer und trägt Ton; Fellmacherin schabt ein Fell, Steinschläger schlägt Splitter, Töpferin formt einen
  wachsenden Topf – jeweils direkt vor ihrem Haus.
- 2026-10-31, Epochia Version 22 – Fehler: Bei Spielbeginn im Frühling zeigten manche Gebäude kurz das Winterbild.
- 2026-10-31, Epochia Version 22 – Karte viermal so groß (128 × 128 Felder); alte Spielstände liegen mit allen Gebäuden, Land
  und Wegen genau in der Mitte, das Gelände dort bleibt Feld für Feld gleich.
- 2026-10-31, Epochia Version 22 – Gebirge: zwei Bergketten in den Ecken der neuen Karte mit Vorbergen aus Felsen; Bilder aus
  Canva (großer Schneegipfel, Felsberg, Gebirgsboden). Gebirge kann man nicht bebauen und nicht abtragen.
- 2026-10-31, Epochia Version 21 – Arbeitende Menschen (Teil 1): Holzsammler gehen zu Bäumen und hacken mit der Axt (Späne
  fliegen), Steinsammler schlagen mit der Spitzhacke am Felsen (Splitter), Sammlerinnen pflücken Beeren, Jäger ziehen in den
  Wald; alle tragen die Beute (Holz, Stein, Nahrung) zurück. So viele Figuren, wie dort arbeiten (höchstens 2 je Gebäude).
- 2026-10-30, Epochia Version 20 – Brücke: Pfade gehen nicht mehr aufs Wasser; malt man einen Pfad über den Fluss, entsteht dort
  automatisch eine Holzbrücke (8 Holz je Feld, Bild aus Canva, auch in der Bauleiste unter Wege). Auch „Weg bauen“ nutzt Brücken.
- 2026-10-30, Epochia Version 20 – Forschungsleiste mitten auf der Karte entfernt: Restzeit und Balken stehen am Forschung-Knopf.
- 2026-10-30, Epochia Version 20 – Flussufer schöner: runde, geschwungene Uferlinie statt Rauten, neue Ufer-Textur mit Kieseln
  und Strandgras (Canva), dunkler nasser Sand am Wasser, heller Schaumsaum, weicher Übergang zur Wiese.
- 2026-10-30, Epochia Version 20 – Offline werden höchstens 2 Stunden nachgerechnet (vorher 8).
- 2026-10-30, Epochia Version 20 – Wege zu Gebäuden: nur noch ein Zugang je Gebäude (an der Vorderseite, möglichst mittig)
  statt mehrerer Stummel.
- 2026-10-30, Epochia Version 19 – Trampelpfade schöner: neue Erd-Textur mit Steinchen (Canva), Pfade sind zusammenhängende,
  runde Wege mit dunklerem Rand und führen bis an die Gebäude (statt einzelner Sand-Rauten); im Winter leicht verschneit.
- 2026-10-30, Epochia Version 19 – Untere Leiste am Handy war zu hoch: Karten liegen quer, Kategorien als kleine Symbole links
  in der Leiste (etwa halb so hoch); Knopf ▾ klappt die Leiste ganz ein, „🔨 Bauen“ wieder auf (bleibt gespeichert).
- 2026-10-30, Epochia Version 18 – Update-Meldung: Ist eine neue Version online, erscheint oben „✨ Neue Version … ist da!“ mit
  Knopf „🔄 Jetzt aktualisieren“ (speichert und lädt neu); im Menü „🔄 Nach Updates suchen“.
- 2026-10-30, Epochia Version 18 – Forschungsfenster neu: Reiter je Zeitalter mit Fortschritt (z. B. 3/7), Karten in Spalten,
  Pfeile nur zwischen Nachbarspalten (nichts läuft mehr hinter Karten), Übergang als eigene Karte „braucht alle Forschungen“,
  Baum passt sich dem Bildschirm an; am Handy stehen die Infos rechts neben dem Baum.
- 2026-10-30, Epochia Version 18 – Leisten im Stil des Zeitalters (Canva): unten Holzstämme mit Seilbindung, oben Leder mit Naht.
- 2026-10-30, Epochia Version 18 – Winterbilder für alle 23 Gebäude aus Canva (Schnee auf Dächern und Platte, Eiszapfen,
  Feuer brennen weiter, Wasser am Rand gefroren); im Winter wechseln die Gebäude versetzt aufs verschneite Bild.
  Jahreszeiten-Bilder laden im Hintergrund nach, damit der Start nicht länger dauert.
- 2026-10-30, Epochia Version 17 – Tag und Nacht, Wetter und Jahreszeiten: Abendrot, dunkle Nacht mit leuchtenden Feuern;
  Sonne, Wolken (ziehende Schatten), Regen mit Spritzern, Hagel, Schnee – je nach Jahreszeit; Schneedecke im Winter,
  Herbstfarben und fallendes Laub, Blütenblätter im Frühling; Bäume aus Canva je Jahreszeit (Blüten, buntes Laub, kahl
  und verschneit). Oben rechts zeigt das Symbol Jahreszeit und Wetter, antippen nennt auch die Tageszeit. Bisher nur fürs
  Auge – keine Wirkung auf die Wirtschaft. Zeiten (Tag 160 s, Wetter 75 s) stehen in `CONFIG` und werden später angepasst.
- 2026-10-30, Epochia Version 16 – letzte Bilder aus Canva: Truhe (Belohnungs-Knopf und -Fenster), Schriftband aus Leder hinter
  den Seitentiteln, rundes Logo im Menü. Damit sind alle 80 Bild-Prompts erledigt.
- 2026-10-30, Epochia Version 15 – Mammutjagd: nach der Forschung „Mammutjagd“ ein Mammut antippen, die Jäger ziehen los und
  bringen nach 1 Minute Fleisch und Felle (mit Mammutjägerlager mehr); danach kommt nach ein paar Minuten die nächste Herde.
  Der Stammesälteste erklärt es beim ersten Mal. Ab der Jungsteinzeit sind die Mammuts ausgestorben.
- 2026-10-30, Epochia Version 14 – alle 24 Forschungen haben Bilder aus Canva.
- 2026-10-30, Epochia Version 13 – Gebäude entwickeln sich mit dem Zeitalter weiter (z. B. alle Wohnhöhlen werden Fellzelte),
  in der Leiste und auf dem Feld; gilt auch für alte Spielstände.
- 2026-10-30, Epochia Version 13 – Ränder der Gebäude passten nicht zusammen (mal Holz, mal Stein, mal nur Gras): alle haben
  jetzt denselben Erdsockel (Textur aus Canva).
- 2026-10-30, Epochia Version 13 – Baum antippen zeigt eine Axt, Felsen eine Spitzhacke; darauf tippen fällt bzw. trägt ab
  (mit Fallbewegung).
- 2026-10-30, Epochia Version 13 – Waren-Symbole aus Canva (statt Emojis), auch bei Kosten und Belohnungen.
- 2026-10-30, Epochia Version 12 – Zeitalter kamen viel zu schnell, man brauchte nur 3 Häuser: Forschungen dauern etwa fünfmal
  so lang, kosten mehr Wissen und Waren und brauchen eine Mindestzahl Einwohner (Steinzeit ≈ 6 Stunden, Bronzezeit-Aufbruch
  mit 120 Einwohnern); Landpreis bleibt unter dem Lagerplatz.
- 2026-10-30, Epochia Version 12 – Beine von Rehen & Co. bewegten sich nicht: Vorder- und Hinterbeine schwingen beim Laufen.
- 2026-10-30, Epochia Version 12 – Einwohnerzahl oben war nicht zu sehen: obere Leiste repariert, Seitenknöpfe rutschen darunter.
- 2026-10-30, Epochia Version 12 – Bauleiste mit Kategorien (Wohnen, Nahrung, Rohstoffe, Handwerk, Feuer & Glaube, Wege).
- 2026-10-30, Epochia Version 11 – mehr Leben: Menschen laufen auf den Trampelpfaden, Hirsche und eine Mammutherde ziehen
  umher, Ziegen grasen am Gehege, Fische springen, Vögel fliegen vorbei, Schmetterlinge über den Blumen (Bilder aus Canva).
- 2026-10-30, Epochia Version 10 – Forschung, Aufträge und Menü neu gestaltet (Epochen-Streifen und Banner, leuchtende
  Karten, Detailkarte; Auftragskarten mit Bild, Balken und Belohnung; Menü mit Kacheln und Schaltern);
  ⏸ Pause direkt in der kleinen Gebäude-Info.
- 2026-10-30, Epochia Version 9 – Sackgasse „Steinsammler ohne Personal, kein Stein für eine Wohnhöhle“: Gebäude lassen sich
  pausieren (⏸ im Gebäudefenster, die Leute arbeiten dann anderswo); der Stammesälteste erklärt, was hilft, wenn ein Gebäude
  ohne Arbeiter dasteht (auch: Felsen antippen gibt Stein).
- 2026-10-30, Epochia Version 8 – Leben im Bild: Wasser fließt und glitzert, Feuer flackert mit Funken, Rauch steigt aus
  Lagerfeuer, Feuerstellen, Langhaus und Töpferei, Bäume wiegen sich im Wind.
- 2026-10-30, Epochia Version 8 – Gebäude standen unterschiedlich hoch (verschieden dicke Sockel in den Bildern):
  jetzt haben alle dieselbe Sockelhöhe.
- 2026-10-30, Epochia Version 7 – Gelände und Wege als Bilder (Canva): Wiese, Wasser, Sand und Trampelpfad als Boden-Texturen,
  dazu Birke, Busch und Blumen.
- 2026-10-30, Epochia Version 6 – Gebäude standen schief, Wege sahen neben Gebäuden abgeschnitten aus bzw. hatten Lücken:
  Raster an den Blickwinkel der Bilder angepasst, jedes Bild wird an den Ecken seines Erdsockels genau auf die Felder gesetzt.
- 2026-10-30, Epochia Version 6 – Wege ließen sich nicht löschen: im Wege-Modus auf einen Weg tippen (oder darüber wischen) löscht ihn.
- 2026-10-30, Epochia Version 6 – neue Bilder aus Canva: Baustelle 3×3 und 4×4, Laubbaum, Tanne, große und kleine Felsen.
- 2026-10-27, Version 70 – Preisschilder der Landstücke überlappten weit herausgezoomt – jetzt passen sie in ihr Landstück.
- 2026-10-27, Version 69 – Design: neue Karten haben Flüsse.
- 2026-10-27, Version 71 – Gelände mit Emins Bildern: Gras, Wasser, Sand, Bäume je Jahreszeit, Berge, Büsche.
- 2026-10-27, Version 68 – Bauleiste (und Fenster) ließen sich am hochkant gehaltenen, gedrehten Handy nicht scrollen – behoben.
- 2026-10-26, Version 43 – Wunschliste aus der Sitzung:
  - Forschung, Aufträge, Einstellungen als ganze Seite mit „← Zurück“; alle Fenster haben „← Zurück“,
    auch die Zurück-Geste am Handy schließt Fenster statt das Spiel.
  - Bauleiste am Handy: passt ein Name nicht, zeigt die Reihe nur Bilder (Kosten in der Kurzinfo).
  - Gebäude erst als Vorschau aufs Feld stellen (grün = passt, rot = passt nicht, mit dem Finger verschiebbar),
    gebaut wird erst mit ✔.
  - Bauzeit für alle Gebäude (Straßen, Brücken, Mauern sofort), Baustelle mit Gerüst und Restzeit.
  - Höchstens 2 Baustellen gleichzeitig (VIP-Modus mit mehr Baustellen steht als Plan in `vorschlaege.md`).
  - Karte 96 × 96 statt 64 × 64 (alte Städte liegen in der Mitte, gekauftes Land bleibt).
  - Menschen als kleine Figuren: Bauern hacken, Fischer angeln, Sägewerker sägen, Steinbrecher schlagen,
    Schmiede hämmern, Gelehrte lesen, Händler tragen Kisten.
  - Eigene Geräusche beim Antippen von Gebäuden (Säge, Amboss, Schaf, Glocke …), selbst erzeugt.
  - Raster nur noch beim Bauen/Verschieben sichtbar.
  - Offen: neue Gebäudebilder je Zeitalter – wartet auf Bilder von Emin (Ordner `bilder/`).
- 2026-10-26, Version 44 – 5 Zeitalter (Plan in `docs/zeitalter.md`): neue Städte starten in der Steinzeit
  (nur Holz, Stein, Nahrung; Hütte, Sammlerin, Jägerlager, Holzfäller, Steinsammler, Feuerstelle), Aufstieg
  zur Antike und zum Mittelalter über das Zeitalter-Fenster (oben antippen). Industrie und Moderne folgen.
- 2026-10-26, Version 46–49 – obere und untere Leiste in Holz/Pergament; Steinzeit schwerer; Forschung schon in der
  Steinzeit (Höhlenmaler, 4 Forschungen); Wassertrog löscht Brände und wird in der Antike zur Feuerwache;
  Seuchen erst ab der Antike; gesperrte Gebäude mit 🔒.
- 2026-10-26, Version 50–51 – Gebäudebilder aus Canva (Farm, Hütte, Sammlerin, Jägerlager, Kohlebergwerk, Stahlwerk,
  Fabrik, Mietshaus, Bahnhof, Polizeiwache, Uhrturm, Kraftwerk); Zeitalter Industrie und Moderne mit 6 neuen Waren,
  16 neuen Gebäuden, 5 Forschungen und 13 Aufträgen (Plan: `docs/zeitalter.md`).
- 2026-10-27, Version 52–54 – zweite Wunschliste (mit Bildern):
  - Bauleiste unten sprang beim Scrollen jede Sekunde zurück – behoben.
  - Querformat: flache Leiste oben, Bauleiste als Spalte rechts; hochkant erscheint „Handy drehen“ (Knopf für Vollbild quer).
  - Zwei-Finger-Zoom auf den Leisten vergrößert nicht mehr die Seite.
  - Sägewerk macht aus Holz Bretter (braucht Holz vom Holzfäller, sonst steht es still); die Schreinerei war doppelt und wird zum Sägewerk.
  - Zeitalter-Aufbruch oben in der Forschung: alle Forschungen des Zeitalters, jedes Gebäude einmal gebaut, genug Einwohner;
    der Aufbruch dauert 1:30–5 Min., Waren werden nach und nach geliefert (kein „99/100“-Problem mehr).
  - Gebäude weiterentwickeln im Info-Fenster (Hütte → Haus → Mietshaus → Hochhaus, Sammlerin → Farm, Steinsammler → Steinbruch …).
  - Mauer mit Funktion: Banditen müssen sie erst aufbrechen, Wachen wehren sie dort ab; neues Tor – zieht man eine Straße über
    die Mauer, entsteht automatisch ein Tor.
  - Straßen je Zeitalter: Trampelpfad, Pflaster, Asphalt mit Mittelstreifen; jedes Gebäude hat eine Tür, ein Weg führt zur Straße.
  - Langsamer: Forschung dauert doppelt so lange, Farm/Steinbruch/Steinsammler/Fischerhütte liefern weniger.
- 2026-10-27, Version 55 – Tägliche Belohnung in der Steinzeit ohne Geld: statt Geld je zur Hälfte Holz und Nahrung.
- 2026-10-27, Version 59 – Zeitalter-Aufbruch läuft offline weiter; wird offline die letzte Forschung fertig, beginnt er von selbst,
  beim Zurückkommen wechselt das Zeitalter sofort mit Meldung.
- 2026-10-27, Version 60 – Rückmeldung: Weg zur Farm sitzt an der Bildspitze; Spiel startet immer quer (hochkant gehaltenes
  Handy zeigt es gedreht, abschaltbar in den Einstellungen); Antippen eines Gebäudes beendet die Bauauswahl (setzte sonst das
  alte Gebäude); Wassertrog wird per Weiterentwickeln zur Feuerwache 2×1; Knopf oben rechts blendet die Leisten aus und ein.
