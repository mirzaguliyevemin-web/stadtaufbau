'use strict';

// Version von Seite und Skript – muss zu <meta name="app-version"> in index.html passen.
// Bei jeder Änderung erhöhen (ebenso CACHE in service-worker.js).
const APP_VERSION = 16;

// Fehler sichtbar machen (auch am Handy ohne Konsole): roter Kasten mit Meldung und Zeile
function showCrash(message, where) {
  let box = document.getElementById('crash');
  if (!box) {
    box = document.createElement('div');
    box.id = 'crash';
    document.body.appendChild(box);
  }
  box.textContent = `⚠️ Fehler im Spiel (Version ${APP_VERSION}): ${message}${where ? ' – ' + where : ''}`;
}
window.addEventListener('error', e => showCrash(e.message, e.filename ? `${e.filename.split('/').pop()}:${e.lineno}:${e.colno}` : ''));
window.addEventListener('unhandledrejection', e => showCrash(String(e.reason)));

// =====================================================================
// KONFIGURATION – hier lassen sich Werte, Ressourcen und Gebäude anpassen
// =====================================================================

const CONFIG = {
  gridSize: 32,           // Karte ist gridSize × gridSize Felder
  tileSize: 48,           // Kachelgröße in Weltpixeln
  saveKey: 'stadtaufbau-save-1',
  saveVersion: 1,
  autosaveSeconds: 30,
  refundRate: 0.5,        // Anteil der Baukosten beim Abreißen
  minZoom: 0.4,           // wird kleiner, falls nötig, damit die ganze Karte passt
  startTilesVisible: 12,  // so viele Felder passen beim Start in die Bildschirmbreite
  maxZoom: 3,
  foodPerCitizen: 0.05,   // Nahrung pro Einwohner und Sekunde
  growthSeconds: 4,       // so oft wächst oder schrumpft die Bevölkerung
  growthRate: 0.08,        // Anteil der freien Plätze, die pro Schritt einziehen (mind. 1)
  leaveRate: 0.05,        // Anteil der Einwohner, die pro Schritt abwandern (mind. 1)
  activeQuests: 3,        // so viele Aufträge sind gleichzeitig sichtbar
  firstEventSeconds: 120, // erstes Zufallsereignis nach so vielen Sekunden
  eventSeconds: [90, 180],// danach zufälliger Abstand zwischen zwei Ereignissen
  fireBurnSeconds: 20,    // so lange brennt ein Gebäude, bevor es abbrennt
  fireBrigadeSeconds: 3,  // so schnell löscht eine Feuerwache in Reichweite
  extinguishCost: { money: 30 },
  dayLength: 240,         // Sekunden für einen ganzen Tag (Tag + Nacht)
  nightDarkness: 0.6,     // wie dunkel es nachts wird (0–1)
  maxWalkers: 40,         // höchstens so viele Spaziergänger auf den Straßen
  baseStorage: 100,       // Lagerplatz für Holz, Stein und Nahrung ohne Lagerhaus
  niceHouseBonus: 2,      // Extra-Wohnplätze für Häuser direkt neben Park/Brunnen/Brunnenplatz
  taxInterval: 10,        // alle so viele Sekunden werden Steuern eingenommen
  tradeLot: 10,           // so viele Einheiten pro Handel am Markt
  priceChangeSeconds: 30, // so oft schwanken die Marktpreise
  offlineMaxHours: 3,     // Offline-Einnahmen höchstens für so viele Stunden
  offlineEfficiency: 0.25, // offline arbeitet die Stadt mit einem Viertel der Leistung
  costGrowth: 0.2,        // jedes weitere Gebäude derselben Art kostet 20 % mehr (außer fixedCost)
  breadPerCitizen: 0.005, // Brot pro Einwohner und Sekunde (nur solange Brot da ist)
  baseScholars: 2,        // so viele Gelehrte gibt es auch ohne Bildung
  scholarShare: 0.3,      // dazu dieser Anteil der Einwohner × Bildungsversorgung
  unemploymentTolerance: 0.25, // bis zu diesem Anteil Arbeitslose stört es niemanden
  unemploymentPenalty: 15,     // höchster Zufriedenheitsabzug durch Arbeitslosigkeit
  seasonLength: 240,      // Sekunden je Jahreszeit (ein Jahr = 4 Jahreszeiten)
  heatingPerCitizen: 0.01, // Holz pro Einwohner und Sekunde im Winter
  coldPenalty: 20,        // Zufriedenheitsabzug, wenn im Winter das Holz fehlt
};

// Jahreszeiten. production: Faktor je Gebäudeart  | heating: Einwohner verbrauchen Holz zum Heizen
//   ground: Bodenfarbe  | happiness: Bonus/Abzug für die ganze Stadt
const SEASONS = [
  { id: 'spring', name: 'Frühling', icon: '🌸', ground: '#74c69d', production: { farm: 1 },    happiness: 3 },
  { id: 'summer', name: 'Sommer',   icon: '☀️', ground: '#95c97a', production: { farm: 1.25 } },
  { id: 'autumn', name: 'Herbst',   icon: '🍂', ground: '#c2b46a', production: { farm: 1.5 } },
  { id: 'winter', name: 'Winter',   icon: '❄️', ground: '#e4edf1', production: { farm: 0.3 },  heating: true },
];

// Ressourcen. stored: unterliegt der Lagergrenze  | price: Grundpreis pro Einheit am Markt
//   showFrom: erst ab dieser Stadtstufe oben angezeigt (oder sobald etwas davon da ist)
const RESOURCES = {
  money: { name: 'Geld',    icon: '💰', start: 200 },
  wood:  { name: 'Holz',    icon: '🪵', start: 60, stored: true, price: 4 },
  stone: { name: 'Stein',   icon: '🪨', start: 20, stored: true, price: 5 },
  food:  { name: 'Nahrung', icon: '🍞', start: 20, stored: true, price: 3 },
  knowledge: { name: 'Wissen', icon: '💡', start: 0 },
  planks: { name: 'Bretter', icon: '🪜', start: 0, stored: true, price: 20, showFrom: 1 },
  bricks: { name: 'Ziegel',  icon: '🧱', start: 0, stored: true, price: 25, showFrom: 1 },
  bread:  { name: 'Brot',    icon: '🥖', start: 0, stored: true, price: 8,  showFrom: 1 },
};

// Stadtstufen. Größere Städte sind anspruchsvoller (Abzug bei der Zufriedenheit).
const LEVELS = [
  { name: 'Dorf',       icon: '🛖', minPop: 0,   happinessPenalty: 0 },
  { name: 'Kleinstadt', icon: '🏘️', minPop: 21,  happinessPenalty: 10 },
  { name: 'Stadt',      icon: '🏙️', minPop: 101, happinessPenalty: 25 },
];

// Bedürfnisse der Einwohner. Werden von Versorgungsgebäuden im Umkreis gedeckt.
// weight: maximaler Zufriedenheitsbonus bei voller Versorgung
const NEEDS = {
  leisure:   { name: 'Freizeit',   icon: '🎭', weight: 10 },
  health:    { name: 'Gesundheit', icon: '💊', weight: 10 },
  education: { name: 'Bildung',    icon: '📚', weight: 10 },
  safety:    { name: 'Sicherheit', icon: '🛡️', weight: 10 },
};

const HAPPINESS = {
  base: 50,        // Grundwert
  fed: 20,         // Bonus, wenn Nahrung vorhanden ist
  starving: -40,   // Abzug, wenn Nahrung fehlt
  bread: 8,        // Bonus, solange Brot vorhanden ist
  growAbove: 50,   // ab diesem Wert ziehen Einwohner zu
  leaveBelow: 30,  // unter diesem Wert wandern Einwohner ab
};

// Berufe. Gebäude mit `jobs` brauchen Personal – ohne volle Besetzung arbeiten sie anteilig langsamer.
// Einwohner werden automatisch verteilt (Farmen zuerst, soweit für die Ernährung nötig). Gelehrte gibt es nur mit Bildung.
const JOBS = {
  worker:  { name: 'Arbeiter', icon: '👷' },
  trader:  { name: 'Händler',  icon: '🧑‍💼' },
  scholar: { name: 'Gelehrte', icon: '🧑‍🎓' },
};

// Steuerstufen: Geld je Einwohner alle CONFIG.taxInterval Sekunden und Wirkung auf die Zufriedenheit
const TAXES = [
  { name: 'Keine',     perCitizen: 0,   happiness: 5 },
  { name: 'Niedrig',   perCitizen: 0.1, happiness: 0 },
  { name: 'Normal',    perCitizen: 0.2, happiness: -5 },
  { name: 'Hoch',      perCitizen: 0.3, happiness: -12 },
  { name: 'Sehr hoch', perCitizen: 0.4, happiness: -20 },
];

// Kategorien der Bauleiste – Reihenfolge = Reihenfolge der Reiter
const CATEGORIES = {
  housing:   { name: 'Wohnen',     icon: '🏠' },
  resources: { name: 'Rohstoffe',  icon: '🌾' },
  crafts:    { name: 'Handwerk',   icon: '🔨' },
  trade:     { name: 'Handel',     icon: '🏪' },
  services:  { name: 'Dienste',    icon: '🏥' },
  education: { name: 'Bildung',    icon: '📚' },
  prestige:  { name: 'Prestige',   icon: '🏛️' },
};

// Gebäude. Neue Gebäude einfach hier ergänzen (category = Reiter in der Bauleiste).
//   cost:          Baukosten                  { ressource: menge }
//   interval:      Produktionsintervall in Sekunden
//   produces:      feste Menge pro Intervall  { ressource: menge }
//   perPopulation: Menge je Einwohner pro Intervall
//   consumes:      Verbrauch pro Intervall (Verarbeitung) – fehlt etwas, pausiert das Gebäude
//   jobs:          benötigtes Personal { beruf: anzahl } (ein Beruf je Gebäude, siehe JOBS)
//   servesUpTo:    perPopulation zählt höchstens so viele Einwohner je Gebäude
//   fixedCost:     Kosten steigen nicht mit der Anzahl (z. B. Straßen)
//   population:    Wohnplätze, die das Gebäude bietet
//   service:       versorgt Häuser im Umkreis  { need, radius }
//   fireRadius:    löscht Brände im Umkreis
//   smoke:         Rauchwölkchen pro Sekunde (nur Optik)
//   storage:       zusätzlicher Lagerplatz für Ressourcen mit `stored`
//   beautifies:    Häuser direkt daneben (auch diagonal) bekommen Extra-Wohnplätze
//   landmark:      Sehenswürdigkeit – gibt es nur einmal, Zufriedenheitsbonus für die ganze Stadt
//   unlockLevel:   ab welcher Stadtstufe baubar (Index in LEVELS)
//   requiresTech:  erst nach dieser Forschung baubar (ID in TECHS)
//   needsRoad:     funktioniert nur mit angrenzender Straße
//   isRoad:        ist selbst eine Straße (wird als Wegenetz gezeichnet)
//   dragBuild:     kann durch Ziehen am Stück gebaut werden
const BUILDINGS = {
  road: {
    name: 'Straße', icon: '🛣️', color: '#a39887',
    description: 'Verbindet Gebäude. Ohne angrenzende Straße arbeitet kein Gebäude.',
    cost: { money: 5 },
    fixedCost: true,
    isRoad: true,
    dragBuild: true,
    category: 'housing',
  },
  house: {
    name: 'Haus', icon: '🏠', color: '#e9c46a',
    description: 'Wohnraum für Einwohner. Sie ziehen ein, wenn sie zufrieden sind.',
    cost: { wood: 20 },
    population: 4,
    smoke: 0.3,
    needsRoad: true,
    category: 'housing',
  },
  farm: {
    name: 'Farm', icon: '🌾', color: '#b5e48c',
    description: 'Produziert Nahrung für die Einwohner.',
    cost: { wood: 15 },
    interval: 6,
    produces: { food: 4 },
    needsRoad: true,
    jobs: { worker: 2 },
    category: 'resources',
  },
  sawmill: {
    name: 'Sägewerk', icon: '🪚', color: '#b08968',
    description: 'Produziert Holz.',
    cost: { money: 50 },
    interval: 6,
    produces: { wood: 2 },
    smoke: 0.8,
    needsRoad: true,
    jobs: { worker: 2 },
    category: 'resources',
  },
  quarry: {
    name: 'Steinbruch', icon: '⛏️', color: '#adb5bd',
    description: 'Produziert Stein.',
    cost: { money: 40, wood: 10 },
    interval: 8,
    produces: { stone: 2 },
    needsRoad: true,
    jobs: { worker: 3 },
    category: 'resources',
  },
  market: {
    name: 'Markt', icon: '🏪', color: '#e76f51',
    description: 'Bringt Geld für bis zu 15 Einwohner.',
    cost: { wood: 25, stone: 10 },
    interval: 10,
    perPopulation: { money: 0.5 },
    servesUpTo: 15,
    needsRoad: true,
    jobs: { trader: 3 },
    category: 'trade',
  },
  warehouse: {
    name: 'Lagerhaus', icon: '📦', color: '#ddb892',
    description: 'Mehr Platz für Holz, Stein und Nahrung.',
    cost: { money: 30, wood: 30 },
    storage: 100,
    needsRoad: true,
    jobs: { worker: 1 },
    category: 'trade',
  },
  park: {
    name: 'Park', icon: '🌳', color: '#52b788',
    description: 'Ein Ort zum Erholen.',
    cost: { money: 20 },
    service: { need: 'leisure', radius: 2 },
    beautifies: true,
    needsRoad: true,
    category: 'services',
  },
  firestation: {
    name: 'Feuerwache', icon: '🚒', color: '#ff8fa3',
    description: 'Löscht Brände in der Umgebung, bevor Schaden entsteht.',
    cost: { money: 50, wood: 20, stone: 15 },
    fireRadius: 4,
    needsRoad: true,
    jobs: { worker: 2 },
    category: 'services',
  },
  scriptorium: {
    name: 'Schreibstube', icon: '🕯️', color: '#d4a373',
    description: 'Gelehrte sammeln Wissen für die Forschung.',
    cost: { money: 40, wood: 20 },
    interval: 8,
    produces: { knowledge: 1 },
    smoke: 0.3,
    needsRoad: true,
    jobs: { scholar: 1 },
    category: 'education',
  },
  carpentry: {
    name: 'Schreinerei', icon: '🔨', color: '#c9a27e',
    description: 'Sägt Holz zu Brettern.',
    cost: { money: 60, wood: 30, stone: 10 },
    interval: 8,
    consumes: { wood: 3 },
    produces: { planks: 1 },
    smoke: 0.3,
    unlockLevel: 1,
    needsRoad: true,
    jobs: { worker: 3 },
    category: 'crafts',
  },
  brickworks: {
    name: 'Ziegelei', icon: '🏺', color: '#e07a5f',
    description: 'Brennt Stein zu Ziegeln.',
    cost: { money: 60, wood: 20, stone: 30 },
    interval: 10,
    consumes: { stone: 3 },
    produces: { bricks: 1 },
    smoke: 0.8,
    unlockLevel: 1,
    needsRoad: true,
    jobs: { worker: 3 },
    category: 'crafts',
  },
  bakery: {
    name: 'Bäckerei', icon: '🥐', color: '#f6bd60',
    description: 'Backt aus Getreide Brot. Solange es Brot gibt, sind alle zufriedener.',
    cost: { money: 50, wood: 30 },
    interval: 6,
    consumes: { food: 3 },
    produces: { bread: 2 },
    smoke: 0.5,
    unlockLevel: 1,
    needsRoad: true,
    jobs: { worker: 3 },
    category: 'crafts',
  },
  well: {
    name: 'Brunnen', icon: '🪣', color: '#90e0ef',
    description: 'Sauberes Wasser hält die Einwohner gesund.',
    cost: { money: 30, stone: 15 },
    service: { need: 'health', radius: 2 },
    beautifies: true,
    unlockLevel: 1,
    needsRoad: true,
    category: 'services',
  },
  school: {
    name: 'Schule', icon: '🏫', color: '#ffafcc',
    description: 'Bildung für die Kinder der Stadt – und etwas Wissen.',
    cost: { money: 60, wood: 40, stone: 30 },
    service: { need: 'education', radius: 4 },
    interval: 10,
    produces: { knowledge: 2 },
    unlockLevel: 1,
    needsRoad: true,
    jobs: { scholar: 2 },
    category: 'education',
  },
  library: {
    name: 'Bibliothek', icon: '📚', color: '#cdb4db',
    description: 'Viel Wissen für die Forschung, dazu Bildung für die Nachbarschaft.',
    cost: { money: 80, wood: 40, stone: 40, planks: 15 },
    service: { need: 'education', radius: 3 },
    interval: 10,
    produces: { knowledge: 4 },
    requiresTech: 'library',
    needsRoad: true,
    jobs: { scholar: 3 },
    category: 'education',
  },
  guard: {
    name: 'Wachhaus', icon: '💂', color: '#ced4da',
    description: 'Wachen sorgen für Sicherheit.',
    cost: { money: 40, wood: 30, stone: 20 },
    service: { need: 'safety', radius: 4 },
    unlockLevel: 1,
    needsRoad: true,
    jobs: { worker: 2 },
    category: 'services',
  },
  hospital: {
    name: 'Krankenhaus', icon: '🏥', color: '#f8f9fa',
    description: 'Medizinische Versorgung für einen großen Umkreis.',
    cost: { money: 150, wood: 60, stone: 60, planks: 20, bricks: 20 },
    service: { need: 'health', radius: 5 },
    unlockLevel: 2,
    needsRoad: true,
    jobs: { scholar: 3 },
    category: 'services',
  },
  townhall: {
    name: 'Rathaus', icon: '🏛️', color: '#e9ecef',
    description: 'Das Herz der Stadt – macht alle stolz.',
    cost: { money: 600, wood: 100, stone: 100, planks: 60, bricks: 60 },
    landmark: 5,
    unlockLevel: 1,
    needsRoad: true,
    category: 'prestige',
  },
  plaza: {
    name: 'Brunnenplatz', icon: '⛲', color: '#a2d2ff',
    description: 'Ein prächtiger Platz zum Treffen.',
    cost: { money: 400, stone: 150, bricks: 60 },
    landmark: 5,
    beautifies: true,
    unlockLevel: 1,
    needsRoad: true,
    category: 'prestige',
  },
  cathedral: {
    name: 'Kathedrale', icon: '⛪', color: '#f1e3c8',
    description: 'Ein gewaltiges Bauwerk, weithin sichtbar.',
    cost: { money: 1500, stone: 400, planks: 150, bricks: 200 },
    landmark: 10,
    unlockLevel: 2,
    needsRoad: true,
    category: 'prestige',
  },
};

// Aufträge – werden der Reihe nach freigegeben. Neue einfach anhängen.
//   goal.type: build (Gebäude stehen) | population | happiness | resource (vorrätig) | produced (insgesamt erzeugt) | research (erforschte Technologien) | jobs (beschäftigte im Beruf goal.job) | winters (überstandene Winter)
//   goal.count: Zielwert, goal.building / goal.resource je nach Typ
//   reward: Belohnung { ressource: menge }
const QUESTS = [
  { id: 'roads',      title: 'Erste Wege',           goal: { type: 'build', building: 'road', count: 3 },      reward: { money: 30 } },
  { id: 'houses',     title: 'Ein Dach über dem Kopf', goal: { type: 'build', building: 'house', count: 2 },   reward: { wood: 20 } },
  { id: 'farm',       title: 'Satt werden',          goal: { type: 'build', building: 'farm', count: 1 },      reward: { money: 30 } },
  { id: 'sawmill',    title: 'Holz aus eigener Hand', goal: { type: 'build', building: 'sawmill', count: 1 },  reward: { wood: 20 } },
  { id: 'pop8',       title: 'Die ersten Bewohner',  goal: { type: 'population', count: 8 },                   reward: { money: 50 } },
  { id: 'quarry',     title: 'Steinzeit',            goal: { type: 'build', building: 'quarry', count: 1 },    reward: { wood: 20 } },
  { id: 'market',     title: 'Markttag',             goal: { type: 'build', building: 'market', count: 1 },    reward: { stone: 20 } },
  { id: 'warehouse',  title: 'Volle Speicher',       goal: { type: 'build', building: 'warehouse', count: 1 }, reward: { wood: 30 } },
  { id: 'park',       title: 'Grüne Oase',           goal: { type: 'build', building: 'park', count: 1 },      reward: { money: 30 } },
  { id: 'firestation', title: 'Brandschutz',         goal: { type: 'build', building: 'firestation', count: 1 }, reward: { money: 40 } },
  { id: 'scriptorium', title: 'Wissen ist Macht',    goal: { type: 'build', building: 'scriptorium', count: 1 }, reward: { money: 30 } },
  { id: 'research1',  title: 'Erste Erfindung',      goal: { type: 'research', count: 1 },                     reward: { knowledge: 10 } },
  { id: 'farms3',     title: 'Kornkammer',           goal: { type: 'build', building: 'farm', count: 3 },      reward: { wood: 40 } },
  { id: 'food100',    title: 'Volle Vorratskammer',  goal: { type: 'produced', resource: 'food', count: 100 }, reward: { money: 60 } },
  { id: 'wood100',    title: 'Holzvorrat',           goal: { type: 'resource', resource: 'wood', count: 100 }, reward: { stone: 30 } },
  { id: 'winter1',    title: 'Der erste Winter',     goal: { type: 'winters', count: 1 },                      reward: { wood: 60, food: 40 } },
  { id: 'pop21',      title: 'Auf zur Kleinstadt',   goal: { type: 'population', count: 21 },                  reward: { money: 100, stone: 20 } },
  { id: 'well',       title: 'Frisches Wasser',      goal: { type: 'build', building: 'well', count: 1 },      reward: { money: 40 } },
  { id: 'school',     title: 'Lesen und Schreiben',  goal: { type: 'build', building: 'school', count: 1 },    reward: { wood: 50 } },
  { id: 'scholars5',  title: 'Kluge Köpfe',          goal: { type: 'jobs', job: 'scholar', count: 5 },         reward: { knowledge: 30 } },
  { id: 'guard',      title: 'Ruhige Nächte',        goal: { type: 'build', building: 'guard', count: 1 },     reward: { stone: 50 } },
  { id: 'carpentry',  title: 'Handwerk',             goal: { type: 'build', building: 'carpentry', count: 1 }, reward: { money: 60 } },
  { id: 'bakery',     title: 'Frisches Brot',        goal: { type: 'build', building: 'bakery', count: 1 },    reward: { food: 40 } },
  { id: 'brickworks', title: 'Ziegelbrenner',        goal: { type: 'build', building: 'brickworks', count: 1 }, reward: { stone: 40 } },
  { id: 'planks30',   title: 'Feine Ware',           goal: { type: 'produced', resource: 'planks', count: 30 }, reward: { money: 120 } },
  { id: 'happy75',    title: 'Glückliche Leute',     goal: { type: 'happiness', count: 75 },                   reward: { money: 150 } },
  { id: 'pop50',      title: 'Wachsende Stadt',      goal: { type: 'population', count: 50 },                  reward: { wood: 100, stone: 100 } },
  { id: 'traders6',   title: 'Reger Handel',         goal: { type: 'jobs', job: 'trader', count: 6 },          reward: { money: 100 } },
  { id: 'townhall',   title: 'Prestige',             goal: { type: 'build', building: 'townhall', count: 1 },  reward: { money: 150, stone: 50 } },
  { id: 'research4',  title: 'Zeitalter der Gelehrten', goal: { type: 'research', count: 4 },                  reward: { money: 150 } },
  { id: 'money500',   title: 'Volle Stadtkasse',     goal: { type: 'resource', resource: 'money', count: 500 }, reward: { stone: 80 } },
  { id: 'pop101',     title: 'Eine echte Stadt',     goal: { type: 'population', count: 101 },                 reward: { money: 300 } },
  { id: 'hospital',   title: 'Gute Besserung',       goal: { type: 'build', building: 'hospital', count: 1 },  reward: { money: 200 } },
];

// Tägliche Belohnung für Tag 1, 2, 3 … in Folge (ab Tag 7 bleibt es bei der letzten)
const DAILY_REWARDS = [
  { money: 50 },
  { money: 40, wood: 40 },
  { money: 60, stone: 30 },
  { money: 60, food: 50 },
  { money: 80, knowledge: 20 },
  { wood: 80, stone: 80 },
  { money: 200, knowledge: 40 },
];

// Erfolge – Auszeichnungen ohne Belohnung, bleiben auch bei einem neuen Spiel erhalten.
const ACHIEVEMENTS = [
  { id: 'firstHouse', icon: '🏠', name: 'Grundstein',          text: 'Baue dein erstes Haus.',                  check: () => countBuildings('house') >= 1 },
  { id: 'pop50',      icon: '👥', name: 'Gemeinschaft',        text: 'Erreiche 50 Einwohner.',                   check: () => state.population >= 50 },
  { id: 'pop100',     icon: '🏙️', name: 'Erste 100 Einwohner', text: 'Erreiche 100 Einwohner.',                  check: () => state.population >= 100 },
  { id: 'busy10',     icon: '⚙️', name: 'Fleißige Stadt',      text: '10 Gebäude produzieren gleichzeitig.',     check: () => producingCount() >= 10 },
  { id: 'roads50',    icon: '🛣️', name: 'Straßenbauer',        text: 'Baue 50 Straßenfelder.',                   check: () => countBuildings('road') >= 50 },
  { id: 'rich1000',   icon: '💰', name: 'Volle Kasse',         text: 'Habe 1000 Geld auf einmal.',               check: () => state.resources.money >= 1000 },
  { id: 'happy90',    icon: '😊', name: 'Glückliche Stadt',    text: 'Zufriedenheit 90 mit mindestens 20 Einwohnern.', check: () => stats.happiness >= 90 && state.population >= 20 },
  { id: 'nice10',     icon: '✨', name: 'Schöne Viertel',      text: '10 Häuser in schönen Wohnvierteln.',       check: () => stats.niceHouses >= 10 },
  { id: 'fire5',      icon: '🚒', name: 'Feuerwehr',           text: 'Lösche 5 Brände.',                         check: () => (state.counters.extinguished || 0) >= 5 },
  { id: 'trade10',    icon: '🤝', name: 'Händler',             text: 'Handle 10-mal am Markt oder mit Karawanen.', check: () => (state.counters.trades || 0) >= 10 },
  { id: 'allTech',    icon: '🔬', name: 'Universalgelehrter',  text: 'Erforsche alle Technologien.',             check: () => state.techs.length === Object.keys(TECHS).length },
  { id: 'landmarks',  icon: '🏛️', name: 'Wahrzeichen',         text: 'Baue alle Sehenswürdigkeiten.',            check: () => Object.keys(BUILDINGS).filter(t => BUILDINGS[t].landmark).every(t => countBuildings(t) > 0) },
  { id: 'allQuests',  icon: '📜', name: 'Auftragsheld',        text: 'Erledige alle Aufträge.',                  check: () => state.questsClaimed.length === QUESTS.length },
  { id: 'streak7',    icon: '📅', name: 'Treue Seele',         text: 'Spiele 7 Tage in Folge.',                  check: () => state.daily.streak >= 7 },
  { id: 'warmWinter', icon: '🔥', name: 'Warme Stuben',        text: 'Überstehe einen Winter mit mindestens 50 Einwohnern, ohne dass jemand friert.', check: () => (state.counters.warmWinters || 0) >= 1 },
  { id: 'fullJobs',   icon: '👷', name: 'Vollbeschäftigung',   text: 'Mindestens 50 Einwohner und niemand ist arbeitslos.', check: () => state.population >= 50 && stats.unemployed === 0 },
  { id: 'crafts100',  icon: '🔨', name: 'Meisterhandwerker',   text: 'Stelle insgesamt 100 Bretter, Ziegel oder Brote her.',
    check: () => ['planks', 'bricks', 'bread'].reduce((sum, id) => sum + (state.produced[id] || 0), 0) >= 100 },
];

// Forschung. Immer nur eine gleichzeitig; Kosten werden beim Start bezahlt.
//   cost: Kosten  | seconds: Forschungsdauer  | requires: vorher nötige Technologien
//   effect: dauerhafte Wirkung, alles optional:
//     production: { gebäude: +Anteil }   z. B. 0.5 = +50 % Ertrag
//     capacity:   { gebäude: +Plätze }   zusätzliche Wohnplätze
//     happiness:  Punkte                 dauerhafter Zufriedenheitsbonus
//     flags:      { name: true }         Sonderregeln (fireResistant, plagueResistant)
//   Gebäude mit requiresTech werden durch die Technologie freigeschaltet.
const TECHS = {
  irrigation: {
    name: 'Bewässerung', icon: '🌊',
    description: 'Farmen liefern 50 % mehr Nahrung.',
    cost: { knowledge: 60 }, seconds: 60,
    effect: { production: { farm: 0.5 } },
  },
  tools: {
    name: 'Bessere Werkzeuge', icon: '🪓',
    description: 'Sägewerke und Steinbrüche liefern 50 % mehr.',
    cost: { knowledge: 75 }, seconds: 60,
    effect: { production: { sawmill: 0.5, quarry: 0.5 } },
  },
  stoves: {
    name: 'Kachelöfen', icon: '♨️',
    description: 'Gemauerte Öfen halten länger warm: Heizen braucht nur halb so viel Holz.',
    cost: { knowledge: 160, bricks: 30 }, seconds: 90,
    requires: ['craftsmanship'],
    effect: { flags: { heatingSaver: true } },
  },
  craftsmanship: {
    name: 'Handwerkskunst', icon: '🔨',
    description: 'Schreinereien, Ziegeleien und Bäckereien liefern 50 % mehr.',
    cost: { knowledge: 150 }, seconds: 90,
    requires: ['tools'],
    effect: { production: { carpentry: 0.5, brickworks: 0.5, bakery: 0.5 } },
  },
  library: {
    name: 'Bibliothek', icon: '📚',
    description: 'Schaltet die Bibliothek frei: viel Wissen und Bildung.',
    cost: { knowledge: 120 }, seconds: 75,
  },
  stonewalls: {
    name: 'Steinmauern', icon: '🏰',
    description: 'Häuser bieten 2 Wohnplätze mehr. Brände greifen nicht über und brennen doppelt so lange.',
    cost: { knowledge: 180, stone: 120 }, seconds: 90,
    requires: ['tools'],
    effect: { capacity: { house: 2 }, flags: { fireResistant: true } },
  },
  accounting: {
    name: 'Buchhaltung', icon: '⚖️',
    description: 'Märkte bringen 50 % mehr Geld.',
    cost: { knowledge: 180 }, seconds: 90,
    requires: ['library'],
    effect: { production: { market: 0.5 } },
  },
  croprotation: {
    name: 'Fruchtwechsel', icon: '🌱',
    description: 'Farmen liefern weitere 50 % mehr Nahrung.',
    cost: { knowledge: 270 }, seconds: 120,
    requires: ['irrigation', 'library'],
    effect: { production: { farm: 0.5 } },
  },
  sewers: {
    name: 'Kanalisation', icon: '🚰',
    description: 'Zufriedenheit +5. Seuchen richten nur halb so viel Schaden an.',
    cost: { knowledge: 330, stone: 100, bricks: 40 }, seconds: 120,
    requires: ['stonewalls'],
    effect: { happiness: 5, flags: { plagueResistant: true } },
  },
  administration: {
    name: 'Verwaltung', icon: '🏛️',
    description: 'Eine gut geführte Stadt: Zufriedenheit +5.',
    cost: { knowledge: 420, money: 400 }, seconds: 150,
    requires: ['accounting'],
    effect: { happiness: 5 },
  },
};

// Zufallsereignisse. weight: Häufigkeit, minPop: frühestens ab so vielen Einwohnern, seasons: nur in diesen Jahreszeiten
//   duration + effect: zeitlich begrenzte Wirkung { happiness: punkte, production: { ressource: faktor } }
//   start(): eigene Logik (Feuer, Handel …) – gibt false zurück, wenn es gerade nicht passt
const EVENTS = {
  fire: {
    name: 'Feuer', icon: '🔥', weight: 3, minPop: 8,
    start: () => startFire(),
  },
  drought: {
    name: 'Dürre', icon: '🌵', weight: 2, minPop: 5, seasons: ['summer', 'autumn'],
    duration: 60, effect: { production: { food: 0.5 } },
    text: 'Es regnet seit Wochen nicht. Farmen liefern 60 Sekunden lang nur die halbe Ernte.',
  },
  caravan: {
    name: 'Händlerkarawane', icon: '🐪', weight: 2, minPop: 5,
    start: () => offerTrade(),
  },
  plague: {
    name: 'Seuche', icon: '🦠', weight: 1, minPop: 20,
    start: () => startPlague(),
  },
  festival: {
    name: 'Festtag', icon: '🎉', weight: 2, minPop: 10,
    duration: 60, effect: { happiness: 15 },
    text: 'Die Stadt feiert! 60 Sekunden lang sind alle besonders zufrieden.',
  },
};

// =====================================================================
// SPIELZUSTAND
// =====================================================================

const N = CONFIG.gridSize;
const T = CONFIG.tileSize;

const state = {
  resources: {},
  grid: [],          // grid[y * N + x] = { type, timer } oder null
  population: 0,     // tatsächliche Einwohner (≤ Wohnplätze)
  maxLevel: 0,       // höchste erreichte Stufe – Freischaltungen bleiben erhalten
  questsClaimed: [], // IDs der Aufträge, deren Belohnung abgeholt wurde
  produced: {},      // insgesamt erzeugte Mengen je Ressource
  effects: [],       // laufende Ereignis-Wirkungen { event, left, happiness?, production? }
  nextEventIn: CONFIG.firstEventSeconds,
  techs: [],         // erforschte Technologien
  research: null,    // laufende Forschung { id, left }
  dayTime: 0.15,     // Tageszeit 0–1 (0 = Mittag, 0.5 = Mitternacht)
  yearTime: 0,       // Sekunden im laufenden Jahr (Jahreszeit = yearTime / seasonLength)
  coldThisWinter: 0, // Sekunden, in denen im aktuellen Winter gefroren wurde
  taxLevel: 1,       // Index in TAXES
  prices: {},        // Preisfaktor je handelbarer Ressource (0.6–1.6)
  counters: {},      // Zähler für Erfolge (Handel, gelöschte Brände …)
  achievements: [],  // erreichte Erfolge (bleiben bei neuem Spiel erhalten)
  daily: { last: null, streak: 0 },   // tägliche Belohnung (bleibt bei neuem Spiel erhalten)
};

// Abgeleitete Werte, werden von recalcStats() regelmäßig neu berechnet
const stats = {
  capacity: 0,
  coverage: {},            // need -> Anteil versorgter Wohnplätze (0..1)
  houseNeeds: new Map(),   // Feldindex -> Map(Bedürfnis -> Versorgungsgrad 0–1)
  happiness: HAPPINESS.base,
  factors: [],             // [Bezeichnung, Punkte] für die Aufschlüsselung
  level: 0,
  starving: false,
  trend: '',
  storage: CONFIG.baseStorage,   // Lagergrenze für Ressourcen mit `stored`
  activeCount: {},               // arbeitende Gebäude je Art
  jobs: { demand: {}, assigned: {}, scholarCap: 0 },   // Stellen und Besetzung je Beruf
  staff: {},                     // Besetzungsgrad 0–1 je Gebäudeart
  unemployed: 0,
  niceHouses: 0,
};

function newGame() {
  state.resources = {};
  for (const id in RESOURCES) state.resources[id] = RESOURCES[id].start;
  state.grid = new Array(N * N).fill(null);
  state.population = 0;
  state.maxLevel = 0;
  state.questsClaimed = [];
  state.produced = {};
  state.effects = [];
  state.nextEventIn = CONFIG.firstEventSeconds;
  state.techs = [];
  state.research = null;
  state.dayTime = 0.15;
  state.yearTime = 0;
  state.coldThisWinter = 0;
  state.taxLevel = 1;
  state.prices = {};
  for (const id in RESOURCES) if (RESOURCES[id].price) state.prices[id] = 1;
  state.counters = {};
  state.achievements ||= [];
  state.daily ||= { last: null, streak: 0 };
  notifiedQuests.clear();
}

function getCell(x, y) {
  if (x < 0 || y < 0 || x >= N || y >= N) return undefined;
  return state.grid[y * N + x];
}

// Nachbarfelder (oben, rechts, unten, links) – Grundlage für Straßen/Nachbarschaftsbonus
function neighbors(x, y) {
  return [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]]
    .filter(([nx, ny]) => getCell(nx, ny) !== undefined)
    .map(([nx, ny]) => ({ x: nx, y: ny, cell: getCell(nx, ny) }));
}

function hasRoadAccess(x, y) {
  return neighbors(x, y).some(n => n.cell && BUILDINGS[n.cell.type].isRoad);
}

// Arbeitet das Gebäude auf (x, y)? Hier kommen später weitere Bedingungen hinzu.
function isActive(x, y) {
  const cell = getCell(x, y);
  if (!cell || cell.fire) return false;
  return !BUILDINGS[cell.type].needsRoad || hasRoadAccess(x, y);
}

// Wirkungsbereich eines Gebäudes (Versorgung oder Brandschutz), sonst null
function areaOf(def) {
  if (def.service) return { key: def.service.need, radius: def.service.radius };
  if (def.fireRadius) return { key: 'fire', radius: def.fireRadius };
  return null;
}

function inRange(ax, ay, bx, by, radius) {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by)) <= radius;
}

function levelFor(pop) {
  let level = 0;
  LEVELS.forEach((l, i) => { if (pop >= l.minPop) level = i; });
  return level;
}

function isUnlocked(type) {
  const def = BUILDINGS[type];
  return (def.unlockLevel || 0) <= state.maxLevel && (!def.requiresTech || state.techs.includes(def.requiresTech));
}

// Warum ist ein Gebäude gesperrt? (kurz für die Bauleiste, lang für die Meldung)
function lockReason(type, long = false) {
  const def = BUILDINGS[type];
  if ((def.unlockLevel || 0) > state.maxLevel) {
    const level = LEVELS[def.unlockLevel];
    return long ? `Stufe ${level.name} (${level.minPop} Einwohner)` : `ab ${level.name}`;
  }
  const tech = TECHS[def.requiresTech];
  return long ? `der Forschung ${tech.icon} ${tech.name}` : `Forschung`;
}

// ---------- Wirkungen der Forschung ----------

function techEffects() {
  return state.techs.map(id => TECHS[id].effect || {});
}

function productionBonus(type) {
  return techEffects().reduce((sum, e) => sum + (e.production?.[type] || 0), 0);
}

function capacityOf(type) {
  const base = BUILDINGS[type].population || 0;
  if (!base) return 0;
  return base + techEffects().reduce((sum, e) => sum + (e.capacity?.[type] || 0), 0);
}

function hasFlag(name) {
  return techEffects().some(e => e.flags?.[name]);
}

// ---------- Wohnviertel ----------

// Haus mit Park, Brunnen o. Ä. direkt daneben (auch diagonal)?
function isNiceHouse(x, y) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cell = getCell(x + dx, y + dy);
      if (cell && BUILDINGS[cell.type].beautifies && isActive(x + dx, y + dy)) return true;
    }
  }
  return false;
}

function houseCapacity(x, y) {
  const cap = capacityOf(getCell(x, y).type);
  return cap && isNiceHouse(x, y) ? cap + CONFIG.niceHouseBonus : cap;
}

// Neue Waren erst zeigen, wenn die Stufe erreicht ist oder schon etwas davon da ist
function isResourceVisible(id) {
  return state.resources[id] > 0 || (RESOURCES[id].showFrom || 0) <= state.maxLevel;
}

function storageCap(id) {
  return RESOURCES[id].stored ? stats.storage : Infinity;
}

// =====================================================================
// EREIGNISSE – später für Aufträge, Erfolge, Sounds usw.
// =====================================================================

const listeners = {};
function on(event, fn) { (listeners[event] ||= []).push(fn); }
function emit(event, data) { (listeners[event] || []).forEach(fn => fn(data)); }

// =====================================================================
// WIRTSCHAFT
// =====================================================================

function canAfford(cost) {
  return Object.entries(cost).every(([id, n]) => state.resources[id] >= n);
}

// Zugänge werden durch die Lagergrenze gedeckelt (was nicht passt, verfällt)
function addResources(amounts, factor = 1) {
  for (const [id, n] of Object.entries(amounts)) {
    const delta = Math.floor(n * factor);
    const cur = state.resources[id];
    if (delta > 0) state.resources[id] = Math.max(cur, Math.min(storageCap(id), cur + delta));
    else state.resources[id] = cur + delta;
  }
}

function missingText(cost) {
  return Object.entries(cost)
    .filter(([id, n]) => state.resources[id] < n)
    .map(([id]) => RESOURCES[id].name)
    .join(' und ');
}

function formatNumber(n) {
  return n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
}

function formatAmounts(amounts) {
  return Object.entries(amounts)
    .map(([id, n]) => `${RESOURCES[id].icon} ${formatNumber(n)}`)
    .join('  ');
}

// Aktuelle Baukosten: steigen mit jedem Gebäude derselben Art (offset: -1 = Preis des letzten)
function costOf(type, offset = 0) {
  const def = BUILDINGS[type];
  if (def.fixedCost) return def.cost;
  const factor = 1 + CONFIG.costGrowth * Math.max(0, countBuildings(type) + offset);
  const cost = {};
  for (const [id, n] of Object.entries(def.cost)) cost[id] = Math.round(n * factor);
  return cost;
}

// Gibt zurück, ob gebaut wurde
function placeBuilding(x, y, type) {
  const def = BUILDINGS[type];
  if (getCell(x, y) !== null) return false;
  if (def.landmark && countBuildings(type) > 0) {
    sound.play('error');
    showToast(`${def.name} gibt es nur einmal`);
    return false;
  }
  const cost = costOf(type);
  if (!canAfford(cost)) {
    sound.play('error');
    showToast(`Nicht genug ${missingText(cost)}`);
    return false;
  }
  addResources(cost, -1);
  state.grid[y * N + x] = { type, timer: 0, builtAt: performance.now() };
  emit('build', { x, y, type });
  recalcStats();
  if (def.needsRoad && !hasRoadAccess(x, y)) showToast('⚠️ Braucht eine Straße direkt daneben');
  else if (def.jobs && staffOf(type) < 1) {
    const job = JOBS[jobOf(type)];
    showToast(job === JOBS.scholar && stats.jobs.assigned.scholar >= stats.jobs.scholarCap
      ? `${job.icon} Zu wenige Gelehrte – mehr Bildung (Schulen) bringt mehr`
      : `${job.icon} Zu wenige ${job.name} – baue mehr Häuser`, 2500);
  }
  updateUI();
  return true;
}

function demolish(x, y) {
  const cell = getCell(x, y);
  if (!cell) return;
  addResources(costOf(cell.type, -1), CONFIG.refundRate);
  state.grid[y * N + x] = null;
  emit('demolish', { x, y, type: cell.type });
  closeInfo();
  recalcStats();
  updateUI();
}

// Arbeitsleistung durch Zufriedenheit: 50 → 100 %, 80 → 130 %, 30 → 80 % (Grenzen 70–130 %)
function productivity() {
  return clamp(1 + (stats.happiness - 50) / 100, 0.7, 1.3);
}

// Ertrag eines Gebäudes pro Intervall (mit Nachkommastellen). Forschung, Zufriedenheit und
// Ereignisse (z. B. Dürre) wirken als Faktor – später auch Jahreszeiten.
function buildingOutput(type) {
  const def = BUILDINGS[type];
  const factor = (1 + productionBonus(type)) * productivity() * staffOf(type) * (season().production?.[type] ?? 1);
  const out = {};
  for (const [id, n] of Object.entries(def.produces || {})) out[id] = (out[id] || 0) + n;
  if (def.perPopulation) {
    // Einwohner verteilen sich auf alle Gebäude dieser Art, jedes bedient höchstens servesUpTo
    const share = state.population / Math.max(1, stats.activeCount[type] || 1);
    const served = def.servesUpTo ? Math.min(def.servesUpTo, share) : share;
    for (const [id, n] of Object.entries(def.perPopulation)) out[id] = (out[id] || 0) + n * served;
  }
  for (const id in out) {
    out[id] *= factor;
    for (const e of state.effects) {
      if (e.production?.[id] !== undefined) out[id] *= e.production[id];
    }
    out[id] = Math.round(out[id] * 10) / 10;
  }
  return out;
}

// ---------- Steuern ----------

let taxTimer = 0;
let taxCarry = 0;   // Bruchteile sammeln sich bis zur nächsten Einnahme

function updateTaxes(dt) {
  taxTimer += dt;
  if (taxTimer < CONFIG.taxInterval) return;
  taxTimer -= CONFIG.taxInterval;
  taxCarry += state.population * TAXES[state.taxLevel].perCitizen;
  const income = Math.floor(taxCarry);
  taxCarry -= income;
  if (income > 0) addResources({ money: income });
}

function setTaxLevel(level) {
  state.taxLevel = clamp(level, 0, TAXES.length - 1);
  sound.play('click');
  recalcStats();
  updateUI();
}

// ---------- Handel am Markt ----------

let priceTimer = 0;

function updatePrices(dt) {
  priceTimer += dt;
  if (priceTimer < CONFIG.priceChangeSeconds) return;
  priceTimer = 0;
  for (const id in state.prices) state.prices[id] = clamp(state.prices[id] * randomBetween(0.85, 1.18), 0.6, 1.6);
}

function buyPrice(id) {
  return Math.ceil(RESOURCES[id].price * state.prices[id] * CONFIG.tradeLot);
}

function sellPrice(id) {
  return Math.floor(buyPrice(id) * 0.6);
}

function hasMarket() {
  return state.grid.some((cell, i) => cell && cell.type === 'market' && isActive(i % N, Math.floor(i / N)));
}

function trade(id, buy) {
  if (!hasMarket()) return;
  const lot = CONFIG.tradeLot;
  const r = RESOURCES[id];
  if (buy) {
    const price = buyPrice(id);
    if (state.resources.money < price) {
      sound.play('error');
      showToast('Nicht genug Geld');
      return;
    }
    if (state.resources[id] + lot > storageCap(id)) {
      sound.play('error');
      showToast(`📦 Kein Platz im Lager für ${r.name}`);
      return;
    }
    addResources({ money: -price, [id]: lot });
    state.prices[id] = clamp(state.prices[id] * 1.04, 0.6, 1.6);   // Nachfrage macht teurer
  } else {
    if (state.resources[id] < lot) {
      sound.play('error');
      showToast(`Nicht genug ${r.name}`);
      return;
    }
    addResources({ [id]: -lot, money: sellPrice(id) });
    state.prices[id] = clamp(state.prices[id] * 0.96, 0.6, 1.6);
  }
  state.counters.trades = (state.counters.trades || 0) + 1;
  sound.play('coins');
  emit('trade', { id, buy });
  updateUI();
}

function updateProduction(dt) {
  for (let i = 0; i < state.grid.length; i++) {
    const cell = state.grid[i];
    if (!cell) continue;
    const def = BUILDINGS[cell.type];
    if (!def.interval) continue;
    if (!isActive(i % N, Math.floor(i / N))) continue;   // ohne Anschluss steht die Produktion still
    cell.timer += dt;
    while (cell.timer >= def.interval) {
      const raw = buildingOutput(cell.type);
      // Verarbeitung: ohne Rohstoff oder bei vollem Lager pausieren (Zeit läuft nicht weiter)
      if (def.consumes) {
        const full = Object.keys(raw).every(id => state.resources[id] >= storageCap(id));
        if (full || !canAfford(def.consumes)) {
          cell.waiting = full ? 'full' : 'input';
          cell.timer = def.interval;
          break;
        }
        cell.waiting = null;
        addResources(def.consumes, -1);
      }
      cell.timer -= def.interval;
      // Bruchteile je Gebäude aufsammeln, ausgezahlt werden ganze Einheiten
      cell.carry ||= {};
      const out = {};
      for (const [id, n] of Object.entries(raw)) {
        const total = n + (cell.carry[id] || 0);
        out[id] = Math.floor(total);
        cell.carry[id] = total - out[id];
      }
      const gained = Object.entries(out).filter(([, n]) => n > 0);
      if (gained.length === 0) continue;
      addResources(out);
      const x = i % N, y = Math.floor(i / N);
      spawnFloater(x, y, gained.map(([id, n]) => `+${n}${RESOURCES[id].icon}`).join(' '));
      emit('produce', { x, y, type: cell.type, out });
    }
  }
}

// =====================================================================
// EINWOHNER & ZUFRIEDENHEIT
// =====================================================================

// Besetzungsgrad einer Gebäudeart (1 = voll besetzt oder braucht kein Personal)
function staffOf(type) {
  return BUILDINGS[type].jobs ? (stats.staff[type] ?? 0) : 1;
}

function jobOf(type) {
  const jobs = BUILDINGS[type].jobs;
  return jobs ? Object.keys(jobs)[0] : null;
}

// Verteilt die Einwohner auf die Stellen der arbeitenden Gebäude
function computeJobs(activeTypes) {
  const demand = {};
  const typeDemand = {};
  for (const job in JOBS) demand[job] = 0;
  for (const type of activeTypes) {
    for (const [job, n] of Object.entries(BUILDINGS[type].jobs || {})) {
      demand[job] += n;
      typeDemand[type] = (typeDemand[type] || 0) + n;
    }
  }
  const pop = state.population;
  const scholarCap = Math.floor(CONFIG.baseScholars + pop * CONFIG.scholarShare * (stats.coverage.education || 0));
  const wanted = { ...demand, scholar: Math.min(demand.scholar, scholarCap) };
  const totalWanted = Object.values(wanted).reduce((a, b) => a + b, 0);
  // Reichen die Einwohner nicht, bekommt jeder Beruf denselben Anteil
  const ratio = totalWanted ? Math.min(1, pop / totalWanted) : 0;
  const assigned = {};
  let rest = Math.min(pop, totalWanted);
  for (const job in JOBS) {
    assigned[job] = Math.floor(wanted[job] * ratio);
    rest -= assigned[job];
  }
  for (const job in JOBS) {
    const add = Math.min(rest, wanted[job] - assigned[job]);
    assigned[job] += add;
    rest -= add;
  }
  // Farmen bekommen vorrangig so viele Arbeiter, wie für die Ernährung nötig sind (+10 %),
  // alle übrigen Arbeiter verteilen sich gleichmäßig auf die restlichen Stellen
  const farmDemand = typeDemand.farm || 0;
  const farm = BUILDINGS.farm;
  const foodPerWorker = farm.produces.food / farm.interval * (1 + productionBonus('farm')) * productivity() / farm.jobs.worker;
  const foodWorkers = Math.ceil(pop * CONFIG.foodPerCitizen * 1.1 / foodPerWorker);
  const farmFirst = Math.min(farmDemand, foodWorkers, assigned.worker);
  const restDemand = demand.worker - farmFirst;
  const share = restDemand ? (assigned.worker - farmFirst) / restDemand : 1;
  const staff = {};
  for (const type in typeDemand) {
    const job = jobOf(type);
    if (type === 'farm') staff[type] = (farmFirst + (farmDemand - farmFirst) * share) / farmDemand;
    else if (job === 'worker') staff[type] = share;
    else staff[type] = demand[job] ? assigned[job] / demand[job] : 1;
  }
  stats.staff = staff;
  stats.jobs = { demand, assigned, scholarCap, ratio };
  stats.unemployed = pop - Object.values(assigned).reduce((a, b) => a + b, 0);
}

function recalcStats() {
  const providers = [];
  const houses = [];
  let storage = CONFIG.baseStorage;
  let landmarks = 0;
  const activeCount = {};
  const activeTypes = [];
  state.grid.forEach((cell, i) => {
    if (!cell) return;
    const x = i % N, y = Math.floor(i / N);
    if (!isActive(x, y)) return;
    const def = BUILDINGS[cell.type];
    if (def.service) providers.push({ x, y, type: cell.type, ...def.service });
    if (def.population) houses.push({ i, x, y, cap: houseCapacity(x, y) });
    if (def.storage) storage += def.storage;
    if (def.landmark) landmarks += def.landmark;
    activeCount[cell.type] = (activeCount[cell.type] || 0) + 1;
    activeTypes.push(cell.type);
  });
  stats.activeCount = activeCount;
  computeJobs(activeTypes);
  stats.storage = storage;
  stats.niceHouses = houses.filter(h => h.cap > capacityOf(state.grid[h.i].type)).length;

  // Versorgung: Ein Haus ist versorgt, wenn ein Anbieter es im (quadratischen) Umkreis erreicht
  stats.capacity = 0;
  stats.houseNeeds = new Map();
  const covered = {};
  for (const need in NEEDS) covered[need] = 0;
  for (const h of houses) {
    stats.capacity += h.cap;
    // Versorgungsgrad = bester Anbieter in Reichweite, gewichtet mit dessen Besetzung
    const levels = new Map();
    for (const p of providers) {
      if (inRange(p.x, p.y, h.x, h.y, p.radius)) levels.set(p.need, Math.max(levels.get(p.need) || 0, staffOf(p.type)));
    }
    stats.houseNeeds.set(h.i, levels);
    for (const [need, level] of levels) covered[need] += h.cap * level;
  }
  for (const need in NEEDS) stats.coverage[need] = stats.capacity ? covered[need] / stats.capacity : 0;

  // Zufriedenheit aus Einzelfaktoren
  stats.level = levelFor(state.population);
  stats.starving = state.population > 0 && state.resources.food <= 0;
  const factors = [['Grundwert', HAPPINESS.base]];
  factors.push(stats.starving ? ['🍞 Nahrung fehlt', HAPPINESS.starving] : ['🍞 Nahrung', HAPPINESS.fed]);
  if (state.resources.bread > 0 && state.population > 0) factors.push(['🥖 Frisches Brot', HAPPINESS.bread]);
  if (season().happiness) factors.push([`${season().icon} ${season().name}`, season().happiness]);
  if (isFreezing()) factors.push(['🥶 Es ist kalt – Holz zum Heizen fehlt', -CONFIG.coldPenalty]);
  for (const [need, def] of Object.entries(NEEDS)) {
    const pct = Math.round(stats.coverage[need] * 100);
    factors.push([`${def.icon} ${def.name} (${pct} % versorgt)`, Math.round(def.weight * stats.coverage[need])]);
  }
  const techHappiness = techEffects().reduce((sum, e) => sum + (e.happiness || 0), 0);
  if (techHappiness) factors.push(['🔬 Forschung', techHappiness]);
  if (landmarks) factors.push(['🏛️ Sehenswürdigkeiten', landmarks]);
  const tax = TAXES[state.taxLevel];
  if (tax.happiness) factors.push([`💰 Steuern: ${tax.name}`, tax.happiness]);
  for (const e of state.effects) {
    if (e.happiness) factors.push([`${EVENTS[e.event].icon} ${EVENTS[e.event].name}`, e.happiness]);
  }
  if (state.population >= 10) {
    const share = stats.unemployed / state.population;
    const malus = Math.round(clamp((share - CONFIG.unemploymentTolerance) * 40, 0, CONFIG.unemploymentPenalty));
    if (malus) factors.push([`😴 Arbeitslose (${stats.unemployed})`, -malus]);
  }
  const penalty = LEVELS[stats.level].happinessPenalty;
  if (penalty) factors.push([`${LEVELS[stats.level].icon} Ansprüche als ${LEVELS[stats.level].name}`, -penalty]);
  stats.factors = factors;
  stats.happiness = clamp(factors.reduce((sum, [, v]) => sum + v, 0), 0, 100);

  if (stats.starving) stats.trend = 'Einwohner wandern ab – Nahrung fehlt';
  else if (stats.happiness < HAPPINESS.leaveBelow) stats.trend = 'Einwohner wandern ab – zu unzufrieden';
  else if (state.population >= stats.capacity) stats.trend = 'Alle Häuser belegt – baue mehr Häuser';
  else if (stats.happiness >= HAPPINESS.growAbove) stats.trend = 'Neue Einwohner ziehen zu';
  else stats.trend = `Kein Zuzug – Zufriedenheit unter ${HAPPINESS.growAbove}`;
}

let growthTimer = 0;
let foodDebt = 0;
let breadDebt = 0;

function updatePopulation(dt) {
  // Nahrung wird laufend verbraucht
  foodDebt += state.population * CONFIG.foodPerCitizen * dt;
  if (foodDebt >= 1) {
    const eaten = Math.floor(foodDebt);
    foodDebt -= eaten;
    state.resources.food = Math.max(0, state.resources.food - eaten);
  }
  // Brot ist ein Extra: wird nur gegessen, solange welches da ist
  if (state.resources.bread > 0) {
    breadDebt += state.population * CONFIG.breadPerCitizen * dt;
    if (breadDebt >= 1) {
      const eaten = Math.floor(breadDebt);
      breadDebt -= eaten;
      state.resources.bread = Math.max(0, state.resources.bread - eaten);
    }
  }

  // Weniger Wohnplätze (Abriss, Straße weg): überzählige Einwohner ziehen sofort aus
  if (state.population > stats.capacity) state.population = stats.capacity;

  growthTimer += dt;
  if (growthTimer < CONFIG.growthSeconds) return;
  growthTimer = 0;
  recalcStats();

  if (stats.starving || stats.happiness < HAPPINESS.leaveBelow) {
    if (state.population > 0) {
      const loss = Math.max(1, Math.floor(state.population * CONFIG.leaveRate));
      state.population -= loss;
      showToast(stats.starving
        ? `😟 Nahrung fehlt – ${loss} Einwohner wandern ab`
        : `😠 Unzufrieden – ${loss} Einwohner wandern ab`);
    }
  } else if (stats.happiness >= HAPPINESS.growAbove && state.population < stats.capacity) {
    const free = stats.capacity - state.population;
    state.population += Math.min(free, Math.max(1, Math.floor(free * CONFIG.growthRate)));
  }
  checkLevel();
  recalcStats();
}

function checkLevel() {
  const level = levelFor(state.population);
  if (level <= state.maxLevel) return;
  state.maxLevel = level;
  const unlocked = Object.values(BUILDINGS)
    .filter(def => def.unlockLevel === level)
    .map(def => `${def.icon} ${def.name}`);
  showToast(`🎉 ${LEVELS[level].name} erreicht!` + (unlocked.length ? ` Neu: ${unlocked.join(', ')}` : ''), 4000);
  emit('levelup', { level });
}

// =====================================================================
// AUFTRÄGE
// =====================================================================

const notifiedQuests = new Set();   // schon als erfüllt gemeldet (nur zur Laufzeit)

on('produce', ({ out }) => {
  for (const [id, n] of Object.entries(out)) {
    if (n > 0) state.produced[id] = (state.produced[id] || 0) + n;
  }
});

function countBuildings(type) {
  return state.grid.filter(cell => cell && cell.type === type).length;
}

function questProgress(quest) {
  const g = quest.goal;
  let current = 0;
  switch (g.type) {
    case 'build':      current = countBuildings(g.building); break;
    case 'population': current = state.population; break;
    case 'happiness':  current = stats.happiness; break;
    case 'resource':   current = state.resources[g.resource]; break;
    case 'produced':   current = state.produced[g.resource] || 0; break;
    case 'research':   current = state.techs.length; break;
    case 'jobs':       current = stats.jobs.assigned[g.job] || 0; break;
    case 'winters':    current = state.counters.winters || 0; break;
  }
  return { current: Math.min(current, g.count), target: g.count, done: current >= g.count };
}

function goalText(goal) {
  switch (goal.type) {
    case 'build': {
      const def = BUILDINGS[goal.building];
      return `Baue ${goal.count}× ${def.icon} ${def.name}`;
    }
    case 'population': return `Erreiche 👥 ${goal.count} Einwohner`;
    case 'happiness':  return `Erreiche Zufriedenheit ${goal.count}`;
    case 'resource':   return `Habe ${goal.count} ${RESOURCES[goal.resource].icon} ${RESOURCES[goal.resource].name} auf Vorrat`;
    case 'produced':   return `Erzeuge insgesamt ${goal.count} ${RESOURCES[goal.resource].icon} ${RESOURCES[goal.resource].name}`;
    case 'research':   return goal.count === 1 ? 'Erforsche eine Technologie 🔬' : `Erforsche ${goal.count} Technologien 🔬`;
    case 'jobs':       return `Beschäftige ${goal.count} ${JOBS[goal.job].icon} ${JOBS[goal.job].name}`;
    case 'winters':    return goal.count === 1 ? 'Überstehe einen Winter ❄️' : `Überstehe ${goal.count} Winter ❄️`;
  }
  return '';
}

function activeQuests() {
  return QUESTS.filter(q => !state.questsClaimed.includes(q.id)).slice(0, CONFIG.activeQuests);
}

// Meldet neu erfüllte Aufträge. silent: beim Laden nicht alles auf einmal melden
function checkQuests(silent = false) {
  for (const q of activeQuests()) {
    if (notifiedQuests.has(q.id) || !questProgress(q).done) continue;
    notifiedQuests.add(q.id);
    if (!silent) showToast(`✅ Auftrag erfüllt: ${q.title} – Belohnung abholen!`, 3000);
    emit('questComplete', { id: q.id });
  }
}

function claimQuest(id) {
  const quest = QUESTS.find(q => q.id === id);
  if (!quest || state.questsClaimed.includes(id) || !questProgress(quest).done) return;
  addResources(quest.reward);
  state.questsClaimed.push(id);
  showToast(`🎁 Belohnung: ${formatAmounts(quest.reward)}`);
  emit('questClaimed', { id });
  checkQuests();
  updateUI();
}

// =====================================================================
// ZUFALLSEREIGNISSE
// =====================================================================

function randomBetween(min, max) { return min + Math.random() * (max - min); }
function randomItem(list) { return list[Math.floor(Math.random() * list.length)]; }

function addEffect(eventId, duration, effect) {
  state.effects.push({ event: eventId, left: duration, ...effect });
}

function runEvent(id) {
  const ev = EVENTS[id];
  if (ev.start) return ev.start() !== false;
  addEffect(id, ev.duration, ev.effect);
  showEventPopup(ev.icon, ev.name, ev.text);
  return true;
}

// Zieht ein Ereignis nach Gewicht; passt es gerade nicht, wird das nächste versucht
function triggerRandomEvent() {
  let pool = Object.keys(EVENTS).filter(id => state.population >= (EVENTS[id].minPop || 0) &&
    (!EVENTS[id].seasons || EVENTS[id].seasons.includes(season().id)));
  while (pool.length) {
    let r = Math.random() * pool.reduce((sum, id) => sum + EVENTS[id].weight, 0);
    const id = pool.find(p => (r -= EVENTS[p].weight) < 0) || pool[pool.length - 1];
    if (runEvent(id)) {
      emit('event', { id });
      return;
    }
    pool = pool.filter(p => p !== id);
  }
}

function updateEvents(dt) {
  state.nextEventIn -= dt;
  if (state.nextEventIn <= 0) {
    state.nextEventIn = randomBetween(...CONFIG.eventSeconds);
    triggerRandomEvent();
  }

  for (const e of state.effects) e.left -= dt;
  for (const e of state.effects.filter(e => e.left <= 0)) {
    showToast(`${EVENTS[e.event].icon} ${EVENTS[e.event].name} ist vorbei`);
  }
  state.effects = state.effects.filter(e => e.left > 0);

  updateFires(dt);
}

// ---------- Feuer ----------

function fireProtected(x, y) {
  return state.grid.some((cell, i) => {
    const r = cell && BUILDINGS[cell.type].fireRadius;
    return r && staffOf(cell.type) > 0 && isActive(i % N, Math.floor(i / N)) && inRange(i % N, Math.floor(i / N), x, y, r);
  });
}

function burnableCells() {
  const list = [];
  state.grid.forEach((cell, i) => {
    if (cell && !cell.fire && !BUILDINGS[cell.type].isRoad) list.push(i);
  });
  return list;
}

function igniteCell(i) {
  const x = i % N, y = Math.floor(i / N);
  const brigade = fireProtected(x, y);
  const resistant = hasFlag('fireResistant');   // Steinmauern
  const seconds = brigade ? CONFIG.fireBrigadeSeconds : CONFIG.fireBurnSeconds * (resistant ? 2 : 1);
  state.grid[i].fire = {
    left: seconds,
    max: seconds,
    brigade,                            // Feuerwache in Reichweite löscht automatisch
    canSpread: !brigade && !resistant,  // ungelöschte Brände können einmal übergreifen
  };
  return brigade;
}

function startFire() {
  const candidates = burnableCells();
  if (candidates.length === 0) return false;
  const i = randomItem(candidates);
  const def = BUILDINGS[state.grid[i].type];
  const brigade = igniteCell(i);
  showEventPopup('🔥', 'Feuer!', brigade
    ? `${def.icon} ${def.name} brennt! Die Feuerwache ist schon unterwegs.`
    : `${def.icon} ${def.name} brennt, und keine Feuerwache ist in der Nähe! ` +
      `Tippe das Gebäude an und lösche es für ${formatAmounts(CONFIG.extinguishCost)} – ` +
      `sonst brennt es in ${Math.round(state.grid[i].fire.max)} Sekunden ab.`);
  return true;
}

function spreadFire(i) {
  const x = i % N, y = Math.floor(i / N);
  const targets = neighbors(x, y).filter(n => n.cell && !n.cell.fire && !BUILDINGS[n.cell.type].isRoad);
  if (targets.length === 0) return;
  const t = randomItem(targets);
  igniteCell(t.y * N + t.x);
  showToast(`🔥 Das Feuer greift auf ${BUILDINGS[t.cell.type].name} über!`, 3000);
}

function updateFires(dt) {
  state.grid.forEach((cell, i) => {
    if (!cell || !cell.fire) return;
    const f = cell.fire;
    f.left -= dt;
    if (f.canSpread && f.left <= (f.max || CONFIG.fireBurnSeconds) / 2) {
      f.canSpread = false;
      if (Math.random() < 0.4) spreadFire(i);
    }
    if (f.left > 0) return;
    const def = BUILDINGS[cell.type];
    const x = i % N, y = Math.floor(i / N);
    if (f.brigade) {
      delete cell.fire;
      state.counters.extinguished = (state.counters.extinguished || 0) + 1;
      showToast(`🚒 Feuer gelöscht: ${def.name}`);
    } else {
      state.grid[i] = null;
      if (infoTile && infoTile.x === x && infoTile.y === y) closeInfo();
      showToast(`🔥 ${def.name} ist abgebrannt`, 3000);
      emit('burned', { x, y, type: cell.type });
    }
    recalcStats();
  });
}

function extinguish(x, y) {
  const cell = getCell(x, y);
  if (!cell || !cell.fire) return;
  if (!canAfford(CONFIG.extinguishCost)) {
    sound.play('error');
    showToast(`Nicht genug ${missingText(CONFIG.extinguishCost)} zum Löschen`);
    return;
  }
  addResources(CONFIG.extinguishCost, -1);
  delete cell.fire;
  state.counters.extinguished = (state.counters.extinguished || 0) + 1;
  sound.play('extinguish');
  showToast(`💧 ${BUILDINGS[cell.type].name} gelöscht`);
  recalcStats();
  updateUI();
}

// ---------- Seuche ----------

function startPlague() {
  if (state.population === 0) return false;
  const health = stats.coverage.health;
  // Gesundheitsversorgung mildert die Folgen, Kanalisation halbiert sie
  const severity = (1 - health) * (hasFlag('plagueResistant') ? 0.5 : 1);
  const loss = Math.floor(state.population * 0.1 * severity);
  const malus = Math.round(-20 * severity);
  state.population -= loss;
  if (malus < 0) addEffect('plague', 60, { happiness: malus });
  showEventPopup('🦠', 'Seuche', [
    'Eine Krankheit geht in der Stadt um.',
    loss > 0 ? `${loss} Einwohner verlassen die Stadt.` : 'Niemand verlässt die Stadt.',
    malus < 0 ? `Zufriedenheit ${malus} für 60 Sekunden.` : '',
    `Gesundheitsversorgung: ${Math.round(health * 100)} % – Brunnen und Krankenhäuser schützen.`,
  ].filter(Boolean).join(' '));
  return true;
}

// ---------- Händlerkarawane ----------

function offerTrade() {
  const res = randomItem(['wood', 'stone', 'food']);
  const amount = 20 + 10 * Math.floor(Math.random() * 4);   // 20–50
  const sell = state.resources[res] >= amount && Math.random() < 0.5;
  const price = Math.round(amount * (sell ? 1.5 : 2.5));
  const give = sell ? { [res]: amount } : { money: price };
  const get = sell ? { money: price } : { [res]: amount };
  const r = RESOURCES[res];
  const text = sell
    ? `Händler möchten ${amount} ${r.icon} ${r.name} kaufen und bieten ${price} 💰 Geld.`
    : `Händler bieten ${amount} ${r.icon} ${r.name} für ${price} 💰 Geld an.`;
  showEventPopup('🐪', 'Händlerkarawane', text, [
    { label: 'Ablehnen' },
    {
      label: 'Annehmen', primary: true,
      action: () => {
        if (!canAfford(give)) {
          sound.play('error');
          showToast(`Nicht genug ${missingText(give)}`);
          return false;   // Fenster bleibt offen
        }
        addResources(give, -1);
        addResources(get);
        state.counters.trades = (state.counters.trades || 0) + 1;
        showToast('🤝 Handel abgeschlossen');
        updateUI();
      },
    },
  ]);
  return true;
}

// =====================================================================
// FORSCHUNG
// =====================================================================

// 'done' | 'running' | 'locked' (Voraussetzung fehlt) | 'available'
function techStatus(id) {
  if (state.techs.includes(id)) return 'done';
  if (state.research?.id === id) return 'running';
  if ((TECHS[id].requires || []).some(r => !state.techs.includes(r))) return 'locked';
  return 'available';
}

function startResearch(id) {
  const tech = TECHS[id];
  if (techStatus(id) !== 'available') return;
  if (state.research) {
    sound.play('error');
    showToast('Es läuft bereits eine Forschung');
    return;
  }
  if (!canAfford(tech.cost)) {
    sound.play('error');
    showToast(`Nicht genug ${missingText(tech.cost)}`);
    return;
  }
  addResources(tech.cost, -1);
  state.research = { id, left: tech.seconds };
  showToast(`🔬 Forschung gestartet: ${tech.name}`);
  updateUI();
}

function updateResearch(dt) {
  if (!state.research) return;
  state.research.left -= dt;
  if (state.research.left > 0) return;
  const id = state.research.id;
  const tech = TECHS[id];
  state.research = null;
  state.techs.push(id);
  const unlocked = Object.values(BUILDINGS).filter(b => b.requiresTech === id).map(b => `${b.icon} ${b.name}`);
  showToast(`🔬 Erforscht: ${tech.icon} ${tech.name}` + (unlocked.length ? ` – neu: ${unlocked.join(', ')}` : ''), 3500);
  emit('researched', { id });
  recalcStats();
  updateUI();
}

// =====================================================================
// ERFOLGE, TÄGLICHE BELOHNUNG, OFFLINE-EINNAHMEN
// =====================================================================

function producingCount() {
  return state.grid.filter((cell, i) =>
    cell && BUILDINGS[cell.type].interval && isActive(i % N, Math.floor(i / N))).length;
}

// silent: beim Start nur eine Sammelmeldung statt vieler einzelner
function checkAchievements(silent = false) {
  const fresh = ACHIEVEMENTS.filter(a => !state.achievements.includes(a.id) && a.check());
  if (fresh.length === 0) return;
  for (const a of fresh) {
    state.achievements.push(a.id);
    emit('achievement', { id: a.id });
  }
  if (silent) {
    showToast(`🏆 ${fresh.length} ${fresh.length === 1 ? 'Erfolg' : 'Erfolge'} freigeschaltet`, 3000);
  } else {
    showToast(`🏆 Erfolg: ${fresh[0].icon} ${fresh[0].name}`, 3500);
    sound.play('research');
  }
}

function dateString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function checkDailyReward() {
  const today = dateString(new Date());
  if (state.daily.last === today) return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const streak = state.daily.last === dateString(yesterday) ? state.daily.streak + 1 : 1;
  const reward = DAILY_REWARDS[Math.min(streak, DAILY_REWARDS.length) - 1];
  state.daily = { last: today, streak };
  showEventPopup('🎁', `Tägliche Belohnung – Tag ${streak}`, [
    streak > 1 ? `${streak} Tage in Folge – weiter so! 🔥` : 'Schön, dass du da bist!',
    `Belohnung: ${formatAmounts(reward)}`,
    streak < DAILY_REWARDS.length ? 'Komm morgen wieder – dann gibt es mehr.' : '',
  ].filter(Boolean).join('\n'), [{
    label: 'Abholen', primary: true,
    action: () => { addResources(reward); sound.play('coins'); updateUI(); },
  }]);
  save();
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} Std. ${m} Min.` : `${Math.max(1, m)} Min.`;
}

// Was die Stadt in der Abwesenheit erwirtschaftet hat (gedeckelt, mit verminderter Kraft)
function applyOfflineProgress(savedAt) {
  if (!savedAt) return;
  const away = (Date.now() - savedAt) / 1000;
  if (away < 60) return;
  const secs = Math.min(away, CONFIG.offlineMaxHours * 3600);

  // Brände haben die Bewohner inzwischen selbst gelöscht
  state.grid.forEach(cell => { if (cell) delete cell.fire; });
  recalcStats();

  const rates = {};   // Ertrag pro Sekunde
  const processors = [];
  state.grid.forEach((cell, i) => {
    const def = cell && BUILDINGS[cell.type];
    if (!def || !def.interval || !isActive(i % N, Math.floor(i / N))) return;
    if (def.consumes) { processors.push(cell.type); return; }
    for (const [id, n] of Object.entries(buildingOutput(cell.type))) rates[id] = (rates[id] || 0) + n / def.interval;
  });
  rates.money = (rates.money || 0) + state.population * TAXES[state.taxLevel].perCitizen / CONFIG.taxInterval;
  rates.food = (rates.food || 0) - state.population * CONFIG.foodPerCitizen;
  // Verarbeitung läuft nur so weit, wie Rohstoffe (Vorrat + Zufluss) reichen
  const eff = secs * CONFIG.offlineEfficiency;
  for (const type of processors) {
    const def = BUILDINGS[type];
    let share = 1;
    for (const [id, n] of Object.entries(def.consumes)) {
      const need = n / def.interval * eff;
      const avail = Math.max(0, state.resources[id] + (rates[id] || 0) * eff);
      share = Math.min(share, avail / need);
    }
    for (const [id, n] of Object.entries(def.consumes)) rates[id] = (rates[id] || 0) - share * n / def.interval;
    for (const [id, n] of Object.entries(buildingOutput(type))) rates[id] = (rates[id] || 0) + share * n / def.interval;
  }
  if (state.resources.bread > 0 || rates.bread > 0) rates.bread = (rates.bread || 0) - state.population * CONFIG.breadPerCitizen;
  if (season().heating) rates.wood = (rates.wood || 0) - heatingRate();

  const before = { ...state.resources };
  for (const [id, rate] of Object.entries(rates)) {
    const amount = Math.floor(rate * secs * CONFIG.offlineEfficiency);
    if (amount > 0) addResources({ [id]: amount });
    else state.resources[id] = Math.max(0, state.resources[id] + amount);
  }

  // Forschung, Ereignisse und Tageszeit laufen weiter
  if (state.research) state.research.left = Math.max(0.1, state.research.left - secs);
  for (const e of state.effects) e.left -= secs;
  state.effects = state.effects.filter(e => e.left > 0);
  state.dayTime = (state.dayTime + secs / CONFIG.dayLength) % 1;
  state.yearTime = (state.yearTime + secs) % (CONFIG.seasonLength * SEASONS.length);

  const changes = Object.keys(RESOURCES)
    .map(id => [id, state.resources[id] - before[id]])
    .filter(([, d]) => d !== 0)
    .map(([id, d]) => `${d > 0 ? '+' : '−'}${Math.abs(d)} ${RESOURCES[id].icon} ${RESOURCES[id].name}`);
  showEventPopup('🌙', 'Willkommen zurück!', [
    `Du warst ${formatDuration(away)} weg.` +
      (away > secs ? ` Gezählt werden höchstens ${CONFIG.offlineMaxHours} Stunden.` : ''),
    'Deine Stadt hat in der Zeit mit verminderter Kraft weitergearbeitet:',
    changes.length ? changes.join('\n') : 'Es wurde nichts produziert.',
    state.resources.food === 0 && state.population > 0 ? '⚠️ Die Nahrung ist aufgebraucht!' : '',
  ].filter(Boolean).join('\n'));
  recalcStats();
}

// =====================================================================
// JAHRESZEITEN
// =====================================================================

function seasonIndex(yearTime = state.yearTime) {
  const i = Math.floor(yearTime / CONFIG.seasonLength) % SEASONS.length;
  return Number.isFinite(i) ? (i + SEASONS.length) % SEASONS.length : 0;
}

function season() {
  return SEASONS[seasonIndex()];
}

function seasonLeft() {
  return CONFIG.seasonLength - (state.yearTime % CONFIG.seasonLength);
}

function heatingRate() {
  return state.population * CONFIG.heatingPerCitizen * (hasFlag('heatingSaver') ? 0.5 : 1);
}

function isFreezing() {
  return !!season().heating && state.population > 0 && state.resources.wood <= 0;
}

function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

let heatDebt = 0;

function updateSeasons(dt) {
  const before = seasonIndex();
  state.yearTime = (state.yearTime + dt) % (CONFIG.seasonLength * SEASONS.length);
  const now = seasonIndex();

  // Heizen im Winter
  if (season().heating && state.population > 0) {
    heatDebt += heatingRate() * dt;
    if (heatDebt >= 1) {
      const burned = Math.floor(heatDebt);
      heatDebt -= burned;
      state.resources.wood = Math.max(0, state.resources.wood - burned);
    }
    if (isFreezing()) state.coldThisWinter += dt;
  }

  if (now !== before) onSeasonChange(SEASONS[before], SEASONS[now]);
}

function onSeasonChange(prev, next) {
  if (prev.heating) {
    state.counters.winters = (state.counters.winters || 0) + 1;
    if (state.coldThisWinter === 0 && state.population >= 50) state.counters.warmWinters = (state.counters.warmWinters || 0) + 1;
  }
  if (next.heating) state.coldThisWinter = 0;
  const hints = {
    spring: 'Der Schnee schmilzt – die Felder werden wieder bestellt.',
    summer: 'Gute Ernte: Farmen liefern mehr.',
    autumn: `Erntezeit! Lege Vorräte für den Winter an – etwa 🪵 ${Math.ceil(heatingRate() * CONFIG.seasonLength)} zum Heizen und Nahrung, denn im Winter wächst kaum etwas.`,
    winter: 'Die Felder ruhen, die Häuser müssen geheizt werden.',
  };
  showToast(`${next.icon} ${next.name}: ${hints[next.id]}`, 4500);
  sound.play('event');
  emit('season', { id: next.id });
}

function update(dt) {
  state.dayTime = (state.dayTime + dt / CONFIG.dayLength) % 1;
  updateSeasons(dt);
  updateProduction(dt);
  updatePopulation(dt);
  updateEvents(dt);
  updateResearch(dt);
  updateTaxes(dt);
  updatePrices(dt);
}

// =====================================================================
// SPEICHERN / LADEN
// =====================================================================

function save() {
  const buildings = [];
  state.grid.forEach((cell, i) => {
    if (cell) buildings.push({ x: i % N, y: Math.floor(i / N), type: cell.type, timer: cell.timer, fire: cell.fire });
  });
  const data = {
    v: CONFIG.saveVersion,
    savedAt: Date.now(),   // für spätere Offline-Einnahmen
    gridSize: N,
    resources: state.resources,
    population: state.population,
    maxLevel: state.maxLevel,
    questsClaimed: state.questsClaimed,
    produced: state.produced,
    effects: state.effects,
    nextEventIn: state.nextEventIn,
    techs: state.techs,
    research: state.research,
    dayTime: state.dayTime,
    yearTime: state.yearTime,
    coldThisWinter: state.coldThisWinter,
    taxLevel: state.taxLevel,
    prices: state.prices,
    counters: state.counters,
    achievements: state.achievements,
    daily: state.daily,
    buildings,
  };
  try {
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(data));
  } catch (e) {
    console.warn('Speichern fehlgeschlagen', e);
  }
}

// Rest einer Division, immer im Bereich 0 … m (auch für negative Werte)
function positiveMod(v, m) {
  return ((v % m) + m) % m;
}

let lastSavedAt = null;   // Zeitpunkt des geladenen Spielstands (für Offline-Einnahmen)

function load() {
  newGame();
  let data;
  try {
    data = JSON.parse(localStorage.getItem(CONFIG.saveKey));
  } catch (e) {
    return false;
  }
  if (!data || data.v !== CONFIG.saveVersion) return false;
  for (const id in RESOURCES) {
    if (typeof data.resources?.[id] === 'number') state.resources[id] = data.resources[id];
  }
  // Spielstand von einer kleineren Karte: Stadt in die Mitte der neuen Karte schieben
  const offset = Math.max(0, Math.floor((N - (data.gridSize || 16)) / 2));
  for (const b of data.buildings || []) {
    b.x += offset;
    b.y += offset;
    if (BUILDINGS[b.type] && getCell(b.x, b.y) === null) {
      const cell = { type: b.type, timer: b.timer || 0 };
      if (b.fire && typeof b.fire.left === 'number') cell.fire = b.fire;
      state.grid[b.y * N + b.x] = cell;
    }
  }
  if (Array.isArray(data.effects)) {
    state.effects = data.effects.filter(e => EVENTS[e.event] && typeof e.left === 'number');
  }
  if (typeof data.nextEventIn === 'number') state.nextEventIn = data.nextEventIn;
  if (Array.isArray(data.techs)) state.techs = data.techs.filter(id => TECHS[id]);
  if (data.research && TECHS[data.research.id] && typeof data.research.left === 'number') {
    state.research = data.research;
  }
  if (Number.isFinite(data.dayTime)) state.dayTime = positiveMod(data.dayTime, 1);
  // Negative Werte (alter Fehler) zählen als Frühlingsanfang
  if (Number.isFinite(data.yearTime)) state.yearTime = positiveMod(Math.max(0, data.yearTime), CONFIG.seasonLength * SEASONS.length);
  if (typeof data.coldThisWinter === 'number') state.coldThisWinter = data.coldThisWinter;
  if (typeof data.taxLevel === 'number') state.taxLevel = clamp(data.taxLevel, 0, TAXES.length - 1);
  for (const id in state.prices) {
    if (typeof data.prices?.[id] === 'number') state.prices[id] = clamp(data.prices[id], 0.6, 1.6);
  }
  if (data.counters && typeof data.counters === 'object') state.counters = data.counters;
  if (Array.isArray(data.achievements)) {
    state.achievements = data.achievements.filter(id => ACHIEVEMENTS.some(a => a.id === id));
  }
  if (data.daily && typeof data.daily.streak === 'number') state.daily = data.daily;
  lastSavedAt = data.savedAt || null;
  if (typeof data.population === 'number') state.population = data.population;
  if (typeof data.maxLevel === 'number') state.maxLevel = clamp(data.maxLevel, 0, LEVELS.length - 1);
  if (Array.isArray(data.questsClaimed)) {
    state.questsClaimed = data.questsClaimed.filter(id => QUESTS.some(q => q.id === id));
  }
  for (const id in RESOURCES) {
    if (typeof data.produced?.[id] === 'number') state.produced[id] = data.produced[id];
  }
  return true;
}

// =====================================================================
// KAMERA / DARSTELLUNG
// =====================================================================

const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');
const view = { x: 0, y: 0, zoom: 1, w: 0, h: 0, dpr: 1 };
let selectedType = null;   // gewähltes Gebäude in der Bauleiste
let infoMode = null;       // null | 'tile' | 'city'
let infoTile = null;       // {x, y} des angezeigten Gebäudes
let hoverTile = null;      // Maus-Vorschau
let floaters = [];

function resize() {
  const rect = canvas.getBoundingClientRect();
  const first = view.w === 0;
  view.dpr = window.devicePixelRatio || 1;
  view.w = rect.width;
  view.h = rect.height;
  canvas.width = Math.round(rect.width * view.dpr);
  canvas.height = Math.round(rect.height * view.dpr);
  if (first) fitMap();
  clampView();
}

// Kleinster Zoom: so weit, dass die ganze Karte auf den Bildschirm passt
function minZoom() {
  return Math.min(CONFIG.minZoom, Math.min(view.w, view.h) / (N * T) * 0.95);
}

// Startansicht: mittlere Zoomstufe, zentriert auf die bebauten Felder (sonst Kartenmitte)
function fitMap() {
  view.zoom = clamp(view.w / (CONFIG.startTilesVisible * T), minZoom(), CONFIG.maxZoom);
  let x0 = N, y0 = N, x1 = -1, y1 = -1;
  state.grid.forEach((cell, i) => {
    if (!cell) return;
    const x = i % N, y = Math.floor(i / N);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y);
    x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  });
  const cx = x1 >= 0 ? (x0 + x1 + 1) / 2 : N / 2;
  const cy = y1 >= 0 ? (y0 + y1 + 1) / 2 : N / 2;
  view.x = view.w / 2 - cx * T * view.zoom;
  view.y = view.h / 2 - cy * T * view.zoom;
}

// Die Bildschirmmitte bleibt immer über der Karte
function clampView() {
  const mapPx = N * T * view.zoom;
  view.x = clamp(view.x, view.w / 2 - mapPx, view.w / 2);
  view.y = clamp(view.y, view.h / 2 - mapPx, view.h / 2);
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function screenToTile(sx, sy) {
  return {
    x: Math.floor((sx - view.x) / view.zoom / T),
    y: Math.floor((sy - view.y) / view.zoom / T),
  };
}

function zoomAt(sx, sy, newZoom) {
  newZoom = clamp(newZoom, minZoom(), CONFIG.maxZoom);
  const wx = (sx - view.x) / view.zoom;
  const wy = (sy - view.y) / view.zoom;
  view.zoom = newZoom;
  view.x = sx - wx * newZoom;
  view.y = sy - wy * newZoom;
  clampView();
}

function spawnFloater(x, y, text) {
  floaters.push({ x: (x + 0.5) * T, y: y * T + T * 0.3, text, age: 0 });
}

function render(dt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#1b4332';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const s = view.dpr * view.zoom;
  ctx.setTransform(s, 0, 0, s, view.dpr * view.x, view.dpr * view.y);

  // Boden
  ctx.fillStyle = groundColor();
  ctx.fillRect(0, 0, N * T, N * T);

  // Rasterlinien
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1 / view.zoom;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    ctx.moveTo(i * T, 0); ctx.lineTo(i * T, N * T);
    ctx.moveTo(0, i * T); ctx.lineTo(N * T, i * T);
  }
  ctx.stroke();

  drawServiceAreas();

  // Straßen zuerst, damit sie unter allem liegen
  for (let i = 0; i < state.grid.length; i++) {
    const cell = state.grid[i];
    if (cell && BUILDINGS[cell.type].isRoad) drawRoad(i % N, Math.floor(i / N), BUILDINGS[cell.type], 1);
  }
  drawWalkers();

  // Gebäude
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < state.grid.length; i++) {
    const cell = state.grid[i];
    if (!cell || BUILDINGS[cell.type].isRoad) continue;
    const x = i % N, y = Math.floor(i / N);
    const active = isActive(x, y);
    const age = (performance.now() - (cell.builtAt || 0)) / 1000;
    const scale = age < 0.35 ? easeOutBack(age / 0.35) : 1;   // Plopp beim Bauen
    drawBuilding(x, y, BUILDINGS[cell.type], active || cell.fire ? 1 : 0.55, scale);
    if (cell.fire) {
      drawFire(x, y, cell.fire);
    } else if (active && cell.waiting) {
      ctx.font = `${T * 0.28}px ${EMOJI_FONT}`;
      ctx.fillText('⏸️', (x + 0.8) * T, (y + 0.22) * T);
    } else if (active && BUILDINGS[cell.type].population && isNiceHouse(x, y)) {
      ctx.font = `${T * 0.26}px ${EMOJI_FONT}`;
      ctx.fillText('✨', (x + 0.2) * T, (y + 0.22) * T);
    } else if (!active) {
      ctx.font = `${T * 0.3}px ${EMOJI_FONT}`;
      ctx.fillText('⚠️', (x + 0.8) * T, (y + 0.22) * T);
    }
  }

  drawSmoke();

  // Nacht: abdunkeln, dann Lichter darüber
  const dark = darkness();
  if (dark > 0) {
    ctx.fillStyle = `rgba(10, 20, 55, ${dark})`;
    ctx.fillRect(0, 0, N * T, N * T);
    drawLights(dark);
  }
  if (season().heating && settings.daynight) drawSnow(dt, s);

  // Bau-Vorschau unter der Maus
  if (selectedType && hoverTile && getCell(hoverTile.x, hoverTile.y) === null) {
    const def = BUILDINGS[selectedType];
    if (def.isRoad) drawRoad(hoverTile.x, hoverTile.y, def, 0.5);
    else drawBuilding(hoverTile.x, hoverTile.y, def, 0.5);
    if (!canAfford(costOf(selectedType))) outlineTile(hoverTile, '#c0392b');
  } else if (hoverTile && getCell(hoverTile.x, hoverTile.y) !== undefined) {
    outlineTile(hoverTile, 'rgba(255,255,255,0.6)');
  }

  if (infoTile) outlineTile(infoTile, '#ffd166');

  // Schwebende Ertragsanzeigen
  ctx.font = `bold ${T * 0.3}px system-ui, sans-serif`;
  floaters = floaters.filter(f => (f.age += dt) < 1.2);
  for (const f of floaters) {
    ctx.globalAlpha = 1 - f.age / 1.2;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3 / view.zoom;
    const fy = f.y - f.age * T * 0.6;
    ctx.strokeText(f.text, f.x, fy);
    ctx.fillText(f.text, f.x, fy);
  }
  ctx.globalAlpha = 1;
}

// Wirkungsbereiche von Versorgungsgebäuden: beim Bauen (alle gleicher Art + Vorschau)
// und für das gerade angezeigte Gebäude
function drawServiceAreas() {
  const selArea = selectedType && areaOf(BUILDINGS[selectedType]);
  if (selArea) {
    state.grid.forEach((cell, i) => {
      const area = cell && areaOf(BUILDINGS[cell.type]);
      if (area && area.key === selArea.key) drawArea(i % N, Math.floor(i / N), area.radius, 'rgba(255,255,255,0.15)');
    });
    if (hoverTile && getCell(hoverTile.x, hoverTile.y) === null) {
      drawArea(hoverTile.x, hoverTile.y, selArea.radius, 'rgba(255,209,102,0.3)');
    }
  }
  const infoCell = infoTile && getCell(infoTile.x, infoTile.y);
  const infoArea = infoCell && areaOf(BUILDINGS[infoCell.type]);
  if (infoArea) drawArea(infoTile.x, infoTile.y, infoArea.radius, 'rgba(255,209,102,0.3)');
}

function drawFire(x, y, fire) {
  const t = performance.now() / 1000;
  ctx.fillStyle = `rgba(230, 57, 70, ${0.35 + 0.15 * Math.sin(t * 8)})`;
  ctx.fillRect(x * T, y * T, T, T);
  const size = T * (0.5 + 0.06 * Math.sin(t * 11 + x + y));
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.fillText(fire.brigade ? '🚒' : '🔥', (x + 0.5) * T, (y + 0.45) * T);
  // Restzeit als Balken
  const max = fire.max || (fire.brigade ? CONFIG.fireBrigadeSeconds : CONFIG.fireBurnSeconds);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x * T + 4, (y + 1) * T - 8, T - 8, 4);
  ctx.fillStyle = fire.brigade ? '#4dabf7' : '#ffd166';
  ctx.fillRect(x * T + 4, (y + 1) * T - 8, (T - 8) * Math.max(0, fire.left / max), 4);
}

function drawArea(x, y, r, color) {
  const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r);
  const x1 = Math.min(N - 1, x + r), y1 = Math.min(N - 1, y + r);
  ctx.fillStyle = color;
  ctx.fillRect(x0 * T, y0 * T, (x1 - x0 + 1) * T, (y1 - y0 + 1) * T);
}

const EMOJI_FONT = 'system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

function drawBuilding(x, y, def, alpha, scale = 1) {
  const pad = T * 0.06;
  ctx.save();
  if (scale !== 1) {
    ctx.translate((x + 0.5) * T, (y + 0.5) * T);
    ctx.scale(scale, scale);
    ctx.translate(-(x + 0.5) * T, -(y + 0.5) * T);
  }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = def.color;
  roundRect(x * T + pad, y * T + pad, T - pad * 2, T - pad * 2, T * 0.15);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.font = `${T * 0.6}px ${EMOJI_FONT}`;
  ctx.fillText(def.icon, (x + 0.5) * T, (y + 0.54) * T);
  ctx.restore();
}

// Bodenfarbe der Jahreszeit, in den letzten 20 Sekunden fließender Übergang zur nächsten
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function groundColor() {
  const cur = hexToRgb(season().ground);
  const next = hexToRgb(SEASONS[(seasonIndex() + 1) % SEASONS.length].ground);
  const t = clamp(1 - seasonLeft() / 20, 0, 1);
  const c = cur.map((v, i) => Math.round(v + (next[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

// Schneeflocken im Bildschirm-Raum (unabhängig von Zoom und Verschieben)
const snowflakes = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), speed: 0.03 + Math.random() * 0.05, size: 1 + Math.random() * 2 }));

function drawSnow(dt, worldScale) {
  ctx.save();
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  const t = performance.now() / 1000;
  for (const f of snowflakes) {
    f.y += f.speed * dt;
    if (f.y > 1) { f.y = 0; f.x = Math.random(); }
    const x = (f.x + Math.sin(t * 0.8 + f.y * 10) * 0.01) * view.w;
    ctx.beginPath();
    ctx.arc(x, f.y * view.h, f.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.setTransform(worldScale, 0, 0, worldScale, view.dpr * view.x, view.dpr * view.y);
}

function easeOutBack(t) {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

// =====================================================================
// TAG & NACHT, ANIMATIONEN (nur Optik)
// =====================================================================

// 0 = hell, CONFIG.nightDarkness = tiefste Nacht. Tage sind länger als Nächte.
function darkness() {
  if (!settings.daynight) return 0;
  const d = (1 - Math.cos(2 * Math.PI * state.dayTime)) / 2;   // 0 Mittag … 1 Mitternacht
  return clamp((d - 0.45) / 0.45, 0, 1) * CONFIG.nightDarkness;
}

function glow(cx, cy, r, color) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
}

function drawLights(dark) {
  const k = dark / CONFIG.nightDarkness;   // 0…1
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  state.grid.forEach((cell, i) => {
    if (!cell) return;
    const def = BUILDINGS[cell.type];
    const x = i % N, y = Math.floor(i / N);
    const cx = (x + 0.5) * T, cy = (y + 0.5) * T;
    if (cell.fire) {
      glow(cx, cy, T * 1.4, `rgba(255, 110, 30, ${0.8 * k})`);
    } else if (def.isRoad) {
      if ((x * 7 + y * 13) % 4 === 0) glow(cx, cy, T * 0.6, `rgba(255, 220, 150, ${0.35 * k})`);
    } else if (isActive(x, y) && (!def.population || state.population > 0)) {
      glow(cx, cy, T * 0.8, `rgba(255, 190, 90, ${0.45 * k})`);
      if (def.population) {
        // erleuchtete Fenster
        ctx.fillStyle = `rgba(255, 220, 120, ${0.9 * k})`;
        ctx.fillRect(x * T + T * 0.2, y * T + T * 0.62, T * 0.14, T * 0.14);
        ctx.fillRect(x * T + T * 0.66, y * T + T * 0.62, T * 0.14, T * 0.14);
      }
    }
  });
  ctx.restore();
}

// ---------- Rauch und Staub ----------

let particles = [];

function puff(x, y, color, count, size) {
  for (let n = 0; n < count; n++) {
    particles.push({
      x: (x + 0.5 + randomBetween(-0.3, 0.3)) * T, y: (y + 0.5 + randomBetween(-0.3, 0.3)) * T,
      vx: randomBetween(-12, 12), vy: randomBetween(-18, -6),
      age: 0, life: randomBetween(0.8, 1.4), size, color,
    });
  }
}

function updateParticles(dt) {
  state.grid.forEach((cell, i) => {
    const rate = cell && !cell.fire && BUILDINGS[cell.type].smoke;
    if (!rate || Math.random() >= rate * dt) return;
    const x = i % N, y = Math.floor(i / N);
    if (!isActive(x, y)) return;
    particles.push({
      x: (x + 0.75) * T, y: (y + 0.18) * T,
      vx: randomBetween(-3, 6), vy: -T * 0.35,
      age: 0, life: 2.4, size: T * 0.1, color: '235, 235, 235',
    });
  });
  for (const p of particles) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  particles = particles.filter(p => p.age < p.life);
}

function drawSmoke() {
  for (const p of particles) {
    const a = p.age / p.life;
    ctx.fillStyle = `rgba(${p.color}, ${0.55 * (1 - a)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (1 + a * 1.5), 0, Math.PI * 2);
    ctx.fill();
  }
}

on('demolish', ({ x, y }) => puff(x, y, '160, 130, 100', 10, T * 0.12));
on('burned', ({ x, y }) => puff(x, y, '70, 70, 70', 14, T * 0.14));

// ---------- Spaziergänger ----------

let walkers = [];
const WALKER_COLORS = ['#e63946', '#457b9d', '#f4a261', '#2a9d8f', '#9b5de5', '#ffffff', '#ffd166'];

function roadAt(x, y) {
  const cell = getCell(x, y);
  return !!cell && !!BUILDINGS[cell.type].isRoad;
}

function updateWalkers(dt) {
  const target = Math.min(CONFIG.maxWalkers, Math.floor(state.population / 3));
  if (walkers.length < target && Math.random() < dt * 2) {
    const roads = [];
    state.grid.forEach((cell, i) => { if (cell && BUILDINGS[cell.type].isRoad) roads.push(i); });
    if (roads.length) {
      const i = randomItem(roads);
      const x = i % N, y = Math.floor(i / N);
      walkers.push({
        fx: x, fy: y, tx: x, ty: y, p: 1,
        speed: randomBetween(0.5, 1.1), lane: randomBetween(-0.14, 0.14),
        color: randomItem(WALKER_COLORS),
      });
    }
  } else if (walkers.length > target) {
    walkers.pop();
  }
  for (const w of walkers) {
    w.p += dt * w.speed;
    if (w.p < 1) continue;
    if (!roadAt(w.tx, w.ty)) { w.dead = true; continue; }
    // Nächstes Straßenfeld wählen, möglichst nicht umkehren
    const options = [[w.tx, w.ty - 1], [w.tx + 1, w.ty], [w.tx, w.ty + 1], [w.tx - 1, w.ty]]
      .filter(([x, y]) => roadAt(x, y));
    const forward = options.filter(([x, y]) => x !== w.fx || y !== w.fy);
    const next = randomItem(forward.length ? forward : options.length ? options : [[w.tx, w.ty]]);
    w.fx = w.tx; w.fy = w.ty;
    [w.tx, w.ty] = next;
    w.p = 0;
  }
  walkers = walkers.filter(w => !w.dead && roadAt(w.fx, w.fy));
}

function drawWalkers() {
  for (const w of walkers) {
    const x = (w.fx + (w.tx - w.fx) * w.p + 0.5 + w.lane) * T;
    const y = (w.fy + (w.ty - w.fy) * w.p + 0.5 + w.lane) * T;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(x, y + T * 0.03, T * 0.075, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = w.color;
    ctx.beginPath();
    ctx.arc(x, y, T * 0.065, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Straße: Mittelstück plus Arme zu benachbarten Straßen und Gebäuden
function drawRoad(x, y, def, alpha) {
  const w = T * 0.5;
  const c = (T - w) / 2;
  const px = x * T, py = y * T;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = def.color;
  ctx.fillRect(px + c, py + c, w, w);
  const arms = [
    [0, -1, px + c, py, w, c],
    [1, 0, px + c + w, py + c, c, w],
    [0, 1, px + c, py + c + w, w, c],
    [-1, 0, px, py + c, c, w],
  ];
  for (const [dx, dy, rx, ry, rw, rh] of arms) {
    if (getCell(x + dx, y + dy)) ctx.fillRect(rx, ry, rw, rh);
  }
  ctx.globalAlpha = 1;
}

function outlineTile(tile, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3 / view.zoom;
  ctx.strokeRect(tile.x * T + 1, tile.y * T + 1, T - 2, T - 2);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// =====================================================================
// EINGABE – Touch und Maus über Pointer Events
// =====================================================================

const pointers = new Map();
let pan = null;        // { startX, startY, viewX, viewY }
let pinch = null;      // { dist, midX, midY, zoom, viewX, viewY }
let paint = null;      // Bauen durch Ziehen: { last: {x,y}, started }
let tapStart = null;   // Position, solange es noch ein Tippen/Klick sein kann
const TAP_SLOP = 8;    // Pixel Bewegung, ab der es ein Verschieben ist

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function startPan(p) {
  pan = { startX: p.x, startY: p.y, viewX: view.x, viewY: view.y };
}

function startPinch() {
  const [a, b] = [...pointers.values()];
  pinch = {
    dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
    midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2,
    zoom: view.zoom, viewX: view.x, viewY: view.y,
  };
}

canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && e.button === 2) {
    // Rechtsklick: Baumodus bzw. Fenster schließen
    selectBuild(null);
    closePanels();
    return;
  }
  if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
  canvas.setPointerCapture(e.pointerId);
  const p = pointerPos(e);
  pointers.set(e.pointerId, p);
  if (pointers.size === 1) {
    tapStart = e.button === 1 ? null : p;   // mittlere Maustaste: nur verschieben
    if (e.button !== 1 && selectedType && BUILDINGS[selectedType].dragBuild) {
      paint = { last: screenToTile(p.x, p.y), started: false };
    } else {
      startPan(p);
    }
  } else if (pointers.size === 2) {
    // Zweiter Finger: Zoomen statt Bauen
    tapStart = null;
    pan = null;
    paint = null;
    startPinch();
  }
});

// Felder zwischen a und b ohne Diagonalsprünge, damit Straßen verbunden bleiben
function tileLine(a, b) {
  const tiles = [];
  let { x, y } = a;
  while (x !== b.x || y !== b.y) {
    const dx = b.x - x, dy = b.y - y;
    if (Math.abs(dx) >= Math.abs(dy)) x += Math.sign(dx);
    else y += Math.sign(dy);
    tiles.push({ x, y });
  }
  return tiles;
}

function paintTo(tile) {
  if (tile.x === paint.last.x && tile.y === paint.last.y) return;
  if (!paint.started) {
    // Erst beim Verlassen des Startfelds bauen – so löst ein beginnender Zoom nichts aus
    paint.started = true;
    tapStart = null;
    placeBuilding(paint.last.x, paint.last.y, selectedType);
  }
  for (const t of tileLine(paint.last, tile)) {
    if (getCell(t.x, t.y) !== null) continue;
    if (!placeBuilding(t.x, t.y, selectedType)) break;
  }
  paint.last = tile;
}

canvas.addEventListener('pointermove', e => {
  const p = pointerPos(e);
  if (e.pointerType === 'mouse') hoverTile = screenToTile(p.x, p.y);
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, p);

  if (pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
    const zoom = clamp(pinch.zoom * dist / pinch.dist, minZoom(), CONFIG.maxZoom);
    const wx = (pinch.midX - pinch.viewX) / pinch.zoom;
    const wy = (pinch.midY - pinch.viewY) / pinch.zoom;
    view.zoom = zoom;
    view.x = midX - wx * zoom;
    view.y = midY - wy * zoom;
    clampView();
  } else if (paint) {
    paintTo(screenToTile(p.x, p.y));
  } else if (pan) {
    if (tapStart && Math.hypot(p.x - tapStart.x, p.y - tapStart.y) > TAP_SLOP) tapStart = null;
    if (!tapStart) {
      canvas.classList.add('dragging');
      view.x = pan.viewX + p.x - pan.startX;
      view.y = pan.viewY + p.y - pan.startY;
      clampView();
    }
  }
});

function endPointer(e, cancelled) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (pointers.size === 0) {
    if (tapStart && !cancelled) handleTap(tapStart.x, tapStart.y);
    tapStart = null;
    pan = null;
    pinch = null;
    paint = null;
    canvas.classList.remove('dragging');
  } else if (pointers.size === 1) {
    // Von zwei auf einen Finger: weiter verschieben, nicht tippen
    pinch = null;
    startPan([...pointers.values()][0]);
  }
}

canvas.addEventListener('pointerup', e => endPointer(e, false));
canvas.addEventListener('pointercancel', e => endPointer(e, true));
canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hoverTile = null; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

// Mausrad: zoomen um den Mauszeiger
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const p = pointerPos(e);
  zoomAt(p.x, p.y, view.zoom * Math.exp(-e.deltaY * 0.0015));
}, { passive: false });

// Tastatur: Tab wechselt die Kategorie, 1–9 wählt ein Gebäude darin, Esc bricht ab
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    selectBuild(null);
    closePanels();
    return;
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    const cats = Object.keys(CATEGORIES);
    const step = e.shiftKey ? cats.length - 1 : 1;
    showCategory(cats[(cats.indexOf(currentCategory) + step) % cats.length]);
    return;
  }
  const idx = parseInt(e.key, 10) - 1;
  const types = categoryTypes(currentCategory);
  if (idx >= 0 && idx < types.length) selectBuild(types[idx]);
});

function handleTap(sx, sy) {
  const { x, y } = screenToTile(sx, sy);
  const cell = getCell(x, y);
  if (cell) {
    showInfo(x, y);
    return;
  }
  closePanels();
  if (cell === null && selectedType) placeBuilding(x, y, selectedType);
}

// =====================================================================
// EINSTELLUNGEN (pro Gerät, getrennt vom Spielstand)
// =====================================================================

const SETTINGS_KEY = 'stadtaufbau-settings';
const settings = { sfx: true, music: true, daynight: true };
const SETTING_LABELS = { sfx: '🔊 Soundeffekte', music: '🎵 Musik', daynight: '🌗 Tag und Nacht' };

function loadSettings() {
  try {
    Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {});
  } catch (e) { /* Standardwerte */ }
}

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* egal */ }
}

// =====================================================================
// SOUND – alles live erzeugt (Web Audio), keine Audiodateien
// =====================================================================

const NOTE = { C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, B5: 987.77, C6: 1046.5, D6: 1174.66, G6: 1567.98 };

const sound = {
  ctx: null,
  lastPlayed: {},

  // Browser erlauben Audio erst nach einer Nutzeraktion
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = settings.music ? 0.22 : 0;
      this.musicGain.connect(this.master);
      // Echo für die Musik
      this.delay = this.ctx.createDelay();
      this.delay.delayTime.value = 0.38;
      const feedback = this.ctx.createGain();
      feedback.gain.value = 0.35;
      this.delay.connect(feedback).connect(this.delay);
      this.delay.connect(this.musicGain);
      const len = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, len, len);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (settings.music) this.startMusic();
  },

  tone(freq, dur, { type = 'sine', vol = 0.3, to = null, delay = 0, out = this.sfxGain } = {}) {
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  },

  noise(dur, { vol = 0.3, freq = 1000, to = null, filter = 'lowpass', delay = 0 } = {}) {
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.05);
  },

  play(name) {
    if (!settings.sfx || !this.ctx || this.ctx.state !== 'running') return;
    const now = performance.now();
    if (now - (this.lastPlayed[name] || 0) < 60) return;   // z. B. beim Straßenziehen nicht überlagern
    this.lastPlayed[name] = now;
    SOUNDS[name]?.(this);
  },

  // ---------- Hintergrundmusik: ruhige Flächen + zufällige Töne ----------
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    this.musicGain.gain.setTargetAtTime(0.22, this.ctx.currentTime, 0.5);
    this.nextChordAt = this.ctx.currentTime + 0.2;
    this.chordIndex = 0;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 200);
  },

  stopMusic() {
    if (!this.ctx) return;
    clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
  },

  scheduleMusic() {
    if (this.ctx.state !== 'running') return;
    const chords = [
      [NOTE.C3, NOTE.E3, NOTE.G3, NOTE.B3],
      [NOTE.A3, NOTE.C4, NOTE.E4],
      [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.E4],
      [NOTE.G3, NOTE.B3, NOTE.D4],
    ];
    while (this.nextChordAt < this.ctx.currentTime + 0.5) {
      this.pad(chords[this.chordIndex], this.nextChordAt, 9);
      this.chordIndex = (this.chordIndex + 1) % chords.length;
      this.nextChordAt += 8;
    }
    if (Math.random() < 0.12) {
      // nachts tiefer und seltener
      const scale = darkness() > 0.2
        ? [NOTE.A3, NOTE.C4, NOTE.D4, NOTE.E4, NOTE.G4, NOTE.A4]
        : [NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5, NOTE.A5, NOTE.C6, NOTE.E5, NOTE.G5];
      if (darkness() <= 0.2 || Math.random() < 0.6) this.pluck(randomItem(scale), this.ctx.currentTime + 0.05);
    }
  },

  pad(freqs, t, dur) {
    for (const freq of freqs) {
      for (const detune of [-5, 5]) {
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = detune;
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 800;
        const g = this.ctx.createGain();
        const attack = Math.min(2.5, dur / 3);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.035, t + attack);
        g.gain.setValueAtTime(0.035, t + Math.max(attack, dur - 3));
        g.gain.linearRampToValueAtTime(0.0001, t + dur);
        osc.connect(f).connect(g).connect(this.musicGain);
        osc.start(t);
        osc.stop(t + dur + 0.1);
      }
    }
  },

  pluck(freq, t) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    osc.connect(g);
    g.connect(this.musicGain);
    g.connect(this.delay);
    osc.start(t);
    osc.stop(t + 1.7);
  },
};

// Soundeffekte. Neue einfach ergänzen und mit sound.play('name') abspielen.
const SOUNDS = {
  build: s => { s.tone(150, 0.15, { type: 'triangle', vol: 0.4, to: 70 }); s.noise(0.08, { vol: 0.15, freq: 900 }); },
  road: s => s.tone(320, 0.06, { type: 'triangle', vol: 0.18, to: 200 }),
  demolish: s => { s.noise(0.45, { vol: 0.35, freq: 1500, to: 200 }); s.tone(110, 0.3, { type: 'sawtooth', vol: 0.12, to: 40 }); },
  error: s => { s.tone(180, 0.09, { type: 'square', vol: 0.12 }); s.tone(140, 0.12, { type: 'square', vol: 0.12, delay: 0.1 }); },
  coins: s => { s.tone(NOTE.B5, 0.1, { type: 'square', vol: 0.1 }); s.tone(NOTE.E5 * 2, 0.35, { type: 'square', vol: 0.1, delay: 0.08 }); },
  quest: s => [NOTE.C5, NOTE.E5, NOTE.G5].forEach((f, i) => s.tone(f, 0.25, { type: 'triangle', vol: 0.25, delay: i * 0.09 })),
  levelup: s => [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => s.tone(f, i === 3 ? 0.8 : 0.2, { type: 'triangle', vol: 0.3, delay: i * 0.14 })),
  research: s => [NOTE.G5, NOTE.B5, NOTE.D6, NOTE.G6].forEach((f, i) => s.tone(f, 0.3, { vol: 0.18, delay: i * 0.07 })),
  event: s => { s.tone(NOTE.E5, 0.18, { type: 'triangle', vol: 0.25 }); s.tone(NOTE.A5, 0.3, { type: 'triangle', vol: 0.25, delay: 0.16 }); },
  fire: s => [0, 1, 2, 3].forEach(i => s.tone(i % 2 ? 660 : 880, 0.16, { type: 'square', vol: 0.09, delay: i * 0.18 })),
  burned: s => { s.noise(0.8, { vol: 0.4, freq: 800, to: 100 }); s.tone(80, 0.5, { type: 'sawtooth', vol: 0.1, to: 30 }); },
  extinguish: s => s.noise(0.5, { vol: 0.25, freq: 3000, filter: 'highpass' }),
  click: s => s.tone(600, 0.04, { vol: 0.08 }),
};

on('build', ({ type }) => sound.play(BUILDINGS[type].isRoad ? 'road' : 'build'));
on('demolish', () => sound.play('demolish'));
on('questComplete', () => sound.play('quest'));
on('questClaimed', () => sound.play('coins'));
on('levelup', () => sound.play('levelup'));
on('researched', () => sound.play('research'));
on('event', ({ id }) => sound.play(id === 'fire' ? 'fire' : 'event'));
on('burned', () => sound.play('burned'));

// =====================================================================
// OBERFLÄCHE (HTML-Leisten)
// =====================================================================

const resourceEls = {};
const buildButtons = {};
const categoryTabs = {};
let currentCategory = Object.keys(CATEGORIES)[0];
const seenUnlocked = new Set();   // freigeschaltete Gebäude, deren Reiter schon angesehen wurde

function categoryTypes(cat) {
  return Object.keys(BUILDINGS).filter(type => BUILDINGS[type].category === cat);
}

function showCategory(cat) {
  currentCategory = cat;
  for (const [type, btn] of Object.entries(buildButtons)) {
    btn.classList.toggle('hidden', BUILDINGS[type].category !== cat);
  }
  for (const type of categoryTypes(cat)) if (isUnlocked(type)) seenUnlocked.add(type);
  document.getElementById('buildbar').scrollLeft = 0;
  updateCategoryTabs();
}

function updateCategoryTabs() {
  for (const [cat, tab] of Object.entries(categoryTabs)) {
    const types = categoryTypes(cat);
    tab.classList.toggle('active', cat === currentCategory);
    tab.classList.toggle('locked', !types.some(isUnlocked));
    tab.classList.toggle('new', types.some(type => isUnlocked(type) && !seenUnlocked.has(type)));
    tab.classList.toggle('has-selected', !!selectedType && BUILDINGS[selectedType].category === cat && cat !== currentCategory);
  }
}
const infoEl = document.getElementById('info');
const toastEl = document.getElementById('toast');
let toastTimer = null;

function addChip(parent, key, title, onClick) {
  const el = document.createElement(onClick ? 'button' : 'div');
  el.className = 'res';
  el.title = title;
  if (onClick) el.addEventListener('click', onClick);
  parent.appendChild(el);
  resourceEls[key] = el;
}

function buildUI() {
  const resWrap = document.getElementById('resources');
  for (const id in RESOURCES) addChip(resWrap, id, RESOURCES[id].name);
  addChip(resWrap, 'population', 'Einwohner / Wohnplätze', showCityInfo);
  addChip(resWrap, 'happiness', 'Zufriedenheit', showCityInfo);
  addChip(resWrap, 'level', 'Stadtstufe', showCityInfo);
  addChip(resWrap, 'season', 'Jahreszeit', showCityInfo);

  const tabs = document.getElementById('build-tabs');
  for (const [cat, c] of Object.entries(CATEGORIES)) {
    const tab = document.createElement('button');
    tab.className = 'build-tab';
    tab.dataset.category = cat;
    tab.title = `${c.name} (Tab wechselt)`;
    tab.innerHTML = `<span class="icon">${c.icon}</span><span class="name">${c.name}</span>`;
    tab.addEventListener('click', () => showCategory(cat));
    tabs.appendChild(tab);
    categoryTabs[cat] = tab;
  }

  const bar = document.getElementById('buildbar');
  Object.entries(BUILDINGS).forEach(([type, def]) => {
    const btn = document.createElement('button');
    btn.className = 'build-btn';
    btn.dataset.category = def.category;
    const jobText = def.jobs ? ` – braucht ${def.jobs[jobOf(type)]} ${JOBS[jobOf(type)].name}` : '';
    const key = categoryTypes(def.category).indexOf(type) + 1;
    btn.title = `${def.name} (Taste ${key})${jobText}`;
    btn.innerHTML = `<span class="icon">${def.icon}</span>` +
      `<span class="name">${def.name}</span>` +
      `<span class="cost"></span>`;
    btn.addEventListener('click', () => selectBuild(selectedType === type ? null : type));
    bar.appendChild(btn);
    buildButtons[type] = btn;
  });
  // Was beim Start schon freigeschaltet ist, gilt als gesehen (kein „Neu“-Punkt)
  for (const type in BUILDINGS) if (isUnlocked(type)) seenUnlocked.add(type);
  showCategory(currentCategory);
  // Mausrad scrollt die Bauleiste seitlich
  bar.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      bar.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });

  document.getElementById('quest-tracker').addEventListener('click', () => {
    if (questsEl.classList.contains('hidden')) showQuests();
    else closeQuests();
  });
  document.getElementById('quests-close').addEventListener('click', closeQuests);
  document.getElementById('btn-research').addEventListener('click', () => {
    if (researchEl.classList.contains('hidden')) showResearch();
    else closeResearch();
  });
  document.getElementById('research-close').addEventListener('click', closeResearch);
  techListEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-research]');
    if (btn) startResearch(btn.dataset.research);
  });
  questListEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-claim]');
    if (btn) claimQuest(btn.dataset.claim);
  });
  achievementsEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-ach]');
    if (!btn) return;
    const a = ACHIEVEMENTS.find(x => x.id === btn.dataset.ach);
    showToast(`${a.icon} ${a.name}: ${a.text}${state.achievements.includes(a.id) ? ' ✅' : ''}`, 2500);
  });

  document.getElementById('info-close').addEventListener('click', closeInfo);
  infoExtraEl.addEventListener('click', e => {
    const tradeBtn = e.target.closest('[data-trade]');
    if (tradeBtn) {
      const [action, id] = tradeBtn.dataset.trade.split(':');
      trade(id, action === 'buy');
    }
    const taxBtn = e.target.closest('[data-tax]');
    if (taxBtn) setTaxLevel(state.taxLevel + Number(taxBtn.dataset.tax));
  });
  document.getElementById('info-demolish').addEventListener('click', () => {
    if (infoTile) demolish(infoTile.x, infoTile.y);
  });
  document.getElementById('info-action').addEventListener('click', () => {
    if (infoTile) extinguish(infoTile.x, infoTile.y);
  });
  document.getElementById('btn-settings').addEventListener('click', () => {
    if (settingsEl.classList.contains('hidden')) showSettings();
    else closeSettings();
  });
  document.getElementById('settings-close').addEventListener('click', closeSettings);
  settingsEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-setting]');
    if (btn) toggleSetting(btn.dataset.setting);
  });
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (!confirm('Neues Spiel starten? Der aktuelle Spielstand geht verloren.')) return;
    newGame();
    selectBuild(null);
    closePanels();
    fitMap();
    recalcStats();
    save();
    updateUI();
  });
}

function happinessIcon(h) {
  if (h >= 70) return '😊';
  if (h >= HAPPINESS.growAbove) return '🙂';
  if (h >= HAPPINESS.leaveBelow) return '😐';
  return '😠';
}

function updateUI() {
  for (const id in RESOURCES) {
    const el = resourceEls[id];
    el.classList.toggle('hidden', !isResourceVisible(id));
    el.textContent = `${RESOURCES[id].icon} ${state.resources[id]}`;
    if (RESOURCES[id].stored) {
      const full = state.resources[id] >= storageCap(id);
      el.classList.toggle('full', full);
      el.title = `${RESOURCES[id].name} – Lager ${state.resources[id]} / ${storageCap(id)}${full ? ' (voll!)' : ''}`;
    }
  }
  resourceEls.population.textContent = `👥 ${state.population}/${stats.capacity}`;
  resourceEls.happiness.textContent = `${happinessIcon(stats.happiness)} ${stats.happiness}`;
  resourceEls.level.textContent = `${LEVELS[stats.level].icon} ${LEVELS[stats.level].name}`;
  resourceEls.season.textContent = `${season().icon} ${formatClock(seasonLeft())}`;
  resourceEls.season.title = `${season().name} – noch ${formatClock(seasonLeft())}`;
  resourceEls.season.classList.toggle('full', isFreezing());
  for (const [type, btn] of Object.entries(buildButtons)) {
    const def = BUILDINGS[type];
    const unlocked = isUnlocked(type);
    const built = !!def.landmark && countBuildings(type) > 0;
    btn.classList.toggle('selected', selectedType === type);
    btn.classList.toggle('locked', !unlocked || built);
    const cost = costOf(type);
    btn.classList.toggle('unaffordable', unlocked && !built && !canAfford(cost));
    btn.querySelector('.cost').textContent = built ? '✔ gebaut'
      : unlocked ? formatAmounts(cost)
      : `🔒 ${lockReason(type)}`;
  }
  updateCategoryTabs();
  if (infoMode) renderInfo();
  updateQuestUI();
  updateResearchUI();
  updateEffectsUI();
}

// ---------- Aufträge ----------

const questsEl = document.getElementById('quests');
const questListEl = document.getElementById('quest-list');
const trackerEl = document.getElementById('quest-tracker');
let questListKey = '';   // Liste nur neu aufbauen, wenn sich die aktiven Aufträge ändern

function updateQuestUI() {
  const active = activeQuests();
  const progress = active.map(questProgress);
  const ready = progress.filter(p => p.done).length;

  if (active.length === 0) {
    trackerEl.textContent = '📜 Alle Aufträge erledigt';
  } else if (ready > 0) {
    trackerEl.textContent = `🎁 ${ready === 1 ? 'Belohnung' : ready + ' Belohnungen'} abholen`;
  } else {
    trackerEl.textContent = `📜 ${goalText(active[0].goal)} · ${progress[0].current}/${progress[0].target}`;
  }
  trackerEl.classList.toggle('ready', ready > 0);

  if (questsEl.classList.contains('hidden')) return;

  const key = active.map(q => q.id).join(',');
  if (key !== questListKey) {
    questListKey = key;
    questListEl.innerHTML = active.map(q => `
      <div class="quest" data-id="${q.id}">
        <div class="quest-title">${q.title}</div>
        <div class="quest-goal">${goalText(q.goal)}</div>
        <div class="quest-bar"><div></div></div>
        <div class="quest-foot">
          <span class="quest-progress"></span>
          <span>🎁 ${formatAmounts(q.reward)}</span>
        </div>
        <button class="quest-claim" data-claim="${q.id}">Belohnung abholen</button>
      </div>`).join('') || '<p>Du hast alle Aufträge erledigt. 🎉</p>';
  }
  active.forEach((q, i) => {
    const el = questListEl.querySelector(`[data-id="${q.id}"]`);
    const p = progress[i];
    el.classList.toggle('done', p.done);
    el.querySelector('.quest-bar div').style.width = `${p.current / p.target * 100}%`;
    el.querySelector('.quest-progress').textContent = p.done ? '✅ Erfüllt' : `${p.current} / ${p.target}`;
    el.querySelector('.quest-claim').classList.toggle('hidden', !p.done);
  });
  document.getElementById('quests-count').textContent = `${state.questsClaimed.length} / ${QUESTS.length}`;

  const achKey = state.achievements.join(',');
  if (achievementsEl.dataset.key !== achKey) {
    achievementsEl.dataset.key = achKey;
    achievementsEl.innerHTML =
      `<div class="ach-title">🏆 Erfolge ${state.achievements.length} / ${ACHIEVEMENTS.length}</div>` +
      '<div class="ach-grid">' + ACHIEVEMENTS.map(a => `
        <button class="ach ${state.achievements.includes(a.id) ? 'done' : ''}" data-ach="${a.id}" title="${a.text}">
          <span class="ach-icon">${a.icon}</span><span class="ach-name">${a.name}</span>
        </button>`).join('') + '</div>';
  }
}

const achievementsEl = document.getElementById('achievements');

function showQuests() {
  closeInfo();
  closeResearch();
  closeSettings();
  questsEl.classList.remove('hidden');
  questListKey = '';
  achievementsEl.dataset.key = '';
  updateQuestUI();
}

function closeQuests() {
  questsEl.classList.add('hidden');
}

function closePanels() {
  closeInfo();
  closeQuests();
  closeResearch();
  closeSettings();
}

// ---------- Einstellungen ----------

const settingsEl = document.getElementById('settings');

function showSettings() {
  closePanels();
  updateSettingsUI();
  settingsEl.classList.remove('hidden');
}

function closeSettings() {
  settingsEl.classList.add('hidden');
}

function updateSettingsUI() {
  for (const btn of settingsEl.querySelectorAll('[data-setting]')) {
    const key = btn.dataset.setting;
    btn.textContent = `${SETTING_LABELS[key]}: ${settings[key] ? 'An' : 'Aus'}`;
    btn.classList.toggle('on', settings[key]);
  }
}

function toggleSetting(key) {
  settings[key] = !settings[key];
  saveSettings();
  if (key === 'music') {
    if (settings.music) sound.startMusic();
    else sound.stopMusic();
  }
  updateSettingsUI();
  sound.play('click');
}

// ---------- Forschung ----------

const researchEl = document.getElementById('research');
const techListEl = document.getElementById('tech-list');
let techListKey = '';

function updateResearchUI() {
  if (researchEl.classList.contains('hidden')) return;
  const ids = Object.keys(TECHS);
  const key = ids.map(techStatus).join(',');
  if (key !== techListKey) {
    techListKey = key;
    techListEl.innerHTML = ids.map(id => {
      const t = TECHS[id];
      const status = techStatus(id);
      const needs = (t.requires || []).map(r => `${TECHS[r].icon} ${TECHS[r].name}`).join(', ');
      const unlocks = Object.values(BUILDINGS).filter(b => b.requiresTech === id).map(b => `${b.icon} ${b.name}`);
      let foot = '';
      if (status === 'done') foot = '<span>✅ Erforscht</span>';
      else if (status === 'running') foot = '<span class="tech-left"></span>';
      else if (status === 'locked') foot = `<span>🔒 Benötigt: ${needs}</span>`;
      return `
        <div class="quest tech ${status}" data-tech="${id}">
          <div class="quest-title">${t.icon} ${t.name}</div>
          <div class="quest-goal">${t.description}${unlocks.length ? ` Neu: ${unlocks.join(', ')}.` : ''}</div>
          ${status === 'running' ? '<div class="quest-bar"><div></div></div>' : ''}
          ${foot ? `<div class="quest-foot">${foot}</div>` : ''}
          ${status === 'available'
            ? `<button class="tech-start" data-research="${id}">Erforschen · ${formatAmounts(t.cost)} · ${t.seconds} s</button>`
            : ''}
        </div>`;
    }).join('');
  }
  // Laufende Werte ohne Neuaufbau aktualisieren
  for (const btn of techListEl.querySelectorAll('[data-research]')) {
    // nicht deaktivieren – so erklärt ein Klick per Meldung, was fehlt
    btn.classList.toggle('unaffordable', !!state.research || !canAfford(TECHS[btn.dataset.research].cost));
  }
  if (state.research) {
    const el = techListEl.querySelector(`[data-tech="${state.research.id}"]`);
    const t = TECHS[state.research.id];
    if (el) {
      el.querySelector('.quest-bar div').style.width = `${(1 - state.research.left / t.seconds) * 100}%`;
      el.querySelector('.tech-left').textContent = `🔬 Wird erforscht … noch ${Math.ceil(state.research.left)} s`;
    }
  }
  document.getElementById('research-count').textContent = `${state.techs.length} / ${Object.keys(TECHS).length}`;
}

function showResearch() {
  closeInfo();
  closeQuests();
  closeSettings();
  researchEl.classList.remove('hidden');
  techListKey = '';
  updateResearchUI();
}

function closeResearch() {
  researchEl.classList.add('hidden');
}

function selectBuild(type) {
  if (type && !isUnlocked(type)) {
    const def = BUILDINGS[type];
    sound.play('error');
    showToast(`🔒 ${def.name} gibt es erst nach ${lockReason(type, true)}`);
    return;
  }
  selectedType = type;
  canvas.classList.toggle('building', !!type);
  updateUI();
}

function showInfo(x, y) {
  closeQuests();
  closeResearch();
  closeSettings();
  infoMode = 'tile';
  infoTile = { x, y };
  clearInfoExtra();
  infoEl.classList.remove('hidden');
  renderInfo();
}

function showCityInfo() {
  closeQuests();
  closeResearch();
  closeSettings();
  infoMode = 'city';
  infoTile = null;
  clearInfoExtra();
  infoEl.classList.remove('hidden');
  renderInfo();
}

function renderInfo() {
  if (infoMode === 'city') renderCityInfo();
  else renderTileInfo();
}

function renderTileInfo() {
  const cell = getCell(infoTile.x, infoTile.y);
  if (!cell) return closeInfo();
  const def = BUILDINGS[cell.type];
  const active = isActive(infoTile.x, infoTile.y);
  const lines = [def.description];
  if (cell.fire) {
    lines.push(cell.fire.brigade
      ? '🚒 Brennt – die Feuerwache löscht gerade.'
      : `🔥 Brennt! In ${Math.ceil(cell.fire.left)} s ist es abgebrannt.`);
  } else if (!active) {
    lines.push('⚠️ Kein Straßenanschluss – arbeitet nicht.');
  }
  if (def.population) {
    const cap = houseCapacity(infoTile.x, infoTile.y);
    lines.push(`Wohnplätze: 👥 ${active ? cap : 0} / ${cap}`);
    if (cap > capacityOf(cell.type)) lines.push(`✨ Schönes Wohnviertel: +${CONFIG.niceHouseBonus} Wohnplätze`);
    else lines.push(`Tipp: Park oder Brunnen direkt daneben bringt +${CONFIG.niceHouseBonus} Wohnplätze.`);
    const levels = stats.houseNeeds.get(infoTile.y * N + infoTile.x) || new Map();
    lines.push('Versorgung: ' + Object.entries(NEEDS).map(([need, n]) => {
      const level = levels.get(need) || 0;
      return `${n.icon} ${level >= 0.99 ? '✅' : level > 0 ? '🟡' : '❌'}`;
    }).join('  '));
  }
  if (def.jobs && active) {
    const job = JOBS[jobOf(cell.type)];
    const pct = Math.round(staffOf(cell.type) * 100);
    lines.push(`Personal: ${def.jobs[jobOf(cell.type)]} ${job.icon} ${job.name} – besetzt ${pct} %` +
      (pct < 100 ? ' (arbeitet langsamer)' : ''));
  }
  if (def.interval) {
    const out = buildingOutput(cell.type);
    if (def.consumes) lines.push(`Verarbeitet: ${formatAmounts(def.consumes)} → ${formatAmounts(out)} alle ${def.interval} s`);
    else lines.push(`Ertrag: ${formatAmounts(out)} alle ${def.interval} s${active ? '' : ' (gestoppt)'}`);
    if (active && cell.waiting === 'input') lines.push(`⏸️ Wartet auf ${missingText(def.consumes)}`);
    if (active && cell.waiting === 'full') lines.push('⏸️ Pause – das Lager ist voll');
  }
  if (def.service) {
    const need = NEEDS[def.service.need];
    lines.push(`Versorgt Häuser im Umkreis von ${def.service.radius} Feldern mit ${need.icon} ${need.name}.`);
  }
  if (def.fireRadius) {
    lines.push(`Löscht Brände im Umkreis von ${def.fireRadius} Feldern in ${CONFIG.fireBrigadeSeconds} Sekunden.`);
  }
  if (def.storage) {
    lines.push(`Lagerplatz +${def.storage} für Holz, Stein und Nahrung (gesamt: ${stats.storage}).`);
  }
  if (def.beautifies) {
    lines.push(`Häuser direkt daneben werden schöner: +${CONFIG.niceHouseBonus} Wohnplätze.`);
  }
  if (def.landmark) {
    lines.push(`🏛️ Sehenswürdigkeit: Zufriedenheit +${def.landmark} für die ganze Stadt.`);
  }
  if (cell.type === 'market' && active) {
    lines.push('Handel: Kaufe oder verkaufe Waren – die Preise schwanken.');
    renderTradeUI();
  } else {
    clearInfoExtra();
  }
  const actionBtn = document.getElementById('info-action');
  actionBtn.classList.toggle('hidden', !cell.fire || cell.fire.brigade);
  actionBtn.textContent = `💧 Löschen (${formatAmounts(CONFIG.extinguishCost)})`;
  const refund = {};
  for (const [id, n] of Object.entries(costOf(cell.type, -1))) refund[id] = Math.floor(n * CONFIG.refundRate);
  document.getElementById('info-icon').textContent = def.icon;
  document.getElementById('info-name').textContent = def.name;
  document.getElementById('info-text').textContent = lines.join('\n');
  const btn = document.getElementById('info-demolish');
  btn.classList.remove('hidden');
  btn.textContent = `Abreißen (zurück: ${formatAmounts(refund)})`;
}

function renderCityInfo() {
  const level = LEVELS[stats.level];
  const next = LEVELS[stats.level + 1];
  const consumption = (state.population * CONFIG.foodPerCitizen).toFixed(1).replace('.', ',');
  const lines = [
    `Einwohner: 👥 ${state.population} von ${stats.capacity} Wohnplätzen`,
    next ? `Nächste Stufe: ${next.icon} ${next.name} ab ${next.minPop} Einwohnern` : 'Höchste Stufe erreicht',
    `Nahrungsverbrauch: 🍞 ${consumption} pro Sekunde`,
    `Jahreszeit: ${season().icon} ${season().name} – noch ${formatClock(seasonLeft())} · Ernte ${Math.round((season().production.farm ?? 1) * 100)} %` +
      (season().heating ? ` · Heizen: 🪵 ${formatNumber(heatingRate())} pro Sekunde` : ''),
    `Danach: ${SEASONS[(seasonIndex() + 1) % SEASONS.length].icon} ${SEASONS[(seasonIndex() + 1) % SEASONS.length].name}` +
      (SEASONS[(seasonIndex() + 1) % SEASONS.length].heating ? ` – Holzbedarf etwa 🪵 ${Math.ceil(heatingRate() * CONFIG.seasonLength)}` : ''),
    `Lager: ${Object.keys(RESOURCES).filter(id => RESOURCES[id].stored && isResourceVisible(id))
      .map(id => `${RESOURCES[id].icon} ${state.resources[id]}/${storageCap(id)}`).join('  ')}`,
    `➜ ${stats.trend}`,
    '',
    'Berufe:',
    ...Object.entries(JOBS).map(([job, j]) => {
      const d = stats.jobs.demand[job] || 0, a = stats.jobs.assigned[job] || 0;
      const cap = job === 'scholar' ? ` (höchstens ${stats.jobs.scholarCap} – mehr Bildung, mehr Gelehrte)` : '';
      return `   ${j.icon} ${j.name}: ${a} / ${d} Stellen besetzt${cap}`;
    }),
    `   😴 Arbeitslos: ${stats.unemployed}`,
    '',
    `Zufriedenheit: ${happinessIcon(stats.happiness)} ${stats.happiness} / 100 → Arbeitsleistung ${Math.round(productivity() * 100)} %`,
    ...stats.factors.map(([label, v]) => `   ${v >= 0 ? '+' : '−'}${Math.abs(v)}  ${label}`),
    '',
    `Zuzug ab ${HAPPINESS.growAbove}, Abwanderung unter ${HAPPINESS.leaveBelow}. Zufriedene Einwohner arbeiten mehr.`,
  ];
  document.getElementById('info-icon').textContent = level.icon;
  document.getElementById('info-name').textContent = level.name;
  document.getElementById('info-text').textContent = lines.join('\n');
  document.getElementById('info-demolish').classList.add('hidden');
  document.getElementById('info-action').classList.add('hidden');
  renderTaxUI();
}

// ---------- Zusatzbereich im Info-Fenster (Handel, Steuern) ----------
// Wird nur bei Wechsel neu aufgebaut, damit Klicks nicht verloren gehen.

const infoExtraEl = document.getElementById('info-extra');

function clearInfoExtra() {
  if (!infoExtraEl.dataset.mode) return;
  infoExtraEl.dataset.mode = '';
  infoExtraEl.innerHTML = '';
}

function renderTradeUI() {
  const goods = Object.keys(RESOURCES).filter(id => RESOURCES[id].price && isResourceVisible(id));
  if (infoExtraEl.dataset.goods !== goods.join(',')) infoExtraEl.dataset.mode = '';
  infoExtraEl.dataset.goods = goods.join(',');
  if (infoExtraEl.dataset.mode !== 'trade') {
    infoExtraEl.dataset.mode = 'trade';
    infoExtraEl.innerHTML = goods.map(id => `
      <div class="trade-row" data-good="${id}">
        <span class="trade-name"></span>
        <button class="trade-btn" data-trade="buy:${id}"></button>
        <button class="trade-btn sell" data-trade="sell:${id}"></button>
      </div>`).join('');
  }
  for (const id of goods) {
    const row = infoExtraEl.querySelector(`[data-good="${id}"]`);
    const f = state.prices[id];
    const trend = f > 1.15 ? ' ⬆' : f < 0.85 ? ' ⬇' : '';
    row.querySelector('.trade-name').textContent = `${RESOURCES[id].icon} ${CONFIG.tradeLot} ${RESOURCES[id].name}${trend}`;
    row.querySelector('[data-trade^="buy"]').textContent = `Kaufen 💰${buyPrice(id)}`;
    row.querySelector('[data-trade^="sell"]').textContent = `Verkaufen 💰${sellPrice(id)}`;
  }
}

function renderTaxUI() {
  if (infoExtraEl.dataset.mode !== 'tax') {
    infoExtraEl.dataset.mode = 'tax';
    infoExtraEl.innerHTML = `
      <div class="tax-row">
        <button class="tax-btn" data-tax="-1">−</button>
        <div class="tax-label"></div>
        <button class="tax-btn" data-tax="1">+</button>
      </div>`;
  }
  const tax = TAXES[state.taxLevel];
  const income = Math.floor(state.population * tax.perCitizen);
  const mood = tax.happiness > 0 ? `+${tax.happiness}` : tax.happiness < 0 ? `−${-tax.happiness}` : '±0';
  infoExtraEl.querySelector('.tax-label').innerHTML =
    `<strong>Steuern: ${tax.name}</strong><br>💰 +${income} alle ${CONFIG.taxInterval} s · Zufriedenheit ${mood}`;
}

// ---------- Ereignisse ----------

const eventEl = document.getElementById('event');
const effectsEl = document.getElementById('effects');

// buttons: [{ label, primary, action }] – action darf false zurückgeben, dann bleibt das Fenster offen
const popupQueue = [];

function showEventPopup(icon, title, text, buttons = [{ label: 'OK', primary: true }]) {
  if (!eventEl.classList.contains('hidden')) {
    popupQueue.push([icon, title, text, buttons]);   // nach dem aktuellen Fenster zeigen
    return;
  }
  document.getElementById('event-icon').textContent = icon;
  document.getElementById('event-title').textContent = title;
  document.getElementById('event-text').textContent = text;
  const wrap = document.getElementById('event-buttons');
  wrap.innerHTML = '';
  for (const b of buttons) {
    const btn = document.createElement('button');
    btn.textContent = b.label;
    if (b.primary) btn.className = 'primary';
    btn.addEventListener('click', () => {
      if (b.action && b.action() === false) return;
      eventEl.classList.add('hidden');
      if (popupQueue.length) showEventPopup(...popupQueue.shift());
    });
    wrap.appendChild(btn);
  }
  eventEl.classList.remove('hidden');
}

// Laufende Ereignisse und Brände unten links auf der Karte
function updateEffectsUI() {
  const pills = state.effects.map(e =>
    `${EVENTS[e.event].icon} ${EVENTS[e.event].name} · ${Math.ceil(e.left)} s`);
  if (state.research) {
    const tech = TECHS[state.research.id];
    pills.unshift(`🔬 ${tech.name} · ${Math.ceil(state.research.left)} s`);
  }
  state.grid.forEach(cell => {
    if (cell?.fire && !cell.fire.brigade) pills.push(`🔥 ${BUILDINGS[cell.type].name} brennt · ${Math.ceil(cell.fire.left)} s`);
  });
  if (isFreezing()) pills.unshift('🥶 Es ist kalt – Holz fehlt!');
  const short = Object.keys(JOBS).filter(job => (stats.jobs.assigned[job] || 0) < (stats.jobs.demand[job] || 0));
  if (short.length) pills.push(`${short.map(job => JOBS[job].icon).join('')} Personal fehlt`);
  else if (state.population >= 10 && stats.unemployed / state.population > CONFIG.unemploymentTolerance) {
    pills.push(`😴 ${stats.unemployed} Arbeitslose`);
  }
  const html = pills.map(p => `<div class="effect">${p}</div>`).join('');
  if (effectsEl.innerHTML !== html) effectsEl.innerHTML = html;
}

function closeInfo() {
  infoMode = null;
  infoTile = null;
  infoEl.classList.add('hidden');
  clearInfoExtra();
}

function showToast(text, ms = 1800) {
  toastEl.textContent = text;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), ms);
}

// =====================================================================
// SPIELSCHLEIFE & START
// =====================================================================

let lastTime = performance.now();
let uiTimer = 0;

function loop(now) {
  // Nie negativ (der erste Zeitstempel kann vor dem Skriptstart liegen), große Sprünge begrenzen
  const dt = clamp((now - lastTime) / 1000, 0, 1);
  lastTime = now;
  update(dt);
  uiTimer += dt;
  if (uiTimer >= 0.25) {
    uiTimer = 0;
    recalcStats();
    checkQuests();
    checkAchievements();
    updateUI();
  }
  updateParticles(dt);
  updateWalkers(dt);
  render(dt);
  requestAnimationFrame(loop);
}

// Alte Seite aus dem Browser-Cache + neues Skript (oder umgekehrt)? Dann einmal alles frisch holen.
function versionMismatch() {
  const pageVersion = document.querySelector('meta[name="app-version"]')?.content;
  return pageVersion !== String(APP_VERSION);
}

// Gibt true zurück, wenn neu geladen wird. Nur ein Versuch pro Version, damit es keine Endlosschleife gibt.
function reloadFresh() {
  try {
    if (sessionStorage.getItem('fresh-reload') === String(APP_VERSION)) return false;
    sessionStorage.setItem('fresh-reload', String(APP_VERSION));
  } catch (e) {
    return false;
  }
  Promise.all(['./', 'index.html', 'game.js', 'style.css', 'service-worker.js']
    .map(url => fetch(url, { cache: 'reload' }).catch(() => null)))
    .then(() => location.reload());
  return true;
}

function start() {
  if (versionMismatch() && reloadFresh()) return;
  loadSettings();
  load();
  recalcStats();
  applyOfflineProgress(lastSavedAt);
  checkDailyReward();
  checkQuests(true);
  checkAchievements(true);
  buildUI();
  resize();
  new ResizeObserver(resize).observe(canvas);
  updateUI();

  setInterval(save, CONFIG.autosaveSeconds * 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      save();
      sound.ctx?.suspend();
    } else if (sound.ctx) {
      sound.ctx.resume();
    }
  });
  // Audio darf erst nach der ersten Berührung/Taste starten
  window.addEventListener('pointerdown', () => sound.unlock());
  window.addEventListener('keydown', () => sound.unlock());
  window.addEventListener('pagehide', save);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(err => console.warn('Service Worker', err));
  }

  requestAnimationFrame(loop);
}

start();
