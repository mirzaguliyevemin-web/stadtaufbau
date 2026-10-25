'use strict';

// Version von Seite und Skript – muss zu <meta name="app-version"> in index.html passen.
// Bei jeder Änderung erhöhen (ebenso CACHE in service-worker.js).
const APP_VERSION = 31;

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
  gridSize: 64,           // Karte ist gridSize × gridSize Felder
  plotSize: 8,            // Land wird in Parzellen von plotSize × plotSize Feldern gekauft
  startPlots: 2,          // zu Beginn gehören die startPlots × startPlots Parzellen in der Mitte
  plotBasePrice: 150,     // Preis der ersten gekauften Parzelle (Geld)
  plotPriceGrowth: 1.7,   // jede weitere Parzelle kostet so viel mal mehr
  tileSize: 48,           // Kachelgröße in Weltpixeln
  saveKey: 'stadtaufbau-save-',   // + Nummer des Speicherplatzes
  saveSlots: 3,           // so viele Städte können parallel gespeichert werden
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
  banditBase: 10,         // Höchststärke eines Banditenlagers: Grundwert …
  banditPerCitizen: 0.15, // … plus so viel je Einwohner
  wallDefense: 0.5,       // Abwehr je Mauerstück (gilt überall) …
  wallDefenseMax: 40,     // … höchstens so viel durch Mauern
  campMinPop: 30,         // ab so vielen Einwohnern tauchen Banditenlager auf
  maxCamps: 3,            // höchstens so viele Lager gleichzeitig
  campSpawnSeconds: [180, 360],  // Abstand zwischen neuen Lagern
  campGrowthSeconds: 45,  // alle so viele Sekunden wird ein Lager um 1 stärker
  campRaidSeconds: [100, 200],   // so oft überfällt ein Lager die Stadt
  legacyBonus: 0.1,       // Gründerruhm: +10 % Ertrag je Stern (in allen Städten) …
  legacyMaxStars: 5,      // … höchstens für so viele Sterne
  legacyStart: { money: 100, wood: 30, stone: 15 },   // Extra-Startvorrat je Stern
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
  worker:  { name: 'Arbeiter', one: 'Arbeiter', icon: '👷' },
  trader:  { name: 'Händler',  one: 'Händler',  icon: '🧑‍💼' },
  scholar: { name: 'Gelehrte', one: 'Gelehrter', icon: '🧑‍🎓' },
};

// Steuerstufen: Geld je Einwohner alle CONFIG.taxInterval Sekunden und Wirkung auf die Zufriedenheit
const TAXES = [
  { name: 'Keine',     perCitizen: 0,   happiness: 5 },
  { name: 'Niedrig',   perCitizen: 0.1, happiness: 0 },
  { name: 'Normal',    perCitizen: 0.2, happiness: -5 },
  { name: 'Hoch',      perCitizen: 0.3, happiness: -12 },
  { name: 'Sehr hoch', perCitizen: 0.4, happiness: -20 },
];

// Ausbaustufen. Gilt für alle Gebäude außer Straßen und Sehenswürdigkeiten.
//   minLevel: ab welcher Stadtstufe (Index in LEVELS)  | costFactor: × Grundkosten  | extra: zusätzliche Kosten
//   Wirkung je Stufe: Ertrag und Personal ×(1 + 0,5 je Stufe), Häuser +2 Plätze, Umkreis +1, Lager ×Stufe
//   Index = Zielstufe (UPGRADES[2] = Ausbau auf Stufe 2), höchste Stufe = UPGRADES.length - 1
const UPGRADES = [
  null,
  null,                                                          // Stufe 1 = Neubau
  { minLevel: 1, costFactor: 1.5 },                              // auf Stufe 2
  { minLevel: 2, costFactor: 3, extra: { planks: 10, bricks: 10 } },   // auf Stufe 3
];
const MAX_BUILDING_LEVEL = UPGRADES.length - 1;

// Kategorien der Bauleiste – Reihenfolge = Reihenfolge der Reiter
const CATEGORIES = {
  housing:   { name: 'Wohnen',     icon: '🏠' },
  resources: { name: 'Wirtschaft', icon: '🌾' },
  crafts:    { name: 'Handwerk',   icon: '🔨' },
  services:  { name: 'Dienste',    icon: '🏥' },
  defense:   { name: 'Schutz',     icon: '🛡️' },
  education: { name: 'Bildung',    icon: '📚' },
  prestige:  { name: 'Prestige',   icon: '🏛️' },
};

// Gebäude. Neue Gebäude einfach hier ergänzen (category = Reiter in der Bauleiste).
//   cost:          Baukosten                  { ressource: menge }
//   interval:      Produktionsintervall in Sekunden
//   produces:      feste Menge pro Intervall  { ressource: menge }
//   perPopulation: Menge je Einwohner pro Intervall
//   consumes:      Verbrauch pro Intervall (Verarbeitung) – fehlt etwas, pausiert das Gebäude
//   defense:       Schutz vor Banditen { radius, strength } für Gebäude im Umkreis (× Stufe × Besetzung)
//   isWall:        Mauerstück – wird wie eine Straße gezeichnet, stärkt die Abwehr der ganzen Stadt
//   size:          [Breite, Höhe] in Feldern (Standard 1×1); das angetippte Feld ist die linke obere Ecke
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
    size: [2, 2],
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
    size: [2, 1],
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
    size: [2, 2],
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
    category: 'resources',
    size: [2, 1],
  },
  warehouse: {
    name: 'Lagerhaus', icon: '📦', color: '#ddb892',
    description: 'Mehr Platz für Holz, Stein und Nahrung.',
    cost: { money: 30, wood: 30 },
    storage: 100,
    needsRoad: true,
    jobs: { worker: 1 },
    category: 'resources',
    size: [2, 1],
  },
  park: {
    name: 'Park', icon: '🌳', color: '#52b788',
    description: 'Ein Ort zum Erholen.',
    cost: { money: 20 },
    service: { need: 'leisure', radius: 2 },
    beautifies: true,
    needsRoad: true,
    category: 'services',
    size: [2, 2],
  },
  firestation: {
    name: 'Feuerwache', icon: '🚒', color: '#ff8fa3',
    description: 'Löscht Brände in der Umgebung, bevor Schaden entsteht.',
    cost: { money: 50, wood: 20, stone: 15 },
    fireRadius: 4,
    needsRoad: true,
    jobs: { worker: 2 },
    category: 'defense',
    size: [2, 1],
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
    size: [2, 1],
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
    size: [2, 1],
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
    size: [2, 2],
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
    size: [2, 1],
  },
  guard: {
    name: 'Wachhaus', icon: '💂', color: '#ced4da',
    description: 'Wachen sorgen für Sicherheit.',
    cost: { money: 40, wood: 30, stone: 20 },
    service: { need: 'safety', radius: 4 },
    unlockLevel: 1,
    needsRoad: true,
    jobs: { worker: 2 },
    category: 'defense',
    defense: { radius: 4, strength: 10 },
  },
  tower: {
    name: 'Wachturm', icon: '🗼', color: '#b8c0c8',
    description: 'Ein hoher Turm mit Ausguck: schützt einen großen Umkreis vor Banditen.',
    cost: { money: 60, wood: 20, stone: 40 },
    defense: { radius: 6, strength: 20 },
    unlockLevel: 1,
    needsRoad: true,
    jobs: { worker: 2 },
    category: 'defense',
  },
  wall: {
    name: 'Mauer', icon: '🏰', color: '#7d7468',
    description: 'Mauerstücke am Stück ziehen. Jedes Stück stärkt die Abwehr der ganzen Stadt ein wenig.',
    cost: { stone: 3 },
    fixedCost: true,
    isWall: true,
    dragBuild: true,
    unlockLevel: 1,
    category: 'defense',
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
    size: [2, 2],
  },
  townhall: {
    name: 'Rathaus', icon: '🏛️', color: '#e9ecef',
    description: 'Das Herz der Stadt – macht alle stolz.',
    cost: { money: 600, wood: 100, stone: 100, planks: 60, bricks: 60 },
    landmark: 5,
    unlockLevel: 1,
    needsRoad: true,
    category: 'prestige',
    size: [2, 2],
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
    size: [3, 3],
  },
  cathedral: {
    name: 'Kathedrale', icon: '⛪', color: '#f1e3c8',
    description: 'Ein gewaltiges Bauwerk, weithin sichtbar.',
    cost: { money: 1500, stone: 400, planks: 150, bricks: 200 },
    landmark: 10,
    unlockLevel: 2,
    needsRoad: true,
    category: 'prestige',
    size: [3, 3],
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
  { id: 'land1',      title: 'Neues Land',           goal: { type: 'plots', count: 1 },                        reward: { wood: 40 } },
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
  { id: 'upgrade1',   title: 'Ausbau',               goal: { type: 'upgrades', count: 1 },                     reward: { money: 80 } },
  { id: 'scholars5',  title: 'Kluge Köpfe',          goal: { type: 'jobs', job: 'scholar', count: 5 },         reward: { knowledge: 30 } },
  { id: 'guard',      title: 'Ruhige Nächte',        goal: { type: 'build', building: 'guard', count: 1 },     reward: { stone: 50 } },
  { id: 'carpentry',  title: 'Handwerk',             goal: { type: 'build', building: 'carpentry', count: 1 }, reward: { money: 60 } },
  { id: 'bakery',     title: 'Frisches Brot',        goal: { type: 'build', building: 'bakery', count: 1 },    reward: { food: 40 } },
  { id: 'brickworks', title: 'Ziegelbrenner',        goal: { type: 'build', building: 'brickworks', count: 1 }, reward: { stone: 40 } },
  { id: 'planks30',   title: 'Feine Ware',           goal: { type: 'produced', resource: 'planks', count: 30 }, reward: { money: 120 } },
  { id: 'happy75',    title: 'Glückliche Leute',     goal: { type: 'happiness', count: 75 },                   reward: { money: 150 } },
  { id: 'pop50',      title: 'Wachsende Stadt',      goal: { type: 'population', count: 50 },                  reward: { wood: 100, stone: 100 } },
  { id: 'traders6',   title: 'Reger Handel',         goal: { type: 'jobs', job: 'trader', count: 6 },          reward: { money: 100 } },
  { id: 'bandits1',   title: 'Sichere Straßen',      goal: { type: 'repelled', count: 1 },                     reward: { money: 150 } },
  { id: 'camp1',      title: 'Räubernest',           goal: { type: 'camps', count: 1 },                        reward: { money: 200, stone: 40 } },
  { id: 'townhall',   title: 'Prestige',             goal: { type: 'build', building: 'townhall', count: 1 },  reward: { money: 150, stone: 50 } },
  { id: 'research4',  title: 'Zeitalter der Gelehrten', goal: { type: 'research', count: 4 },                  reward: { money: 150 } },
  { id: 'money500',   title: 'Volle Stadtkasse',     goal: { type: 'resource', resource: 'money', count: 500 }, reward: { stone: 80 } },
  { id: 'land5',      title: 'Großgrundbesitz',      goal: { type: 'plots', count: 5 },                        reward: { money: 400 } },
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
  { id: 'dynasty',    icon: '👑', name: 'Dynastie',            text: 'Vollende 3 Städte.',                        check: () => legacy.stars >= 3 },
  { id: 'fortress',   icon: '🏰', name: 'Festungsstadt',       text: '40 Mauerstücke und 3 Wachtürme.',           check: () => countBuildings('wall') >= 40 && countBuildings('tower') >= 3 },
  { id: 'lawman',     icon: '⚖️', name: 'Gesetzeshüter',       text: 'Schlage 5 Banditenüberfälle zurück.',      check: () => (state.counters.repelled || 0) >= 5 },
  { id: 'gold10',     icon: '🌟', name: 'Prachtbauten',        text: '10 Gebäude auf Stufe 3.',                  check: () => state.grid.filter(c => c && levelOf(c) >= 3).length >= 10 },
  { id: 'land20',     icon: '🗺️', name: 'Landesherr',          text: 'Kaufe 20 Flächen dazu.',                   check: () => plotsBought() >= 20 },
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
    name: 'Steinmauern', icon: '⛰️',
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
  militia: {
    name: 'Bürgerwehr', icon: '⚔️',
    description: 'Ausgebildete Bürger helfen den Wachen: Abwehr gegen Banditen +50 %.',
    cost: { knowledge: 140, money: 150 }, seconds: 75,
    requires: ['stonewalls'],
    effect: { flags: { militia: true } },
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
  bandits: {
    name: 'Banditen', icon: '🏴‍☠️', weight: 2, minPop: 30,
    start: () => spawnCamp(),
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
  plots: [],         // plots[i] = true, wenn die Parzelle gekauft ist
  cityName: '',      // vom Spieler vergebener Name (leer = „Stadt <Platz>“)
  completed: false,  // Stadt wurde vollendet (gibt nur einmal Gründerruhm)
  camps: [],         // Banditenlager { x, y, strength, raidIn }
  campSpawnIn: 240,  // Sekunden bis zum nächsten möglichen Lager
  plotsGranted: 0,   // geschenkte Flächen (alter Spielstand mit Gebäuden außerhalb) – zählen nicht als gekauft
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
  activeWeight: {},              // dasselbe, gewichtet mit der Ausbaustufe
  jobs: { demand: {}, assigned: {}, scholarCap: 0 },   // Stellen und Besetzung je Beruf
  staff: {},                     // Besetzungsgrad 0–1 je Gebäudeart
  unemployed: 0,
  niceHouses: 0,
};

// ---------- Gründerruhm (bleibt über alle Städte erhalten) ----------

const LEGACY_KEY = 'stadtaufbau-legacy';
const legacy = (() => {
  try {
    const data = JSON.parse(localStorage.getItem(LEGACY_KEY));
    if (data && Number.isFinite(data.stars)) return { stars: data.stars, cities: Array.isArray(data.cities) ? data.cities : [] };
  } catch (e) { /* noch nichts */ }
  return { stars: 0, cities: [] };
})();

function saveLegacy() {
  try { localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy)); } catch (e) { /* egal */ }
}

function legacyFactor() {
  return 1 + CONFIG.legacyBonus * Math.min(legacy.stars, CONFIG.legacyMaxStars);
}

function newGame() {
  state.resources = {};
  for (const id in RESOURCES) state.resources[id] = RESOURCES[id].start + (CONFIG.legacyStart[id] || 0) * legacy.stars;
  state.grid = new Array(N * N).fill(null);
  occ.fill(-1);
  state.plots = startPlots();
  state.plotsGranted = 0;
  state.cityName = '';
  state.completed = false;
  state.camps = [];
  state.campSpawnIn = 240;
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

// ---------- Land (Parzellen) ----------

const P = N / CONFIG.plotSize;   // Parzellen je Seite

function startPlots() {
  const plots = new Array(P * P).fill(false);
  const from = Math.floor((P - CONFIG.startPlots) / 2);
  for (let py = from; py < from + CONFIG.startPlots; py++) {
    for (let px = from; px < from + CONFIG.startPlots; px++) plots[py * P + px] = true;
  }
  return plots;
}

function plotOf(x, y) {
  return Math.floor(y / CONFIG.plotSize) * P + Math.floor(x / CONFIG.plotSize);
}

function isOwned(x, y) {
  return x >= 0 && y >= 0 && x < N && y < N && !!state.plots[plotOf(x, y)];
}

function plotsBought() {
  return state.plots.filter(Boolean).length - CONFIG.startPlots * CONFIG.startPlots - state.plotsGranted;
}

function plotPrice() {
  return { money: Math.round(CONFIG.plotBasePrice * Math.pow(CONFIG.plotPriceGrowth, Math.max(0, plotsBought()))) };
}

// Kaufbar sind nur Parzellen, die an eigenes Land grenzen
function canBuyPlot(p) {
  if (state.plots[p]) return false;
  const px = p % P, py = Math.floor(p / P);
  return [[px - 1, py], [px + 1, py], [px, py - 1], [px, py + 1]]
    .some(([qx, qy]) => qx >= 0 && qy >= 0 && qx < P && qy < P && state.plots[qy * P + qx]);
}

function buyPlot(p) {
  if (!canBuyPlot(p)) return;
  const price = plotPrice();
  if (!canAfford(price)) {
    sound.play('error');
    showToast(`Nicht genug ${missingText(price)} für diese Fläche`);
    return;
  }
  addResources(price, -1);
  state.plots[p] = true;
  sound.play('build');
  showToast('🏞️ Neues Land gekauft!');
  removeCampsOnPlot(p);
  emit('plotBought', { plot: p });
  closeInfo();
  recalcStats();
  updateUI();
}

// Ein Gebäude steht in state.grid nur an seiner linken oberen Ecke. Die Belegungskarte merkt sich
// für jedes Feld, zu welcher Ecke es gehört (−1 = frei). Sie wird nicht gespeichert, sondern aufgebaut.
const occ = new Int32Array(N * N).fill(-1);

function sizeOf(cell) {
  return [cell.w || 1, cell.h || 1];
}

function footprintSize(type) {
  const size = BUILDINGS[type].size;
  return size ? [size[0], size[1]] : [1, 1];
}

function setOccupied(ax, ay, w, h, value) {
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) occ[(ay + dy) * N + ax + dx] = value;
}

function rebuildOccupancy() {
  occ.fill(-1);
  state.grid.forEach((cell, i) => {
    if (cell) setOccupied(i % N, Math.floor(i / N), ...sizeOf(cell), i);
  });
}

// Index der Gebäude-Ecke auf Feld (x, y), −1 = frei, undefined = außerhalb der Karte
function anchorAt(x, y) {
  if (x < 0 || y < 0 || x >= N || y >= N) return undefined;
  return occ[y * N + x];
}

// Das Gebäude auf Feld (x, y) – auch für jedes Feld eines großen Gebäudes
function getCell(x, y) {
  const a = anchorAt(x, y);
  if (a === undefined) return undefined;
  return a >= 0 ? state.grid[a] : null;
}

// Passt ein Gebäude mit der Ecke auf (x, y)? Alle Felder müssen frei und eigenes Land sein
function canPlaceAt(type, x, y) {
  const [w, h] = footprintSize(type);
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (anchorAt(x + dx, y + dy) !== -1 || !isOwned(x + dx, y + dy)) return false;
    }
  }
  return true;
}

function removeBuildingAt(i) {
  const cell = state.grid[i];
  if (!cell) return;
  setOccupied(i % N, Math.floor(i / N), ...sizeOf(cell), -1);
  state.grid[i] = null;
}

// Abstand zweier Rechtecke in Feldern (0 = berühren sich oder überlappen; Diagonalen zählen wie gerade)
function rectGap(ax, ay, aw, ah, bx, by, bw, bh) {
  const dx = Math.max(0, ax - (bx + bw - 1), bx - (ax + aw - 1));
  const dy = Math.max(0, ay - (by + bh - 1), by - (ay + ah - 1));
  return Math.max(dx, dy);
}

// Felder rund um ein Gebäude (oben, unten, links, rechts – ohne Ecken)
function perimeterTiles(ax, ay, w, h) {
  const tiles = [];
  for (let dx = 0; dx < w; dx++) tiles.push([ax + dx, ay - 1], [ax + dx, ay + h]);
  for (let dy = 0; dy < h; dy++) tiles.push([ax - 1, ay + dy], [ax + w, ay + dy]);
  return tiles;
}

// Nachbarfelder (oben, rechts, unten, links) – Grundlage für Straßen/Nachbarschaftsbonus
function neighbors(x, y) {
  return [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]]
    .filter(([nx, ny]) => getCell(nx, ny) !== undefined)
    .map(([nx, ny]) => ({ x: nx, y: ny, cell: getCell(nx, ny) }));
}

// Straße an irgendeiner Seite des Gebäudes auf (x, y)?
function hasRoadAccess(x, y) {
  const a = anchorAt(x, y);
  if (a === undefined) return false;
  if (a < 0) return neighbors(x, y).some(n => n.cell && BUILDINGS[n.cell.type].isRoad);   // freies Feld (Vorschau)
  const [w, h] = sizeOf(state.grid[a]);
  return perimeterTiles(a % N, Math.floor(a / N), w, h).some(([px, py]) => {
    const cell = getCell(px, py);
    return cell && BUILDINGS[cell.type].isRoad;
  });
}

// Arbeitet das Gebäude auf (x, y)? (beliebiges Feld des Gebäudes)
function isActive(x, y) {
  const a = anchorAt(x, y);
  if (a === undefined || a < 0) return false;
  const cell = state.grid[a];
  if (cell.fire) return false;
  return !BUILDINGS[cell.type].needsRoad || hasRoadAccess(a % N, Math.floor(a / N));
}

// Wirkungsbereich eines Gebäudes (Versorgung oder Brandschutz), sonst null
function areaOf(def) {
  if (def.service) return { key: def.service.need, radius: def.service.radius };
  if (def.fireRadius) return { key: 'fire', radius: def.fireRadius };
  return null;
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
  const cell = getCell(x, y);
  let cap = capacityOf(cell.type);
  if (!cap) return 0;
  cap += 2 * (levelOf(cell) - 1);
  return isNiceHouse(x, y) ? cap + CONFIG.niceHouseBonus : cap;
}

// ---------- Ausbaustufen ----------

function levelOf(cell) {
  return cell.level || 1;
}

// Ertrag und Personal wachsen je Stufe um 50 %
function levelFactor(cell) {
  return 1 + 0.5 * (levelOf(cell) - 1);
}

function canUpgradeType(type) {
  const def = BUILDINGS[type];
  return !def.isRoad && !def.isWall && !def.landmark;
}

function upgradeCost(type, toLevel) {
  const up = UPGRADES[toLevel];
  const cost = {};
  for (const [id, n] of Object.entries(BUILDINGS[type].cost)) cost[id] = Math.round(n * up.costFactor);
  for (const [id, n] of Object.entries(up.extra || {})) cost[id] = (cost[id] || 0) + n;
  return cost;
}

// Wirkungsbereich eines konkreten Gebäudes (Umkreis wächst mit der Stufe)
function areaOfCell(cell) {
  const area = areaOf(BUILDINGS[cell.type]);
  return area && { key: area.key, radius: area.radius + levelOf(cell) - 1 };
}

function upgradeBuilding(x, y) {
  const cell = getCell(x, y);
  if (!cell || !canUpgradeType(cell.type)) return;
  const to = levelOf(cell) + 1;
  const up = UPGRADES[to];
  if (!up) return;
  if (state.maxLevel < up.minLevel) {
    sound.play('error');
    showToast(`Stufe ${to} gibt es erst ab ${LEVELS[up.minLevel].name}`);
    return;
  }
  const cost = upgradeCost(cell.type, to);
  if (!canAfford(cost)) {
    sound.play('error');
    showToast(`Nicht genug ${missingText(cost)}`);
    return;
  }
  addResources(cost, -1);
  cell.level = to;
  cell.builtAt = performance.now();   // Plopp-Animation
  state.counters.upgrades = (state.counters.upgrades || 0) + 1;
  sound.play('levelup');
  showToast(`⬆️ ${BUILDINGS[cell.type].name} auf Stufe ${to} ausgebaut`);
  emit('upgrade', { x, y, type: cell.type, level: to });
  recalcStats();
  updateUI();
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
  if (!isOwned(x, y)) return false;
  const [w, h] = footprintSize(type);
  if (!canPlaceAt(type, x, y)) {
    sound.play('error');
    showToast(`Kein Platz: ${def.name} braucht ${w}×${h} freie Felder auf eigenem Land`);
    return false;
  }
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
  const cell = { type, timer: 0, builtAt: performance.now() };
  if (w > 1 || h > 1) { cell.w = w; cell.h = h; }
  state.grid[y * N + x] = cell;
  setOccupied(x, y, w, h, y * N + x);
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

// Rückerstattung beim Abriss: Hälfte der zuletzt bezahlten Baukosten plus Hälfte der Ausbauten
function refundOf(cell, offset = -1) {
  const refund = {};
  const add = cost => {
    for (const [id, n] of Object.entries(cost)) refund[id] = (refund[id] || 0) + Math.floor(n * CONFIG.refundRate);
  };
  add(costOf(cell.type, offset));
  for (let lvl = 2; lvl <= levelOf(cell); lvl++) add(upgradeCost(cell.type, lvl));
  return refund;
}

function demolish(x, y) {
  const a = anchorAt(x, y);
  if (a === undefined || a < 0) return;
  const cell = state.grid[a];
  addResources(refundOf(cell), 1);
  removeBuildingAt(a);
  emit('demolish', { x: a % N, y: Math.floor(a / N), type: cell.type, w: cell.w || 1, h: cell.h || 1 });
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
  const factor = (1 + productionBonus(type)) * productivity() * legacyFactor() * staffOf(type) * (season().production?.[type] ?? 1);
  const out = {};
  for (const [id, n] of Object.entries(def.produces || {})) out[id] = (out[id] || 0) + n;
  if (def.perPopulation) {
    // Einwohner verteilen sich auf alle Gebäude dieser Art, jedes bedient höchstens servesUpTo
    const share = state.population / Math.max(1, stats.activeWeight[type] || 1);
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
  if (tradeBlocked()) {
    sound.play('error');
    showToast('🏴‍☠️ Die Handelswege sind gerade unsicher – warte, bis die Banditen weg sind');
    return;
  }
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
      const lf = levelFactor(cell);
      const raw = buildingOutput(cell.type);
      for (const id in raw) raw[id] *= lf;
      // Verarbeitung: ohne Rohstoff oder bei vollem Lager pausieren (Zeit läuft nicht weiter)
      if (def.consumes) {
        const need = {};
        for (const [id, n] of Object.entries(def.consumes)) need[id] = Math.round(n * lf);
        const full = Object.keys(raw).every(id => state.resources[id] >= storageCap(id));
        if (full || !canAfford(need)) {
          cell.waiting = full ? 'full' : 'input';
          cell.timer = def.interval;
          break;
        }
        cell.waiting = null;
        addResources(need, -1);
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
function computeJobs(activeCells) {
  const demand = {};
  const typeDemand = {};
  for (const job in JOBS) demand[job] = 0;
  for (const cell of activeCells) {
    for (const [job, n] of Object.entries(BUILDINGS[cell.type].jobs || {})) {
      const jobs = Math.round(n * levelFactor(cell));
      demand[job] += jobs;
      typeDemand[cell.type] = (typeDemand[cell.type] || 0) + jobs;
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
  const activeWeight = {};
  const activeTypes = [];
  state.grid.forEach((cell, i) => {
    if (!cell) return;
    const x = i % N, y = Math.floor(i / N);
    if (!isActive(x, y)) return;
    const def = BUILDINGS[cell.type];
    if (def.service) providers.push({ x, y, w: cell.w || 1, h: cell.h || 1, type: cell.type, need: def.service.need, radius: def.service.radius + levelOf(cell) - 1 });
    if (def.population) houses.push({ i, x, y, cap: houseCapacity(x, y) });
    if (def.storage) storage += def.storage * levelOf(cell);
    if (def.landmark) landmarks += def.landmark;
    activeCount[cell.type] = (activeCount[cell.type] || 0) + 1;
    activeTypes.push(cell);
    activeWeight[cell.type] = (activeWeight[cell.type] || 0) + levelFactor(cell);
  });
  stats.activeCount = activeCount;
  stats.activeWeight = activeWeight;
  computeJobs(activeTypes);
  stats.storage = storage;
  stats.niceHouses = houses.filter(h => isNiceHouse(h.x, h.y)).length;

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
      if (rectGap(p.x, p.y, p.w, p.h, h.x, h.y, 1, 1) <= p.radius) levels.set(p.need, Math.max(levels.get(p.need) || 0, staffOf(p.type)));
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
    case 'plots':      current = plotsBought(); break;
    case 'upgrades':   current = state.counters.upgrades || 0; break;
    case 'repelled':   current = state.counters.repelled || 0; break;
    case 'camps':      current = state.counters.campsCleared || 0; break;
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
    case 'plots':      return goal.count === 1 ? 'Kaufe eine neue Fläche 🏞️' : `Kaufe ${goal.count} neue Flächen 🏞️`;
    case 'upgrades':   return goal.count === 1 ? 'Baue ein Gebäude aus ⬆️' : `Baue ${goal.count} Gebäude aus ⬆️`;
    case 'repelled':   return goal.count === 1 ? 'Schlage Banditen zurück 🏴‍☠️' : `Schlage ${goal.count}-mal Banditen zurück 🏴‍☠️`;
    case 'camps':      return goal.count === 1 ? 'Hebe ein Banditenlager aus ⛺' : `Hebe ${goal.count} Banditenlager aus ⛺`;
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
  const a = anchorAt(x, y);
  const [tw, th] = a >= 0 ? sizeOf(state.grid[a]) : [1, 1];
  const tx = a >= 0 ? a % N : x, ty = a >= 0 ? Math.floor(a / N) : y;
  return state.grid.some((cell, i) => {
    const r = cell && BUILDINGS[cell.type].fireRadius && BUILDINGS[cell.type].fireRadius + levelOf(cell) - 1;
    return r && staffOf(cell.type) > 0 && isActive(i % N, Math.floor(i / N)) &&
      rectGap(i % N, Math.floor(i / N), cell.w || 1, cell.h || 1, tx, ty, tw, th) <= r;
  });
}

function burnableCells() {
  const list = [];
  state.grid.forEach((cell, i) => {
    if (cell && !cell.fire && !BUILDINGS[cell.type].isRoad && !BUILDINGS[cell.type].isWall) list.push(i);
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
  const cell = state.grid[i];
  const targets = new Set();
  for (const [px, py] of perimeterTiles(i % N, Math.floor(i / N), ...sizeOf(cell))) {
    const a = anchorAt(px, py);
    if (a >= 0 && a !== i && !state.grid[a].fire && !BUILDINGS[state.grid[a].type].isRoad && !BUILDINGS[state.grid[a].type].isWall) targets.add(a);
  }
  if (targets.size === 0) return;
  const t = randomItem([...targets]);
  igniteCell(t);
  showToast(`🔥 Das Feuer greift auf ${BUILDINGS[state.grid[t].type].name} über!`, 3000);
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
      removeBuildingAt(i);
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

// ---------- Banditen ----------

// Mauern stärken die Abwehr überall ein wenig (gedeckelt)
function wallBonus() {
  return Math.min(countBuildings('wall') * CONFIG.wallDefense, CONFIG.wallDefenseMax);
}

// Stärke eines Wachpostens (Wachhaus, Wachturm): Grundwert × Stufe × Besetzung
function postStrength(cell) {
  const def = BUILDINGS[cell.type];
  return def.defense ? def.defense.strength * levelFactor(cell) * staffOf(cell.type) : 0;
}

function postRadius(cell) {
  return BUILDINGS[cell.type].defense.radius + levelOf(cell) - 1;
}

// Schutz vor Ort: alle Wachposten, deren Umkreis das Rechteck erreicht, plus Mauern; Bürgerwehr +50 %
function defenseAt(x, y, w = 1, h = 1) {
  let d = wallBonus();
  state.grid.forEach((cell, i) => {
    if (!cell || !BUILDINGS[cell.type].defense || !isActive(i % N, Math.floor(i / N))) return;
    if (rectGap(i % N, Math.floor(i / N), cell.w || 1, cell.h || 1, x, y, w, h) <= postRadius(cell)) d += postStrength(cell);
  });
  return Math.round(d * (hasFlag('militia') ? 1.5 : 1));
}

// Alle Wachen der Stadt zusammen (zum Ausheben von Lagern)
function cityDefense() {
  let d = wallBonus();
  state.grid.forEach((cell, i) => {
    if (cell && BUILDINGS[cell.type].defense && isActive(i % N, Math.floor(i / N))) d += postStrength(cell);
  });
  return Math.round(d * (hasFlag('militia') ? 1.5 : 1));
}

function campMaxStrength() {
  return Math.round(CONFIG.banditBase + state.population * CONFIG.banditPerCitizen);
}

// Neues Lager auf fremdem Land, das an die Stadt grenzt (auch diagonal)
function spawnCamp() {
  if (state.population < CONFIG.campMinPop || state.camps.length >= CONFIG.maxCamps) return false;
  const candidates = [];
  for (let p = 0; p < P * P; p++) {
    if (state.plots[p]) continue;
    const px = p % P, py = Math.floor(p / P);
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1 && !near; dx++) {
      const qx = px + dx, qy = py + dy;
      near = qx >= 0 && qy >= 0 && qx < P && qy < P && state.plots[qy * P + qx];
    }
    if (near && !state.camps.some(c => plotOf(c.x, c.y) === p)) candidates.push(p);
  }
  if (!candidates.length) return false;
  const p = randomItem(candidates);
  const S = CONFIG.plotSize;
  const camp = {
    x: (p % P) * S + 2 + Math.floor(Math.random() * (S - 4)),
    y: Math.floor(p / P) * S + 2 + Math.floor(Math.random() * (S - 4)),
    strength: Math.max(3, Math.round(campMaxStrength() * 0.4)),
    raidIn: randomBetween(...CONFIG.campRaidSeconds),
  };
  state.camps.push(camp);
  showToast('⛺ Banditen haben in der Nähe ein Lager aufgeschlagen!', 4000);
  sound.play('event');
  return true;
}

function updateCamps(dt) {
  if (state.population >= CONFIG.campMinPop) {
    state.campSpawnIn -= dt;
    if (state.campSpawnIn <= 0) {
      state.campSpawnIn = randomBetween(...CONFIG.campSpawnSeconds);
      spawnCamp();
    }
  }
  const max = campMaxStrength();
  for (const camp of [...state.camps]) {
    camp.strength = Math.min(max, camp.strength + dt / CONFIG.campGrowthSeconds);
    camp.raidIn -= dt;
    if (camp.raidIn <= 0) {
      camp.raidIn = randomBetween(...CONFIG.campRaidSeconds);
      startRaid(camp);
    }
  }
}

function campCost(camp) {
  return { money: Math.round(camp.strength * 4) };
}

function clearCamp(index) {
  const camp = state.camps[index];
  if (!camp) return;
  const defense = cityDefense();
  if (defense < camp.strength) {
    sound.play('error');
    showToast(`Deine Wachen sind zu schwach (${defense} gegen ${Math.round(camp.strength)})`);
    return;
  }
  const cost = campCost(camp);
  if (!canAfford(cost)) {
    sound.play('error');
    showToast(`Nicht genug ${missingText(cost)} für den Einsatz`);
    return;
  }
  const loot = { money: Math.round(camp.strength * 15) };
  addResources(cost, -1);
  addResources(loot);
  state.camps.splice(index, 1);
  state.counters.campsCleared = (state.counters.campsCleared || 0) + 1;
  state.counters.repelled = (state.counters.repelled || 0) + 1;
  sound.play('levelup');
  showToast(`⚔️ Lager ausgehoben! Beute: ${formatAmounts(loot)}`, 3500);
  closeInfo();
  updateUI();
}

// Kaufst du Land mit einem Lager darauf, ziehen die Banditen ab
function removeCampsOnPlot(p) {
  const before = state.camps.length;
  state.camps = state.camps.filter(c => plotOf(c.x, c.y) !== p);
  if (state.camps.length < before) showToast('🏞️ Land gekauft – die Banditen sind abgezogen', 3000);
}

function tradeBlocked() {
  return state.effects.some(e => e.tradeBlocked);
}

// Überfall aus einem Lager (wird im nächsten Schritt sichtbar auf der Karte)
function startRaid(camp) {
  const attack = Math.round(camp.strength * randomBetween(0.85, 1.15));
  const defense = cityDefense();
  if (defense >= attack) {
    const bounty = Math.round(20 + attack * 1.5);
    addResources({ money: bounty });
    state.counters.repelled = (state.counters.repelled || 0) + 1;
    camp.strength = Math.max(1, camp.strength * 0.6);   // die Bande ist geschwächt
    showToast(`🛡️ Banditen vertrieben (Abwehr ${defense} gegen ${attack}) – Kopfgeld ${formatAmounts({ money: bounty })}`, 3500);
    return true;
  }
  // Je stärker die Abwehr, desto kleiner der Schaden
  const damage = 1 - defense / attack;
  const stolen = { money: Math.floor(state.resources.money * 0.15 * damage) };
  const goods = Object.keys(RESOURCES).filter(id => RESOURCES[id].stored && state.resources[id] > 0);
  for (let n = 0; n < 2 && goods.length; n++) {
    const id = goods.splice(Math.floor(Math.random() * goods.length), 1)[0];
    stolen[id] = Math.floor(state.resources[id] * 0.2 * damage);
  }
  for (const id in stolen) if (!stolen[id]) delete stolen[id];
  addResources(stolen, -1);
  addEffect('bandits', 60, { production: { money: 0.5 }, tradeBlocked: true });
  showEventPopup('🏴‍☠️', 'Banditen!', [
    `Banditen haben die Handelswege überfallen (Angriff ${attack}, deine Abwehr ${defense}).`,
    Object.keys(stolen).length ? `Geraubt: ${formatAmounts(stolen)}` : 'Zum Glück war nichts zu holen.',
    '60 Sekunden lang ist der Handel unsicher: kein Kauf und Verkauf am Markt, Märkte bringen nur die Hälfte.',
    defense === 0 ? 'Tipp: Wachhäuser, Wachtürme und Mauern (Reiter 🛡️ Schutz) wehren Banditen ab.' : 'Tipp: Mehr oder ausgebaute Wachposten und Mauern stärken die Abwehr.',
  ].join('\n'));
  camp.strength = Math.min(campMaxStrength(), camp.strength + 2);   // Erfolg macht die Bande stärker
  return true;
}

function offerTrade() {
  if (tradeBlocked()) return false;   // keine Karawanen, solange Banditen die Wege unsicher machen
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
    if (def.consumes) { processors.push(cell); return; }
    for (const [id, n] of Object.entries(buildingOutput(cell.type))) rates[id] = (rates[id] || 0) + n * levelFactor(cell) / def.interval;
  });
  rates.money = (rates.money || 0) + state.population * TAXES[state.taxLevel].perCitizen / CONFIG.taxInterval;
  rates.food = (rates.food || 0) - state.population * CONFIG.foodPerCitizen;
  // Verarbeitung läuft nur so weit, wie Rohstoffe (Vorrat + Zufluss) reichen
  const eff = secs * CONFIG.offlineEfficiency;
  for (const cell of processors) {
    const type = cell.type;
    const def = BUILDINGS[type];
    const lf = levelFactor(cell);
    let share = 1;
    for (const [id, n] of Object.entries(def.consumes)) {
      const need = n * lf / def.interval * eff;
      const avail = Math.max(0, state.resources[id] + (rates[id] || 0) * eff);
      share = Math.min(share, avail / need);
    }
    for (const [id, n] of Object.entries(def.consumes)) rates[id] = (rates[id] || 0) - share * n * lf / def.interval;
    for (const [id, n] of Object.entries(buildingOutput(type))) rates[id] = (rates[id] || 0) + share * n * lf / def.interval;
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
  updateCamps(dt);
}

// =====================================================================
// SPEICHERN / LADEN
// =====================================================================

// ---------- Speicherplätze (mehrere Städte) ----------

const ACTIVE_SLOT_KEY = 'stadtaufbau-active-slot';

function saveKeyOf(slot) {
  return CONFIG.saveKey + slot;
}

let activeSlot = (() => {
  try {
    const n = parseInt(localStorage.getItem(ACTIVE_SLOT_KEY), 10);
    return n >= 1 && n <= CONFIG.saveSlots ? n : 1;
  } catch (e) {
    return 1;
  }
})();

function cityNameOf(slot, data) {
  return (data && data.cityName) || `Stadt ${slot}`;
}

// Kurze Übersicht eines Speicherplatzes, ohne ihn zu laden
function slotSummary(slot) {
  let data = null;
  try {
    data = JSON.parse(localStorage.getItem(saveKeyOf(slot)));
  } catch (e) { /* leer oder kaputt */ }
  if (!data || !Array.isArray(data.buildings)) return { slot, empty: true, name: `Platz ${slot}` };
  const pop = data.population || 0;
  const level = LEVELS[levelFor(pop)];
  const when = data.savedAt ? new Date(data.savedAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  return { slot, empty: false, name: cityNameOf(slot, data), text: `${level.icon} ${level.name} · 👥 ${pop}${when ? ' · ' + when : ''}` };
}

// ---------- Stadt vollenden → Neustart mit Bonus ----------

function canCompleteCity() {
  return !state.completed && stats.level >= LEVELS.length - 1 && countBuildings('cathedral') > 0;
}

function completeCity() {
  if (!canCompleteCity()) return;
  const name = state.cityName || `Stadt ${activeSlot}`;
  let freeSlot = 0;
  for (let slot = 1; slot <= CONFIG.saveSlots && !freeSlot; slot++) {
    if (slot !== activeSlot && slotSummary(slot).empty) freeSlot = slot;
  }
  const next = legacy.stars + 1;
  const where = freeSlot
    ? `Deine neue Stadt entsteht auf dem freien Platz ${freeSlot} – „${name}“ bleibt erhalten.`
    : `Alle Speicherplätze sind belegt: Die neue Stadt ersetzt „${name}“! (Vorher exportieren, wenn du sie behalten willst.)`;
  if (!confirm(`🏆 „${name}“ vollenden?\n\nDu erhältst einen Stern Gründerruhm (dann ${next}): ` +
    `+${Math.round(CONFIG.legacyBonus * 100)} % Ertrag in allen Städten und mehr Startvorrat.\n\n${where}`)) return;
  legacy.stars = next;
  legacy.cities.push({ name, population: state.population, date: dateString(new Date()) });
  saveLegacy();
  state.completed = true;
  save();
  sound.play('levelup');
  if (freeSlot) {
    switchSlot(freeSlot);
  } else {
    saveBlocked = true;
    try { localStorage.removeItem(saveKeyOf(activeSlot)); } catch (e) { /* egal */ }
    location.reload();
  }
}

function switchSlot(slot) {
  if (slot === activeSlot) return;
  save();
  saveBlocked = true;   // beim Neuladen nicht den alten Stand in den neuen Platz schreiben
  try {
    localStorage.setItem(ACTIVE_SLOT_KEY, String(slot));
  } catch (e) { /* ohne Speicher kein Wechsel möglich */ }
  location.reload();
}

function deleteSlot(slot) {
  if (slot === activeSlot) return;
  const sum = slotSummary(slot);
  if (!confirm(`„${sum.name}“ endgültig löschen?`)) return;
  try { localStorage.removeItem(saveKeyOf(slot)); } catch (e) { /* egal */ }
  renderSlots();
}

function renameCity() {
  const name = prompt('Wie soll deine Stadt heißen?', state.cityName || `Stadt ${activeSlot}`);
  if (name === null) return;
  state.cityName = name.trim().slice(0, 30);
  save();
  renderSlots();
  updateUI();
}

function renderSlots() {
  const wrap = document.getElementById('slots');
  wrap.innerHTML = '';
  for (let slot = 1; slot <= CONFIG.saveSlots; slot++) {
    const sum = slot === activeSlot
      ? { slot, empty: false, name: state.cityName || `Stadt ${slot}`, text: `${LEVELS[stats.level].icon} ${LEVELS[stats.level].name} · 👥 ${state.population} · wird gerade gespielt` }
      : slotSummary(slot);
    const row = document.createElement('div');
    row.className = 'slot' + (slot === activeSlot ? ' active' : '') + (sum.empty ? ' empty' : '');
    row.innerHTML = `
      <div class="slot-text"><strong></strong><span></span></div>
      <div class="slot-buttons"></div>`;
    row.querySelector('strong').textContent = sum.empty ? `Platz ${slot} – frei` : sum.name;
    row.querySelector('span').textContent = sum.empty ? 'Hier kannst du eine neue Stadt gründen.' : sum.text;
    const buttons = row.querySelector('.slot-buttons');
    const add = (label, title, fn) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.title = title;
      b.addEventListener('click', fn);
      buttons.appendChild(b);
    };
    if (slot === activeSlot) add('✏️', 'Umbenennen', renameCity);
    else if (sum.empty) add('➕ Gründen', 'Neue Stadt auf diesem Platz', () => switchSlot(slot));
    else {
      add('▶️ Spielen', 'Zu dieser Stadt wechseln', () => switchSlot(slot));
      add('🗑️', 'Löschen', () => deleteSlot(slot));
    }
    wrap.appendChild(row);
  }
}

let saveBlocked = false;   // beim Import: verhindert, dass der alte Stand beim Neuladen zurückgeschrieben wird

function buildSaveData() {
  const buildings = [];
  state.grid.forEach((cell, i) => {
    if (cell) buildings.push({ x: i % N, y: Math.floor(i / N), type: cell.type, timer: cell.timer, fire: cell.fire, level: cell.level, w: cell.w, h: cell.h });
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
    plots: state.plots.map((owned, i) => (owned ? i : -1)).filter(i => i >= 0),
    plotsGranted: state.plotsGranted,
    cityName: state.cityName,
    completed: state.completed,
    camps: state.camps,
    campSpawnIn: state.campSpawnIn,
    buildings,
  };
  return data;
}

function save() {
  if (saveBlocked) return;
  try {
    localStorage.setItem(saveKeyOf(activeSlot), JSON.stringify(buildSaveData()));
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
    data = JSON.parse(localStorage.getItem(saveKeyOf(activeSlot)));
  } catch (e) {
    return false;
  }
  if (!data || data.v !== CONFIG.saveVersion) return false;
  for (const id in RESOURCES) {
    if (typeof data.resources?.[id] === 'number') state.resources[id] = data.resources[id];
  }
  // Spielstand von einer kleineren Karte: Stadt in die Mitte der neuen Karte schieben
  const oldSize = data.gridSize || 16;
  const offset = Math.max(0, Math.floor((N - oldSize) / 2));
  for (const b of data.buildings || []) {
    b.x += offset;
    b.y += offset;
    // Größe aus dem Spielstand; ohne Angabe ist es ein Altbau mit 1×1
    const w = Number.isInteger(b.w) && b.w > 1 ? b.w : 1, h = Number.isInteger(b.h) && b.h > 1 ? b.h : 1;
    let fits = !!BUILDINGS[b.type];
    for (let dy = 0; dy < h && fits; dy++) for (let dx = 0; dx < w && fits; dx++) fits = anchorAt(b.x + dx, b.y + dy) === -1;
    if (fits) {
      const cell = { type: b.type, timer: b.timer || 0 };
      if (w > 1 || h > 1) { cell.w = w; cell.h = h; }
      setOccupied(b.x, b.y, w, h, b.y * N + b.x);
      if (Number.isInteger(b.level) && b.level > 1 && b.level <= MAX_BUILDING_LEVEL && canUpgradeType(b.type)) cell.level = b.level;
      if (b.fire && typeof b.fire.left === 'number') cell.fire = b.fire;
      state.grid[b.y * N + b.x] = cell;
    }
  }
  // Land: gespeicherte Parzellen (nur bei gleicher Kartengröße), dazu alles, worauf schon gebaut ist
  const hadPlots = Array.isArray(data.plots) && oldSize === N;
  if (hadPlots) {
    for (const p of data.plots) if (p >= 0 && p < P * P) state.plots[p] = true;
    if (Number.isFinite(data.plotsGranted)) state.plotsGranted = data.plotsGranted;
  }
  const ownedBefore = state.plots.filter(Boolean).length;
  state.grid.forEach((cell, i) => {
    if (!cell) return;
    const [w, h] = sizeOf(cell);
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) state.plots[plotOf(i % N + dx, Math.floor(i / N) + dy)] = true;
  });
  state.plotsGranted += state.plots.filter(Boolean).length - ownedBefore;   // geschenkt, nicht gekauft
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
  if (typeof data.cityName === 'string') state.cityName = data.cityName.slice(0, 30);
  state.completed = data.completed === true;
  if (Array.isArray(data.camps)) {
    state.camps = data.camps.filter(c => Number.isFinite(c.x) && Number.isFinite(c.y) && !isOwned(c.x, c.y)).slice(0, CONFIG.maxCamps);
  }
  if (Number.isFinite(data.campSpawnIn)) state.campSpawnIn = data.campSpawnIn;
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
let infoPlot = null;       // angezeigte Parzelle (infoMode 'plot')
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

  // Nur den sichtbaren Ausschnitt zeichnen (die Karte ist groß)
  const vis = visibleRange();

  // Rasterlinien
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1 / view.zoom;
  ctx.beginPath();
  for (let i = vis.x0; i <= vis.x1 + 1; i++) { ctx.moveTo(i * T, vis.y0 * T); ctx.lineTo(i * T, (vis.y1 + 1) * T); }
  for (let i = vis.y0; i <= vis.y1 + 1; i++) { ctx.moveTo(vis.x0 * T, i * T); ctx.lineTo((vis.x1 + 1) * T, i * T); }
  ctx.stroke();

  drawLand(vis);
  drawServiceAreas();

  // Straßen zuerst, damit sie unter allem liegen
  forEachVisible(vis, (cell, x, y) => {
    if (BUILDINGS[cell.type].isRoad) drawRoad(x, y, BUILDINGS[cell.type], 1);
    else if (BUILDINGS[cell.type].isWall) drawWall(x, y, 1);
  });
  drawWalkers();

  // Gebäude
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  forEachVisible(vis, (cell, x, y) => {
    if (BUILDINGS[cell.type].isRoad || BUILDINGS[cell.type].isWall) return;
    const active = isActive(x, y);
    const [w, h] = sizeOf(cell);
    const age = (performance.now() - (cell.builtAt || 0)) / 1000;
    const scale = age < 0.35 ? easeOutBack(age / 0.35) : 1;   // Plopp beim Bauen
    drawBuilding(x, y, BUILDINGS[cell.type], active || cell.fire ? 1 : 0.55, scale, w, h);
    const mx = (x + w - 0.2) * T, my = (y + 0.22) * T;      // Ecke oben rechts für Hinweise
    if (cell.fire) {
      drawFire(x, y, cell.fire, w, h);
    } else if (active && BUILDINGS[cell.type].jobs && staffOf(cell.type) < 0.995) {
      ctx.font = `${T * 0.28}px ${EMOJI_FONT}`;
      ctx.fillText('👷', mx, my);
    } else if (active && cell.waiting) {
      ctx.font = `${T * 0.28}px ${EMOJI_FONT}`;
      ctx.fillText('⏸️', mx, my);
    } else if (active && BUILDINGS[cell.type].population && isNiceHouse(x, y)) {
      ctx.font = `${T * 0.26}px ${EMOJI_FONT}`;
      ctx.fillText('✨', (x + 0.2) * T, (y + 0.22) * T);
    } else if (!active) {
      ctx.font = `${T * 0.3}px ${EMOJI_FONT}`;
      ctx.fillText('⚠️', mx, my);
    }
  });

  // Ausbaustufe als Sterne unten am Gebäude
  ctx.font = `bold ${T * 0.22}px system-ui, sans-serif`;
  ctx.lineWidth = 3 / view.zoom;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.fillStyle = '#ffd166';
  forEachVisible(vis, (cell, x, y) => {
    if (levelOf(cell) < 2) return;
    const stars = '★'.repeat(levelOf(cell) - 1);
    const [w, h] = sizeOf(cell);
    ctx.strokeText(stars, (x + w / 2) * T, (y + h - 0.12) * T);
    ctx.fillText(stars, (x + w / 2) * T, (y + h - 0.12) * T);
  });

  drawSmoke();

  // Nacht: abdunkeln, dann Lichter darüber
  const dark = darkness();
  if (dark > 0) {
    ctx.fillStyle = `rgba(10, 20, 55, ${dark})`;
    ctx.fillRect(0, 0, N * T, N * T);
    drawLights(dark, vis);
  }
  if (season().heating && settings.daynight) drawSnow(dt, s);

  // Bau-Vorschau unter der Maus
  drawPlotPrices(vis);
  drawCamps(dark);

  if (selectedType && hoverTile && getCell(hoverTile.x, hoverTile.y) === null) {
    const def = BUILDINGS[selectedType];
    const [w, h] = footprintSize(selectedType);
    if (!canPlaceAt(selectedType, hoverTile.x, hoverTile.y)) {
      outlineRect(hoverTile.x, hoverTile.y, w, h, '#c0392b');
    } else {
      if (def.isRoad) drawRoad(hoverTile.x, hoverTile.y, def, 0.5);
      else if (def.isWall) drawWall(hoverTile.x, hoverTile.y, 0.5);
      else drawBuilding(hoverTile.x, hoverTile.y, def, 0.5, 1, w, h);
      if (!canAfford(costOf(selectedType))) outlineRect(hoverTile.x, hoverTile.y, w, h, '#c0392b');
    }
  } else if (hoverTile && getCell(hoverTile.x, hoverTile.y) !== undefined) {
    outlineTile(hoverTile, 'rgba(255,255,255,0.6)');
  }

  const infoCellNow = infoTile && state.grid[infoTile.y * N + infoTile.x];
  if (infoCellNow) outlineRect(infoTile.x, infoTile.y, ...sizeOf(infoCellNow), '#ffd166');
  if (demolishSelection.size) drawDemolishSelection();
  if (infoMode === 'plot') outlinePlot(infoPlot);

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
      const area = cell && areaOfCell(cell);
      if (area && area.key === selArea.key) drawArea(i % N, Math.floor(i / N), area.radius, 'rgba(255,255,255,0.15)', ...sizeOf(cell));
    });
    if (hoverTile && getCell(hoverTile.x, hoverTile.y) === null) {
      drawArea(hoverTile.x, hoverTile.y, selArea.radius, 'rgba(255,209,102,0.3)', ...footprintSize(selectedType));
    }
  }
  const infoCell = infoTile && state.grid[infoTile.y * N + infoTile.x];
  const infoArea = infoCell && areaOfCell(infoCell);
  if (infoArea) drawArea(infoTile.x, infoTile.y, infoArea.radius, 'rgba(255,209,102,0.3)', ...sizeOf(infoCell));
}

function drawFire(x, y, fire, w = 1, h = 1) {
  const t = performance.now() / 1000;
  ctx.fillStyle = `rgba(230, 57, 70, ${0.35 + 0.15 * Math.sin(t * 8)})`;
  ctx.fillRect(x * T, y * T, w * T, h * T);
  const size = T * Math.min(w, h) * (0.5 + 0.06 * Math.sin(t * 11 + x + y));
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.fillText(fire.brigade ? '🚒' : '🔥', (x + w / 2) * T, (y + h / 2 - 0.05) * T);
  // Restzeit als Balken
  const max = fire.max || (fire.brigade ? CONFIG.fireBrigadeSeconds : CONFIG.fireBurnSeconds);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x * T + 4, (y + h) * T - 8, w * T - 8, 4);
  ctx.fillStyle = fire.brigade ? '#4dabf7' : '#ffd166';
  ctx.fillRect(x * T + 4, (y + h) * T - 8, (w * T - 8) * Math.max(0, fire.left / max), 4);
}

function drawArea(x, y, r, color, w = 1, h = 1) {
  const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r);
  const x1 = Math.min(N - 1, x + w - 1 + r), y1 = Math.min(N - 1, y + h - 1 + r);
  ctx.fillStyle = color;
  ctx.fillRect(x0 * T, y0 * T, (x1 - x0 + 1) * T, (y1 - y0 + 1) * T);
}

const EMOJI_FONT = 'system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

function drawBuilding(x, y, def, alpha, scale = 1, w = 1, h = 1) {
  const pad = T * 0.06;
  const cx = (x + w / 2) * T, cy = (y + h / 2) * T;
  ctx.save();
  if (scale !== 1) {
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
  }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = def.color;
  roundRect(x * T + pad, y * T + pad, w * T - pad * 2, h * T - pad * 2, T * 0.15);
  ctx.fill();
  if (w > 1 || h > 1) {
    // Große Gebäude: dezente Kante, damit man die Fläche erkennt
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = '#000';
  // Symbolgröße: 1×1 normal, 2×1 etwas größer, 2×2 und 3×3 deutlich größer
  const iconScale = Math.min(w, h) >= 3 ? 2.4 : Math.min(w, h) === 2 ? 1.8 : Math.max(w, h) > 1 ? 1.25 : 1;
  ctx.font = `${T * 0.6 * iconScale}px ${EMOJI_FONT}`;
  ctx.fillText(def.icon, cx, cy + T * 0.04 * Math.min(w, h));
  ctx.restore();
}

// Sichtbarer Kartenausschnitt in Feldern (mit einem Feld Rand)
function visibleRange() {
  const left = -view.x / view.zoom / T, top = -view.y / view.zoom / T;
  return {
    x0: clamp(Math.floor(left) - 3, 0, N - 1),   // große Gebäude links/oben vom Bild ragen hinein
    y0: clamp(Math.floor(top) - 3, 0, N - 1),
    x1: clamp(Math.ceil(left + view.w / view.zoom / T) + 1, 0, N - 1),
    y1: clamp(Math.ceil(top + view.h / view.zoom / T) + 1, 0, N - 1),
  };
}

function forEachVisible(vis, fn) {
  for (let y = vis.y0; y <= vis.y1; y++) {
    for (let x = vis.x0; x <= vis.x1; x++) {
      const cell = state.grid[y * N + x];
      if (cell) fn(cell, x, y);
    }
  }
}

// Fremdes Land abdunkeln, Grenzen des eigenen Landes betonen
function drawLand(vis) {
  const S = CONFIG.plotSize;
  const p0x = Math.floor(vis.x0 / S), p1x = Math.floor(vis.x1 / S);
  const p0y = Math.floor(vis.y0 / S), p1y = Math.floor(vis.y1 / S);
  ctx.fillStyle = 'rgba(20, 45, 30, 0.45)';
  for (let py = p0y; py <= p1y; py++) {
    for (let px = p0x; px <= p1x; px++) {
      if (!state.plots[py * P + px]) ctx.fillRect(px * S * T, py * S * T, S * T, S * T);
    }
  }
  // Grenzlinie zwischen eigenem und fremdem Land
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 2 / view.zoom;
  ctx.setLineDash([8 / view.zoom, 6 / view.zoom]);
  ctx.beginPath();
  for (let py = p0y; py <= p1y; py++) {
    for (let px = p0x; px <= p1x; px++) {
      if (!state.plots[py * P + px]) continue;
      const owned = (qx, qy) => qx >= 0 && qy >= 0 && qx < P && qy < P && state.plots[qy * P + qx];
      const X = px * S * T, Y = py * S * T, L = S * T;
      if (!owned(px, py - 1)) { ctx.moveTo(X, Y); ctx.lineTo(X + L, Y); }
      if (!owned(px, py + 1)) { ctx.moveTo(X, Y + L); ctx.lineTo(X + L, Y + L); }
      if (!owned(px - 1, py)) { ctx.moveTo(X, Y); ctx.lineTo(X, Y + L); }
      if (!owned(px + 1, py)) { ctx.moveTo(X + L, Y); ctx.lineTo(X + L, Y + L); }
    }
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

// Preisschild auf allen kaufbaren Parzellen im Bild
function drawPlotPrices(vis) {
  const S = CONFIG.plotSize;
  const price = plotPrice().money;
  const affordable = state.resources.money >= price;
  const size = Math.max(T * 0.7, 14 / view.zoom);   // auch weit herausgezoomt lesbar
  ctx.font = `bold ${size}px system-ui, ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let py = Math.floor(vis.y0 / S); py <= Math.floor(vis.y1 / S); py++) {
    for (let px = Math.floor(vis.x0 / S); px <= Math.floor(vis.x1 / S); px++) {
      const p = py * P + px;
      if (!canBuyPlot(p)) continue;
      const cx = (px + 0.5) * S * T;
      let cy = (py + 0.5) * S * T;
      // Steht hier ein Banditenlager, rückt das Preisschild in die andere Hälfte der Fläche
      const camp = state.camps.find(c => plotOf(c.x, c.y) === p);
      if (camp) cy += (camp.y + 0.5) * T < cy ? S * T * 0.3 : -S * T * 0.3;
      const text = `🏷️ ${formatNumber(price)}`;
      const w = ctx.measureText(text).width + size;
      ctx.fillStyle = affordable ? 'rgba(45, 106, 79, 0.9)' : 'rgba(0, 0, 0, 0.55)';
      roundRect(cx - w / 2, cy - size * 0.8, w, size * 1.6, size * 0.5);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(text, cx, cy);
    }
  }
}

function drawDemolishSelection() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${T * 0.4}px system-ui, sans-serif`;
  for (const i of demolishSelection) {
    const cell = state.grid[i];
    if (!cell) continue;
    const x = i % N, y = Math.floor(i / N);
    const [w, h] = sizeOf(cell);
    ctx.fillStyle = 'rgba(230, 57, 70, 0.45)';
    ctx.fillRect(x * T, y * T, w * T, h * T);
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 2 / view.zoom;
    ctx.strokeRect(x * T + 1, y * T + 1, w * T - 2, h * T - 2);
    ctx.fillStyle = '#fff';
    ctx.fillText('✖', (x + w / 2) * T, (y + h / 2) * T);
  }
}

function outlinePlot(p) {
  const S = CONFIG.plotSize;
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 3 / view.zoom;
  ctx.strokeRect((p % P) * S * T, Math.floor(p / P) * S * T, S * T, S * T);
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

function drawLights(dark, vis) {
  const k = dark / CONFIG.nightDarkness;   // 0…1
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  forEachVisible(vis, (cell, x, y) => {
    const def = BUILDINGS[cell.type];
    const [w, h] = sizeOf(cell);
    const cx = (x + w / 2) * T, cy = (y + h / 2) * T;
    if (cell.fire) {
      glow(cx, cy, T * 1.4 * Math.max(w, h), `rgba(255, 110, 30, ${0.8 * k})`);
    } else if (def.isWall) {
      // Mauern leuchten nicht
    } else if (def.isRoad) {
      if ((x * 7 + y * 13) % 4 === 0) glow(cx, cy, T * 0.6, `rgba(255, 220, 150, ${0.35 * k})`);
    } else if (isActive(x, y) && (!def.population || state.population > 0)) {
      glow(cx, cy, T * 0.8 * Math.max(w, h), `rgba(255, 190, 90, ${0.45 * k})`);
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
      x: (x + (cell.w || 1) - 0.25) * T, y: (y + 0.18) * T,
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

// Mauerstück: dicker Steinstrang mit Zinnen, verbunden mit Nachbarmauern
function drawWall(x, y, alpha) {
  const w = T * 0.36, c = (T - w) / 2, px = x * T, py = y * T;
  const isWallAt = (dx, dy) => { const n = getCell(x + dx, y + dy); return n && BUILDINGS[n.type].isWall; };
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#7d7468';
  ctx.fillRect(px + c, py + c, w, w);
  if (isWallAt(0, -1)) ctx.fillRect(px + c, py, w, c);
  if (isWallAt(1, 0)) ctx.fillRect(px + c + w, py + c, c, w);
  if (isWallAt(0, 1)) ctx.fillRect(px + c, py + c + w, w, c);
  if (isWallAt(-1, 0)) ctx.fillRect(px, py + c, c, w);
  ctx.fillStyle = '#5c544a';   // Zinnen
  const z = T * 0.12;
  ctx.fillRect(px + c, py + c, z, z);
  ctx.fillRect(px + c + w - z, py + c, z, z);
  ctx.fillRect(px + c, py + c + w - z, z, z);
  ctx.fillRect(px + c + w - z, py + c + w - z, z, z);
  ctx.globalAlpha = 1;
}

// Banditenlager: Zelt mit Flagge und Stärke; nachts glimmt das Lagerfeuer
function drawCamps(dark) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const camp of state.camps) {
    const cx = (camp.x + 0.5) * T, cy = (camp.y + 0.5) * T;
    if (dark > 0) glow(cx, cy + T * 0.4, T * 1.6, `rgba(255, 120, 40, ${0.6 * dark / CONFIG.nightDarkness})`);
    ctx.fillStyle = 'rgba(60, 20, 20, 0.35)';
    ctx.beginPath();
    ctx.arc(cx, cy + T * 0.1, T * 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `${T * 1.2}px ${EMOJI_FONT}`;
    ctx.fillText('⛺', cx, cy);
    ctx.font = `${T * 0.55}px ${EMOJI_FONT}`;
    ctx.fillText('🏴‍☠️', cx + T * 0.55, cy - T * 0.55);
    const label = `⚔️ ${Math.round(camp.strength)}`;
    ctx.font = `bold ${Math.max(T * 0.36, 12 / view.zoom)}px system-ui, sans-serif`;
    const tw = ctx.measureText(label).width + T * 0.3;
    ctx.fillStyle = 'rgba(122, 46, 46, 0.9)';
    roundRect(cx - tw / 2, cy + T * 0.7, tw, T * 0.5, T * 0.2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(label, cx, cy + T * 0.95);
  }
}

function outlineRect(x, y, w, h, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3 / view.zoom;
  ctx.strokeRect(x * T + 1, y * T + 1, w * T - 2, h * T - 2);
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
  cameraTween = null;
  pan = { startX: p.x, startY: p.y, viewX: view.x, viewY: view.y };
}

function startPinch() {
  cameraTween = null;
  const [a, b] = [...pointers.values()];
  pinch = {
    dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
    midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2,
    zoom: view.zoom, viewX: view.x, viewY: view.y,
  };
}

canvas.addEventListener('pointerdown', e => {
  collapseOverlays();
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
    if (e.button !== 1 && demolishMode) {
      paint = { last: screenToTile(p.x, p.y), started: false, select: true };
    } else if (e.button !== 1 && selectedType && BUILDINGS[selectedType].dragBuild) {
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
  if (paint.select) {
    // Abriss-Modus: alles Bebaute entlang des Wegs markieren
    if (!paint.started) {
      paint.started = true;
      tapStart = null;
      markForDemolish(paint.last.x, paint.last.y, true);
    }
    for (const t of tileLine(paint.last, tile)) markForDemolish(t.x, t.y, true);
    paint.last = tile;
    updateDemolishBar();
    return;
  }
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
// Nach einem Tipp auf die Karte schickt der Browser noch einen „click“ an die Fingerposition –
// dort liegt dann oft schon ein Knopf des gerade geöffneten Info-Fensters. Das verhindern wir hier.
canvas.addEventListener('touchend', e => e.preventDefault(), { passive: false });

// Mausrad: zoomen um den Mauszeiger
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const p = pointerPos(e);
  zoomAt(p.x, p.y, view.zoom * Math.exp(-e.deltaY * 0.0015));
}, { passive: false });

// Tastatur: Tab wechselt die Kategorie, 1–9 wählt ein Gebäude darin, Esc bricht ab
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;   // Tippen im Import-Feld
  if (demolishMode && (e.key === 'Delete' || e.key === 'Backspace')) {
    sellSelection();
    return;
  }
  if (e.key === 'Escape') {
    if (demolishMode && demolishSelection.size) {
      clearDemolishSelection();
      return;
    }
    selectBuild(null);
    closePanels();
    return;
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    const cats = [...Object.keys(CATEGORIES), 'demolish'];
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
  if (demolishMode) {
    if (cell) markForDemolish(x, y);
    updateDemolishBar();
    return;
  }
  if (cell) {
    showInfo(x, y);
    return;
  }
  const campIndex = state.camps.findIndex(c => Math.abs(c.x - x) <= 1 && Math.abs(c.y - y) <= 1);
  if (campIndex >= 0) {
    showCampInfo(campIndex);
    return;
  }
  if (cell === null && !isOwned(x, y)) {
    showPlotInfo(plotOf(x, y));
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
  if (cat === 'demolish') enterDemolishMode();
  else if (demolishMode) exitDemolishMode();
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
    if (cat === 'demolish') {
      tab.classList.toggle('active', demolishMode);
      continue;
    }
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
  // Eigener Reiter zum Markieren und Abreißen
  const demolishTab = document.createElement('button');
  demolishTab.className = 'build-tab demolish-tab';
  demolishTab.dataset.category = 'demolish';
  demolishTab.title = 'Abriss: Gebäude und Straßen markieren und verkaufen';
  demolishTab.innerHTML = '<span class="icon">🧹</span><span class="name">Abriss</span>';
  demolishTab.addEventListener('click', () => showCategory(demolishMode ? Object.keys(CATEGORIES)[0] : 'demolish'));
  tabs.appendChild(demolishTab);
  categoryTabs.demolish = demolishTab;
  document.getElementById('demolish-sell').addEventListener('click', sellSelection);
  document.getElementById('demolish-clear').addEventListener('click', clearDemolishSelection);

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
  effectsEl.addEventListener('click', e => {
    if (e.target.closest('[data-action="jobs"]')) showJobsInfo();
    if (e.target.closest('[data-action="camp"]') && state.camps.length) {
      const i = state.camps.indexOf(state.camps.reduce((a, b) => (b.strength > a.strength ? b : a)));
      showCampInfo(i);
      panCameraToTile(state.camps[i].x, state.camps[i].y);
    }
  });
  document.getElementById('info-more-toggle').addEventListener('click', () => {
    infoExpanded = !infoExpanded;
    renderInfo();
    if (infoTile) requestAnimationFrame(() => keepTileVisible(infoTile.x, infoTile.y));
  });
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
    if (!infoTile || !infoClickAllowed()) return;
    // Verkaufen nur nach zweitem Tippen – ein versehentlicher Tipp löscht nie sofort
    const armed = sellArmed && sellArmed.x === infoTile.x && sellArmed.y === infoTile.y && performance.now() < sellArmed.until;
    if (!armed) {
      sellArmed = { x: infoTile.x, y: infoTile.y, until: performance.now() + 3000 };
      renderInfo();
      return;
    }
    sellArmed = null;
    demolish(infoTile.x, infoTile.y);
  });
  document.getElementById('info-upgrade').addEventListener('click', () => {
    if (infoTile && infoClickAllowed()) upgradeBuilding(infoTile.x, infoTile.y);
  });
  document.getElementById('info-action').addEventListener('click', () => {
    if (!infoClickAllowed()) return;
    if (infoMode === 'plot') buyPlot(infoPlot);
    else if (infoMode === 'camp') clearCamp(infoCamp);
    else if (infoMode === 'city') completeCity();
    else if (infoTile) extinguish(infoTile.x, infoTile.y);
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
  setupTransfer();
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
  if (buildInfoEl.dataset.type && !buildInfoEl.classList.contains('hidden')) {
    const status = buildInfoEl.querySelector('.bi-status');
    const type = buildInfoEl.dataset.type;
    const meta = buildInfoEl.querySelector('.bi-meta');
    if (meta) {
      meta.textContent = buildInfoMeta(type);
      meta.classList.toggle('unaffordable', isUnlocked(type) && !canAfford(costOf(type)));
    }
    if (status && isUnlocked(type) && !(BUILDINGS[type].landmark && countBuildings(type) > 0)) {
      status.textContent = `Kosten: ${formatAmounts(costOf(type))}${BUILDINGS[type].fixedCost ? '' : ' (jedes weitere kostet mehr)'}`;
      status.classList.toggle('unaffordable', !canAfford(costOf(type)));
    }
  }
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
  renderSlots();
  settingsEl.classList.remove('hidden');
}

function closeSettings() {
  settingsEl.classList.add('hidden');
  document.getElementById('transfer').classList.add('hidden');
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

// ---------- Abriss-Modus: markieren und verkaufen ----------

let demolishMode = false;
const demolishSelection = new Set();   // Feldindizes

function enterDemolishMode() {
  demolishMode = true;
  selectBuild(null);
  closePanels();
  canvas.classList.add('demolishing');
  document.getElementById('buildbar').classList.add('hidden');
  document.getElementById('demolish-bar').classList.remove('hidden');
  updateDemolishBar();
}

function exitDemolishMode() {
  demolishMode = false;
  demolishSelection.clear();
  canvas.classList.remove('demolishing');
  document.getElementById('buildbar').classList.remove('hidden');
  document.getElementById('demolish-bar').classList.add('hidden');
}

// add: true = nur hinzufügen (beim Ziehen), sonst umschalten (beim Tippen)
function markForDemolish(x, y, add = false) {
  const i = anchorAt(x, y);
  if (i === undefined || i < 0) return;
  if (add || !demolishSelection.has(i)) demolishSelection.add(i);
  else demolishSelection.delete(i);
}

function clearDemolishSelection() {
  demolishSelection.clear();
  updateDemolishBar();
}

// Rückerstattung für die ganze Auswahl – je Gebäudeart sinken die Preise beim Abreißen nacheinander
function selectionRefund() {
  const refund = {};
  const removed = {};
  for (const i of demolishSelection) {
    const cell = state.grid[i];
    if (!cell) continue;
    removed[cell.type] = (removed[cell.type] || 0) + 1;
    for (const [id, n] of Object.entries(refundOf(cell, -removed[cell.type]))) refund[id] = (refund[id] || 0) + n;
  }
  return refund;
}

function updateDemolishBar() {
  for (const i of [...demolishSelection]) if (!state.grid[i]) demolishSelection.delete(i);   // inzwischen weg
  const count = demolishSelection.size;
  const onlyRoads = count > 0 && [...demolishSelection].every(i => BUILDINGS[state.grid[i].type].isRoad);
  const refund = selectionRefund();
  document.getElementById('demolish-info').textContent = count === 0
    ? 'Tippe Gebäude oder Straßen an, um sie zu markieren. Ziehen markiert mehrere.'
    : `${count} markiert · zurück: ${formatAmounts(refund) || 'nichts'}`;
  const sell = document.getElementById('demolish-sell');
  sell.disabled = count === 0;
  sell.textContent = onlyRoads ? '🗑️ Löschen' : '💰 Verkaufen';
  document.getElementById('demolish-clear').disabled = count === 0;
}

function sellSelection() {
  const count = demolishSelection.size;
  if (count === 0) return;
  const houses = [...demolishSelection].filter(i => BUILDINGS[state.grid[i].type].population).length;
  if (count > 1 || houses > 0) {
    const warn = houses ? `\n\nAchtung: ${houses} Wohnhaus/Wohnhäuser – die Bewohner ziehen aus.` : '';
    if (!confirm(`${count} ${count === 1 ? 'Objekt' : 'Objekte'} abreißen? Du bekommst ${formatAmounts(selectionRefund())} zurück.${warn}`)) return;
  }
  for (const i of [...demolishSelection]) {
    const cell = state.grid[i];
    if (!cell) continue;
    addResources(refundOf(cell), 1);
    removeBuildingAt(i);
    emit('demolish', { x: i % N, y: Math.floor(i / N), type: cell.type, w: cell.w || 1, h: cell.h || 1 });
  }
  demolishSelection.clear();
  showToast(`🧹 ${count} ${count === 1 ? 'Objekt' : 'Objekte'} abgerissen`);
  recalcStats();
  updateUI();
  updateDemolishBar();
}

function selectBuild(type) {
  if (type && demolishMode) {
    showCategory(BUILDINGS[type].category);   // Bauen beendet den Abriss-Modus
  }
  if (type && !isUnlocked(type)) {
    // Gesperrt: nicht auswählen, aber zeigen, was das Gebäude kann und wann es kommt
    sound.play('error');
    showBuildInfo(type);
    return;
  }
  selectedType = type;
  canvas.classList.toggle('building', !!type);
  if (type) showBuildInfo(type);
  else hideBuildInfo();
  updateUI();
}

// ---------- Kurzinfo zu Gebäuden (Bauleiste und Info-Fenster) ----------

// Was macht das Gebäude? Eine Zeile je Eigenschaft, kurz und verständlich
function describeBuilding(type) {
  const def = BUILDINGS[type];
  const lines = [];
  if (def.isRoad) lines.push('🛣️ Gebäude direkt daneben bekommen Anschluss – ohne Straße arbeitet nichts.');
  const [fw, fh] = footprintSize(type);
  if (fw > 1 || fh > 1) lines.push(`📐 Braucht ${fw} × ${fh} Felder (angetipptes Feld = linke obere Ecke)`);
  if (def.population) lines.push(`👥 ${capacityOf(type)} Wohnplätze (+${CONFIG.niceHouseBonus} neben Park oder Brunnen)`);
  if (def.interval && def.consumes) {
    lines.push(`🔁 Verarbeitet ${formatAmounts(def.consumes)} → ${formatAmounts(def.produces)} alle ${def.interval} s`);
  } else if (def.interval && def.produces) {
    lines.push(`📦 Erzeugt ${formatAmounts(def.produces)} alle ${def.interval} s`);
  }
  if (def.perPopulation) {
    lines.push(`💰 ${formatAmounts(def.perPopulation)} je Einwohner alle ${def.interval} s` +
      (def.servesUpTo ? ` (höchstens ${def.servesUpTo} Einwohner je Gebäude)` : ''));
  }
  if (type === 'market') lines.push('🤝 Antippen zum Handeln: Waren kaufen und verkaufen');
  if (def.service) lines.push(`${NEEDS[def.service.need].icon} ${NEEDS[def.service.need].name} für Häuser im Umkreis von ${def.service.radius} Feldern`);
  if (def.fireRadius) lines.push(`🚒 Löscht Brände im Umkreis von ${def.fireRadius} Feldern`);
  if (def.defense) lines.push(`🏴‍☠️ Schützt Gebäude im Umkreis von ${def.defense.radius} Feldern vor Banditen (Abwehr ${def.defense.strength})`);
  if (def.isWall) lines.push(`🏴‍☠️ Jedes Stück: Abwehr +${CONFIG.wallDefense} für die ganze Stadt (höchstens +${CONFIG.wallDefenseMax})`);
  if (def.storage) lines.push(`📦 +${def.storage} Lagerplatz für Holz, Stein, Nahrung und Waren`);
  if (def.beautifies) lines.push(`✨ Häuser direkt daneben bekommen +${CONFIG.niceHouseBonus} Wohnplätze`);
  if (def.landmark) lines.push(`🏛️ Zufriedenheit +${def.landmark} für die ganze Stadt – gibt es nur einmal`);
  if (def.jobs) {
    const job = jobOf(type);
    lines.push(`${JOBS[job].icon} Braucht ${def.jobs[job]} ${JOBS[job].name}`);
  }
  if (def.needsRoad) lines.push('🛣️ Braucht eine Straße direkt daneben');
  if (canUpgradeType(type)) lines.push('⬆️ Später ausbaubar (Stufe 2 ab Kleinstadt, Stufe 3 ab Stadt)');
  return lines;
}

const buildInfoEl = document.getElementById('build-info');

// Kurzinfo: standardmäßig nur eine schmale Zeile (die Karte bleibt frei), Details über ⓘ
let buildInfoExpanded = false;

// Kurze Zustandsangabe für die Zeile: Kosten, „gesperrt“ oder „schon gebaut“
function buildInfoMeta(type) {
  const def = BUILDINGS[type];
  const [w, h] = footprintSize(type);
  const size = w > 1 || h > 1 ? `${w}×${h} · ` : '';
  if (!isUnlocked(type)) return `${size}🔒 ${lockReason(type)}`;
  if (def.landmark && countBuildings(type) > 0) return `${size}✔ gebaut`;
  return size + formatAmounts(costOf(type));
}

function showBuildInfo(type) {
  const def = BUILDINGS[type];
  if (buildInfoEl.dataset.type !== type) buildInfoExpanded = !isUnlocked(type);   // gesperrt: gleich erklären, warum
  buildInfoEl.dataset.type = type;
  const locked = !isUnlocked(type);
  const built = def.landmark && countBuildings(type) > 0;
  const status = locked ? `🔒 Erst nach ${lockReason(type, true)}`
    : built ? '✔ Schon gebaut'
    : `Kosten: ${formatAmounts(costOf(type))}${def.fixedCost ? '' : ' (jedes weitere kostet mehr)'}`;
  buildInfoEl.innerHTML = `
    <div class="bi-head"><span class="bi-icon">${def.icon}</span><strong>${def.name}</strong>
      <span class="bi-meta"></span>
      <button class="bi-more" title="Was macht das Gebäude?">ⓘ</button>
      <button class="bi-close" title="Schließen">✕</button></div>
    <div class="bi-details">
      <div class="bi-desc">${def.description}</div>
      <ul class="bi-facts">${describeBuilding(type).map(l => `<li>${l}</li>`).join('')}</ul>
      <div class="bi-status${locked ? ' locked' : ''}">${status}</div>
    </div>`;
  buildInfoEl.querySelector('.bi-meta').textContent = buildInfoMeta(type);
  buildInfoEl.classList.toggle('expanded', buildInfoExpanded);
  buildInfoEl.querySelector('.bi-more').addEventListener('click', () => {
    buildInfoExpanded = !buildInfoExpanded;
    buildInfoEl.classList.toggle('expanded', buildInfoExpanded);
  });
  buildInfoEl.querySelector('.bi-close').addEventListener('click', () => {
    if (selectedType === type) selectBuild(null);
    else hideBuildInfo();
  });
  buildInfoEl.classList.remove('hidden');
}

// Wer die Karte berührt, will sie sehen: Details zuklappen
function collapseOverlays() {
  if (buildInfoExpanded) {
    buildInfoExpanded = false;
    buildInfoEl.classList.remove('expanded');
  }
  if (infoExpanded && infoMode) {
    infoExpanded = false;
    renderInfo();
  }
}

function hideBuildInfo() {
  buildInfoEl.classList.add('hidden');
  buildInfoEl.dataset.type = '';
}

function showInfo(x, y) {
  const a = anchorAt(x, y);
  if (a >= 0) { x = a % N; y = Math.floor(a / N); }   // großes Gebäude: immer die linke obere Ecke
  closeQuests();
  closeResearch();
  closeSettings();
  const same = infoTile && infoTile.x === x && infoTile.y === y;
  infoMode = 'tile';
  infoTile = { x, y };
  if (!same) {
    infoExpanded = false;
    sellArmed = null;
  }
  infoOpenedAt = performance.now();
  clearInfoExtra();
  infoEl.classList.remove('hidden');
  renderInfo();
  requestAnimationFrame(() => keepTileVisible(x, y));
}

// Liegt das Feld unter dem Info-Fenster oder am Rand, schiebt sich die Karte sanft,
// bis es mittig im freien Bereich über dem Fenster liegt
function keepTileVisible(x, y) {
  if (infoEl.classList.contains('hidden')) return;
  const size = T * view.zoom;
  const top = 56;                                            // unter der Auftragsanzeige
  const bottom = view.h - infoEl.offsetHeight - 20;          // Oberkante des Info-Fensters
  const cell = state.grid[y * N + x];
  const [w, h] = cell ? sizeOf(cell) : [1, 1];
  const sx = view.x + (x + w / 2) * size;
  const sy = view.y + (y + h / 2) * size;
  let tx = view.x, ty = view.y;
  if (sy + size > bottom || sy - size < top) ty += (top + bottom) / 2 - sy;
  if (sx - size < 0 || sx + size > view.w) tx += view.w / 2 - sx;
  if (tx !== view.x || ty !== view.y) panCameraTo(tx, ty);
}

// Karte so verschieben, dass ein Feld mittig über dem Info-Fenster liegt
function panCameraToTile(x, y) {
  const size = T * view.zoom;
  const bottom = view.h - (infoEl.classList.contains('hidden') ? 0 : infoEl.offsetHeight + 20);
  panCameraTo(view.w / 2 - (x + 0.5) * size, (56 + bottom) / 2 - (y + 0.5) * size);
}

let cameraTween = null;

function panCameraTo(x, y) {
  cameraTween = { fx: view.x, fy: view.y, tx: x, ty: y, t: 0 };
}

function updateCamera(dt) {
  if (!cameraTween) return;
  const c = cameraTween;
  c.t = Math.min(1, c.t + dt / 0.35);
  const k = 1 - Math.pow(1 - c.t, 3);   // sanft abbremsen
  view.x = c.fx + (c.tx - c.fx) * k;
  view.y = c.fy + (c.ty - c.fy) * k;
  clampView();
  if (c.t >= 1) cameraTween = null;
}

function showCityInfo() {
  closeQuests();
  closeResearch();
  closeSettings();
  infoMode = 'city';
  infoTile = null;
  infoOpenedAt = performance.now();
  clearInfoExtra();
  infoEl.classList.remove('hidden');
  renderInfo();
}

function showJobsInfo() {
  closeQuests();
  closeResearch();
  closeSettings();
  infoMode = 'jobs';
  infoTile = null;
  infoOpenedAt = performance.now();
  clearInfoExtra();
  infoEl.classList.remove('hidden');
  renderInfo();
}

// Wo fehlt Personal? Je Beruf: Stellen, unterbesetzte Gebäudearten und was hilft
function renderJobsInfo() {
  const lines = [];
  for (const [job, j] of Object.entries(JOBS)) {
    const demand = stats.jobs.demand[job] || 0;
    if (!demand) continue;
    const assigned = stats.jobs.assigned[job] || 0;
    lines.push(`${j.icon} ${j.name}: ${assigned} von ${demand} Stellen besetzt`);
    const types = Object.keys(stats.staff).filter(t => jobOf(t) === job && stats.staff[t] < 0.995);
    for (const t of types) {
      lines.push(`   ${BUILDINGS[t].icon} ${BUILDINGS[t].name} ×${stats.activeCount[t] || 0}: ${Math.round(stats.staff[t] * 100)} % besetzt`);
    }
    if (assigned < demand) {
      lines.push(job === 'scholar' && assigned >= stats.jobs.scholarCap
        ? `   → Gelehrte sind auf ${stats.jobs.scholarCap} begrenzt: mehr Bildung (Schulen, Bibliothek) erhöht die Grenze.`
        : '   → Mehr Häuser bauen – neue Einwohner füllen die Stellen.');
    }
  }
  lines.push(`😴 Arbeitslos: ${stats.unemployed}` +
    (stats.unemployed && Object.keys(JOBS).every(job => (stats.jobs.assigned[job] || 0) >= (stats.jobs.demand[job] || 0))
      ? ' → baue mehr Betriebe, sonst sinkt die Zufriedenheit' : ''));
  lines.push('Farmen bekommen zuerst so viele Arbeiter, wie für die Ernährung nötig sind. Unterbesetzte Gebäude tragen 👷 auf der Karte.');
  document.getElementById('info-icon').textContent = '👷';
  document.getElementById('info-name').textContent = 'Personal';
  setInfoLines(lines);
  document.getElementById('info-demolish').classList.add('hidden');
  document.getElementById('info-upgrade').classList.add('hidden');
  document.getElementById('info-action').classList.add('hidden');
}

let infoCamp = null;

function showCampInfo(index) {
  closeQuests();
  closeResearch();
  closeSettings();
  infoMode = 'camp';
  infoTile = null;
  infoCamp = index;
  infoOpenedAt = performance.now();
  clearInfoExtra();
  infoEl.classList.remove('hidden');
  renderInfo();
}

function renderCampInfo() {
  const camp = state.camps[infoCamp];
  if (!camp) return closeInfo();
  const defense = cityDefense();
  const strong = defense >= camp.strength;
  const lines = [
    `Stärke ⚔️ ${Math.round(camp.strength)} (wächst bis ${campMaxStrength()}) · nächster Überfall in etwa ${Math.ceil(camp.raidIn)} s`,
    `Deine Wachen zusammen: 🛡️ ${defense}` + (strong ? ' – stark genug zum Ausheben!' : ' – noch zu schwach.'),
    strong ? `Ausheben bringt Beute: ${formatAmounts({ money: Math.round(camp.strength * 15) })}`
      : 'Baue Wachhäuser, Wachtürme oder Mauern (Reiter 🛡️ Schutz) oder baue sie aus.',
  ];
  document.getElementById('info-icon').textContent = '⛺';
  document.getElementById('info-name').textContent = 'Banditenlager';
  setInfoLines(lines, ['Von hier aus überfallen Banditen deine Stadt. Je länger das Lager steht, desto stärker wird es.',
    'Kaufst du das Land, auf dem es steht, ziehen die Banditen ab.']);
  document.getElementById('info-demolish').classList.add('hidden');
  document.getElementById('info-upgrade').classList.add('hidden');
  const btn = document.getElementById('info-action');
  btn.classList.remove('hidden');
  btn.textContent = strong ? `⚔️ Ausheben · ${formatAmounts(campCost(camp))}` : `🔒 Wachen zu schwach (${defense} / ${Math.round(camp.strength)})`;
  btn.classList.toggle('unaffordable', !strong || !canAfford(campCost(camp)));
}

function renderInfo() {
  if (infoMode === 'city') renderCityInfo();
  else if (infoMode === 'camp') renderCampInfo();
  else if (infoMode === 'jobs') renderJobsInfo();
  else if (infoMode === 'plot') renderPlotInfo();
  else renderTileInfo();
}

function showPlotInfo(p) {
  closeQuests();
  closeResearch();
  closeSettings();
  infoMode = 'plot';
  infoTile = null;
  infoOpenedAt = performance.now();
  infoPlot = p;
  clearInfoExtra();
  infoEl.classList.remove('hidden');
  renderInfo();
}

function renderPlotInfo() {
  const buyable = canBuyPlot(infoPlot);
  const price = plotPrice();
  const lines = [
    `Unbebautes Land – ${CONFIG.plotSize} × ${CONFIG.plotSize} Felder.`,
    buyable
      ? `Kaufe diese Fläche, um darauf zu bauen. Jede weitere Fläche wird teurer.`
      : 'Diese Fläche grenzt noch nicht an dein Land. Kaufe zuerst eine Fläche dazwischen.',
    `Dein Land: ${state.plots.filter(Boolean).length} von ${P * P} Flächen.`,
  ];
  document.getElementById('info-icon').textContent = '🏞️';
  document.getElementById('info-name').textContent = 'Freie Fläche';
  setInfoLines(lines);
  document.getElementById('info-demolish').classList.add('hidden');
  document.getElementById('info-upgrade').classList.add('hidden');
  const btn = document.getElementById('info-action');
  btn.classList.toggle('hidden', !buyable);
  btn.textContent = `🏷️ Kaufen für ${formatAmounts(price)}`;
  btn.classList.toggle('unaffordable', !canAfford(price));
}

function renderTileInfo() {
  const cell = getCell(infoTile.x, infoTile.y);
  if (!cell) return closeInfo();
  const def = BUILDINGS[cell.type];
  const active = isActive(infoTile.x, infoTile.y);
  const lines = [def.description];
  if (def.isRoad) lines.push(...describeBuilding(cell.type));
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
    if (isNiceHouse(infoTile.x, infoTile.y)) lines.push(`✨ Schönes Wohnviertel: +${CONFIG.niceHouseBonus} Wohnplätze`);
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
    lines.push(`Personal: ${Math.round(def.jobs[jobOf(cell.type)] * levelFactor(cell))} ${job.icon} ${job.name} – besetzt ${pct} %` +
      (pct < 100 ? ' (arbeitet langsamer)' : ''));
  }
  if (def.interval) {
    const lf = levelFactor(cell);
    const out = buildingOutput(cell.type);
    for (const id in out) out[id] = Math.round(out[id] * lf * 10) / 10;
    const need = {};
    for (const [id, n] of Object.entries(def.consumes || {})) need[id] = Math.round(n * lf);
    if (def.consumes) lines.push(`Verarbeitet: ${formatAmounts(need)} → ${formatAmounts(out)} alle ${def.interval} s`);
    else lines.push(`Ertrag: ${formatAmounts(out)} alle ${def.interval} s${active ? '' : ' (gestoppt)'}`);
    if (active && cell.waiting === 'input') lines.push(`⏸️ Wartet auf ${missingText(def.consumes)}`);
    if (active && cell.waiting === 'full') lines.push('⏸️ Pause – das Lager ist voll');
  }
  if (def.service) {
    const need = NEEDS[def.service.need];
    lines.push(`Versorgt Häuser im Umkreis von ${def.service.radius + levelOf(cell) - 1} Feldern mit ${need.icon} ${need.name}.`);
  }
  if (def.fireRadius) {
    lines.push(`Löscht Brände im Umkreis von ${def.fireRadius + levelOf(cell) - 1} Feldern in ${CONFIG.fireBrigadeSeconds} Sekunden.`);
  }
  if (def.storage) {
    lines.push(`Lagerplatz +${def.storage * levelOf(cell)} für Holz, Stein und Nahrung (gesamt: ${stats.storage}).`);
  }
  if (def.beautifies) {
    lines.push(`Häuser direkt daneben werden schöner: +${CONFIG.niceHouseBonus} Wohnplätze.`);
  }
  if (def.landmark) {
    lines.push(`🏛️ Sehenswürdigkeit: Zufriedenheit +${def.landmark} für die ganze Stadt.`);
  }
  if (cell.type === 'market' && active) {
    lines.push(tradeBlocked() ? '🏴‍☠️ Handel gesperrt – Banditen machen die Wege unsicher.' : 'Handel: Kaufe oder verkaufe Waren – die Preise schwanken.');
    renderTradeUI();
  } else {
    clearInfoExtra();
  }
  const actionBtn = document.getElementById('info-action');
  actionBtn.classList.toggle('hidden', !cell.fire || cell.fire.brigade);
  actionBtn.classList.remove('unaffordable');
  actionBtn.textContent = `💧 Löschen (${formatAmounts(CONFIG.extinguishCost)})`;
  const refund = refundOf(cell);
  renderUpgradeButton(cell);
  document.getElementById('info-icon').textContent = def.icon;
  document.getElementById('info-name').textContent =
    def.name + (canUpgradeType(cell.type) ? `  ${'★'.repeat(levelOf(cell))}${'☆'.repeat(MAX_BUILDING_LEVEL - levelOf(cell))}` : '');
  // Kurz: Zustand und Hauptwerte – Beschreibung und alles Weitere hinter „Mehr“
  const upgradeHint = upgradeGainsText(cell);
  setInfoLines(lines.slice(1, 4), [lines[0], ...lines.slice(4), ...(upgradeHint ? [upgradeHint] : [])]);
  const btn = document.getElementById('info-demolish');
  btn.classList.remove('hidden');
  const armed = sellArmed && sellArmed.x === infoTile.x && sellArmed.y === infoTile.y && performance.now() < sellArmed.until;
  btn.classList.toggle('armed', !!armed);
  btn.textContent = armed
    ? '⚠️ Wirklich? Nochmal tippen'
    : `${def.isRoad ? '🗑️ Löschen' : '💰 Verkaufen'} +${formatAmounts(refund) || '0'}`;
}

// Zusammenfassung sichtbar, Details aufklappbar (Zustand bleibt beim Aktualisieren erhalten)
let infoExpanded = false;
let infoOpenedAt = 0;     // Knöpfe reagieren erst kurz nach dem Öffnen (Schutz vor Fehlklicks)
let sellArmed = null;     // { x, y, until }: erster Tipp auf Verkaufen, wartet auf Bestätigung

function infoClickAllowed() {
  return performance.now() - infoOpenedAt > 400;
}

function setInfoLines(summary, details = []) {
  document.getElementById('info-text').textContent = summary.join('\n');
  const more = document.getElementById('info-more');
  const toggle = document.getElementById('info-more-toggle');
  more.textContent = details.join('\n');
  toggle.classList.toggle('hidden', details.length === 0);
  more.classList.toggle('hidden', !infoExpanded || details.length === 0);
  toggle.textContent = infoExpanded ? 'Weniger ▴' : 'Mehr ▾';
}

// Was bringt der nächste Ausbau? (steht in den Details, der Knopf selbst bleibt kurz)
function upgradeGainsText(cell) {
  const to = levelOf(cell) + 1;
  if (!canUpgradeType(cell.type) || !UPGRADES[to]) return '';
  const def = BUILDINGS[cell.type];
  const gains = [];
  if (def.population) gains.push('+2 Wohnplätze');
  if (def.interval) gains.push('Ertrag +50 %');
  if (def.service || def.fireRadius) gains.push('Umkreis +1');
  if (def.storage) gains.push(`Lager +${def.storage}`);
  if (def.jobs) gains.push('braucht mehr Personal');
  return `⬆️ Stufe ${to} bringt: ${gains.join(', ')}`;
}

// Ausbau-Knopf im Info-Fenster: zeigt Wirkung, Kosten oder warum es (noch) nicht geht
function renderUpgradeButton(cell) {
  const btn = document.getElementById('info-upgrade');
  const to = levelOf(cell) + 1;
  const up = UPGRADES[to];
  if (!canUpgradeType(cell.type) || !up) {
    btn.classList.add('hidden');
    return;
  }
  btn.classList.remove('hidden');
  if (state.maxLevel < up.minLevel) {
    btn.textContent = `🔒 Stufe ${to} ab ${LEVELS[up.minLevel].name}`;
    btn.classList.add('unaffordable');
    return;
  }
  const cost = upgradeCost(cell.type, to);
  btn.textContent = `⬆️ Stufe ${to} · ${formatAmounts(cost)}`;
  btn.classList.toggle('unaffordable', !canAfford(cost));
}

function renderCityInfo() {
  const level = LEVELS[stats.level];
  const next = LEVELS[stats.level + 1];
  const consumption = (state.population * CONFIG.foodPerCitizen).toFixed(1).replace('.', ',');
  const lines = [
    `Einwohner: 👥 ${state.population} von ${stats.capacity} Wohnplätzen`,
    next ? `Nächste Stufe: ${next.icon} ${next.name} ab ${next.minPop} Einwohnern` : 'Höchste Stufe erreicht',
    `Nahrungsverbrauch: 🍞 ${consumption} pro Sekunde`,
    ...(legacy.stars ? [`🏆 Gründerruhm: ${'★'.repeat(legacy.stars)} – +${Math.round((legacyFactor() - 1) * 100)} % Ertrag in allen Städten`] : []),
    state.completed ? '✅ Diese Stadt ist vollendet.'
      : `Ziel: Stadt vollenden (Stufe Stadt + Kathedrale) → Neustart mit Bonus${canCompleteCity() ? ' – jetzt möglich!' : ''}`,
    `Land: ${state.plots.filter(Boolean).length} von ${P * P} Flächen · nächste Fläche ${formatAmounts(plotPrice())}`,
    `Schutz vor Banditen: Wachen zusammen 🛡️ ${cityDefense()} (davon Mauern +${wallBonus()})` +
      (state.camps.length ? ` · ⛺ ${state.camps.length} Lager, stärkstes ⚔️ ${Math.round(Math.max(...state.camps.map(c => c.strength)))}`
        : state.population < CONFIG.campMinPop ? ` · Banditen erst ab ${CONFIG.campMinPop} Einwohnern` : ' · keine Lager in Sicht'),
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
  document.getElementById('info-name').textContent = `${state.cityName || 'Stadt ' + activeSlot} – ${level.name}`;
  setInfoLines(lines.slice(0, 4), lines.slice(4));
  document.getElementById('info-demolish').classList.add('hidden');
  const action = document.getElementById('info-action');
  action.classList.toggle('hidden', !canCompleteCity());
  action.classList.remove('unaffordable');
  action.textContent = '🏆 Stadt vollenden & neu gründen (mit Bonus)';
  document.getElementById('info-upgrade').classList.add('hidden');
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

// Personal-Hinweis unten links – antippbar, öffnet die Übersicht, wo Leute fehlen
function campPillHtml() {
  if (!state.camps.length) return '';
  const strongest = state.camps.reduce((a, b) => (b.strength > a.strength ? b : a));
  return `<div class="effect clickable" data-action="camp">⛺ ${state.camps.length} Banditenlager · ⚔️ ${Math.round(strongest.strength)} ›</div>`;
}

function jobsPillHtml() {
  const missing = Object.keys(JOBS)
    .map(job => [job, (stats.jobs.demand[job] || 0) - (stats.jobs.assigned[job] || 0)])
    .filter(([, n]) => n > 0)
    .map(([job, n]) => `${JOBS[job].icon} ${n} ${n === 1 ? JOBS[job].one + ' fehlt' : JOBS[job].name + ' fehlen'}`);
  if (missing.length) return `<div class="effect clickable" data-action="jobs">${missing.join(' · ')} ›</div>`;
  if (state.population >= 10 && stats.unemployed / state.population > CONFIG.unemploymentTolerance) {
    return `<div class="effect clickable" data-action="jobs">😴 ${stats.unemployed} Arbeitslose ›</div>`;
  }
  return '';
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
  const html = pills.map(p => `<div class="effect">${p}</div>`).join('') + campPillHtml() + jobsPillHtml();
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
// SPIELSTAND ÜBERTRAGEN (Export / Import als Text-Code oder Datei)
// =====================================================================
// Code-Format: "STADT1Z:" + Base64 (komprimiert) oder "STADT1:" + Base64 (falls der Browser
// nicht komprimieren kann). Reines JSON wird beim Import ebenfalls angenommen.

const TRANSFER_PREFIX = 'STADT1:';
const TRANSFER_PREFIX_Z = 'STADT1Z:';

function bytesToBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function pipeBytes(bytes, stream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

async function exportCode() {
  const bytes = new TextEncoder().encode(JSON.stringify(buildSaveData()));
  if (typeof CompressionStream === 'function') {
    return TRANSFER_PREFIX_Z + bytesToBase64(await pipeBytes(bytes, new CompressionStream('deflate-raw')));
  }
  return TRANSFER_PREFIX + bytesToBase64(bytes);
}

// Gibt die Spielstand-Daten zurück oder wirft einen Fehler mit verständlicher Meldung
async function decodeCode(text) {
  const code = text.replace(/\s+/g, '');
  let json;
  try {
    if (code.startsWith('{')) {
      json = text.trim();
    } else if (code.startsWith(TRANSFER_PREFIX_Z)) {
      if (typeof DecompressionStream !== 'function') throw new Error('old-browser');
      json = new TextDecoder().decode(await pipeBytes(base64ToBytes(code.slice(TRANSFER_PREFIX_Z.length)), new DecompressionStream('deflate-raw')));
    } else if (code.startsWith(TRANSFER_PREFIX)) {
      json = new TextDecoder().decode(base64ToBytes(code.slice(TRANSFER_PREFIX.length)));
    } else {
      throw new Error('format');
    }
  } catch (e) {
    throw new Error(e.message === 'old-browser'
      ? 'Dieser Browser kann den Code nicht entpacken – bitte den Browser aktualisieren.'
      : 'Das ist kein gültiger Spielstand-Code. Bitte den ganzen Code einfügen.');
  }
  let data;
  try {
    data = JSON.parse(json);
  } catch (e) {
    throw new Error('Der Code ist beschädigt oder unvollständig.');
  }
  if (!data || data.v !== CONFIG.saveVersion || !Array.isArray(data.buildings) || typeof data.resources !== 'object') {
    throw new Error('Der Code enthält keinen passenden Spielstand.');
  }
  return data;
}

function importData(data) {
  const houses = data.buildings.length;
  if (!confirm(`Spielstand laden? (${houses} Felder bebaut, ${data.population || 0} Einwohner)\n\nDein aktueller Spielstand auf diesem Gerät wird dabei ersetzt.`)) return;
  data.savedAt = Date.now();   // keine Offline-Einnahmen für die Zeit seit dem Export
  saveBlocked = true;
  try {
    localStorage.setItem(saveKeyOf(activeSlot), JSON.stringify(data));
  } catch (e) {
    saveBlocked = false;
    showToast('Speichern fehlgeschlagen – ist der Speicher voll?', 3000);
    return;
  }
  location.reload();
}

// ---------- Oberfläche in den Einstellungen ----------

const transferEl = document.getElementById('transfer');
const transferCode = document.getElementById('transfer-code');

function showTransfer(mode) {
  transferEl.classList.remove('hidden');
  transferEl.dataset.mode = mode;
  for (const el of transferEl.querySelectorAll('[data-for]')) el.classList.toggle('hidden', el.dataset.for !== mode);
  transferCode.readOnly = mode === 'export';
  transferCode.value = '';
  if (mode === 'export') {
    document.getElementById('transfer-hint').textContent =
      'Kopiere den Code oder speichere ihn als Datei. Auf dem anderen Gerät unter ⚙️ → Importieren einfügen.';
    transferCode.value = 'Wird erstellt …';
    exportCode().then(code => {
      transferCode.value = code;
      transferCode.select();
    });
  } else {
    document.getElementById('transfer-hint').textContent =
      'Füge hier den Code ein oder wähle eine gespeicherte Datei.';
    transferCode.focus();
  }
}

async function copyTransferCode() {
  try {
    await navigator.clipboard.writeText(transferCode.value);
  } catch (e) {
    transferCode.select();
    document.execCommand('copy');   // Rückfall für ältere Browser
  }
  showToast('📋 Code kopiert');
}

function downloadTransferCode() {
  const blob = new Blob([transferCode.value], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `stadtaufbau-${dateString(new Date())}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function loadTransferCode(text) {
  try {
    importData(await decodeCode(text));
  } catch (e) {
    sound.play('error');
    showToast(e.message, 3500);
  }
}

function setupTransfer() {
  document.getElementById('btn-export').addEventListener('click', () => showTransfer('export'));
  document.getElementById('btn-import').addEventListener('click', () => showTransfer('import'));
  document.getElementById('transfer-copy').addEventListener('click', copyTransferCode);
  document.getElementById('transfer-file').addEventListener('click', downloadTransferCode);
  document.getElementById('transfer-load').addEventListener('click', () => loadTransferCode(transferCode.value));
  document.getElementById('transfer-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    file.text().then(text => {
      transferCode.value = text;
      loadTransferCode(text);
    });
    e.target.value = '';
  });
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
  updateCamera(dt);
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

// ---------- Neue Version erkennen (wichtig für die installierte App am Handy) ----------

// Holt die Versionsnummer der Online-Seite; ist sie neuer, erscheint ein Hinweis zum Neuladen
async function checkForNewVersion() {
  try {
    const res = await fetch(`./?v=${Date.now()}`, { cache: 'no-store' });
    const html = await res.text();
    const online = Number((html.match(/name="app-version" content="(\d+)"/) || [])[1]);
    if (online > APP_VERSION) showUpdateBanner();
  } catch (e) { /* offline – später nochmal */ }
}

function showUpdateBanner() {
  if (document.getElementById('update-banner')) return;
  const banner = document.createElement('button');
  banner.id = 'update-banner';
  banner.textContent = '🔄 Neue Version – tippen zum Laden';
  banner.addEventListener('click', () => {
    save();
    saveBlocked = true;
    try { sessionStorage.removeItem('fresh-reload'); } catch (e) { /* egal */ }
    Promise.all(['./', 'index.html', 'game.js', 'style.css', 'service-worker.js']
      .map(url => fetch(url, { cache: 'reload' }).catch(() => null)))
      .then(() => location.reload());
  });
  document.body.appendChild(banner);
}

function watchForUpdates(registration) {
  checkForNewVersion();
  setInterval(() => {
    registration.update().catch(() => null);
    checkForNewVersion();
  }, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForNewVersion();
  });
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
    navigator.serviceWorker.register('service-worker.js')
      .then(watchForUpdates)
      .catch(err => console.warn('Service Worker', err));
  }

  requestAnimationFrame(loop);
}

start();
