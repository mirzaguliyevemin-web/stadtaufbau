'use strict';

// Version von Seite und Skript – muss zu <meta name="app-version"> in index.html passen.
// Bei jeder Änderung erhöhen (ebenso CACHE in service-worker.js).
const APP_VERSION = 59;

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
  gridSize: 96,           // Karte ist gridSize × gridSize Felder
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
  maxConstructions: 2,    // so viele Baustellen gleichzeitig (Straßen, Brücken und Mauern zählen nicht)
  buildTimeBase: 3,       // Bauzeit in Sekunden: Grundwert …
  buildTimePerValue: 2,   // … plus so viel × Wurzel aus dem Wert der Grundkosten (siehe BUILD_VALUE)
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
  extinguishCostStoneAge: { wood: 10 },   // in der Steinzeit gibt es kein Geld
  dayLength: 240,         // Sekunden für einen ganzen Tag (Tag + Nacht)
  nightDarkness: 0.5,     // wie dunkel es nachts wird (0–1)
  maxWalkers: 40,         // höchstens so viele Spaziergänger auf den Straßen
  baseStorage: 100,       // Lagerplatz für Holz, Stein und Nahrung ohne Lagerhaus
  niceHouseBonus: 2,      // Extra-Wohnplätze für Häuser direkt neben Park/Brunnen/Brunnenplatz
  taxInterval: 10,        // alle so viele Sekunden werden Steuern eingenommen
  tradeLot: 10,           // so viele Einheiten pro Handel am Markt
  priceChangeSeconds: 30, // so oft schwanken die Marktpreise
  offlineMaxHours: 3,     // Offline-Einnahmen höchstens für so viele Stunden
  offlineEfficiency: 0.25, // offline arbeitet die Stadt mit einem Viertel der Leistung
  costGrowth: 0.2,        // jedes weitere Gebäude derselben Art kostet 20 % mehr (außer fixedCost)
  baseScholars: 2,        // so viele Gelehrte gibt es auch ohne Bildung
  scholarShare: 0.3,      // dazu dieser Anteil der Einwohner × Bildungsversorgung
  unemploymentTolerance: 0.25, // bis zu diesem Anteil Arbeitslose stört es niemanden
  unemploymentPenalty: 15,     // höchster Zufriedenheitsabzug durch Arbeitslosigkeit
  seasonLength: 240,      // Sekunden je Jahreszeit (ein Jahr = 4 Jahreszeiten)
  heatingPerCitizen: 0.01, // Holz pro Einwohner und Sekunde im Winter
  coldPenalty: 20,        // Zufriedenheitsabzug, wenn im Winter das Holz fehlt
  banditBase: 10,         // Höchststärke eines Banditenlagers: Grundwert …
  banditPerCitizen: 0.15, // … plus so viel je Einwohner
  wallDefense: 0.5,       // Rückhalt je Mauerstück beim Ausheben von Lagern …
  wallDefenseMax: 40,     // … höchstens so viel durch Mauern
  wallHp: 40,             // so viel hält ein Mauerstück aus …
  gateHp: 80,             // … und ein Tor
  wallRepair: 0.5,        // beschädigte Mauern reparieren sich um so viel je Sekunde
  siegeDamage: 0.15,      // Schaden an der Mauer je Banditenstärke und Sekunde
  siegeLosses: 0.08,      // Verluste der Banditen je Abwehrpunkt (Wachen in der Nähe) und Sekunde
  campMinPop: 30,         // ab so vielen Einwohnern tauchen Banditenlager auf
  maxCamps: 3,            // höchstens so viele Lager gleichzeitig
  campSpawnSeconds: [180, 360],  // Abstand zwischen neuen Lagern
  campGrowthSeconds: 45,  // alle so viele Sekunden wird ein Lager um 1 stärker
  campRaidSeconds: [100, 200],   // so oft überfällt ein Lager die Stadt
  cartSeconds: 40,        // so oft schickt ein Markt einen Handelskarren los (schneller mit Ausbau)
  cartSpeed: 1.6,         // Felder pro Sekunde
  cartValue: 12,          // Geld je ankommendem Karren (× Ausbaustufe × Gründerruhm)
  legacyBonus: 0.1,       // Gründerruhm: +10 % Ertrag je Stern (in allen Städten) …
  legacyMaxStars: 5,      // … höchstens für so viele Sterne
  legacyStart: { money: 100, wood: 30, stone: 15 },   // Extra-Startvorrat je Stern
};

// Wert je Einheit für die Bauzeit (nicht genannte Ressourcen zählen 2)
const BUILD_VALUE = { money: 0.5, wood: 1, stone: 1, planks: 3, bricks: 3 };

// Jahreszeiten. production: Faktor je Gebäudeart  | heating: Einwohner verbrauchen Holz zum Heizen
//   ground: Bodenfarbe  | happiness: Bonus/Abzug für die ganze Stadt
const SEASONS = [
  { id: 'spring', name: 'Frühling', icon: '🌸', ground: '#74c69d', production: { farm: 1 },    happiness: 3 },
  { id: 'summer', name: 'Sommer',   icon: '☀️', ground: '#95c97a', production: { farm: 1.2, sheepfarm: 1.2, gatherer: 1.2 } },
  { id: 'autumn', name: 'Herbst',   icon: '🍂', ground: '#c2b46a', production: { farm: 1.35, gatherer: 1.3 } },
  { id: 'winter', name: 'Winter',   icon: '❄️', ground: '#e4edf1', production: { farm: 0.5, fishery: 0.5, sheepfarm: 0.7, gatherer: 0.3, hunter: 0.8, solarpark: 0.5 },  heating: true },
];

// Gelände. blocks: darauf kann nicht gebaut werden  | clearYield: Ertrag, wenn das Feld beim Bauen gerodet wird
const TERRAIN = [
  { id: 'grass',  name: 'Wiese' },
  { id: 'forest', name: 'Wald', icon: '🌲', clearYield: { wood: 2 },
    text: 'Wird beim Bauen gerodet und bringt Holz. Sägewerke in der Nähe produzieren mehr.' },
  { id: 'rock',   name: 'Berg', icon: '⛰️', blocks: true,
    text: 'Hier kann man nicht bauen. Steinbrüche in der Nähe produzieren mehr.' },
  { id: 'water',  name: 'See',  icon: '💧', blocks: true,
    text: 'Hier kann man nicht bauen. Farmen am Wasser ernten mehr, Häuser direkt am Ufer bekommen mehr Wohnplätze.' },
];
const TERRAIN_ID = Object.fromEntries(TERRAIN.map((t, i) => [t.id, i]));

// Geländebonus auf den Ertrag: Felder des Geländes im Umkreis `radius` um das Gebäude.
//   perTile: Bonus je Feld bis höchstens max  | flat: fester Bonus, sobald mindestens ein Feld da ist
const TERRAIN_BONUS = {
  quarry:  { terrain: 'rock',   radius: 2, perTile: 0.06, max: 0.6, label: 'Bergnähe' },
  farm:    { terrain: 'water',  radius: 2, flat: 0.25, label: 'Bewässerung' },
  fishery: { terrain: 'water',  radius: 2, perTile: 0.03, max: 0.45, label: 'Großes Gewässer' },
  mine:    { terrain: 'rock',   radius: 2, perTile: 0.04, max: 0.4, label: 'Großer Berg' },
  coalmine:    { terrain: 'rock',   radius: 2, perTile: 0.04, max: 0.4, label: 'Großer Berg' },
  woodcutter:  { terrain: 'forest', radius: 2, perTile: 0.05, max: 0.5, label: 'Waldnähe' },
  stonecutter: { terrain: 'rock',   radius: 2, perTile: 0.06, max: 0.6, label: 'Bergnähe' },
  gatherer:    { terrain: 'forest', radius: 2, perTile: 0.04, max: 0.4, label: 'Beeren im Wald' },
  hunter:      { terrain: 'forest', radius: 2, perTile: 0.03, max: 0.3, label: 'Wild im Wald' },
};

// Ressourcen. stored: unterliegt der Lagergrenze  | price: Grundpreis pro Einheit am Markt
//   showFrom: erst ab dieser Stadtstufe oben angezeigt (oder sobald etwas davon da ist)
//   fromAge:  gibt es erst ab diesem Zeitalter (vorher nie angezeigt)
const RESOURCES = {
  money: { name: 'Geld',    icon: '💰', start: 200, fromAge: 1 },
  wood:  { name: 'Holz',    icon: '🪵', start: 60, stored: true, price: 4 },
  stone: { name: 'Stein',   icon: '🪨', start: 20, stored: true, price: 5 },
  food:  { name: 'Nahrung', icon: '🍞', start: 20, stored: true, price: 3 },
  knowledge: { name: 'Wissen', icon: '💡', start: 0 },
  planks: { name: 'Bretter', icon: '🪜', start: 0, stored: true, price: 20, showFrom: 1 },
  bricks: { name: 'Ziegel',  icon: '🧱', start: 0, stored: true, price: 25, showFrom: 1 },
  bread:  { name: 'Brot',    icon: '🥖', start: 0, stored: true, price: 8,  showFrom: 1 },
  wool:   { name: 'Wolle',    icon: '🧶', start: 0, stored: true, price: 6,  showFrom: 99 },
  cloth:  { name: 'Stoff',    icon: '🧵', start: 0, stored: true, price: 18, showFrom: 99 },
  beer:   { name: 'Bier',     icon: '🍺', start: 0, stored: true, price: 10, showFrom: 99 },
  iron:   { name: 'Eisen',    icon: '⛓️', start: 0, stored: true, price: 12, showFrom: 99 },
  tools:  { name: 'Werkzeug', icon: '🛠️', start: 0, stored: true, price: 30, showFrom: 99 },
  coal:   { name: 'Kohle',       icon: '⚫', start: 0, stored: true, price: 10, showFrom: 99, fromAge: 3 },
  steel:  { name: 'Stahl',       icon: '🔩', start: 0, stored: true, price: 35, showFrom: 99, fromAge: 3 },
  goods:  { name: 'Fabrikwaren', icon: '📦', start: 0, stored: true, price: 45, showFrom: 99, fromAge: 3 },
  power:  { name: 'Strom',       icon: '⚡', start: 0, stored: true, price: 8,  showFrom: 99, fromAge: 4 },
  concrete: { name: 'Beton',     icon: '🧊', start: 0, stored: true, price: 20, showFrom: 99, fromAge: 4 },
  electronics: { name: 'Elektronik', icon: '💻', start: 0, stored: true, price: 80, showFrom: 99, fromAge: 4 },
};

// Genussgüter: werden laufend verbraucht, solange etwas da ist – und machen die Einwohner zufriedener
const LUXURIES = {
  bread: { perCitizen: 0.005, happiness: 8, label: '🥖 Frisches Brot', verb: 'essen Brot' },
  beer:  { perCitizen: 0.002, happiness: 5, label: '🍺 Bier im Wirtshaus', verb: 'trinken Bier' },
  cloth: { perCitizen: 0.0015, happiness: 6, label: '🧵 Neue Kleidung', verb: 'brauchen Kleidung' },
  goods: { perCitizen: 0.001, happiness: 6, label: '📦 Fabrikwaren im Haushalt', verb: 'kaufen Fabrikwaren' },
  electronics: { perCitizen: 0.0004, happiness: 8, label: '💻 Elektronik', verb: 'nutzen Elektronik' },
};

// Werkzeug: Betriebe mit Arbeitern produzieren mehr, solange Werkzeug da ist – es nutzt sich dabei ab
const TOOLS = { bonus: 0.2, perWorker: 0.0004 };

// Stadtstufen. Größere Städte sind anspruchsvoller (Abzug bei der Zufriedenheit).
const LEVELS = [
  { name: 'Dorf',       icon: '🛖', minPop: 0,   happinessPenalty: 0 },
  { name: 'Kleinstadt', icon: '🏘️', minPop: 21,  happinessPenalty: 10 },
  { name: 'Stadt',      icon: '🏙️', minPop: 101, happinessPenalty: 25 },
];

// Zeitalter. Gebäude mit `age` gibt es erst ab diesem Zeitalter (Index). Plan: docs/zeitalter.md
//   need: Voraussetzungen für den Aufstieg  | cost: Waren, die während des Aufbruchs nach und nach geliefert werden
//   seconds: so lange dauert der Aufbruch  | ready: false = kommt in einem späteren Update
//   Außerdem muss alles aus dem Zeitalter davor erforscht und jedes seiner Gebäude einmal gebaut sein (ageRequiredBuildings)
const AGES = [
  { id: 'stone',     name: 'Steinzeit',   icon: '🪨', text: 'Hütten, Sammler und Jäger. Es gibt Holz, Stein, Nahrung und erstes Wissen – aber noch kein Geld.' },
  { id: 'antiquity', name: 'Antike',      icon: '🏺', text: 'Geld, Handel und Häuser aus Stein. Schreibstuben sammeln viel mehr Wissen.',
    need: { population: 25 }, cost: { wood: 100, stone: 80, food: 100 }, seconds: 90 },
  { id: 'medieval',  name: 'Mittelalter', icon: '🏰', text: 'Handwerk, Schulen, Burgtürme und Kathedralen.',
    need: { population: 40 }, cost: { money: 400, knowledge: 30, stone: 100, bricks: 15 }, seconds: 150 },
  { id: 'industry',  name: 'Industrie',   icon: '🏭', text: 'Fabriken, Kohle, Stahl und Eisenbahn. Mietshäuser bieten viel Wohnraum.',
    need: { population: 150 }, cost: { money: 3000, knowledge: 300, iron: 60, tools: 30, bricks: 150 }, seconds: 240 },
  { id: 'modern',    name: 'Moderne',     icon: '🏙️', text: 'Strom, Beton, Hochhäuser, Universität und Flughafen.',
    need: { population: 350 }, cost: { money: 12000, knowledge: 1500, steel: 150, goods: 100, coal: 150 }, seconds: 300 },
];
const OLD_SAVE_AGE = 2;   // Spielstände von vor den Zeitaltern stehen im Mittelalter

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
  growAbove: 50,   // ab diesem Wert ziehen Einwohner zu
  leaveBelow: 30,  // unter diesem Wert wandern Einwohner ab
};

// Berufe. Gebäude mit `jobs` brauchen Personal – ohne volle Besetzung arbeiten sie anteilig langsamer.
// Einwohner werden automatisch verteilt (Farmen zuerst, soweit für die Ernährung nötig). Gelehrte gibt es nur mit Bildung.
const JOBS = {
  worker:  { name: 'Arbeiter', one: 'Arbeiter', dat: 'Arbeitern', icon: '👷' },
  trader:  { name: 'Händler',  one: 'Händler',  dat: 'Händlern',  icon: '🧑‍💼' },
  scholar: { name: 'Gelehrte', one: 'Gelehrter', dat: 'Gelehrten', icon: '🧑‍🎓' },
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
//   age:           ab welchem Zeitalter baubar (Index in AGES, Standard 0 = Steinzeit)
//   ageCost:       abweichende Kosten je Zeitalter, z. B. { 0: { wood: 1 } }
//   evolvesTo:     wird automatisch zu diesem Gebäude, sobald es freigeschaltet ist (z. B. Wassertrog → Feuerwache)
//   developsTo:    kann im Info-Fenster zu diesem Gebäude weiterentwickelt werden (z. B. Hütte → Haus), sobald es freigeschaltet ist
//   unlockLevel:   ab welcher Stadtstufe baubar (Index in LEVELS)
//   requiresTech:  erst nach dieser Forschung baubar (ID in TECHS)
//   needsRoad:     funktioniert nur mit angrenzender Straße
//   isRoad:        ist selbst eine Straße (wird als Wegenetz gezeichnet)
//   dragBuild:     kann durch Ziehen am Stück gebaut werden
//   buildTime:     Bauzeit in Sekunden (ohne Angabe aus den Kosten berechnet, Straßen/Mauern sofort)
const BUILDINGS = {
  road: {
    name: 'Straße', icon: '🛣️', color: '#a39887',
    description: 'Verbindet Gebäude. Ohne angrenzende Straße arbeitet kein Gebäude.',
    cost: { money: 5 },
    ageCost: { 0: { wood: 1 } },   // Steinzeit: Trampelpfad aus Holz
    fixedCost: true,
    isRoad: true,
    dragBuild: true,
    category: 'housing',
  },
  hut: {
    name: 'Hütte', icon: '🛖', color: '#c9a66b',
    developsTo: 'house',
    description: 'Einfache Hütte aus Ästen und Fellen. Wohnraum für Einwohner.',
    cost: { wood: 15 },
    population: 3,
    smoke: 0.3,
    needsRoad: true,
    category: 'housing',
  },
  gatherer: {
    name: 'Sammlerin', icon: '🫐', color: '#b5838d',
    developsTo: 'farm',
    description: 'Sammelt Beeren, Nüsse und Pilze. Im Wald findet sie mehr, im Winter kaum etwas.',
    cost: { wood: 10 },
    interval: 6,
    produces: { food: 2 },
    needsRoad: true,
    jobs: { worker: 2 },
    category: 'resources',
  },
  hunter: {
    name: 'Jägerlager', icon: '🏹', color: '#9c6644',
    description: 'Jäger bringen Fleisch. Am Waldrand ist die Jagd ergiebiger.',
    cost: { wood: 15, stone: 5 },
    interval: 8,
    produces: { food: 3 },
    needsRoad: true,
    jobs: { worker: 2 },
    category: 'resources',
  },
  woodcutter: {
    name: 'Holzfäller', icon: '🪓', color: '#7f5539',
    description: 'Fällt Bäume und liefert Holz – am besten mitten im Wald.',
    cost: { stone: 5 },
    interval: 8,
    produces: { wood: 2 },
    needsRoad: true,
    jobs: { worker: 2 },
    category: 'resources',
  },
  stonecutter: {
    name: 'Steinsammler', icon: '🪨', color: '#adb5bd',
    developsTo: 'quarry',
    description: 'Sammelt und klopft Steine – am Berg gibt es mehr.',
    cost: { wood: 15 },
    interval: 12,
    produces: { stone: 2 },
    needsRoad: true,
    jobs: { worker: 2 },
    category: 'resources',
  },
  fireplace: {
    name: 'Feuerstelle', icon: '🔥', color: '#e76f51',
    developsTo: 'park',
    description: 'Am Feuer wird erzählt, gesungen und getanzt.',
    cost: { wood: 10, stone: 10 },
    service: { need: 'leisure', radius: 3 },
    smoke: 0.6,
    needsRoad: true,
    category: 'services',
  },
  painter: {
    name: 'Höhlenmaler', icon: '🎨', color: '#bc6c25',
    developsTo: 'scriptorium',
    description: 'Malt Jagd und Ernte an die Felswand – so wird Wissen weitergegeben.',
    cost: { wood: 20, stone: 15 },
    interval: 10,
    produces: { knowledge: 1 },
    needsRoad: true,
    jobs: { scholar: 1 },
    category: 'education',
  },
  watertrough: {
    name: 'Wassertrog', icon: '💧', color: '#8ecae6',
    description: 'Wasser und Eimer stehen bereit: Brände in der Nähe werden gelöscht. In der Antike wird daraus eine Feuerwache.',
    cost: { wood: 10, stone: 5 },
    fireRadius: 2,
    needsRoad: true,
    evolvesTo: 'firestation',
    category: 'defense',
  },
  bridge: {
    name: 'Brücke', icon: '🌉', color: '#a47148',
    description: 'Straße über das Wasser. Wird auch automatisch gebaut, wenn du eine Straße über einen See ziehst.',
    cost: { money: 20, wood: 10 },
    fixedCost: true,
    isRoad: true,
    onTerrain: 'water',   // nur auf Wasser
    dragBuild: true,
    age: 1,
    category: 'housing',
  },
  house: {
    name: 'Haus', icon: '🏠', color: '#e9c46a',
    developsTo: 'tenement',
    description: 'Wohnraum für Einwohner. Sie ziehen ein, wenn sie zufrieden sind.',
    cost: { wood: 20 },
    population: 4,
    smoke: 0.3,
    needsRoad: true,
    age: 1,
    category: 'housing',
  },
  farm: {
    name: 'Farm', icon: '🌾', color: '#b5e48c',
    description: 'Produziert Nahrung für die Einwohner.',
    cost: { wood: 15 },
    interval: 7,
    produces: { food: 4 },
    needsRoad: true,
    jobs: { worker: 2 },
    age: 1,
    category: 'resources',
    size: [2, 2],
  },
  sawmill: {
    name: 'Sägewerk', icon: '🪚', color: '#b08968',
    description: 'Sägt das Holz der Holzfäller zu Brettern. Ohne Holz steht die Säge still.',
    cost: { money: 50, wood: 20 },
    interval: 8,
    consumes: { wood: 3 },
    produces: { planks: 1 },
    smoke: 0.8,
    needsRoad: true,
    jobs: { worker: 2 },
    age: 1,
    category: 'resources',
    size: [2, 1],
  },
  fishery: {
    name: 'Fischerhütte', icon: '🎣', color: '#8ecae6',
    description: 'Fängt Fisch als Nahrung. Muss direkt am Wasser stehen; im Winter wird weniger gefangen.',
    cost: { money: 40, wood: 15 },
    interval: 10,
    produces: { food: 3 },
    needsRoad: true,
    nearTerrain: { terrain: 'water', min: 2 },   // so viele Wasserfelder direkt daneben (auch schräg)
    jobs: { worker: 2 },
    age: 1,
    category: 'resources',
  },
  sheepfarm: {
    name: 'Schäferei', icon: '🐑', color: '#c7e9b0',
    description: 'Schafe liefern Wolle für die Weberei.',
    cost: { money: 60, wood: 25 },
    interval: 8,
    produces: { wool: 2 },
    unlockLevel: 1,
    needsRoad: true,
    jobs: { worker: 2 },
    age: 1,
    category: 'resources',
    size: [2, 2],
  },
  mine: {
    name: 'Erzmine', icon: '⛏️', color: '#6c757d',
    description: 'Fördert Eisen aus dem Berg. Muss direkt an einem Berg stehen.',
    cost: { money: 80, wood: 30, stone: 20 },
    interval: 8,
    produces: { iron: 2 },
    unlockLevel: 1,
    needsRoad: true,
    nearTerrain: { terrain: 'rock', min: 2 },
    jobs: { worker: 4 },
    age: 2,
    category: 'resources',
  },
  quarry: {
    name: 'Steinbruch', icon: '⛏️', color: '#adb5bd',
    description: 'Produziert Stein.',
    cost: { money: 40, wood: 10 },
    interval: 10,
    produces: { stone: 2 },
    needsRoad: true,
    jobs: { worker: 3 },
    age: 1,
    category: 'resources',
    size: [2, 2],
  },
  market: {
    name: 'Markt', icon: '🏪', color: '#e76f51',
    developsTo: 'supermarket',
    description: 'Bringt Geld für bis zu 15 Einwohner.',
    cost: { wood: 25, stone: 10 },
    interval: 10,
    perPopulation: { money: 0.5 },
    servesUpTo: 15,
    needsRoad: true,
    jobs: { trader: 3 },
    age: 1,
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
    age: 1,
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
    age: 1,
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
    age: 1,
    category: 'defense',
    size: [2, 1],
  },
  scriptorium: {
    name: 'Schreibstube', icon: '🕯️', color: '#d4a373',
    developsTo: 'library',
    description: 'Gelehrte sammeln Wissen für die Forschung.',
    cost: { money: 40, wood: 20 },
    interval: 8,
    produces: { knowledge: 1 },
    smoke: 0.3,
    needsRoad: true,
    jobs: { scholar: 1 },
    age: 1,
    category: 'education',
  },
  carpentry: {   // alt: macht dasselbe wie das Sägewerk und wird darum zum Sägewerk
    name: 'Schreinerei', icon: '🔨', color: '#c9a27e',
    description: 'Sägt Holz zu Brettern.',
    evolvesTo: 'sawmill',
    cost: { money: 60, wood: 30, stone: 10 },
    interval: 8,
    consumes: { wood: 3 },
    produces: { planks: 1 },
    smoke: 0.3,
    unlockLevel: 1,
    needsRoad: true,
    jobs: { worker: 3 },
    age: 2,
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
    age: 1,
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
    age: 2,
    category: 'crafts',
  },
  brewery: {
    name: 'Brauerei', icon: '🍺', color: '#d4a373',
    description: 'Braut aus Getreide Bier. Solange es Bier gibt, sind alle zufriedener.',
    cost: { money: 80, wood: 30, stone: 15 },
    interval: 8,
    consumes: { food: 3 },
    produces: { beer: 2 },
    smoke: 0.4,
    unlockLevel: 1,
    needsRoad: true,
    jobs: { worker: 3 },
    age: 2,
    category: 'crafts',
    size: [2, 1],
  },
  weaver: {
    name: 'Weberei', icon: '🧵', color: '#cdb4db',
    description: 'Webt aus Wolle Stoff für Kleidung. Solange es Stoff gibt, sind alle zufriedener.',
    cost: { money: 80, wood: 25, planks: 5 },
    interval: 8,
    consumes: { wool: 2 },
    produces: { cloth: 2 },
    unlockLevel: 1,
    needsRoad: true,
    jobs: { worker: 3 },
    age: 2,
    category: 'crafts',
  },
  smithy: {
    name: 'Schmiede', icon: '⚒️', color: '#6d6875',
    description: 'Schmiedet aus Eisen und Holz Werkzeug. Mit Werkzeug arbeiten alle Arbeiter-Betriebe 20 % schneller.',
    cost: { money: 100, wood: 30, stone: 30, bricks: 10 },
    interval: 10,
    consumes: { iron: 2, wood: 2 },
    produces: { tools: 2 },
    smoke: 0.9,
    unlockLevel: 1,
    needsRoad: true,
    jobs: { worker: 3 },
    age: 2,
    category: 'crafts',
  },
  well: {
    name: 'Brunnen', icon: '🪣', color: '#90e0ef',
    developsTo: 'hospital',
    description: 'Sauberes Wasser hält die Einwohner gesund.',
    cost: { money: 30, stone: 15 },
    service: { need: 'health', radius: 2 },
    beautifies: true,
    unlockLevel: 1,
    needsRoad: true,
    age: 1,
    category: 'services',
  },
  school: {
    name: 'Schule', icon: '🏫', color: '#ffafcc',
    developsTo: 'university',
    description: 'Bildung für die Kinder der Stadt – und etwas Wissen.',
    cost: { money: 60, wood: 40, stone: 30 },
    service: { need: 'education', radius: 4 },
    interval: 10,
    produces: { knowledge: 2 },
    unlockLevel: 1,
    needsRoad: true,
    jobs: { scholar: 2 },
    age: 2,
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
    age: 2,
    category: 'education',
    size: [2, 1],
  },
  guard: {
    name: 'Wachhaus', icon: '💂', color: '#ced4da',
    developsTo: 'police',
    description: 'Wachen sorgen für Sicherheit.',
    cost: { money: 40, wood: 30, stone: 20 },
    service: { need: 'safety', radius: 4 },
    unlockLevel: 1,
    needsRoad: true,
    jobs: { worker: 2 },
    age: 1,
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
    age: 2,
    category: 'defense',
  },
  wall: {
    name: 'Mauer', icon: '🏰', color: '#7d7468',
    description: 'Mauerstücke am Stück ziehen. Banditen müssen die Mauer erst aufbrechen, bevor sie ins Dorf kommen – Wachen in der Nähe wehren sie dabei ab. Straßen führen durch ein Tor.',
    cost: { stone: 3 },
    fixedCost: true,
    isWall: true,
    dragBuild: true,
    unlockLevel: 1,
    age: 1,
    category: 'defense',
  },
  gate: {
    name: 'Tor', icon: '🚪', color: '#8d6e4f',
    description: 'Durchgang in der Mauer: Straßen, Bewohner und Handelskarren kommen durch, Banditen müssen es erst aufbrechen. Ziehst du eine Straße über die Mauer (oder eine Mauer über die Straße), entsteht dort von selbst ein Tor.',
    cost: { stone: 15, wood: 10 },
    fixedCost: true,
    isRoad: true,
    isWall: true,
    isGate: true,
    dragBuild: true,
    unlockLevel: 1,
    age: 1,
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
    age: 2,
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
    age: 2,
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
    age: 1,
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
    age: 2,
    category: 'prestige',
    size: [3, 3],
  },
  // ---------- Industrie ----------
  coalmine: {
    name: 'Kohlebergwerk', icon: '⚫', color: '#495057',
    description: 'Fördert Kohle aus dem Berg. Muss direkt an einem Berg stehen.',
    cost: { money: 250, wood: 60, stone: 80, planks: 20 },
    interval: 8,
    produces: { coal: 3 },
    needsRoad: true,
    nearTerrain: { terrain: 'rock', min: 2 },
    jobs: { worker: 4 },
    smoke: 0.6,
    age: 3,
    category: 'resources',
  },
  steelworks: {
    name: 'Stahlwerk', icon: '🔥', color: '#6c757d',
    description: 'Schmilzt Eisen mit Kohle zu Stahl.',
    cost: { money: 400, stone: 120, bricks: 60 },
    interval: 10,
    consumes: { iron: 2, coal: 2 },
    produces: { steel: 2 },
    needsRoad: true,
    jobs: { worker: 4 },
    smoke: 1.6,
    age: 3,
    category: 'crafts',
    size: [2, 2],
  },
  factory: {
    name: 'Fabrik', icon: '🏭', color: '#bc4749',
    description: 'Stellt aus Stahl, Stoff und Brettern Fabrikwaren her – die Leute kaufen sie gern.',
    cost: { money: 500, bricks: 80, steel: 20 },
    interval: 12,
    consumes: { steel: 1, cloth: 2, planks: 2 },
    produces: { goods: 3 },
    needsRoad: true,
    jobs: { worker: 6 },
    smoke: 1.2,
    age: 3,
    category: 'crafts',
    size: [2, 2],
  },
  tenement: {
    name: 'Mietshaus', icon: '🏢', color: '#cb997e',
    developsTo: 'highrise',
    description: 'Mehrstöckiges Wohnhaus aus Ziegeln: viele Wohnungen auf wenig Platz.',
    cost: { money: 150, bricks: 30, planks: 20 },
    population: 12,
    smoke: 0.5,
    needsRoad: true,
    age: 3,
    category: 'housing',
  },
  station: {
    name: 'Bahnhof', icon: '🚂', color: '#588157',
    description: 'Züge bringen Fabrikwaren in andere Städte und Geld zurück.',
    cost: { money: 800, bricks: 100, steel: 40 },
    interval: 10,
    consumes: { goods: 1 },
    produces: { money: 70 },
    needsRoad: true,
    jobs: { trader: 4 },
    smoke: 0.8,
    age: 3,
    category: 'resources',
    size: [2, 1],
  },
  police: {
    name: 'Polizeiwache', icon: '👮', color: '#457b9d',
    description: 'Polizisten sorgen für Sicherheit in einem großen Umkreis und schützen vor Banditen.',
    cost: { money: 300, bricks: 40, steel: 10 },
    service: { need: 'safety', radius: 7 },
    needsRoad: true,
    jobs: { worker: 3 },
    age: 3,
    category: 'defense',
    defense: { radius: 7, strength: 20 },
  },
  clocktower: {
    name: 'Uhrturm', icon: '🕰️', color: '#ddb892',
    description: 'Ein prächtiger Turm mit großer Uhr – der Stolz der Industriestadt.',
    cost: { money: 4000, bricks: 300, steel: 150, goods: 60 },
    landmark: 10,
    needsRoad: true,
    age: 3,
    category: 'prestige',
    size: [2, 2],
  },
  // ---------- Moderne ----------
  powerplant: {
    name: 'Kraftwerk', icon: '⚡', color: '#adb5bd',
    description: 'Verbrennt Kohle und erzeugt viel Strom.',
    cost: { money: 1500, steel: 80, bricks: 100 },
    interval: 10,
    consumes: { coal: 2 },
    produces: { power: 8 },
    needsRoad: true,
    jobs: { worker: 4 },
    smoke: 2,
    age: 4,
    category: 'resources',
    size: [2, 2],
  },
  solarpark: {
    name: 'Solarpark', icon: '☀️', color: '#4cc9f0',
    description: 'Sauberer Strom aus der Sonne – im Winter weniger.',
    cost: { money: 1200, steel: 40, electronics: 10 },
    interval: 10,
    produces: { power: 4 },
    needsRoad: true,
    jobs: { worker: 1 },
    age: 4,
    category: 'resources',
    size: [2, 2],
  },
  concreteworks: {
    name: 'Betonwerk', icon: '🧊', color: '#ced4da',
    description: 'Mischt Stein mit Strom zu Beton.',
    cost: { money: 1000, steel: 40, bricks: 60 },
    interval: 10,
    consumes: { stone: 4, power: 1 },
    produces: { concrete: 3 },
    needsRoad: true,
    jobs: { worker: 4 },
    smoke: 0.8,
    age: 4,
    category: 'crafts',
    size: [2, 1],
  },
  electronicsworks: {
    name: 'Elektronikwerk', icon: '💻', color: '#4895ef',
    description: 'Baut aus Stahl und Strom Elektronik – sehr wertvoll.',
    cost: { money: 2000, concrete: 60, steel: 60 },
    interval: 12,
    consumes: { steel: 1, power: 3 },
    produces: { electronics: 2 },
    needsRoad: true,
    jobs: { scholar: 4 },
    age: 4,
    category: 'crafts',
    size: [2, 2],
  },
  highrise: {
    name: 'Hochhaus', icon: '🏙️', color: '#90e0ef',
    description: 'Wohnturm aus Beton und Glas: sehr viel Wohnraum auf wenig Platz.',
    cost: { money: 800, concrete: 60, steel: 30 },
    population: 30,
    needsRoad: true,
    age: 4,
    category: 'housing',
    size: [2, 2],
  },
  supermarket: {
    name: 'Supermarkt', icon: '🛒', color: '#ffb703',
    description: 'Verkauft Nahrung und Fabrikwaren – bringt viel Geld.',
    cost: { money: 1500, concrete: 40, steel: 20 },
    interval: 10,
    perPopulation: { money: 0.6 },
    servesUpTo: 80,
    needsRoad: true,
    jobs: { trader: 5 },
    age: 4,
    category: 'resources',
    size: [2, 1],
  },
  university: {
    name: 'Universität', icon: '🎓', color: '#e9edc9',
    description: 'Forschung und Bildung für die ganze Gegend.',
    cost: { money: 3000, concrete: 120, steel: 60, electronics: 20 },
    interval: 10,
    produces: { knowledge: 8 },
    service: { need: 'education', radius: 8 },
    needsRoad: true,
    jobs: { scholar: 8 },
    age: 4,
    category: 'education',
    size: [2, 2],
  },
  stadium: {
    name: 'Stadion', icon: '🏟️', color: '#80ed99',
    description: 'Sport und Konzerte: Freizeit für einen riesigen Umkreis.',
    cost: { money: 6000, concrete: 300, steel: 120 },
    service: { need: 'leisure', radius: 12 },
    needsRoad: true,
    jobs: { worker: 4 },
    age: 4,
    category: 'services',
    size: [3, 3],
  },
  airport: {
    name: 'Flughafen', icon: '✈️', color: '#caf0f8',
    description: 'Das Tor zur Welt – das größte Wahrzeichen deiner Stadt.',
    cost: { money: 20000, concrete: 500, steel: 250, electronics: 120 },
    landmark: 20,
    needsRoad: true,
    age: 4,
    category: 'prestige',
    size: [3, 3],
  },
};

for (const id in BUILDINGS) BUILDINGS[id].id = id;

// Aufträge – werden der Reihe nach freigegeben. Neue einfach anhängen.
//   goal.type: build (Gebäude stehen) | population | happiness | resource (vorrätig) | produced (insgesamt erzeugt) | research (erforschte Technologien) | jobs (beschäftigte im Beruf goal.job) | winters (überstandene Winter)
//   goal.count: Zielwert, goal.building / goal.resource je nach Typ
//   reward: Belohnung { ressource: menge }
const QUESTS = [
  // Steinzeit
  { id: 'paths',       title: 'Erste Pfade',          goal: { type: 'build', building: 'road', count: 3 },        reward: { wood: 8 } },
  { id: 'huts',        title: 'Ein Dach aus Ästen',   goal: { type: 'build', building: 'hut', count: 2 },         reward: { wood: 10 } },
  { id: 'gatherer',    title: 'Beeren sammeln',       goal: { type: 'build', building: 'gatherer', count: 1 },    reward: { food: 10 } },
  { id: 'woodcutter',  title: 'Holz für den Stamm',   goal: { type: 'build', building: 'woodcutter', count: 1 },  reward: { stone: 5 } },
  { id: 'tribe8',      title: 'Ein kleiner Stamm',    goal: { type: 'population', count: 8 },                     reward: { food: 15 } },
  { id: 'stonecutter', title: 'Steine klopfen',       goal: { type: 'build', building: 'stonecutter', count: 1 }, reward: { wood: 10 } },
  { id: 'hunter',      title: 'Auf die Jagd',         goal: { type: 'build', building: 'hunter', count: 1 },      reward: { food: 15 } },
  { id: 'fireplace',   title: 'Am Lagerfeuer',        goal: { type: 'build', building: 'fireplace', count: 1 },   reward: { wood: 10, stone: 5 } },
  { id: 'watertrough', title: 'Wasser gegen Feuer',   goal: { type: 'build', building: 'watertrough', count: 1 }, reward: { wood: 10 } },
  { id: 'painter',     title: 'Bilder an der Wand',   goal: { type: 'build', building: 'painter', count: 1 },     reward: { stone: 10 } },
  { id: 'stoneIdea',   title: 'Die erste Idee',       goal: { type: 'research', count: 1 },                       reward: { knowledge: 5 } },
  { id: 'tribe15',     title: 'Ein wachsender Stamm', goal: { type: 'population', count: 20 },                    reward: { wood: 15, stone: 10 } },
  { id: 'ageAntiquity', title: 'Ein neues Zeitalter', goal: { type: 'age', count: 1 },                            reward: { food: 50, money: 50 } },
  // Antike und Mittelalter
  { age: 1, id: 'roads',      title: 'Erste Wege',           goal: { type: 'build', building: 'road', count: 3 },      reward: { money: 30 } },
  { age: 1, id: 'houses',     title: 'Ein Dach über dem Kopf', goal: { type: 'build', building: 'house', count: 2 },   reward: { wood: 20 } },
  { age: 1, id: 'farm',       title: 'Satt werden',          goal: { type: 'build', building: 'farm', count: 1 },      reward: { money: 30 } },
  { age: 1, id: 'sawmill',    title: 'Bretter sägen',        goal: { type: 'build', building: 'sawmill', count: 1 },  reward: { wood: 20 } },
  { age: 1, id: 'pop8',       title: 'Die ersten Bewohner',  goal: { type: 'population', count: 8 },                   reward: { money: 50 } },
  { age: 1, id: 'quarry',     title: 'Steinbruch',           goal: { type: 'build', building: 'quarry', count: 1 },    reward: { wood: 20 } },
  { age: 1, id: 'market',     title: 'Markttag',             goal: { type: 'build', building: 'market', count: 1 },    reward: { stone: 20 } },
  { age: 1, id: 'warehouse',  title: 'Volle Speicher',       goal: { type: 'build', building: 'warehouse', count: 1 }, reward: { wood: 30 } },
  { age: 1, id: 'land1',      title: 'Neues Land',           goal: { type: 'plots', count: 1 },                        reward: { wood: 40 } },
  { age: 1, id: 'park',       title: 'Grüne Oase',           goal: { type: 'build', building: 'park', count: 1 },      reward: { money: 30 } },
  { age: 1, id: 'firestation', title: 'Brandschutz',         goal: { type: 'build', building: 'firestation', count: 1 }, reward: { money: 40 } },
  { age: 1, id: 'scriptorium', title: 'Wissen ist Macht',    goal: { type: 'build', building: 'scriptorium', count: 1 }, reward: { money: 30 } },
  { age: 1, id: 'research1',  title: 'Erste Erfindung',      goal: { type: 'research', count: 1 },                     reward: { knowledge: 10 } },
  { age: 1, id: 'farms3',     title: 'Kornkammer',           goal: { type: 'build', building: 'farm', count: 3 },      reward: { wood: 40 } },
  { age: 1, id: 'food100',    title: 'Volle Vorratskammer',  goal: { type: 'produced', resource: 'food', count: 100 }, reward: { money: 60 } },
  { age: 1, id: 'wood100',    title: 'Holzvorrat',           goal: { type: 'resource', resource: 'wood', count: 100 }, reward: { stone: 30 } },
  { age: 1, id: 'winter1',    title: 'Der erste Winter',     goal: { type: 'winters', count: 1 },                      reward: { wood: 60, food: 40 } },
  { age: 1, id: 'pop21',      title: 'Auf zur Kleinstadt',   goal: { type: 'population', count: 21 },                  reward: { money: 100, stone: 20 } },
  { age: 1, id: 'well',       title: 'Frisches Wasser',      goal: { type: 'build', building: 'well', count: 1 },      reward: { money: 40 } },
  { age: 2, id: 'school',     title: 'Lesen und Schreiben',  goal: { type: 'build', building: 'school', count: 1 },    reward: { wood: 50 } },
  { age: 1, id: 'upgrade1',   title: 'Ausbau',               goal: { type: 'upgrades', count: 1 },                     reward: { money: 80 } },
  { age: 2, id: 'scholars5',  title: 'Kluge Köpfe',          goal: { type: 'jobs', job: 'scholar', count: 5 },         reward: { knowledge: 30 } },
  { age: 1, id: 'guard',      title: 'Ruhige Nächte',        goal: { type: 'build', building: 'guard', count: 1 },     reward: { stone: 50 } },
  { age: 2, id: 'carpentry',  title: 'Handwerk',             goal: { type: 'build', building: 'sawmill', count: 2 },   reward: { money: 60 } },
  { age: 2, id: 'bakery',     title: 'Frisches Brot',        goal: { type: 'build', building: 'bakery', count: 1 },    reward: { food: 40 } },
  { age: 1, id: 'brickworks', title: 'Ziegelbrenner',        goal: { type: 'build', building: 'brickworks', count: 1 }, reward: { stone: 40 } },
  { age: 2, id: 'planks30',   title: 'Feine Ware',           goal: { type: 'produced', resource: 'planks', count: 30 }, reward: { money: 120 } },
  { age: 1, id: 'happy75',    title: 'Glückliche Leute',     goal: { type: 'happiness', count: 75 },                   reward: { money: 150 } },
  { age: 1, id: 'pop50',      title: 'Wachsende Stadt',      goal: { type: 'population', count: 50 },                  reward: { wood: 100, stone: 100 } },
  { age: 1, id: 'traders6',   title: 'Reger Handel',         goal: { type: 'jobs', job: 'trader', count: 6 },          reward: { money: 100 } },
  { age: 1, id: 'bandits1',   title: 'Sichere Straßen',      goal: { type: 'repelled', count: 1 },                     reward: { money: 150 } },
  { age: 1, id: 'camp1',      title: 'Räubernest',           goal: { type: 'camps', count: 1 },                        reward: { money: 200, stone: 40 } },
  { age: 2, id: 'townhall',   title: 'Prestige',             goal: { type: 'build', building: 'townhall', count: 1 },  reward: { money: 150, stone: 50 } },
  { age: 1, id: 'research4',  title: 'Zeitalter der Gelehrten', goal: { type: 'research', count: 4 },                  reward: { money: 150 } },
  { age: 1, id: 'money500',   title: 'Volle Stadtkasse',     goal: { type: 'resource', resource: 'money', count: 500 }, reward: { stone: 80 } },
  { age: 1, id: 'land5',      title: 'Großgrundbesitz',      goal: { type: 'plots', count: 5 },                        reward: { money: 400 } },
  { age: 1, id: 'pop101',     title: 'Eine echte Stadt',     goal: { type: 'population', count: 101 },                 reward: { money: 300 } },
  { age: 1, id: 'ageMedieval', title: 'Burgen und Kathedralen', goal: { type: 'age', count: 2 },                  reward: { money: 200, knowledge: 20 } },
  { age: 2, id: 'hospital',   title: 'Gute Besserung',       goal: { type: 'build', building: 'hospital', count: 1 },  reward: { money: 200 } },
  { age: 2, id: 'brewery',    title: 'Prost!',               goal: { type: 'build', building: 'brewery', count: 1 },   reward: { money: 120 } },
  { age: 2, id: 'weaver',     title: 'Neue Kleider',         goal: { type: 'build', building: 'weaver', count: 1 },    reward: { wool: 20, money: 80 } },
  { age: 2, id: 'ageIndustry', title: 'Rauchende Schlote',   goal: { type: 'age', count: 3 },                    reward: { money: 500, knowledge: 50 } },
  { age: 3, id: 'coalmine',  title: 'Schwarzes Gold',       goal: { type: 'build', building: 'coalmine', count: 1 },  reward: { money: 300 } },
  { age: 3, id: 'tenement',  title: 'Wohnen in der Stadt',  goal: { type: 'build', building: 'tenement', count: 3 },  reward: { bricks: 40 } },
  { age: 3, id: 'steelworks', title: 'Stahl und Feuer',     goal: { type: 'build', building: 'steelworks', count: 1 }, reward: { coal: 40, money: 300 } },
  { age: 3, id: 'factory',   title: 'Die erste Fabrik',     goal: { type: 'build', building: 'factory', count: 1 },   reward: { money: 500 } },
  { age: 3, id: 'station',   title: 'Alles einsteigen!',    goal: { type: 'build', building: 'station', count: 1 },   reward: { money: 600 } },
  { age: 3, id: 'pop250',    title: 'Großstadt',            goal: { type: 'population', count: 250 },                 reward: { money: 1000 } },
  { age: 3, id: 'ageModern', title: 'Die moderne Zeit',     goal: { type: 'age', count: 4 },                          reward: { money: 2000, knowledge: 200 } },
  { age: 4, id: 'powerplant', title: 'Es werde Licht',      goal: { type: 'build', building: 'powerplant', count: 1 }, reward: { coal: 100 } },
  { age: 4, id: 'highrise',  title: 'Hoch hinaus',          goal: { type: 'build', building: 'highrise', count: 2 },  reward: { concrete: 50, money: 1000 } },
  { age: 4, id: 'university', title: 'Studieren',           goal: { type: 'build', building: 'university', count: 1 }, reward: { knowledge: 500 } },
  { age: 4, id: 'pop500',    title: 'Metropole',            goal: { type: 'population', count: 500 },                 reward: { money: 5000 } },
  { age: 4, id: 'airport',   title: 'Abflug!',              goal: { type: 'build', building: 'airport', count: 1 },   reward: { money: 10000 } },
  { age: 2, id: 'tools20',    title: 'Gutes Werkzeug',       goal: { type: 'produced', resource: 'tools', count: 20 }, reward: { money: 300, iron: 20 } },
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
  { id: 'firstHouse', icon: '🏠', name: 'Grundstein',          text: 'Baue dein erstes Haus.',                  check: () => countFinished('house') >= 1 },
  { id: 'pop50',      icon: '👥', name: 'Gemeinschaft',        text: 'Erreiche 50 Einwohner.',                   check: () => state.population >= 50 },
  { id: 'pop100',     icon: '🏙️', name: 'Erste 100 Einwohner', text: 'Erreiche 100 Einwohner.',                  check: () => state.population >= 100 },
  { id: 'busy10',     icon: '⚙️', name: 'Fleißige Stadt',      text: '10 Gebäude produzieren gleichzeitig.',     check: () => producingCount() >= 10 },
  { id: 'roads50',    icon: '🛣️', name: 'Straßenbauer',        text: 'Baue 50 Straßenfelder.',                   check: () => countBuildings('road') + countBuildings('gate') >= 50 },
  { id: 'rich1000',   icon: '💰', name: 'Volle Kasse',         text: 'Habe 1000 Geld auf einmal.',               check: () => state.resources.money >= 1000 },
  { id: 'happy90',    icon: '😊', name: 'Glückliche Stadt',    text: 'Zufriedenheit 90 mit mindestens 20 Einwohnern.', check: () => stats.happiness >= 90 && state.population >= 20 },
  { id: 'nice10',     icon: '✨', name: 'Schöne Viertel',      text: '10 Häuser in schönen Wohnvierteln.',       check: () => stats.niceHouses >= 10 },
  { id: 'fire5',      icon: '🚒', name: 'Feuerwehr',           text: 'Lösche 5 Brände.',                         check: () => (state.counters.extinguished || 0) >= 5 },
  { id: 'trade10',    icon: '🤝', name: 'Händler',             text: 'Handle 10-mal am Markt oder mit Karawanen.', check: () => (state.counters.trades || 0) >= 10 },
  { id: 'allTech',    icon: '🔬', name: 'Universalgelehrter',  text: 'Erforsche alle Technologien.',             check: () => state.techs.length === Object.keys(TECHS).length },
  { id: 'landmarks',  icon: '🏛️', name: 'Wahrzeichen',         text: 'Baue alle Sehenswürdigkeiten.',            check: () => Object.keys(BUILDINGS).filter(t => BUILDINGS[t].landmark).every(t => countFinished(t) > 0) },
  { id: 'allQuests',  icon: '📜', name: 'Auftragsheld',        text: 'Erledige alle Aufträge.',                  check: () => state.questsClaimed.length === QUESTS.length },
  { id: 'streak7',    icon: '📅', name: 'Treue Seele',         text: 'Spiele 7 Tage in Folge.',                  check: () => state.daily.streak >= 7 },
  { id: 'dynasty',    icon: '👑', name: 'Dynastie',            text: 'Vollende 3 Städte.',                        check: () => legacy.stars >= 3 },
  { id: 'carts25',    icon: '🛒', name: 'Handelsroute',        text: '25 Handelskarren kommen sicher an.',        check: () => (state.counters.carts || 0) >= 25 },
  { id: 'fortress',   icon: '🏰', name: 'Festungsstadt',       text: '40 Mauerstücke und 3 Wachtürme.',           check: () => countBuildings('wall') + countBuildings('gate') >= 40 && countFinished('tower') >= 3 },
  { id: 'lawman',     icon: '⚖️', name: 'Gesetzeshüter',       text: 'Schlage 5 Banditenüberfälle zurück.',      check: () => (state.counters.repelled || 0) >= 5 },
  { id: 'gold10',     icon: '🌟', name: 'Prachtbauten',        text: '10 Gebäude auf Stufe 3.',                  check: () => state.grid.filter(c => c && levelOf(c) >= 3).length >= 10 },
  { id: 'land20',     icon: '🗺️', name: 'Landesherr',          text: 'Kaufe 20 Flächen dazu.',                   check: () => plotsBought() >= 20 },
  { id: 'warmWinter', icon: '🔥', name: 'Warme Stuben',        text: 'Überstehe einen Winter mit mindestens 50 Einwohnern, ohne dass jemand friert.', check: () => (state.counters.warmWinters || 0) >= 1 },
  { id: 'fullJobs',   icon: '👷', name: 'Vollbeschäftigung',   text: 'Mindestens 50 Einwohner und niemand ist arbeitslos.', check: () => state.population >= 50 && stats.unemployed === 0 },
  { id: 'crafts100',  icon: '🔨', name: 'Meisterhandwerker',   text: 'Stelle insgesamt 100 Handwerkswaren her (Bretter, Ziegel, Brot, Bier, Stoff, Werkzeug).',
    check: () => ['planks', 'bricks', 'bread', 'beer', 'cloth', 'tools'].reduce((sum, id) => sum + (state.produced[id] || 0), 0) >= 100 },
];

// Forschung. Immer nur eine gleichzeitig; Kosten werden beim Start bezahlt.
//   cost: Kosten  | seconds: Forschungsdauer  | requires: vorher nötige Technologien
//   effect: dauerhafte Wirkung, alles optional:
//     production: { gebäude: +Anteil }   z. B. 0.5 = +50 % Ertrag
//     capacity:   { gebäude: +Plätze }   zusätzliche Wohnplätze
//     happiness:  Punkte                 dauerhafter Zufriedenheitsbonus
//     flags:      { name: true }         Sonderregeln (fireResistant, plagueResistant)
//   Gebäude mit requiresTech werden durch die Technologie freigeschaltet.
// age: ab welchem Zeitalter erforschbar (Standard 1 = Antike)
const TECHS = {
  stonetools: {
    name: 'Steinwerkzeuge', icon: '🪓', age: 0,
    description: 'Scharfe Faustkeile: Holzfäller und Steinsammler liefern 50 % mehr.',
    cost: { knowledge: 12 }, seconds: 80,
    effect: { production: { woodcutter: 0.5, stonecutter: 0.5 } },
  },
  spears: {
    name: 'Speere', icon: '🏹', age: 0,
    description: 'Mit Speeren jagt es sich besser: Jägerlager liefern 50 % mehr.',
    cost: { knowledge: 12 }, seconds: 80,
    effect: { production: { hunter: 0.5 } },
  },
  baskets: {
    name: 'Flechtkörbe', icon: '🧺', age: 0,
    description: 'In Körben passt mehr hinein: Sammlerinnen liefern 50 % mehr.',
    cost: { knowledge: 18 }, seconds: 90,
    effect: { production: { gatherer: 0.5 } },
  },
  clayhuts: {
    name: 'Lehmhütten', icon: '🛖', age: 0,
    description: 'Wände aus Lehm: Hütten bieten 1 Wohnplatz mehr.',
    cost: { knowledge: 30, stone: 20 }, seconds: 120,
    requires: ['stonetools'],
    effect: { capacity: { hut: 1 } },
  },
  steam: {
    name: 'Dampfmaschine', icon: '🚂', age: 3,
    description: 'Dampfkraft: Sägewerke, Steinbrüche und Kohlebergwerke liefern 50 % mehr.',
    cost: { knowledge: 400, coal: 50 }, seconds: 240,
    effect: { production: { sawmill: 0.5, quarry: 0.5, coalmine: 0.5 } },
  },
  assembly: {
    name: 'Fließband', icon: '⚙️', age: 3,
    description: 'Fabriken und Stahlwerke liefern 50 % mehr.',
    cost: { knowledge: 600, steel: 40 }, seconds: 300,
    requires: ['steam'],
    effect: { production: { factory: 0.5, steelworks: 0.5 } },
  },
  railways: {
    name: 'Eisenbahnnetz', icon: '🛤️', age: 3,
    description: 'Bahnhöfe bringen 50 % mehr Geld.',
    cost: { knowledge: 500, steel: 60 }, seconds: 240,
    requires: ['steam'],
    effect: { production: { station: 0.5 } },
  },
  electricity: {
    name: 'Stromnetz', icon: '🔌', age: 4,
    description: 'Kraftwerke und Solarparks liefern 50 % mehr Strom.',
    cost: { knowledge: 1500 }, seconds: 300,
    effect: { production: { powerplant: 0.5, solarpark: 0.5 } },
  },
  computers: {
    name: 'Computer', icon: '🖥️', age: 4,
    description: 'Elektronikwerke und Universitäten liefern 50 % mehr.',
    cost: { knowledge: 2500, electronics: 30 }, seconds: 360,
    requires: ['electricity'],
    effect: { production: { electronicsworks: 0.5, university: 0.5 } },
  },
  irrigation: {
    name: 'Bewässerung', icon: '🌊', age: 1,
    description: 'Farmen liefern 50 % mehr Nahrung.',
    cost: { knowledge: 60 }, seconds: 120,
    effect: { production: { farm: 0.5 } },
  },
  tools: {
    name: 'Bessere Werkzeuge', icon: '🪓', age: 1,
    description: 'Holzfäller und Steinbrüche liefern 50 % mehr.',
    cost: { knowledge: 75 }, seconds: 120,
    effect: { production: { woodcutter: 0.5, quarry: 0.5 } },
  },
  stoves: {
    name: 'Kachelöfen', icon: '♨️', age: 2,
    description: 'Gemauerte Öfen halten länger warm: Heizen braucht nur halb so viel Holz.',
    cost: { knowledge: 160, bricks: 30 }, seconds: 180,
    requires: ['craftsmanship'],
    effect: { flags: { heatingSaver: true } },
  },
  craftsmanship: {
    name: 'Handwerkskunst', icon: '🔨', age: 2,
    description: 'Sägewerke, Ziegeleien und Bäckereien liefern 50 % mehr.',
    cost: { knowledge: 150 }, seconds: 180,
    requires: ['tools'],
    effect: { production: { sawmill: 0.5, brickworks: 0.5, bakery: 0.5 } },
  },
  library: {
    name: 'Bibliothek', icon: '📚', age: 1,
    description: 'Schaltet die Bibliothek frei: viel Wissen und Bildung.',
    cost: { knowledge: 120 }, seconds: 150,
  },
  stonewalls: {
    name: 'Steinmauern', icon: '⛰️', age: 2,
    description: 'Häuser bieten 2 Wohnplätze mehr. Brände greifen nicht über und brennen doppelt so lange.',
    cost: { knowledge: 180, stone: 120 }, seconds: 180,
    requires: ['tools'],
    effect: { capacity: { house: 2 }, flags: { fireResistant: true } },
  },
  accounting: {
    name: 'Buchhaltung', icon: '⚖️', age: 1,
    description: 'Märkte bringen 50 % mehr Geld.',
    cost: { knowledge: 180 }, seconds: 180,
    requires: ['library'],
    effect: { production: { market: 0.5 } },
  },
  croprotation: {
    name: 'Fruchtwechsel', icon: '🌱', age: 2,
    description: 'Farmen liefern weitere 50 % mehr Nahrung.',
    cost: { knowledge: 270 }, seconds: 240,
    requires: ['irrigation', 'library'],
    effect: { production: { farm: 0.5 } },
  },
  sewers: {
    name: 'Kanalisation', icon: '🚰', age: 2,
    description: 'Zufriedenheit +5. Seuchen richten nur halb so viel Schaden an.',
    cost: { knowledge: 330, stone: 100, bricks: 40 }, seconds: 240,
    requires: ['stonewalls'],
    effect: { happiness: 5, flags: { plagueResistant: true } },
  },
  militia: {
    name: 'Bürgerwehr', icon: '⚔️', age: 2,
    description: 'Ausgebildete Bürger helfen den Wachen: Abwehr gegen Banditen +50 %.',
    cost: { knowledge: 140, money: 150 }, seconds: 150,
    requires: ['stonewalls'],
    effect: { flags: { militia: true } },
  },
  administration: {
    name: 'Verwaltung', icon: '🏛️', age: 2,
    description: 'Eine gut geführte Stadt: Zufriedenheit +5.',
    cost: { knowledge: 420, money: 400 }, seconds: 300,
    requires: ['accounting'],
    effect: { happiness: 5 },
  },
};

// Zufallsereignisse. weight: Häufigkeit, minPop: frühestens ab so vielen Einwohnern, minAge: frühestens ab diesem Zeitalter, seasons: nur in diesen Jahreszeiten
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
    text: 'Es regnet seit Wochen nicht. 60 Sekunden lang gibt es nur halb so viel Nahrung.',
  },
  caravan: {
    name: 'Händlerkarawane', icon: '🐪', weight: 2, minPop: 5, minAge: 1,
    start: () => offerTrade(),
  },
  plague: {
    name: 'Seuche', icon: '🦠', weight: 1, minPop: 20, minAge: 1,   // erst wenn es Brunnen gibt
    start: () => startPlague(),
  },
  bandits: {
    name: 'Banditen', icon: '🏴‍☠️', weight: 2, minPop: 30, minAge: 1,
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
  terrain: new Uint8Array(N * N),   // Gelände je Feld (Index in TERRAIN)
  population: 0,     // tatsächliche Einwohner (≤ Wohnplätze)
  maxLevel: 0,       // höchste erreichte Stufe – Freischaltungen bleiben erhalten
  age: 0,            // Zeitalter (Index in AGES)
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
  entrances: new Map(),          // Straßenfeld -> Richtungen zu Gebäuden, deren Eingang dort liegt (Bits 1↑ 2→ 4↓ 8←)
  jobs: { demand: {}, assigned: {}, scholarCap: 0 },   // Stellen und Besetzung je Beruf
  staff: {},                     // Besetzungsgrad 0–1 je Gebäudeart (Durchschnitt, für Übersichten)
  cellStaff: new Map(),          // Feldindex -> Zahl der Beschäftigten in genau diesem Gebäude
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
  state.terrain = generateTerrain(Math.floor(Math.random() * 2 ** 31));
  state.plots = startPlots();
  state.plotsGranted = 0;
  state.cityName = '';
  state.completed = false;
  state.camps = [];
  state.campSpawnIn = 240;
  raids = [];
  carts = [];
  state.population = 0;
  state.maxLevel = 0;
  state.age = 0;
  state.questsClaimed = [];
  state.produced = {};
  state.effects = [];
  state.nextEventIn = CONFIG.firstEventSeconds;
  state.techs = [];
  state.research = null;
  state.ageUp = null;
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
  const price = Math.round(CONFIG.plotBasePrice * Math.pow(CONFIG.plotPriceGrowth, Math.max(0, plotsBought())));
  if (state.age === 0) return { wood: Math.round(price * 0.5), food: Math.round(price * 0.3) };   // Steinzeit: ohne Geld
  return { money: price };
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
  const def = BUILDINGS[type];
  const [w, h] = placementSize(type);
  if (def.onTerrain) return canPlaceOnTerrain(x, y, w, h, def.onTerrain);
  if (!canPlaceSize(x, y, w, h)) return false;
  return nearTerrainOk(def, x, y, w, h);
}

// Braucht das Gebäude ein bestimmtes Gelände direkt daneben (Fischerhütte am Wasser, Mine am Berg)?
function nearTerrainOk(def, x, y, w, h) {
  const need = def.nearTerrain;
  return !need || countTerrainNear(x, y, w, h, need.terrain, 1) >= need.min;
}

function nearTerrainText(def) {
  const t = TERRAIN[TERRAIN_ID[def.nearTerrain.terrain]];
  return `${def.icon} ${def.name} muss direkt ${t.id === 'water' ? 'am Wasser' : 'an einem Berg'} stehen`;
}

// Brücken: alle Felder frei, eigenes Land und vom passenden Gelände
function canPlaceOnTerrain(x, y, w, h, terrain) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (anchorAt(x + dx, y + dy) !== -1 || !isOwned(x + dx, y + dy) || terrainAt(x + dx, y + dy) !== TERRAIN_ID[terrain]) return false;
    }
  }
  return true;
}



// Ist die Fläche frei und eigenes Land? ignore: Gebäude-Ecke, deren eigene Felder als frei zählen (Drehen, Verschieben)
function canPlaceSize(x, y, w, h, ignore = -1) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const a = anchorAt(x + dx, y + dy);
      if (a === undefined || (a !== -1 && a !== ignore) || !isOwned(x + dx, y + dy) || terrainBlocked(x + dx, y + dy)) return false;
    }
  }
  return true;
}

// ---------- Gelände ----------

// Reproduzierbarer Zufall: gleicher Startwert = gleiche Landschaft
function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Weiches Rauschen (Werte 0–1) mit Strukturen von etwa `cell` Feldern Größe
function makeNoise(rng, cell) {
  const gw = Math.ceil(N / cell) + 2;
  const g = Array.from({ length: gw * gw }, () => rng());
  const smooth = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / cell, fy = y / cell;
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = smooth(fx - ix), ty = smooth(fy - iy);
    const a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
}

// Landschaft erzeugen: Wälder und Berge aus Rauschen, dazu Seen. Das Startgebiet bleibt gut bebaubar,
// bekommt aber einen Teich und Wald, und gleich daneben liegt ein Berg – so lohnen sich die Boni von Anfang an.
function generateTerrain(seed) {
  const rng = seededRng(seed);
  const t = new Uint8Array(N * N);
  const C = N / 2, start = CONFIG.startPlots * CONFIG.plotSize / 2;
  const forestA = makeNoise(rng, 7), forestB = makeNoise(rng, 3);
  const rockA = makeNoise(rng, 9), rockB = makeNoise(rng, 3);
  const shore = makeNoise(rng, 2);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const d = Math.max(Math.abs(x + 0.5 - C), Math.abs(y + 0.5 - C));   // Abstand zur Kartenmitte
      const far = clamp((d - start) / 6, 0, 1);
      const r = rockA(x, y) * 0.75 + rockB(x, y) * 0.25;
      const f = forestA(x, y) * 0.7 + forestB(x, y) * 0.3;
      if (d > start + 1 && r > 0.8 - 0.07 * far) t[y * N + x] = TERRAIN_ID.rock;
      else if (d > 3 && f > 0.66 - 0.07 * far) t[y * N + x] = TERRAIN_ID.forest;
    }
  }
  const blob = (cx, cy, radius, id) => {
    for (let y = Math.floor(cy - radius - 2); y <= cy + radius + 2; y++) {
      for (let x = Math.floor(cx - radius - 2); x <= cx + radius + 2; x++) {
        if (x < 0 || y < 0 || x >= N || y >= N) continue;
        if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < radius * (0.75 + 0.5 * shore(x, y))) t[y * N + x] = id;
      }
    }
  };
  // Seen außerhalb des Startgebiets
  const lakes = Math.round((5 + rng() * 3) * N * N / 4096);   // 5–7 Seen je 64×64 Felder
  for (let k = 0, tries = 0; k < lakes && tries < 400; tries++) {
    const cx = 3 + rng() * (N - 6), cy = 3 + rng() * (N - 6);
    const radius = 1.8 + rng() * 2.8;
    if (Math.max(Math.abs(cx - C), Math.abs(cy - C)) < start + radius + 1) continue;
    blob(cx, cy, radius, TERRAIN_ID.water);
    k++;
  }
  // Teich im Startgebiet und ein Berg direkt daneben (auf zufälligen Seiten)
  const side = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const [px, py] = side[Math.floor(rng() * 4)];
  const offset = (rng() - 0.5) * 6;
  blob(C + px * (start - 3) + py * offset, C + py * (start - 3) + px * offset, 1.6, TERRAIN_ID.water);
  const [mx, my] = side[Math.floor(rng() * 4)];
  blob(C + mx * (start + 4) + my * offset * 0.5, C + my * (start + 4) + mx * offset * 0.5, 2.8, TERRAIN_ID.rock);
  return t;
}

function terrainAt(x, y) {
  return state.terrain[y * N + x] || 0;
}

function terrainBlocked(x, y) {
  return !!TERRAIN[terrainAt(x, y)].blocks;
}

// Felder eines Geländes im Umkreis `radius` um die Fläche (Abstand wie rectGap: 1 = direkt daneben)
function countTerrainNear(ax, ay, w, h, id, radius) {
  const k = TERRAIN_ID[id];
  let n = 0;
  for (let y = Math.max(0, ay - radius); y < Math.min(N, ay + h + radius); y++) {
    for (let x = Math.max(0, ax - radius); x < Math.min(N, ax + w + radius); x++) {
      if (state.terrain[y * N + x] === k) n++;
    }
  }
  return n;
}

// Ertragsbonus durch Gelände (0.3 = +30 %)
function terrainBonusOf(type, ax, ay, w, h) {
  const b = TERRAIN_BONUS[type];
  if (!b) return 0;
  const n = countTerrainNear(ax, ay, w, h, b.terrain, b.radius);
  if (!n) return 0;
  return b.flat ?? Math.min(b.max, n * b.perTile);
}

function terrainBonusText(type, bonus) {
  const b = TERRAIN_BONUS[type];
  return `${TERRAIN[TERRAIN_ID[b.terrain]].icon} ${b.label}: +${Math.round(bonus * 100)} % Ertrag`;
}

// Beim Bauen werden Wälder auf der Fläche gerodet – das bringt Holz
function clearTerrain(ax, ay, w, h) {
  const gained = {};
  for (let y = ay; y < ay + h; y++) {
    for (let x = ax; x < ax + w; x++) {
      const def = TERRAIN[state.terrain[y * N + x]];
      if (!def || def.blocks || !def.clearYield) continue;
      for (const [id, n] of Object.entries(def.clearYield)) gained[id] = (gained[id] || 0) + n;
      state.terrain[y * N + x] = TERRAIN_ID.grass;
    }
  }
  if (!Object.keys(gained).length) return;
  addResources(gained);
  spawnFloater(ax, ay, '🪓 ' + Object.entries(gained).map(([id, n]) => `+${n}${RESOURCES[id].icon}`).join(' '));
}

function encodeTerrain() {
  return Array.from(state.terrain, k => String(k)).join('');
}

// Gelände aus dem Spielstand; fehlt es (alter Spielstand), entsteht neue Landschaft nur auf fremdem Land.
// Stammt es von einer kleineren Karte, liegt es in der Mitte, drumherum entsteht neue Landschaft.
function loadTerrain(data, oldSize, offset) {
  const text = data.terrain;
  if (oldSize <= N && typeof text === 'string' && text.length === oldSize * oldSize && /^[0-9]+$/.test(text)) {
    for (let i = 0; i < text.length; i++) {
      state.terrain[(Math.floor(i / oldSize) + offset) * N + i % oldSize + offset] = Math.min(Number(text[i]), TERRAIN.length - 1);
    }
  } else {
    for (let i = 0; i < N * N; i++) if (state.plots[plotOf(i % N, Math.floor(i / N))]) state.terrain[i] = TERRAIN_ID.grass;
  }
  // Unter Gebäuden ist immer Wiese (außer unter Brücken)
  state.grid.forEach((cell, i) => {
    if (!cell || BUILDINGS[cell.type].onTerrain) return;
    const [w, h] = sizeOf(cell);
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) state.terrain[(Math.floor(i / N) + dy) * N + i % N + dx] = TERRAIN_ID.grass;
  });
}

// Größe beim Bauen – gedreht, wenn der Spieler 🔄 gewählt hat (nur bei nicht quadratischen Gebäuden)
let buildRotated = false;

function placementSize(type) {
  const [w, h] = footprintSize(type);
  return buildRotated && w !== h ? [h, w] : [w, h];
}

// ---------- Drehen und Verschieben ----------

function rotateBuilding(i) {
  const cell = state.grid[i];
  if (!cell || cell.fire || cell.build?.from) return;   // nicht während des Weiterentwickelns (Abbrechen braucht die alte Lage)
  const [w, h] = sizeOf(cell);
  if (w === h) return;
  const x = i % N, y = Math.floor(i / N);
  // Gedrehte Lage suchen, die das bisherige Eckfeld weiter abdeckt (nach unten/rechts zuerst, sonst nach oben/links)
  let spot = null;
  for (let dy = 0; dy < w && !spot; dy++) {
    for (let dx = 0; dx < h && !spot; dx++) {
      if (canPlaceSize(x - dx, y - dy, h, w, i)) spot = [x - dx, y - dy];
    }
  }
  if (!spot) {
    sound.play('error');
    showToast('Kein Platz zum Drehen – die Fläche daneben ist belegt oder fremdes Land');
    return;
  }
  const [nx, ny] = spot;
  setOccupied(x, y, w, h, -1);
  state.grid[i] = null;
  cell.w = h;
  cell.h = w;
  state.grid[ny * N + nx] = cell;
  setOccupied(nx, ny, h, w, ny * N + nx);
  if (infoTile && infoTile.x === x && infoTile.y === y) infoTile = { x: nx, y: ny };
  sound.play('build');
  recalcStats();
  updateUI();
}

let moveMode = null;   // { from: Gebäude-Ecke, rotated }

function startMove(i) {
  const cell = state.grid[i];
  if (!cell || cell.fire) return;
  if (cell.build?.from) {
    showToast('Erst fertig weiterentwickeln, dann verschieben');
    return;
  }
  selectBuild(null);
  closeInfo();
  moveMode = { from: i, rotated: false };
  renderMoveBar();
}

function cancelMove() {
  moveMode = null;
  document.getElementById('move-bar').classList.add('hidden');
}

function moveSize() {
  const [w, h] = sizeOf(state.grid[moveMode.from]);
  return moveMode.rotated && w !== h ? [h, w] : [w, h];
}

function moveBuildingTo(x, y) {
  const from = moveMode.from;
  const cell = state.grid[from];
  if (!cell) return cancelMove();
  const [w, h] = moveSize();
  if (!canPlaceSize(x, y, w, h, from)) {
    sound.play('error');
    showToast('Hier ist kein Platz (belegt, Berg/See oder fremdes Land)');
    return;
  }
  if (!nearTerrainOk(BUILDINGS[cell.type], x, y, w, h)) {
    sound.play('error');
    showToast(nearTerrainText(BUILDINGS[cell.type]));
    return;
  }
  const [ow, oh] = sizeOf(cell);
  setOccupied(from % N, Math.floor(from / N), ow, oh, -1);
  state.grid[from] = null;
  if (w > 1 || h > 1) { cell.w = w; cell.h = h; } else { delete cell.w; delete cell.h; }
  cell.builtAt = performance.now();
  state.grid[y * N + x] = cell;
  setOccupied(x, y, w, h, y * N + x);
  clearTerrain(x, y, w, h);
  cancelMove();
  sound.play('build');
  showToast(`✋ ${BUILDINGS[cell.type].name} verschoben`);
  emit('move', { from, to: y * N + x });
  recalcStats();
  updateUI();
}

function renderMoveBar() {
  const bar = document.getElementById('move-bar');
  const cell = state.grid[moveMode.from];
  const [w, h] = sizeOf(cell);
  bar.innerHTML = `<span class="bi-icon">${BUILDINGS[cell.type].icon}</span>
    <strong>✋ Ziel antippen</strong><span class="bi-meta">${BUILDINGS[cell.type].name} verschieben</span>
    ${w !== h ? '<button class="bi-more" data-act="rotate" title="Drehen (R)">🔄</button>' : ''}
    <button class="bi-close" data-act="cancel" title="Abbrechen (Esc)">✕</button>`;
  bar.classList.remove('hidden');
}

// ---------- Bau-Vorschau: erst hinstellen, dann mit ✓ bauen ----------

let pending = null;   // { x, y } – geplantes Gebäude (selectedType), wartet auf Bestätigung

function setPending(x, y) {
  pending = { x, y };
  renderPlaceBar();
}

function clearPending() {
  pending = null;
  document.getElementById('place-bar').classList.add('hidden');
}

function pendingContains(x, y) {
  if (!pending || !selectedType) return false;
  const [w, h] = placementSize(selectedType);
  return x >= pending.x && y >= pending.y && x < pending.x + w && y < pending.y + h;
}

function confirmPending() {
  if (!pending || !selectedType) return;
  if (placeBuilding(pending.x, pending.y, selectedType)) {
    sound.play('build');
    clearPending();
  } else {
    renderPlaceBar();
  }
}

function renderPlaceBar() {
  const bar = document.getElementById('place-bar');
  if (!pending || !selectedType) return bar.classList.add('hidden');
  const def = BUILDINGS[selectedType];
  const [fw, fh] = footprintSize(selectedType);
  const problem = placeProblem(pending.x, pending.y, selectedType);
  const secs = buildTimeOf(selectedType);
  const text = problem || `${formatAmounts(costOf(selectedType))}${secs ? ` · ⏱ ${secondsText(secs)}` : ''}`;
  const key = `${selectedType}|${problem}|${text}|${fw !== fh}`;
  if (bar.dataset.key !== key) {
    bar.dataset.key = key;
    bar.innerHTML = `<span class="bi-icon">${def.icon}</span>
      <span class="pb-text"><strong>${problem ? 'Passt nicht' : 'Hier bauen?'}</strong><span class="pb-meta${problem ? ' bad' : ''}"></span></span>
      ${fw !== fh ? '<button class="bi-rotate" data-act="rotate" title="Drehen (R)">🔄</button>' : ''}
      <button class="pb-cancel" data-act="cancel" title="Abbrechen (Esc)">✖</button>
      <button class="pb-ok" data-act="ok" title="Bauen (Enter)"${problem ? ' disabled' : ''}>✔</button>`;
    bar.querySelector('.pb-meta').textContent = text;
  }
  bar.classList.remove('hidden');
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
  if (cell.fire || cell.build) return false;
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
  if (def.evolvesTo && isUnlocked(def.evolvesTo)) return false;   // überholt, z. B. Wassertrog ab der Feuerwache
  return (def.age || 0) <= state.age && (def.unlockLevel || 0) <= state.maxLevel && (!def.requiresTech || state.techs.includes(def.requiresTech));
}

// Warum ist ein Gebäude gesperrt? (kurz für die Bauleiste, lang für die Meldung)
function lockReason(type, long = false) {
  const def = BUILDINGS[type];
  if ((def.age || 0) > state.age) {
    const age = AGES[def.age];
    return long ? `dem Aufstieg ins Zeitalter ${age.icon} ${age.name}` : `ab ${age.name}`;
  }
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

// Haus mit Park, Brunnen o. Ä. oder Wasser direkt daneben (auch diagonal)?
function isNiceHouse(x, y) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cell = getCell(x + dx, y + dy);
      if (cell && BUILDINGS[cell.type].beautifies && isActive(x + dx, y + dy)) return true;
      if (cell === null && terrainAt(x + dx, y + dy) === TERRAIN_ID.water) return true;
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
  if (!cell || !canUpgradeType(cell.type) || cell.build) return;
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

// ---------- Weiterentwickeln (Hütte → Haus …) ----------

// Größe nach dem Weiterentwickeln: das neue Gebäude wächst von der linken oberen Ecke aus (wenn nötig gedreht)
function developSize(i, target) {
  const x = i % N, y = Math.floor(i / N);
  const [w, h] = footprintSize(target);
  for (const [tw, th] of w === h ? [[w, h]] : [[w, h], [h, w]]) {
    if (canPlaceSize(x, y, tw, th, i) && nearTerrainOk(BUILDINGS[target], x, y, tw, th)) return [tw, th];
  }
  return null;
}

// Kosten: wie ein Neubau, abzüglich des Verkaufswerts des alten Gebäudes
function developCost(cell) {
  const target = BUILDINGS[cell.type].developsTo;
  const cost = costOf(target);
  const value = refundOf(cell);
  for (const id in cost) {
    cost[id] = Math.max(0, cost[id] - (value[id] || 0));
    if (!cost[id]) delete cost[id];
  }
  return cost;
}

// Warum geht das Weiterentwickeln (noch) nicht? null = möglich
function developProblem(i) {
  const cell = state.grid[i];
  const target = cell && BUILDINGS[cell.type].developsTo;
  if (!target || cell.build || cell.fire) return 'nicht möglich';
  const def = BUILDINGS[target];
  if (!isUnlocked(target)) return `🔒 ${def.icon} ${def.name} ${lockReason(target)}`;
  if (!developSize(i, target)) {
    const [w, h] = footprintSize(target);
    return `${def.icon} ${def.name} braucht ${w}×${h} Felder – daneben ist kein Platz`;
  }
  if (constructionCount() >= CONFIG.maxConstructions) return `🏗️ Höchstens ${CONFIG.maxConstructions} Baustellen gleichzeitig`;
  const cost = developCost(cell);
  if (!canAfford(cost)) return `Nicht genug ${missingText(cost)}`;
  return null;
}

function developBuilding(x, y) {
  const i = anchorAt(x, y);
  if (i === undefined || i < 0) return false;
  const cell = state.grid[i];
  const problem = developProblem(i);
  if (problem) {
    sound.play('error');
    showToast(problem, 2500);
    return false;
  }
  x = i % N;
  y = Math.floor(i / N);
  const from = cell.type, target = BUILDINGS[from].developsTo;
  const [w, h] = developSize(i, target);
  const cost = developCost(cell);
  addResources(cost, -1);
  const seconds = buildTimeOf(target);
  // Merken, was es vorher war: Abbrechen stellt das alte Gebäude wieder her.
  // Das neue Gebäude beginnt auf Stufe 1 (die alten Ausbauten sind schon als Rabatt im Preis verrechnet)
  const old = { type: from, w: cell.w, h: cell.h, level: cell.level };
  cell.type = target;
  cell.timer = 0;
  delete cell.level;
  delete cell.w; delete cell.h;
  if (w > 1 || h > 1) { cell.w = w; cell.h = h; }
  setOccupied(x, y, w, h, i);
  clearTerrain(x, y, w, h);
  cell.build = { left: Math.max(1, seconds), total: Math.max(1, seconds), paid: cost, from: old };
  cell.builtAt = performance.now();
  sound.play('build');
  showToast(`🏗️ ${BUILDINGS[from].icon} ${BUILDINGS[from].name} wird zu ${BUILDINGS[target].icon} ${BUILDINGS[target].name} – fertig in ${secondsText(cell.build.left)}`, 2500);
  emit('develop', { x, y, from, type: target });
  recalcStats();
  updateUI();
  return true;
}

// Weiterentwickeln abbrechen: altes Gebäude zurück, bezahlte Kosten zurück
function cancelDevelop(i) {
  const cell = state.grid[i];
  const old = cell.build.from;
  addResources(cell.build.paid, 1);
  setOccupied(i % N, Math.floor(i / N), ...sizeOf(cell), -1);
  cell.type = old.type;
  delete cell.w; delete cell.h;
  if (old.w) { cell.w = old.w; cell.h = old.h; }
  if (old.level) cell.level = old.level;
  delete cell.build;
  cell.timer = 0;
  setOccupied(i % N, Math.floor(i / N), ...sizeOf(cell), i);
}

// Neue Waren erst zeigen, wenn die Stufe erreicht ist oder schon etwas davon da ist
function isResourceVisible(id) {
  if ((RESOURCES[id].fromAge || 0) > state.age) return false;
  return state.resources[id] > 0 || (state.produced[id] || 0) > 0 || (RESOURCES[id].showFrom || 0) <= state.maxLevel;
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
  const base = def.ageCost?.[state.age] || def.cost;
  if (def.fixedCost) return base;
  const factor = 1 + CONFIG.costGrowth * Math.max(0, countBuildings(type) + offset);
  const cost = {};
  for (const [id, n] of Object.entries(base)) cost[id] = Math.round(n * factor);
  return cost;
}

// Warum kann hier (Ecke x, y) nicht gebaut werden? null = alles in Ordnung
function placeProblem(x, y, type) {
  const def = BUILDINGS[type];
  const [w, h] = placementSize(type);
  if (!canPlaceAt(type, x, y)) {
    let onTerrain = false;
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
      if (x + dx >= 0 && y + dy >= 0 && x + dx < N && y + dy < N && terrainBlocked(x + dx, y + dy)) onTerrain = true;
    }
    if (def.onTerrain) return `${def.icon} ${def.name} geht nur auf Wasser`;
    if (def.nearTerrain && canPlaceSize(x, y, w, h)) return nearTerrainText(def);
    return onTerrain
      ? '⛰️ Auf Bergen und Seen kann man nicht bauen'
      : `Kein Platz: ${def.name} braucht ${w}×${h} freie Felder auf eigenem Land`;
  }
  if (def.landmark && countBuildings(type) > 0) return `${def.name} gibt es nur einmal`;
  if (buildTimeOf(type) > 0 && constructionCount() >= CONFIG.maxConstructions) {
    return `🏗️ Höchstens ${CONFIG.maxConstructions} Baustellen gleichzeitig – warte, bis eine fertig ist`;
  }
  const cost = costOf(type);
  if (!canAfford(cost)) return `Nicht genug ${missingText(cost)}`;
  return null;
}

// Wird hier ein Tor daraus? Straße über Mauer, Mauer über Straße oder Tor auf eins von beiden
function makesGate(x, y, type) {
  const cell = getCell(x, y);
  if (!cell || cell.build || !isUnlocked('gate')) return false;
  if (type === 'road') return cell.type === 'wall';
  if (type === 'wall') return cell.type === 'road';
  return type === 'gate' && (cell.type === 'road' || cell.type === 'wall');
}

function buildGate(x, y) {
  const cost = costOf('gate');
  if (!canAfford(cost)) {
    sound.play('error');
    showToast(`🚪 Für ein Tor fehlt ${missingText(cost)}`);
    return false;
  }
  addResources(cost, -1);
  const cell = getCell(x, y);
  const share = cell.hp !== undefined ? cell.hp / wallMaxHp(cell) : 1;   // beschädigte Mauer: Tor ist genauso beschädigt
  cell.type = 'gate';
  delete cell.hp;
  if (share < 1) {
    cell.hp = share * CONFIG.gateHp;
    damagedWalls.add(anchorAt(x, y));
  }
  cell.builtAt = performance.now();
  showToast('🚪 Tor in die Mauer eingebaut', 1800);
  emit('build', { x, y, type: 'gate' });
  recalcStats();
  updateUI();
  return true;
}

// Gibt zurück, ob gebaut wurde
function placeBuilding(x, y, type) {
  if (makesGate(x, y, type)) return buildGate(x, y);
  // Straße übers Wasser wird zur Brücke
  if (type === 'road' && x >= 0 && y >= 0 && x < N && y < N && terrainAt(x, y) === TERRAIN_ID.water && isUnlocked('bridge')) type = 'bridge';
  const def = BUILDINGS[type];
  if (getCell(x, y) !== null) return false;
  if (!isOwned(x, y)) return false;
  const [w, h] = placementSize(type);
  const problem = placeProblem(x, y, type);
  if (problem) {
    sound.play('error');
    showToast(problem, problem.startsWith('🏗️') ? 3000 : undefined);
    return false;
  }
  const seconds = buildTimeOf(type);
  const cost = costOf(type);
  addResources(cost, -1);
  const cell = { type, timer: 0, builtAt: performance.now() };
  if (w > 1 || h > 1) { cell.w = w; cell.h = h; }
  if (seconds > 0) cell.build = { left: seconds, total: seconds };
  state.grid[y * N + x] = cell;
  setOccupied(x, y, w, h, y * N + x);
  clearTerrain(x, y, w, h);
  emit('build', { x, y, type });
  recalcStats();
  if (cell.build) {
    if (def.needsRoad && !hasRoadAccess(x, y)) showToast('⚠️ Braucht eine Straße direkt daneben', 2500);
    else showToast(`🏗️ Baustelle: ${def.name} ist in ${secondsText(seconds)} fertig`, 2000);
  } else if (def.needsRoad && !hasRoadAccess(x, y)) showToast('⚠️ Braucht eine Straße direkt daneben');
  else if (def.jobs && staffOfCell(y * N + x) < 1) {
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
  if (cell.build?.paid) return { ...cell.build.paid };   // Weiterentwickeln abbrechen
  const refund = {};
  const rate = cell.build ? 1 : CONFIG.refundRate;   // Baustelle abbrechen: alles zurück
  const add = cost => {
    for (const [id, n] of Object.entries(cost)) refund[id] = (refund[id] || 0) + Math.floor(n * rate);
  };
  add(costOf(cell.type, offset));
  for (let lvl = 2; lvl <= levelOf(cell); lvl++) add(upgradeCost(cell.type, lvl));
  return refund;
}

function demolish(x, y) {
  const a = anchorAt(x, y);
  if (a === undefined || a < 0) return;
  const cell = state.grid[a];
  if (cell.type === 'gate') {   // Tor entfernen: die Straße bleibt liegen
    addResources(refundOf(cell), 1);
    cell.type = 'road';
    delete cell.hp;
    closeInfo();
    recalcStats();
    updateUI();
    return;
  }
  if (cell.build?.from) {   // Weiterentwickeln abbrechen
    cancelDevelop(a);
    closeInfo();
    recalcStats();
    updateUI();
    return;
  }
  addResources(refundOf(cell), 1);
  removeBuildingAt(a);
  emit('demolish', { x: a % N, y: Math.floor(a / N), type: cell.type, w: cell.w || 1, h: cell.h || 1 });
  closeInfo();
  recalcStats();
  updateUI();
}

// ---------- Baustellen ----------

// Bauzeit in Sekunden (0 = sofort fertig, z. B. Straßen)
function buildTimeOf(type) {
  const def = BUILDINGS[type];
  if (def.isRoad || def.isWall) return 0;
  if (def.buildTime !== undefined) return def.buildTime;
  let value = 0;
  for (const [id, n] of Object.entries(def.cost)) value += n * (BUILD_VALUE[id] ?? 2);
  return Math.max(0, Math.round(CONFIG.buildTimeBase + CONFIG.buildTimePerValue * Math.sqrt(value)));
}

// Kurze Zeitangabe für Bauzeiten: „12 s“ bzw. „1:40 Min.“
function secondsText(sec) {
  sec = Math.max(0, Math.ceil(sec));
  return sec < 90 ? `${sec} s` : `${formatClock(sec)} Min.`;
}

function constructionCount() {
  let n = 0;
  for (const cell of state.grid) if (cell && cell.build) n++;
  return n;
}

function updateConstruction(dt) {
  let finished = false;
  state.grid.forEach((cell, i) => {
    if (!cell || !cell.build) return;
    cell.build.left -= dt;
    if (cell.build.left > 0) return;
    delete cell.build;
    cell.builtAt = performance.now();   // Plopp-Animation
    finished = true;
    const x = i % N, y = Math.floor(i / N);
    sound.play('build');
    showToast(`✅ ${BUILDINGS[cell.type].icon} ${BUILDINGS[cell.type].name} ist fertig gebaut`, 2000);
    emit('built', { x, y, type: cell.type });
  });
  if (finished) recalcStats();
}

// Arbeitsleistung durch Zufriedenheit: 50 → 100 %, 80 → 130 %, 30 → 80 % (Grenzen 70–130 %)
function productivity() {
  return clamp(1 + (stats.happiness - 50) / 100, 0.7, 1.3);
}

// Ertrag eines Gebäudes pro Intervall (mit Nachkommastellen). Forschung, Zufriedenheit und
// Ereignisse (z. B. Dürre) wirken als Faktor – später auch Jahreszeiten.
function buildingOutput(type, staff = staffOf(type)) {
  const def = BUILDINGS[type];
  const factor = (1 + productionBonus(type)) * productivity() * legacyFactor() * staff * (season().production?.[type] ?? 1) * toolFactor(type);
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

function toolFactor(type) {
  return state.resources.tools > 0 && BUILDINGS[type].jobs?.worker ? 1 + TOOLS.bonus : 1;
}

// ---------- Steuern ----------

let taxTimer = 0;
let taxCarry = 0;   // Bruchteile sammeln sich bis zur nächsten Einnahme

function updateTaxes(dt) {
  if ((RESOURCES.money.fromAge || 0) > state.age) return;   // Steinzeit: noch kein Geld
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
      const lf = levelFactor(cell) * (1 + terrainBonusOf(cell.type, i % N, Math.floor(i / N), ...sizeOf(cell)));
      const staff = staffOfCell(i);
      const raw = buildingOutput(cell.type, staff);
      for (const id in raw) raw[id] *= lf;
      // Verarbeitung: ohne Rohstoff, ohne Personal oder bei vollem Lager pausieren (Zeit läuft nicht weiter).
      // Verbraucht wird nur so viel, wie die Belegschaft verarbeitet (halbe Besetzung = halber Verbrauch).
      if (def.consumes) {
        const need = {};
        for (const [id, n] of Object.entries(def.consumes)) need[id] = n * lf * (def.jobs ? staff : 1);
        const full = Object.keys(raw).every(id => state.resources[id] >= storageCap(id));
        if (full || (def.jobs && staff <= 0) || !canAfford(need)) {
          cell.waiting = full ? 'full' : def.jobs && staff <= 0 ? 'staff' : 'input';
          cell.timer = def.interval;
          break;
        }
        cell.waiting = null;
        for (const [id, n] of Object.entries(need)) state.resources[id] = Math.max(0, state.resources[id] - n);
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

// Stellen eines Gebäudes (mit Ausbaustufe)
function jobSlots(cell) {
  const jobs = BUILDINGS[cell.type].jobs;
  return jobs ? Math.round(Object.values(jobs)[0] * levelFactor(cell)) : 0;
}

// Besetzungsgrad genau dieses Gebäudes (1 = voll besetzt oder braucht kein Personal)
function staffOfCell(i) {
  const cell = state.grid[i];
  if (!cell || !BUILDINGS[cell.type].jobs) return 1;
  const slots = jobSlots(cell);
  return slots ? (stats.cellStaff.get(i) || 0) / slots : 1;
}

function jobOf(type) {
  const jobs = BUILDINGS[type].jobs;
  return jobs ? Object.keys(jobs)[0] : null;
}

// Verteilt die Einwohner auf die Stellen der arbeitenden Gebäude
const FOOD_FIRST = ['farm', 'gatherer', 'hunter'];   // bekommen zuerst Arbeiter, soweit für die Nahrung nötig

function computeJobs(activeCells) {
  const demand = {};
  const typeDemand = {};
  for (const job in JOBS) demand[job] = 0;
  for (const [, cell] of activeCells) {
    const job = jobOf(cell.type);
    if (!job) continue;
    const jobs = jobSlots(cell);
    demand[job] += jobs;
    typeDemand[cell.type] = (typeDemand[cell.type] || 0) + jobs;
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
  // (in der Steinzeit gilt das für Sammlerinnen und Jäger)
  let farmDemand = 0, foodRate = 0;
  for (const type of FOOD_FIRST) {
    const def = BUILDINGS[type], slots = typeDemand[type] || 0;
    farmDemand += slots;
    foodRate += slots * def.produces.food / def.interval * (1 + productionBonus(type)) / def.jobs.worker;
  }
  const foodPerWorker = farmDemand ? foodRate / farmDemand * productivity() : 1;
  const foodWorkers = Math.ceil(pop * CONFIG.foodPerCitizen * 1.1 / foodPerWorker);
  const farmFirst = Math.min(farmDemand, foodWorkers, assigned.worker);
  // Jedem Gebäude Leute zuteilen: der Reihe nach voll besetzen (Farmen bis zum Nahrungsbedarf zuerst).
  // So sieht man genau, welches Gebäude Personal hat und welches nicht.
  const cellStaff = new Map();
  const typeStaffed = {};
  const fill = (list, pool) => {
    for (const [i, cell] of list) {
      if (pool <= 0) break;
      const free = jobSlots(cell) - (cellStaff.get(i) || 0);
      const n = Math.min(free, pool);
      if (n <= 0) continue;
      cellStaff.set(i, (cellStaff.get(i) || 0) + n);
      typeStaffed[cell.type] = (typeStaffed[cell.type] || 0) + n;
      pool -= n;
    }
    return pool;
  };
  for (const job in JOBS) {
    const list = activeCells.filter(([, cell]) => jobOf(cell.type) === job);
    let pool = assigned[job];
    if (job === 'worker') {
      const farms = list.filter(([, cell]) => FOOD_FIRST.includes(cell.type));
      pool -= farmFirst - fill(farms, farmFirst);
      pool = fill(list.filter(([, cell]) => !FOOD_FIRST.includes(cell.type)), pool);
      fill(farms, pool);
    } else {
      fill(list, pool);
    }
  }
  const staff = {};
  for (const type in typeDemand) staff[type] = (typeStaffed[type] || 0) / typeDemand[type];
  stats.cellStaff = cellStaff;
  stats.staff = staff;
  stats.jobs = { demand, assigned, scholarCap, ratio };
  stats.unemployed = pop - Object.values(assigned).reduce((a, b) => a + b, 0);
}

// Jedes Gebäude bekommt genau einen Eingang: das Straßenfeld, das der Mitte einer Seite am nächsten liegt
function computeEntrances() {
  const entrances = new Map();
  state.grid.forEach((cell, i) => {
    if (!cell || BUILDINGS[cell.type].isRoad || BUILDINGS[cell.type].isWall) return;
    const x = i % N, y = Math.floor(i / N);
    const [w, h] = sizeOf(cell);
    const cx = x + w / 2, cy = y + h / 2;
    let best = null, bestDist = Infinity;
    for (const [px, py] of perimeterTiles(x, y, w, h)) {
      const road = getCell(px, py);
      if (!road || !BUILDINGS[road.type].isRoad) continue;
      const dist = Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
      if (dist < bestDist - 1e-6) { bestDist = dist; best = [px, py]; }
    }
    if (!best) return;
    const [px, py] = best;
    const dir = py < y ? 4 : py >= y + h ? 1 : px < x ? 2 : 8;   // vom Straßenfeld zum Gebäude
    const k = py * N + px;
    entrances.set(k, (entrances.get(k) || 0) | dir);
  });
  stats.entrances = entrances;
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
    if (def.service) providers.push({ i, x, y, w: cell.w || 1, h: cell.h || 1, type: cell.type, need: def.service.need, radius: def.service.radius + levelOf(cell) - 1 });
    if (def.population) houses.push({ i, x, y, cap: houseCapacity(x, y) });
    if (def.storage) storage += def.storage * levelOf(cell);
    if (def.landmark) landmarks += def.landmark;
    activeCount[cell.type] = (activeCount[cell.type] || 0) + 1;
    activeTypes.push([i, cell]);
    activeWeight[cell.type] = (activeWeight[cell.type] || 0) + levelFactor(cell);
  });
  stats.activeCount = activeCount;
  stats.activeWeight = activeWeight;
  computeJobs(activeTypes);
  stats.storage = storage;
  stats.niceHouses = houses.filter(h => isNiceHouse(h.x, h.y)).length;
  computeEntrances();

  // Versorgung: Ein Haus ist versorgt, wenn ein Anbieter es im (quadratischen) Umkreis erreicht
  // Während ein Wohnhaus weiterentwickelt wird, wohnen die Leute weiter im alten Teil
  stats.capacity = 0;
  for (const cell of state.grid) {
    const from = cell?.build?.from;
    if (from && capacityOf(from.type)) stats.capacity += capacityOf(from.type) + 2 * ((from.level || 1) - 1);
  }
  stats.houseNeeds = new Map();
  const covered = {};
  for (const need in NEEDS) covered[need] = 0;
  for (const h of houses) {
    stats.capacity += h.cap;
    // Versorgungsgrad = bester Anbieter in Reichweite, gewichtet mit dessen Besetzung
    const levels = new Map();
    for (const p of providers) {
      if (rectGap(p.x, p.y, p.w, p.h, h.x, h.y, 1, 1) <= p.radius) levels.set(p.need, Math.max(levels.get(p.need) || 0, staffOfCell(p.i)));
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
  for (const [id, lux] of Object.entries(LUXURIES)) {
    if (state.resources[id] > 0 && state.population > 0) factors.push([lux.label, lux.happiness]);
  }
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
const luxuryDebt = {};
let toolDebt = 0;

function updatePopulation(dt) {
  // Nahrung wird laufend verbraucht
  foodDebt += state.population * CONFIG.foodPerCitizen * dt;
  if (foodDebt >= 1) {
    const eaten = Math.floor(foodDebt);
    foodDebt -= eaten;
    state.resources.food = Math.max(0, state.resources.food - eaten);
  }
  // Genussgüter sind ein Extra: werden nur verbraucht, solange welche da sind
  for (const [id, lux] of Object.entries(LUXURIES)) {
    if (state.resources[id] <= 0) continue;
    luxuryDebt[id] = (luxuryDebt[id] || 0) + state.population * lux.perCitizen * dt;
    if (luxuryDebt[id] >= 1) {
      const used = Math.floor(luxuryDebt[id]);
      luxuryDebt[id] -= used;
      state.resources[id] = Math.max(0, state.resources[id] - used);
    }
  }
  // Werkzeug nutzt sich bei der Arbeit ab
  if (state.resources.tools > 0) {
    toolDebt += (stats.jobs.assigned.worker || 0) * TOOLS.perWorker * dt;
    if (toolDebt >= 1) {
      const used = Math.floor(toolDebt);
      toolDebt -= used;
      state.resources.tools = Math.max(0, state.resources.tools - used);
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
    .filter(def => def.unlockLevel === level && isUnlocked(def.id))
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

// Nur fertige Gebäude (ohne Baustellen) – für Aufträge und Erfolge
function countFinished(type) {
  return state.grid.filter(cell => cell && cell.type === type && !cell.build).length;
}

function questProgress(quest) {
  const g = quest.goal;
  let current = 0;
  switch (g.type) {
    case 'build':      current = countFinished(g.building) + (g.building === 'road' ? countFinished('gate') : 0); break;
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
    case 'age':        current = state.age; break;
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
    case 'age':        return `Steige auf in die Zeit: ${AGES[goal.count].icon} ${AGES[goal.count].name}`;
  }
  return '';
}

function activeQuests() {
  return QUESTS.filter(q => !state.questsClaimed.includes(q.id) && (q.age || 0) <= state.age).slice(0, CONFIG.activeQuests);
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
  let pool = Object.keys(EVENTS).filter(id => state.population >= (EVENTS[id].minPop || 0) && state.age >= (EVENTS[id].minAge || 0) &&
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
    return r && staffOfCell(i) > 0 && isActive(i % N, Math.floor(i / N)) &&
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
    ? `${def.icon} ${def.name} brennt! Die Löschhelfer sind schon unterwegs.`
    : `${def.icon} ${def.name} brennt, und kein ${state.age === 0 ? 'Wassertrog' : 'Feuerwache'} ist in der Nähe! ` +
      `Tippe das Gebäude an und lösche es für ${formatAmounts(extinguishCost())} – ` +
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

function extinguishCost() {
  return state.age === 0 ? CONFIG.extinguishCostStoneAge : CONFIG.extinguishCost;
}

function extinguish(x, y) {
  const cell = getCell(x, y);
  if (!cell || !cell.fire) return;
  if (!canAfford(extinguishCost())) {
    sound.play('error');
    showToast(`Nicht genug ${missingText(extinguishCost())} zum Löschen`);
    return;
  }
  addResources(extinguishCost(), -1);
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
  return Math.min((countBuildings('wall') + countBuildings('gate')) * CONFIG.wallDefense, CONFIG.wallDefenseMax);
}

// Stärke eines Wachpostens (Wachhaus, Wachturm): Grundwert × Stufe × Besetzung
function postStrength(cell, i) {
  const def = BUILDINGS[cell.type];
  return def.defense ? def.defense.strength * levelFactor(cell) * staffOfCell(i) : 0;
}

function postRadius(cell) {
  return BUILDINGS[cell.type].defense.radius + levelOf(cell) - 1;
}

// Schutz vor Ort: alle Wachposten, deren Umkreis das Rechteck erreicht; Bürgerwehr +50 %
// (Mauern schützen nicht mehr pauschal, sondern halten die Banditen auf – siehe updateRaids)
function defenseAt(x, y, w = 1, h = 1) {
  let d = 0;
  state.grid.forEach((cell, i) => {
    if (!cell || !BUILDINGS[cell.type].defense || !isActive(i % N, Math.floor(i / N))) return;
    if (rectGap(i % N, Math.floor(i / N), cell.w || 1, cell.h || 1, x, y, w, h) <= postRadius(cell)) d += postStrength(cell, i);
  });
  return Math.round(d * (hasFlag('militia') ? 1.5 : 1));
}

// Alle Wachen der Stadt zusammen (zum Ausheben von Lagern)
function cityDefense() {
  let d = wallBonus();
  state.grid.forEach((cell, i) => {
    if (cell && BUILDINGS[cell.type].defense && isActive(i % N, Math.floor(i / N))) d += postStrength(cell, i);
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
  let cx = 0, cy = 0;
  for (let tries = 0; tries < 30; tries++) {
    cx = (p % P) * S + 2 + Math.floor(Math.random() * (S - 4));
    cy = Math.floor(p / P) * S + 2 + Math.floor(Math.random() * (S - 4));
    if (!terrainBlocked(cx, cy)) break;
  }
  if (terrainBlocked(cx, cy)) return false;
  const camp = {
    x: cx,
    y: cy,
    strength: Math.max(3, Math.round(campMaxStrength() * 0.4)),
    raidIn: randomBetween(...CONFIG.campRaidSeconds),
  };
  state.camps.push(camp);
  showToast('⛺ Banditen haben in der Nähe ein Lager aufgeschlagen!', 4000);
  sound.play('event');
  return true;
}

function updateCamps(dt) {
  if (state.population >= CONFIG.campMinPop && state.age >= EVENTS.bandits.minAge) {
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

// ---------- Sichtbare Überfälle ----------
// Eine Bande läuft vom Lager zu einem Ziel, Wachen aus der Nähe laufen ihr entgegen.
// Am Ziel entscheidet der Schutz vor Ort. Überfälle werden nicht gespeichert.

let raids = [];
const RAID_VALUE = { market: 3, warehouse: 3, sawmill: 2, brickworks: 2, bakery: 2, townhall: 3, cathedral: 3 };

// Wertvoll und schlecht geschützt zuerst, nahe Ziele bevorzugt
function chooseRaidTarget(camp) {
  let best = -1, bestScore = -Infinity;
  state.grid.forEach((cell, i) => {
    const def = cell && BUILDINGS[cell.type];
    if (!def || def.isRoad || def.isWall || cell.fire) return;
    const x = i % N, y = Math.floor(i / N);
    const [w, h] = sizeOf(cell);
    const dist = Math.hypot(x + w / 2 - camp.x, y + h / 2 - camp.y);
    const score = (RAID_VALUE[cell.type] || 1) / (1 + defenseAt(x, y, w, h) / 10) / (1 + dist / 25) + Math.random() * 0.3;
    if (score > bestScore) { bestScore = score; best = i; }
  });
  return best;
}

function startRaid(camp) {
  const target = chooseRaidTarget(camp);
  if (target < 0) return false;
  const cell = state.grid[target];
  const [w, h] = sizeOf(cell);
  const tx = target % N + w / 2, ty = Math.floor(target / N) + h / 2;
  const strength = Math.round(camp.strength * randomBetween(0.85, 1.15));
  const raid = {
    camp, target, cell, tx, ty, strength, startStrength: strength, siege: -1,
    x: camp.x + 0.5, y: camp.y + 0.5, speed: 1.4,
    units: Array.from({ length: Math.min(8, 3 + Math.floor(strength / 8)) }, () => [randomBetween(-0.6, 0.6), randomBetween(-0.6, 0.6)]),
    defenders: [],
  };
  // Wachen von allen Posten, deren Umkreis das Ziel erreicht
  state.grid.forEach((post, i) => {
    if (!post || !BUILDINGS[post.type].defense || !isActive(i % N, Math.floor(i / N))) return;
    const [pw, ph] = sizeOf(post);
    if (rectGap(i % N, Math.floor(i / N), pw, ph, target % N, Math.floor(target / N), w, h) > postRadius(post)) return;
    for (let n = 0; n < Math.max(1, Math.round(postStrength(post, i) / 10)); n++) {
      raid.defenders.push({ x: i % N + pw / 2 + randomBetween(-0.3, 0.3), y: Math.floor(i / N) + ph / 2 + randomBetween(-0.3, 0.3) });
    }
  });
  raids.push(raid);
  showToast(`🏴‍☠️ Banditen ziehen zum ${BUILDINGS[cell.type].name}!`, 3500);
  sound.play('fire');
  emit('raid', { target });
  return true;
}

function updateRaids(dt) {
  for (const raid of [...raids]) {
    // Ziel inzwischen weg (abgerissen, abgebrannt, durch etwas anderes ersetzt)? Dann ein neues suchen
    if (state.grid[raid.target] !== raid.cell) {
      const next = chooseRaidTarget(raid.camp);
      if (next < 0) { raids.splice(raids.indexOf(raid), 1); continue; }
      const [w, h] = sizeOf(state.grid[next]);
      Object.assign(raid, { target: next, cell: state.grid[next], tx: next % N + w / 2, ty: Math.floor(next / N) + h / 2, siege: -1 });
    }
    const dx = raid.tx - raid.x, dy = raid.ty - raid.y;
    const dist = Math.hypot(dx, dy);
    const step = raid.speed * dt;
    // Wachen laufen zur Mauer, an der gekämpft wird, sonst zum Ziel
    const gx = raid.siege >= 0 ? raid.siege % N + 0.5 : raid.tx, gy = raid.siege >= 0 ? Math.floor(raid.siege / N) + 0.5 : raid.ty;
    for (const d of raid.defenders) {
      const ddx = gx - d.x, ddy = gy - d.y, dd = Math.hypot(ddx, ddy);
      if (dd > 0.4) { d.x += ddx / dd * Math.min(dd, 2.2 * dt); d.y += ddy / dd * Math.min(dd, 2.2 * dt); }
    }
    if (raid.siege >= 0) {
      const result = updateSiege(raid, dt);
      if (result === 'repelled') raids.splice(raids.indexOf(raid), 1);
      if (result) continue;
    }
    if (dist > 0.6) {
      // In Teilschritten von höchstens einem halben Feld – sonst könnte ein großer Zeitschritt über die Mauer springen
      let left = Math.min(dist, step);
      while (left > 1e-9) {
        const part = Math.min(left, 0.5);
        const nx = raid.x + dx / dist * part, ny = raid.y + dy / dist * part;
        // Steht eine Mauer im Weg, wird sie zuerst angegriffen
        const wall = wallBetween(Math.floor(raid.x), Math.floor(raid.y), Math.floor(nx), Math.floor(ny));
        if (wall >= 0 && wall !== raid.target) {
          raid.siege = wall;
          showToast(`🏰 Banditen greifen die ${BUILDINGS[state.grid[wall].type].name} an!`, 3000);
          sound.play('event');
          break;
        }
        raid.x = nx;
        raid.y = ny;
        left -= part;
      }
      continue;
    }
    resolveRaid(raid);
    raids.splice(raids.indexOf(raid), 1);
  }
}

// Mauerstück oder Tor, das den Schritt von Feld a nach Feld b versperrt – auch schräg zwischen zwei Mauerstücken hindurch
function wallBetween(ax, ay, bx, by) {
  const wallAt = (x, y) => {
    const i = anchorAt(x, y);
    return i >= 0 && BUILDINGS[state.grid[i].type].isWall && !state.grid[i].build ? i : -1;
  };
  if (ax === bx && ay === by) return -1;
  const direct = wallAt(bx, by);
  if (direct >= 0) return direct;
  if (ax !== bx && ay !== by) {
    const p = wallAt(bx, ay), q = wallAt(ax, by);
    if (p >= 0 && q >= 0) return p;
  }
  return -1;
}

function wallMaxHp(cell) {
  return BUILDINGS[cell.type].isGate ? CONFIG.gateHp : CONFIG.wallHp;
}

function wallHp(cell) {
  return cell.hp ?? wallMaxHp(cell);
}

// Banditen schlagen auf die Mauer ein, Wachen in der Nähe wehren sie ab.
// Gibt 'repelled' (abgewehrt), true (Kampf geht weiter) oder false (Mauer weg, weiterlaufen) zurück.
function updateSiege(raid, dt) {
  const i = raid.siege;
  const wall = state.grid[i];
  if (!wall || !BUILDINGS[wall.type].isWall) {
    raid.siege = -1;
    return false;
  }
  const x = i % N, y = Math.floor(i / N);
  wall.hp = wallHp(wall) - raid.strength * CONFIG.siegeDamage * dt;
  damagedWalls.add(i);
  raid.strength -= defenseAt(x, y) * CONFIG.siegeLosses * dt;
  if (Math.random() < dt * 4) puff(x, y, '150, 140, 125', 2, T * 0.07);
  if (raid.strength <= 0.5) {
    repelRaid(raid, BUILDINGS[wall.type].name);
    return 'repelled';
  }
  if (wall.hp > 0) return true;
  const name = BUILDINGS[wall.type].name;
  if (wall.type === 'gate') {   // aufgebrochenes Tor: die Straße bleibt
    wall.type = 'road';
    delete wall.hp;
  } else removeBuildingAt(i);
  raid.siege = -1;
  puff(x, y, '120, 110, 100', 10, T * 0.12);
  sound.play('burned');
  showToast(`💥 Banditen haben die ${name} durchbrochen!`, 3500);
  emit('demolish', { x, y, type: 'wall', w: 1, h: 1 });
  recalcStats();
  return false;
}

// Beschädigte Mauern werden nach und nach ausgebessert (nicht während eines Angriffs)
const damagedWalls = new Set();   // Feldindizes – damit nicht jeder Schritt die ganze Karte durchsucht

function repairWalls(dt) {
  if (!damagedWalls.size) return;
  const sieged = new Set(raids.map(r => r.siege));
  for (const i of damagedWalls) {
    const cell = state.grid[i];
    if (!cell || cell.hp === undefined) { damagedWalls.delete(i); continue; }
    if (sieged.has(i)) continue;
    cell.hp += CONFIG.wallRepair * dt;
    if (cell.hp >= wallMaxHp(cell)) { delete cell.hp; damagedWalls.delete(i); }
  }
}

// Bande vertrieben: Kopfgeld, das Lager ist geschwächt
function repelRaid(raid, where) {
  const bounty = Math.round(20 + raid.startStrength * 1.5);
  addResources({ money: bounty });
  state.counters.repelled = (state.counters.repelled || 0) + 1;
  if (state.camps.includes(raid.camp)) raid.camp.strength = Math.max(1, raid.camp.strength * 0.6);
  puff(Math.floor(raid.x), Math.floor(raid.y), '200, 200, 200', 8, T * 0.1);
  sound.play('coins');
  showToast(`🛡️ Banditen an der ${where} vertrieben – Kopfgeld ${formatAmounts({ money: bounty })}`, 4000);
}

function resolveRaid(raid) {
  const i = raid.target;
  const cell = state.grid[i];
  const name = BUILDINGS[cell.type].name;
  const [w, h] = sizeOf(cell);
  const defense = defenseAt(i % N, Math.floor(i / N), w, h);
  const camp = raid.camp;
  if (defense >= raid.strength) {
    repelRaid(raid, `${name} (${defense} gegen ${Math.round(raid.strength)})`);
    return;
  }
  // Plünderung: je stärker die Abwehr, desto kleiner der Schaden – und das Gebäude fängt Feuer
  const damage = 1 - defense / raid.strength;
  const stolen = { money: Math.floor(state.resources.money * 0.15 * damage) };
  const goods = Object.keys(RESOURCES).filter(id => RESOURCES[id].stored && state.resources[id] > 0);
  for (let n = 0; n < 2 && goods.length; n++) {
    const id = goods.splice(Math.floor(Math.random() * goods.length), 1)[0];
    stolen[id] = Math.floor(state.resources[id] * 0.2 * damage);
  }
  for (const id in stolen) if (!stolen[id]) delete stolen[id];
  addResources(stolen, -1);
  if (!cell.fire && !BUILDINGS[cell.type].isRoad && !BUILDINGS[cell.type].isWall) igniteCell(i);
  addEffect('bandits', 60, { production: { money: 0.5 }, tradeBlocked: true });
  if (state.camps.includes(camp)) camp.strength = Math.min(campMaxStrength(), camp.strength + 2);   // Erfolg macht die Bande stärker
  sound.play('burned');
  showToast(`🏴‍☠️ Banditen plündern ${name} (${Math.round(raid.strength)} gegen deine ${defense})! ` +
    (Object.keys(stolen).length ? `Geraubt: ${formatAmounts(stolen)}. ` : '') + 'Handel 60 s gesperrt.', 5000);
}

function drawRaids() {
  if (!raids.length) return;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const t = performance.now() / 1000;
  for (const raid of raids) {
    // Wachen
    for (const d of raid.defenders) {
      ctx.fillStyle = '#1c7ed6';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2 / view.zoom;
      ctx.beginPath();
      ctx.arc(d.x * T, d.y * T, T * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Banditen: kleine Gruppe, wackelt beim Laufen
    raid.units.forEach(([ox, oy], n) => {
      const bob = Math.sin(t * 10 + n) * 0.05;
      ctx.fillStyle = '#3d0c0c';
      ctx.strokeStyle = '#e63946';
      ctx.lineWidth = 2 / view.zoom;
      ctx.beginPath();
      ctx.arc((raid.x + ox) * T, (raid.y + oy + bob) * T, T * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.font = `${T * 0.6}px ${EMOJI_FONT}`;
    ctx.fillText('🏴‍☠️', raid.x * T, (raid.y - 0.9) * T);
    // Ziel markieren
    ctx.strokeStyle = `rgba(230, 57, 70, ${0.5 + 0.4 * Math.sin(t * 6)})`;
    ctx.lineWidth = 3 / view.zoom;
    const cell = state.grid[raid.target];
    if (cell) outlineRect(raid.target % N, Math.floor(raid.target / N), ...sizeOf(cell), ctx.strokeStyle);
  }
}

function raidPillHtml() {
  if (!raids.length) return '';
  const r = raids.reduce((a, b) => (Math.hypot(b.tx - b.x, b.ty - b.y) < Math.hypot(a.tx - a.x, a.ty - a.y) ? b : a));
  const eta = Math.ceil(Math.hypot(r.tx - r.x, r.ty - r.y) / r.speed);
  const cell = state.grid[r.target];
  const wall = r.siege >= 0 && state.grid[r.siege];
  if (wall) {
    return `<div class="effect clickable" data-action="raid">🏰 Banditen an der ${BUILDINGS[wall.type].name} · 🧱 ${Math.round(100 * wallHp(wall) / wallMaxHp(wall))} % ›</div>`;
  }
  return `<div class="effect clickable" data-action="raid">🏴‍☠️ Banditen → ${cell ? BUILDINGS[cell.type].name : '…'} · ${eta} s ›</div>`;
}

// ---------- Handelskarren ----------
// Märkte schicken Karren über die Straßen zum nächsten „Stadttor“ (Straße am Rand des eigenen
// Landes bzw. der Karte). Dort gibt es Geld. Banditenlager können Karren unterwegs überfallen.

let carts = [];

function cartValue(market) {
  return Math.round(CONFIG.cartValue * levelFactor(market) * legacyFactor());
}

// Stadttor: Straße, neben der fremdes Land oder der Kartenrand liegt
function isGate(x, y) {
  return [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([nx, ny]) => !isOwned(nx, ny));
}

// Kürzester Weg über Straßen vom Markt zum nächsten Stadttor (Breitensuche), sonst null
function findTradeRoute(i) {
  const cell = state.grid[i];
  const [w, h] = sizeOf(cell);
  const prev = new Map();
  const queue = [];
  for (const [x, y] of perimeterTiles(i % N, Math.floor(i / N), w, h)) {
    const c = getCell(x, y);
    if (c && BUILDINGS[c.type].isRoad && !prev.has(y * N + x)) { prev.set(y * N + x, -1); queue.push(y * N + x); }
  }
  for (let q = 0; q < queue.length; q++) {
    const k = queue[q], x = k % N, y = Math.floor(k / N);
    if (isGate(x, y)) {
      const path = [];
      for (let p = k; p !== -1; p = prev.get(p)) path.unshift([p % N, Math.floor(p / N)]);
      return path;
    }
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const c = getCell(nx, ny), nk = ny * N + nx;
      if (c && BUILDINGS[c.type].isRoad && !prev.has(nk)) { prev.set(nk, k); queue.push(nk); }
    }
  }
  return null;
}

function updateCarts(dt) {
  // Neue Karren von jedem arbeitenden Markt
  state.grid.forEach((cell, i) => {
    if (!cell || cell.type !== 'market' || !isActive(i % N, Math.floor(i / N))) return;
    if (cell.cartIn === undefined) cell.cartIn = randomBetween(5, CONFIG.cartSeconds);
    cell.cartIn -= dt * levelFactor(cell) * staffOfCell(i);
    if (cell.cartIn > 0) return;
    cell.cartIn = CONFIG.cartSeconds;
    if (tradeBlocked()) return;   // Banditen machen die Wege unsicher
    const path = findTradeRoute(i);
    cell.noRoute = !path;
    if (!path) return;
    // Überfallrisiko: stärkstes Lager gegen den Schutz am Stadttor
    let ambushAt = -1;
    if (state.camps.length) {
      const camp = state.camps.reduce((a, b) => (b.strength > a.strength ? b : a));
      const [gx, gy] = path[path.length - 1];
      const risk = clamp((camp.strength - defenseAt(gx, gy)) / (camp.strength + 10), 0, 0.6);
      if (Math.random() < risk) ambushAt = Math.max(0, Math.floor(path.length * 0.75) - 1);
    }
    carts.push({ path, pos: 0, value: cartValue(cell), ambushAt });
  });
  // Bewegen, ankommen, überfallen werden
  for (const cart of [...carts]) {
    cart.pos += CONFIG.cartSpeed * dt;
    if (cart.ambushAt >= 0 && cart.pos >= cart.ambushAt) {
      const [x, y] = cart.path[Math.min(cart.ambushAt, cart.path.length - 1)];
      puff(x, y, '90, 30, 30', 8, T * 0.1);
      const camp = state.camps.reduce((a, b) => (b.strength > a.strength ? b : a), state.camps[0]);
      if (camp) camp.strength = Math.min(campMaxStrength(), camp.strength + 1);
      showToast('🏴‍☠️ Ein Handelskarren wurde überfallen! Wachen am Stadttor schützen die Karren.', 3500);
      carts.splice(carts.indexOf(cart), 1);
      continue;
    }
    if (cart.pos >= cart.path.length - 1) {
      const [x, y] = cart.path[cart.path.length - 1];
      addResources({ money: cart.value });
      state.counters.carts = (state.counters.carts || 0) + 1;
      spawnFloater(x, y, `+${cart.value}💰`);
      carts.splice(carts.indexOf(cart), 1);
    }
  }
}

function drawCarts() {
  if (!carts.length) return;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${T * 0.5}px ${EMOJI_FONT}`;
  for (const cart of carts) {
    const k = Math.min(Math.floor(cart.pos), cart.path.length - 1);
    const [x0, y0] = cart.path[k];
    const [x1, y1] = cart.path[Math.min(k + 1, cart.path.length - 1)];
    const f = cart.pos - k;
    ctx.fillText('🛒', (x0 + (x1 - x0) * f + 0.5) * T, (y0 + (y1 - y0) * f + 0.45) * T);
  }
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
  if (techAge(id) > state.age) return 'later';
  if ((TECHS[id].requires || []).some(r => !state.techs.includes(r))) return 'locked';
  return 'available';
}

function techAge(id) {
  return TECHS[id].age ?? 1;
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
  const unlocked = Object.values(BUILDINGS).filter(b => b.requiresTech === id)
    .map(b => `${b.icon} ${b.name}${isUnlocked(b.id) ? '' : ` (${lockReason(b.id)})`}`);
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

// Belohnung für Tag `streak`. In der Steinzeit gibt es kein Geld – statt Geld gibt es dann je zur Hälfte Holz und Nahrung.
function dailyRewardFor(streak) {
  const reward = { ...DAILY_REWARDS[Math.min(streak, DAILY_REWARDS.length) - 1] };
  if (state.age < RESOURCES.money.fromAge && reward.money) {
    const half = Math.round(reward.money / 2);
    reward.wood = (reward.wood || 0) + half;
    reward.food = (reward.food || 0) + half;
    delete reward.money;
  }
  return reward;
}

function checkDailyReward() {
  const today = dateString(new Date());
  if (state.daily.last === today) return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const streak = state.daily.last === dateString(yesterday) ? state.daily.streak + 1 : 1;
  const reward = dailyRewardFor(streak);
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
  // Baustellen arbeiten weiter
  if (away > 0) {
    state.grid.forEach(cell => {
      if (!cell || !cell.build) return;
      cell.build.left -= away;
      if (cell.build.left <= 0) delete cell.build;
    });
  }
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
    for (const [id, n] of Object.entries(buildingOutput(cell.type, staffOfCell(i)))) rates[id] = (rates[id] || 0) + n * levelFactor(cell) / def.interval;
  });
  if ((RESOURCES.money.fromAge || 0) <= state.age) rates.money = (rates.money || 0) + state.population * TAXES[state.taxLevel].perCitizen / CONFIG.taxInterval;
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
  for (const [id, lux] of Object.entries(LUXURIES)) {
    if (state.resources[id] > 0 || rates[id] > 0) rates[id] = (rates[id] || 0) - state.population * lux.perCitizen;
  }
  if (season().heating) rates.wood = (rates.wood || 0) - heatingRate();

  const before = { ...state.resources };
  for (const [id, rate] of Object.entries(rates)) {
    const amount = Math.floor(rate * secs * CONFIG.offlineEfficiency);
    if (amount > 0) addResources({ [id]: amount });
    else state.resources[id] = Math.max(0, state.resources[id] + amount);
  }

  // Forschung, Ereignisse und Tageszeit laufen weiter
  const ageNotes = offlineAgeUp(secs);
  for (const e of state.effects) e.left -= secs;
  state.effects = state.effects.filter(e => e.left > 0);
  state.dayTime = (state.dayTime + secs / CONFIG.dayLength) % 1;
  state.yearTime = (state.yearTime + secs) % (CONFIG.seasonLength * SEASONS.length);

  const changes = Object.keys(RESOURCES)
    .map(id => [id, state.resources[id] - before[id]])
    .filter(([, d]) => Math.round(d) !== 0)
    .map(([id, d]) => `${d > 0 ? '+' : '−'}${Math.round(Math.abs(d))} ${RESOURCES[id].icon} ${RESOURCES[id].name}`);
  showEventPopup('🌙', 'Willkommen zurück!', [
    `Du warst ${formatDuration(away)} weg.` +
      (away > secs ? ` Gezählt werden höchstens ${CONFIG.offlineMaxHours} Stunden.` : ''),
    'Deine Stadt hat in der Zeit mit verminderter Kraft weitergearbeitet:',
    changes.length ? changes.join('\n') : 'Es wurde nichts produziert.',
    ...ageNotes,
    state.resources.food === 0 && state.population > 0 ? '⚠️ Die Nahrung ist aufgebraucht!' : '',
  ].filter(Boolean).join('\n'));
  recalcStats();
}

// Offline: Forschung fertig → ist dann alles fürs nächste Zeitalter erfüllt, beginnt der Aufbruch
// von selbst und läuft weiter. Fertig wird er im ersten Spieltakt (mit der Zeitalter-Meldung).
function offlineAgeUp(secs) {
  const notes = [];
  let time = secs;
  if (state.research) {
    if (state.research.left > secs) {
      state.research.left -= secs;
      time = 0;
    } else {
      const id = state.research.id, tech = TECHS[id];
      time = secs - state.research.left;
      state.research = null;
      state.techs.push(id);
      notes.push(`🔬 Erforscht: ${tech.icon} ${tech.name}`);
      if (canAdvanceAge()) {
        state.ageUp = { done: 0, waiting: null };
        notes.push(`⏳ Damit war alles bereit – der Aufbruch ins Zeitalter ${nextAge().icon} ${nextAge().name} hat begonnen.`);
      }
    }
  }
  const next = nextAge();
  if (!state.ageUp || !next) return notes;
  // so weit laufen, wie Zeit und Waren reichen
  let step = Math.min(time, next.seconds - state.ageUp.done);
  for (const [id, n] of Object.entries(next.cost)) step = Math.min(step, state.resources[id] / (n / next.seconds));
  step = Math.max(0, step);
  for (const [id, n] of Object.entries(next.cost)) state.resources[id] = Math.max(0, state.resources[id] - n * step / next.seconds);
  state.ageUp.done += step;
  if (state.ageUp.done >= next.seconds - 1e-6) notes.push(`🎉 Der Aufbruch ins Zeitalter ${next.icon} ${next.name} ist geschafft!`);
  else if (step < time) notes.push(`⏸️ Der Aufbruch wartet auf Waren (${Math.round(state.ageUp.done / next.seconds * 100)} %).`);
  return notes;
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
  updateConstruction(dt);
  updateProduction(dt);
  updatePopulation(dt);
  updateEvents(dt);
  updateResearch(dt);
  updateAgeUp(dt);
  updateTaxes(dt);
  updatePrices(dt);
  updateCamps(dt);
  updateRaids(dt);
  repairWalls(dt);
  updateCarts(dt);
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
  return !state.completed && stats.level >= LEVELS.length - 1 && countFinished('cathedral') > 0;
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
    if (cell) buildings.push({ x: i % N, y: Math.floor(i / N), type: cell.type, timer: cell.timer, fire: cell.fire, level: cell.level, w: cell.w, h: cell.h, build: cell.build, hp: cell.hp });
  });
  const data = {
    v: CONFIG.saveVersion,
    savedAt: Date.now(),   // für spätere Offline-Einnahmen
    gridSize: N,
    resources: state.resources,
    population: state.population,
    maxLevel: state.maxLevel,
    age: state.age,
    questsClaimed: state.questsClaimed,
    produced: state.produced,
    effects: state.effects,
    nextEventIn: state.nextEventIn,
    techs: state.techs,
    research: state.research,
    ageUp: state.ageUp,
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
    terrain: encodeTerrain(),
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
      if (Number.isFinite(b.hp) && BUILDINGS[b.type].isWall) {
        cell.hp = clamp(b.hp, 1, wallMaxHp(cell));
        damagedWalls.add(b.y * N + b.x);
      }
      if (b.build && Number.isFinite(b.build.left) && Number.isFinite(b.build.total) && b.build.left > 0) {
        const total = clamp(b.build.total, 1, 3600);
        cell.build = { left: Math.min(b.build.left, total), total };
        // Weiterentwicklung im Bau: altes Gebäude und bezahlte Kosten merken (für Abbrechen)
        const from = b.build.from;
        if (from && BUILDINGS[from.type] && typeof b.build.paid === 'object') {
          cell.build.from = { type: from.type, w: from.w, h: from.h };
          if (Number.isInteger(from.level) && from.level > 1 && from.level <= MAX_BUILDING_LEVEL) cell.build.from.level = from.level;
          cell.build.paid = {};
          for (const [id, n] of Object.entries(b.build.paid)) if (RESOURCES[id] && Number.isFinite(n)) cell.build.paid[id] = n;
        }
      }
      state.grid[b.y * N + b.x] = cell;
    }
  }
  // Land: gespeicherte Parzellen (von einer kleineren Karte in die Mitte verschoben), dazu alles, worauf schon gebaut ist
  const oldP = oldSize / CONFIG.plotSize, shift = offset / CONFIG.plotSize;
  const hadPlots = Array.isArray(data.plots) && oldSize <= N && Number.isInteger(oldP) && Number.isInteger(shift);
  if (hadPlots) {
    for (const p of data.plots) {
      if (!Number.isInteger(p) || p < 0 || p >= oldP * oldP) continue;
      state.plots[(Math.floor(p / oldP) + shift) * P + p % oldP + shift] = true;
    }
    if (Number.isFinite(data.plotsGranted)) state.plotsGranted = data.plotsGranted;
  }
  const ownedBefore = state.plots.filter(Boolean).length;
  state.grid.forEach((cell, i) => {
    if (!cell) return;
    const [w, h] = sizeOf(cell);
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) state.plots[plotOf(i % N + dx, Math.floor(i / N) + dy)] = true;
  });
  state.plotsGranted += state.plots.filter(Boolean).length - ownedBefore;   // geschenkt, nicht gekauft
  loadTerrain(data, oldSize, offset);
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
    if (offset) for (const c of data.camps) if (c) { c.x += offset; c.y += offset; }
    state.camps = data.camps.filter(c => c && Number.isFinite(c.x) && Number.isFinite(c.y) && !isOwned(c.x, c.y) && !terrainBlocked(c.x, c.y)).slice(0, CONFIG.maxCamps);
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
  // Zeitalter; alte Stände (ohne Zeitalter) stehen im Mittelalter, die Steinzeit-Aufträge gelten als erledigt
  const lastAge = AGES.filter(a => a.ready !== false).length - 1;   // höchstes spielbares Zeitalter
  if (Number.isInteger(data.age)) state.age = clamp(data.age, 0, lastAge);
  else {
    state.age = OLD_SAVE_AGE;
    for (const q of QUESTS) if (!q.age && !state.questsClaimed.includes(q.id)) state.questsClaimed.push(q.id);
  }
  evolveBuildings();
  if (typeof data.ageUp?.done === 'number' && nextAge()) state.ageUp = { done: Math.max(0, data.ageUp.done), waiting: null };
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
  drawMeadow(vis);

  drawTerrain(vis);
  // Rasterlinien nur beim Bauen und Verschieben – sonst sieht man die Landschaft ohne Kästchen
  if ((selectedType || moveMode) && view.zoom > 0.25) {
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1 / view.zoom;
    ctx.beginPath();
    for (let i = vis.x0; i <= vis.x1 + 1; i++) { ctx.moveTo(i * T, vis.y0 * T); ctx.lineTo(i * T, (vis.y1 + 1) * T); }
    for (let i = vis.y0; i <= vis.y1 + 1; i++) { ctx.moveTo(vis.x0 * T, i * T); ctx.lineTo((vis.x1 + 1) * T, i * T); }
    ctx.stroke();
  }
  drawLand(vis);
  drawServiceAreas();

  // Straßen zuerst, damit sie unter allem liegen
  forEachVisible(vis, (cell, x, y) => {
    if (BUILDINGS[cell.type].onTerrain) drawBridge(x, y, 1);
    else if (BUILDINGS[cell.type].isGate) drawGate(x, y, 1);
    else if (BUILDINGS[cell.type].isRoad) drawRoad(x, y, BUILDINGS[cell.type], 1);
    else if (BUILDINGS[cell.type].isWall) { drawWall(x, y, 1); drawWallDamage(x, y); }
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
    const moving = moveMode && moveMode.from === y * N + x;
    if (cell.build) {
      drawConstruction(x, y, w, h, cell, moving ? 0.35 : 1);
      if (moving) outlineRect(x, y, w, h, '#ffd166');
      if (cell.fire) drawFire(x, y, cell.fire, w, h);
      return;
    }
    drawBuilding(x, y, BUILDINGS[cell.type], moving ? 0.35 : active || cell.fire ? 1 : 0.55, scale, w, h, cell);
    if (moving) outlineRect(x, y, w, h, '#ffd166');
    const mx = (x + w - 0.2) * T, my = (y + 0.22) * T;      // Ecke oben rechts für Hinweise
    if (cell.fire) {
      drawFire(x, y, cell.fire, w, h);
    } else if (active && BUILDINGS[cell.type].jobs && staffOfCell(y * N + x) < 0.995) {
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
  drawEntrances(vis);

  drawWorkers(vis);

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
  drawCarts();
  drawRaids();
  if (season().heating && settings.daynight) drawSnow(dt, s);

  // Bau-Vorschau unter der Maus
  drawPlotPrices(vis);
  drawCamps(dark);

  if (pending && selectedType) {
    const [w, h] = placementSize(selectedType);
    const ok = !placeProblem(pending.x, pending.y, selectedType);
    const fits = canPlaceAt(selectedType, pending.x, pending.y);
    ctx.fillStyle = ok ? 'rgba(82, 183, 136, 0.35)' : 'rgba(230, 57, 70, 0.35)';
    ctx.fillRect(pending.x * T, pending.y * T, w * T, h * T);
    drawBuilding(pending.x, pending.y, BUILDINGS[selectedType], fits ? 0.75 : 0.4, 1, w, h);
    ctx.lineWidth = 3 / view.zoom;
    outlineRect(pending.x, pending.y, w, h, ok ? '#52b788' : '#e63946');
    const tb = fits && terrainBonusOf(selectedType, pending.x, pending.y, w, h);
    if (tb) drawTag(`+${Math.round(tb * 100)} %`, (pending.x + w / 2) * T, (pending.y - 0.25) * T);
  }
  if (moveMode && hoverTile && state.grid[moveMode.from]) {
    const [w, h] = moveSize();
    if (canPlaceSize(hoverTile.x, hoverTile.y, w, h, moveMode.from)) drawBuilding(hoverTile.x, hoverTile.y, BUILDINGS[state.grid[moveMode.from].type], 0.55, 1, w, h);
    else outlineRect(hoverTile.x, hoverTile.y, w, h, '#c0392b');
  } else if (selectedType && hoverTile && getCell(hoverTile.x, hoverTile.y) === null) {
    const previewType = selectedType === 'road' && terrainAt(hoverTile.x, hoverTile.y) === TERRAIN_ID.water && isUnlocked('bridge') ? 'bridge' : selectedType;
    const def = BUILDINGS[previewType];
    const [w, h] = placementSize(previewType);
    if (!canPlaceAt(previewType, hoverTile.x, hoverTile.y)) {
      outlineRect(hoverTile.x, hoverTile.y, w, h, '#c0392b');
    } else {
      if (def.onTerrain) drawBridge(hoverTile.x, hoverTile.y, 0.5);
      else if (def.isGate) drawGate(hoverTile.x, hoverTile.y, 0.5);
      else if (def.isRoad) drawRoad(hoverTile.x, hoverTile.y, def, 0.5);
      else if (def.isWall) drawWall(hoverTile.x, hoverTile.y, 0.5);
      else drawBuilding(hoverTile.x, hoverTile.y, def, 0.5, 1, w, h);
      if (!canAfford(costOf(previewType))) outlineRect(hoverTile.x, hoverTile.y, w, h, '#c0392b');
      const tb = terrainBonusOf(selectedType, hoverTile.x, hoverTile.y, w, h);
      if (tb) drawTag(`+${Math.round(tb * 100)} %`, (hoverTile.x + w / 2) * T, (hoverTile.y - 0.25) * T);
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

// ---------- Landschaft zeichnen ----------

// Zufallswert 0–1 je Feld, immer gleich (für Blumen, Baumpositionen …)
function tileHash(x, y, k = 0) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(k, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Hellere und dunklere Flecken in der Wiese (feste Landschaft, nicht gespeichert)
const meadowShade = (() => {
  const noise = makeNoise(seededRng(4711), 5);
  const a = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) a[y * N + x] = noise(x, y) - 0.5;
  return a;
})();

const FLOWER_COLORS = { spring: ['#ffafcc', '#fff', '#ffd166'], summer: ['#ffd166', '#e63946', '#fff'], autumn: ['#e09f3e', '#9c6644'] };

function drawMeadow(vis) {
  const sid = season().id;
  const flowers = FLOWER_COLORS[sid];
  if (view.zoom < 0.2) return;   // ganz weit draußen sieht man die Feinheiten nicht – spart Zeit auf der großen Karte
  for (let y = vis.y0; y <= vis.y1; y++) {
    for (let x = vis.x0; x <= vis.x1; x++) {
      const v = meadowShade[y * N + x];
      ctx.fillStyle = v > 0 ? `rgba(255,255,220,${v * 0.14})` : `rgba(0,50,10,${-v * 0.16})`;
      ctx.fillRect(x * T, y * T, T, T);
      if (state.terrain[y * N + x] || occ[y * N + x] !== -1) continue;
      const h = tileHash(x, y);
      if (flowers && h < 0.06) {
        for (let k = 0; k < 3; k++) {
          ctx.fillStyle = flowers[k % flowers.length];
          ctx.beginPath();
          ctx.arc((x + 0.2 + 0.6 * tileHash(x, y, k + 1)) * T, (y + 0.2 + 0.6 * tileHash(x, y, k + 7)) * T, T * 0.05, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (h > 0.975) {
        ctx.fillStyle = 'rgba(110,110,110,0.55)';
        ctx.beginPath();
        ctx.ellipse((x + 0.3 + 0.4 * tileHash(x, y, 3)) * T, (y + 0.6) * T, T * 0.1, T * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

const TREE_COLORS = {
  spring: ['#40916c', '#52b788', '#2d6a4f'],
  summer: ['#2d6a4f', '#1b4332', '#40916c'],
  autumn: ['#d4a017', '#c8553d', '#e09f3e', '#6a994e'],
  winter: ['#2f4f3f', '#36574a'],
};

function drawTerrain(vis) {
  const sid = season().id, winter = sid === 'winter';
  const time = performance.now() / 1000;
  const t = state.terrain;
  const is = (x, y, k) => x >= 0 && y >= 0 && x < N && y < N && t[y * N + x] === k;
  const W = TERRAIN_ID.water, R = TERRAIN_ID.rock, F = TERRAIN_ID.forest;
  const detail = view.zoom >= 0.4;    // weit herausgezoomt: weniger Einzelheiten (schneller am Handy)

  // Seen als weiche Form: Kreis je Feld, mit den Nachbarfeldern verbunden – erst Ufer (Sand), dann Wasser
  const waterShape = (r, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let y = vis.y0; y <= vis.y1; y++) {
      for (let x = vis.x0; x <= vis.x1; x++) {
        if (t[y * N + x] !== W) continue;
        const cx = (x + 0.5) * T, cy = (y + 0.5) * T;
        ctx.moveTo(cx + r * T, cy);
        ctx.arc(cx, cy, r * T, 0, Math.PI * 2);
        if (is(x + 1, y, W)) ctx.rect(cx, cy - r * T, T, 2 * r * T);
        if (is(x, y + 1, W)) ctx.rect(cx - r * T, cy, 2 * r * T, T);
      }
    }
    ctx.fill();
  };
  waterShape(0.68, winter ? '#eef5f8' : '#e9d8a6');
  waterShape(0.56, winter ? '#cfe6ef' : '#4f9bd1');

  for (let y = vis.y0; y <= vis.y1; y++) {
    for (let x = vis.x0; x <= vis.x1; x++) {
      const k = t[y * N + x];
      if (!k) continue;
      const X = x * T, Y = y * T;
      if (k === W) {
        if (winter || !detail) continue;
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = T * 0.04;
        ctx.beginPath();
        for (let n = 0; n < 2; n++) {
          const wx = X + T * (0.25 + 0.3 * tileHash(x, y, n)) + Math.sin(time * 0.8 + n + x) * T * 0.05;
          const wy = Y + T * (0.35 + 0.3 * n);
          ctx.moveTo(wx, wy);
          ctx.quadraticCurveTo(wx + T * 0.1, wy - T * 0.07, wx + T * 0.2, wy);
        }
        ctx.stroke();
      } else if (k === R) {
        ctx.fillStyle = winter ? '#cfd3d6' : '#a39e93';
        ctx.fillRect(X, Y, T, T);
        let around = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && is(x + dx, y + dy, R)) around++;
        const height = 0.35 + 0.05 * around;               // innen höher als am Rand
        const peakX = X + T * (0.35 + 0.3 * tileHash(x, y, 5));
        const peakY = Y + T * (0.95 - height);
        ctx.fillStyle = winter ? '#9aa0a6' : '#7d776d';    // Schattenseite
        ctx.beginPath(); ctx.moveTo(X - T * 0.05, Y + T * 0.95); ctx.lineTo(peakX, peakY); ctx.lineTo(peakX, Y + T * 0.95); ctx.fill();
        ctx.fillStyle = winter ? '#b9bec3' : '#958e82';    // Sonnenseite
        ctx.beginPath(); ctx.moveTo(peakX, peakY); ctx.lineTo(X + T * 1.05, Y + T * 0.95); ctx.lineTo(peakX, Y + T * 0.95); ctx.fill();
        if (winter || around >= 6) {                         // Schneekappe
          const c = 0.3;
          ctx.fillStyle = '#fafafa';
          ctx.beginPath();
          ctx.moveTo(peakX, peakY);
          ctx.lineTo(peakX + (X + T * 1.05 - peakX) * c, peakY + (Y + T * 0.95 - peakY) * c);
          ctx.lineTo(peakX - (peakX - X + T * 0.05) * c, peakY + (Y + T * 0.95 - peakY) * c);
          ctx.fill();
        }
      } else if (k === F) {
        ctx.fillStyle = winter ? 'rgba(40,60,50,0.18)' : 'rgba(20,70,35,0.28)';
        ctx.fillRect(X, Y, T, T);
        const colors = TREE_COLORS[sid];
        const trees = detail ? 3 : 1;
        for (let n = 0; n < trees; n++) {
          const tx = X + T * (trees === 1 ? 0.5 : 0.2 + 0.6 * tileHash(x, y, n * 2 + 1));
          const ty = Y + T * (trees === 1 ? 0.55 : 0.3 + 0.5 * tileHash(x, y, n * 2 + 2));
          const r = T * (0.17 + 0.08 * tileHash(x, y, n + 9));
          ctx.fillStyle = '#6b4f3a';
          ctx.fillRect(tx - T * 0.025, ty, T * 0.05, r * 0.9);
          ctx.fillStyle = colors[Math.floor(tileHash(x, y, n + 13) * colors.length)];
          ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI * 2); ctx.fill();
          if (winter) {
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath(); ctx.arc(tx - r * 0.2, ty - r * 0.35, r * 0.55, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
    }
  }
}

// Kleines Schild über der Bauvorschau (z. B. Geländebonus)
function drawTag(text, x, y) {
  ctx.font = `bold ${T * 0.26}px system-ui, sans-serif`;
  const w = ctx.measureText(text).width + T * 0.2;
  ctx.fillStyle = 'rgba(27, 67, 50, 0.9)';
  ctx.fillRect(x - w / 2, y - T * 0.18, w, T * 0.36);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
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
      drawArea(hoverTile.x, hoverTile.y, selArea.radius, 'rgba(255,209,102,0.3)', ...placementSize(selectedType));
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

// ---------- Gebäudebilder (KI-Bilder aus bilder/) ----------
// Je Gebäude die Zeitalter (1 = Steinzeit), für die es ein Bild bilder/<zeitalter>-<gebäude>.webp gibt.
// Gezeigt wird das Bild des aktuellen Zeitalters oder das letzte davor; fehlt es, wird gezeichnet.
const BUILDING_IMAGES = { hut: [1], gatherer: [1], hunter: [1], woodcutter: [1], stonecutter: [1], fireplace: [1], painter: [1], watertrough: [1], house: [2], farm: [2], sawmill: [2], market: [2], coalmine: [4], steelworks: [4], factory: [4], tenement: [4], station: [4],
  police: [4], clocktower: [4], powerplant: [5] };
const imageCache = {};

function buildingImageSrc(type) {
  const eras = BUILDING_IMAGES[type];
  if (!eras) return null;
  return `bilder/${eras.filter(e => e <= state.age + 1).pop() ?? eras[0]}-${type}.webp`;
}

function buildingImage(type) {
  const src = buildingImageSrc(type);
  if (!src || typeof Image === 'undefined') return null;
  let img = imageCache[src];
  if (!img) {
    img = imageCache[src] = new Image();
    img.src = src;
  }
  return img.complete && img.naturalWidth ? img : null;
}

// Bild in die Fläche setzen: etwas breiter als die Fläche, unten bündig (die Spitze darf nach oben ragen)
// Gedrehte breite Gebäude (1×2) werden gespiegelt und etwas größer gezeichnet, damit sie nicht winzig wirken
function drawBuildingImage(img, x, y, w, h) {
  const wide = img.naturalWidth > img.naturalHeight * 1.4;
  const turned = wide && h > w;
  const dw = (turned ? Math.max(w, h * 0.72) : w) * T * 1.12;
  const dh = dw * img.naturalHeight / img.naturalWidth;
  const left = (x + w / 2) * T - dw / 2;
  const top = turned ? (y + h / 2) * T - dh / 2 + T * 0.2 : (y + h) * T - dh + T * 0.04 * Math.min(w, h);
  if (!turned) {
    ctx.drawImage(img, left, top, dw, dh);
    return;
  }
  ctx.save();
  ctx.translate(left + dw, top);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0, dw, dh);
  ctx.restore();
}

function drawBuilding(x, y, def, alpha, scale = 1, w = 1, h = 1, cell = null) {
  const pad = T * 0.06;
  const cx = (x + w / 2) * T, cy = (y + h / 2) * T;
  ctx.save();
  if (scale !== 1) {
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
  }
  ctx.globalAlpha = alpha;
  const img = buildingImage(def.id);
  if (img) {
    drawBuildingImage(img, x, y, w, h);
    ctx.restore();
    return;
  }
  const sprite = SPRITES[def.id];
  if (sprite) {
    sprite(x * T, y * T, w * T, h * T, x, y, cell);
    ctx.restore();
    return;
  }
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

// Baustelle: Erdfläche, das Gebäude wächst von unten nach oben, davor Gerüst und Fortschrittsbalken
function drawConstruction(x, y, w, h, cell, alpha = 1) {
  const X = x * T, Y = y * T, W = w * T, H = h * T;
  const p = clamp(1 - cell.build.left / cell.build.total, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  sprGround(X, Y, W, H, '#c9a66b');
  ctx.fillStyle = 'rgba(120, 85, 50, 0.35)';
  for (let k = 0; k < w * h * 3; k++) {   // Erdklumpen
    ctx.beginPath();
    ctx.arc(X + T * 0.15 + tileHash(x, y, k) * (W - T * 0.3), Y + T * 0.15 + tileHash(x, y, k + 50) * (H - T * 0.3), T * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Das fertige Gebäude zeigt sich Stück für Stück von unten
  const shown = 0.15 + 0.85 * p;
  ctx.save();
  ctx.beginPath();
  ctx.rect(X - T, Y + H * (1 - shown), W + 2 * T, H * shown + T);
  ctx.clip();
  drawBuilding(x, y, BUILDINGS[cell.type], 0.8 * alpha, 1, w, h, cell);
  ctx.restore();
  // Gerüst aus Holzstangen
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#7f5539';
  ctx.lineWidth = T * 0.045;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const poles = Math.max(2, w + 1);
  for (let k = 0; k < poles; k++) {
    const px = X + T * 0.14 + (W - T * 0.28) * k / (poles - 1);
    ctx.moveTo(px, Y + T * 0.12);
    ctx.lineTo(px, Y + H - T * 0.12);
  }
  for (let py = Y + T * 0.3; py < Y + H - T * 0.1; py += T * 0.42) {
    ctx.moveTo(X + T * 0.1, py);
    ctx.lineTo(X + W - T * 0.1, py);
  }
  ctx.stroke();
  // Fortschrittsbalken und Restzeit
  const bw = W - T * 0.3, bx = X + T * 0.15, by = Y + H - T * 0.22;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  roundRect(bx, by, bw, T * 0.13, T * 0.06);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  roundRect(bx, by, Math.max(T * 0.13, bw * p), T * 0.13, T * 0.06);
  ctx.fill();
  const bob = Math.abs(Math.sin(performance.now() / 180)) * T * 0.08;
  ctx.font = `${T * 0.32}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🔨', X + W - T * 0.25, Y + T * 0.25 - bob);
  drawTag(secondsText(cell.build.left), X + W / 2, Y + H / 2);
  ctx.restore();
}

// ---------- Gebäudegrafik ----------
// Jedes Gebäude wird als kleine Zeichnung in Schrägansicht gemalt: Dach oben, Vorderwand unten, Schatten nach rechts unten.
// Koordinaten in Weltpixeln: X, Y = linke obere Ecke, W, H = Breite und Höhe der Fläche.

const ROOF_COLORS = [['#c8553d', '#e07a5f'], ['#9c4a3a', '#bd5d4a'], ['#7f5539', '#9c6644'], ['#5e6472', '#7a8191'], ['#b5651d', '#d4843a']];
const WALL_COLORS = ['#f4e3c1', '#efe0c8', '#e8d5b7', '#f2e8cf', '#ead7c3'];

function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  const m = v => clamp(Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f), 0, 255);
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`;
}

function sprShadow(X, Y, W, H, r = T * 0.12) {
  ctx.fillStyle = 'rgba(20, 30, 20, 0.25)';
  roundRect(X + T * 0.12, Y + T * 0.16, W - T * 0.08, H - T * 0.1, r);
  ctx.fill();
}

function sprGround(X, Y, W, H, color, r = T * 0.1) {
  ctx.fillStyle = color;
  roundRect(X + T * 0.04, Y + T * 0.04, W - T * 0.08, H - T * 0.08, r);
  ctx.fill();
}

// Haus in Schrägansicht: o = { roof: [dunkel, hell], wall, windows, door, chimney, wallRatio, floors }
function sprHouse(X, Y, W, H, o) {
  const x0 = X + (o.inset ?? T * 0.1), x1 = X + W - (o.inset ?? T * 0.1);
  const y0 = Y + (o.insetTop ?? T * 0.1), y1 = Y + H - T * 0.08;
  const wallH = (y1 - y0) * (o.wallRatio ?? 0.36);
  const eave = y1 - wallH;
  const over = T * 0.05;
  sprShadow(x0 - T * 0.06, y0 - T * 0.06, x1 - x0 + T * 0.12, y1 - y0 + T * 0.08, T * 0.06);
  // Vorderwand
  ctx.fillStyle = o.wall;
  ctx.fillRect(x0, eave - T * 0.02, x1 - x0, wallH + T * 0.02);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(x0, y1 - T * 0.04, x1 - x0, T * 0.04);
  // Fenster und Tür
  const floors = o.floors || 1;
  const winW = Math.min(T * 0.16, (x1 - x0) / 6), winH = Math.min(T * 0.14, wallH / (floors + 1.2));
  const doorW = T * 0.14, doorX = x0 + (x1 - x0) * (o.doorAt ?? 0.5) - doorW / 2;
  const windows = o.windows ?? 2;
  for (let f = 0; f < floors; f++) {
    const wy = eave + wallH * (floors === 1 ? 0.28 : 0.14 + f * 0.42);
    for (let n = 0; n < windows; n++) {
      const wx = x0 + (x1 - x0) * ((n + 0.5) / windows) - winW / 2;
      if (f === floors - 1 && o.door !== false && Math.abs(wx + winW / 2 - (doorX + doorW / 2)) < doorW) continue;
      ctx.fillStyle = '#5b4636';
      ctx.fillRect(wx - T * 0.015, wy - T * 0.015, winW + T * 0.03, winH + T * 0.03);
      ctx.fillStyle = o.windowColor || '#a9d6e5';
      ctx.fillRect(wx, wy, winW, winH);
    }
  }
  if (o.door !== false) {
    ctx.fillStyle = o.doorColor || '#6b4226';
    ctx.beginPath();
    const dy = y1 - T * 0.04, dh = Math.min(wallH * 0.62, T * 0.22);
    ctx.moveTo(doorX, dy);
    ctx.lineTo(doorX, dy - dh + doorW / 2);
    ctx.arc(doorX + doorW / 2, dy - dh + doorW / 2, doorW / 2, Math.PI, 0);
    ctx.lineTo(doorX + doorW, dy);
    ctx.fill();
  }
  // Dach: hintere Fläche hell (Sonne), vordere dunkler, First dazwischen
  const ridge = y0 + (eave - y0) * 0.42;
  const winter = season().id === 'winter';   // Schnee auf den Dächern
  const dark = winter ? shade(o.roof[0], 0.55) : o.roof[0], light = winter ? '#f4f7f9' : o.roof[1];
  ctx.fillStyle = light;
  if (o.hip) {
    ctx.beginPath();
    ctx.moveTo(x0 - over, ridge); ctx.lineTo(x0 + (x1 - x0) * 0.2, y0); ctx.lineTo(x1 - (x1 - x0) * 0.2, y0); ctx.lineTo(x1 + over, ridge);
    ctx.fill();
  } else {
    ctx.fillRect(x0 - over, y0, x1 - x0 + over * 2, ridge - y0);
  }
  ctx.fillStyle = dark;
  ctx.fillRect(x0 - over, ridge, x1 - x0 + over * 2, eave - ridge + over);
  if (view.zoom > 0.6) {   // Dachziegel-Linien
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = T * 0.015;
    ctx.beginPath();
    for (let ly = ridge + T * 0.07; ly < eave + over; ly += T * 0.07) { ctx.moveTo(x0 - over, ly); ctx.lineTo(x1 + over, ly); }
    ctx.stroke();
  }
  ctx.fillStyle = shade(dark, -0.25);
  ctx.fillRect(x0 - over, ridge - T * 0.015, x1 - x0 + over * 2, T * 0.03);
  if (o.chimney) {
    const cx = x0 + (x1 - x0) * (o.chimney === true ? 0.72 : o.chimney);
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(cx, y0 + (ridge - y0) * 0.15, T * 0.1, (ridge - y0) * 0.75);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(cx - T * 0.01, y0 + (ridge - y0) * 0.1, T * 0.12, T * 0.03);
  }
  return { x0, x1, y0, y1, eave, ridge };
}

function sprTree(cx, cy, r, color) {
  ctx.fillStyle = 'rgba(20,30,20,0.25)';
  ctx.beginPath(); ctx.ellipse(cx + r * 0.3, cy + r * 0.6, r * 0.9, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.45, 0, Math.PI * 2); ctx.fill();
}

function sprFlag(x, y, color) {
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(x, y, T * 0.025, T * 0.3);
  ctx.fillStyle = color;
  const wave = Math.sin(performance.now() / 300 + x) * T * 0.02;
  ctx.beginPath(); ctx.moveTo(x + T * 0.025, y); ctx.lineTo(x + T * 0.2, y + T * 0.05 + wave); ctx.lineTo(x + T * 0.025, y + T * 0.11); ctx.fill();
}

function treeColor(x, y) {
  return TREE_COLORS[season().id][Math.floor(tileHash(x, y, 21) * TREE_COLORS[season().id].length)];
}

const CROP_COLORS = {
  spring: { soil: '#8b6b4a', crop: '#7fb069' },
  summer: { soil: '#9c7b55', crop: '#b5c94a' },
  autumn: { soil: '#8b6b4a', crop: '#e9c46a' },
  winter: { soil: '#d9d4cc', crop: '#bfb6a8' },
};

// Zeichnung je Gebäudeart: (X, Y, W, H, x, y, cell) – cell kann fehlen (Bauvorschau)
const SPRITES = {
  // ---------- Industrie und Moderne (bis Bilder da sind) ----------
  tenement(X, Y, W, H) {
    sprHouse(X, Y, W, H, { roof: ['#5e6472', '#7a8191'], wall: '#b5654a', windows: 3, floors: 3, wallRatio: 0.62, chimney: true, inset: T * 0.08 });
  },
  station(X, Y, W, H) {
    sprGround(X, Y, W, H, '#d6ccc2');
    const r = sprHouse(X, Y, W * 0.6, H, { roof: ['#3a5a40', '#588157'], wall: '#c9a27e', windows: 2, inset: T * 0.08 });
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc((r.x0 + r.x1) / 2, r.ridge, T * 0.08, 0, Math.PI * 2); ctx.fill();
    // Gleis mit Lok
    const gy = Y + H * 0.72;
    ctx.fillStyle = '#7f5539';
    for (let gx = X + W * 0.62; gx < X + W - T * 0.05; gx += T * 0.12) ctx.fillRect(gx, gy - T * 0.12, T * 0.05, T * 0.24);
    ctx.fillStyle = '#6c757d'; ctx.fillRect(X + W * 0.6, gy - T * 0.08, W * 0.38, T * 0.03); ctx.fillRect(X + W * 0.6, gy + T * 0.05, W * 0.38, T * 0.03);
    ctx.fillStyle = '#2d6a4f'; roundRect(X + W * 0.66, gy - T * 0.3, T * 0.5, T * 0.26, T * 0.05); ctx.fill();
    ctx.fillStyle = '#1b1b1b'; ctx.fillRect(X + W * 0.66 + T * 0.36, gy - T * 0.44, T * 0.08, T * 0.16);
  },
  police(X, Y, W, H) {
    const r = sprHouse(X, Y, W, H, { roof: ['#1d3557', '#457b9d'], wall: '#e9ecef', windows: 2, inset: T * 0.1 });
    ctx.fillStyle = '#4cc9f0'; ctx.beginPath(); ctx.arc((r.x0 + r.x1) / 2, r.eave + T * 0.05, T * 0.05, 0, Math.PI * 2); ctx.fill();
  },
  clocktower(X, Y, W, H) {
    sprGround(X, Y, W, H, '#d6ccc2');
    const cx = X + W / 2;
    ctx.fillStyle = 'rgba(20,30,20,0.25)'; ctx.fillRect(cx - T * 0.3, Y + H * 0.2, T * 0.75, H * 0.72);
    ctx.fillStyle = '#b5654a'; ctx.fillRect(cx - T * 0.32, Y + H * 0.18, T * 0.64, H * 0.72);
    ctx.fillStyle = '#9c4a3a'; ctx.beginPath(); ctx.moveTo(cx - T * 0.42, Y + H * 0.2); ctx.lineTo(cx, Y - T * 0.25); ctx.lineTo(cx + T * 0.42, Y + H * 0.2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, Y + H * 0.36, T * 0.24, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = T * 0.03;
    ctx.beginPath(); ctx.moveTo(cx, Y + H * 0.36); ctx.lineTo(cx, Y + H * 0.36 - T * 0.17); ctx.moveTo(cx, Y + H * 0.36); ctx.lineTo(cx + T * 0.12, Y + H * 0.36); ctx.stroke();
  },
  powerplant(X, Y, W, H) {
    sprGround(X, Y, W, H, '#ced4da');
    sprHouse(X, Y + H * 0.35, W * 0.55, H * 0.65, { roof: ['#495057', '#6c757d'], wall: '#adb5bd', windows: 2, door: false, inset: T * 0.08 });
    for (const [cx, cy] of [[0.68, 0.38], [0.84, 0.66]]) {
      ctx.fillStyle = '#dee2e6';
      ctx.beginPath(); ctx.moveTo(X + W * cx - T * 0.32, Y + H * cy + T * 0.4); ctx.quadraticCurveTo(X + W * cx - T * 0.14, Y + H * cy, X + W * cx - T * 0.22, Y + H * cy - T * 0.3);
      ctx.lineTo(X + W * cx + T * 0.22, Y + H * cy - T * 0.3); ctx.quadraticCurveTo(X + W * cx + T * 0.14, Y + H * cy, X + W * cx + T * 0.32, Y + H * cy + T * 0.4); ctx.fill();
      ctx.fillStyle = '#868e96'; ctx.beginPath(); ctx.ellipse(X + W * cx, Y + H * cy - T * 0.3, T * 0.22, T * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    }
  },
  solarpark(X, Y, W, H) {
    sprGround(X, Y, W, H, '#b7e4c7');
    for (let ry = Y + T * 0.2; ry < Y + H - T * 0.3; ry += T * 0.42) {
      ctx.fillStyle = '#1d3557'; ctx.fillRect(X + T * 0.15, ry, W - T * 0.3, T * 0.3);
      ctx.strokeStyle = '#4cc9f0'; ctx.lineWidth = T * 0.015; ctx.beginPath();
      for (let gx = X + T * 0.15; gx < X + W - T * 0.15; gx += T * 0.18) { ctx.moveTo(gx, ry); ctx.lineTo(gx, ry + T * 0.3); }
      ctx.stroke();
    }
  },
  concreteworks(X, Y, W, H) {
    sprGround(X, Y, W, H, '#ced4da');
    sprHouse(X, Y, W * 0.55, H, { roof: ['#6c757d', '#adb5bd'], wall: '#dee2e6', windows: 1, inset: T * 0.08 });
    ctx.fillStyle = '#adb5bd'; ctx.fillRect(X + W * 0.62, Y + H * 0.15, T * 0.3, H * 0.65);
    ctx.fillStyle = '#868e96'; ctx.beginPath(); ctx.moveTo(X + W * 0.62, Y + H * 0.8); ctx.lineTo(X + W * 0.62 + T * 0.15, Y + H * 0.95); ctx.lineTo(X + W * 0.62 + T * 0.3, Y + H * 0.8); ctx.fill();
  },
  electronicsworks(X, Y, W, H) {
    sprGround(X, Y, W, H, '#dee2e6');
    sprHouse(X, Y, W, H, { roof: ['#4895ef', '#90caf9'], wall: '#f8f9fa', windows: 4, floors: 2, wallRatio: 0.5, windowColor: '#4cc9f0', inset: T * 0.1 });
  },
  highrise(X, Y, W, H) {
    const x0 = X + T * 0.25, x1 = X + W - T * 0.25, top = Y - T * 0.6, bot = Y + H - T * 0.12;
    sprShadow(x0, Y + H * 0.3, x1 - x0, bot - Y - H * 0.3);
    ctx.fillStyle = '#90e0ef'; ctx.fillRect(x0, top, x1 - x0, bot - top);
    ctx.fillStyle = '#48cae4'; ctx.fillRect(x0 + (x1 - x0) * 0.6, top, (x1 - x0) * 0.4, bot - top);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let wy = top + T * 0.1; wy < bot - T * 0.15; wy += T * 0.16) for (let wx = x0 + T * 0.06; wx < x1 - T * 0.1; wx += T * 0.16) ctx.fillRect(wx, wy, T * 0.08, T * 0.08);
    ctx.fillStyle = '#495057'; ctx.fillRect(x0 - T * 0.03, top - T * 0.05, x1 - x0 + T * 0.06, T * 0.06);
  },
  supermarket(X, Y, W, H) {
    sprGround(X, Y, W, H, '#dee2e6');
    const r = sprHouse(X, Y, W, H, { roof: ['#e85d04', '#f48c06'], wall: '#fff', windows: 4, inset: T * 0.08, wallRatio: 0.45 });
    ctx.fillStyle = '#ffb703'; ctx.fillRect(r.x0, r.eave, r.x1 - r.x0, T * 0.06);
  },
  university(X, Y, W, H) {
    sprGround(X, Y, W, H, '#d6ccc2');
    const r = sprHouse(X, Y, W, H, { roof: ['#6d597a', '#8e7aa3'], wall: '#f1e9da', windows: 4, floors: 2, inset: T * 0.08, wallRatio: 0.5, hip: true });
    ctx.fillStyle = '#e0d5c1';
    for (let k = 0; k < 5; k++) ctx.fillRect(r.x0 + T * 0.12 + k * (r.x1 - r.x0 - T * 0.3) / 4, r.eave + T * 0.04, T * 0.05, r.y1 - r.eave - T * 0.1);
  },
  stadium(X, Y, W, H) {
    const cx = X + W / 2, cy = Y + H / 2;
    ctx.fillStyle = 'rgba(20,30,20,0.25)'; ctx.beginPath(); ctx.ellipse(cx + T * 0.1, cy + T * 0.12, W * 0.46, H * 0.44, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#adb5bd'; ctx.beginPath(); ctx.ellipse(cx, cy, W * 0.46, H * 0.44, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.ellipse(cx, cy, W * 0.38, H * 0.36, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#52b788'; ctx.beginPath(); ctx.ellipse(cx, cy, W * 0.28, H * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = T * 0.03; ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.25); ctx.lineTo(cx, cy + H * 0.25); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, T * 0.3, 0, Math.PI * 2); ctx.stroke();
  },
  airport(X, Y, W, H) {
    sprGround(X, Y, W, H, '#ced4da');
    ctx.fillStyle = '#495057'; ctx.fillRect(X + T * 0.15, Y + H * 0.62, W - T * 0.3, T * 0.55);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = T * 0.04; ctx.setLineDash([T * 0.2, T * 0.15]);
    ctx.beginPath(); ctx.moveTo(X + T * 0.3, Y + H * 0.62 + T * 0.27); ctx.lineTo(X + W - T * 0.3, Y + H * 0.62 + T * 0.27); ctx.stroke(); ctx.setLineDash([]);
    sprHouse(X, Y, W * 0.7, H * 0.55, { roof: ['#0077b6', '#48cae4'], wall: '#caf0f8', windows: 5, inset: T * 0.1 });
    // Tower und Flugzeug
    ctx.fillStyle = '#e9ecef'; ctx.fillRect(X + W * 0.78, Y + T * 0.2, T * 0.22, H * 0.4);
    ctx.fillStyle = '#4cc9f0'; ctx.fillRect(X + W * 0.75, Y + T * 0.1, T * 0.34, T * 0.18);
    const px = X + W * 0.55, py = Y + H * 0.62 + T * 0.27;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(px, py, T * 0.45, T * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px - T * 0.05, py); ctx.lineTo(px - T * 0.2, py - T * 0.35); ctx.lineTo(px + T * 0.05, py); ctx.lineTo(px - T * 0.2, py + T * 0.35); ctx.fill();
  },
  // ---------- Steinzeit ----------
  painter(X, Y, W, H, x, y) {
    sprGround(X, Y, W, H, '#cdb98f');
    // Felswand mit Malereien
    ctx.fillStyle = 'rgba(20,30,20,0.25)';
    ctx.beginPath(); ctx.ellipse(X + W / 2 + T * 0.05, Y + T * 0.62, T * 0.4, T * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a39e93';
    ctx.beginPath(); ctx.moveTo(X + T * 0.08, Y + T * 0.62); ctx.quadraticCurveTo(X + T * 0.1, Y + T * 0.1, X + T * 0.5, Y + T * 0.08);
    ctx.quadraticCurveTo(X + T * 0.92, Y + T * 0.1, X + T * 0.92, Y + T * 0.62); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8d8a83';
    ctx.beginPath(); ctx.moveTo(X + T * 0.6, Y + T * 0.1); ctx.quadraticCurveTo(X + T * 0.92, Y + T * 0.12, X + T * 0.92, Y + T * 0.62); ctx.lineTo(X + T * 0.7, Y + T * 0.62); ctx.fill();
    ctx.strokeStyle = '#9b2226'; ctx.lineWidth = T * 0.025; ctx.lineCap = 'round';
    // Tier (Mammut) und Strichmännchen
    ctx.beginPath(); ctx.ellipse(X + T * 0.38, Y + T * 0.32, T * 0.11, T * 0.06, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    for (const lx of [0.31, 0.36, 0.41, 0.45]) { ctx.moveTo(X + T * lx, Y + T * 0.37); ctx.lineTo(X + T * lx, Y + T * 0.44); }
    ctx.moveTo(X + T * 0.27, Y + T * 0.3); ctx.quadraticCurveTo(X + T * 0.2, Y + T * 0.36, X + T * 0.24, Y + T * 0.42);
    ctx.moveTo(X + T * 0.62, Y + T * 0.26); ctx.lineTo(X + T * 0.62, Y + T * 0.38);
    ctx.moveTo(X + T * 0.56, Y + T * 0.31); ctx.lineTo(X + T * 0.68, Y + T * 0.3);
    ctx.moveTo(X + T * 0.62, Y + T * 0.38); ctx.lineTo(X + T * 0.58, Y + T * 0.45);
    ctx.moveTo(X + T * 0.62, Y + T * 0.38); ctx.lineTo(X + T * 0.66, Y + T * 0.45);
    ctx.stroke();
    ctx.fillStyle = '#9b2226';
    ctx.beginPath(); ctx.arc(X + T * 0.62, Y + T * 0.23, T * 0.03, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e9c46a';
    for (const [hx, hy] of [[0.78, 0.25], [0.5, 0.5]]) { ctx.beginPath(); ctx.arc(X + T * hx, Y + T * hy, T * 0.035, 0, Math.PI * 2); ctx.fill(); }
    // Farbtöpfe
    for (const [cx, col] of [[0.3, '#9b2226'], [0.45, '#e9c46a'], [0.6, '#3b2a1a']]) {
      ctx.fillStyle = '#7f5539';
      ctx.beginPath(); ctx.ellipse(X + T * cx, Y + T * 0.8, T * 0.06, T * 0.045, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(X + T * cx, Y + T * 0.79, T * 0.04, T * 0.025, 0, 0, Math.PI * 2); ctx.fill();
    }
  },
  watertrough(X, Y, W, H) {
    const winter = season().id === 'winter';
    const cx = X + W / 2, cy = Y + H * 0.55;
    ctx.fillStyle = 'rgba(20,30,20,0.25)';
    roundRect(cx - T * 0.34, cy - T * 0.08, T * 0.74, T * 0.36, T * 0.08); ctx.fill();
    // Trog aus ausgehöhltem Stamm
    ctx.fillStyle = '#7f5539';
    roundRect(cx - T * 0.38, cy - T * 0.16, T * 0.76, T * 0.34, T * 0.12); ctx.fill();
    ctx.fillStyle = winter ? '#cfe6ef' : '#4f9bd1';
    roundRect(cx - T * 0.3, cy - T * 0.1, T * 0.6, T * 0.2, T * 0.08); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(cx - T * 0.18, cy - T * 0.05, T * 0.14, T * 0.025);
    // Eimer daneben
    for (const bx of [-0.28, 0.3]) {
      ctx.fillStyle = '#a47148';
      ctx.beginPath(); ctx.moveTo(cx + T * (bx - 0.08), cy + T * 0.22); ctx.lineTo(cx + T * (bx + 0.08), cy + T * 0.22);
      ctx.lineTo(cx + T * (bx + 0.06), cy + T * 0.38); ctx.lineTo(cx + T * (bx - 0.06), cy + T * 0.38); ctx.fill();
      ctx.strokeStyle = '#3b2a1a'; ctx.lineWidth = T * 0.015;
      ctx.beginPath(); ctx.arc(cx + T * bx, cy + T * 0.22, T * 0.07, Math.PI, 0); ctx.stroke();
    }
  },
  hut(X, Y, W, H, x, y) {
    const cx = X + W / 2, cy = Y + H * 0.58;
    const winter = season().id === 'winter';
    ctx.fillStyle = 'rgba(20,30,20,0.25)';
    ctx.beginPath(); ctx.ellipse(cx + T * 0.06, cy + T * 0.1, T * 0.4, T * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    // Kegeldach aus Stroh und Ästen
    ctx.fillStyle = winter ? '#e8e4da' : '#c9a66b';
    ctx.beginPath(); ctx.moveTo(cx - T * 0.4, cy + T * 0.18); ctx.lineTo(cx, cy - T * 0.42); ctx.lineTo(cx + T * 0.4, cy + T * 0.18);
    ctx.quadraticCurveTo(cx, cy + T * 0.3, cx - T * 0.4, cy + T * 0.18); ctx.fill();
    ctx.strokeStyle = winter ? '#b9b2a4' : '#9c7a45';
    ctx.lineWidth = T * 0.02;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath(); ctx.moveTo(cx, cy - T * 0.4); ctx.lineTo(cx + k * T * 0.14, cy + T * 0.2); ctx.stroke();
    }
    // Äste ragen oben heraus
    ctx.strokeStyle = '#6b4226';
    ctx.lineWidth = T * 0.03;
    ctx.beginPath(); ctx.moveTo(cx - T * 0.08, cy - T * 0.5); ctx.lineTo(cx + T * 0.04, cy - T * 0.34);
    ctx.moveTo(cx + T * 0.09, cy - T * 0.5); ctx.lineTo(cx - T * 0.03, cy - T * 0.34); ctx.stroke();
    // Eingang
    ctx.fillStyle = '#3b2a1a';
    ctx.beginPath(); ctx.ellipse(cx, cy + T * 0.12, T * 0.09, T * 0.13, 0, Math.PI, 0); ctx.fill();
  },
  gatherer(X, Y, W, H, x, y) {
    sprGround(X, Y, W, H, '#cdb98f');
    const berry = season().id === 'winter' ? '#c9d6df' : '#7b2cbf';
    for (const [bx, by, r] of [[0.28, 0.32, 0.17], [0.66, 0.3, 0.15], [0.36, 0.7, 0.14]]) {
      sprTree(X + T * bx, Y + T * by, T * r, '#4f772d');
      ctx.fillStyle = berry;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath(); ctx.arc(X + T * (bx - 0.08 + 0.16 * tileHash(x, y, k)), Y + T * (by - 0.06 + 0.12 * tileHash(x, y, k + 4)), T * 0.03, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Korb
    ctx.fillStyle = '#b08968';
    ctx.beginPath(); ctx.ellipse(X + T * 0.7, Y + T * 0.72, T * 0.13, T * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = berry;
    ctx.beginPath(); ctx.ellipse(X + T * 0.7, Y + T * 0.69, T * 0.09, T * 0.04, 0, 0, Math.PI * 2); ctx.fill();
  },
  hunter(X, Y, W, H) {
    sprGround(X, Y, W, H, '#cdb98f');
    // Zelt aus Fellen
    const cx = X + W * 0.45, cy = Y + H * 0.55;
    ctx.fillStyle = 'rgba(20,30,20,0.25)';
    ctx.beginPath(); ctx.ellipse(cx + T * 0.05, cy + T * 0.16, T * 0.32, T * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a47148';
    ctx.beginPath(); ctx.moveTo(cx - T * 0.32, cy + T * 0.18); ctx.lineTo(cx, cy - T * 0.34); ctx.lineTo(cx + T * 0.32, cy + T * 0.18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7f5539';
    ctx.beginPath(); ctx.moveTo(cx, cy - T * 0.34); ctx.lineTo(cx + T * 0.32, cy + T * 0.18); ctx.lineTo(cx + T * 0.05, cy + T * 0.18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3b2a1a';
    ctx.beginPath(); ctx.moveTo(cx - T * 0.07, cy + T * 0.18); ctx.lineTo(cx, cy - T * 0.02); ctx.lineTo(cx + T * 0.07, cy + T * 0.18); ctx.fill();
    // Speere
    ctx.strokeStyle = '#6b4226'; ctx.lineWidth = T * 0.025;
    ctx.beginPath(); ctx.moveTo(X + T * 0.82, Y + T * 0.85); ctx.lineTo(X + T * 0.72, Y + T * 0.2);
    ctx.moveTo(X + T * 0.9, Y + T * 0.82); ctx.lineTo(X + T * 0.88, Y + T * 0.18); ctx.stroke();
    ctx.fillStyle = '#8d99ae';
    for (const [px, py] of [[0.72, 0.2], [0.88, 0.18]]) {
      ctx.beginPath(); ctx.moveTo(X + T * px, Y + T * (py - 0.08)); ctx.lineTo(X + T * (px - 0.03), Y + T * py); ctx.lineTo(X + T * (px + 0.03), Y + T * py); ctx.fill();
    }
  },
  woodcutter(X, Y, W, H, x, y) {
    sprGround(X, Y, W, H, '#cdb98f');
    sprTree(X + T * 0.3, Y + T * 0.3, T * 0.2, treeColor(x, y));
    // Baumstumpf mit Axt
    ctx.fillStyle = '#7f5539';
    ctx.beginPath(); ctx.ellipse(X + T * 0.7, Y + T * 0.42, T * 0.13, T * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ddb892';
    ctx.beginPath(); ctx.ellipse(X + T * 0.7, Y + T * 0.39, T * 0.1, T * 0.055, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#6b4226'; ctx.lineWidth = T * 0.03;
    ctx.beginPath(); ctx.moveTo(X + T * 0.7, Y + T * 0.38); ctx.lineTo(X + T * 0.86, Y + T * 0.2); ctx.stroke();
    ctx.fillStyle = '#9aa0a6';
    ctx.beginPath(); ctx.moveTo(X + T * 0.7, Y + T * 0.38); ctx.lineTo(X + T * 0.64, Y + T * 0.31); ctx.lineTo(X + T * 0.72, Y + T * 0.3); ctx.fill();
    // Stammstapel
    for (let n = 0; n < 3; n++) {
      const cx = X + T * (0.3 + n * 0.17), cy = Y + T * 0.75;
      ctx.fillStyle = '#7f5539';
      ctx.beginPath(); ctx.arc(cx, cy, T * 0.085, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ddb892';
      ctx.beginPath(); ctx.arc(cx, cy, T * 0.05, 0, Math.PI * 2); ctx.fill();
    }
  },
  stonecutter(X, Y, W, H, x, y) {
    sprGround(X, Y, W, H, '#cfc6b4');
    for (let k = 0; k < 7; k++) {
      const sx = X + T * (0.2 + 0.6 * tileHash(x, y, k + 20)), sy = Y + T * (0.25 + 0.5 * tileHash(x, y, k + 30));
      const r = T * (0.07 + 0.06 * tileHash(x, y, k + 40));
      ctx.fillStyle = 'rgba(20,30,20,0.2)';
      ctx.beginPath(); ctx.ellipse(sx + r * 0.3, sy + r * 0.4, r, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = k % 2 ? '#a39e93' : '#8d8a83';
      ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.75, tileHash(x, y, k), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.ellipse(sx - r * 0.3, sy - r * 0.3, r * 0.35, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    }
  },
  fireplace(X, Y, W, H) {
    const cx = X + W / 2, cy = Y + H * 0.55;
    const t = performance.now() / 1000;
    // Steinkreis
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * Math.PI * 2;
      ctx.fillStyle = k % 2 ? '#8d8a83' : '#a39e93';
      ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * T * 0.26, cy + Math.sin(a) * T * 0.18, T * 0.07, T * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Holzscheite und Flammen
    ctx.strokeStyle = '#6b4226'; ctx.lineWidth = T * 0.05; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - T * 0.14, cy + T * 0.06); ctx.lineTo(cx + T * 0.14, cy - T * 0.02);
    ctx.moveTo(cx - T * 0.14, cy - T * 0.02); ctx.lineTo(cx + T * 0.14, cy + T * 0.06); ctx.stroke();
    const f = 1 + Math.sin(t * 9) * 0.08;
    ctx.fillStyle = '#f4a261';
    ctx.beginPath(); ctx.moveTo(cx - T * 0.12, cy + T * 0.02); ctx.quadraticCurveTo(cx, cy - T * 0.42 * f, cx + T * 0.12, cy + T * 0.02); ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.moveTo(cx - T * 0.06, cy + T * 0.02); ctx.quadraticCurveTo(cx, cy - T * 0.24 * f, cx + T * 0.06, cy + T * 0.02); ctx.fill();
    // Sitzsteine
    ctx.fillStyle = '#7f5539';
    for (const [dx, dy] of [[-0.38, 0.3], [0.38, 0.28], [0, -0.3]]) {
      ctx.beginPath(); ctx.ellipse(cx + T * dx, cy + T * dy, T * 0.09, T * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    }
  },
  house(X, Y, W, H, x, y, cell) {
    const lvl = cell ? levelOf(cell) : 1;
    const h = tileHash(x, y, 4);
    sprHouse(X, Y, W, H, {
      roof: ROOF_COLORS[Math.floor(h * ROOF_COLORS.length)],
      wall: WALL_COLORS[Math.floor(tileHash(x, y, 5) * WALL_COLORS.length)],
      inset: T * (lvl === 1 ? 0.16 : 0.08), insetTop: T * (lvl === 1 ? 0.18 : 0.08),
      floors: lvl >= 3 ? 2 : 1, wallRatio: lvl >= 3 ? 0.48 : 0.38,
      windows: lvl === 1 ? 2 : 3, chimney: h < 0.5 ? 0.22 : true, doorAt: h < 0.5 ? 0.62 : 0.4,
    });
  },
  farm(X, Y, W, H, x, y) {
    const c = CROP_COLORS[season().id];
    sprGround(X, Y, W, H, c.soil, T * 0.06);
    // Ackerreihen
    ctx.fillStyle = c.crop;
    const rowsY = Y + T * 0.12;
    for (let ry = rowsY; ry < Y + H - T * 0.12; ry += T * 0.16) ctx.fillRect(X + T * 1.0, ry, W - T * 1.12, T * 0.09);
    for (let ry = Y + T * 1.0; ry < Y + H - T * 0.12; ry += T * 0.16) ctx.fillRect(X + T * 0.12, ry, T * 0.86, T * 0.09);
    // Zaun
    ctx.strokeStyle = '#7f5539';
    ctx.lineWidth = T * 0.03;
    roundRect(X + T * 0.06, Y + T * 0.06, W - T * 0.12, H - T * 0.12, T * 0.05);
    ctx.stroke();
    // Scheune oben links
    sprHouse(X + T * 0.04, Y + T * 0.02, T * 0.96, T * 0.96, { roof: ['#8d2f23', '#ad3e2f'], wall: '#b23a2e', windows: 0, doorColor: '#f1e3c8', inset: T * 0.1 });
  },
  sawmill(X, Y, W, H, x, y) {
    sprGround(X, Y, W, H, '#d9c4a0');
    sprHouse(X, Y, T * 1.05, H, { roof: ['#6f4e37', '#8b6748'], wall: '#b08968', windows: 1, inset: T * 0.1, doorAt: 0.35 });
    // Stammstapel
    for (let row = 0; row < 2; row++) {
      for (let n = 0; n < 3 - row; n++) {
        const cx = X + T * (1.3 + n * 0.22 + row * 0.11), cy = Y + H - T * (0.28 + row * 0.19);
        ctx.fillStyle = '#7f5539';
        ctx.beginPath(); ctx.arc(cx, cy, T * 0.11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ddb892';
        ctx.beginPath(); ctx.arc(cx, cy, T * 0.075, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#b08968'; ctx.lineWidth = T * 0.012;
        ctx.beginPath(); ctx.arc(cx, cy, T * 0.04, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.fillStyle = '#9c6644';
    ctx.fillRect(X + T * 1.15, Y + T * 0.16, T * 0.75, T * 0.12);
  },
  quarry(X, Y, W, H) {
    sprGround(X, Y, W, H, '#c2bbb0');
    const terr = ['#a8a196', '#8f887d', '#767064'];
    terr.forEach((col, n) => {
      ctx.fillStyle = col;
      const i = T * (0.2 + n * 0.22);
      roundRect(X + i, Y + i, W - i * 2, H - i * 2, T * 0.2);
      ctx.fill();
    });
    // Steinblöcke und Lore
    ctx.fillStyle = '#d6d2cb';
    [[0.25, 0.25], [1.5, 0.3], [0.3, 1.55]].forEach(([bx, by]) => ctx.fillRect(X + bx * T, Y + by * T, T * 0.22, T * 0.16));
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(X + T * 1.35, Y + T * 1.5, T * 0.36, T * 0.2);
    ctx.fillStyle = '#9c958a';
    ctx.fillRect(X + T * 1.39, Y + T * 1.45, T * 0.28, T * 0.08);
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(X + T * 1.42, Y + T * 1.72, T * 0.04, 0, Math.PI * 2); ctx.arc(X + T * 1.64, Y + T * 1.72, T * 0.04, 0, Math.PI * 2); ctx.fill();
  },
  market(X, Y, W, H) {
    sprGround(X, Y, W, H, '#ddd3c6');
    const awnings = [['#e63946', '#fff'], ['#457b9d', '#fff'], ['#f4a261', '#fff']];
    const sw = (W - T * 0.2) / 3;
    awnings.forEach(([a, b], n) => {
      const sx = X + T * 0.1 + n * sw;
      sprShadow(sx, Y + T * 0.1, sw - T * 0.04, H - T * 0.2, T * 0.04);
      ctx.fillStyle = '#9c6644';
      ctx.fillRect(sx + T * 0.04, Y + H * 0.55, sw - T * 0.12, H * 0.3);
      const fruit = ['#e63946', '#ffb703', '#8ac926', '#fb8500'];
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = fruit[(k + n) % 4];
        ctx.beginPath(); ctx.arc(sx + T * 0.1 + k * (sw - T * 0.2) / 3.5, Y + H * 0.66, T * 0.045, 0, Math.PI * 2); ctx.fill();
      }
      for (let k = 0; k < 4; k++) {   // gestreifte Markise
        ctx.fillStyle = k % 2 ? b : a;
        ctx.fillRect(sx + k * (sw - T * 0.04) / 4, Y + T * 0.12, (sw - T * 0.04) / 4, H * 0.38);
      }
      ctx.fillStyle = a;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath(); ctx.arc(sx + (k + 0.5) * (sw - T * 0.04) / 4, Y + T * 0.12 + H * 0.38, (sw - T * 0.04) / 8, 0, Math.PI); ctx.fill();
      }
    });
  },
  warehouse(X, Y, W, H) {
    const r = sprHouse(X, Y, W, H, { roof: ['#6c584c', '#8a7365'], wall: '#ddb892', windows: 0, door: false, inset: T * 0.08 });
    // große Tore mit Kreuzstreben
    [0.3, 0.7].forEach(p => {
      const dw = T * 0.32, dx = r.x0 + (r.x1 - r.x0) * p - dw / 2, dh = (r.y1 - r.eave) * 0.85;
      ctx.fillStyle = '#7f5539'; ctx.fillRect(dx, r.y1 - dh, dw, dh);
      ctx.strokeStyle = '#5d4037'; ctx.lineWidth = T * 0.025;
      ctx.beginPath(); ctx.moveTo(dx, r.y1 - dh); ctx.lineTo(dx + dw, r.y1); ctx.moveTo(dx + dw, r.y1 - dh); ctx.lineTo(dx, r.y1); ctx.stroke();
    });
  },
  park(X, Y, W, H, x, y) {
    sprGround(X, Y, W, H, '#80c98f', T * 0.25);
    ctx.strokeStyle = '#e9dcc9';
    ctx.lineWidth = T * 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(X + T * 0.2, Y + H - T * 0.3); ctx.quadraticCurveTo(X + W * 0.5, Y + H * 0.45, X + W - T * 0.2, Y + T * 0.35);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#5fa8d3';
    ctx.beginPath(); ctx.ellipse(X + W * 0.7, Y + H * 0.72, T * 0.3, T * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7f5539';
    ctx.fillRect(X + W * 0.42, Y + H * 0.28, T * 0.3, T * 0.07);
    const flowers = ['#ffafcc', '#ffd166', '#fff', '#e63946'];
    for (let k = 0; k < 8; k++) {
      ctx.fillStyle = flowers[k % 4];
      ctx.beginPath(); ctx.arc(X + T * (0.25 + 1.5 * tileHash(x, y, k + 30)), Y + T * (0.25 + 1.5 * tileHash(x, y, k + 40)), T * 0.04, 0, Math.PI * 2); ctx.fill();
    }
    sprTree(X + T * 0.45, Y + T * 0.45, T * 0.28, treeColor(x, y));
    sprTree(X + T * 1.5, Y + T * 1.0, T * 0.24, treeColor(x + 1, y));
    sprTree(X + T * 0.5, Y + T * 1.45, T * 0.22, treeColor(x, y + 1));
  },
  firestation(X, Y, W, H) {
    const r = sprHouse(X, Y, W, H, { roof: ['#3d405b', '#565a7a'], wall: '#b23a48', windows: 2, door: false, inset: T * 0.08 });
    const dw = T * 0.5, dx = r.x0 + (r.x1 - r.x0) * 0.32 - dw / 2, dh = (r.y1 - r.eave) * 0.8;
    ctx.fillStyle = '#ddd'; ctx.fillRect(dx, r.y1 - dh, dw, dh);
    ctx.fillStyle = '#bbb';
    for (let k = 1; k < 4; k++) ctx.fillRect(dx, r.y1 - dh + k * dh / 4, dw, T * 0.015);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(r.x1 - T * 0.35, r.ridge, T * 0.09, 0, Math.PI * 2); ctx.fill();
  },
  scriptorium(X, Y, W, H) {
    const r = sprHouse(X, Y, W, H, { roof: ['#4a4e69', '#62668a'], wall: '#d4c5a9', windows: 1, windowColor: '#ffd77a', inset: T * 0.12, doorAt: 0.7 });
    ctx.fillStyle = '#fefae0';
    ctx.fillRect(r.x0 + T * 0.06, r.eave + T * 0.04, T * 0.14, T * 0.1);
  },
  carpentry(X, Y, W, H) {
    sprGround(X, Y, W, H, '#e3cfae');
    sprHouse(X, Y, T * 1.2, H, { roof: ['#99582a', '#b86f3b'], wall: '#e6ccb2', windows: 1, inset: T * 0.1, chimney: 0.7 });
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = k % 2 ? '#e9c89b' : '#d4a373';
      ctx.fillRect(X + T * 1.3, Y + T * (0.3 + k * 0.12), T * 0.6, T * 0.1);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(X + T * 1.3, Y + T * 0.78, T * 0.6, T * 0.04);
  },
  brickworks(X, Y, W, H) {
    sprGround(X, Y, W, H, '#d8b4a0');
    sprShadow(X + T * 0.1, Y + T * 0.2, T * 0.9, H - T * 0.3, T * 0.35);
    ctx.fillStyle = '#9c6644';
    roundRect(X + T * 0.12, Y + T * 0.22, T * 0.86, H - T * 0.36, T * 0.38); ctx.fill();
    ctx.fillStyle = '#7f4f24';
    ctx.beginPath(); ctx.arc(X + T * 0.55, Y + H - T * 0.2, T * 0.14, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath(); ctx.arc(X + T * 0.55, Y + H - T * 0.2, T * 0.08, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#6f4518';
    ctx.fillRect(X + T * 0.72, Y + T * 0.05, T * 0.14, T * 0.4);
    for (let row = 0; row < 3; row++) for (let n = 0; n < 3; n++) {
      ctx.fillStyle = (row + n) % 2 ? '#c0603f' : '#a44a3f';
      ctx.fillRect(X + T * (1.15 + n * 0.22), Y + T * (0.3 + row * 0.14), T * 0.2, T * 0.12);
    }
  },
  bakery(X, Y, W, H) {
    const r = sprHouse(X, Y, W, H, { roof: ['#d1495b', '#e76f51'], wall: '#fefae0', windows: 1, windowColor: '#ffd77a', inset: T * 0.1, chimney: 0.25, doorAt: 0.68 });
    ctx.fillStyle = '#c68b59';
    ctx.beginPath(); ctx.ellipse(r.x0 + T * 0.18, r.eave + T * 0.09, T * 0.1, T * 0.05, 0, 0, Math.PI * 2); ctx.fill();
  },
  well(X, Y, W, H) {
    const cx = X + W / 2, cy = Y + H * 0.55;
    ctx.fillStyle = '#d6ccc0';
    ctx.beginPath(); ctx.arc(cx, cy, T * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(20,30,20,0.25)';
    ctx.beginPath(); ctx.arc(cx + T * 0.05, cy + T * 0.06, T * 0.27, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8d8a83';
    ctx.beginPath(); ctx.arc(cx, cy, T * 0.26, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#6f6c66'; ctx.lineWidth = T * 0.015;
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * T * 0.17, cy + Math.sin(a) * T * 0.17); ctx.lineTo(cx + Math.cos(a) * T * 0.26, cy + Math.sin(a) * T * 0.26); ctx.stroke();
    }
    ctx.fillStyle = season().id === 'winter' ? '#cfe6ef' : '#3d85c6';
    ctx.beginPath(); ctx.arc(cx, cy, T * 0.16, 0, Math.PI * 2); ctx.fill();
    // Holzgestell mit Dach und Eimer
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(cx - T * 0.3, cy - T * 0.32, T * 0.05, T * 0.36);
    ctx.fillRect(cx + T * 0.25, cy - T * 0.32, T * 0.05, T * 0.36);
    ctx.fillStyle = '#9c4a3a';
    ctx.beginPath(); ctx.moveTo(cx - T * 0.38, cy - T * 0.28); ctx.lineTo(cx, cy - T * 0.46); ctx.lineTo(cx + T * 0.38, cy - T * 0.28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7f5539';
    ctx.fillRect(cx - T * 0.3, cy - T * 0.3, T * 0.6, T * 0.04);
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(cx - T * 0.05, cy - T * 0.2, T * 0.1, T * 0.1);
  },
  school(X, Y, W, H, x, y) {
    sprGround(X, Y, W, H, '#e9dcc9');
    const r = sprHouse(X, Y, W, H * 0.68, { roof: ['#bc4749', '#d0605f'], wall: '#f2e8cf', windows: 4, inset: T * 0.1 });
    ctx.fillStyle = '#f2e8cf';
    ctx.fillRect(X + W / 2 - T * 0.14, r.y0 - T * 0.05, T * 0.28, T * 0.28);
    ctx.fillStyle = '#bc4749';
    ctx.beginPath(); ctx.moveTo(X + W / 2 - T * 0.2, r.y0); ctx.lineTo(X + W / 2, r.y0 - T * 0.18); ctx.lineTo(X + W / 2 + T * 0.2, r.y0); ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(X + W / 2, r.y0 + T * 0.1, T * 0.06, 0, Math.PI * 2); ctx.fill();
    // Schulhof mit Baum und Hüpfkästchen
    sprTree(X + T * 0.4, Y + H - T * 0.35, T * 0.22, treeColor(x, y));
    ctx.strokeStyle = '#fff'; ctx.lineWidth = T * 0.02;
    for (let k = 0; k < 4; k++) ctx.strokeRect(X + T * (1.0 + k * 0.16), Y + H - T * 0.42, T * 0.16, T * 0.16);
  },
  library(X, Y, W, H) {
    const r = sprHouse(X, Y, W, H, { roof: ['#6d6875', '#8a8494'], wall: '#efe6d8', windows: 0, inset: T * 0.08, hip: true });
    ctx.fillStyle = '#d9cbb5';
    for (let k = 0; k < 6; k++) ctx.fillRect(r.x0 + T * 0.08 + k * (r.x1 - r.x0 - T * 0.2) / 5, r.eave, T * 0.05, r.y1 - r.eave - T * 0.04);
    ctx.fillStyle = '#457b9d';
    ctx.fillRect(r.x0 + T * 0.18, r.eave + T * 0.06, T * 0.1, T * 0.12);
    ctx.fillStyle = '#e63946';
    ctx.fillRect(r.x0 + T * 0.3, r.eave + T * 0.06, T * 0.08, T * 0.12);
  },
  guard(X, Y, W, H) {
    const r = sprHouse(X, Y, W, H, { roof: ['#495057', '#6c757d'], wall: '#adb5bd', windows: 1, inset: T * 0.12, doorAt: 0.68 });
    sprFlag(r.x1 - T * 0.12, r.y0 - T * 0.18, '#c1121f');
  },
  tower(X, Y, W, H) {
    const cx = X + W / 2, cy = Y + H / 2;
    ctx.fillStyle = 'rgba(20,30,20,0.3)';
    ctx.beginPath(); ctx.ellipse(cx + T * 0.18, cy + T * 0.18, T * 0.4, T * 0.32, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8f8a84';
    ctx.beginPath(); ctx.arc(cx, cy, T * 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a8a39c';
    for (let k = 0; k < 8; k++) {   // Zinnen
      const a = k * Math.PI / 4;
      ctx.fillRect(cx + Math.cos(a) * T * 0.31 - T * 0.06, cy + Math.sin(a) * T * 0.31 - T * 0.06, T * 0.12, T * 0.12);
    }
    ctx.fillStyle = '#6f6a64';
    ctx.beginPath(); ctx.arc(cx, cy, T * 0.22, 0, Math.PI * 2); ctx.fill();
    sprFlag(cx - T * 0.01, cy - T * 0.3, '#c1121f');
  },
  hospital(X, Y, W, H) {
    sprGround(X, Y, W, H, '#b7e4c7');
    const r = sprHouse(X, Y, W, H * 0.82, { roof: ['#ced4da', '#e9ecef'], wall: '#f8f9fa', windows: 4, inset: T * 0.1, hip: true });
    const cx = X + W / 2, cy = (r.y0 + r.eave) / 2;
    ctx.fillStyle = '#e63946';
    ctx.fillRect(cx - T * 0.22, cy - T * 0.07, T * 0.44, T * 0.14);
    ctx.fillRect(cx - T * 0.07, cy - T * 0.22, T * 0.14, T * 0.44);
  },
  townhall(X, Y, W, H) {
    sprGround(X, Y, W, H, '#d6ccc2');
    const r = sprHouse(X, Y, W, H, { roof: ['#52796f', '#6b9a8e'], wall: '#f1e9da', windows: 0, inset: T * 0.08, hip: true, wallRatio: 0.4 });
    ctx.fillStyle = '#e0d5c1';
    for (let k = 0; k < 6; k++) ctx.fillRect(r.x0 + T * 0.1 + k * (r.x1 - r.x0 - T * 0.26) / 5, r.eave + T * 0.04, T * 0.06, r.y1 - r.eave - T * 0.1);
    // Uhrturm
    const cx = X + W / 2;
    ctx.fillStyle = '#f1e9da';
    ctx.fillRect(cx - T * 0.22, r.y0 - T * 0.1, T * 0.44, T * 0.5);
    ctx.fillStyle = '#354f52';
    ctx.beginPath(); ctx.moveTo(cx - T * 0.28, r.y0 - T * 0.08); ctx.lineTo(cx, r.y0 - T * 0.4); ctx.lineTo(cx + T * 0.28, r.y0 - T * 0.08); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, r.y0 + T * 0.15, T * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = T * 0.02;
    ctx.beginPath(); ctx.moveTo(cx, r.y0 + T * 0.15); ctx.lineTo(cx, r.y0 + T * 0.06); ctx.moveTo(cx, r.y0 + T * 0.15); ctx.lineTo(cx + T * 0.07, r.y0 + T * 0.15); ctx.stroke();
    sprFlag(cx - T * 0.01, r.y0 - T * 0.68, '#2a9d8f');
  },
  plaza(X, Y, W, H, x, y) {
    // Pflaster mit Ringen um den Brunnen
    sprGround(X, Y, W, H, '#d8cfc4', T * 0.3);
    const cx = X + W / 2, cy = Y + H / 2;
    ctx.save();
    roundRect(X + T * 0.04, Y + T * 0.04, W - T * 0.08, H - T * 0.08, T * 0.3);
    ctx.clip();
    ctx.strokeStyle = 'rgba(120,100,80,0.18)';
    ctx.lineWidth = T * 0.03;
    for (let r = T * 0.95; r < W * 0.7; r += T * 0.22) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    // Blumenbeete und Bäume in den Ecken
    [[0.45, 0.45], [W / T - 0.45, 0.45], [0.45, H / T - 0.45], [W / T - 0.45, H / T - 0.45]].forEach(([bx, by], n) => {
      ctx.fillStyle = '#6a994e';
      ctx.beginPath(); ctx.arc(X + bx * T, Y + by * T, T * 0.36, 0, Math.PI * 2); ctx.fill();
      const fl = ['#ffafcc', '#ffd166', '#fff', '#e63946'];
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3 + n;
        ctx.fillStyle = fl[(k + n) % 4];
        ctx.beginPath(); ctx.arc(X + bx * T + Math.cos(a) * T * 0.24, Y + by * T + Math.sin(a) * T * 0.24, T * 0.05, 0, Math.PI * 2); ctx.fill();
      }
      sprTree(X + bx * T, Y + by * T - T * 0.04, T * 0.17, treeColor(x + n, y));
    });
    // Bänke
    ctx.fillStyle = '#7f5539';
    ctx.fillRect(cx - T * 0.25, Y + T * 0.2, T * 0.5, T * 0.08);
    ctx.fillRect(cx - T * 0.25, Y + H - T * 0.28, T * 0.5, T * 0.08);
    ctx.fillRect(X + T * 0.2, cy - T * 0.25, T * 0.08, T * 0.5);
    ctx.fillRect(X + W - T * 0.28, cy - T * 0.25, T * 0.08, T * 0.5);
    // Brunnen: Becken, Wasser, Sockel und springende Fontänen
    const frozen = season().id === 'winter';
    ctx.fillStyle = 'rgba(20,30,20,0.25)';
    ctx.beginPath(); ctx.arc(cx + T * 0.08, cy + T * 0.1, T * 0.82, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#bfb5a8';
    ctx.beginPath(); ctx.arc(cx, cy, T * 0.82, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = frozen ? '#d7ecf4' : '#5fa8d3';
    ctx.beginPath(); ctx.arc(cx, cy, T * 0.68, 0, Math.PI * 2); ctx.fill();
    const time = performance.now() / 1000;
    if (!frozen) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = T * 0.02;
      for (let k = 0; k < 2; k++) {
        const rr = T * (0.32 + ((time * 0.35 + k * 0.5) % 1) * 0.34);
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.fillStyle = '#a39e93';
    ctx.beginPath(); ctx.arc(cx, cy, T * 0.24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cfc8bd';
    ctx.beginPath(); ctx.arc(cx, cy, T * 0.15, 0, Math.PI * 2); ctx.fill();
    if (!frozen) {
      ctx.fillStyle = 'rgba(230,245,255,0.9)';
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4 + time * 0.3;
        const p = (time * 1.2 + k * 0.13) % 1;                // Tropfen fliegen nach außen
        const d = T * (0.12 + p * 0.4), lift = Math.sin(p * Math.PI) * T * 0.25;
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d - lift, T * 0.035, 0, Math.PI * 2); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(cx, cy - T * 0.12 - Math.abs(Math.sin(time * 3)) * T * 0.06, T * 0.06, 0, Math.PI * 2); ctx.fill();
    }
  },
  cathedral(X, Y, W, H) {
    sprGround(X, Y, W, H, '#d6ccc2', T * 0.2);
    const cx = X + W / 2;
    sprShadow(X + T * 0.3, Y + T * 0.25, W - T * 0.6, H - T * 0.45, T * 0.1);
    // Kreuzförmiges Dach: Langhaus senkrecht, Querhaus waagerecht
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(cx - T * 0.55, Y + T * 0.25, T * 1.1, H - T * 0.9);
    ctx.fillRect(X + T * 0.3, Y + T * 0.85, W - T * 0.6, T * 0.8);
    ctx.fillStyle = '#5c677d';
    ctx.fillRect(cx - T * 0.55, Y + T * 0.25, T * 0.55, H - T * 0.9);
    ctx.fillRect(X + T * 0.3, Y + T * 0.85, W - T * 0.6, T * 0.4);
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(cx - T * 0.02, Y + T * 0.25, T * 0.04, H - T * 0.9);
    // Fassade mit Rosette und zwei Türmen
    ctx.fillStyle = '#e9dcc9';
    ctx.fillRect(cx - T * 0.8, Y + H - T * 0.75, T * 1.6, T * 0.6);
    ctx.fillStyle = '#c1121f';
    ctx.beginPath(); ctx.arc(cx, Y + H - T * 0.52, T * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(cx, Y + H - T * 0.52, T * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(cx - T * 0.1, Y + H - T * 0.34, T * 0.2, T * 0.2);
    [-0.8, 0.5].forEach(dx => {
      const tx = cx + dx * T, ty = Y + H - T * 1.05;
      ctx.fillStyle = '#e9dcc9'; ctx.fillRect(tx, ty, T * 0.3, T * 0.9);
      ctx.fillStyle = '#4a5568';
      ctx.beginPath(); ctx.moveTo(tx - T * 0.04, ty); ctx.lineTo(tx + T * 0.15, ty - T * 0.4); ctx.lineTo(tx + T * 0.34, ty); ctx.fill();
      ctx.fillStyle = '#ffd77a'; ctx.fillRect(tx + T * 0.1, ty + T * 0.2, T * 0.1, T * 0.16);
    });
  },
  sheepfarm(X, Y, W, H, x, y) {
    sprGround(X, Y, W, H, season().id === 'winter' ? '#e8eef0' : '#a7d48b', T * 0.12);
    ctx.strokeStyle = '#8b5e3c'; ctx.lineWidth = T * 0.03;
    roundRect(X + T * 0.08, Y + T * 0.08, W - T * 0.16, H - T * 0.16, T * 0.08); ctx.stroke();
    sprHouse(X + W - T * 0.95, Y + T * 0.02, T * 0.9, T * 0.85, { roof: ['#7f5539', '#9c6644'], wall: '#d6b98c', windows: 0, inset: T * 0.1 });
    const time = performance.now() / 1000;
    for (let k = 0; k < 5; k++) {   // Schafe grasen und bewegen sich ein wenig
      const sx = X + T * (0.35 + 1.1 * tileHash(x, y, k + 50)) + Math.sin(time * 0.3 + k) * T * 0.08;
      const sy = Y + T * (0.9 + 0.8 * tileHash(x, y, k + 60));
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(sx + T * 0.03, sy + T * 0.06, T * 0.13, T * 0.07, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fbfbf8';
      ctx.beginPath(); ctx.ellipse(sx, sy, T * 0.13, T * 0.09, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(sx + T * 0.12, sy - T * 0.02, T * 0.045, 0, Math.PI * 2); ctx.fill();
    }
  },
  mine(X, Y, W, H, x, y) {
    sprGround(X, Y, W, H, '#a39e93');
    // Stolleneingang mit Holzrahmen und Schienen
    ctx.fillStyle = '#7d776d';
    ctx.beginPath(); ctx.moveTo(X + T * 0.05, Y + T * 0.7); ctx.lineTo(X + T * 0.5, Y + T * 0.05); ctx.lineTo(X + T * 0.95, Y + T * 0.7); ctx.fill();
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath(); ctx.moveTo(X + T * 0.3, Y + T * 0.7); ctx.lineTo(X + T * 0.3, Y + T * 0.45); ctx.arc(X + T * 0.5, Y + T * 0.45, T * 0.2, Math.PI, 0); ctx.lineTo(X + T * 0.7, Y + T * 0.7); ctx.fill();
    ctx.strokeStyle = '#8b5e3c'; ctx.lineWidth = T * 0.06;
    ctx.beginPath(); ctx.moveTo(X + T * 0.28, Y + T * 0.72); ctx.lineTo(X + T * 0.28, Y + T * 0.38); ctx.lineTo(X + T * 0.72, Y + T * 0.38); ctx.lineTo(X + T * 0.72, Y + T * 0.72); ctx.stroke();
    ctx.strokeStyle = '#5c5c5c'; ctx.lineWidth = T * 0.02;
    ctx.beginPath(); ctx.moveTo(X + T * 0.42, Y + T * 0.7); ctx.lineTo(X + T * 0.38, Y + T * 0.95); ctx.moveTo(X + T * 0.58, Y + T * 0.7); ctx.lineTo(X + T * 0.62, Y + T * 0.95); ctx.stroke();
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(X + T * 0.62, Y + T * 0.74, T * 0.26, T * 0.14);
    ctx.fillStyle = '#4a4e69';
    ctx.beginPath(); ctx.arc(X + T * 0.69, Y + T * 0.74, T * 0.05, 0, Math.PI * 2); ctx.arc(X + T * 0.8, Y + T * 0.73, T * 0.05, 0, Math.PI * 2); ctx.fill();
  },
  brewery(X, Y, W, H) {
    sprGround(X, Y, W, H, '#e3cfae');
    sprHouse(X, Y, T * 1.25, H, { roof: ['#5e503f', '#7a6852'], wall: '#efe0c8', windows: 1, windowColor: '#ffd77a', inset: T * 0.1, chimney: 0.25, doorAt: 0.65 });
    for (let k = 0; k < 3; k++) {   // Fässer
      const bx = X + T * (1.42 + (k % 2) * 0.24), by = Y + T * (0.35 + Math.floor(k / 2) * 0.3 + (k === 2 ? 0 : 0));
      ctx.fillStyle = '#8b5e3c';
      ctx.beginPath(); ctx.arc(bx, by + (k === 2 ? 0.3 * T : 0), T * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#4a3222'; ctx.lineWidth = T * 0.02;
      ctx.beginPath(); ctx.arc(bx, by + (k === 2 ? 0.3 * T : 0), T * 0.08, 0, Math.PI * 2); ctx.stroke();
    }
  },
  weaver(X, Y, W, H) {
    const r = sprHouse(X, Y, W, H, { roof: ['#6d597a', '#8a7397'], wall: '#f2e8cf', windows: 1, inset: T * 0.12, doorAt: 0.68 });
    // Stoffbahnen zum Trocknen
    const colors = ['#e63946', '#457b9d', '#e9c46a'];
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = T * 0.015;
    ctx.beginPath(); ctx.moveTo(r.x0, r.y0 + T * 0.02); ctx.lineTo(r.x1, r.y0 + T * 0.02); ctx.stroke();
    colors.forEach((c, k) => { ctx.fillStyle = c; ctx.fillRect(r.x0 + T * (0.06 + k * 0.22), r.y0 + T * 0.02, T * 0.14, T * 0.2); });
  },
  smithy(X, Y, W, H) {
    const r = sprHouse(X, Y, W, H, { roof: ['#3d405b', '#565a7a'], wall: '#9a8c98', windows: 0, inset: T * 0.1, chimney: 0.2, doorAt: 0.3 });
    // Esse glüht, Amboss davor
    const glowA = 0.6 + 0.3 * Math.sin(performance.now() / 200);
    ctx.fillStyle = `rgba(255, 140, 40, ${glowA})`;
    ctx.fillRect(r.x1 - T * 0.32, r.eave + T * 0.06, T * 0.2, T * 0.14);
    ctx.fillStyle = '#343a40';
    ctx.fillRect(r.x1 - T * 0.36, r.y1 - T * 0.02, T * 0.24, T * 0.06);
    ctx.fillRect(r.x1 - T * 0.3, r.y1 - T * 0.06, T * 0.12, T * 0.05);
  },
  fishery(X, Y, W, H, x, y) {
    // Steg zum Wasser hin
    const dirs = [[0, 1], [1, 0], [-1, 0], [0, -1]];
    const water = dirs.find(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < N && y + dy < N && terrainAt(x + dx, y + dy) === TERRAIN_ID.water);
    if (water) {
      const [dx, dy] = water;
      ctx.fillStyle = '#a47148';
      const len = T * 0.75, wid = T * 0.18;
      const sx = X + W / 2 + (dx ? dx * T * 0.3 : -wid / 2), sy = Y + H / 2 + (dy ? dy * T * 0.3 : -wid / 2);
      ctx.fillRect(dx < 0 ? sx - len : sx, dy < 0 ? sy - len : sy, dx ? len : wid, dy ? len : wid);
      // kleines Boot
      ctx.fillStyle = '#8d5524';
      const bx = X + W / 2 + dx * T * 0.85 + dy * T * 0.25, by = Y + H / 2 + dy * T * 0.85 + dx * T * 0.25;
      ctx.beginPath(); ctx.ellipse(bx, by, T * 0.16, T * 0.07, dx ? Math.PI / 2 : 0, 0, Math.PI * 2); ctx.fill();
    }
    const r = sprHouse(X, Y, W, H, { roof: ['#5c677d', '#76829a'], wall: '#b08968', windows: 1, inset: T * 0.14, doorAt: 0.7 });
    // Fische zum Trocknen
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = T * 0.015;
    ctx.beginPath(); ctx.moveTo(r.x0, r.y0 - T * 0.02); ctx.lineTo(r.x1, r.y0 - T * 0.02); ctx.stroke();
    ctx.fillStyle = '#adb5bd';
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(r.x0 + T * (0.12 + k * 0.17), r.y0 + T * 0.04, T * 0.03, T * 0.06, 0, 0, Math.PI * 2); ctx.fill(); }
  },
};

// Brücke: Holzplanken über dem Wasser, quer zur Fahrtrichtung
function drawBridge(x, y, alpha) {
  const X = x * T, Y = y * T;
  const road = (dx, dy) => { const n = getCell(x + dx, y + dy); return n && BUILDINGS[n.type].isRoad; };
  const horizontal = road(-1, 0) || road(1, 0) || !(road(0, -1) || road(0, 1)) && terrainAt(x, y - 1) === TERRAIN_ID.water;
  ctx.globalAlpha = alpha;
  ctx.save();
  if (!horizontal) { ctx.translate(X + T / 2, Y + T / 2); ctx.rotate(Math.PI / 2); ctx.translate(-X - T / 2, -Y - T / 2); }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(X, Y + T * 0.3, T, T * 0.5);
  ctx.fillStyle = '#a47148';
  ctx.fillRect(X - T * 0.02, Y + T * 0.22, T * 1.04, T * 0.56);
  ctx.strokeStyle = '#7f5539'; ctx.lineWidth = T * 0.02;
  ctx.beginPath();
  for (let k = 1; k < 6; k++) { ctx.moveTo(X + k * T / 6, Y + T * 0.22); ctx.lineTo(X + k * T / 6, Y + T * 0.78); }
  ctx.stroke();
  ctx.fillStyle = '#6b4226';   // Geländer
  ctx.fillRect(X - T * 0.02, Y + T * 0.18, T * 1.04, T * 0.06);
  ctx.fillRect(X - T * 0.02, Y + T * 0.76, T * 1.04, T * 0.06);
  ctx.restore();
  ctx.globalAlpha = 1;
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
  const price = plotPrice();
  const affordable = canAfford(price);
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
      const text = `🏷️ ${formatAmounts(price)}`;
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

// ---------- Menschen ----------
// Kleine Figuren in Schrägansicht: Beine, Hemd, Arme, Kopf mit Haaren. Arbeiter zeigen ihre Tätigkeit.

const SKIN_COLORS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
const HAIR_COLORS = ['#3b2a1a', '#6b4423', '#d9a441', '#1f1f1f', '#a0522d', '#cfcfcf'];
const PANTS_COLORS = ['#4a3b2f', '#3d5a80', '#5c5c5c', '#6b4f3a'];
// Hemdfarbe je Beruf (Arbeiter, Händler, Gelehrte) – Spaziergänger tragen bunte Kleidung
const JOB_COLORS = { worker: '#f4a261', trader: '#4dabf7', scholar: '#b197fc' };

// Tätigkeit je Gebäude: hoe = hacken, fish = angeln, saw = sägen, pick = Spitzhacke, axe = Axt, hammer = hämmern,
// read = lesen, carry = Kiste tragen, staff = mit Hirtenstab gehen, walk = umhergehen
const WORK_STYLE = {
  farm: 'hoe', fishery: 'fish', sawmill: 'saw', carpentry: 'saw', quarry: 'pick', mine: 'pick',
  smithy: 'hammer', brickworks: 'hammer', sheepfarm: 'staff', market: 'carry', warehouse: 'carry',
  bakery: 'carry', brewery: 'carry', weaver: 'read', woodcutter: 'axe', stonecutter: 'pick', gatherer: 'carry', hunter: 'staff',
  coalmine: 'pick', steelworks: 'hammer', factory: 'hammer', station: 'carry', police: 'walk', powerplant: 'walk',
  solarpark: 'walk', concreteworks: 'carry', electronicsworks: 'read', supermarket: 'carry', university: 'read', stadium: 'walk', scriptorium: 'read', school: 'read', library: 'read', townhall: 'read',
};
const WALKING_STYLES = new Set(['walk', 'carry', 'staff']);

function personLook(seed) {
  const pick = (list, k) => list[Math.floor(tileHash(seed, k, 7) * list.length)];
  return { skin: pick(SKIN_COLORS, 1), hair: pick(HAIR_COLORS, 2), pants: pick(PANTS_COLORS, 3) };
}

// (x, y) = Fußpunkt in Weltpixeln. o: { shirt, skin, hair, pants, dir (−1/1), step (Laufschritt), tool, t (Zeit), toward {x, y} }
function drawPerson(x, y, o) {
  const u = T / 48;
  if (view.zoom < 0.5) {   // weit weg: nur ein Punkt
    ctx.fillStyle = o.shirt;
    ctx.beginPath();
    ctx.arc(x, y - 6 * u, 3.2 * u, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const dir = o.dir || 1;
  const walking = o.step !== undefined;
  const legSwing = walking ? Math.sin(o.step) * 2.2 * u : 0;
  const t = o.t || 0;
  // Schatten
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y, 4.2 * u, 1.6 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  // Beine
  ctx.lineCap = 'round';
  ctx.strokeStyle = o.pants;
  ctx.lineWidth = 1.9 * u;
  ctx.beginPath();
  ctx.moveTo(x - 1.2 * u, y - 5 * u); ctx.lineTo(x - 1.2 * u + legSwing, y - 0.4 * u);
  ctx.moveTo(x + 1.2 * u, y - 5 * u); ctx.lineTo(x + 1.2 * u - legSwing, y - 0.4 * u);
  ctx.stroke();
  // Körper
  const bend = o.tool === 'hoe' || o.tool === 'pick' || o.tool === 'axe' ? Math.max(0, Math.sin(t * 4)) * 1.2 * u * dir : 0;
  const bx = x + bend, by = y - 5 * u;
  ctx.fillStyle = o.shirt;
  roundRect(bx - 2.7 * u, by - 6.4 * u, 5.4 * u, 6.8 * u, 1.8 * u);
  ctx.fill();
  // Arme und Werkzeug
  const sx = bx + 1.8 * u * dir, sy = by - 5.4 * u;   // vordere Schulter
  let hx = sx + 1 * u * dir, hy = sy + 4.6 * u;        // Hand (hängend)
  ctx.strokeStyle = o.skin;
  ctx.lineWidth = 1.5 * u;
  const tool = o.tool;
  if (walking && !tool) hx = sx - Math.sin(o.step) * 1.6 * u;
  if (tool === 'hoe' || tool === 'pick' || tool === 'axe') {
    const a = -1.9 + (Math.sin(t * 4) + 1) * 0.9;            // schwingt von oben nach unten
    hx = sx + Math.cos(a) * 3.2 * u * dir; hy = sy + Math.sin(a) * 3.2 * u + 2 * u;
  } else if (tool === 'hammer') {
    const a = -1.6 + Math.max(0, Math.sin(t * 6)) * 1.5;
    hx = sx + Math.cos(a) * 3.4 * u * dir; hy = sy + Math.sin(a) * 3.4 * u + 1.5 * u;
  } else if (tool === 'saw') {
    hx = sx + (2.6 + Math.sin(t * 7) * 1.8) * u * dir; hy = sy + 3 * u;
  } else if (tool === 'fish' || tool === 'read' || tool === 'carry') {
    hx = sx + 2.6 * u * dir; hy = sy + 2.4 * u;
  }
  ctx.beginPath();
  ctx.moveTo(sx, sy); ctx.lineTo(hx, hy);
  ctx.moveTo(bx - 1.8 * u * dir, sy); ctx.lineTo(bx - 1.8 * u * dir + (tool ? 1.2 * u * dir : 0), sy + 4.4 * u);
  ctx.stroke();
  drawTool(tool, hx, hy, dir, t, u, o);
  // Kopf mit Haaren
  const hy0 = by - 8.6 * u;
  ctx.fillStyle = o.skin;
  ctx.beginPath();
  ctx.arc(bx, hy0, 2.7 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = o.hair;
  ctx.beginPath();
  ctx.arc(bx - 0.5 * u * dir, hy0 - 0.6 * u, 2.6 * u, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();
}

function drawTool(tool, hx, hy, dir, t, u, o) {
  if (!tool || tool === 'walk') return;
  ctx.lineCap = 'round';
  if (tool === 'hoe' || tool === 'pick' || tool === 'axe') {
    const a = -1.9 + (Math.sin(t * 4) + 1) * 0.9 + 0.5;
    const ex = hx + Math.cos(a) * 6 * u * dir, ey = hy + Math.sin(a) * 6 * u;
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 1.1 * u;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = '#9aa0a6';
    ctx.lineWidth = 1.4 * u;
    ctx.beginPath();
    if (tool === 'pick') { ctx.moveTo(ex - 2.4 * u, ey - 0.8 * u); ctx.quadraticCurveTo(ex, ey - 1.8 * u, ex + 2.4 * u, ey - 0.8 * u); }
    else if (tool === 'axe') { ctx.lineWidth = 2.4 * u; ctx.moveTo(ex, ey - 1 * u); ctx.lineTo(ex + 1.2 * u * dir, ey + 0.6 * u); }
    else { ctx.moveTo(ex, ey); ctx.lineTo(ex + 1.8 * u * dir, ey + 1.4 * u); }
    ctx.stroke();
  } else if (tool === 'hammer') {
    const a = -1.6 + Math.max(0, Math.sin(t * 6)) * 1.5 + 0.4;
    const ex = hx + Math.cos(a) * 3.5 * u * dir, ey = hy + Math.sin(a) * 3.5 * u;
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 1 * u;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = '#5c5f66';
    ctx.fillRect(ex - 1.6 * u, ey - 1 * u, 3.2 * u, 2 * u);
  } else if (tool === 'saw') {
    ctx.fillStyle = '#7f5539';                       // Baumstamm vor dem Arbeiter
    roundRect(hx - 1 * u * dir - 4 * u, hy + 2.5 * u, 8 * u, 2.4 * u, 1.2 * u);
    ctx.fill();
    ctx.strokeStyle = '#c0c4c8';
    ctx.lineWidth = 1.3 * u;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 4.5 * u * dir, hy + 2.6 * u); ctx.stroke();
  } else if (tool === 'fish') {
    // Angelrute zum Wasser, Schnur mit wippendem Schwimmer
    const tx = hx + (o.toward ? o.toward.x : dir) * 11 * u, ty = hy - 5 * u + (o.toward ? o.toward.y * 6 * u : 0);
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 0.9 * u;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
    const fx = tx + (o.toward ? o.toward.x : dir) * 2 * u, fy = ty + 9 * u + Math.sin(t * 3) * 0.8 * u;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 0.5 * u;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.fillStyle = '#e63946';
    ctx.beginPath(); ctx.arc(fx, fy, 1 * u, 0, Math.PI * 2); ctx.fill();
  } else if (tool === 'read') {
    ctx.fillStyle = '#7b2cbf';
    ctx.fillRect(hx - 1.8 * u, hy - 1.6 * u, 3.6 * u, 2.6 * u);
    ctx.fillStyle = '#fff';
    ctx.fillRect(hx - 1.4 * u, hy - 1.2 * u, 2.8 * u, 0.6 * u);
  } else if (tool === 'carry') {
    ctx.fillStyle = '#c08552';
    ctx.fillRect(hx - 2.2 * u, hy - 2.6 * u, 4.4 * u, 3.4 * u);
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 0.6 * u;
    ctx.strokeRect(hx - 2.2 * u, hy - 2.6 * u, 4.4 * u, 3.4 * u);
  } else if (tool === 'staff') {
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 1 * u;
    ctx.beginPath(); ctx.moveTo(hx, hy + 4.4 * u); ctx.lineTo(hx, hy - 7 * u); ctx.arc(hx + 1.2 * u, hy - 7 * u, 1.2 * u, Math.PI, 0); ctx.stroke();
  }
}

// Richtung zum nächsten Wasserfeld am Rand des Gebäudes (für Angler), sonst null
function waterSide(x, y, w, h) {
  for (const [px, py] of perimeterTiles(x, y, w, h)) {
    if (px >= 0 && py >= 0 && px < N && py < N && state.terrain[py * N + px] === TERRAIN_ID.water) {
      const dx = px + 0.5 - (x + w / 2), dy = py + 0.5 - (y + h / 2);
      const len = Math.hypot(dx, dy) || 1;
      return { x: dx / len, y: dy / len };
    }
  }
  return null;
}

// Beschäftigte arbeiten im Gebäude: stehen an ihrem Platz und zeigen die Tätigkeit oder gehen umher
function drawWorkers(vis) {
  if (view.zoom < 0.45) return;   // weit herausgezoomt nur störend
  const t = performance.now() / 1000;
  forEachVisible(vis, (cell, x, y) => {
    const job = jobOf(cell.type);
    if (!job || cell.fire || cell.build) return;
    const count = Math.min(stats.cellStaff.get(y * N + x) || 0, 10);
    const [w, h] = sizeOf(cell);
    const style = WORK_STYLE[cell.type] || 'walk';
    const water = style === 'fish' ? waterSide(x, y, w, h) : null;
    for (let n = 0; n < count; n++) {
      const seed = x * 131 + y * 17 + n * 7;
      const look = { ...personLook(seed), shirt: JOB_COLORS[job], t: t + n * 1.7, tool: style === 'walk' ? null : style };
      let px, py;
      if (WALKING_STYLES.has(style)) {
        // eigene, ruhige Bahn je Figur innerhalb des Gebäudes
        const k = (seed % 97);
        const a = t * (0.35 + (k % 5) * 0.06) + k;
        px = x + w / 2 + Math.cos(a) * (w / 2 - 0.25) * (0.5 + (k % 3) * 0.2);
        py = y + h / 2 + 0.3 + Math.sin(a * 1.3) * (h / 2 - 0.3) * (0.4 + (k % 4) * 0.12);
        look.dir = -Math.sin(a) >= 0 ? 1 : -1;
        look.step = t * 9 + n;
      } else if (water) {
        // Angler stehen am Ufer und halten die Rute übers Wasser
        px = x + w / 2 + water.x * (w / 2 - 0.15) + (n - (count - 1) / 2) * 0.35 * Math.abs(water.y);
        py = y + h / 2 + water.y * (h / 2 - 0.15) + 0.2 + (n - (count - 1) / 2) * 0.35 * Math.abs(water.x);
        look.dir = water.x < -0.1 ? -1 : 1;
        look.toward = water;
      } else {
        // fester Arbeitsplatz: verteilt auf die Felder (bei Farm und Sägewerk nicht im Gebäude oben links)
        const tiles = [];
        for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) tiles.push([dx, dy]);
        const usable = w * h > 1 && (cell.type === 'farm' || cell.type === 'sawmill') ? tiles.slice(1) : tiles;
        const [tx, ty] = usable[n % usable.length];
        const spread = Math.floor(n / usable.length);
        px = x + tx + 0.3 + tileHash(seed, 1, 3) * 0.4 + spread * 0.2;
        py = y + ty + (w * h > 1 ? 0.65 : 0.9) + tileHash(seed, 2, 3) * 0.15;
        look.dir = tileHash(seed, 3, 3) < 0.5 ? -1 : 1;
      }
      drawPerson(px * T, py * T, look);
    }
  });
}

function drawWalkers() {
  const t = performance.now() / 1000;
  for (const w of walkers) {
    const x = (w.fx + (w.tx - w.fx) * w.p + 0.5 + w.lane) * T;
    const y = (w.fy + (w.ty - w.fy) * w.p + 0.62 + w.lane) * T;
    w.look ||= personLook(Math.floor(w.lane * 1000 + w.speed * 777));
    drawPerson(x, y, { ...w.look, shirt: w.color, step: t * 9 * w.speed + w.lane * 40, dir: w.tx < w.fx ? -1 : 1 });
  }
}

// Aussehen der Straßen je Zeitalter: Trampelpfad, Pflaster, Asphalt mit Mittelstreifen
const ROAD_STYLES = {
  dirt:    { base: '#c4a272', edge: '#9a7a4c', mark: '#a88a5c' },
  cobble:  { base: '#b9b1a3', edge: '#6f675c', mark: '#9a9285' },
  asphalt: { base: '#5d5f63', edge: '#c9c4b8', mark: '#f1e9c9' },
};

function roadStyle() {
  return ROAD_STYLES[state.age >= 3 ? 'asphalt' : state.age >= 1 ? 'cobble' : 'dirt'];
}

// Straße: breiter Weg mit Rand, verbunden mit Nachbarstraßen; zu Gebäuden führt ein schmaler Weg bis zur Tür
function drawRoad(x, y, def, alpha) {
  const st = roadStyle();
  const w = T * 0.66, c = (T - w) / 2;
  const px = x * T, py = y * T;
  const entrance = stats.entrances.get(y * N + x) || 0;
  const linked = [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => {
    const n = getCell(x + dx, y + dy);
    return !!n && !!BUILDINGS[n.type].isRoad;
  });
  const [up, right, down, left] = linked;
  ctx.globalAlpha = alpha;
  // Fläche: Mitte plus Arme zu verbundenen Straßen
  ctx.fillStyle = st.base;
  ctx.fillRect(px + c, py + c, w, w);
  if (up) ctx.fillRect(px + c, py, w, c);
  if (down) ctx.fillRect(px + c, py + c + w, w, c);
  if (left) ctx.fillRect(px, py + c, c, w);
  if (right) ctx.fillRect(px + c + w, py + c, c, w);
  // Rand (Bordstein) an allen offenen Seiten
  ctx.fillStyle = st.edge;
  const e = T * 0.05;
  if (!up) ctx.fillRect(px + c, py + c, w, e);
  if (!down) ctx.fillRect(px + c, py + c + w - e, w, e);
  if (!left) ctx.fillRect(px + c, py + c, e, w);
  if (!right) ctx.fillRect(px + c + w - e, py + c, e, w);
  if (up) { ctx.fillRect(px + c, py, e, c); ctx.fillRect(px + c + w - e, py, e, c); }
  if (down) { ctx.fillRect(px + c, py + c + w, e, c); ctx.fillRect(px + c + w - e, py + c + w, e, c); }
  if (left) { ctx.fillRect(px, py + c, c, e); ctx.fillRect(px, py + c + w - e, c, e); }
  if (right) { ctx.fillRect(px + c + w, py + c, c, e); ctx.fillRect(px + c + w, py + c + w - e, c, e); }
  // Muster
  ctx.fillStyle = st.mark;
  if (st === ROAD_STYLES.asphalt) {
    // gestrichelte Mittellinie entlang gerader Stücke
    const d = T * 0.05;
    if (up || down) for (let k = 0; k < 2; k++) if (k ? down : up) ctx.fillRect(px + T / 2 - d / 2, py + (k ? T * 0.6 : T * 0.12), d, T * 0.28);
    if (left || right) for (let k = 0; k < 2; k++) if (k ? right : left) ctx.fillRect(px + (k ? T * 0.6 : T * 0.12), py + T / 2 - d / 2, T * 0.28, d);
  } else {
    // Pflastersteine bzw. Kiesel: kleine Flecken, je Feld fest verteilt
    const r = st === ROAD_STYLES.cobble ? T * 0.07 : T * 0.035;
    for (let k = 0; k < 6; k++) {
      const sx = px + c + e + tileHash(x, y, k) * (w - 2 * e - r), sy = py + c + e + tileHash(x, y, k + 9) * (w - 2 * e - r);
      ctx.fillRect(sx, sy, r, r * 0.8);
    }
  }
  // Wege zu Gebäudeeingängen
  ctx.fillStyle = st === ROAD_STYLES.asphalt ? '#b5b0a6' : st.base;
  const p = T * 0.3, q = (T - p) / 2;
  if (entrance & 1) ctx.fillRect(px + q, py, p, c + e);
  if (entrance & 4) ctx.fillRect(px + q, py + c + w - e, p, c + e);
  if (entrance & 8) ctx.fillRect(px, py + q, c + e, p);
  if (entrance & 2) ctx.fillRect(px + c + w - e, py + q, c + e, p);
  ctx.globalAlpha = 1;
}

// Türen: an der Seite des Gebäudes, an der seine Straße liegt (nach den Gebäuden gezeichnet)
function drawEntrances(vis) {
  const dw = T * 0.26, dh = T * 0.15;
  for (const [k, bits] of stats.entrances) {
    const x = k % N, y = Math.floor(k / N);
    if (x < vis.x0 - 1 || x > vis.x1 + 1 || y < vis.y0 - 1 || y > vis.y1 + 1) continue;
    for (const [bit, dx, dy] of [[1, 0, -1], [2, 1, 0], [4, 0, 1], [8, -1, 0]]) {
      if (!(bits & bit)) continue;
      const cell = getCell(x + dx, y + dy);
      if (!cell || cell.build || buildingImage(cell.type)) continue;   // Bilder haben schon einen Eingang
      // Mitte der Kante zwischen Straßenfeld und Gebäude, Tür ragt ins Gebäude hinein
      const ex = (x + 0.5 + dx * 0.5) * T, ey = (y + 0.5 + dy * 0.5) * T;
      const horizontal = dy !== 0;
      const rw = horizontal ? dw : dh, rh = horizontal ? dh : dw;
      const rx = ex - rw / 2 + (horizontal ? 0 : dx * rw / 2), ry = ey - rh / 2 + (horizontal ? dy * rh / 2 : 0);
      ctx.fillStyle = '#f2e3c2';
      ctx.fillRect(rx - T * 0.03, ry - T * 0.03, rw + T * 0.06, rh + T * 0.06);
      ctx.fillStyle = '#6b3f1d';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.fillStyle = '#e9c46a';   // Türknauf
      ctx.fillRect(rx + rw * (horizontal ? 0.7 : 0.35), ry + rh * (horizontal ? 0.35 : 0.7), T * 0.03, T * 0.03);
    }
  }
}

// Tor: Durchfahrt mit zwei Türmchen und offenen Torflügeln, quer zur Mauer
function drawGate(x, y, alpha) {
  drawRoad(x, y, BUILDINGS.road, alpha);
  const wallAt = (dx, dy) => { const n = getCell(x + dx, y + dy); return n && BUILDINGS[n.type].isWall && !BUILDINGS[n.type].isGate; };
  const alongX = wallAt(-1, 0) || wallAt(1, 0) || !(wallAt(0, -1) || wallAt(0, 1));   // Mauer verläuft waagrecht
  const px = x * T, py = y * T, s = T * 0.24, m = T * 0.22;
  ctx.globalAlpha = alpha;
  const rect = (ax, ay, aw, ah) => (alongX ? ctx.fillRect(px + ax, py + ay, aw, ah) : ctx.fillRect(px + ay, py + ax, ah, aw));
  ctx.fillStyle = '#7d7468';
  rect(0, m, s, T - 2 * m);            // Türmchen links/oben
  rect(T - s, m, s, T - 2 * m);        // Türmchen rechts/unten
  ctx.fillStyle = '#5c544a';
  rect(0, m, T, T * 0.08);             // Torbogen
  rect(0, m, s * 0.45, s * 0.45);      // Zinnen
  rect(T - s * 0.45, m, s * 0.45, s * 0.45);
  ctx.fillStyle = '#8d5a2b';           // offene Torflügel
  rect(s, m + T * 0.08, T * 0.07, T * 0.3);
  rect(T - s - T * 0.07, m + T * 0.08, T * 0.07, T * 0.3);
  ctx.globalAlpha = 1;
  drawWallDamage(x, y);
}

// Risse und Lebensbalken an beschädigten Mauern
function drawWallDamage(x, y) {
  const cell = getCell(x, y);
  if (!cell || cell.hp === undefined) return;
  const share = clamp(cell.hp / wallMaxHp(cell), 0, 1);
  const px = x * T, py = y * T;
  ctx.strokeStyle = 'rgba(30, 20, 10, 0.75)';
  ctx.lineWidth = T * 0.03;
  ctx.beginPath();
  ctx.moveTo(px + T * 0.35, py + T * 0.3); ctx.lineTo(px + T * 0.5, py + T * 0.5); ctx.lineTo(px + T * 0.42, py + T * 0.7);
  if (share < 0.5) { ctx.moveTo(px + T * 0.5, py + T * 0.5); ctx.lineTo(px + T * 0.66, py + T * 0.58); }
  ctx.stroke();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(px + T * 0.1, py + T * 0.04, T * 0.8, T * 0.1);
  ctx.fillStyle = share > 0.5 ? '#95d5b2' : share > 0.25 ? '#ffd166' : '#e63946';
  ctx.fillRect(px + T * 0.12, py + T * 0.06, T * 0.76 * share, T * 0.06);
}

// Mauerstück: dicker Steinstrang mit Zinnen, verbunden mit Nachbarmauern
function drawWall(x, y, alpha) {
  const w = T * 0.46, c = (T - w) / 2, px = x * T, py = y * T;
  const isWallAt = (dx, dy) => { const n = getCell(x + dx, y + dy); return n && BUILDINGS[n.type].isWall; };
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#7d7468';
  ctx.fillRect(px + c, py + c, w, w);
  if (isWallAt(0, -1)) ctx.fillRect(px + c, py, w, c);
  if (isWallAt(1, 0)) ctx.fillRect(px + c + w, py + c, c, w);
  if (isWallAt(0, 1)) ctx.fillRect(px + c, py + c + w, w, c);
  if (isWallAt(-1, 0)) ctx.fillRect(px, py + c, c, w);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';   // helle Mauerkrone
  ctx.fillRect(px + c + T * 0.06, py + c + T * 0.06, w - T * 0.12, w - T * 0.12);
  ctx.fillStyle = '#5c544a';   // Zinnen
  const z = T * 0.13;
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
    // Rechtsklick: Baumodus, Verschieben bzw. Fenster schließen
    if (moveMode) cancelMove();
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
    } else if (e.button !== 1 && pending && pendingContains(screenToTile(p.x, p.y).x, screenToTile(p.x, p.y).y)) {
      // Vorschau anfassen und verschieben
      const t = screenToTile(p.x, p.y);
      paint = { last: t, started: false, ghost: { dx: t.x - pending.x, dy: t.y - pending.y } };
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
  if (paint.ghost) {
    paint.started = true;
    tapStart = null;
    if (pending) setPending(tile.x - paint.ghost.dx, tile.y - paint.ghost.dy);
    paint.last = tile;
    return;
  }
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
  let prev = paint.last;
  for (const t of tileLine(paint.last, tile)) {
    const from = prev;
    prev = t;
    if (getCell(t.x, t.y) !== null) {
      // Tor nur, wo der Zug die Mauer bzw. Straße kreuzt – nicht, wenn man an ihr entlangzieht
      const ahead = getCell(2 * t.x - from.x, 2 * t.y - from.y);
      const along = ahead && ahead.type === getCell(t.x, t.y).type;
      if (!along && makesGate(t.x, t.y, selectedType) && !placeBuilding(t.x, t.y, selectedType)) break;
      continue;
    }
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
  if (e.key === ' ') {
    e.preventDefault();
    setSpeed(gameSpeed === 0 ? 1 : 0);
    return;
  }
  if (e.key === '+') { setSpeed(gameSpeed + 1); return; }
  if (e.key === '-') { setSpeed(gameSpeed - 1); return; }
  if (e.key === 'r' || e.key === 'R') {
    if (moveMode) { moveMode.rotated = !moveMode.rotated; return; }
    if (selectedType) { toggleBuildRotation(); return; }
  }
  if (e.key === 'Enter' && pending) { confirmPending(); return; }
  if (e.key === 'Escape') {
    if (moveMode) { cancelMove(); return; }
    if (pending) { clearPending(); return; }
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
  if (moveMode) {
    moveBuildingTo(x, y);
    return;
  }
  if (demolishMode) {
    if (cell) markForDemolish(x, y);
    updateDemolishBar();
    return;
  }
  if (cell && selectedType && makesGate(x, y, selectedType)) {
    placeBuilding(x, y, selectedType);
    return;
  }
  if (cell) {
    if (!cell.build && !cell.fire) playBuildingSound(cell.type);
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
  if (cell === null && selectedType && BUILDINGS[selectedType].dragBuild) placeBuilding(x, y, selectedType);
  else if (cell === null && selectedType) {
    if (!pendingContains(x, y)) setPending(x, y);   // Vorschau hinstellen bzw. umsetzen
  } else if (cell === null && terrainAt(x, y)) {
    const t = TERRAIN[terrainAt(x, y)];
    showToast(`${t.icon} ${t.name}: ${t.text}`, 4000);
  }
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

// Geräusch beim Antippen eines Gebäudes (selbst erzeugt, keine Tondateien)
const BUILDING_SOUNDS = {
  // Säge: rhythmisches Rauschen hin und her
  saw: s => [0, 1, 2, 3].forEach(i => s.noise(0.16, { vol: 0.22, freq: i % 2 ? 2600 : 1800, to: i % 2 ? 1800 : 2600, filter: 'bandpass', delay: i * 0.18 })),
  // Hammer auf Amboss: heller Klang mit Nachhall
  anvil: s => [0, 0.32].forEach(d => { s.tone(1250, 0.5, { type: 'triangle', vol: 0.2, delay: d }); s.tone(3100, 0.25, { vol: 0.08, delay: d }); s.noise(0.05, { vol: 0.25, freq: 4000, filter: 'highpass', delay: d }); }),
  // Spitzhacke auf Stein
  pick: s => [0, 0.28, 0.56].forEach(d => { s.noise(0.07, { vol: 0.3, freq: 2200, filter: 'bandpass', delay: d }); s.tone(520, 0.08, { type: 'square', vol: 0.05, delay: d }); }),
  // Hacke und Wind auf dem Feld, dazu ein Vogel
  field: s => { s.noise(0.9, { vol: 0.12, freq: 600, to: 300 }); [0, 0.12, 0.5].forEach((d, i) => s.tone(i === 2 ? 2600 : 3000, 0.09, { vol: 0.07, to: i === 2 ? 2000 : 3600, delay: 0.3 + d })); },
  // Wasser plätschert, Schwimmer taucht ein
  water: s => { s.noise(0.5, { vol: 0.25, freq: 1400, to: 300 }); [0.2, 0.32, 0.41].forEach(d => s.tone(500 + d * 900, 0.08, { vol: 0.08, to: 900, delay: d })); },
  // Schaf: „Mäh“ mit Zittern
  sheep: s => [0, 0.06, 0.12, 0.18, 0.24, 0.3].forEach((d, i) => s.tone(i % 2 ? 330 : 345, 0.09, { type: 'sawtooth', vol: 0.07, delay: d })),
  // Münzen klimpern
  market: s => [0, 0.07, 0.15, 0.2].forEach((d, i) => s.tone([NOTE.E5 * 2, NOTE.B5 * 2, NOTE.G5 * 2, NOTE.C6 * 2][i], 0.18, { vol: 0.07, delay: d })),
  // Kisten werden abgesetzt
  crates: s => [0, 0.22].forEach(d => { s.tone(140, 0.12, { type: 'triangle', vol: 0.3, to: 70, delay: d }); s.noise(0.06, { vol: 0.15, freq: 700, delay: d }); }),
  // Feuer im Ofen knistert
  oven: s => { s.noise(0.7, { vol: 0.12, freq: 500 }); [0.05, 0.2, 0.33, 0.5].forEach(d => s.noise(0.03, { vol: 0.3, freq: 3500, filter: 'highpass', delay: d })); },
  // Blubbern im Braukessel
  bubbles: s => [0, 0.11, 0.25, 0.33, 0.46].forEach((d, i) => s.tone(180 + i * 40, 0.1, { vol: 0.15, to: 420 + i * 60, delay: d })),
  // Webstuhl klappert
  loom: s => [0, 0.2, 0.4].forEach(d => { s.tone(300, 0.05, { type: 'square', vol: 0.08, delay: d }); s.tone(220, 0.05, { type: 'square', vol: 0.06, delay: d + 0.09 }); }),
  // Glocke (Schule klein, Kathedrale groß)
  bell: s => [NOTE.G5, NOTE.E5].forEach((f, i) => { s.tone(f, 0.9, { vol: 0.12, delay: i * 0.35 }); s.tone(f * 2.4, 0.5, { vol: 0.04, delay: i * 0.35 }); }),
  bigbell: s => [0, 0.9].forEach(d => { s.tone(NOTE.C4, 2, { vol: 0.2, delay: d }); s.tone(NOTE.C4 * 2.5, 1.2, { vol: 0.06, delay: d }); s.tone(NOTE.C4 * 1.5, 1.5, { vol: 0.05, delay: d }); }),
  // Seiten umblättern
  pages: s => [0, 0.25].forEach(d => s.noise(0.15, { vol: 0.12, freq: 4000, to: 1500, filter: 'highpass', delay: d })),
  // Anklopfen an der Haustür
  door: s => [0, 0.14].forEach(d => s.tone(180, 0.07, { type: 'triangle', vol: 0.35, to: 120, delay: d })),
  // Wasser im Brunnen
  well: s => { s.noise(1, { vol: 0.12, freq: 2500, to: 900, filter: 'bandpass' }); s.tone(700, 0.15, { vol: 0.06, to: 1100, delay: 0.4 }); },
  // Rüstung klirrt, Horn der Wache
  guard: s => { s.tone(NOTE.G3, 0.5, { type: 'sawtooth', vol: 0.06 }); s.tone(NOTE.D4, 0.6, { type: 'sawtooth', vol: 0.06, delay: 0.25 }); },
  // Dampfpfeife des Zuges
  train: s => { s.tone(NOTE.A4, 0.6, { type: 'sawtooth', vol: 0.06 }); s.tone(NOTE.C5, 0.6, { type: 'sawtooth', vol: 0.05 }); [0.7, 0.9, 1.1].forEach(d => s.noise(0.12, { vol: 0.2, freq: 900, delay: d })); },
  // Polizei-Pfeife
  siren: s => [0, 0.25].forEach(d => s.tone(2200, 0.18, { type: 'square', vol: 0.05, to: 2500, delay: d })),
  // Brummen des Kraftwerks
  hum: s => { s.tone(60, 0.9, { type: 'sawtooth', vol: 0.12 }); s.tone(120, 0.9, { vol: 0.06 }); },
  // Piepen von Geräten
  beep: s => [0, 0.15, 0.3].forEach((d, i) => s.tone(1400 + i * 300, 0.08, { type: 'square', vol: 0.05, delay: d })),
  // Jubel im Stadion
  crowd: s => { s.noise(1.2, { vol: 0.25, freq: 1200, to: 700, filter: 'bandpass' }); s.tone(NOTE.C5, 0.3, { type: 'triangle', vol: 0.06, delay: 0.3 }); },
  // Flugzeug startet
  plane: s => s.noise(1.5, { vol: 0.3, freq: 300, to: 2500, filter: 'bandpass' }),
  // Axt im Holz
  chop: s => [0, 0.35].forEach(d => { s.tone(220, 0.1, { type: 'triangle', vol: 0.35, to: 90, delay: d }); s.noise(0.08, { vol: 0.2, freq: 1200, filter: 'bandpass', delay: d }); }),
  // Vögel im Park
  birds: s => [0, 0.15, 0.3, 0.7, 0.82].forEach((d, i) => s.tone(2600 + (i % 3) * 400, 0.08, { vol: 0.06, to: 3400 + (i % 2) * 500, delay: d })),
};

const BUILDING_SOUND = {
  sawmill: 'saw', carpentry: 'saw', smithy: 'anvil', quarry: 'pick', mine: 'pick', farm: 'field', fishery: 'water',
  sheepfarm: 'sheep', market: 'market', warehouse: 'crates', bakery: 'oven', brickworks: 'oven', brewery: 'bubbles',
  weaver: 'loom', school: 'bell', firestation: 'bell', cathedral: 'bigbell', townhall: 'bigbell', scriptorium: 'pages',
  library: 'pages', house: 'door', hut: 'door', painter: 'pages', watertrough: 'well',
  coalmine: 'pick', steelworks: 'anvil', factory: 'anvil', tenement: 'door', station: 'train', police: 'siren', clocktower: 'bigbell',
  powerplant: 'hum', solarpark: 'birds', concreteworks: 'crates', electronicsworks: 'beep', highrise: 'door', supermarket: 'market',
  university: 'bell', stadium: 'crowd', airport: 'plane', gatherer: 'birds', hunter: 'guard', woodcutter: 'chop', stonecutter: 'pick', fireplace: 'oven', well: 'well', plaza: 'well', guard: 'guard', tower: 'guard', park: 'birds', hospital: 'pages',
};

function playBuildingSound(type) {
  const name = BUILDING_SOUND[type];
  if (!name || !settings.sfx || !sound.ctx || sound.ctx.state !== 'running') return;
  const now = performance.now();
  if (now - (sound.lastPlayed.building || 0) < 400) return;   // schnelles Tippen nicht überlagern
  sound.lastPlayed.building = now;
  BUILDING_SOUNDS[name](sound);
}

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

// Gebäude eines Reiters – aus späteren Zeitaltern nur das nächste (als Vorschau, gesperrt)
function categoryTypes(cat) {
  return Object.keys(BUILDINGS).filter(type => BUILDINGS[type].category === cat && (BUILDINGS[type].age || 0) <= state.age + 1 &&
    !(BUILDINGS[type].evolvesTo && isUnlocked(BUILDINGS[type].evolvesTo)));
}

// Gebäude, die sich weiterentwickeln (Wassertrog → Feuerwache), wandeln sich um, sobald das Ziel freigeschaltet ist.
// Gibt die Zahl der umgewandelten Gebäude je Art zurück.
function evolveBuildings() {
  const changed = {};
  state.grid.forEach(cell => {
    const to = cell && BUILDINGS[cell.type].evolvesTo;
    if (!to || !isUnlocked(to)) return;
    changed[cell.type] = (changed[cell.type] || 0) + 1;
    cell.type = to;
    cell.timer = 0;
    cell.builtAt = performance.now();
  });
  return changed;
}

function showCategory(cat) {
  if (cat === 'demolish') enterDemolishMode();
  else if (demolishMode) exitDemolishMode();
  currentCategory = cat;
  document.getElementById('buildbar').scrollLeft = 0;
  document.getElementById('buildbar').scrollTop = 0;
  refreshBuildButtons();
}

// Knöpfe des offenen Reiters auffrischen (z. B. nach dem Aufstieg) – ohne Moduswechsel und ohne an den Anfang zu springen
function refreshBuildButtons() {
  const cat = currentCategory;
  const visible = new Set(categoryTypes(cat));
  for (const [type, btn] of Object.entries(buildButtons)) {
    btn.classList.toggle('hidden', !visible.has(type));
  }
  for (const type of visible) if (isUnlocked(type)) seenUnlocked.add(type);
  for (const type of visible) {   // Bild statt Symbol, wenn es eins gibt (wechselt mit dem Zeitalter)
    const src = buildingImageSrc(type);
    const icon = buildButtons[type].querySelector('.icon');
    if (src && icon.dataset.src !== src) {
      icon.dataset.src = src;
      icon.innerHTML = `<img src="${src}" alt="">`;
    }
  }
  updateCategoryTabs();
  fitBuildLabels();
}

// Passt ein Name in der Bauleiste nicht ganz hinein, zeigt die ganze Reihe nur Bilder
// (Kosten und Beschreibung stehen dann in der Kurzinfo nach dem Antippen)
function fitBuildLabels() {
  for (const row of ['#build-tabs .build-tab', '#buildbar .build-btn']) {
    const items = [...document.querySelectorAll(row)].filter(el => !el.classList.contains('hidden'));
    // Beim Nachmessen wird die Reihe kurz schmal – ohne Merken spränge sie jede Sekunde an den Anfang zurück
    const scroller = document.querySelector(row.split(' ')[0]);
    const scroll = scroller.scrollLeft, scrollTop = scroller.scrollTop;
    items.forEach(el => el.classList.remove('icon-only'));
    const tooLong = items.some(el => {
      const name = el.querySelector('.name');
      const cost = el.querySelector('.cost');
      return (name && name.scrollWidth > name.clientWidth + 1) ||
        (cost && cost.getBoundingClientRect().height > 30);   // Kosten brauchen mehr als zwei Zeilen
    });
    if (tooLong) items.forEach(el => el.classList.add('icon-only'));
    scroller.scrollLeft = scroll;
    scroller.scrollTop = scrollTop;
  }
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
  const statusWrap = document.getElementById('status');
  for (const id in RESOURCES) {
    addChip(id === 'money' ? statusWrap : resWrap, id, `${RESOURCES[id].name} – antippen für Produktion und Verbrauch`, () => showResourceInfo(id));
  }
  resourceEls.money.classList.add('money');
  addChip(statusWrap, 'population', 'Einwohner / Wohnplätze', showCityInfo);
  addChip(statusWrap, 'happiness', 'Zufriedenheit', showCityInfo);
  addChip(statusWrap, 'season', 'Jahreszeit', showCityInfo);

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
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && bar.scrollWidth > bar.clientWidth) {
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
  document.getElementById('ages-close').addEventListener('click', closeAges);
  // Der Aufbruch ins nächste Zeitalter steht oben in der Forschung
  document.getElementById('age-title').addEventListener('click', showResearch);
  document.getElementById('age-progress').addEventListener('click', showResearch);
  ageUpEl.addEventListener('click', e => {
    if (e.target.closest('[data-advance]')) advanceAge();
    if (e.target.closest('[data-ages]')) showAges();
  });
  document.getElementById('age-list').addEventListener('click', e => {
    if (e.target.closest('[data-advance]')) advanceAge();
  });
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
    if (e.target.closest('[data-action="raid"]') && raids.length) {
      const r = raids[0];
      panCameraToTile(Math.floor((r.x + r.tx) / 2), Math.floor((r.y + r.ty) / 2));
    }
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
  document.getElementById('info-rotate').addEventListener('click', () => {
    if (infoTile && infoClickAllowed()) rotateBuilding(infoTile.y * N + infoTile.x);
  });
  document.getElementById('info-move').addEventListener('click', () => {
    if (infoTile && infoClickAllowed()) startMove(infoTile.y * N + infoTile.x);
  });
  document.getElementById('place-bar').addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'rotate') toggleBuildRotation();
    if (act === 'cancel') clearPending();
    if (act === 'ok') confirmPending();
  });
  document.getElementById('move-bar').addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'rotate') { moveMode.rotated = !moveMode.rotated; sound.play('click'); }
    if (act === 'cancel') cancelMove();
  });
  document.getElementById('info-upgrade').addEventListener('click', () => {
    if (infoTile && infoClickAllowed()) upgradeBuilding(infoTile.x, infoTile.y);
  });
  document.getElementById('info-develop').addEventListener('click', () => {
    if (infoTile && infoClickAllowed()) developBuilding(infoTile.x, infoTile.y);
  });
  document.getElementById('info-action').addEventListener('click', () => {
    if (!infoClickAllowed()) return;
    if (infoMode === 'plot') buyPlot(infoPlot);
    else if (infoMode === 'camp') clearCamp(infoCamp);
    else if (infoMode === 'city') completeCity();
    else if (infoTile) extinguish(infoTile.x, infoTile.y);
  });
  document.getElementById('btn-speed').addEventListener('click', cycleSpeed);
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

// Kurze Zahl für die Leiste: 950 · 9,1k · 47k · 1,2M
function shortNumber(n) {
  n = Math.floor(n);
  if (n < 1000) return String(n);
  if (n < 10000) return (Math.floor(n / 100) / 10).toString().replace('.', ',') + 'k';
  if (n < 1e6) return Math.floor(n / 1000) + 'k';
  return (Math.floor(n / 1e5) / 10).toString().replace('.', ',') + 'M';
}

// Bilanz je Ressource (pro Minute) für die Trendpfeile – nur alle 2 Sekunden neu berechnet
const resourceTrend = {};
let trendAt = 0;

function updateTrends() {
  if (performance.now() - trendAt < 2000) return;
  trendAt = performance.now();
  for (const id in RESOURCES) {
    const f = resourceFlows(id);
    resourceTrend[id] = f.sources.reduce((a, e) => a + e.perMin, 0) - f.uses.reduce((a, e) => a + e.perMin, 0);
  }
}

function updateUI() {
  updateTrends();
  for (const id in RESOURCES) {
    const el = resourceEls[id];
    const r = RESOURCES[id];
    el.classList.toggle('hidden', !isResourceVisible(id));
    const net = resourceTrend[id] || 0;
    const trend = net > 0.5 ? '<span class="trend up">▲</span>' : net < -0.5 ? '<span class="trend down">▼</span>' : '';
    if (id === 'money') {
      el.innerHTML = `${r.icon} ${shortNumber(state.resources[id])}${trend}`;
      continue;
    }
    let bar = '';
    if (r.stored) {
      const cap = storageCap(id);
      const fill = clamp(state.resources[id] / cap, 0, 1);
      const full = state.resources[id] >= cap;
      el.classList.toggle('full', full);
      bar = `<i class="bar${fill > 0.8 ? ' high' : ''}" style="width:${Math.round(fill * 100)}%"></i>`;
      el.title = `${r.name} – Lager ${Math.floor(state.resources[id])} / ${cap}${full ? ' (voll!)' : ''} – antippen für Details`;
    }
    el.innerHTML = `<span>${r.icon} ${shortNumber(state.resources[id])}</span>${trend}${bar}`;
  }
  resourceEls.population.textContent = `👥 ${state.population}/${stats.capacity}`;
  resourceEls.happiness.textContent = `${happinessIcon(stats.happiness)} ${stats.happiness}`;
  updateAgeBar();
  resourceEls.season.textContent = `${season().icon} ${formatClock(seasonLeft())}`;
  resourceEls.season.title = `${season().name} – noch ${formatClock(seasonLeft())}`;
  resourceEls.season.classList.toggle('full', isFreezing());
  for (const [type, btn] of Object.entries(buildButtons)) {
    const def = BUILDINGS[type];
    const unlocked = isUnlocked(type);
    const built = !!def.landmark && countBuildings(type) > 0;
    btn.classList.toggle('selected', selectedType === type);
    btn.classList.toggle('locked', !unlocked || built);
    btn.classList.toggle('built', built);
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
  fitBuildLabels();
  if (pending) renderPlaceBar();
  if (infoMode) renderInfo();
  updateQuestUI();
  updateResearchUI();
  updateAgesUI();
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
  closeAges();
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
  closeAges();
}

// ---------- Zeitalter ----------

const agesEl = document.getElementById('ages');
let ageListKey = '';

function nextAge() {
  const next = AGES[state.age + 1];
  return next && next.ready !== false ? next : null;
}

// Pflichtgebäude eines Zeitalters: jedes muss einmal fertig stehen, bevor es weitergeht.
// Ausgenommen: Straßen/Brücken, Sehenswürdigkeiten, überholte Gebäude und solche, die besonderes Gelände brauchen.
function ageRequiredBuildings(age = state.age) {
  return Object.values(BUILDINGS).filter(d => (d.age || 0) === age && !d.isRoad && !d.landmark && !d.evolvesTo &&
    !d.nearTerrain && !d.onTerrain && !d.isGate).map(d => d.id);
}

// Forschungen eines Zeitalters – alle müssen fertig sein, bevor es weitergeht
function ageRequiredTechs(age = state.age) {
  return Object.keys(TECHS).filter(id => techAge(id) === age);
}

// Was fehlt noch für den Aufbruch ins nächste Zeitalter?
function ageChecklist() {
  const next = nextAge();
  if (!next) return null;
  const techs = ageRequiredTechs(), buildings = ageRequiredBuildings();
  return {
    next,
    techs, buildings,
    techsMissing: techs.filter(id => !state.techs.includes(id)),
    buildingsMissing: buildings.filter(type => countFinished(type) === 0),
    popOk: state.population >= (next.need?.population || 0),
  };
}

function canAdvanceAge() {
  const c = ageChecklist();
  return !!c && !state.ageUp && c.popOk && !c.techsMissing.length && !c.buildingsMissing.length;
}

// Aufbruch beginnen: dauert next.seconds, die Waren werden dabei nach und nach geliefert
// (so stört es nicht, wenn die Nahrung kurz unter die Kosten fällt)
function advanceAge() {
  const c = ageChecklist();
  if (!c || state.ageUp) return;
  const list = items => items.slice(0, 4).join(', ') + (items.length > 4 ? ' …' : '');
  let problem = '';
  if (!c.popOk) problem = `Erst ab ${c.next.need.population} Einwohnern`;
  else if (c.techsMissing.length) problem = `Erst erforschen: ${list(c.techsMissing.map(id => `${TECHS[id].icon} ${TECHS[id].name}`))}`;
  else if (c.buildingsMissing.length) problem = `Erst bauen: ${list(c.buildingsMissing.map(t => `${BUILDINGS[t].icon} ${BUILDINGS[t].name}`))}`;
  if (problem) {
    sound.play('error');
    showToast(problem, 3000);
    return;
  }
  state.ageUp = { done: 0, waiting: null };
  sound.play('click');
  showToast(`⏳ Aufbruch ins Zeitalter ${c.next.icon} ${c.next.name} hat begonnen`, 3000);
  updateUI();
}

function updateAgeUp(dt) {
  if (!state.ageUp) return;
  const next = nextAge();
  if (!next) { state.ageUp = null; return; }
  const step = Math.min(dt, next.seconds - state.ageUp.done);
  const share = {};
  for (const [id, n] of Object.entries(next.cost)) share[id] = n * step / next.seconds;
  const missing = Object.keys(share).filter(id => state.resources[id] < share[id] - 1e-6);   // Rundungsfehler zulassen
  if (missing.length) {   // fehlt etwas, wartet der Aufbruch
    state.ageUp.waiting = missing;
    return;
  }
  for (const [id, n] of Object.entries(share)) state.resources[id] = Math.max(0, state.resources[id] - n);
  state.ageUp.done += step;
  state.ageUp.waiting = null;
  if (state.ageUp.done >= next.seconds - 1e-6) finishAgeUp();
}

function finishAgeUp() {
  const next = nextAge();
  state.ageUp = null;
  state.age++;
  const evolved = Object.entries(evolveBuildings())
    .map(([type, n]) => `${n}× ${BUILDINGS[type].icon} ${BUILDINGS[type].name} → ${BUILDINGS[BUILDINGS[type].evolvesTo].icon} ${BUILDINGS[BUILDINGS[type].evolvesTo].name}`);
  const fresh = Object.values(BUILDINGS).filter(def => (def.age || 0) === state.age && isUnlocked(def.id));
  const later = Object.values(BUILDINGS).filter(def => (def.age || 0) === state.age && !isUnlocked(def.id) && !def.evolvesTo);
  sound.play('levelup');
  showEventPopup(next.icon, `Willkommen in der Zeit: ${next.name}!`, [
    next.text,
    fresh.length ? `Neu: ${fresh.map(d => `${d.icon} ${d.name}`).join(', ')}` : '',
    later.length ? `Später (größere Stadt oder Forschung): ${later.map(d => `${d.icon} ${d.name}`).join(', ')}` : '',
    evolved.length ? `Weiterentwickelt: ${evolved.join(', ')}` : '',
  ].filter(Boolean).join('\n\n'));
  emit('age', { age: state.age });
  refreshBuildButtons();
  ageListKey = '';
  techListKey = '';
  ageUpEl.dataset.key = '';
  recalcStats();
  updateUI();
}

// Anteil 0–1 bis zum nächsten Zeitalter (Einwohner, Forschung, Gebäude; während des Aufbruchs dessen Fortschritt)
function ageShare() {
  const c = ageChecklist();
  if (!c) return 1;
  if (state.ageUp) return state.ageUp.done / c.next.seconds;
  const part = (done, total) => (total ? done / total : 1);
  return (Math.min(1, state.population / c.next.need.population) +
    part(c.techs.length - c.techsMissing.length, c.techs.length) +
    part(c.buildings.length - c.buildingsMissing.length, c.buildings.length)) / 3;
}

// Aufbruch-Karte (Forschung und Zeitalter-Übersicht): was fehlt, Dauer, Knopf bzw. Fortschritt
function ageUpHtml() {
  const c = ageChecklist();
  if (!c) return '';
  const { next } = c;
  if (state.ageUp) {
    const share = state.ageUp.done / next.seconds;
    const wait = state.ageUp.waiting
      ? `⏸️ Wartet auf ${state.ageUp.waiting.map(id => `${RESOURCES[id].icon} ${RESOURCES[id].name}`).join(', ')}`
      : `⏳ noch ${secondsText(next.seconds - state.ageUp.done)}`;
    return `<div class="quest age-up running">
        <div class="age-title">⏳ Aufbruch: ${next.icon} ${next.name}</div>
        <div class="quest-goal">Die Stadt wächst ins neue Zeitalter. Dafür werden nach und nach geliefert: ${formatAmounts(next.cost)}</div>
        <div class="quest-bar"><div style="width:${Math.round(share * 100)}%"></div></div>
        <div class="quest-foot"><span>${wait}</span><span>${Math.round(share * 100)} %</span></div>
      </div>`;
  }
  const check = ok => (ok ? '✅' : '⬜');
  const item = (ok, text) => `<span class="${ok ? 'ok' : 'missing'}">${text}</span>`;
  const techs = c.techs.map(id => item(state.techs.includes(id), `${TECHS[id].icon} ${TECHS[id].name}`));
  const builds = c.buildings.map(t => item(countFinished(t) > 0, `${BUILDINGS[t].icon} ${BUILDINGS[t].name}`));
  return `<div class="quest age-up">
      <div class="age-title">⬆️ Nächstes Zeitalter: ${next.icon} ${next.name}</div>
      <div class="quest-goal">${next.text}</div>
      <div class="age-need">${check(c.popOk)} 👥 ${item(c.popOk, `${state.population}/${next.need.population} Einwohner`)}</div>
      ${techs.length ? `<div class="age-need">${check(!c.techsMissing.length)} 🔬 Alles erforschen (${c.techs.length - c.techsMissing.length}/${c.techs.length}): ${techs.join(', ')}</div>` : ''}
      <div class="age-need">${check(!c.buildingsMissing.length)} 🏗️ Jedes Gebäude einmal bauen (${c.buildings.length - c.buildingsMissing.length}/${c.buildings.length}): ${builds.join(', ')}</div>
      <div class="age-need">⏳ Dauer des Aufbruchs: ${secondsText(next.seconds)} · dabei werden nach und nach geliefert: ${formatAmounts(next.cost)}</div>
      <button class="tech-start${canAdvanceAge() ? '' : ' unaffordable'}" data-advance>⬆️ Aufbruch beginnen: ${next.icon} ${next.name}</button>
    </div>`;
}

function ageUpKey() {
  const c = ageChecklist();
  if (!c) return `max|${state.age}`;   // höchstes Zeitalter: eigener Schlüssel, sonst wird nie neu gezeichnet
  return state.ageUp ? `run|${Math.floor(state.ageUp.done)}|${state.ageUp.waiting}`
    : `${state.age}|${c.popOk}|${state.population}|${c.techsMissing}|${c.buildingsMissing}`;
}

// Titel oben (Zeitalter · Stadtstufe) und Balken bis zum nächsten Zeitalter
function updateAgeBar() {
  const age = AGES[state.age], level = LEVELS[stats.level];
  const ready = canAdvanceAge();
  const title = document.getElementById('age-title');
  title.innerHTML = `<span class="at-age">${age.icon} ${age.name}</span><span class="at-level">${level.icon} ${level.name}</span>`;
  const bar = document.getElementById('age-progress');
  const next = nextAge();
  bar.classList.toggle('ready', ready);
  bar.classList.toggle('running', !!state.ageUp);
  if (!next) {
    const later = AGES[state.age + 1];
    bar.querySelector('.ap-text').textContent = later ? `${later.icon} ${later.name} kommt in einem späteren Update` : 'Höchstes Zeitalter erreicht';
    bar.querySelector('.ap-bar i').style.width = '100%';
    bar.title = bar.querySelector('.ap-text').textContent;
    return;
  }
  const share = ageShare();
  bar.querySelector('.ap-bar i').style.width = `${Math.round(share * 100)}%`;
  bar.classList.toggle('running', !!state.ageUp);
  bar.querySelector('.ap-text').textContent = state.ageUp
    ? `⏳ Aufbruch: ${next.icon} ${next.name} · ${Math.round(share * 100)} %${state.ageUp.waiting ? ' ⏸️' : ''}`
    : ready ? `⬆️ Bereit für ${next.icon} ${next.name} – antippen!`
    : `${next.icon} ${next.name}: ${Math.round(share * 100)} %`;
  bar.title = bar.querySelector('.ap-text').textContent;   // im Querformat ist der Text oft abgeschnitten
}

function showAges() {
  closePanels();
  agesEl.classList.remove('hidden');
  ageListKey = '';
  updateAgesUI();
}

function closeAges() {
  agesEl.classList.add('hidden');
}

function updateAgesUI() {
  if (agesEl.classList.contains('hidden')) return;
  const key = ageUpKey();
  if (key === ageListKey) return;
  ageListKey = key;
  document.getElementById('age-list').innerHTML = AGES.map((age, i) => {
    const status = i < state.age ? 'done' : i === state.age ? 'current' : i === state.age + 1 && age.ready !== false ? 'next' : 'later';
    const buildings = Object.values(BUILDINGS).filter(d => (d.age || 0) === i && !d.evolvesTo).map(d => `${d.icon} ${d.name}`);
    const goods = Object.values(RESOURCES).filter(r => (r.fromAge || 0) === i && i > 0).map(r => `${r.icon} ${r.name}`);
    let foot = '';
    if (status === 'done') foot = '<div class="quest-foot"><span>✅ Geschafft</span></div>';
    else if (status === 'current') foot = '<div class="quest-foot"><span>📍 Hier bist du</span></div>';
    else if (status === 'later') foot = `<div class="quest-foot"><span>${age.ready === false ? '🔜 Kommt in einem späteren Update' : '🔒 Erst das Zeitalter davor'}</span></div>`;
    else foot = ageUpHtml().replace(/^<div class="quest age-up[^"]*">/, '<div>');
    return `<div class="quest age-card ${status}">
        <div class="age-title">${age.icon} ${i + 1}. ${age.name}</div>
        <div class="quest-goal">${age.text}</div>
        ${buildings.length ? `<div class="age-buildings">Gebäude: ${buildings.join(', ')}</div>` : ''}
        ${goods.length ? `<div class="age-buildings">Neue Waren: ${goods.join(', ')}</div>` : ''}
        ${foot}
      </div>`;
  }).join('');
  document.getElementById('ages-count').textContent = `${state.age + 1} / ${AGES.length}`;
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
const ageUpEl = document.getElementById('age-up');
let techListKey = '';

function updateResearchUI() {
  if (researchEl.classList.contains('hidden')) return;
  // Oben der Aufbruch ins nächste Zeitalter, darunter die Forschung: aktuelles Zeitalter, nächstes, frühere
  const upKey = ageUpKey();
  if (upKey !== ageUpEl.dataset.key) {
    ageUpEl.dataset.key = upKey;
    ageUpEl.innerHTML = ageUpHtml() + '<button class="age-overview" data-ages>⏳ Alle Zeitalter ansehen</button>';
  }
  const order = age => (age === state.age ? 0 : age === state.age + 1 ? 1 : 2);
  const ids = Object.keys(TECHS).filter(id => techAge(id) <= state.age + 1)   // spätere Zeitalter noch nicht zeigen
    .sort((a, b) => order(techAge(a)) - order(techAge(b)));
  const key = state.age + '|' + ids.map(techStatus).join(',');
  if (key !== techListKey) {
    techListKey = key;
    let lastGroup = -1;
    techListEl.innerHTML = ids.map(id => {
      const group = order(techAge(id));
      const age = AGES[techAge(id)];
      const head = group === lastGroup ? '' : `<div class="settings-title">${group === 2 ? '📜 Frühere Zeitalter' : `${age.icon} Forschung: ${age.name}`}</div>`;
      lastGroup = group;
      const t = TECHS[id];
      const status = techStatus(id);
      const needs = (t.requires || []).map(r => `${TECHS[r].icon} ${TECHS[r].name}`).join(', ');
      const unlocks = Object.values(BUILDINGS).filter(b => b.requiresTech === id)
        .map(b => `${b.icon} ${b.name}${(b.age || 0) > state.age ? ` (ab ${AGES[b.age].name})` : ''}`);
      let foot = '';
      if (status === 'done') foot = '<span>✅ Erforscht</span>';
      else if (status === 'running') foot = '<span class="tech-left"></span>';
      else if (status === 'locked') foot = `<span>🔒 Benötigt: ${needs}</span>`;
      else if (status === 'later') foot = `<span>🔒 Ab ${AGES[techAge(id)].icon} ${AGES[techAge(id)].name}</span>`;
      return `${head}
        <div class="quest tech ${status === 'later' ? 'locked' : status}" data-tech="${id}">
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
  closeAges();
  closeQuests();
  closeSettings();
  researchEl.classList.remove('hidden');
  techListKey = '';
  ageUpEl.dataset.key = '';
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
    if (cell.build?.from) {   // Weiterentwicklung: abbrechen, das alte Gebäude bleibt
      cancelDevelop(i);
      continue;
    }
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
  if (type !== selectedType) clearPending();
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
  if (type === 'market') {
    lines.push('🤝 Antippen zum Handeln: Waren kaufen und verkaufen');
    lines.push(`🛒 Schickt Handelskarren zum Rand deines Landes: je ${formatAmounts({ money: CONFIG.cartValue })} Extra (braucht eine Straße bis dorthin)`);
  }
  if (def.service) lines.push(`${NEEDS[def.service.need].icon} ${NEEDS[def.service.need].name} für Häuser im Umkreis von ${def.service.radius} Feldern`);
  if (def.fireRadius) lines.push(`🚒 Löscht Brände im Umkreis von ${def.fireRadius} Feldern`);
  if (def.defense) lines.push(`🏴‍☠️ Schützt Gebäude im Umkreis von ${def.defense.radius} Feldern vor Banditen (Abwehr ${def.defense.strength})`);
  if (def.isWall) lines.push(`🧱 Hält ${def.isGate ? CONFIG.gateHp : CONFIG.wallHp} aus – Banditen müssen erst durch. Wachen in der Nähe wehren sie an der Mauer ab.`);
  if (def.storage) lines.push(`📦 +${def.storage} Lagerplatz für Holz, Stein, Nahrung und Waren`);
  if (def.beautifies) lines.push(`✨ Häuser direkt daneben bekommen +${CONFIG.niceHouseBonus} Wohnplätze`);
  if (def.landmark) lines.push(`🏛️ Zufriedenheit +${def.landmark} für die ganze Stadt – gibt es nur einmal`);
  if (def.jobs) {
    const job = jobOf(type);
    lines.push(`${JOBS[job].icon} Braucht ${def.jobs[job]} ${JOBS[job].name}`);
  }
  if (def.needsRoad) lines.push('🛣️ Braucht eine Straße direkt daneben');
  if (canUpgradeType(type)) lines.push('⬆️ Später ausbaubar (Stufe 2 ab Kleinstadt, Stufe 3 ab Stadt)');
  if (def.evolvesTo) {
    const to = BUILDINGS[def.evolvesTo];
    lines.push(`⏫ Wird ${AGES[to.age || 0].name === AGES[state.age].name ? 'bald' : `in der Zeit ${AGES[to.age || 0].icon} ${AGES[to.age || 0].name}`} automatisch zu: ${to.icon} ${to.name}`);
  }
  return lines;
}

const buildInfoEl = document.getElementById('build-info');

// Kurzinfo: standardmäßig nur eine schmale Zeile (die Karte bleibt frei), Details über ⓘ
let buildInfoExpanded = false;

// Kurze Zustandsangabe für die Zeile: Kosten, „gesperrt“ oder „schon gebaut“
function toggleBuildRotation() {
  buildRotated = !buildRotated;
  if (selectedType) showBuildInfo(selectedType);
  if (pending) renderPlaceBar();
  sound.play('click');
}

function buildInfoMeta(type) {
  const def = BUILDINGS[type];
  const [w, h] = placementSize(type);
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
      ${footprintSize(type)[0] !== footprintSize(type)[1] ? '<button class="bi-rotate" title="Drehen (R)">🔄</button>' : ''}
      <button class="bi-more" title="Was macht das Gebäude?">ⓘ</button>
      <button class="bi-close" title="Schließen">✕</button></div>
    <div class="bi-details">
      <div class="bi-desc">${def.description}</div>
      <ul class="bi-facts">${describeBuilding(type).map(l => `<li>${l}</li>`).join('')}</ul>
      <div class="bi-status${locked ? ' locked' : ''}">${status}</div>
    </div>`;
  buildInfoEl.querySelector('.bi-meta').textContent = buildInfoMeta(type);
  buildInfoEl.classList.toggle('expanded', buildInfoExpanded);
  buildInfoEl.querySelector('.bi-rotate')?.addEventListener('click', toggleBuildRotation);
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
  closeAges();
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

// ---------- Ressourcen: Produktion und Verbrauch ----------

let infoResource = null;

function showResourceInfo(id) {
  closeQuests();
  closeResearch();
  closeSettings();
  infoMode = 'resource';
  infoResource = id;
  infoTile = null;
  infoOpenedAt = performance.now();
  clearInfoExtra();
  infoEl.classList.remove('hidden');
  renderInfo();
}

// Woher kommt eine Ressource, wohin geht sie? Werte pro Minute, gruppiert nach Gebäudeart
function resourceFlows(id) {
  const sources = new Map(), uses = new Map();
  const add = (map, key, label, perMin, paused = false) => {
    const e = map.get(key) || { label, perMin: 0, count: 0, paused: 0 };
    e.perMin += perMin;
    e.count++;
    if (paused) e.paused++;
    map.set(key, e);
  };
  state.grid.forEach((cell, i) => {
    const def = cell && BUILDINGS[cell.type];
    if (!def || !def.interval || !isActive(i % N, Math.floor(i / N))) return;
    const x = i % N, y = Math.floor(i / N);
    const lf = levelFactor(cell);
    const paused = !!cell.waiting;
    const out = buildingOutput(cell.type, staffOfCell(i))[id] || 0;
    if (out) add(sources, cell.type, `${def.icon} ${def.name}`, paused ? 0 : out * lf * (1 + terrainBonusOf(cell.type, x, y, ...sizeOf(cell))) * 60 / def.interval, paused);
    const use = def.consumes?.[id];
    if (use) add(uses, cell.type, `${def.icon} ${def.name}`, paused ? 0 : Math.round(use * lf) * 60 / def.interval, paused);
  });
  const pop = state.population;
  if (id === 'money' && pop) add(sources, 'tax', `🏛️ Steuern (${TAXES[state.taxLevel].name})`, pop * TAXES[state.taxLevel].perCitizen * 60 / CONFIG.taxInterval);
  if (id === 'food' && pop) add(uses, 'eat', `👥 ${pop} Einwohner essen`, pop * CONFIG.foodPerCitizen * 60);
  if (LUXURIES[id] && pop && state.resources[id] > 0) add(uses, 'eat', `👥 ${pop} Einwohner ${LUXURIES[id].verb}`, pop * LUXURIES[id].perCitizen * 60);
  if (id === 'tools' && state.resources.tools > 0) add(uses, 'wear', `👷 ${stats.jobs.assigned.worker || 0} Arbeiter nutzen es ab`, (stats.jobs.assigned.worker || 0) * TOOLS.perWorker * 60);
  if (id === 'wood' && pop && season().heating) add(uses, 'heat', '🔥 Heizen im Winter', heatingRate() * 60);
  return { sources: [...sources.values()], uses: [...uses.values()] };
}

function formatRate(perMin) {
  const v = Math.abs(perMin);
  return (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10).toString().replace('.', ',');
}

function renderResourceInfo() {
  const id = infoResource;
  const r = RESOURCES[id];
  const { sources, uses } = resourceFlows(id);
  const inSum = sources.reduce((a, e) => a + e.perMin, 0), outSum = uses.reduce((a, e) => a + e.perMin, 0);
  const net = inSum - outSum;
  const have = Math.floor(state.resources[id]);
  const cap = r.stored ? storageCap(id) : null;
  const lines = [];
  lines.push(`Vorrat: ${have}${cap ? ` von ${cap} (Lager)` : ''}`);
  const sign = net > 0.05 ? '+' : net < -0.05 ? '−' : '±';
  let trend = `Bilanz: ${sign}${formatRate(net)} pro Minute`;
  if (net < -0.05 && have > 0) trend += ` – reicht noch ${formatClock(have / -net * 60)}`;
  else if (net > 0.05 && cap && have < cap) trend += ` – Lager voll in ${formatClock((cap - have) / net * 60)}`;
  else if (net > 0.05 && cap && have >= cap) trend += ' – Lager ist voll, Überschuss geht verloren';
  lines.push(trend);
  lines.push(sources.length
    ? '⬆️ Produktion: +' + formatRate(inSum) + '/min'
    : '⬆️ Produktion: keine');
  for (const e of sources.sort((a, b) => b.perMin - a.perMin)) {
    lines.push(`• ${e.label}${e.count > 1 ? ` ×${e.count}` : ''}: +${formatRate(e.perMin)}${e.paused ? ` (⏸️ ${e.paused} pausiert)` : ''}`);
  }
  lines.push(uses.length ? '⬇️ Verbrauch: −' + formatRate(outSum) + '/min' : '⬇️ Verbrauch: keiner');
  for (const e of uses.sort((a, b) => b.perMin - a.perMin)) {
    lines.push(`• ${e.label}${e.count > 1 ? ` ×${e.count}` : ''}: −${formatRate(e.perMin)}${e.paused ? ` (⏸️ ${e.paused} pausiert)` : ''}`);
  }
  const details = [];
  if (LUXURIES[id]) details.push(`Solange ${r.name} da ist: +${LUXURIES[id].happiness} Zufriedenheit.`);
  if (id === 'tools') details.push(`Solange Werkzeug da ist, arbeiten alle Betriebe mit Arbeitern ${Math.round(TOOLS.bonus * 100)} % schneller.`);
  if (id === 'wood' && !season().heating && state.population) details.push(`Im Winter heizen die Einwohner: −${formatRate(heatingRate() * 60)} 🪵/min.`);
  if (r.price) details.push(`Marktpreis: ${Math.round(r.price * (state.prices[id] || 1) * 10) / 10} 💰 je Stück (Handel am Markt).`);
  if (!sources.length) {
    const makers = Object.values(BUILDINGS).filter(d => d.produces?.[id]).map(d => `${d.icon} ${d.name}`);
    if (makers.length) details.push('Hergestellt von: ' + makers.join(', '));
  }
  details.push('Werte gelten für jetzt (Personal, Zufriedenheit, Jahreszeit, Gelände).');
  document.getElementById('info-icon').textContent = r.icon;
  document.getElementById('info-name').textContent = r.name;
  setInfoLines(lines, details);
  document.getElementById('info-demolish').classList.add('hidden');
  document.getElementById('info-upgrade').classList.add('hidden');
  document.getElementById('info-develop').classList.add('hidden');
  document.getElementById('info-move-row').classList.add('hidden');
  document.getElementById('info-action').classList.add('hidden');
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
  document.getElementById('info-develop').classList.add('hidden');
  document.getElementById('info-move-row').classList.add('hidden');
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
  document.getElementById('info-develop').classList.add('hidden');
  document.getElementById('info-move-row').classList.add('hidden');
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
  else if (infoMode === 'resource') renderResourceInfo();
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
  const S = CONFIG.plotSize, ox = (infoPlot % P) * S, oy = Math.floor(infoPlot / P) * S;
  const terrainCounts = TERRAIN.slice(1).map(t => [t, countTerrainNear(ox, oy, S, S, t.id, 0)]).filter(([, n]) => n);
  if (terrainCounts.length) lines.splice(1, 0, 'Gelände: ' + terrainCounts.map(([t, n]) => `${t.icon} ${n} ${t.name}`).join(' · '));
  document.getElementById('info-icon').textContent = '🏞️';
  document.getElementById('info-name').textContent = 'Freie Fläche';
  setInfoLines(lines);
  document.getElementById('info-demolish').classList.add('hidden');
  document.getElementById('info-upgrade').classList.add('hidden');
  document.getElementById('info-develop').classList.add('hidden');
  document.getElementById('info-move-row').classList.add('hidden');
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
  if (cell.build) {
    const pct = Math.floor((1 - cell.build.left / cell.build.total) * 100);
    lines.push(`🏗️ Im Bau: ${pct} % – fertig in ${secondsText(cell.build.left)}`);
  }
  if (def.isWall) lines.push(`🧱 Zustand: ${Math.ceil(wallHp(cell))} von ${wallMaxHp(cell)}` +
    (cell.hp !== undefined ? ' – wird ausgebessert' : ''));
  if (cell.fire) {
    lines.push(cell.fire.brigade
      ? '🚒 Brennt – es wird gerade gelöscht.'
      : `🔥 Brennt! In ${Math.ceil(cell.fire.left)} s ist es abgebrannt.`);
  } else if (cell.build) {
    if (def.needsRoad && !hasRoadAccess(infoTile.x, infoTile.y)) lines.push('⚠️ Noch kein Straßenanschluss – nach dem Bau arbeitet es erst mit Straße.');
  } else if (!active) {
    lines.push('⚠️ Kein Straßenanschluss – arbeitet nicht.');
  }
  if (def.population) {
    const cap = houseCapacity(infoTile.x, infoTile.y);
    lines.push(`Wohnplätze: 👥 ${active ? cap : 0} / ${cap}`);
    if (isNiceHouse(infoTile.x, infoTile.y)) lines.push(`✨ Schönes Wohnviertel: +${CONFIG.niceHouseBonus} Wohnplätze`);
    else lines.push(`Tipp: Park, Brunnen oder Wasser direkt daneben bringt +${CONFIG.niceHouseBonus} Wohnplätze.`);
    const levels = stats.houseNeeds.get(infoTile.y * N + infoTile.x) || new Map();
    lines.push('Versorgung: ' + Object.entries(NEEDS).map(([need, n]) => {
      const level = levels.get(need) || 0;
      return `${n.icon} ${level >= 0.99 ? '✅' : level > 0 ? '🟡' : '❌'}`;
    }).join('  '));
  }
  if (def.jobs && active) {
    const job = JOBS[jobOf(cell.type)];
    const pct = Math.round(staffOfCell(infoTile.y * N + infoTile.x) * 100);
    const have = stats.cellStaff.get(infoTile.y * N + infoTile.x) || 0;
    lines.push(`Personal: ${job.icon} ${have} von ${jobSlots(cell)} ${job.dat}` +
      (pct < 100 ? ` – arbeitet mit ${pct} %` : ' – voll besetzt'));
  }
  if (def.interval) {
    const lf = levelFactor(cell);
    const out = buildingOutput(cell.type, staffOfCell(infoTile.y * N + infoTile.x));
    for (const id in out) out[id] = Math.round(out[id] * lf * 10) / 10;
    const need = {};
    for (const [id, n] of Object.entries(def.consumes || {})) need[id] = Math.round(n * lf);
    const tb = terrainBonusOf(cell.type, infoTile.x, infoTile.y, ...sizeOf(cell));
    for (const id in out) out[id] = Math.round(out[id] * (1 + tb) * 10) / 10;
    if (tb) lines.push(terrainBonusText(cell.type, tb));
    else if (TERRAIN_BONUS[cell.type]) {
      const b = TERRAIN_BONUS[cell.type];
      lines.push(`Tipp: ${TERRAIN[TERRAIN_ID[b.terrain]].name} in der Nähe bringt bis zu +${Math.round((b.flat ?? b.max) * 100)} % Ertrag.`);
    }
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
    lines.push(cell.noRoute
      ? '🛒 Keine Straße bis zum Rand deines Landes – Handelskarren können nicht losfahren.'
      : `🛒 Handelskarren etwa alle ${Math.round(CONFIG.cartSeconds / levelFactor(cell))} s, je ${formatAmounts({ money: cartValue(cell) })}` +
        (state.camps.length ? ' – Banditen können sie überfallen, Wachen am Stadttor schützen.' : ''));
    renderTradeUI();
  } else {
    clearInfoExtra();
  }
  const actionBtn = document.getElementById('info-action');
  actionBtn.classList.toggle('hidden', !cell.fire || cell.fire.brigade);
  actionBtn.classList.remove('unaffordable');
  actionBtn.textContent = `💧 Löschen (${formatAmounts(extinguishCost())})`;
  const refund = refundOf(cell);
  renderUpgradeButton(cell);
  renderDevelopButton(cell);
  const movable = !def.isRoad && !def.isWall && !cell.fire;
  const [cw, ch] = sizeOf(cell);
  document.getElementById('info-move-row').classList.toggle('hidden', !movable);
  document.getElementById('info-rotate').classList.toggle('hidden', cw === ch);
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
    : `${def.isGate ? '🚪 Tor entfernen' : def.isRoad ? '🗑️ Löschen' : cell.build ? '✖ Bau abbrechen' : '💰 Verkaufen'} +${formatAmounts(refund) || '0'}`;
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
  if (!canUpgradeType(cell.type) || !up || cell.build) {
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

// Knopf „Weiterentwickeln“: Ziel, Kosten oder warum es (noch) nicht geht
function renderDevelopButton(cell) {
  const btn = document.getElementById('info-develop');
  const target = BUILDINGS[cell.type].developsTo;
  if (!target || cell.build || !infoTile) {
    btn.classList.add('hidden');
    return;
  }
  const def = BUILDINGS[target];
  const problem = developProblem(infoTile.y * N + infoTile.x);
  btn.classList.remove('hidden');
  btn.classList.toggle('unaffordable', !!problem);
  btn.textContent = !isUnlocked(target) ? `🔒 Weiterentwickeln zu ${def.icon} ${def.name}: ${lockReason(target)}`
    : `✨ Weiterentwickeln zu ${def.icon} ${def.name} · ${formatAmounts(developCost(cell)) || 'gratis'}`;
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
  document.getElementById('info-develop').classList.add('hidden');
  document.getElementById('info-move-row').classList.add('hidden');
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
// Meldungen schließen sich nach einer Weile selbst (Wunsch Emin: nach langer Pause nicht alles wegklicken).
// Tippt man ins Fenster, bleibt es offen.
const POPUP_AUTO_CLOSE = { info: 10, choice: 30 };   // Sekunden: nur „OK“ / mit Auswahl
let popupTimer = 0;

function closeEventPopup() {
  clearTimeout(popupTimer);
  eventEl.classList.add('hidden');
  if (popupQueue.length) showEventPopup(...popupQueue.shift());
}

// Beim Ablaufen: einziger Knopf wird ausgelöst (z. B. Belohnung abholen), bei Auswahl der Knopf ohne Aktion (Ablehnen)
function autoChoice(buttons) {
  if (buttons.length === 1) return buttons[0];
  return buttons.find(b => !b.action) || null;
}

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
      closeEventPopup();
    });
    wrap.appendChild(btn);
  }
  eventEl.classList.remove('hidden');

  clearTimeout(popupTimer);
  const fallback = autoChoice(buttons);
  const bar = document.getElementById('event-timer');
  bar.classList.toggle('hidden', !fallback);
  if (!fallback) return;
  const seconds = buttons.length === 1 ? POPUP_AUTO_CLOSE.info : POPUP_AUTO_CLOSE.choice;
  bar.style.animation = 'none';
  void bar.offsetWidth;                                // Animation neu starten
  bar.style.animation = `event-timer ${seconds}s linear forwards`;
  popupTimer = setTimeout(() => {
    if (fallback.action && fallback.action() === false) return;
    closeEventPopup();
  }, seconds * 1000);
}

// Ins Fenster getippt: offen lassen, bis man selbst schließt
eventEl.addEventListener('pointerdown', e => {
  if (e.target.closest && e.target.closest('button')) return;
  clearTimeout(popupTimer);
  document.getElementById('event-timer').classList.add('hidden');
});

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
  const html = raidPillHtml() + pills.map(p => `<div class="effect">${p}</div>`).join('') + campPillHtml() + jobsPillHtml();
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

// ---------- Zurück-Taste (Wischgeste am Handy, Browser-Zurück) ----------
// Solange ein Fenster offen ist, liegt ein Eintrag im Verlauf: „Zurück“ schließt dann das Fenster,
// statt das Spiel zu verlassen.
let backEntry = false;
let ignorePop = false;

function anyWindowOpen() {
  return !!pending || !!moveMode || ['info', 'quests', 'research', 'settings', 'ages']
    .some(id => !document.getElementById(id).classList.contains('hidden'));
}

function syncBackEntry() {
  if (typeof history === 'undefined' || !history.pushState) return;
  const open = anyWindowOpen();
  if (open && !backEntry) {
    history.pushState({ stadtaufbauWindow: true }, '');
    backEntry = true;
  } else if (!open && backEntry) {
    backEntry = false;
    ignorePop = true;
    history.back();
  }
}

window.addEventListener('popstate', () => {
  if (ignorePop) { ignorePop = false; return; }
  backEntry = false;
  if (moveMode) cancelMove();
  clearPending();
  closePanels();
});

let lastTime = performance.now();
let uiTimer = 0;

// Spielgeschwindigkeit: 0 = Pause, 1–3 = Zeitraffer (gilt für dieses Gerät, nicht im Spielstand)
const SPEEDS = [0, 1, 2, 3];
const SPEED_LABELS = { 0: '⏸', 1: '▶ 1×', 2: '⏩ 2×', 3: '⏭ 3×' };
let gameSpeed = 1;

function setSpeed(speed) {
  gameSpeed = clamp(speed, 0, SPEEDS[SPEEDS.length - 1]);
  const btn = document.getElementById('btn-speed');
  btn.textContent = SPEED_LABELS[gameSpeed];
  btn.classList.toggle('paused', gameSpeed === 0);
  btn.classList.toggle('fast', gameSpeed > 1);
  if (gameSpeed === 0) showToast('⏸ Pause – in Ruhe planen und bauen');
  sound.play('click');
}

function cycleSpeed() {
  setSpeed(SPEEDS[(SPEEDS.indexOf(gameSpeed) + 1) % SPEEDS.length]);
}

function loop(now) {
  // Nie negativ (der erste Zeitstempel kann vor dem Skriptstart liegen), große Sprünge begrenzen
  const dt = clamp((now - lastTime) / 1000, 0, 1);
  lastTime = now;
  // Zeitraffer in Teilschritten, damit bei 3× nichts übersprungen wird; hinter „Handy drehen“ ruht das Spiel
  if (!rotateHintShown()) for (let n = 0; n < gameSpeed; n++) update(dt);
  uiTimer += dt;
  if (uiTimer >= 0.25) {
    uiTimer = 0;
    recalcStats();
    checkQuests();
    checkAchievements();
    updateUI();
  }
  syncBackEntry();
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

// Querformat: hochkant zeigt die Seite nur den Hinweis „Handy drehen“ (CSS). Der Knopf darin
// schaltet Vollbild ein und sperrt die Drehung auf quer – das erlauben Browser nur nach einem Tippen.
const PORTRAIT_KEY = 'stadtaufbau-hochkant';   // „trotzdem hochkant spielen“ gemerkt (je Gerät)
const rotateHintQuery = typeof matchMedia === 'function'
  ? matchMedia('(orientation: portrait) and (pointer: coarse) and (max-width: 600px)') : null;

// Wird gerade der Hinweis „Handy drehen“ gezeigt? Dann ruht das Spiel.
function rotateHintShown() {
  return !!rotateHintQuery?.matches && !document.documentElement.classList.contains('allow-portrait');
}

function setupLandscape() {
  try {
    if (localStorage.getItem(PORTRAIT_KEY) === '1') document.documentElement.classList.add('allow-portrait');
  } catch (e) { /* ohne Speicher eben nicht merken */ }
  document.getElementById('rotate-go')?.addEventListener('click', () => {
    const failed = () => showToast('Drehen geht hier nicht automatisch – Drehsperre am Handy ausschalten und quer halten', 4000);
    const lock = () => {
      if (!screen.orientation?.lock) return failed();
      screen.orientation.lock('landscape').catch(failed);
    };
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen({ navigationUI: 'hide' }).then(lock).catch(lock);
    } else lock();
  });
  document.getElementById('rotate-skip')?.addEventListener('click', () => {
    document.documentElement.classList.add('allow-portrait');
    try { localStorage.setItem(PORTRAIT_KEY, '1'); } catch (e) { /* egal */ }
    resize();
  });
  // Zwei-Finger-Zoom auf den Leisten würde sonst (iOS) die ganze Seite vergrößern
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('touchmove', e => {
    if (e.touches.length > 1 && e.target !== canvas) e.preventDefault();
  }, { passive: false });
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
  new ResizeObserver(() => { resize(); fitBuildLabels(); }).observe(canvas);
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
  setupLandscape();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(watchForUpdates)
      .catch(err => console.warn('Service Worker', err));
  }

  requestAnimationFrame(loop);
}

start();
