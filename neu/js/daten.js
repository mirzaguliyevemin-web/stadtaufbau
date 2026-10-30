'use strict';
// Epochia – alle Spieldaten (Zahlen zum Feinjustieren stehen hier oben, die Logik liest nur daraus).
// Pläne: docs/konzept-neu.md und docs/epoche-1-steinzeit.md

const APP_VERSION = 10;

const CONFIG = {
  mapSize: 64,            // Felder je Seite
  plotSize: 8,            // Landstück = 8 × 8 Felder
  startPlots: 4,          // in der Mitte gehören 4 × 4 Landstücke (32 × 32 Felder) von Anfang an dazu
  tileW: 64,              // Breite einer Raute in Bildpunkten (Zoom 1)
  tileH: 44,              // Höhe einer Raute – so flach wie die Grasplatten auf Emins Bildern (≈ 0,69 × Breite)
  maxConstructions: 2,    // höchstens so viele Baustellen gleichzeitig
  yearSeconds: 480,       // ein Jahr = 4 Jahreszeiten à 2 Minuten
  foodPerPerson: 0.4,     // Nahrung je Einwohner und Minute
  goodsPerPerson: 0.02,   // Kleidung / Töpferwaren je Einwohner und Minute (wenn das Bedürfnis zählt)
  growthSeconds: 15,      // so oft zieht jemand ein (wenn Platz, Nahrung und Laune passen)
  growthMinHappy: 50,     // ab dieser Zufriedenheit ziehen Leute zu
  baseStorage: 150,       // Lagerplatz je Ware am Lagerfeuer
  bonusRadius: 3,         // Umkreis für Geländebonus (Wald, Felsen)
  maxOfflineHours: 8,     // so lange läuft das Spiel offline weiter
  refundShare: 0.5,       // beim Abreißen gibt es die Hälfte zurück
  start: {
    resources: { nahrung: 40, holz: 50, stein: 40 },   // geplant waren 40/20 – reicht nicht für den Einstieg
    population: 6,
  },
};

// Waren
const RESOURCES = {
  nahrung:      { name: 'Nahrung',     icon: '🍖', bild: 'ware-nahrung' },
  holz:         { name: 'Holz',        icon: '🪵', bild: 'ware-holz' },
  stein:        { name: 'Stein',       icon: '🪨', bild: 'ware-stein' },
  wissen:       { name: 'Wissen',      icon: '💡', bild: 'ware-wissen' },
  felle:        { name: 'Felle',       icon: '🦌', bild: 'ware-felle',        from: 'alt' },
  kleidung:     { name: 'Kleidung',    icon: '🧥', bild: 'ware-kleidung',     from: 'mittel' },
  werkzeug:     { name: 'Werkzeug',    icon: '🗡️', bild: 'ware-werkzeug',     from: 'mittel' },
  ton:          { name: 'Ton',         icon: '🟤', bild: 'ware-ton',          from: 'jung' },
  toepferwaren: { name: 'Töpferwaren', icon: '🏺', bild: 'ware-toepferwaren', from: 'jung' },
};

// Stufen der Steinzeit (Unterteilungen = Abschnitte im Forschungsbaum)
const STAGES = [
  { id: 'alt',    name: 'Altsteinzeit',    epoch: 'Steinzeit' },
  { id: 'mittel', name: 'Mittelsteinzeit', epoch: 'Steinzeit' },
  { id: 'jung',   name: 'Jungsteinzeit',   epoch: 'Steinzeit' },
];

// Bedürfnisse der Einwohner. kind: 'stock' = Ware im Lager, 'area' = Gebäude im Umkreis der Wohnung
const NEEDS = [
  { id: 'nahrung',      name: 'Nahrung',              icon: '🍖', from: 'alt',    kind: 'stock' },
  { id: 'waerme',       name: 'Wärme und Gemeinschaft', icon: '🔥', from: 'alt',  kind: 'area' },
  { id: 'kleidung',     name: 'Kleidung',             icon: '🧥', from: 'mittel', kind: 'stock' },
  { id: 'glaube',       name: 'Glaube',               icon: '🗿', from: 'mittel', kind: 'area' },
  { id: 'toepferwaren', name: 'Töpferwaren',          icon: '🏺', from: 'jung',   kind: 'stock' },
];

const SEASONS = [
  { name: 'Frühling', icon: '🌱' },
  { name: 'Sommer',   icon: '☀️' },
  { name: 'Herbst',   icon: '🍂' },
  { name: 'Winter',   icon: '❄️' },
];

// Wie stark die Jahreszeit (Frühling, Sommer, Herbst, Winter) ein Gebäude beeinflusst
const SEASON_FACTORS = {
  sammlerin: [1, 1.2, 1, 0.4],
  acker:     [1, 1.5, 1, 0],
};

// Gelände. blocks = darauf kann man nicht bauen
const TERRAIN = {
  gras:   { id: 0, name: 'Wiese',  color: '#7ec850', blocks: false },
  wald:   { id: 1, name: 'Wald',   color: '#5fae45', blocks: true,  clear: { holz: 3 }, clearName: 'Baum fällen' },
  wasser: { id: 2, name: 'Wasser', color: '#4aa8e0', blocks: true },
  fels:   { id: 3, name: 'Felsen', color: '#8fb56a', blocks: true,  clear: { stein: 3 }, clearName: 'Felsen abtragen' },
  sand:   { id: 4, name: 'Sand',   color: '#e8d48a', blocks: false },
};
const TERRAIN_BY_ID = Object.values(TERRAIN).sort((a, b) => a.id - b.id);

// Gebäude. Jede Linie (line) entwickelt sich durch die Epochen weiter; die Bauleiste zeigt je Linie
// nur die neueste freigeschaltete Stufe. Raten (produces/consumes) gelten je Minute bei voller Besetzung.
// Gebäude-IDs nie umbenennen oder löschen (stehen in Spielständen).
const BUILDINGS = {
  lagerfeuer: {
    name: 'Lagerfeuer', icon: '🔥', size: 3, line: 'mitte', tier: 0, stage: 'alt', bild: '1-lagerfeuer',
    color: '#c9733a', buildable: false, storage: CONFIG.baseStorage, warmth: 7,
    info: 'Mittelpunkt des Lagers: Hier liegen alle Vorräte, das Feuer wärmt die Wohnungen im Umkreis.',
  },
  wohnhoehle: {
    name: 'Wohnhöhle', icon: '🪨', size: 2, line: 'wohnen', tier: 0, stage: 'alt', bild: '1-wohnhoehle',
    color: '#9a9184', cost: { stein: 10 }, time: 20, housing: 3, upgradeTo: 'fellzelt',
    info: 'Ein Felsüberhang mit Fellvorhang – Platz für 3 Menschen.',
  },
  fellzelt: {
    name: 'Fellzelt', icon: '⛺', size: 2, line: 'wohnen', tier: 1, stage: 'alt', bild: '1-fellzelt',
    color: '#b88a57', cost: { holz: 15, felle: 2 }, time: 30, housing: 4, requires: 'fellzelte', upgradeTo: 'grubenhaus',
    info: 'Zelt aus Stangen und Fellen – Platz für 4 Menschen.',
  },
  grubenhaus: {
    name: 'Grubenhaus', icon: '🏠', size: 2, line: 'wohnen', tier: 2, stage: 'mittel', bild: '1-grubenhaus',
    color: '#a07040', cost: { holz: 30, stein: 20 }, time: 60, housing: 6, requires: 'grubenhaus', upgradeTo: 'langhaus',
    info: 'Halb in den Boden gegraben, mit Schilfdach – Platz für 6 Menschen.',
  },
  langhaus: {
    name: 'Langhaus', icon: '🏡', size: 3, line: 'wohnen', tier: 3, stage: 'jung', bild: '1-langhaus',
    color: '#8d5a32', cost: { holz: 100, stein: 50, werkzeug: 10 }, time: 180, housing: 14, requires: 'langhausbau',
    info: 'Großes Haus aus Holz und Lehm – Platz für 14 Menschen.',
  },
  pfahlbau: {
    name: 'Pfahlbau', icon: '🏘️', size: 3, line: 'wasserwohnen', tier: 0, stage: 'jung', bild: '1-pfahlbau',
    color: '#7d6040', cost: { holz: 120, werkzeug: 10 }, time: 180, housing: 12, needsWater: true,
    produces: { nahrung: 2 }, requires: 'pfahlbauten',
    info: 'Häuser auf Pfählen am Wasser – Platz für 12 Menschen, dazu etwas Fisch.',
  },
  sammlerin: {
    name: 'Sammlerin', icon: '🫐', size: 2, line: 'sammeln', tier: 0, stage: 'alt', bild: '1-sammlerin',
    color: '#9c5ab8', cost: { holz: 10 }, time: 30, workers: 2, produces: { nahrung: 8 },
    bonus: { terrain: 'wald', perTile: 0.04, max: 0.5 },
    info: 'Sammelt Beeren, Pilze und Wurzeln. Am Wald mehr, im Winter wenig.',
  },
  jaegerlager: {
    name: 'Jägerlager', icon: '🏹', size: 3, line: 'jagen', tier: 0, stage: 'alt', bild: '1-jaegerlager',
    color: '#8a6a3a', cost: { holz: 20, stein: 10 }, time: 60, workers: 3, produces: { nahrung: 10, felle: 1 },
    bonus: { terrain: 'wald', perTile: 0.03, max: 0.5 }, upgradeTo: 'mammutjaegerlager',
    info: 'Jäger bringen Fleisch und ein paar Felle. Am Wald mehr.',
  },
  mammutjaegerlager: {
    name: 'Mammutjägerlager', icon: '🦣', size: 3, line: 'jagen', tier: 1, stage: 'alt', bild: '1-mammutjaegerlager',
    color: '#6f5030', cost: { holz: 60, stein: 40 }, time: 120, workers: 4, produces: { nahrung: 20, felle: 2 },
    bonus: { terrain: 'wald', perTile: 0.03, max: 0.5 }, requires: 'mammutjagd', upgradeOnly: true,
    info: 'Doppelt so viel Nahrung und Felle wie das Jägerlager.',
  },
  fischerplatz: {
    name: 'Fischerplatz', icon: '🎣', size: 2, line: 'fischen', tier: 0, stage: 'mittel', bild: '1-fischerplatz',
    color: '#4f86b0', cost: { holz: 30 }, time: 60, workers: 2, produces: { nahrung: 14 }, needsWater: true,
    requires: 'einbaum', info: 'Fischer im Einbaum – viel Nahrung. Muss am Wasser stehen.',
  },
  acker: {
    name: 'Acker', icon: '🌾', size: 3, line: 'feld', tier: 0, stage: 'jung', bild: '1-acker',
    color: '#d8b44a', cost: { holz: 40, werkzeug: 5 }, time: 90, workers: 3, produces: { nahrung: 30 },
    requires: 'ackerbau', info: 'Sehr viel Nahrung – im Sommer am meisten, im Winter nichts.',
  },
  ziegengehege: {
    name: 'Ziegengehege', icon: '🐐', size: 3, line: 'tiere', tier: 0, stage: 'jung', bild: '1-ziegengehege',
    color: '#c8b48a', cost: { holz: 60, werkzeug: 5 }, time: 120, workers: 2, produces: { nahrung: 10, felle: 2 },
    requires: 'viehzucht', info: 'Ziegen geben Milch, Fleisch und Felle – das ganze Jahr.',
  },
  holzsammler: {
    name: 'Holzsammler', icon: '🪓', size: 2, line: 'holz', tier: 0, stage: 'alt', bild: '1-holzsammler',
    color: '#7a5230', cost: { stein: 5 }, time: 30, workers: 2, produces: { holz: 8 },
    bonus: { terrain: 'wald', perTile: 0.04, max: 0.6 }, info: 'Sammelt Äste und Holz. Am Wald viel mehr.',
  },
  steinsammler: {
    name: 'Steinsammler', icon: '⛏️', size: 2, line: 'stein', tier: 0, stage: 'alt', bild: '1-steinsammler',
    color: '#8a8a8a', cost: { holz: 15 }, time: 30, workers: 2, produces: { stein: 6 },
    bonus: { terrain: 'fels', perTile: 0.06, max: 0.6 }, info: 'Sammelt Steine. An Felsen viel mehr.',
  },
  hoehlenmaler: {
    name: 'Höhlenmaler', icon: '🎨', size: 2, line: 'wissen', tier: 0, stage: 'alt', bild: '1-hoehlenmaler',
    color: '#c05a3a', cost: { holz: 15, stein: 15 }, time: 45, workers: 1, produces: { wissen: 4 },
    bonus: { terrain: 'fels', perTile: 0.05, max: 0.5 }, info: 'Malt Geschichten an Felswände – bringt Wissen für die Forschung.',
  },
  feuerplatz: {
    name: 'Feuerplatz', icon: '🔥', size: 2, line: 'waerme', tier: 0, stage: 'alt', bild: '1-feuerplatz',
    color: '#d0603a', cost: { holz: 15, stein: 10 }, time: 30, warmth: 5,
    info: 'Wärme und Gemeinschaft für Wohnungen im Umkreis.',
  },
  fellmacherin: {
    name: 'Fellmacherin', icon: '🧥', size: 2, line: 'kleidung', tier: 0, stage: 'mittel', bild: '1-fellmacherin',
    color: '#a8784a', cost: { holz: 40, stein: 20 }, time: 90, workers: 2, consumes: { felle: 4 }, produces: { kleidung: 2 },
    requires: 'fellbearbeitung', info: 'Näht aus 2 Fellen 1 Kleidung.',
  },
  steinschlaeger: {
    name: 'Steinschläger', icon: '🗡️', size: 2, line: 'werkzeug', tier: 0, stage: 'mittel', bild: '1-steinschlaeger',
    color: '#707880', cost: { holz: 30, stein: 40 }, time: 90, workers: 2, consumes: { stein: 2, holz: 1 }, produces: { werkzeug: 1 },
    requires: 'feine_klingen', info: 'Schlägt aus 2 Stein und 1 Holz 1 Werkzeug.',
  },
  ahnenplatz: {
    name: 'Ahnenplatz', icon: '🗿', size: 3, line: 'glaube', tier: 0, stage: 'mittel', bild: '1-ahnenplatz',
    color: '#8a7a6a', cost: { holz: 60, stein: 60 }, time: 120, belief: 8, requires: 'ahnenkult',
    info: 'Hier ehrt der Stamm die Ahnen – Glaube für Wohnungen im Umkreis.',
  },
  tongrube: {
    name: 'Tongrube', icon: '🟤', size: 2, line: 'ton', tier: 0, stage: 'jung', bild: '1-tongrube',
    color: '#a0603a', cost: { holz: 30, werkzeug: 3 }, time: 60, workers: 2, produces: { ton: 4 }, needsWater: true,
    requires: 'toepfern', info: 'Gräbt Ton am Ufer. Muss am Wasser stehen.',
  },
  toepferei: {
    name: 'Töpferei', icon: '🏺', size: 2, line: 'toepfern', tier: 0, stage: 'jung', bild: '1-toepferei',
    color: '#b8643a', cost: { holz: 50, stein: 40 }, time: 120, workers: 2, consumes: { ton: 2, holz: 1 }, produces: { toepferwaren: 1 },
    requires: 'toepfern', info: 'Formt und brennt aus 2 Ton und 1 Holz 1 Töpferware.',
  },
  vorratsspeicher: {
    name: 'Vorratsspeicher', icon: '🛖', size: 3, line: 'lager', tier: 0, stage: 'jung', bild: '1-vorratsspeicher',
    color: '#b09060', cost: { holz: 80, stein: 40 }, time: 120, storage: 150, requires: 'vorratshaltung',
    info: 'Mehr Lagerplatz für alle Waren.',
  },
  steinkreis: {
    name: 'Steinkreis', icon: '🪨', size: 4, line: 'wahrzeichen', tier: 0, stage: 'jung', bild: '1-steinkreis',
    color: '#9a9a9a', cost: { stein: 200, holz: 100, werkzeug: 20 }, time: 300, belief: 14, warmth: 14,
    requires: 'sternenkunde', info: 'Wahrzeichen der Steinzeit: Glaube und Wärme im großen Umkreis. Nötig für den Aufbruch.',
  },
  pfad: {
    name: 'Trampelpfad', icon: '🟫', size: 1, line: 'weg', tier: 0, stage: 'alt',
    color: '#b89a6a', cost: { holz: 1 }, time: 0, isPath: true,
    info: 'Verbindet die Gebäude mit dem Lagerfeuer – ohne Weg arbeitet ein Gebäude nicht.',
  },
};

// Forschungsbaum. col/row = Platz im Baum (Spalte von links, Reihe: 0–1 Nahrung, 2 Wohnen, 3 Handwerk, 4 Wissen)
// effect: unlock (Gebäude), bonus (Produktion +x je Gebäude), housing (+Plätze je Gebäude), warmth (+Umkreis), stage
const TECHS = {
  flechtkoerbe:   { name: 'Flechtkörbe',    icon: '🧺', stage: 'alt', col: 0, row: 0, requires: [], cost: { wissen: 8 }, time: 60, effect: { bonus: { sammlerin: 0.4 } }, bild: 'f-koerbe' },
  speerspitzen:   { name: 'Speerspitzen',   icon: '🗡️', stage: 'alt', col: 1, row: 1, requires: ['faustkeil'], cost: { wissen: 12 }, time: 75, effect: { bonus: { jaegerlager: 0.4, mammutjaegerlager: 0.4 } }, bild: 'f-speer' },
  mammutjagd:     { name: 'Mammutjagd',     icon: '🦣', stage: 'alt', col: 2, row: 1, requires: ['speerspitzen'], cost: { wissen: 20 }, time: 120, effect: {}, bild: 'f-mammutjagd' },
  fellzelte:      { name: 'Fellzelte',      icon: '⛺', stage: 'alt', col: 1, row: 2, requires: ['faustkeil'], cost: { wissen: 12 }, time: 75, effect: { housing: { fellzelt: 1 } }, bild: 'f-fellzelte' },
  faustkeil:      { name: 'Faustkeil',      icon: '🪨', stage: 'alt', col: 0, row: 3, requires: [], cost: { wissen: 8 }, time: 60, effect: { bonus: { holzsammler: 0.3, steinsammler: 0.3 } }, bild: 'f-faustkeil' },
  feuer_hueten:   { name: 'Feuer hüten',    icon: '🔥', stage: 'alt', col: 0, row: 4, requires: [], cost: { wissen: 5 }, time: 45, effect: { warmth: 2 }, bild: 'f-feuer' },
  hoehlenmalerei: { name: 'Höhlenmalerei',  icon: '🎨', stage: 'alt', col: 1, row: 4, requires: ['feuer_hueten'], cost: { wissen: 15 }, time: 90, effect: { bonus: { hoehlenmaler: 0.3 } }, bild: 'f-hoehlenmalerei' },
  mittelsteinzeit: {
    name: 'Mittelsteinzeit', icon: '➡️', stage: 'alt', col: 3, row: 2, transition: true,
    requires: ['flechtkoerbe', 'speerspitzen', 'fellzelte', 'faustkeil', 'feuer_hueten', 'hoehlenmalerei'],
    population: 15, cost: { wissen: 25, nahrung: 50 }, time: 120, effect: { stage: 'mittel' }, bild: 'f-mittelsteinzeit',
  },
  pfeil_bogen:     { name: 'Pfeil und Bogen', icon: '🏹', stage: 'mittel', col: 4, row: 0, requires: ['mittelsteinzeit'], cost: { wissen: 20 }, time: 90, effect: { bonus: { jaegerlager: 0.5, mammutjaegerlager: 0.5 } }, bild: 'f-bogen' },
  einbaum:         { name: 'Einbaum',         icon: '🛶', stage: 'mittel', col: 5, row: 0, requires: ['pfeil_bogen'], cost: { wissen: 25, holz: 30 }, time: 120, effect: {}, bild: 'f-einbaum' },
  fellbearbeitung: { name: 'Fellbearbeitung', icon: '🧥', stage: 'mittel', col: 5, row: 1, requires: ['pfeil_bogen', 'feine_klingen'], cost: { wissen: 25 }, time: 120, effect: {}, bild: 'f-fellbearbeitung' },
  grubenhaus:      { name: 'Grubenhaus',      icon: '🏠', stage: 'mittel', col: 4, row: 2, requires: ['mittelsteinzeit'], cost: { wissen: 25, holz: 30 }, time: 120, effect: {}, bild: 'f-grubenhaus' },
  feine_klingen:   { name: 'Feine Klingen',   icon: '🔪', stage: 'mittel', col: 4, row: 3, requires: ['mittelsteinzeit'], cost: { wissen: 20, stein: 20 }, time: 90, effect: {}, bild: 'f-klingen' },
  ahnenkult:       { name: 'Ahnenkult',       icon: '🗿', stage: 'mittel', col: 4, row: 4, requires: ['mittelsteinzeit'], cost: { wissen: 30 }, time: 120, effect: {}, bild: 'f-ahnenkult' },
  jungsteinzeit: {
    name: 'Jungsteinzeit', icon: '➡️', stage: 'mittel', col: 6, row: 2, transition: true,
    requires: ['pfeil_bogen', 'einbaum', 'feine_klingen', 'fellbearbeitung', 'grubenhaus', 'ahnenkult'],
    population: 30, cost: { wissen: 50, nahrung: 100, kleidung: 10 }, time: 180, effect: { stage: 'jung' }, bild: 'f-jungsteinzeit',
  },
  ackerbau:       { name: 'Ackerbau',       icon: '🌾', stage: 'jung', col: 7, row: 0, requires: ['jungsteinzeit'], cost: { wissen: 50 }, time: 120, effect: {}, bild: 'f-ackerbau' },
  sichel:         { name: 'Sichel',         icon: '🌙', stage: 'jung', col: 8, row: 0, requires: ['ackerbau'], cost: { wissen: 40, werkzeug: 10 }, time: 120, effect: { bonus: { acker: 0.4 } }, bild: 'f-sichel' },
  viehzucht:      { name: 'Viehzucht',      icon: '🐐', stage: 'jung', col: 8, row: 1, requires: ['ackerbau'], cost: { wissen: 60 }, time: 150, effect: {}, bild: 'f-viehzucht' },
  langhausbau:    { name: 'Langhausbau',    icon: '🏡', stage: 'jung', col: 7, row: 2, requires: ['jungsteinzeit'], cost: { wissen: 60, werkzeug: 10 }, time: 150, effect: {}, bild: 'f-langhaus' },
  pfahlbauten:    { name: 'Pfahlbauten',    icon: '🏘️', stage: 'jung', col: 8, row: 2, requires: ['langhausbau', 'einbaum'], cost: { wissen: 60, holz: 40 }, time: 150, effect: {}, bild: 'f-pfahlbauten' },
  toepfern:       { name: 'Töpfern',        icon: '🏺', stage: 'jung', col: 7, row: 3, requires: ['jungsteinzeit'], cost: { wissen: 50 }, time: 120, effect: {}, bild: 'f-toepfern' },
  vorratshaltung: { name: 'Vorratshaltung', icon: '🛖', stage: 'jung', col: 8, row: 3, requires: ['toepfern', 'langhausbau'], cost: { wissen: 60, toepferwaren: 10 }, time: 150, effect: { storage: 0.5 }, bild: 'f-vorrat' },
  sternenkunde:   { name: 'Sternenkunde',   icon: '✨', stage: 'jung', col: 8, row: 4, requires: ['ahnenkult', 'langhausbau'], cost: { wissen: 80 }, time: 180, effect: {}, bild: 'f-sterne' },
  kupferfund:     { name: 'Kupferfund',     icon: '🟠', stage: 'jung', col: 9, row: 2, requires: ['sichel', 'viehzucht', 'vorratshaltung', 'sternenkunde'], cost: { wissen: 100, werkzeug: 20 }, time: 180, effect: {}, bild: 'f-kupfer' },
};

// Ganz rechts im Baum: Aufbruch in die nächste Epoche (Bronzezeit wird in einem späteren Schritt gebaut)
const NEXT_EPOCH = {
  name: 'Aufbruch in die Bronzezeit', icon: '🏺', col: 10, row: 2,
  requires: Object.keys(TECHS), buildings: ['steinkreis'], population: 60,
  cost: { holz: 300, stein: 250, nahrung: 300, toepferwaren: 30, werkzeug: 30 }, available: false,
};

// Aufträge (der Reihe nach, höchstens 3 gleichzeitig sichtbar)
const QUESTS = [
  { id: 'q_sammlerin2', text: 'Baue 2 Sammlerinnen',     goal: { build: 'sammlerin', count: 2 }, reward: { holz: 20 } },
  { id: 'q_pop10',      text: 'Erreiche 10 Einwohner',   goal: { population: 10 }, reward: { nahrung: 30 } },
  { id: 'q_forschung1', text: 'Schließe eine Forschung ab', goal: { techs: 1 }, reward: { wissen: 10 } },
  { id: 'q_holz100',    text: 'Habe 100 Holz im Lager',  goal: { resource: 'holz', count: 100 }, reward: { stein: 30 } },
  { id: 'q_jaeger',     text: 'Baue ein Jägerlager',     goal: { build: 'jaegerlager', count: 1 }, reward: { nahrung: 40 } },
  { id: 'q_zelte3',     text: 'Baue 3 Fellzelte',        goal: { build: 'fellzelt', count: 3 }, reward: { holz: 40, felle: 4 } },
  { id: 'q_pop15',      text: 'Erreiche 15 Einwohner',   goal: { population: 15 }, reward: { wissen: 20 } },
  { id: 'q_mittel',     text: 'Erreiche die Mittelsteinzeit', goal: { tech: 'mittelsteinzeit' }, reward: { holz: 60, stein: 60 } },
  { id: 'q_fischer',    text: 'Baue einen Fischerplatz', goal: { build: 'fischerplatz', count: 1 }, reward: { nahrung: 60 } },
  { id: 'q_kleidung20', text: 'Habe 20 Kleidung im Lager', goal: { resource: 'kleidung', count: 20 }, reward: { wissen: 30 } },
  { id: 'q_pop30',      text: 'Erreiche 30 Einwohner',   goal: { population: 30 }, reward: { werkzeug: 10 } },
  { id: 'q_jung',       text: 'Erreiche die Jungsteinzeit', goal: { tech: 'jungsteinzeit' }, reward: { holz: 100, stein: 80 } },
  { id: 'q_acker2',     text: 'Baue 2 Äcker',            goal: { build: 'acker', count: 2 }, reward: { werkzeug: 10 } },
  { id: 'q_pop60',      text: 'Erreiche 60 Einwohner',   goal: { population: 60 }, reward: { toepferwaren: 10 } },
];

// Tägliche Belohnung: Tag 1–7 hintereinander (Tag 7 ist die große Truhe)
const DAILY_REWARDS = [
  { nahrung: 20, holz: 20 },
  { nahrung: 30, holz: 30 },
  { stein: 40, holz: 20 },
  { nahrung: 40, wissen: 10 },
  { holz: 50, stein: 30 },
  { nahrung: 50, wissen: 15 },
  { holz: 100, stein: 80, nahrung: 100, wissen: 30 },
];

// Einstieg mit dem Stammesältesten. done = Bedingung, ab der der nächste Schritt kommt (siehe einstieg.js)
const TUTORIAL = [
  { id: 'willkommen', text: 'Willkommen! Unser Stamm sucht eine neue Heimat – und hier am Fluss ist es schön. Verschiebe die Karte mit dem Finger, zoome mit zwei Fingern.', button: 'Los geht’s' },
  { id: 'sammlerin', text: 'Wir brauchen Nahrung. Zieh die Sammlerin aus der Leiste unten auf einen freien Platz und tippe ✔.', target: 'bar:sammlerin' },
  { id: 'pfad', text: 'Jedes Gebäude braucht einen Trampelpfad zum Lagerfeuer. Wähle 🟫 Trampelpfad und zieh mit dem Finger vom Feuer zur Sammlerin – oder tippe die Sammlerin an und dann auf „Weg bauen“.', target: 'bar:pfad' },
  { id: 'antippen', text: 'Jetzt wird gebaut – höchstens 2 Baustellen gleichzeitig. Ist die Sammlerin fertig, tippe sie einmal an.' },
  { id: 'holzsammler', text: 'Gut gemacht! Nun Holz: Baue einen Holzsammler – am Wald sammelt er viel mehr.', target: 'bar:holzsammler' },
  { id: 'hochheben', text: 'Halte ein fertiges Gebäude gedrückt: Es hebt sich hoch. Dann kannst du es verschieben und mit ↻ drehen.' },
  { id: 'wohnhoehle', text: 'Mehr Menschen brauchen Platz. Baue eine Wohnhöhle mit Weg zum Feuer – nah am Feuer haben sie es warm.', target: 'bar:wohnhoehle' },
  { id: 'forschung', text: 'Wissen bringt uns weiter. Baue einen Höhlenmaler, öffne dann die Forschung 📜 und starte die erste Forschung.', target: 'bar:hoehlenmaler' },
  { id: 'auftraege', text: 'Zum Schluss: Unter 📋 Aufträge findest du Aufgaben mit Belohnung. Schau mal hinein!', target: 'btn-quests' },
  { id: 'fertig', text: 'Jetzt gehört das Lager dir! Ich bin da, wenn es Neues gibt.', button: 'Danke!' },
];

const LOADING_SAYINGS = [
  'Die ersten Menschen entfachen ein Feuer …',
  'Die Sammlerinnen füllen ihre Körbe …',
  'Am Fluss ziehen Mammuts vorbei …',
  'Der Stammesälteste erzählt von früher …',
];
