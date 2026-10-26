# Vorschläge für neue Funktionen

Hier sammeln Claude (auch der tägliche Cloud-Agent) und Emin Ideen. **Neue Funktionen werden erst gebaut,
wenn Emin zugestimmt hat.** Neue Einträge oben, mit Datum und kurzer Begründung.

## Offen

- **VIP-Modus** (2026-10-26, Wunsch Emin – „dazu später“) – mehr als 2 Baustellen gleichzeitig. Offen: wie man
  VIP wird (Erfolg, Gründerruhm, Einstellung?). Technisch einfach: `CONFIG.maxConstructions` je nach VIP erhöhen.
- **Gebäudebilder aus KI-Bildern** (2026-10-26, Wunsch Emin) – Emin erzeugt Bilder im festen Stil; Claude baut
  sie ein (Bild statt Zeichnung, Zeichnung bleibt als Ersatz). Je Zeitalter eigene Bilder, sobald die Zeitalter
  entschieden sind. Formate: 1×1, 2×2, 3×3 quadratisch, 2×1 im Format 2:1.
- **Zeitalter** (2026-10-26: **Emin hat 5 Zeitalter gewählt** – erst in einer Sitzung mit Emin bauen) – Vorschlag
  für die Reihenfolge: 1 Steinzeit → 2 Antike → 3 Mittelalter → 4 Industrie → 5 Moderne. Aufstieg kostet Wissen,
  Geld und Waren; neues Aussehen (Bilder je Zeitalter in `bilder/`) und neue Gebäude je Zeitalter.
  Offen: genaue Namen/Reihenfolge bestätigen, und ob bestehende Städte im Mittelalter (Zeitalter 3) einsteigen.
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

## Zurückgestellt

- **Cloud-Speicherung (Supabase)** – gleicher Spielstand auf Handy und Laptop. Emin: „Den lassen wir vorerst.“
  Bis dahin: Export/Import in den Einstellungen.

## Erledigt

- **Bot nutzt Geländeboni**, neue Handwerksketten, neue obere Leiste – Version 42 (2026-10-25).
- **Brücken und Fischerhütte** – von Emin gewünscht, eingebaut in Version 40 (2026-10-25).
