'use strict';
// Epochia – alle Spieldaten (Zahlen zum Feinjustieren stehen hier oben, die Logik liest nur daraus).
// Pläne: docs/konzept-neu.md und docs/epoche-1-steinzeit.md

const APP_VERSION = 24;

const CONFIG = {
  mapSize: 128,           // Felder je Seite (bis Version 21: 64 – alte Karten liegen jetzt in der Mitte)
  plotSize: 8,            // Landstück = 8 × 8 Felder
  startPlots: 4,          // in der Mitte gehören 4 × 4 Landstücke (32 × 32 Felder) von Anfang an dazu
  tileW: 64,              // Breite einer Raute in Bildpunkten (Zoom 1)
  tileH: 44,              // Höhe einer Raute – so flach wie die Grasplatten auf Emins Bildern (≈ 0,69 × Breite)
  maxConstructions: 2,    // höchstens so viele Baustellen gleichzeitig
  yearSeconds: 7200,      // ein Jahr = 4 Jahreszeiten à 30 Minuten (Emin, 31.10.; bis Version 22: 2 Minuten)
  daySeconds: 1800,       // ein Tag mit Nacht dauert 30 Minuten (bis Version 22: 160 Sekunden)
  weatherSeconds: 360,    // so lange hält ein Wetter an (6 Minuten), dann wird neu ausgewürfelt
  foodPerPerson: 0.4,     // Nahrung je Einwohner und Minute
  goodsPerPerson: 0.02,   // Kleidung / Töpferwaren je Einwohner und Minute (wenn das Bedürfnis zählt)
  growthSeconds: 45,      // so oft zieht jemand ein (seit Version 24: 45 s statt 15 s – sonst Hunger und zu große Stämme)
  growthMinHappy: 50,     // ab dieser Zufriedenheit ziehen Leute zu
  baseStorage: 200,       // Lagerplatz je Ware am Lagerfeuer (seit Version 24: 200, damit der lange Winter zu überstehen ist)
  bonusRadius: 3,         // Umkreis für Geländebonus (Wald, Felsen)
  maxOfflineHours: 2,     // so lange läuft das Spiel offline weiter (Emin: höchstens 2 Stunden)
  refundShare: 0.5,       // beim Abreißen gibt es die Hälfte zurück
  trees: {                // Bäume fällen und nachpflanzen (Emin, 31.10.)
    woodPerTree: 20,      // so viel Holz bringt ein Baum – dann fällt ihn der Holzsammler (im Umkreis treeRadius)
    treeRadius: 6,
    plantSeconds: 60,     // so oft setzt eine Pflanzerin (voll besetzt) einen Setzling
    plantRadius: 4,       // Umkreis um die Pflanzerin
    growSeconds: 600,     // nach 10 Minuten ist aus dem Setzling ein Baum geworden
  },
  disaster: {             // Naturkatastrophen (DISASTERS)
    perHour: 0.35,        // so oft im Schnitt je Spielstunde (also etwa alle 3 Stunden eine)
    graceMinutes: 45,     // in den ersten 45 Spielminuten nie
    pauseMinutes: 60,     // nach einer Katastrophe mindestens 1 Stunde Ruhe
  },
  hunt: {                 // Mammutjagd (nach der Forschung „Mammutjagd“, bis zur Jungsteinzeit)
    seconds: 60,          // so lange sind die Jäger unterwegs
    herdWait: 240,        // so lange dauert es nach einer Jagd, bis wieder eine Herde vorbeizieht
    reward: { nahrung: 60, felle: 6 },
    bigFactor: 1.5,       // mit einem Mammutjägerlager gibt es mehr
  },
  // Tempo-Regler (Emin, 31.10.: „Forschung, Rohstoffe und Bauen viel zu schnell“ → etwa doppelt so langsam).
  // Werden unten einmal auf BUILDINGS und TECHS angewendet; die Zahlen dort sind die Grundwerte.
  tempo: {
    researchTime: 2,      // Forschungen dauern doppelt so lang
    knowledgeCost: 1.5,   // und kosten 50 % mehr Wissen
    knowledgeMade: 0.7,   // Höhlenmaler & Co. machen 30 % weniger Wissen
    buildTime: 1.5,       // Bauzeiten +50 %
    rawMade: 0.8,         // Holz, Stein, Ton, Felle: 20 % weniger
    foodMade: 1,          // Nahrung bleibt (der Winter dauert jetzt 30 Minuten – mehr Abzug hieße Hungersnot)
  },
  start: {
    resources: { nahrung: 40, holz: 50, stein: 40, wissen: 10 },   // geplant waren 40/20 – reicht nicht für den Einstieg; Wissen: erste Forschung schneller
    population: 6,
  },
};

// Waren
const RESOURCES = {
  nahrung:      { name: 'Nahrung',     icon: '🍖', bild: 'ware-nahrung' },
  holz:         { name: 'Holz',        icon: '🪵', bild: 'ware-holz' },
  stein:        { name: 'Stein',       icon: '🪨', bild: 'ware-stein' },
  wissen:       { name: 'Wissen',      icon: '💡', bild: 'ware-wissen', noCap: true },   // kein Lagerlimit (Forschungen kosten mehr als 150)
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

// Wetter je Jahreszeit (Frühling, Sommer, Herbst, Winter): Wahrscheinlichkeiten (je Spalte zusammen 1).
// effect: wirkt, solange das Wetter anhält – Faktor je Gebäude (fehlt es: 1), Zufriedenheit (Punkte),
// food = Faktor für den Nahrungsverbrauch, grow = ziehen neue Leute zu? Gebäude mit outdoor = arbeiten draußen.
const WEATHERS = {
  klar:     { name: 'Sonnig',   icon: '☀️', chance: [0.38, 0.52, 0.24, 0.30],
              effect: { buildings: { sammlerin: 1.15, acker: 1.15, ziegengehege: 1.1 }, happy: 5, text: 'Sammlerinnen und Äcker +15 %, gute Laune' } },
  wolkig:   { name: 'Wolkig',   icon: '☁️', chance: [0.20, 0.13, 0.26, 0.20], effect: { text: 'keine Wirkung' } },
  regen:    { name: 'Regen',    icon: '🌧️', chance: [0.28, 0.12, 0.32, 0],
              effect: { buildings: { acker: 1.2, sammlerin: 0.9, jaegerlager: 0.8, mammutjaegerlager: 0.8, holzsammler: 0.9, steinsammler: 0.9, tongrube: 1.1 }, happy: -5,
                        text: 'Äcker +20 %, Jäger −20 %, draußen −10 %, Laune −5' } },
  hagel:    { name: 'Hagel',    icon: '🌨️', chance: [0.05, 0.07, 0, 0],
              effect: { buildings: { acker: 0.5, sammlerin: 0.6, ziegengehege: 0.8 }, happy: -10, text: 'Ernte zerschlagen: Äcker −50 %, Sammlerinnen −40 %, Laune −10' } },
  schnee:   { name: 'Schnee',   icon: '❄️', chance: [0, 0, 0, 0.42],
              effect: { buildings: { jaegerlager: 0.7, mammutjaegerlager: 0.7, holzsammler: 0.85, fischerplatz: 0.8 }, food: 1.25, happy: -5,
                        text: 'Kälte: Nahrungsverbrauch +25 %, Jäger −30 %, Laune −5' } },
  gewitter: { name: 'Gewitter', icon: '⛈️', chance: [0.05, 0.10, 0.06, 0],
              effect: { outdoor: 0.6, buildings: { fischerplatz: 0.4 }, happy: -10, grow: false,
                        text: 'Alle draußen −40 %, Fischer −60 %, niemand zieht zu, Laune −10' } },
  sturm:    { name: 'Sturm',    icon: '🌬️', chance: [0.04, 0.06, 0.12, 0.08],
              effect: { buildings: { fischerplatz: 0.3, acker: 0.8, holzsammler: 1.2, sammlerin: 0.8 }, happy: -5,
                        text: 'Fischer bleiben an Land (−70 %), Windbruch: Holz +20 %, Laune −5' } },
};

// Diese Gebäude arbeiten draußen (Gewitter trifft sie)
const OUTDOOR_WORK = ['sammlerin', 'jaegerlager', 'mammutjaegerlager', 'fischerplatz', 'acker', 'ziegengehege', 'holzsammler', 'steinsammler', 'tongrube'];

// Naturkatastrophen: sehr selten, aber heftig (Emin, 31.10.). seasons = in welchen Jahreszeiten (0–3) sie kommen können.
// buildings = Faktor auf die Arbeit, water = Gebäude am Wasser (needsWater) arbeiten mit diesem Faktor,
// workers = Anteil der Arbeiter, die noch arbeiten können, lose = Anteil der Vorräte, der verdirbt,
// burnTrees = so viele Bäume brennen ab, food = Nahrungsverbrauch, happy = Zufriedenheit, grow = Zuzug.
const DISASTERS = {
  duerre:      { name: 'Dürre',       icon: '🏜️', seasons: [1], minutes: 15,
                 buildings: { sammlerin: 0.3, acker: 0.2, ziegengehege: 0.5, fischerplatz: 0.6 }, happy: -10,
                 text: 'Kein Regen seit Wochen: Sammlerinnen −70 %, Äcker −80 %, Ziegen −50 %, Fischer −40 %.' },
  hochwasser:  { name: 'Hochwasser',  icon: '🌊', seasons: [0, 2], minutes: 10, water: 0, lose: { nahrung: 0.3 }, happy: -10,
                 text: 'Der Fluss tritt über die Ufer: Gebäude am Wasser stehen still, 30 % der Nahrung ist verdorben.' },
  waldbrand:   { name: 'Waldbrand',   icon: '🔥', seasons: [1, 2], minutes: 12, burnTrees: 30,
                 buildings: { holzsammler: 0.3, jaegerlager: 0.4, mammutjaegerlager: 0.4, sammlerin: 0.5 }, happy: -15,
                 text: 'Ein Blitz hat den Wald entzündet: viele Bäume verbrannt, Holz −70 %, Jäger −60 %, Sammlerinnen −50 %.' },
  kaeltewelle: { name: 'Kältewelle',  icon: '🥶', seasons: [3], minutes: 12, food: 2,
                 buildings: { jaegerlager: 0.5, mammutjaegerlager: 0.5, fischerplatz: 0.3, holzsammler: 0.6 }, happy: -20,
                 text: 'Eisige Kälte: doppelter Nahrungsverbrauch, Jäger −50 %, Fischer −70 %, Laune −20.' },
  fieber:      { name: 'Fieber',      icon: '🤒', seasons: [0, 1, 2, 3], minutes: 10, workers: 0.5, grow: false, happy: -15,
                 text: 'Ein Fieber geht um: nur die Hälfte kann arbeiten, niemand zieht zu, Laune −15.' },
};

// Wie stark die Jahreszeit (Frühling, Sommer, Herbst, Winter) ein Gebäude beeinflusst
const SEASON_FACTORS = {
  sammlerin: [1, 1.2, 1, 0.6],   // Winter 60 % (seit die Jahreszeit 30 min dauert; vorher 40 %)
  acker:     [1, 1.5, 1, 0],
};

// Gelände. blocks = darauf kann man nicht bauen
const TERRAIN = {
  gras:   { id: 0, name: 'Wiese',  color: '#7ec850', blocks: false },
  wald:   { id: 1, name: 'Wald',   color: '#5fae45', blocks: true,  clear: { holz: 3 }, clearName: 'Baum fällen' },
  wasser: { id: 2, name: 'Wasser', color: '#4aa8e0', blocks: true },
  fels:   { id: 3, name: 'Felsen', color: '#8fb56a', blocks: true,  clear: { stein: 3 }, clearName: 'Felsen abtragen' },
  sand:   { id: 4, name: 'Sand',   color: '#e8d48a', blocks: false },
  berg:   { id: 5, name: 'Gebirge', color: '#9a9488', blocks: true },
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
    name: 'Pfahlbau', icon: '🏘️', size: 3, line: 'wasserwohnen', tier: 0, stage: 'jung', bild: '1-pfahlbau', views: ['r1', 'r2'],
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
    name: 'Fischerplatz', icon: '🎣', size: 2, line: 'fischen', tier: 0, stage: 'mittel', bild: '1-fischerplatz', views: ['r1', 'r2'],
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
    bonus: { terrain: 'wald', perTile: 0.04, max: 0.6 }, fellsTrees: true,
    info: 'Fällt Bäume und sammelt Holz. Am Wald viel mehr – aber die Bäume werden weniger. Eine Pflanzerin setzt neue.',
  },
  pflanzerin: {
    name: 'Pflanzerin', icon: '🌱', size: 2, line: 'pflanzen', tier: 0, stage: 'alt', bild: '1-pflanzerin',
    color: '#6a9a3a', cost: { holz: 20, stein: 5 }, time: 40, workers: 1, plants: true,
    info: 'Sammelt Samen und pflanzt Setzlinge im Umkreis. Nach 10 Minuten ist daraus ein Baum gewachsen.',
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
    name: 'Tongrube', icon: '🟤', size: 2, line: 'ton', tier: 0, stage: 'jung', bild: '1-tongrube', views: ['r1', 'r2'],
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
  bruecke: {
    name: 'Brücke', icon: '🌉', size: 1, line: 'bruecke', tier: 0, stage: 'alt', bild: 'bruecke',
    color: '#8a5a2b', cost: { holz: 8 }, time: 0, isPath: true, onWater: true,
    info: 'Holzbrücke über den Fluss. Nur so kommt ein Weg ans andere Ufer. Einfach den Pfad übers Wasser malen.',
  },
};

// Forschungsbaum. col/row = Platz im Baum (Spalte von links, Reihe: 0–1 Nahrung, 2 Wohnen, 3 Handwerk, 4 Wissen)
// effect: unlock (Gebäude), bonus (Produktion +x je Gebäude), housing (+Plätze je Gebäude), warmth (+Umkreis), stage
const TECHS = {
  flechtkoerbe:   { name: 'Flechtkörbe',    icon: '🧺', stage: 'alt', col: 0, row: 0, requires: [], cost: { wissen: 20 }, time: 300, effect: { bonus: { sammlerin: 0.4 } }, bild: 'f-koerbe' },
  speerspitzen:   { name: 'Speerspitzen',   icon: '🗡️', stage: 'alt', col: 1, row: 1, requires: ['faustkeil'], population: 8, cost: { wissen: 30, holz: 20 }, time: 420, effect: { bonus: { jaegerlager: 0.4, mammutjaegerlager: 0.4 } }, bild: 'f-speer' },
  mammutjagd:     { name: 'Mammutjagd',     icon: '🦣', stage: 'alt', col: 2, row: 1, requires: ['speerspitzen'], population: 18, cost: { wissen: 50, nahrung: 60 }, time: 600, effect: {}, bild: 'f-mammutjagd' },
  fellzelte:      { name: 'Fellzelte',      icon: '⛺', stage: 'alt', col: 1, row: 2, requires: ['faustkeil'], population: 10, cost: { wissen: 30, felle: 5 }, time: 420, effect: { housing: { fellzelt: 1 } }, bild: 'f-fellzelte' },
  faustkeil:      { name: 'Faustkeil',      icon: '🪨', stage: 'alt', col: 0, row: 3, requires: [], cost: { wissen: 20 }, time: 300, effect: { bonus: { holzsammler: 0.3, steinsammler: 0.3 } }, bild: 'f-faustkeil' },
  feuer_hueten:   { name: 'Feuer hüten',    icon: '🔥', stage: 'alt', col: 0, row: 4, requires: [], cost: { wissen: 12 }, time: 240, effect: { warmth: 2 }, bild: 'f-feuer' },
  hoehlenmalerei: { name: 'Höhlenmalerei',  icon: '🎨', stage: 'alt', col: 1, row: 4, requires: ['feuer_hueten'], population: 10, cost: { wissen: 40 }, time: 480, effect: { bonus: { hoehlenmaler: 0.3 } }, bild: 'f-hoehlenmalerei' },
  mittelsteinzeit: {
    name: 'Mittelsteinzeit', icon: '➡️', stage: 'alt', col: 3, row: 2, transition: true,
    requires: ['flechtkoerbe', 'speerspitzen', 'fellzelte', 'faustkeil', 'feuer_hueten', 'hoehlenmalerei'],
    population: 25, cost: { wissen: 70, nahrung: 120, felle: 10 }, time: 1200, effect: { stage: 'mittel' }, bild: 'f-mittelsteinzeit',
  },
  pfeil_bogen:     { name: 'Pfeil und Bogen', icon: '🏹', stage: 'mittel', col: 4, row: 0, requires: ['mittelsteinzeit'], population: 28, cost: { wissen: 50, holz: 40 }, time: 600, effect: { bonus: { jaegerlager: 0.5, mammutjaegerlager: 0.5 } }, bild: 'f-bogen' },
  einbaum:         { name: 'Einbaum',         icon: '🛶', stage: 'mittel', col: 5, row: 0, requires: ['pfeil_bogen'], population: 40, cost: { wissen: 60, holz: 80 }, time: 720, effect: {}, bild: 'f-einbaum' },
  fellbearbeitung: { name: 'Fellbearbeitung', icon: '🧥', stage: 'mittel', col: 5, row: 1, requires: ['pfeil_bogen', 'feine_klingen'], population: 42, cost: { wissen: 60, felle: 20 }, time: 720, effect: {}, bild: 'f-fellbearbeitung' },
  grubenhaus:      { name: 'Grubenhaus',      icon: '🏠', stage: 'mittel', col: 4, row: 2, requires: ['mittelsteinzeit'], population: 30, cost: { wissen: 60, holz: 60 }, time: 660, effect: {}, bild: 'f-grubenhaus' },
  feine_klingen:   { name: 'Feine Klingen',   icon: '🔪', stage: 'mittel', col: 4, row: 3, requires: ['mittelsteinzeit'], population: 32, cost: { wissen: 50, stein: 50 }, time: 600, effect: {}, bild: 'f-klingen' },
  ahnenkult:       { name: 'Ahnenkult',       icon: '🗿', stage: 'mittel', col: 4, row: 4, requires: ['mittelsteinzeit'], population: 35, cost: { wissen: 75, nahrung: 80 }, time: 720, effect: {}, bild: 'f-ahnenkult' },
  jungsteinzeit: {
    name: 'Jungsteinzeit', icon: '➡️', stage: 'mittel', col: 6, row: 2, transition: true,
    requires: ['pfeil_bogen', 'einbaum', 'feine_klingen', 'fellbearbeitung', 'grubenhaus', 'ahnenkult'],
    population: 60, cost: { wissen: 120, nahrung: 150, kleidung: 20 }, time: 1800, effect: { stage: 'jung' }, bild: 'f-jungsteinzeit',
  },
  ackerbau:       { name: 'Ackerbau',       icon: '🌾', stage: 'jung', col: 7, row: 0, requires: ['jungsteinzeit'], population: 65, cost: { wissen: 110, nahrung: 100 }, time: 840, effect: {}, bild: 'f-ackerbau' },
  sichel:         { name: 'Sichel',         icon: '🌙', stage: 'jung', col: 8, row: 0, requires: ['ackerbau'], population: 75, cost: { wissen: 100, werkzeug: 20 }, time: 900, effect: { bonus: { acker: 0.4 } }, bild: 'f-sichel' },
  viehzucht:      { name: 'Viehzucht',      icon: '🐐', stage: 'jung', col: 8, row: 1, requires: ['ackerbau'], population: 80, cost: { wissen: 130, nahrung: 120 }, time: 960, effect: {}, bild: 'f-viehzucht' },
  langhausbau:    { name: 'Langhausbau',    icon: '🏡', stage: 'jung', col: 7, row: 2, requires: ['jungsteinzeit'], population: 70, cost: { wissen: 120, werkzeug: 15, holz: 80 }, time: 900, effect: {}, bild: 'f-langhaus' },
  pfahlbauten:    { name: 'Pfahlbauten',    icon: '🏘️', stage: 'jung', col: 8, row: 2, requires: ['langhausbau', 'einbaum'], population: 85, cost: { wissen: 130, holz: 100 }, time: 960, effect: {}, bild: 'f-pfahlbauten' },
  toepfern:       { name: 'Töpfern',        icon: '🏺', stage: 'jung', col: 7, row: 3, requires: ['jungsteinzeit'], population: 70, cost: { wissen: 110, stein: 60 }, time: 840, effect: {}, bild: 'f-toepfern' },
  vorratshaltung: { name: 'Vorratshaltung', icon: '🛖', stage: 'jung', col: 8, row: 3, requires: ['toepfern', 'langhausbau'], population: 90, cost: { wissen: 130, toepferwaren: 15 }, time: 960, effect: { storage: 0.5 }, bild: 'f-vorrat' },
  sternenkunde:   { name: 'Sternenkunde',   icon: '✨', stage: 'jung', col: 8, row: 4, requires: ['ahnenkult', 'langhausbau'], population: 100, cost: { wissen: 150, kleidung: 20 }, time: 1080, effect: {}, bild: 'f-sterne' },
  kupferfund:     { name: 'Kupferfund',     icon: '🟠', stage: 'jung', col: 9, row: 2, requires: ['sichel', 'viehzucht', 'vorratshaltung', 'sternenkunde'], population: 110, cost: { wissen: 150, werkzeug: 40, toepferwaren: 20 }, time: 2400, effect: {}, bild: 'f-kupfer' },
};

// Ganz rechts im Baum: Aufbruch in die nächste Epoche (Bronzezeit wird in einem späteren Schritt gebaut)
// Tempo-Regler anwenden (siehe CONFIG.tempo)
(function applyTempo(t) {
  const raw = ['holz', 'stein', 'ton', 'felle'];
  for (const def of Object.values(BUILDINGS)) {
    if (def.time) def.time = Math.round(def.time * t.buildTime);
    for (const id of Object.keys(def.produces || {})) {
      const f = id === 'wissen' ? t.knowledgeMade : id === 'nahrung' ? t.foodMade : raw.includes(id) ? t.rawMade : 1;
      def.produces[id] = Math.round(def.produces[id] * f * 10) / 10;
    }
  }
  for (const tech of Object.values(TECHS)) {
    tech.time = Math.round(tech.time * t.researchTime);
    if (tech.cost && tech.cost.wissen) tech.cost.wissen = Math.round(tech.cost.wissen * t.knowledgeCost);
  }
})(CONFIG.tempo);

const NEXT_EPOCH = {
  name: 'Aufbruch in die Bronzezeit', icon: '🏺', col: 10, row: 2,
  requires: Object.keys(TECHS), buildings: ['steinkreis'], population: 120,
  cost: { holz: 300, stein: 250, nahrung: 300, toepferwaren: 30, werkzeug: 30 }, available: false,
};

// Kategorien der Bauleiste (je Kategorie die Linien aus BUILDINGS)
const BAR_CATEGORIES = [
  { id: 'wohnen',    name: 'Wohnen',    icon: '🏠', lines: ['wohnen', 'wasserwohnen'] },
  { id: 'nahrung',   name: 'Nahrung',   icon: '🍖', lines: ['sammeln', 'jagen', 'fischen', 'feld', 'tiere'] },
  { id: 'rohstoffe', name: 'Rohstoffe', icon: '🪵', lines: ['holz', 'pflanzen', 'stein', 'ton'] },
  { id: 'handwerk',  name: 'Handwerk',  icon: '🔨', lines: ['kleidung', 'werkzeug', 'toepfern', 'lager'] },
  { id: 'leben',     name: 'Feuer & Glaube', icon: '🔥', lines: ['waerme', 'glaube', 'wissen', 'wahrzeichen'] },
  { id: 'wege',      name: 'Wege',      icon: '🛤️', lines: ['weg', 'bruecke'] },
];

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
  { id: 'forschung', text: 'Wissen bringt uns weiter. Baue einen Höhlenmaler – mit Weg zum Feuer! –, öffne dann die Forschung 📜 und starte „Feuer hüten“, sobald genug Wissen da ist.', target: 'bar:hoehlenmaler' },
  { id: 'auftraege', text: 'Zum Schluss: Unter 📋 Aufträge findest du Aufgaben mit Belohnung. Schau mal hinein!', target: 'btn-quests' },
  { id: 'fertig', text: 'Jetzt gehört das Lager dir! Ich bin da, wenn es Neues gibt.', button: 'Danke!' },
];

const LOADING_SAYINGS = [
  'Die ersten Menschen entfachen ein Feuer …',
  'Die Sammlerinnen füllen ihre Körbe …',
  'Am Fluss ziehen Mammuts vorbei …',
  'Der Stammesälteste erzählt von früher …',
];
