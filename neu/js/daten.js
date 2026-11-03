'use strict';
// Epochia – alle Spieldaten (Zahlen zum Feinjustieren stehen hier oben, die Logik liest nur daraus).
// Pläne: docs/konzept-neu.md und docs/epoche-1-steinzeit.md

const APP_VERSION = 85;

const CONFIG = {
  mapSize: 512,           // Felder je Seite, zentral änderbar (Vielfaches von 16; 64 bis Version 21, 128 bis Version 54 – alte Karten liegen in der Mitte)
  plotSize: 8,            // Landstück = 8 × 8 Felder
  startPlots: 4,          // in der Mitte gehören 4 × 4 Landstücke (32 × 32 Felder) von Anfang an dazu
  tileW: 64,              // Breite einer Raute in Bildpunkten (Zoom 1)
  tileH: 44,              // Höhe einer Raute – so flach wie die Grasplatten auf Emins Bildern (≈ 0,69 × Breite)
  maxConstructions: 2,    // höchstens so viele Baustellen gleichzeitig
  yearSeconds: 7200,      // ein Jahr = 4 Jahreszeiten à 30 Minuten (Emin, 31.10.; bis Version 22: 2 Minuten)
  daySeconds: 1800,       // ein Tag mit Nacht dauert 30 Minuten (bis Version 22: 160 Sekunden)
  weatherSeconds: 360,    // so lange hält ein Wetter an (6 Minuten), dann wird neu ausgewürfelt
  // Laufender Verbrauch je Einwohner und Minute (Emin, 01.11.: „Ich nehme viel mehr ein, als ich ausgebe“; vorher Nahrung immer 0,4).
  // Kleine Stämme kommen mit wenig aus: bis „von“ Einwohnern gilt „klein“, ab „bis“ Einwohnern „voll“, dazwischen gleitend.
  // Ist das Lager leer, passiert bei Holz, Stein und Werkzeug nichts weiter – man kann nur nicht bauen.
  upkeep: {
    nahrung:  { klein: 0.5, voll: 1.6,   von: 10, bis: 70 },   // Essen
    holz:     { klein: 0,   voll: 0.14,  von: 20, bis: 70 },   // Feuerholz
    stein:    { klein: 0,   voll: 0.08,  von: 25, bis: 70 },   // Ausbessern von Wegen und Häusern
    werkzeug: { klein: 0,   voll: 0.018, von: 40, bis: 90 },   // Verschleiß
  },
  foodSeason: [0.92, 1.12, 1, 0.6],   // Essen je Jahreszeit (Frühling, Sommer, Herbst, Winter): gleicht die Ernte aus, im Winter lebt man sparsam von Vorräten
  needGrace: 600,         // neues Bedürfnis (Kleidung, Töpferwaren) zählt erst nach 10 Minuten; dazu gibt es einen Startvorrat
  needGift: 20,
  hunger: { after: 120, every: 30, minPop: 3, unhappy: 20 },   // ohne Nahrung: Laune −20; nach 2 Min. zieht alle 30 s einer weg (nie unter 3)
  goodsPerPerson: 0.03,   // Kleidung / Töpferwaren je Einwohner und Minute (wenn das Bedürfnis zählt)
  growthSeconds: 45,      // so oft zieht jemand ein (seit Version 24: 45 s statt 15 s – sonst Hunger und zu große Stämme)
  growthMinHappy: 50,     // ab dieser Zufriedenheit ziehen Leute zu
  baseStorage: 200,       // Lagerplatz je Ware am Lagerfeuer (seit Version 24: 200, damit der lange Winter zu überstehen ist)
  stageStorage: { alt: 0, mittel: 100, jung: 200, kupfer: 200, frueh: 300, spaet: 400 },   // so viel mehr fasst das Lager je Zeitalter (Emin, 03.11.)
  bonusRadius: 3,         // Umkreis für Geländebonus (Wald, Felsen)
  maxOfflineHours: 2,     // so lange läuft das Spiel offline weiter (Emin: höchstens 2 Stunden)
  refundShare: 0.5,       // beim Abreißen gibt es die Hälfte zurück
  rocks: {                // Felsen abbauen (Emin, 01.11.): kleine Felsen verschwinden, das Gebirge ist unerschöpflich
    stonePerRock: 40,     // so viel Stein bringt ein Felsfeld – dann ist es abgebaut (im Umkreis rockRadius)
    rockRadius: 6,
  },
  // Licht am Weg (Emin, 01.11.): jedes zweite Wegfeld bekommt eine Fackel, später eine Laterne.
  // style je Zeitalter (Epoche aus STAGES): 'fackel' jetzt, 'laterne' ab Bronze-/Eisenzeit, wenn diese gebaut sind.
  pathLights: { Steinzeit: 'fackel', Bronzezeit: 'fackel', Eisenzeit: 'laterne' },
  trees: {                // Bäume fällen und nachpflanzen (Emin, 31.10.)
    woodPerTree: 20,      // so viel Holz bringt ein Baum – dann fällt ihn der Holzsammler (im Umkreis treeRadius)
    treeRadius: 6,
    plantSeconds: 60,     // so oft setzt eine Pflanzerin (voll besetzt) einen Setzling
    plantRadius: 4,       // Umkreis um die Pflanzerin
    growSeconds: 600,     // nach 10 Minuten ist aus dem Setzling ein Baum geworden
  },
  disasterWarn: 180,      // so viele Sekunden vorher warnt der fertige Steinkreis
  disaster: {             // Naturkatastrophen (DISASTERS)
    perHour: 0.35,        // so oft im Schnitt je Spielstunde (also etwa alle 3 Stunden eine)
    graceMinutes: 45,     // in den ersten 45 Spielminuten nie
    pauseMinutes: 60,     // nach einer Katastrophe mindestens 1 Stunde Ruhe
  },
  // Wünsche des Stammes (Emin, 02.11.: „Man kann nur noch forschen“): volle Lager haben einen Sinn – Waren abgeben
  // bringt etwas Wissen und verkürzt die laufende Forschung. Es wartet immer höchstens ein Wunsch.
  wishes: {
    pause: 300,           // so viele Sekunden nach einem erfüllten Wunsch kommt der nächste
    change: 600,          // ein offener Wunsch wechselt nach 10 Minuten zu einer anderen Ware (sonst hing er bis zu 70 Minuten fest)
    researchSeconds: 90,  // so viel kürzer wird die laufende Forschung
    wissen: 8,            // so viel Wissen gibt es dazu (je Zeitalter mehr, siehe stagePlus)
    stagePlus: 0.25,      // je Zeitalter wollen und geben Wünsche 25 % mehr
    amount: { nahrung: 150, holz: 120, stein: 90, felle: 30, kleidung: 25, werkzeug: 15, ton: 45, toepferwaren: 15, kupfererz: 45, holzkohle: 30, kupfer: 15, zinn: 12, bronze: 8, wolle: 30, schmuck: 8 },
    text: {
      nahrung: 'Der Stamm möchte ein großes Festmahl feiern.',
      holz: 'Die Alten wünschen sich ein großes Feuer für die Ahnen.',
      stein: 'Die Feuerstellen sollen neu gesetzt werden.',
      felle: 'Für die Kinder werden warme Decken gebraucht.',
      kleidung: 'Die Jäger brauchen neue Kleidung für den Winter.',
      werkzeug: 'Die Sammlerinnen bitten um bessere Werkzeuge.',
      ton: 'Die Kinder wollen Figuren aus Ton formen.',
      toepferwaren: 'Für die Vorräte fehlen Krüge und Schalen.',
      kupfererz: 'Die Alten wollen das grüne Gestein genauer ansehen.',
      holzkohle: 'Die Schmelzer wollen ein besonders heißes Feuer versuchen.',
      kupfer: 'Der Häuptling wünscht sich ein Zeichen aus glänzendem Kupfer.',
      zinn: 'Die Gießer wollen ausprobieren, wie viel Zinn die Bronze verträgt.',
      bronze: 'Zum Fest soll ein Ring aus Bronze über dem Dorfplatz hängen.',
      wolle: 'Die Alten frieren und wünschen sich weiche Wolldecken.',
      schmuck: 'Zur Hochzeit im Dorf soll die Braut etwas Schönes tragen.',
    },
  },
  dorfplatz: { storage: 100, warmth: 1 },   // beim Aufbruch in die Bronzezeit wird das Lagerfeuer zum Dorfplatz: mehr Lager, größerer Umkreis
  // Händler (Emin, 02.11.): kommt nur, solange man spielt, kein Geld – Waren gegen Waren. Jedes Angebot geht einmal je Besuch.
  trader: {
    firstWait: 60,        // so bald nach dem ersten Handelsplatz kommt der erste Händler
    every: 1200,          // von Ankunft zu Ankunft 20 Minuten (mit „Rad und Wagen“ 15, siehe traderFaster)
    stay: 300,            // er bleibt 5 Minuten
    count: 3,             // so viele Angebote zeigt er (mit der „Bernsteinstraße“ eines mehr, siehe traderOffers)
    offers: [             // das erste Angebot ist immer eines für Zinn (damit Handel sich lohnt)
      { id: 'toepfer_zinn', give: { toepferwaren: 20 }, get: { zinn: 8 } },
      { id: 'felle_zinn',   give: { felle: 30 },        get: { zinn: 10 } },
      { id: 'kleid_zinn',   give: { kleidung: 15 },     get: { zinn: 6 } },
      { id: 'nahrung_erz',  give: { nahrung: 60 },      get: { kupfererz: 20 } },
      { id: 'holz_erz',     give: { holz: 80 },         get: { kupfererz: 25 } },
      { id: 'stein_kohle',  give: { stein: 60 },        get: { holzkohle: 15 } },
      { id: 'ton_kohle',    give: { ton: 30 },          get: { holzkohle: 10 } },
      { id: 'nahrung_wolle', give: { nahrung: 40 },     get: { wolle: 8 } },
      { id: 'felle_wolle',  give: { felle: 20 },        get: { wolle: 10 } },
      // Bernstein gibt es nur hier: Ab der „Bernsteinstraße“ zeigt er beide Angebote immer
      { id: 'bronze_grossbernstein', give: { bronze: 15 }, get: {}, getFind: 'bernsteinstueck', requires: 'himmelsscheibe' },   // Fundstück für die Halle, solange es fehlt
      { id: 'kleid_bernstein',  give: { kleidung: 15 }, get: { bernstein: 10 }, requires: 'bernsteinstrasse' },
      { id: 'bronze_bernstein', give: { bronze: 10 },   get: { bernstein: 12 }, requires: 'bernsteinstrasse' },
    ],
  },
  // Werkstätten lassen so viel Metall liegen (mindestens; mehr, wenn eine startbare Forschung mehr kostet), sonst verbrauchen
  // Gießer und Schmiede alles und man kommt nie auf die Kosten für Bauen und Forschung (Analyse 02.11.: bis 12 Stunden Stillstand)
  metalReserve: { kupfer: 30, bronze: 30 },
  fest: { happy: 15, seconds: 300 },   // Sonnwendfest (nach der „Himmelsscheibe“): mitten im Sommer 5 Minuten Fest, Laune +15
  finds: {               // Fundstücke (docs/konzept-wunderwerke.md)
    firstSpot: 120,       // so lange dauert es nach dem Einstieg bis zur ersten Fundstelle (Sekunden)
    spotEvery: 300,       // alle 5 Minuten eine neue …
    maxSpots: 3,          // … höchstens 3 warten gleichzeitig (Emin, 03.11.: nichts läuft ab)
    tripMin: 20, tripMax: 90,   // so lange ist jemand unterwegs, je nach Entfernung
    oreEvery: 1200,       // Erzader: alle 20 Minuten, solange es eine Kupfermine gibt
    oreSeconds: 60,
    oreReward: { kupfererz: 40 },
    goldEvery: 3,         // jede 3. Erzader bringt dazu ein Goldblättchen
    boulderEvery: 600,    // Riesenfindling: alle 10 Minuten einer, solange welche fehlen
    boulderSeconds: 120,  // so lange rollen sie ihn zum Bauplatz
    floodShells: 2,       // nach einem Hochwasser liegen so viele Muscheln am Ufer
    basketMax: 2,         // Fundkorb: höchstens so viele Stücke aus der Zeit, in der das Spiel zu war …
    basketFirst: 900,     // … das erste nach 15 Minuten Abwesenheit
    basketSecond: 3600,   // … das zweite nach 1 Stunde
    swapCost: 3,          // so viele doppelte Stücke ergeben ein Stück nach Wahl
    luck: [               // Glück bei der Arbeit: pity = Sekunden Arbeit, nach denen das Stück sicher kommt
      { find: 'sonnenstein', line: 'stein', pity: 1800 },
      { find: 'feder', line: 'jagen', pity: 2400 },
      { find: 'muschel', line: 'fischen', pity: 2400 },
      { find: 'blumenkranz', line: 'sammeln', pity: 600, seasons: [0, 1] },
    ],
  },
  shop: {                // Item-Shop, Schritt 1 zum Ausprobieren (docs/plan-item-shop.md)
    testMode: true,       // Gold kostenlos, es fließt kein echtes Geld
    euroPerGold: 0.0099,  // nur zur Anzeige des Euro-Werts
    packs: [{ gold: 100, euro: '0,99' }, { gold: 550, euro: '4,99' }, { gold: 1200, euro: '9,99' }],
    speed15: 10, speed60: 30,
    speedPerMinute: 0.6, speedMin: 5,   // „sofort fertig“ je Restminute
    findPrice: 25,
    findPrices: { sternkarte: 40, findling: 40, sonnenstein: 60, stosszahn: 40, goldblatt: 60, bernsteinstueck: 60 },
    goods: {
      klein: { name: 'Kleines Warenpaket', price: 30, extra: 1, goods: { nahrung: 100, holz: 100, stein: 50 } },
      gross: { name: 'Großes Warenpaket', price: 100, extra: 4, goods: { nahrung: 400, holz: 400, stein: 200 } },
    },
    slotPrice: 300,
    earn: { quest: 5, wish: 2, chest: 20 },   // so viel Gold verdient man ohne Kauf
  },
  hunt: {                 // Mammutjagd (nach der Forschung „Mammutjagd“, bis zur Jungsteinzeit)
    seconds: 60,          // so lange sind die Jäger unterwegs
    herdWait: 240,        // so lange dauert es nach einer Jagd, bis wieder eine Herde vorbeizieht
    reward: { nahrung: 150, felle: 15, wissen: 10 },   // seit Version 44 (Emin: Jagd soll sich lohnen; vorher 60 Nahrung, 6 Felle)
    bigFactor: 1.5,       // mit einem Mammutjägerlager gibt es mehr
  },
  // Tempo-Regler (Emin, 31.10.: „Forschung, Rohstoffe und Bauen viel zu schnell“ → etwa doppelt so langsam).
  // Werden unten einmal auf BUILDINGS und TECHS angewendet; die Zahlen dort sind die Grundwerte.
  tempo: {
    researchTime: 0.75,   // Forschungszeiten (seit Version 44, Emin: halbiert – vorher 1,5: Steinzeit ≈ 8,5 h, davon 96 % Warten)
    researchGoods: 2.25,  // Forschungen brauchen mehr Waren, damit volle Lager einen Sinn haben (Emin, 03.11.; vorher 1,5), höchstens so viel, wie das Lager des Zeitalters fasst
    knowledgeCost: 1.5,   // und kosten 50 % mehr Wissen
    knowledgeMade: 0.5,   // Höhlenmaler & Co. machen halb so viel Wissen (seit Version 27; vorher 0,7)
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
  wissen:       { name: 'Wissen',      icon: '💡', bild: 'ware-wissen', knowledge: true },   // eigener Speicher: 2 × teuerste Forschung des Zeitalters
  felle:        { name: 'Felle',       icon: '🦌', bild: 'ware-felle',        from: 'alt' },
  kleidung:     { name: 'Kleidung',    icon: '🧥', bild: 'ware-kleidung',     from: 'mittel' },
  werkzeug:     { name: 'Werkzeug',    icon: '🗡️', bild: 'ware-werkzeug',     from: 'mittel' },
  ton:          { name: 'Ton',         icon: '🟤', bild: 'ware-ton',          from: 'jung' },
  toepferwaren: { name: 'Töpferwaren', icon: '🏺', bild: 'ware-toepferwaren', from: 'jung' },
  // Bronzezeit (Bilder folgen ab 27.11., bis dahin das Zeichen)
  kupfererz:    { name: 'Kupfererz',   icon: '⛏️', from: 'kupfer' },
  holzkohle:    { name: 'Holzkohle',   icon: '⚫', from: 'kupfer' },
  kupfer:       { name: 'Kupfer',      icon: '🟠', from: 'kupfer' },
  zinn:         { name: 'Zinn',        icon: '⚪', from: 'frueh' },
  bronze:       { name: 'Bronze',      icon: '🥉', from: 'frueh' },
  wolle:        { name: 'Wolle',       icon: '🐑', from: 'frueh' },
  bernstein:    { name: 'Bernstein',   icon: '🟡', from: 'spaet' },
  schmuck:      { name: 'Schmuck',     icon: '💍', from: 'spaet' },
};

// Stufen der Steinzeit (Unterteilungen = Abschnitte im Forschungsbaum)
const STAGES = [
  { id: 'alt',    name: 'Altsteinzeit',    epoch: 'Steinzeit' },
  { id: 'mittel', name: 'Mittelsteinzeit', epoch: 'Steinzeit' },
  { id: 'jung',   name: 'Jungsteinzeit',   epoch: 'Steinzeit' },
  { id: 'kupfer', name: 'Kupferzeit',      epoch: 'Bronzezeit', theme: 'steinzeit' },   // theme: Leisten-Bilder, bis es eigene gibt (ab 27.11.)
  { id: 'frueh',  name: 'Frühe Bronzezeit', epoch: 'Bronzezeit', theme: 'steinzeit' },
  { id: 'spaet',  name: 'Späte Bronzezeit', epoch: 'Bronzezeit', theme: 'steinzeit' },
];

// Bedürfnisse der Einwohner. kind: 'stock' = Ware im Lager, 'area' = Gebäude im Umkreis der Wohnung
const NEEDS = [
  { id: 'nahrung',      name: 'Nahrung',              icon: '🍖', from: 'alt',    kind: 'stock' },
  { id: 'waerme',       name: 'Wärme und Gemeinschaft', icon: '🔥', from: 'alt',  kind: 'area' },
  { id: 'kleidung',     name: 'Kleidung',             icon: '🧥', from: 'mittel', kind: 'stock' },
  { id: 'glaube',       name: 'Glaube',               icon: '🗿', from: 'mittel', kind: 'area' },
  { id: 'toepferwaren', name: 'Töpferwaren',          icon: '🏺', from: 'jung',   kind: 'stock' },
  { id: 'werkzeug',     name: 'Werkzeug',             icon: '🗡️', from: 'frueh',  kind: 'stock', perPerson: 0.01 },   // perPerson: je Einwohner und Minute, sonst CONFIG.goodsPerPerson
  { id: 'schmuck',      name: 'Schmuck',              icon: '💍', from: 'spaet',  kind: 'stock', perPerson: 0.003 },   // Bernstein gibt es nur beim Händler: darf nicht mehr verlangen, als er bringt
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
    name: 'Lagerfeuer', icon: '🔥', size: 3, line: 'mitte', tier: 0, stage: 'alt', bild: '1-lagerfeuer', views: ['r2'],
    color: '#c9733a', buildable: false, storage: CONFIG.baseStorage, warmth: 7,
    info: 'Mittelpunkt des Lagers: Hier liegen alle Vorräte, das Feuer wärmt die Wohnungen im Umkreis.',
  },
  wohnhoehle: {
    name: 'Wohnhöhle', icon: '🪨', size: 2, line: 'wohnen', tier: 0, stage: 'alt', bild: '1-wohnhoehle', views: ['r2'],
    color: '#9a9184', cost: { stein: 10 }, time: 20, housing: 3, upgradeTo: 'fellzelt',
    info: 'Ein Felsüberhang mit Fellvorhang – Platz für 3 Menschen.',
  },
  fellzelt: {
    name: 'Fellzelt', icon: '⛺', size: 2, line: 'wohnen', tier: 1, stage: 'alt', bild: '1-fellzelt', views: ['r2'],
    color: '#b88a57', cost: { holz: 15, felle: 2 }, time: 30, housing: 4, requires: 'fellzelte', upgradeTo: 'grubenhaus',
    info: 'Zelt aus Stangen und Fellen – Platz für 5 Menschen.',
  },
  grubenhaus: {
    name: 'Grubenhaus', icon: '🏠', size: 2, line: 'wohnen', tier: 2, stage: 'mittel', bild: '1-grubenhaus', views: ['r2'],
    color: '#a07040', cost: { holz: 30, stein: 20 }, time: 60, housing: 6, requires: 'grubenhaus', upgradeTo: 'langhaus',
    info: 'Halb in den Boden gegraben, mit Schilfdach – Platz für 6 Menschen.',
  },
  langhaus: {
    name: 'Langhaus', icon: '🏡', size: 3, line: 'wohnen', tier: 3, stage: 'jung', bild: '1-langhaus', views: ['r2'],
    color: '#8d5a32', cost: { holz: 100, stein: 50, werkzeug: 10 }, time: 180, housing: 14, requires: 'langhausbau', upgradeTo: 'lehmhaus',
    info: 'Großes Haus aus Holz und Lehm – Platz für 14 Menschen.',
  },
  pfahlbau: {
    name: 'Pfahlbau', icon: '🏘️', size: 3, line: 'wasserwohnen', tier: 0, stage: 'jung', bild: '1-pfahlbau', views: ['r1', 'r2'],
    color: '#7d6040', cost: { holz: 120, werkzeug: 10 }, time: 180, housing: 12, needsWater: true,
    produces: { nahrung: 2 }, requires: 'pfahlbauten', upgradeTo: 'fischerhaus',
    info: 'Häuser auf Pfählen am Wasser – Platz für 12 Menschen, dazu etwas Fisch.',
  },
  sammlerin: {
    name: 'Sammlerin', icon: '🫐', size: 2, line: 'sammeln', tier: 0, stage: 'alt', bild: '1-sammlerin', views: ['r2'],
    color: '#9c5ab8', cost: { holz: 10 }, time: 30, workers: 2, produces: { nahrung: 8 }, upgradeTo: 'gemuesegarten',
    bonus: { terrain: 'wald', perTile: 0.04, max: 0.5 },
    info: 'Sammelt Beeren, Pilze und Wurzeln. Am Wald mehr, im Winter wenig.',
  },
  // Jägerlager und Mammutjägerlager seit Version 74 20 % weniger Nahrung (Emin, 03.11.: Lager sind zu oft voll; vorher 10 und 20)
  jaegerlager: {
    name: 'Jägerlager', icon: '🏹', size: 3, line: 'jagen', tier: 0, stage: 'alt', bild: '1-jaegerlager', views: ['r2'],
    color: '#8a6a3a', cost: { holz: 20, stein: 10 }, time: 60, workers: 3, produces: { nahrung: 8, felle: 1 },
    bonus: { terrain: 'wald', perTile: 0.03, max: 0.5 }, upgradeTo: 'mammutjaegerlager',
    info: 'Jäger bringen Fleisch und ein paar Felle. Am Wald mehr.',
  },
  mammutjaegerlager: {
    name: 'Mammutjägerlager', icon: '🦣', size: 3, line: 'jagen', tier: 1, stage: 'alt', bild: '1-mammutjaegerlager', views: ['r2'],
    color: '#6f5030', cost: { holz: 60, stein: 40 }, time: 120, workers: 4, produces: { nahrung: 16, felle: 2 },
    bonus: { terrain: 'wald', perTile: 0.03, max: 0.5 }, requires: 'mammutjagd', upgradeOnly: true, upgradeTo: 'jagdhuette',
    info: 'Doppelt so viel Nahrung und Felle wie das Jägerlager.',
  },
  fischerplatz: {
    name: 'Fischerplatz', icon: '🎣', size: 2, line: 'fischen', tier: 0, stage: 'mittel', bild: '1-fischerhuette',
    color: '#4f86b0', cost: { holz: 30 }, time: 60, workers: 2, produces: { nahrung: 14 }, needsWater: true, stilts: true, upgradeTo: 'fischerhuette',
    requires: 'einbaum', info: 'Fischerhütte auf Säulen, unten liegt das Boot – viel Nahrung. Steht mit den Säulen im Fluss, ein Stück auch an Land.',
  },
  acker: {
    name: 'Acker', icon: '🌾', size: 3, line: 'feld', tier: 0, stage: 'jung', bild: '1-acker', views: ['r2'],
    color: '#d8b44a', cost: { holz: 40, werkzeug: 5 }, time: 90, workers: 4, produces: { nahrung: 30 }, upgradeTo: 'feld',
    requires: 'ackerbau', info: 'Sehr viel Nahrung – im Sommer am meisten, im Winter nichts.',
  },
  ziegengehege: {
    name: 'Ziegengehege', icon: '🐐', size: 3, line: 'tiere', tier: 0, stage: 'jung', bild: '1-ziegengehege', views: ['r2'],
    color: '#c8b48a', cost: { holz: 60, werkzeug: 5 }, time: 120, workers: 3, produces: { nahrung: 10, felle: 2 }, upgradeTo: 'viehhof',
    requires: 'viehzucht', info: 'Ziegen geben Milch, Fleisch und Felle – das ganze Jahr.',
  },
  holzsammler: {
    name: 'Holzsammler', icon: '🪓', size: 2, line: 'holz', tier: 0, stage: 'alt', bild: '1-holzsammler', views: ['r2'],
    color: '#7a5230', cost: { stein: 5 }, time: 30, workers: 2, produces: { holz: 8 }, upgradeTo: 'holzfaeller',
    bonus: { terrain: 'wald', perTile: 0.04, max: 0.6 }, fellsTrees: true,
    info: 'Fällt Bäume und sammelt Holz. Am Wald viel mehr – aber die Bäume werden weniger. Eine Pflanzerin setzt neue.',
  },
  pflanzerin: {
    name: 'Pflanzerin', icon: '🌱', size: 2, line: 'pflanzen', tier: 0, stage: 'alt', bild: '1-pflanzerin', views: ['r2'],
    color: '#6a9a3a', cost: { holz: 20, stein: 5 }, time: 40, workers: 1, plants: true, upgradeTo: 'baumgaertnerin',
    info: 'Sammelt Samen und pflanzt Setzlinge im Umkreis. Nach 10 Minuten ist daraus ein Baum gewachsen.',
  },
  steinsammler: {
    name: 'Steinsammler', icon: '⛏️', size: 2, line: 'stein', tier: 0, stage: 'alt', bild: '1-steinsammler', views: ['r2'],
    color: '#8a8a8a', cost: { holz: 15 }, time: 30, workers: 2, produces: { stein: 6 }, upgradeTo: 'steinbruch',
    bonus: { terrain: ['fels', 'berg'], perTile: 0.06, max: 0.6 }, minesRocks: true,
    info: 'Sammelt Steine. An Felsen und am Gebirge viel mehr. Felsen in der Nähe werden nach und nach abgebaut – am Gebirge gibt es Stein ohne Ende.',
  },
  geschichtenhoehle: {
    name: 'Höhle der Geschichten', icon: '🎨', size: 4, line: 'wunder', tier: 0, stage: 'alt', bild: '1-hoehle', wonder: 'hoehle',
    color: '#8a5a3a', cost: {}, time: 1, requires: 'hoehlenmalerei', needsRock: true, warmth: 8, produces: { wissen: 3 },
    info: 'Wunderwerk: Tippe es an, um Abschnitt für Abschnitt weiterzubauen. Muss an Felsen stehen.',
  },
  hoehlenmaler: {
    name: 'Höhlenmaler', icon: '🎨', size: 2, line: 'wissen', tier: 0, stage: 'alt', bild: '1-hoehlenmaler', views: ['r2'],
    color: '#c05a3a', cost: { holz: 15, stein: 15 }, time: 45, workers: 1, produces: { wissen: 4 }, upgradeTo: 'felsritzer',
    bonus: { terrain: 'fels', perTile: 0.05, max: 0.5 }, info: 'Malt Geschichten an Felswände – bringt Wissen für die Forschung.',
  },
  feuerplatz: {
    name: 'Feuerplatz', icon: '🔥', size: 2, line: 'waerme', tier: 0, stage: 'alt', bild: '1-feuerplatz', views: ['r2'],
    color: '#d0603a', cost: { holz: 15, stein: 10 }, time: 30, warmth: 5, upgradeTo: 'dorfbrunnen',
    info: 'Wärme und Gemeinschaft für Wohnungen im Umkreis.',
  },
  fellmacherin: {
    name: 'Fellmacherin', icon: '🧥', size: 2, line: 'kleidung', tier: 0, stage: 'mittel', bild: '1-fellmacherin', views: ['r2'],
    color: '#a8784a', cost: { holz: 40, stein: 20 }, time: 90, workers: 2, consumes: { felle: 4 }, produces: { kleidung: 2.5 }, upgradeTo: 'weberin',
    requires: 'fellbearbeitung', info: 'Näht aus Fellen Kleidung: aus 8 Fellen werden 5 Kleidung.',
  },
  steinschlaeger: {
    name: 'Steinschläger', icon: '🗡️', size: 2, line: 'werkzeug', tier: 0, stage: 'mittel', bild: '1-steinschlaeger', views: ['r2'],
    color: '#707880', cost: { holz: 30, stein: 40 }, time: 90, workers: 2, consumes: { stein: 2, holz: 1 }, produces: { werkzeug: 1 }, upgradeTo: 'kupferschmied',
    requires: 'feine_klingen', info: 'Schlägt aus 2 Stein und 1 Holz 1 Werkzeug.',
  },
  ahnenplatz: {
    name: 'Ahnenplatz', icon: '🗿', size: 3, line: 'glaube', tier: 0, stage: 'mittel', bild: '1-ahnenplatz', views: ['r2'],
    color: '#8a7a6a', cost: { holz: 60, stein: 60 }, time: 120, belief: 8, requires: 'ahnenkult', upgradeTo: 'heiliger_hain',
    info: 'Hier ehrt der Stamm die Ahnen – Glaube für Wohnungen im Umkreis.',
  },
  tongrube: {
    name: 'Tongrube', icon: '🟤', size: 2, line: 'ton', tier: 0, stage: 'jung', bild: '1-tongrube', views: ['r1', 'r2'],
    color: '#a0603a', cost: { holz: 30, werkzeug: 3 }, time: 60, workers: 3, produces: { ton: 4 }, needsWater: true, upgradeTo: 'lehmgrube',
    requires: 'toepfern', info: 'Gräbt Ton am Ufer. Muss am Wasser stehen.',
  },
  toepferei: {
    name: 'Töpferei', icon: '🏺', size: 2, line: 'toepfern', tier: 0, stage: 'jung', bild: '1-toepferei', views: ['r2'],
    color: '#b8643a', cost: { holz: 50, stein: 40 }, time: 120, workers: 3, consumes: { ton: 2, holz: 1 }, produces: { toepferwaren: 1.25 }, upgradeTo: 'toepferwerkstatt',
    requires: 'toepfern', info: 'Formt und brennt aus Ton und Holz Töpferwaren: aus 8 Ton und 4 Holz werden 5 Töpferwaren.',
  },
  vorratsspeicher: {
    name: 'Vorratsspeicher', icon: '🛖', size: 3, line: 'lager', tier: 0, stage: 'jung', bild: '1-vorratsspeicher', views: ['r2'],
    color: '#b09060', cost: { holz: 80, stein: 40 }, time: 120, storage: 150, requires: 'vorratshaltung', upgradeTo: 'kornspeicher',
    info: 'Mehr Lagerplatz für alle Waren.',
  },
  steinkreis: {
    name: 'Steinkreis', icon: '🪨', size: 4, line: 'wahrzeichen', tier: 0, stage: 'jung', bild: '1-steinkreis', views: ['r2'], wonder: 'steinkreis',
    color: '#9a9a9a', cost: {}, time: 1, belief: 14, warmth: 14,
    requires: 'sternenkunde', info: 'Wunderwerk der Steinzeit: Tippe es an, um Abschnitt für Abschnitt weiterzubauen. Glaube und Wärme im großen Umkreis. Nötig für den Aufbruch.',
  },
  himmelshalle: {
    name: 'Halle der Himmelsscheibe', icon: '🌞', size: 4, line: 'wunder_bronze', tier: 0, stage: 'spaet', bild: '2-halle', wonder: 'himmelshalle',
    color: '#c9a23a', cost: {}, time: 1, belief: 14, requires: 'himmelsscheibe',
    info: 'Wunderwerk der Bronzezeit: Tippe es an, um Abschnitt für Abschnitt weiterzubauen und die Himmelsscheibe zusammenzusetzen.',
  },
  // ----- Bronzezeit, Stufe Kupferzeit. Bilder folgen ab 27.11.: Weiterentwicklungen zeigen so lange das Bild der Vorstufe,
  // neue Gebäude ein Platzhalter-Feld.
  lehmhaus: {
    name: 'Lehmhaus', icon: '🧱', size: 3, line: 'wohnen', tier: 4, stage: 'kupfer', bild: '1-langhaus', views: ['r2'],
    color: '#a8703f', cost: { holz: 120, stein: 60, ton: 30 }, time: 200, housing: 18, requires: 'lehmbau', upgradeTo: 'hallenhaus',
    info: 'Feste Wände aus Lehm – Platz für 18 Menschen.',
  },
  gemuesegarten: {
    name: 'Gemüsegarten', icon: '🥕', size: 2, line: 'sammeln', tier: 1, stage: 'kupfer', bild: '1-sammlerin', views: ['r2'],
    color: '#7da83f', cost: { holz: 15, stein: 5 }, time: 30, workers: 2, produces: { nahrung: 12 }, requires: 'gartenbau',
    bonus: { terrain: 'wald', perTile: 0.04, max: 0.5 },
    info: 'Gemüse und Kräuter direkt am Haus. Bringt mehr als das Sammeln, im Winter wenig.',
  },
  fischerhuette: {
    name: 'Fischerhütte', icon: '🐟', size: 2, line: 'fischen', tier: 1, stage: 'kupfer', bild: '1-fischerhuette',
    color: '#4f86b0', cost: { holz: 40 }, time: 60, workers: 2, produces: { nahrung: 20 }, needsWater: true, stilts: true, requires: 'netze',
    info: 'Fischen mit Netzen statt mit dem Speer – viel mehr Fisch.',
  },
  holzfaeller: {
    name: 'Holzfäller', icon: '🪓', size: 2, line: 'holz', tier: 1, stage: 'kupfer', bild: '1-holzsammler', views: ['r2'],
    color: '#7a5230', cost: { stein: 10 }, time: 30, workers: 2, produces: { holz: 12 }, requires: 'kupferbeil',
    bonus: { terrain: 'wald', perTile: 0.04, max: 0.6 }, fellsTrees: true,
    info: 'Mit dem Kupferbeil geht das Fällen viel schneller. Eine Pflanzerin setzt neue Bäume.',
  },
  steinbruch: {
    name: 'Steinbruch', icon: '⛏️', size: 2, line: 'stein', tier: 1, stage: 'kupfer', bild: '1-steinsammler', views: ['r2'],
    color: '#8a8a8a', cost: { holz: 20 }, time: 30, workers: 2, produces: { stein: 9 }, requires: 'kupferbeil',
    bonus: { terrain: ['fels', 'berg'], perTile: 0.06, max: 0.6 }, minesRocks: true,
    info: 'Bricht Steine mit Kupferwerkzeug. An Felsen und am Gebirge viel mehr.',
  },
  felsritzer: {
    name: 'Felsritzer', icon: '🪨', size: 2, line: 'wissen', tier: 1, stage: 'kupfer', bild: '1-hoehlenmaler', views: ['r2'],
    color: '#c05a3a', cost: { holz: 20, stein: 20 }, time: 45, workers: 1, produces: { wissen: 6 }, requires: 'felsritzungen',
    bonus: { terrain: 'fels', perTile: 0.05, max: 0.5 }, upgradeTo: 'sternkundiger', info: 'Ritzt Geschichten in den Fels – mehr Wissen als das Malen.',
  },
  dorfbrunnen: {
    name: 'Dorfbrunnen', icon: '⛲', size: 2, line: 'waerme', tier: 1, stage: 'kupfer', bild: '1-feuerplatz', views: ['r2'],
    color: '#6f9ab0', cost: { holz: 20, stein: 15 }, time: 30, warmth: 6, happy: 5, requires: 'brunnenbau',
    info: 'Hier trifft sich das Dorf: Gemeinschaft im Umkreis und bessere Laune.',
  },
  lehmgrube: {
    name: 'Lehmgrube', icon: '🟤', size: 2, line: 'ton', tier: 1, stage: 'kupfer', bild: '1-tongrube', views: ['r1', 'r2'],
    color: '#a0603a', cost: { holz: 40, werkzeug: 3 }, time: 60, workers: 3, produces: { ton: 6 }, needsWater: true, requires: 'lehmbau',
    info: 'Gräbt Lehm und Ton am Ufer. Muss am Wasser stehen.',
  },
  kupferschmied: {
    name: 'Kupferschmied', icon: '🔨', size: 2, line: 'werkzeug', tier: 1, stage: 'kupfer', bild: '1-steinschlaeger', views: ['r2'],
    color: '#b5683a', cost: { holz: 40, stein: 50, kupfer: 10 }, time: 90, workers: 2, consumes: { kupfer: 1, holz: 1 }, produces: { werkzeug: 2 },
    requires: 'kupferschmied', manualUpgrade: true, upgradeTo: 'bronzeschmied',
    info: 'Schmiedet aus 1 Kupfer und 1 Holz 2 Werkzeuge. Lässt etwas Kupfer für Bauen und Forschung liegen. Braucht Kupfer – darum nur per Knopf umbauen, wenn es da ist.',
  },
  kupfermine: {
    name: 'Kupfermine', icon: '⛏️', size: 3, line: 'erz', tier: 0, stage: 'kupfer', bild: '2-kupfermine',
    color: '#9a6a3a', cost: { holz: 80, stein: 40, werkzeug: 10 }, time: 120, workers: 3, produces: { kupfererz: 4 }, needsRock: true, requires: 'bergbau',
    bonus: { terrain: 'berg', perTile: 0.05, max: 0.5 },
    info: 'Gräbt Kupfererz. Muss an Felsen oder am Gebirge stehen – am Gebirge bis zu 50 % mehr.',
  },
  koehler: {
    name: 'Köhler', icon: '⚫', size: 2, line: 'kohle', tier: 0, stage: 'kupfer', bild: '2-koehler',
    color: '#4a4a4a', cost: { holz: 40, stein: 20 }, time: 60, workers: 2, consumes: { holz: 4 }, produces: { holzkohle: 2 }, requires: 'kupferschmelze',
    info: 'Brennt im Meiler aus 2 Holz 1 Holzkohle.',
  },
  schmelzofen: {
    name: 'Schmelzofen', icon: '🔥', size: 2, line: 'schmelzen', tier: 0, stage: 'kupfer', bild: '2-schmelzofen',
    color: '#c0602a', cost: { stein: 60, ton: 20 }, time: 120, workers: 2, consumes: { kupfererz: 2, holzkohle: 1 }, produces: { kupfer: 1 }, requires: 'kupferschmelze',
    info: 'Schmilzt aus 2 Kupfererz und 1 Holzkohle 1 Kupfer.',
  },
  // ----- Bronzezeit, Stufe Frühe Bronzezeit (Bilder folgen, wie bei der Kupferzeit)
  jagdhuette: {
    name: 'Jagdhütte', icon: '🦌', size: 3, line: 'jagen', tier: 2, stage: 'frueh', bild: '1-mammutjaegerlager', views: ['r2'],
    color: '#6f5030', cost: { holz: 80, stein: 50, bronze: 3 }, time: 120, workers: 4, produces: { nahrung: 26, felle: 3 }, requires: 'bronzewerkzeug',
    bonus: { terrain: 'wald', perTile: 0.03, max: 0.5 },
    info: 'Jäger mit Pfeilspitzen aus Bronze: mehr Fleisch und mehr Felle. Am Wald mehr.',
  },
  feld: {
    name: 'Feld', icon: '🐂', size: 3, line: 'feld', tier: 1, stage: 'frueh', bild: '1-acker', views: ['r2'],
    color: '#d8b44a', cost: { holz: 55, werkzeug: 8 }, time: 90, workers: 4, produces: { nahrung: 45 }, requires: 'hakenpflug',
    info: 'Mit Ochse und Hakenpflug – sehr viel Nahrung. Im Sommer am meisten, im Winter nichts.',
  },
  viehhof: {
    name: 'Viehhof', icon: '🐑', size: 3, line: 'tiere', tier: 1, stage: 'frueh', bild: '1-ziegengehege', views: ['r2'],
    color: '#c8b48a', cost: { holz: 80, werkzeug: 6 }, time: 120, workers: 3, produces: { nahrung: 14, wolle: 4, felle: 1 }, requires: 'schafzucht',
    info: 'Schafe und Rinder geben Fleisch, Milch und Wolle – das ganze Jahr.',
  },
  baumgaertnerin: {
    name: 'Baumgärtnerin', icon: '🌳', size: 2, line: 'pflanzen', tier: 1, stage: 'frueh', bild: '1-pflanzerin', views: ['r2'],
    color: '#6a9a3a', cost: { holz: 25, stein: 8 }, time: 40, workers: 1, plants: true, plantSeconds: 40, requires: 'kupferbeil',
    info: 'Zieht Setzlinge und pflanzt schneller als die Pflanzerin. Holzfäller und Köhler brauchen viel Holz.',
  },
  weberin: {
    name: 'Weberin', icon: '🧶', size: 2, line: 'kleidung', tier: 1, stage: 'frueh', bild: '1-fellmacherin', views: ['r2'],
    color: '#a8784a', cost: { holz: 50, stein: 25, bronze: 2 }, time: 90, workers: 2, consumes: { wolle: 4 }, produces: { kleidung: 4 }, requires: 'webstuhl', manualUpgrade: true,
    info: 'Webt aus Wolle Kleidung – mehr, als die Fellmacherin aus Fellen näht. Braucht Wolle: darum nur per Knopf umbauen, wenn sie da ist.',
  },
  bronzeschmied: {
    name: 'Bronzeschmied', icon: '⚒️', size: 2, line: 'werkzeug', tier: 2, stage: 'frueh', bild: '1-steinschlaeger', views: ['r2'],
    color: '#b5683a', cost: { holz: 40, stein: 60, bronze: 10 }, time: 90, workers: 2, consumes: { bronze: 1, holz: 1 }, produces: { werkzeug: 4 }, requires: 'bronzewerkzeug', manualUpgrade: true,
    info: 'Schmiedet aus 1 Bronze und 1 Holz 4 Werkzeuge. Lässt etwas Bronze für Bauen und Forschung liegen. Braucht Bronze: darum nur per Knopf umbauen, wenn sie da ist.',
  },
  toepferwerkstatt: {
    name: 'Töpferwerkstatt', icon: '🏺', size: 2, line: 'toepfern', tier: 1, stage: 'frueh', bild: '1-toepferei', views: ['r2'],
    color: '#b8643a', cost: { holz: 65, stein: 50, bronze: 2 }, time: 120, workers: 3, consumes: { ton: 2, holzkohle: 1 }, produces: { toepferwaren: 2 }, requires: 'brennofen', manualUpgrade: true,
    info: 'Der Brennofen mit Holzkohle macht aus 2 Ton und 1 Holzkohle 2 Töpferwaren. Braucht Holzkohle: darum nur per Knopf umbauen.',
  },
  zinnwaescherin: {
    name: 'Zinnwäscherin', icon: '⚪', size: 2, line: 'zinn', tier: 0, stage: 'frueh', bild: '2-zinnwaescherin',
    color: '#8fa3ad', cost: { holz: 40, werkzeug: 5 }, time: 90, workers: 2, produces: { zinn: 1 }, needsWater: true, requires: 'zinnseifen',
    info: 'Wäscht Zinnsand aus dem Fluss – nur wenig. Muss am Wasser stehen. Mehr Zinn bringt der Händler.',
  },
  bronzegiesser: {
    name: 'Bronzegießer', icon: '🥉', size: 2, line: 'bronze', tier: 0, stage: 'frueh', bild: '2-bronzegiesser',
    color: '#b08a3a', cost: { stein: 60, kupfer: 20 }, time: 120, workers: 2, consumes: { kupfer: 2, zinn: 1 }, produces: { bronze: 1 }, requires: 'bronzeguss',
    info: 'Gießt aus 2 Kupfer und 1 Zinn 1 Bronze – härter als alles bisher. Lässt etwas Kupfer für Bauen und Forschung liegen.',
  },
  handelsplatz: {
    name: 'Handelsplatz', icon: '🤝', size: 3, line: 'handel', tier: 0, stage: 'frueh', bild: '2-handelsplatz',
    color: '#c79a4a', cost: { holz: 120, stein: 60, bronze: 10 }, time: 180, requires: 'tauschhandel',
    info: 'Hierher kommt regelmäßig ein Händler mit dem Ochsenkarren und tauscht Waren gegen Waren – aber nur, solange du spielst.',
  },
  // ----- Bronzezeit, Stufe Späte Bronzezeit (Bilder folgen, wie bei den anderen Stufen)
  hallenhaus: {
    name: 'Hallenhaus', icon: '🏛️', size: 3, line: 'wohnen', tier: 5, stage: 'spaet', bild: '1-langhaus', views: ['r2'],
    color: '#a8703f', cost: { holz: 160, stein: 80, bronze: 10 }, time: 220, housing: 24, requires: 'hallenhaus',
    info: 'Ein großes, stolzes Haus mit langem Dach – Platz für 24 Menschen.',
  },
  fischerhaus: {
    name: 'Fischerhaus', icon: '🛶', size: 3, line: 'wasserwohnen', tier: 1, stage: 'spaet', bild: '1-pfahlbau', views: ['r1', 'r2'],
    color: '#7d6040', cost: { holz: 150, werkzeug: 12, bronze: 3 }, time: 180, housing: 16, needsWater: true, produces: { nahrung: 4 }, requires: 'plankenboote',
    info: 'Häuser am Wasser mit Plankenbooten – Platz für 16 Menschen und mehr Fisch.',
  },
  sternkundiger: {
    name: 'Sternkundiger', icon: '🌙', size: 2, line: 'wissen', tier: 2, stage: 'spaet', bild: '1-hoehlenmaler', views: ['r2'],
    color: '#5a6aa0', cost: { holz: 25, stein: 25, bronze: 2 }, time: 60, workers: 1, produces: { wissen: 9 }, requires: 'himmelsscheibe',
    bonus: { terrain: 'fels', perTile: 0.05, max: 0.5 }, info: 'Liest mit der Himmelsscheibe Sonne, Mond und Sterne – noch mehr Wissen.',
  },
  heiliger_hain: {
    name: 'Heiliger Hain', icon: '🌳', size: 3, line: 'glaube', tier: 1, stage: 'spaet', bild: '1-ahnenplatz', views: ['r2'],
    color: '#5f8a4a', cost: { holz: 80, stein: 70, bronze: 3 }, time: 120, belief: 11, requires: 'heiliger_hain',
    info: 'Ein Kreis alter Eichen – Glaube für Wohnungen in einem größeren Umkreis.',
  },
  kornspeicher: {
    name: 'Kornspeicher', icon: '🌾', size: 3, line: 'lager', tier: 1, stage: 'spaet', bild: '1-vorratsspeicher', views: ['r2'],
    color: '#b09060', cost: { holz: 100, stein: 50, bronze: 3 }, time: 120, storage: 250, requires: 'kornspeicher',
    info: 'Ein großer Speicher auf Steinfüßen – viel mehr Lagerplatz für alle Waren.',
  },
  schmuckmacherin: {
    name: 'Schmuckmacherin', icon: '💍', size: 2, line: 'schmuck', tier: 0, stage: 'spaet', bild: '2-schmuckmacherin',
    color: '#c79a3a', cost: { holz: 60, stein: 40, bronze: 15 }, time: 120, workers: 2, consumes: { bronze: 1, bernstein: 1 }, produces: { schmuck: 2 }, requires: 'schmuckkunst',
    info: 'Macht aus 1 Bronze und 1 Bernstein 2 Stück Schmuck. Bernstein bringt nur der Händler. Lässt etwas Bronze für Bauen und Forschung liegen.',
  },
  fuerstenhuegel: {
    name: 'Fürstenhügel', icon: '⛰️', size: 4, line: 'wahrzeichen', tier: 1, stage: 'spaet', bild: '2-fuerstenhuegel',
    color: '#6f9a4a', cost: { stein: 300, holz: 150, bronze: 30 }, time: 360, belief: 18, happy: 10, requires: 'fuerstenhuegel',
    info: 'Wahrzeichen der Bronzezeit: ein grüner Hügel mit Steinkranz, Fahnen und Festplatz. Glaube im großen Umkreis und bessere Laune. Nötig für den Aufbruch.',
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
  // ----- Aufbruch und Kupferzeit (Entwurf: docs/epoche-2-bronzezeit.md)
  aufbruch_bronzezeit: {
    name: 'Aufbruch in die Bronzezeit', icon: '🥉', stage: 'jung', col: 10, row: 2, transition: true, requires: ['kupferfund', 'pfahlbauten'],
    population: 120, cost: { wissen: 130, holz: 300, stein: 250, nahrung: 300, toepferwaren: 30, werkzeug: 30 }, time: 300,
    effect: { stage: 'kupfer', gift: { kupfer: 20, kupfererz: 30 } }, bild: 'f-kupfer',
  },
  bergbau:        { name: 'Bergbau',        icon: '⛏️', stage: 'kupfer', col: 11, row: 3, requires: ['aufbruch_bronzezeit'], population: 125, cost: { wissen: 130, holz: 100 }, time: 720, effect: {} },
  kupferschmelze: { name: 'Kupferschmelze', icon: '🔥', stage: 'kupfer', col: 12, row: 3, requires: ['bergbau'], population: 130, cost: { wissen: 140, stein: 100 }, time: 780, effect: {} },
  kupferbeil:     { name: 'Kupferbeil',     icon: '🪓', stage: 'kupfer', col: 13, row: 3, requires: ['kupferschmelze'], population: 140, cost: { wissen: 150, kupfer: 15 }, time: 840, effect: {} },
  kupferschmied:  { name: 'Kupferschmied',  icon: '🔨', stage: 'kupfer', col: 13, row: 4, requires: ['kupferschmelze'], population: 140, cost: { wissen: 150, kupfer: 20 }, time: 840, effect: {} },
  gartenbau:      { name: 'Gartenbau',      icon: '🥕', stage: 'kupfer', col: 11, row: 0, requires: ['aufbruch_bronzezeit'], population: 125, cost: { wissen: 120, nahrung: 120 }, time: 660, effect: {} },
  netze:          { name: 'Netze',          icon: '🎣', stage: 'kupfer', col: 12, row: 0, requires: ['gartenbau'], population: 135, cost: { wissen: 130, holz: 60 }, time: 720, effect: {} },
  lehmbau:        { name: 'Lehmbau',        icon: '🧱', stage: 'kupfer', col: 11, row: 2, requires: ['aufbruch_bronzezeit'], population: 130, cost: { wissen: 140, ton: 40 }, time: 720, effect: {} },
  brunnenbau:     { name: 'Brunnenbau',     icon: '⛲', stage: 'kupfer', col: 12, row: 2, requires: ['lehmbau'], population: 140, cost: { wissen: 140, stein: 80 }, time: 780, effect: {} },
  felsritzungen:  { name: 'Felsritzungen',  icon: '🪨', stage: 'kupfer', col: 11, row: 4, requires: ['aufbruch_bronzezeit'], population: 125, cost: { wissen: 110 }, time: 600, effect: {} },
  fruehe_bronzezeit: {
    name: 'Frühe Bronzezeit', icon: '🥉', stage: 'kupfer', col: 14, row: 2, transition: true,
    requires: ['kupferbeil', 'kupferschmied', 'netze', 'brunnenbau', 'felsritzungen'],
    population: 150, cost: { wissen: 180, nahrung: 200, kupfer: 30 }, time: 1800, effect: { stage: 'frueh' },
  },
  hakenpflug:     { name: 'Hakenpflug',     icon: '🐂', stage: 'frueh', col: 15, row: 0, requires: ['fruehe_bronzezeit'], population: 160, cost: { wissen: 180, kupfer: 20 }, time: 840, effect: {} },
  schafzucht:     { name: 'Schafzucht',     icon: '🐑', stage: 'frueh', col: 15, row: 1, requires: ['fruehe_bronzezeit'], population: 160, cost: { wissen: 180, nahrung: 150 }, time: 840, effect: {} },
  webstuhl:       { name: 'Webstuhl',       icon: '🧶', stage: 'frueh', col: 16, row: 1, requires: ['schafzucht'], population: 170, cost: { wissen: 190, wolle: 20 }, time: 900, effect: {} },
  brennofen:      { name: 'Brennofen',      icon: '🏺', stage: 'frueh', col: 15, row: 2, requires: ['fruehe_bronzezeit'], population: 160, cost: { wissen: 170, holzkohle: 30 }, time: 840, effect: {} },
  zinnseifen:     { name: 'Zinnseifen',     icon: '⚪', stage: 'frueh', col: 15, row: 3, requires: ['fruehe_bronzezeit'], population: 155, cost: { wissen: 160, werkzeug: 20 }, time: 780, effect: {} },
  bronzeguss:     { name: 'Bronzeguss',     icon: '🥉', stage: 'frueh', col: 16, row: 3, requires: ['zinnseifen'], population: 165, cost: { wissen: 190, kupfer: 30, zinn: 10 }, time: 900, effect: {} },
  bronzewerkzeug: { name: 'Bronzewerkzeug', icon: '⚒️', stage: 'frueh', col: 17, row: 3, requires: ['bronzeguss'], population: 180, cost: { wissen: 200, bronze: 15 }, time: 960, effect: {} },
  tauschhandel:   { name: 'Tauschhandel',   icon: '🤝', stage: 'frueh', col: 17, row: 4, requires: ['bronzeguss'], population: 155, cost: { wissen: 160, toepferwaren: 20 }, time: 780, effect: {} },
  rad:            { name: 'Rad und Wagen',  icon: '🛞', stage: 'frueh', col: 18, row: 4, requires: ['tauschhandel'], population: 170, cost: { wissen: 190, holz: 150 }, time: 900, effect: { buildFaster: 0.15, traderFaster: 300 } },
  spaete_bronzezeit: {
    name: 'Späte Bronzezeit', icon: '🏅', stage: 'frueh', col: 19, row: 2, transition: true,
    requires: ['hakenpflug', 'webstuhl', 'brennofen', 'bronzewerkzeug', 'rad'],
    population: 200, cost: { wissen: 240, bronze: 30, kleidung: 40 }, time: 2100, effect: { stage: 'spaet' },
  },
  plankenboote:     { name: 'Plankenboote',    icon: '🛶', stage: 'spaet', col: 20, row: 0, requires: ['spaete_bronzezeit'], population: 215, cost: { wissen: 220, holz: 120 }, time: 960, effect: {} },
  hallenhaus:       { name: 'Hallenhaus',      icon: '🏛️', stage: 'spaet', col: 20, row: 2, requires: ['spaete_bronzezeit'], population: 210, cost: { wissen: 230, holz: 150, bronze: 10 }, time: 960, effect: {} },
  kornspeicher:     { name: 'Kornspeicher',    icon: '🌾', stage: 'spaet', col: 21, row: 2, requires: ['spaete_bronzezeit'], population: 220, cost: { wissen: 230, toepferwaren: 25 }, time: 1020, effect: { storage: 0.5 } },
  bernsteinstrasse: { name: 'Bernsteinstraße', icon: '🟡', stage: 'spaet', col: 20, row: 3, requires: ['spaete_bronzezeit'], population: 205, cost: { wissen: 220, bronze: 20 }, time: 960, effect: { traderOffers: 1 } },
  schmuckkunst:     { name: 'Schmuckkunst',    icon: '💍', stage: 'spaet', col: 21, row: 3, requires: ['bernsteinstrasse'], population: 215, cost: { wissen: 240, bronze: 20, bernstein: 10 }, time: 1020, effect: {} },
  himmelsscheibe:   { name: 'Himmelsscheibe',  icon: '🌙', stage: 'spaet', col: 20, row: 4, requires: ['spaete_bronzezeit'], population: 210, cost: { wissen: 210, bronze: 10 }, time: 960, effect: {} },
  heiliger_hain:    { name: 'Heiliger Hain',   icon: '🌳', stage: 'spaet', col: 21, row: 4, requires: ['spaete_bronzezeit'], population: 220, cost: { wissen: 240, toepferwaren: 30 }, time: 1020, effect: {} },
  fuerstenhuegel:   { name: 'Fürstenhügel',    icon: '⛰️', stage: 'spaet', col: 22, row: 3, requires: ['schmuckkunst', 'heiliger_hain'], population: 240, cost: { wissen: 250, schmuck: 15 }, time: 1080, effect: {} },
  eisenfund:        { name: 'Eisenfund',       icon: '🔩', stage: 'spaet', col: 23, row: 2, requires: ['plankenboote', 'hallenhaus', 'kornspeicher', 'fuerstenhuegel', 'himmelsscheibe'], population: 250, cost: { wissen: 280, bronze: 40, schmuck: 20 }, time: 2400, effect: {} },
  // Das Ziel der Bronzezeit. soon: lässt sich noch nicht starten – die Eisenzeit bekommt einen eigenen Entwurf.
  aufbruch_eisenzeit: {
    name: 'Aufbruch in die Eisenzeit', icon: '🔩', stage: 'spaet', col: 24, row: 2, transition: true, soon: true, requires: ['eisenfund'],
    population: 280, cost: { wissen: 280, holz: 400, stein: 300, nahrung: 400, bronze: 60, schmuck: 30, werkzeug: 50 }, time: 300, effect: {},
  },
};

// Forschung verlangt auch Gebäude (Emin, 02.11.): Wer weiterkommen will, muss weiterbauen.
// Gezählt werden fertige Gebäude derselben Linie ab dieser Stufe (ein Fellzelt zählt also auch als Wohnhöhle).
const TECH_NEEDS = {
  flechtkoerbe:    { sammlerin: 2 },
  faustkeil:       { holzsammler: 1, steinsammler: 1 },
  speerspitzen:    { jaegerlager: 2 },
  fellzelte:       { wohnhoehle: 6 },
  hoehlenmalerei:  { hoehlenmaler: 2 },
  mammutjagd:      { jaegerlager: 3 },
  mittelsteinzeit: { hoehlenmaler: 3, feuerplatz: 3, pflanzerin: 1 },
  pfeil_bogen:     { jaegerlager: 4 },
  einbaum:         { holzsammler: 3 },
  fellbearbeitung: { pflanzerin: 2 },
  grubenhaus:      { wohnhoehle: 8 },
  feine_klingen:   { steinsammler: 3 },
  ahnenkult:       { feuerplatz: 4 },
  jungsteinzeit:   { fellmacherin: 2, steinschlaeger: 2, ahnenplatz: 1, fischerplatz: 1 },
  ackerbau:        { fischerplatz: 2 },
  sichel:          { acker: 2 },
  viehzucht:       { acker: 2 },
  langhausbau:     { grubenhaus: 8 },
  pfahlbauten:     { langhaus: 3 },
  toepfern:        { hoehlenmaler: 4 },
  vorratshaltung:  { tongrube: 1, toepferei: 1 },
  sternenkunde:    { ahnenplatz: 2 },
  kupferfund:      { steinkreis: 1, vorratsspeicher: 1, ziegengehege: 1 },
  aufbruch_bronzezeit: { steinkreis: 1 },
  kupferschmelze:  { kupfermine: 1 },
  kupferbeil:      { schmelzofen: 1 },
  kupferschmied:   { schmelzofen: 1 },
  netze:           { gemuesegarten: 2 },
  brunnenbau:      { lehmhaus: 3 },
  felsritzungen:   { hoehlenmaler: 5 },
  fruehe_bronzezeit: { kupfermine: 2, koehler: 2, schmelzofen: 2, kupferschmied: 1 },
  zinnseifen:      { kupferschmied: 2 },
  bronzeguss:      { zinnwaescherin: 1 },
  bronzewerkzeug:  { bronzegiesser: 1 },
  tauschhandel:    { bronzegiesser: 1 },
  rad:             { handelsplatz: 1 },
  hakenpflug:      { acker: 4 },
  schafzucht:      { ziegengehege: 2 },
  webstuhl:        { viehhof: 2 },
  brennofen:       { koehler: 3 },
  spaete_bronzezeit: { bronzegiesser: 2, weberin: 2, bronzeschmied: 1, toepferwerkstatt: 1, handelsplatz: 1 },
  plankenboote:    { fischerhuette: 3 },
  hallenhaus:      { lehmhaus: 8 },
  kornspeicher:    { vorratsspeicher: 2 },
  bernsteinstrasse: { bronzegiesser: 3 },
  himmelsscheibe:  { felsritzer: 6 },
  heiliger_hain:   { ahnenplatz: 3 },
  fuerstenhuegel:  { schmuckmacherin: 1, heiliger_hain: 1 },
  eisenfund:       { fuerstenhuegel: 1, hallenhaus: 5 },
  aufbruch_eisenzeit: { himmelshalle: 1, fuerstenhuegel: 1, sternkundiger: 2, kornspeicher: 1, jagdhuette: 2, feld: 2, viehhof: 2, kupfermine: 2, schmelzofen: 2, zinnwaescherin: 1, handelsplatz: 1, schmuckmacherin: 1 },
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
    for (const id of Object.keys(tech.cost || {}))
      if (id !== 'wissen') {
        const stages = ['kupfer', 'frueh', 'spaet'];   // ab der Kupferzeit fasst der Dorfplatz mehr
        const room = CONFIG.baseStorage + CONFIG.stageStorage[tech.stage || 'alt'] + (stages.includes(tech.stage) ? CONFIG.dorfplatz.storage : 0);
        tech.cost[id] = Math.min(room, Math.round(tech.cost[id] * t.researchGoods / 5) * 5);
      }
  }
})(CONFIG.tempo);

const NEXT_EPOCH = { name: 'Eisenzeit', icon: '🔩', text: 'Eisenerz, Schmiede und befestigte Siedlungen.' };   // der nächste Bauabschnitt: nur Vorschau im Forschungsfenster

// Weiterentwicklungen wirken wie ihre Vorstufe bei Wetter, Jahreszeit, Katastrophen und Forschungs-Boni
(function inheritEffects() {
  const of = { gemuesegarten: 'sammlerin', fischerhuette: 'fischerplatz', holzfaeller: 'holzsammler', steinbruch: 'steinsammler',
    lehmgrube: 'tongrube', felsritzer: 'hoehlenmaler', kupferschmied: 'steinschlaeger', jagdhuette: 'mammutjaegerlager', feld: 'acker', viehhof: 'ziegengehege',
    weberin: 'fellmacherin', bronzeschmied: 'steinschlaeger', toepferwerkstatt: 'toepferei', baumgaertnerin: 'pflanzerin', sternkundiger: 'hoehlenmaler' };
  const copy = map => { if (map) for (const [to, from] of Object.entries(of)) if (map[from] !== undefined && map[to] === undefined) map[to] = map[from]; };
  for (const w of Object.values(WEATHERS)) copy(w.effect.buildings);
  for (const d of Object.values(DISASTERS)) copy(d.buildings);
  copy(SEASON_FACTORS);
  for (const t of Object.values(TECHS)) copy(t.effect && t.effect.bonus);
  for (const [to, from] of Object.entries(of)) if (OUTDOOR_WORK.includes(from)) OUTDOOR_WORK.push(to);
  OUTDOOR_WORK.push('kupfermine', 'zinnwaescherin');
})();

// Kategorien der Bauleiste (je Kategorie die Linien aus BUILDINGS)
const BAR_CATEGORIES = [
  { id: 'wohnen',    name: 'Wohnen',    icon: '🏠', lines: ['wohnen', 'wasserwohnen'] },
  { id: 'nahrung',   name: 'Nahrung',   icon: '🍖', lines: ['sammeln', 'jagen', 'fischen', 'feld', 'tiere'] },
  { id: 'rohstoffe', name: 'Rohstoffe', icon: '🪵', lines: ['holz', 'pflanzen', 'stein', 'ton', 'erz', 'kohle', 'zinn'] },
  { id: 'handwerk',  name: 'Handwerk',  icon: '🔨', lines: ['schmelzen', 'bronze', 'kleidung', 'werkzeug', 'toepfern', 'schmuck', 'lager', 'handel'] },
  { id: 'leben',     name: 'Feuer & Glaube', icon: '🔥', lines: ['wunder', 'wunder_bronze', 'waerme', 'glaube', 'wissen', 'wahrzeichen'] },
  { id: 'wege',      name: 'Wege',      icon: '🛤️', lines: ['weg', 'bruecke'] },
];

// Aufträge. Sichtbar sind höchstens 3 – zuerst die, die man gerade erfüllen kann (activeQuests).
// IDs nie ändern: Sie stehen in Spielständen. Die Reihenfolge darf sich ändern.
const QUESTS = [
  // Altsteinzeit
  { id: 'q_sammlerin2', text: 'Baue 2 Sammlerinnen',     goal: { build: 'sammlerin', count: 2 }, reward: { holz: 20 } },
  { id: 'q_pop10',      text: 'Erreiche 10 Einwohner',   goal: { population: 10 }, reward: { nahrung: 30 } },
  { id: 'q_forschung1', text: 'Schließe eine Forschung ab', goal: { techs: 1 }, reward: { wissen: 10 } },
  { id: 'q_holz100',    text: 'Habe 100 Holz im Lager',  goal: { resource: 'holz', count: 100 }, reward: { stein: 30 } },
  { id: 'q_jaeger',     text: 'Baue ein Jägerlager',     goal: { build: 'jaegerlager', count: 1 }, reward: { nahrung: 40 } },
  { id: 'q_holzsammler2', text: 'Baue 2 Holzsammler',    goal: { build: 'holzsammler', count: 2 }, reward: { stein: 15 } },
  { id: 'q_steinsammler2', text: 'Baue 2 Steinsammler',  goal: { build: 'steinsammler', count: 2 }, reward: { holz: 15 } },
  { id: 'q_wege30',     text: 'Lege 30 Felder Trampelpfad', goal: { build: 'pfad', count: 30 }, reward: { holz: 30 } },
  { id: 'q_pop15',      text: 'Erreiche 15 Einwohner',   goal: { population: 15 }, reward: { wissen: 20 } },
  { id: 'q_feuer2',     text: 'Baue 2 Feuerplätze',      goal: { build: 'feuerplatz', count: 2 }, reward: { nahrung: 30 } },
  { id: 'q_maler2',     text: 'Baue 2 Höhlenmaler',      goal: { build: 'hoehlenmaler', count: 2 }, reward: { wissen: 10 } },
  { id: 'q_wunsch1',    text: 'Erfülle einen Wunsch des Stammes', goal: { wishes: 1 }, reward: { wissen: 10 } },
  { id: 'q_pflanzerin', text: 'Baue eine Pflanzerin',    goal: { build: 'pflanzerin', count: 1 }, reward: { holz: 25 } },
  { id: 'q_land1',      text: 'Kaufe ein neues Landstück', goal: { plots: 1 }, reward: { stein: 40 } },
  { id: 'q_jaeger2',    text: 'Baue 2 Jägerlager',       goal: { build: 'jaegerlager', count: 2 }, reward: { nahrung: 40, felle: 5 } },
  { id: 'q_pop20',      text: 'Erreiche 20 Einwohner',   goal: { population: 20 }, reward: { holz: 40 } },
  { id: 'q_wohnen8',    text: 'Habe 8 Wohnungen',        goal: { line: 'wohnen', type: 'wohnhoehle', count: 8 }, reward: { stein: 40 } },
  { id: 'q_maler3',     text: 'Baue 3 Höhlenmaler',      goal: { build: 'hoehlenmaler', count: 3 }, reward: { wissen: 15 } },
  { id: 'q_feuer3',     text: 'Baue 3 Feuerplätze',      goal: { build: 'feuerplatz', count: 3 }, reward: { nahrung: 40 } },
  { id: 'q_zelte3',     text: 'Baue 3 Fellzelte',        goal: { build: 'fellzelt', count: 3 }, reward: { holz: 40, felle: 4 } },
  { id: 'q_pop25',      text: 'Erreiche 25 Einwohner',   goal: { population: 25 }, reward: { felle: 5, wissen: 10 } },
  { id: 'q_wunsch3',    text: 'Erfülle 3 Wünsche des Stammes', goal: { wishes: 3 }, reward: { wissen: 20 } },
  { id: 'q_jagd1',      text: 'Schicke die Jäger auf Mammutjagd', goal: { hunts: 1 }, requires: 'mammutjagd', reward: { holz: 40, stein: 30 } },
  { id: 'q_mittel',     text: 'Erreiche die Mittelsteinzeit', goal: { tech: 'mittelsteinzeit' }, reward: { holz: 60, stein: 60 } },
  // Mittelsteinzeit
  { id: 'q_pop30',      text: 'Erreiche 30 Einwohner',   goal: { population: 30 }, reward: { werkzeug: 10 } },
  { id: 'q_land3',      text: 'Kaufe 3 neue Landstücke', goal: { plots: 3 }, reward: { holz: 60 } },
  { id: 'q_jaeger4',    text: 'Baue 4 Jägerlager',       goal: { line: 'jagen', type: 'jaegerlager', count: 4 }, reward: { nahrung: 60, felle: 10 } },
  { id: 'q_fischer',    text: 'Baue einen Fischerplatz', goal: { build: 'fischerplatz', count: 1 }, reward: { nahrung: 60 } },
  { id: 'q_klingen2',   text: 'Baue 2 Steinschläger',    goal: { build: 'steinschlaeger', count: 2 }, reward: { stein: 50 } },
  { id: 'q_fellmacher2', text: 'Baue 2 Fellmacherinnen', goal: { build: 'fellmacherin', count: 2 }, reward: { felle: 15 } },
  { id: 'q_ahnen',      text: 'Baue einen Ahnenplatz',   goal: { build: 'ahnenplatz', count: 1 }, reward: { wissen: 30 } },
  { id: 'q_kleidung20', text: 'Habe 20 Kleidung im Lager', goal: { resource: 'kleidung', count: 20 }, reward: { wissen: 30 } },
  { id: 'q_wunsch6',    text: 'Erfülle 6 Wünsche des Stammes', goal: { wishes: 6 }, reward: { wissen: 30 } },
  { id: 'q_jung',       text: 'Erreiche die Jungsteinzeit', goal: { tech: 'jungsteinzeit' }, reward: { holz: 100, stein: 80 } },
  // Jungsteinzeit
  { id: 'q_acker2',     text: 'Baue 2 Äcker',            goal: { build: 'acker', count: 2 }, reward: { werkzeug: 10 } },
  { id: 'q_pop60',      text: 'Erreiche 60 Einwohner',   goal: { population: 60 }, reward: { toepferwaren: 10 } },
  { id: 'q_ziegen',     text: 'Baue ein Ziegengehege',   goal: { build: 'ziegengehege', count: 1 }, reward: { felle: 15 } },
  { id: 'q_langhaus3',  text: 'Baue 3 Langhäuser',       goal: { build: 'langhaus', count: 3 }, reward: { holz: 80 } },
  { id: 'q_pop80',      text: 'Erreiche 80 Einwohner',   goal: { population: 80 }, reward: { holz: 80, stein: 60 } },
  { id: 'q_vorrat',     text: 'Baue einen Vorratsspeicher', goal: { build: 'vorratsspeicher', count: 1 }, reward: { nahrung: 100 } },
  { id: 'q_kleidung40', text: 'Habe 40 Kleidung im Lager', goal: { resource: 'kleidung', count: 40 }, reward: { felle: 20 } },
  { id: 'q_pop100',     text: 'Erreiche 100 Einwohner',  goal: { population: 100 }, reward: { werkzeug: 20 } },
  { id: 'q_toepfer30',  text: 'Habe 30 Töpferwaren im Lager', goal: { resource: 'toepferwaren', count: 30 }, reward: { wissen: 40 } },
  { id: 'q_wunsch12',   text: 'Erfülle 12 Wünsche des Stammes', goal: { wishes: 12 }, reward: { wissen: 40 } },
  { id: 'q_steinkreis', text: 'Baue einen Steinkreis',   goal: { build: 'steinkreis', count: 1 }, reward: { holz: 100, nahrung: 100 } },
  { id: 'q_pop120',     text: 'Erreiche 120 Einwohner – bereit für den Aufbruch', goal: { population: 120 }, reward: { holz: 150, nahrung: 150 } },
  // Kupferzeit
  { id: 'q_b_aufbruch', text: 'Brich in die Bronzezeit auf', goal: { tech: 'aufbruch_bronzezeit' }, reward: { holz: 100, stein: 100 } },
  { id: 'q_b_mine',     text: 'Baue eine Kupfermine',    goal: { build: 'kupfermine', count: 1 }, reward: { holz: 60, stein: 40 } },
  { id: 'q_b_kupfer20', text: 'Habe 20 Kupfer im Lager', goal: { resource: 'kupfer', count: 20 }, reward: { wissen: 40 } },
  { id: 'q_b_garten3',  text: 'Baue 3 Gemüsegärten',     goal: { build: 'gemuesegarten', count: 3 }, reward: { nahrung: 80 } },
  { id: 'q_b_pop140',   text: 'Erreiche 140 Einwohner',  goal: { population: 140 }, reward: { holzkohle: 20 } },
  { id: 'q_b_frueh',    text: 'Erreiche die Frühe Bronzezeit', goal: { tech: 'fruehe_bronzezeit' }, reward: { holz: 100, kupfer: 20 } },
  // Frühe Bronzezeit
  { id: 'q_b_handel',   text: 'Baue einen Handelsplatz', goal: { build: 'handelsplatz', count: 1 }, reward: { toepferwaren: 15 } },
  { id: 'q_b_tausch3',  text: 'Tausche 3-mal mit dem Händler', goal: { trades: 3 }, requires: 'tauschhandel', reward: { zinn: 10 } },
  { id: 'q_b_bronze20', text: 'Habe 20 Bronze im Lager', goal: { resource: 'bronze', count: 20 }, reward: { wissen: 60 } },
  { id: 'q_b_viehhof2', text: 'Baue 2 Viehhöfe',         goal: { build: 'viehhof', count: 2 }, reward: { nahrung: 100 } },
  { id: 'q_b_pop180',   text: 'Erreiche 180 Einwohner',  goal: { population: 180 }, reward: { werkzeug: 20 } },
  { id: 'q_b_spaet',    text: 'Erreiche die Späte Bronzezeit', goal: { tech: 'spaete_bronzezeit' }, reward: { bronze: 20 } },
  // Späte Bronzezeit
  { id: 'q_b_schmuck20', text: 'Habe 20 Schmuck im Lager', goal: { resource: 'schmuck', count: 20 }, reward: { wissen: 80 } },
  { id: 'q_b_pop230',   text: 'Erreiche 230 Einwohner',  goal: { population: 230 }, reward: { holz: 150, stein: 100 } },
  { id: 'q_b_fuerstenhuegel', text: 'Baue den Fürstenhügel', goal: { build: 'fuerstenhuegel', count: 1 }, reward: { bronze: 30, nahrung: 150 } },
  { id: 'q_b_pop280',   text: 'Erreiche 280 Einwohner – bereit für den Aufbruch', goal: { population: 280 }, reward: { holz: 200, nahrung: 200 } },
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
// Die Belohnung wächst mit dem Zeitalter (Emin, 03.11.): Grundmenge × Faktor, an Tag 3, 5 und 7 dazu Waren der Zeit (Tag 7 doppelt)
const DAILY_GROWTH = {
  factor: { alt: 1, mittel: 1.5, jung: 2, kupfer: 3, frueh: 4, spaet: 5 },
  extra: { kupfer: { kupfer: 10 }, frueh: { kupfer: 10, bronze: 5 }, spaet: { bronze: 10, schmuck: 3 } },
};

// Wunderwerke: jeder Abschnitt ist ein Kapitel (Zahlen und Texte aus docs/konzept-wunderwerke.md).
// images: Bild je erreichtem Abschnitt. goal = Ziel des Kapitels, stage = geht erst ab diesem Zeitalter.
const WONDERS = {
  hoehle: {
    name: 'Höhle der Geschichten', icon: '🎨', building: 'geschichtenhoehle', tech: 'hoehlenmalerei', page: 'steinzeit',
    hint: 'Beginnt mit der Forschung Höhlenmalerei', where: 'Wähle den Platz selbst: unten in der Bauleiste unter „Feuer & Glaube“. Die Höhle muss an Felsen stehen.', whereShort: 'Wähle einen Platz an Felsen',
    images: ['1-hoehle-bau', '1-hoehle-bau', '1-hoehle-halb', '1-hoehle-halb', '1-hoehle'],
    call: 'Meine Großmutter erzählte von einer großen Höhle hinter den Felsen. Dort malten unsere Ahnen ihre Geschichten. Wählen wir einen Platz: unten unter Feuer & Glaube!',
    intro: 'Hier malten unsere Ahnen ihre Geschichten an die Wand. Bauen wir die Höhle Stück für Stück wieder auf.',
    doneText: 'Die Höhle ist fertig! Abends sitzen die Kinder am Feuer und hören die alten Geschichten.',
    bonus: ['📜 +3 Wissen je Minute von selbst', '🎨 Alle Wissens-Gebäude arbeiten 20 % besser', '🔥 Wärme und Gemeinschaft im Umkreis 8', '🎉 Einmal im Jahr: Fest der Geschichten, bessere Laune', '🌙 Abends ein Geschichtenabend'],
    boost: { line: 'wissen', share: 0.2 },
    fest: { name: 'Fest der Geschichten', year: 5 / 8 },
    facts: [
      'Wusstest du? Die ältesten Höhlenbilder sind über 30.000 Jahre alt.',
      'Wusstest du? Rot malten die Menschen mit Rötel, Schwarz mit Holzkohle.',
      'Wusstest du? Handabdrücke entstanden, indem man Farbe über die Hand pustete.',
      'Wusstest du? Die Maler arbeiteten tief in der Höhle beim Licht von Fackeln und Fettlampen.',
      'Wusstest du? Auf den Bildern sind vor allem Tiere zu sehen: Mammuts, Pferde, Hirsche.',
      'Wusstest du? Aus Mammut-Stoßzähnen schnitzten Menschen Figuren, und aus Knochen Flöten.',
    ],
    steps: [
      { title: 'Der Eingang ist verschüttet', story: 'Geröll versperrt den Weg. Wir brauchen Leute, die Steine tragen können.', goal: { line: 'stein', count: 2, text: 'Baue 2 Steinsammler' },
        goods: { stein: 60, holz: 40 }, seconds: 300, done: 'Der Eingang ist frei!' },
      { title: 'Wir brauchen Licht und Farbe', story: 'Drinnen ist es dunkel. Sucht roten Rötel und Holzkohle, dazu Felle für die Fackeln.',
        finds: { roetel: 3, holzkohle: 2 }, goods: { felle: 20, holz: 40 }, seconds: 480, done: 'Fackeln brennen, das Gerüst steht!' },
      { title: 'Die große Jagd an der Wand', story: 'Jetzt malen wir die große Jagd. Ein Stoßzahn und eine Feder dienen als Werkzeug, die Maler brauchen ein Festessen.',
        finds: { stosszahn: 1, feder: 1, roetel: 2 }, goods: { nahrung: 60 }, seconds: 600, done: 'Die ersten Bilder schimmern an der Wand!' },
      { title: 'Die Geschichte ist vollständig', story: 'Die Erzähler tragen Muschelketten und festliche Kleider, wenn sie vom Stamm berichten.', stage: 'mittel',
        finds: { muschel: 2 }, goods: { kleidung: 20, wissen: 40 }, seconds: 720, done: 'Die Geschichte ist vollständig!' },
    ],
  },
  steinkreis: {
    name: 'Steinkreis', icon: '🪨', building: 'steinkreis', tech: 'sternenkunde', page: 'steinzeit', legacy: true,
    hint: 'Beginnt mit der Forschung Sternenkunde', where: 'Wähle den Platz selbst: unten in der Bauleiste unter „Feuer & Glaube“.', whereShort: 'Wähle einen Platz',
    images: ['1-steinkreis-bau', '1-steinkreis-bau', '1-steinkreis-halb', '1-steinkreis-halb', '1-steinkreis'],
    call: 'Die Sterne wandern jede Nacht. Wenn wir verstehen, wohin, wissen wir, wann der Sommer kommt. Bauen wir einen Kreis aus Stein: unten unter Feuer & Glaube!',
    intro: 'Ein Kalender aus Stein: Am längsten Tag scheint die Sonne genau durch das Steintor. Ohne ihn gibt es keinen Aufbruch in die Bronzezeit.',
    doneText: 'Der Kreis steht! Die Sonne scheint durch das Tor, und der ganze Stamm feiert das erste Sonnwendfest.',
    bonus: ['🗿 Glaube und Wärme im großen Umkreis', '➡️ Nötig für den Aufbruch in die Bronzezeit', '☀️ Sonnenkalender: zeigt die nächste Jahreszeit und warnt vor Naturkatastrophen', '🌾 Äcker arbeiten 10 % besser', '🎉 Jeden Sommer das Sonnwendfest mit Geschenk'],
    boost: { line: 'feld', share: 0.1 },
    fest: { name: 'Sonnwendfest', year: 3 / 8, gift: { nahrung: 100, holz: 50 } },
    firstFest: true,
    facts: [
      'Wusstest du? In Stonehenge steht die Sonne am längsten Tag genau über dem Fersenstein.',
      'Wusstest du? Manche Steine von Stonehenge wurden über 200 Kilometer weit herangeschafft.',
    ],
    steps: [
      { title: 'Den Kreis abstecken', story: 'Lies den Himmel! In klaren Nächten fällt eine Sternschnuppe. Tippe sie an, sie zeigt uns den Kreis. Dazu brauchen wir Holz für die Pfähle.',
        finds: { sternkarte: 3 }, goods: { holz: 100 }, seconds: 300, done: 'Pfähle und Seile zeigen den Kreis!' },
      { title: 'Die großen Steine', story: 'Am Gebirge liegen riesige Findlinge. Tippe einen an, dann rollen ihn acht Leute auf Stämmen heran. Die Helfer haben Hunger.',
        finds: { findling: 5 }, goods: { werkzeug: 20, nahrung: 100 }, seconds: 600, done: 'Fünf große Steine stehen aufrecht!' },
      { title: 'Das Sonnentor', story: 'Für den Deckstein brauchen wir den Sonnenstein. Steinsammler finden ihn irgendwann.',
        finds: { sonnenstein: 1 }, goods: { stein: 100 }, seconds: 600, done: 'Das Steintor ist fertig!' },
      { title: 'Das erste Sonnwendfest', story: 'Schmücken wir den Kreis! Sammlerinnen bringen im Frühling und Sommer Blumenkränze, doppelte Stücke tauscht der Älteste.',
        finds: { blumenkranz: 3 }, goods: { kleidung: 20, toepferwaren: 20 }, seconds: 300, done: 'Das Fest beginnt!' },
    ],
  },
  himmelshalle: {
    name: 'Halle der Himmelsscheibe', icon: '🌞', building: 'himmelshalle', tech: 'himmelsscheibe', page: 'bronze',
    hint: 'Beginnt mit der Forschung Himmelsscheibe', where: 'Wähle den Platz selbst: unten in der Bauleiste unter „Feuer & Glaube“.', whereShort: 'Wähle einen Platz',
    images: ['2-halle-bau', '2-halle-bau', '2-halle-halb', '2-halle-halb', '2-halle'],
    call: 'Die Sternkundigen wollen den Himmel festhalten: Sonne, Mond und Sterne auf einer Scheibe aus Bronze. Dafür bauen wir eine Halle: unten unter Feuer & Glaube!',
    intro: 'Eine Scheibe aus Bronze und Gold zeigt den Himmel. Mit jedem Abschnitt setzen wir ein Stück mehr zusammen.',
    doneText: 'Die Himmelsscheibe ist vollständig! Aus allen Dörfern kommen Menschen und bestaunen Sonne, Mond und Sterne.',
    bonus: ['🗿 Glaube im großen Umkreis', '🔥 Bronzegießer arbeiten 20 % besser', '🤝 Der Händler kommt 5 Minuten früher', '🎉 Großes Sonnwendfest jeden Sommer, mit reicherem Geschenk', '➡️ Nötig für den Aufbruch in die Eisenzeit'],
    boost: { line: 'bronze', share: 0.2 },
    traderFaster: 300,
    fest: { name: 'Großes Sonnwendfest', year: 3 / 8, gift: { nahrung: 300, bronze: 10 } },
    firstFest: true,
    facts: [
      'Wusstest du? Die Himmelsscheibe von Nebra ist rund 3.600 Jahre alt und zeigt den Himmel so genau wie nichts aus ihrer Zeit.',
      'Wusstest du? Das Gold der Himmelsscheibe von Nebra kam wohl aus Cornwall in England, weit weg vom Fundort.',
    ],
    steps: [
      { title: 'Der Bauplatz', story: 'Eine Halle braucht starke Balken und Mauern. Der Bronzegießer gießt schon die runde Scheibe, darauf kommt die Sonne.',
        goods: { holz: 200, stein: 150, bronze: 20 }, seconds: 360, gives: { scheibe: 1 }, done: 'Das Dach steht, die Sonne glänzt auf der Scheibe!' },
      { title: 'Gold für Mond und Sterne', story: 'Goldblättchen stecken manchmal in einer Erzader. Daraus schneiden wir den Mond und die Sterne.',
        finds: { goldblatt: 3 }, goods: { bronze: 30 }, seconds: 600, gives: { scheibe: 2 }, done: 'Mond und Sterne leuchten auf der Scheibe!' },
      { title: 'Der Rand des Himmels', story: 'Für die Bögen am Rand brauchen wir Perlen vom Ufer und einen großen Bernstein vom Händler.',
        finds: { zinnperle: 2, bernsteinstueck: 1 }, goods: { schmuck: 10, kleidung: 30 }, seconds: 600, gives: { scheibe: 1 }, done: 'Die Horizontbögen rahmen den Himmel!' },
      { title: 'Das Sonnenschiff', story: 'Das letzte Stück: das Schiff, das die Sonne über den Himmel trägt.',
        goods: { bronze: 40, schmuck: 10, wissen: 100 }, seconds: 600, gives: { scheibe: 1 }, done: 'Das Sonnenschiff ist da!' },
    ],
  },
};

// Fundstücke und Schatzkiste. need = so viele braucht das Wunderwerk (alles darüber zählt als doppelt),
// spot = Gelände der Fundstelle, soon = kommt erst mit einem späteren Bauabschnitt, bild = später aus Canva.
const FIND_PAGES = [
  { id: 'steinzeit', name: 'Steinzeit' }, { id: 'bronze', name: 'Bronzezeit' }, { id: 'eisen', name: 'Eisenzeit' }, { id: 'antike', name: 'Antike' },
  { id: 'mittelalter', name: 'Mittelalter' }, { id: 'neuzeit', name: 'Frühe Neuzeit' }, { id: 'juenger', name: 'Jüngere Neuzeit' }, { id: 'heute', name: 'Zeitgeschichte' },
];
const FIND_LATER = 'Kommt in einem späteren Zeitalter';
const FINDS = {
  roetel:      { name: 'Rötel', icon: '🔴', bild: 'fund-roetel', page: 'steinzeit', need: 5, spot: 'fels', hint: 'Glitzert an Felsen' },
  holzkohle:   { name: 'Holzkohle-Stift', icon: '⚫', bild: 'fund-holzkohle', page: 'steinzeit', need: 2, hint: 'Glimmt nachts am Lagerfeuer' },
  stosszahn:   { name: 'Mammut-Stoßzahn', icon: '🦣', bild: 'fund-stosszahn', page: 'steinzeit', spot: 'fels', spotExtinct: true, hint: 'Von der Mammutjagd, später alt im Fels' },
  feder:       { name: 'Adlerfeder', icon: '🪶', bild: 'fund-feder', page: 'steinzeit', spot: 'wald', hint: 'Glitzert im Wald, Jäger finden manchmal eine' },
  muschel:     { name: 'Flussmuschel', icon: '🐚', bild: 'fund-muschel', page: 'steinzeit', need: 2, spot: 'ufer', hint: 'Glitzert am Ufer, nach Hochwasser mehr' },
  sternkarte:  { name: 'Sternkarte', icon: '🗺️', page: 'steinzeit', need: 3, tech: 'sternenkunde', hint: 'Sternschnuppe in der Nacht (Sternenkunde)' },
  findling:    { name: 'Riesenfindling', icon: '🪨', page: 'steinzeit', need: 5, tech: 'sternenkunde', hint: 'Liegt am Gebirge, wenn der Steinkreis gebaut wird' },
  sonnenstein: { name: 'Sonnenstein', icon: '☀️', page: 'steinzeit', stage: 'jung', hint: 'Steinsammler finden ihn in der Jungsteinzeit' },
  blumenkranz: { name: 'Blumenkranz', icon: '🌼', page: 'steinzeit', need: 3, stage: 'jung', hint: 'Sammlerinnen, nur Frühling und Sommer' },
  goldblatt:   { name: 'Goldblättchen', icon: '🟡', page: 'bronze', need: 3, stage: 'kupfer', hint: 'Steckt manchmal in einer Erzader' },
  zinnperle:   { name: 'Zinn-Perle', icon: '⚪', page: 'bronze', need: 2, stage: 'frueh', spot: 'ufer', hint: 'Glitzert ab der Frühen Bronzezeit am Ufer' },
  bernsteinstueck: { name: 'Großer Bernstein', icon: '🟠', page: 'bronze', stage: 'spaet', hint: 'Gegen Bronze beim Händler, wenn die Himmelsscheibe erforscht ist' },
  scheibe:     { name: 'Teil der Himmelsscheibe', icon: '🌞', page: 'bronze', need: 5, soon: true, hint: 'Entsteht beim Bau der Halle der Himmelsscheibe' },
  salzkristall:{ name: 'Salzkristall', icon: '💎', page: 'eisen', soon: true, hint: FIND_LATER },
  rucksack:    { name: 'Alter Lederrucksack', icon: '🎒', page: 'eisen', soon: true, hint: FIND_LATER },
  bronzepickel:{ name: 'Bronzepickel', icon: '⛏️', page: 'eisen', soon: true, hint: FIND_LATER },
  wollstoff:   { name: 'Karierter Wollstoff', icon: '🧵', page: 'eisen', soon: true, hint: FIND_LATER },
  schriftrolle:{ name: 'Schriftrolle', icon: '📜', page: 'antike', soon: true, hint: FIND_LATER },
  spiegel:     { name: 'Bronzespiegel', icon: '🪞', page: 'antike', soon: true, hint: FIND_LATER },
  marmor:      { name: 'Marmorblock', icon: '⬜', page: 'antike', soon: true, hint: FIND_LATER },
  olivenkranz: { name: 'Olivenkranz', icon: '🌿', page: 'antike', soon: true, hint: FIND_LATER },
  buntglas:    { name: 'Buntglas', icon: '🌈', page: 'mittelalter', soon: true, hint: FIND_LATER },
  glocke:      { name: 'Glocke', icon: '🔔', page: 'mittelalter', soon: true, hint: FIND_LATER },
  bauplan:     { name: 'Bauplan des Meisters', icon: '📐', page: 'mittelalter', soon: true, hint: FIND_LATER },
  kerze:       { name: 'Bienenwachskerze', icon: '🕯️', page: 'mittelalter', soon: true, hint: FIND_LATER },
  kartenstueck:{ name: 'Kartenstück', icon: '🧭', page: 'neuzeit', soon: true, hint: FIND_LATER },
  linse:       { name: 'Geschliffene Linse', icon: '🔍', page: 'neuzeit', soon: true, hint: FIND_LATER },
  pflanze:     { name: 'Seltene Pflanze', icon: '🌱', page: 'neuzeit', soon: true, hint: FIND_LATER },
  buch:        { name: 'Gedrucktes Buch', icon: '📖', page: 'neuzeit', soon: true, hint: FIND_LATER },
  gluehbirne:  { name: 'Glühbirne', icon: '💡', page: 'juenger', soon: true, hint: FIND_LATER },
  telefon:     { name: 'Telefon', icon: '☎️', page: 'juenger', soon: true, hint: FIND_LATER },
  fahrrad:     { name: 'Fahrrad', icon: '🚲', page: 'juenger', soon: true, hint: FIND_LATER },
  fotoapparat: { name: 'Fotoapparat', icon: '📷', page: 'juenger', soon: true, hint: FIND_LATER },
  bauteil:     { name: 'Raketenteil', icon: '🛰️', page: 'heute', soon: true, hint: FIND_LATER },
  raumanzug:   { name: 'Raumanzug', icon: '🧑‍🚀', page: 'heute', soon: true, hint: FIND_LATER },
  antenne:     { name: 'Funkantenne', icon: '📡', page: 'heute', soon: true, hint: FIND_LATER },
  mondgestein: { name: 'Mondgestein', icon: '🌙', page: 'heute', soon: true, hint: FIND_LATER },
};
// Wie eine Fundstelle aussieht. instant = sofort eingesammelt, special = zählt nicht gegen die Höchstzahl.
const SPOT_STYLE = {
  fels:  { name: 'Etwas glitzert an einem Felsen', icon: '🪨', color: '#ff5a3c', glow: 'rgba(255,90,50,0.8)' },
  wald:  { name: 'Etwas glitzert im Wald', icon: '🌲', color: '#ffc400', glow: 'rgba(255,190,0,0.8)' },
  ufer:  { name: 'Etwas glitzert am Ufer', icon: '🌊', color: '#22d3ff', glow: 'rgba(30,200,255,0.8)' },
  erz:   { name: 'Eine Erzader glitzert', icon: '⛏️', color: '#ffb300', glow: 'rgba(255,170,0,0.9)', special: true },
  glut:  { name: 'Glut am Lagerfeuer', icon: '⚫', color: '#ff6a00', glow: 'rgba(255,100,0,0.9)', special: true, instant: true },
  findling: { name: 'Ein Riesenfindling liegt bereit', icon: '🪨', color: '#d9e2ff', glow: 'rgba(190,205,255,0.85)', special: true },
  stern: { name: 'Eine Sternschnuppe ist gefallen', icon: '🌠', color: '#9db8ff', glow: 'rgba(130,160,255,0.9)', special: true, instant: true },
};

// Einstieg: Der Stammesälteste läuft auf der Karte mit (siehe einstieg.js). Die Reihenfolge und die IDs nie ändern:
// state.tutorial ist der Index in dieser Liste, alte Spielstände stehen mitten darin.
// ruf = sein Spruch, text = die Anweisung (*…* wird fett), ok = Rückmeldung bei Erfolg, hilfe = nach 20 Sekunden ohne Erfolg,
// belohnung = wird je Spielstand nur einmal gutgeschrieben. Hier lassen sich die Mengen ändern.
const TUTORIAL = [
  { id: 'willkommen', ruf: 'Endlich! Hier bleiben wir.', auto: true },
  { id: 'sammlerin', ruf: 'Hier wächst viel!', text: 'Zieh die *Sammlerin* her.', ok: 'Gut!', belohnung: { nahrung: 5 },
    hilfe: 'Finger auf die *Sammlerin*, ziehen, dann ✔ tippen.', target: 'bar:sammlerin' },
  { id: 'pfad', ruf: 'Oje, kein Weg!', text: 'Wähl unten den *Trampelpfad*.', ok: 'Der Weg steht!',
    hilfe: 'Oder tipp die Baustelle an, dann „Mehr“ und „Weg bauen“.', target: 'bar:pfad' },
  { id: 'antippen', ruf: 'Sie ist fertig.', text: 'Tipp sie an!', ok: 'So siehst du alles über sie.',
    hilfe: 'Bis zu 2 Baustellen gehen gleichzeitig.' },
  { id: 'holzsammler', ruf: 'Mir wird kalt. Wir brauchen Holz!', text: 'Bau den *Holzsammler* am Wald.', ok: 'Am Wald sammelt er mehr.', belohnung: { holz: 5 },
    target: 'bar:holzsammler' },
  { id: 'hochheben', ruf: 'Falsch gestellt? Kein Problem.', text: 'Halte ein Gebäude gedrückt: Es hebt sich.', ok: 'Verschieben und drehen geht jetzt.' },
  { id: 'wohnhoehle', ruf: 'Es kommen Leute! Wo schlafen sie?', text: 'Bau eine *Wohnhöhle* mit Weg zum Feuer.', ok: 'Bald ziehen Leute ein!',
    hilfe: 'Nah am Feuer ist es warm.', target: 'bar:wohnhoehle' },
  { id: 'forschung', ruf: 'Wer malt unser Wissen auf?', text: 'Bau den *Höhlenmaler* mit Weg.', target: 'bar:hoehlenmaler',
    bauOk: 'Er malt bald!', bauBelohnung: { wissen: 10 },
    ruf2: 'Jetzt lernen wir was!', text2: 'Öffne die *Forschung*, starte „Feuer hüten“.', target2: 'btn-research', ok: 'Das Feuer wärmt bald weiter.',
    hilfe: 'Noch zu wenig Wissen? Der Höhlenmaler braucht etwas Zeit.' },
  { id: 'auftraege', ruf: 'Noch was: Hier gibt’s Geschenke.', text: 'Schau in die *Aufträge*.', ok: 'Dort warten Belohnungen.', target: 'btn-quests' },
  { id: 'fertig', ruf: 'Das Lager gehört dir.', text: 'Ich bin in der Nähe!', auto: true, belohnung: { wissen: 20 } },
];

const LOADING_SAYINGS = [
  'Die ersten Menschen entfachen ein Feuer …',
  'Die Sammlerinnen füllen ihre Körbe …',
  'Am Fluss ziehen Mammuts vorbei …',
  'Der Stammesälteste erzählt von früher …',
];
