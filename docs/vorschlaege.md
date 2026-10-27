# Vorschläge für neue Funktionen

Hier sammeln Claude (auch der tägliche Cloud-Agent) und Emin Ideen. **Neue Funktionen werden erst gebaut,
wenn Emin zugestimmt hat.** Neue Einträge oben, mit Datum und kurzer Begründung.

## Offen

- **VIP-Modus** (2026-10-26, Wunsch Emin – „dazu später“) – mehr als 2 Baustellen gleichzeitig. Offen: wie man
  VIP wird (Erfolg, Gründerruhm, Einstellung?). Technisch einfach: `CONFIG.maxConstructions` je nach VIP erhöhen.
- **Gebäudebilder aus KI-Bildern** (2026-10-26, Wunsch Emin) – Emin erzeugt Bilder im festen Stil; Claude baut
  sie ein (Bild statt Zeichnung, Zeichnung bleibt als Ersatz). Je Zeitalter eigene Bilder, sobald die Zeitalter
  entschieden sind. Formate: 1×1, 2×2, 3×3 quadratisch, 2×1 im Format 2:1.
- **Zeitalter** (2026-10-26, **von Emin entschieden** – in einer Sitzung mit Emin bauen):
  1 Steinzeit → 2 Antike → 3 Mittelalter → 4 Industrie → 5 Moderne. Neue Städte beginnen in der Steinzeit
  (Emin fängt komplett neu an). Aufstieg kostet Wissen, Geld und Waren; neues Aussehen (Bilder je Zeitalter in
  `bilder/`) und neue Gebäude je Zeitalter. Alte Spielstände müssen trotzdem weiter laden (CLAUDE.md).
- **Weitere Ideen zur Auswahl** (2026-10-25): schönere Straßen (Pflaster, Bordstein), mehr Leben (Kinder, Händler,
  Bewohner mit Namen/Wünschen), Handelsverträge mit Nachbarstädten, Statistik-Seite mit Diagrammen.


- **Mehr Inhalte fürs späte Spiel** (2026-10-25) – ab etwa 150 Einwohnern sammelt sich Geld an,
  ohne dass es etwas Sinnvolles zu kaufen gibt. Ideen: weitere Sehenswürdigkeiten, Handelsverträge,
  Stadtfeste, eine vierte Stufe „Großstadt“.
- **Strengere Straßenregel (optional)** (2026-10-25) – Gebäude arbeiten nur, wenn ihre Straße mit dem
  Rathaus/Stadtzentrum verbunden ist. Als Einstellung, damit es für Einsteiger leicht bleibt.
- **Isometrische Grafik** (2026-10-25) – schräge Ansicht statt Draufsicht; großer Umbau des Zeichencodes.
- **Benachrichtigungen** (2026-10-25) – z. B. „Lager voll“ oder „Banditen greifen an“, wenn das Spiel
  geschlossen ist. Braucht Push-Benachrichtigungen und einen Server.

- **Aus der Analyse vom 2026-10-27** (Entscheidung Emin):
  - Spätes Spiel: ab ~60 min Zufriedenheit 100 %, 20.000+ Geld, volle Lager – Großprojekte/Weltwunder je Zeitalter,
    Stadtfeste, höhere Ansprüche der Einwohner in späteren Zeitaltern.
  - Banditen: alle Überfälle werden abgewehrt – Lager mit dem Zeitalter stärker oder angekündigte Großangriffe.
  - Baustellen: „2 Baustellen“ ist der mit Abstand häufigste Engpass – dritte Baustelle als Forschung im Mittelalter?
  - Steinzeit: Minute 10–16 bei 27 Einwohnern nur Warten – Auftrag oder kleines Ereignis dazwischen.
  - Bauleiste: in der Steinzeit gesperrte Gebäude späterer Zeitalter ans Ende stellen oder nur das nächste Zeitalter zeigen.
  - Technik: `game.js` (> 9.000 Zeilen) irgendwann in Daten / Logik / Zeichnen aufteilen.

## Zurückgestellt

- **Cloud-Speicherung (Supabase)** – gleicher Spielstand auf Handy und Laptop. Emin: „Den lassen wir vorerst.“
  Bis dahin: Export/Import in den Einstellungen.

## Erledigt

- **Bot nutzt Geländeboni**, neue Handwerksketten, neue obere Leiste – Version 42 (2026-10-25).
- **Brücken und Fischerhütte** – von Emin gewünscht, eingebaut in Version 40 (2026-10-25).
