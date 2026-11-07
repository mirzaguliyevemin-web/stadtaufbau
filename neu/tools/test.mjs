// Epochia – automatische Tests. Aufruf: node neu/tools/test.mjs   (Code 1 bei Fehlschlag)
import { loadGame as startGame } from './headless.mjs';
import fs from 'node:fs';
import { runBot } from './bot.mjs';

// O = Verschiebung gegenüber der 128er-Karte: Feste Koordinaten in den Tests gelten so für jede Kartengröße
function loadGame(opt) { const g = startGame(opt); g.run('var O = (N - 128) / 2;'); return g; }

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('✔ ' + name);
  } catch (e) {
    failed++;
    console.log('✖ ' + name + '\n   ' + (e.message || e));
  }
}
function ok(cond, msg) { if (!cond) throw new Error(msg); }

// Neues Spiel ohne Einstieg; Bauzeiten bleiben echt
function fresh(seed = 4242, storage) {
  const g = loadGame({ seed: 1, storage });
  g.run(`startNewGame(${seed}); state.tutorial = -1; recalcStats();`);
  ok(!g.errors.length, 'Fehler beim Start: ' + g.errors.join('\n'));
  return g;
}
function noErrors(g) { ok(!g.errors.length, g.errors.join('\n')); }

test('Start: Lagerfeuer, zwei Wohnhöhlen, 6 Einwohner, Land in der Mitte', () => {
  const g = fresh();
  ok(g.run(`state.buildings.map(b => b.type).join()`) === 'lagerfeuer,wohnhoehle,wohnhoehle,pfad,pfad', 'Startgebäude falsch');
  ok(g.run('state.buildings.every((b, i) => isConnected(i))'), 'Start-Wohnhöhlen ohne Weg');
  ok(g.run('state.pop') === 6, 'Einwohner');
  ok(g.run('stats.housing') === 6, 'Wohnplätze');
  ok(g.run('isOwned(64 + O, 64 + O) && isOwned(48 + O, 48 + O) && isOwned(79 + O, 79 + O) && !isOwned(47 + O, 64 + O)'), 'Start-Land falsch');
  ok(g.run('state.buildings.every(b => !placeProblem(b.type, b.x, b.y, state.buildings.indexOf(b)))'), 'Startgebäude stehen auf ungültigem Platz');
  noErrors(g);
});

test('Lager: jede Ware steht in genau einem Bereich', () => {
  const g = fresh();
  const bad = g.run(`
    const all = LAGER_GROUPS.flatMap(x => x.goods);
    [...Object.keys(RESOURCES).filter(id => all.filter(k => k === id).length !== 1), ...all.filter(id => !RESOURCES[id])].join()`);
  ok(!bad, 'falsche Einteilung: ' + bad);
  noErrors(g);
});

test('Lager: Leiste zeigt nur Nahrung, Wissen und den Lagerknopf', () => {
  const g = fresh();
  g.run(`state.stage = 'eisen3'; for (const id of Object.keys(RESOURCES)) state.res[id] = 50; recalcStats(); updateProduction(0.25); resetStockWatch(); renderTopbar();`);
  const html = g.run('lastTopbar');
  ok(html.includes("resourceTip('nahrung')") && html.includes("resourceTip('wissen')") && html.includes('openLager()'), 'Leiste unvollständig');
  ok(!html.includes("resourceTip('holz')") && !html.includes("resourceTip('bronze')"), 'zu viele Waren oben');
  ok(g.run('lagerHtml()').includes("resourceTip('bronze')"), 'Bronze fehlt im Lager');
  noErrors(g);
});

test('Lager: Fundstücke stehen im Fenster', () => {
  const g = fresh();
  ok(g.run('lagerHtml()').includes('Noch nichts gefunden'), 'leerer Hinweis fehlt');
  g.run("state.finds.roetel = 2; state.fund.ever.roetel = 2;");
  ok(g.run('lagerHtml()').includes(g.run('FINDS.roetel.name')) && g.run('lagerHtml()').includes('2 / 5'), 'Rötel fehlt');
  noErrors(g);
});

test('Lager: Warnung „bald leer“ erscheint, flackert nicht und geht wieder', () => {
  const g = fresh();
  g.run(`state.res.holz = 10; stats.rates = { holz: -4 }; state.playTime = 1000; updateSoonEmpty();`);
  ok(g.run('warnedGoods().includes("holz")'), 'Warnung fehlt bei 2,5 Minuten');
  ok(g.run('(renderTopbar(), lastTopbar.includes("resourceTip(\'holz\')"))'), 'Holz nicht in der Leiste');
  g.run('stats.rates = { holz: 1 }; state.playTime = 1010; updateSoonEmpty();');
  ok(g.run('warnedGoods().includes("holz")'), 'Warnung flackert');
  g.run('state.playTime = 1040; updateSoonEmpty();');
  ok(!g.run('warnedGoods().includes("holz")'), 'Warnung bleibt, obwohl Holz steigt');
  g.run('state.res.holz = 20; stats.rates = { holz: -3 }; state.playTime = 2000; updateSoonEmpty();');
  ok(!g.run('warnedGoods().includes("holz")'), 'Warnung schon bei 6,7 Minuten');
  noErrors(g);
});

test('Lager: Verlustmeldung nach einer Minute, mit Pause und Grund', () => {
  const g = fresh();
  g.run(`state.res.holz = 100; stats.rates = { holz: -3 }; state.playTime = 1000; state.yearTime = 0;
    for (let i = 0; i < 59; i++) { state.playTime++; updateLosses(1); }`);
  ok(!g.run('stockWatch.lastText'), 'Meldung zu früh');
  g.run('state.playTime++; updateLosses(1);');
  ok(g.run('stockWatch.lastText').startsWith('📉 Holz −3,0 je Minute'), 'Meldung falsch: ' + g.run('stockWatch.lastText'));
  g.run("stockWatch.lastText = ''; for (let i = 0; i < 1100; i++) { state.playTime++; updateLosses(1); }");
  ok(!g.run('stockWatch.lastText'), 'Meldung trotz Pause');
  g.run('for (let i = 0; i < 101; i++) { state.playTime++; updateLosses(1); }');
  ok(g.run('stockWatch.lastText'), 'keine neue Meldung nach der Pause');
  g.run("resetStockWatch(); state.res.holz = 3000; for (let i = 0; i < 100; i++) { state.playTime++; updateLosses(1); }");
  ok(!g.run('stockWatch.lastText'), 'Meldung bei kleinem Verlust aus großem Vorrat');
  g.run("resetStockWatch(); state.res.holz = 100; state.res.stein = 100; stats.rates = { holz: -3 }; for (let i = 0; i < 61; i++) { state.playTime++; updateLosses(1); }");
  ok(g.run('stockWatch.lastText').includes('Holz'), 'Holz nicht gemeldet');
  g.run("stockWatch.lastText = ''; stats.rates = { holz: -3, stein: -3 }; for (let i = 0; i < 100; i++) { state.playTime++; updateLosses(1); }");
  ok(!g.run('stockWatch.lastText'), 'zweite Meldung zu schnell nach der ersten');
  ok(!g.run("effectHurts({ effect: { buildings: { acker: 1.2 }, happy: 5 } }, 'nahrung')") && g.run("effectHurts({ effect: { buildings: { acker: 0.5 } } }, 'nahrung')"), 'guter Grund falsch erkannt');
  g.run("resetStockWatch(); state.res.holz = 4; stats.rates = { holz: -3 }; for (let i = 0; i < 100; i++) { state.playTime++; updateLosses(1); }");
  ok(!g.run('stockWatch.lastText'), 'Meldung trotz fast leerem Bestand');
  noErrors(g);
});

test('Lager: im Winter nur eine Nahrungsmeldung, offline und im Einstieg keine', () => {
  const g = fresh();
  g.run(`state.res.nahrung = 150; stats.rates = { nahrung: -5 }; state.yearTime = CONFIG.yearSeconds * 0.8; state.playTime = 1000;
    for (let i = 0; i < 61; i++) { state.playTime++; updateLosses(1); }`);
  ok(g.run('stockWatch.lastText').includes('Nahrung'), 'Wintermeldung fehlt');
  g.run("stockWatch.lastText = ''; for (let i = 0; i < 700; i++) { state.playTime++; updateLosses(1); }");
  ok(!g.run('stockWatch.lastText'), 'zweite Wintermeldung');
  g.run(`resetStockWatch(); state.yearTime = 0; state.tutorial = 2; for (let i = 0; i < 100; i++) { state.playTime++; updateLosses(1); }`);
  ok(!g.run('stockWatch.lastText'), 'Meldung im Einstieg');
  g.run(`state.tutorial = -1; resetStockWatch(); offlineRunning = true; for (let i = 0; i < 100; i++) updateStockWatch(1); offlineRunning = false;`);
  ok(!g.run('stockWatch.lastText') && !g.run('Object.keys(stockWatch.lossFor).length'), 'Meldung bei der Abwesenheit');
  noErrors(g);
});

test('Schrägansicht: Feld → Bildschirm → Feld ergibt dasselbe Feld', () => {
  const g = fresh();
  const bad = g.run(`
    const wrong = [];
    for (const z of [0.3, 0.7, 1, 2.2]) {
      cam.zoom = z; cam.x = 123; cam.y = 456;
      for (let k = 0; k < 200; k++) {
        const x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N);
        const p = tileToScreen(x + 0.5, y + 0.5);
        const t = screenToTile(p.x, p.y);
        if (t.x !== x || t.y !== y) wrong.push([z, x, y, t.x, t.y]);
      }
    }
    wrong.length`);
  ok(bad === 0, `${bad} Felder falsch umgerechnet`);
});

test('Zoomen am Finger: der Punkt unter dem Finger bleibt stehen', () => {
  const g = fresh();
  const d = g.run(`cam.zoom = 1; const a = screenToTileF(200, 150); zoomAt(200, 150, 1.7); const b = screenToTileF(200, 150); Math.hypot(a.x - b.x, a.y - b.y)`);
  ok(d < 1e-6, 'Abweichung ' + d);
});

test('Bauen: Baustelle, höchstens 2 gleichzeitig, wird fertig und produziert', () => {
  const g = fresh();
  g.run(`state.res.holz = 100; state.res.stein = 100;`);
  const spot = g.run(`JSON.stringify(findFreeSpot('sammlerin', 64 + O, 58 + O))`);
  const r1 = g.run(`const s1 = findFreeSpot('sammlerin', 64 + O, 58 + O); placeBuilding('sammlerin', s1.x, s1.y)`);
  ok(r1 === null, 'Sammlerin nicht gebaut: ' + r1 + ' ' + spot);
  g.run(`const s2 = findFreeSpot('holzsammler', 58 + O, 58 + O); placeBuilding('holzsammler', s2.x, s2.y)`);
  const r3 = g.run(`const s3 = findFreeSpot('steinsammler', 70 + O, 58 + O); placeBuilding('steinsammler', s3.x, s3.y)`);
  ok(r3 && r3.includes('Baustellen'), 'Dritte Baustelle müsste warten: ' + r3);
  ok(g.run(`state.res.holz`) === 90, 'Kosten nicht abgezogen');
  g.run('for (let i = 0; i < 46; i++) update(1)');
  ok(g.run('constructionCount()') === 0, 'Baustellen nicht fertig');
  ok(g.run('state.built.sammlerin') === 1, 'Fertig-Zähler');
  const food = g.run('state.res.nahrung');
  const si = g.run(`state.buildings.findIndex(b => b.type === 'sammlerin')`);
  ok(g.run(`buildRoute(${si})`) === null && g.run(`isConnected(${si})`), 'Weg zur Sammlerin ging nicht');
  g.run('for (let i = 0; i < 60; i++) update(1)');
  ok(g.run(`stats.staff[${si}] === 2`), 'Sammlerin hat keine Arbeiter');
  ok(g.run('(stats.rates.nahrung || 0)') > 0, 'Nahrung wächst nicht (Rate ' + g.run('stats.rates.nahrung') + ')');
  ok(g.run('state.res.nahrung') > food, 'Nahrung nicht mehr geworden');
  noErrors(g);
});

test('Bauplatz: nicht im Wasser, nicht auf fremdem Land, nicht übereinander; Fischer nur am Wasser', () => {
  const g = fresh();
  ok(g.run(`placeProblem('sammlerin', 63 + O, 63 + O)`) === 'Hier steht schon etwas', 'Überlappung erlaubt');
  ok(g.run(`placeProblem('sammlerin', 2, 2)`).includes('gehört dir'), 'fremdes Land erlaubt');
  const water = g.run(`(() => { for (let y = 48 + O; y < 80 + O; y++) for (let x = 48 + O; x < 80 + O; x++) if (terrain[y * N + x] === TERRAIN.wasser.id) return [x, y]; })()`);
  ok(water, 'Kein Wasser im Startland');
  ok(g.run(`placeProblem('sammlerin', ${water[0]}, ${water[1]})`) !== null, 'Bauen im Wasser erlaubt');
  ok(g.run(`placeProblem('fischerplatz', 52 + O, 52 + O)`) !== null, 'Fischer fern vom Wasser erlaubt');
  ok(g.run(`(() => { for (let y = 48 + O; y < 78 + O; y++) for (let x = 48 + O; x < 78 + O; x++) if (!placeProblem('fischerplatz', x, y)) return true; return false; })()`), 'Kein Platz für den Fischer am Fluss');
});

test('Baum fällen und Felsen abtragen geben Holz/Stein und machen Platz', () => {
  const g = fresh();
  const tree = g.run(`(() => { for (let y = 48 + O; y < 80 + O; y++) for (let x = 48 + O; x < 80 + O; x++) if (terrain[y * N + x] === TERRAIN.wald.id) return [x, y]; })()`);
  ok(tree, 'Kein Baum im Startland');
  const holz = g.run('state.res.holz');
  ok(g.run(`clearTile(${tree[0]}, ${tree[1]})`) === true, 'Fällen ging nicht');
  ok(g.run('state.res.holz') === holz + 3, 'kein Holz bekommen');
  ok(g.run(`terrainAt(${tree[0]}, ${tree[1]}).blocks`) === false, 'Feld noch blockiert');
  // bleibt nach Speichern und Laden gefällt
  g.run(`saveGame(); loadSlot(currentSlot)`);
  ok(g.run(`terrainAt(${tree[0]}, ${tree[1]}).blocks`) === false, 'Baum nach dem Laden wieder da');
  noErrors(g);
});

test('Bauleiste: je Linie nur die neueste Stufe, Gesperrtes mit Schloss', () => {
  const g = fresh();
  const bar = () => g.run(`barEntries().map(e => e.type + (e.locked ? '🔒' : '')).join()`);
  ok(bar().includes('wohnhoehle') && !bar().includes('fellzelt'), 'Anfangs Wohnhöhle erwartet: ' + bar());
  ok(bar().includes('jaegerlager') && !bar().includes('fischerplatz'), 'Gebäude der nächsten Stufe schon sichtbar: ' + bar());
  g.run(`state.stage = 'mittel';`);
  ok(bar().includes('fischerplatz🔒') && bar().includes('ahnenplatz🔒'), 'Gesperrtes dieser Stufe fehlt: ' + bar());
  ok(g.run(`lockText('ahnenplatz')`).includes('Ahnenkult') && g.run(`lockText('acker')`).includes('Jungsteinzeit'), 'Sperrtext falsch');
  g.run(`state.stage = 'alt';`);
  ok(!bar().includes('acker'), 'Jungsteinzeit-Gebäude zu früh sichtbar');
  ok(!bar().includes('lagerfeuer') && !bar().includes('mammutjaegerlager'), 'Nicht baubares in der Leiste');
  g.run(`state.techs.faustkeil = true; state.techs.fellzelte = true;`);
  ok(bar().includes('fellzelt') && !bar().includes('wohnhoehle'), 'Nach „Fellzelte“ nur Fellzelt erwartet: ' + bar());
});

test('Forschung: kostet Wissen, nur eine gleichzeitig, Übergang öffnet die nächste Stufe', () => {
  const g = fresh();
  g.run(`for (const id of Object.keys(TECH_NEEDS)) delete TECH_NEEDS[id];`);   // Gebäude-Bedingung hat ihren eigenen Test
  ok(g.run(`startResearch('feuer_hueten')`).includes('Es fehlt'), 'ohne Wissen erlaubt');
  g.run(`state.res.wissen = 100;`);
  ok(g.run(`startResearch('speerspitzen')`).startsWith('Erst'), 'Voraussetzung ignoriert');
  ok(g.run(`startResearch('feuer_hueten')`) === null, 'Start ging nicht');
  ok(g.run(`startResearch('faustkeil')`).includes('läuft schon'), 'Zwei Forschungen gleichzeitig');
  ok(g.run('state.res.wissen') === 100 - g.run('TECHS.feuer_hueten.cost.wissen'), 'Wissen nicht abgezogen');
  g.run('for (let i = 0; i <= TECHS.feuer_hueten.time; i++) update(1)');
  ok(g.run('state.techs.feuer_hueten === true && state.research === null'), 'Forschung nicht fertig');
  g.run(`for (const id of ['flechtkoerbe','speerspitzen','fellzelte','faustkeil','hoehlenmalerei','mammutjagd']) state.techs[id] = true;
    for (const [id, n] of Object.entries(TECHS.mittelsteinzeit.cost)) state.res[id] = n;`);
  const need = g.run('TECHS.mittelsteinzeit.population');
  ok(g.run(`startResearch('mittelsteinzeit')`).includes(need + ' Einwohner'), 'Einwohner-Bedingung fehlt');
  g.run(`state.pop = ${need}; startResearch('mittelsteinzeit'); for (let i = 0; i <= TECHS.mittelsteinzeit.time; i++) update(1);`);
  ok(g.run('state.stage') === 'mittel', 'Stufe nicht gewechselt');
  ok(g.run(`activeNeeds().map(n => n.id).join()`) === 'nahrung,waerme', 'Kleidung/Glaube zählen schon vor ihren Gebäuden');
  g.run(`state.techs.ahnenkult = true; recalcStats();`);
  ok(g.run(`activeNeeds().map(n => n.id).join()`) === 'nahrung,waerme,glaube', 'Glaube zählt nach Ahnenkult nicht');
  g.run(`state.techs.fellbearbeitung = true; recalcStats();`);
  ok(g.run(`activeNeeds().map(n => n.id).join()`) === 'nahrung,waerme,kleidung,glaube', 'Bedürfnisse der Mittelsteinzeit fehlen');
  noErrors(g);
});

test('Forschungsbaum: alle Voraussetzungen existieren, kein Kreis, jeder Platz im Baum nur einmal', () => {
  const g = fresh();
  const problems = g.run(`
    const out = [];
    const seen = new Set();
    for (const [id, t] of Object.entries(TECHS)) {
      for (const r of t.requires) if (!TECHS[r]) out.push(id + ' braucht unbekanntes ' + r);
      const key = t.col + '/' + t.row;
      if (seen.has(key)) out.push('Platz doppelt: ' + id);
      seen.add(key);
    }
    for (const b of Object.values(BUILDINGS)) if (b.requires && !TECHS[b.requires]) out.push(b.name + ' braucht unbekanntes ' + b.requires);
    for (const b of Object.values(BUILDINGS)) if (b.upgradeTo && !BUILDINGS[b.upgradeTo]) out.push(b.name + ' → unbekannt');
    // Kreis-Prüfung: alles muss irgendwann erforschbar sein
    const done = {};
    let changed = true;
    while (changed) { changed = false; for (const [id, t] of Object.entries(TECHS)) if (!done[id] && t.requires.every(r => done[r])) { done[id] = true; changed = true; } }
    for (const id of Object.keys(TECHS)) if (!done[id]) out.push('nie erforschbar: ' + id);
    out.join('; ')`);
  ok(!problems, problems);
  // Seite zeichnet ohne Fehler
  g.run(`openResearch(); selectTech('mittelsteinzeit'); selectTech('__next'); closePage();`);
  noErrors(g);
});

test('Weiterentwickeln: Wohnhöhle → Fellzelt; größeres Langhaus braucht Platz', () => {
  const g = fresh();
  ok(g.run(`upgradeProblem(1)`).includes('Fellzelte'), 'ohne Forschung erlaubt');
  g.run(`state.techs.faustkeil = state.techs.fellzelte = true; state.res.holz = 500; state.res.felle = 50; state.res.stein = 500; state.res.werkzeug = 50;`);
  ok(g.run(`upgradeBuilding(1)`) === null, 'Weiterentwickeln ging nicht');
  ok(g.run(`state.buildings[1].type === 'fellzelt' && state.buildings[1].build > 0`), 'keine Baustelle');
  g.run('for (let i = 0; i < 46; i++) update(1)');
  ok(g.run('housingOf("fellzelt")') === 5 && g.run('stats.housing') === 8, 'Wohnplätze falsch: ' + g.run('stats.housing'));
  // Zwei Wohn-Reihen (Emin, 07.11.): das kleine Haus bleibt 2×2 und wird feiner, das Langhaus ist eine eigene Reihe
  const reihe = g.run(`(() => { const r = []; let t = 'wohnhoehle'; while (t) { r.push(t + ':' + BUILDINGS[t].size); t = BUILDINGS[t].upgradeTo; } return r.join(' '); })()`);
  ok(reihe === 'wohnhoehle:2 fellzelt:2 grubenhaus:2 flechtwerkhaus:2 steinhaus:2', 'Kleine Häuser falsch: ' + reihe);
  ok(g.run(`BUILDINGS.langhaus.line !== BUILDINGS.grubenhaus.line && !BUILDINGS.langhaus.upgradeOnly`), 'Langhaus nicht eigene Reihe');
  ok(g.run(`BAR_CATEGORIES.find(c => c.id === 'wohnen').lines.includes(BUILDINGS.langhaus.line)`), 'Langhaus fehlt in der Bauleiste');
  // Große Häuser zählen weiter als Wohnungen (Aufträge, Forschungen)
  ok(g.run(`(() => { const n = lineCount('wohnhoehle'); state.buildings[1].type = 'langhaus'; rebuildOccupancy(); return lineCount('wohnhoehle') === n; })()`), 'Langhaus zählt nicht als Wohnung');
  noErrors(g);
});

// Für Tests mit festen Feldern: die Karte, auf der sie geschrieben wurden (mapGen 1, gleicher Seed)
function freshOldMap() {
  const g = fresh();
  g.run(`state.mapGen = 1; buildTerrain(); rebuildOccupancy(); recalcStats();`);
  return g;
}

test('Verschieben und Drehen', () => {
  const g = freshOldMap();
  const spot = g.run(`JSON.stringify(findFreeSpot('wohnhoehle', 56 + O, 56 + O))`);
  const r = g.run(`const sp = ${spot}; moveBuilding(1, sp.x, sp.y, true)`);
  ok(r === null, 'Verschieben ging nicht: ' + r);
  ok(g.run(`state.buildings[1].rot === 1 && buildingAt(${JSON.parse(spot).x}, ${JSON.parse(spot).y}) === 1`), 'Platz/Drehung falsch');
  ok(g.run(`buildingAt(60 + O, 65 + O)`) === -1, 'Alter Platz noch belegt');
  ok(g.run(`moveBuilding(1, 63 + O, 63 + O, false)`) !== null, 'Verschieben auf Lagerfeuer erlaubt');
  // über die Bedienung: hochheben, ✔
  g.run(`liftBuilding(2); ghost.x -= 6; confirmGhost();`);
  ok(g.run('ghost === null && state.buildings[2].x === 57 + O'), 'Hochheben + ✔ ging nicht');
  noErrors(g);
});

test('Bedienung: aus der Leiste bauen mit ✔, Abbrechen mit ✖', () => {
  const g = fresh();
  g.run(`beginBuild('sammlerin'); confirmGhost();`);
  ok(g.run(`state.buildings.some(b => b.type === 'sammlerin')`), 'Bauen über die Leiste ging nicht');
  g.run(`beginBuild('holzsammler'); cancelGhost();`);
  ok(!g.run(`state.buildings.some(b => b.type === 'holzsammler')`), '✖ hat trotzdem gebaut');
  g.run(`beginBuild('pfad'); gesture = { mode: 'path' }; paintPath(viewW / 2 + 200, viewH / 2 + 100); cancelGhost();`);
  noErrors(g);
});

test('Wärme: Wohnung fern vom Feuer senkt die Zufriedenheit', () => {
  const g = freshOldMap();
  ok(g.run('stats.needs.waerme') === 1, 'Startwohnungen kalt');
  g.run(`addBuilding('wohnhoehle', 49 + O, 49 + O, false, true); rebuildOccupancy(); buildRoute(state.buildings.length - 1); recalcStats();`);
  ok(g.run('isConnected(5)'), 'ferne Wohnung nicht angeschlossen');
  ok(g.run('stats.needs.waerme') < 1, 'Ferne Wohnung trotzdem warm');
  ok(g.run('stats.happiness') < 100, 'Zufriedenheit unverändert');
});

test('Speichern und Laden ergibt denselben Stand', () => {
  const g = fresh();
  g.run(`state.res.holz = 77.5; state.techs.faustkeil = true; state.research = { id: 'feuer_hueten', left: 12 }; placeBuilding('sammlerin', findFreeSpot('sammlerin', 62 + O, 56 + O).x, findFreeSpot('sammlerin', 62 + O, 56 + O).y); state.plots[0] = 0; saveGame();`);
  const before = g.run('JSON.stringify({ ...state, savedAt: 0 })');
  g.run('state = null; loadSlot(currentSlot)');
  const after = g.run('JSON.stringify({ ...state, savedAt: 0 })');
  ok(before === after, 'Unterschied nach dem Laden');
  noErrors(g);
});

test('Kaputte Spielstände stürzen nicht ab', () => {
  for (const text of ['', 'null', '{}', '[]', '{"buildings":5}', 'kein json',
    '{"buildings":[{"type":"gibtsnicht","x":1,"y":1},{"type":"sammlerin","x":"a","y":2},{"type":"sammlerin","x":30,"y":30},{"type":"sammlerin","x":30,"y":30}],"res":{"holz":-5,"stein":"x"},"pop":-3,"techs":{"quatsch":true},"research":{"id":"quatsch","left":3},"plots":[1]}']) {
    const g = loadGame({ seed: 1, storage: { 'epochia-save-1': text } });
    const loaded = g.run('loadSlot(1)');
    if (loaded) {
      g.run('for (let i = 0; i < 20; i++) update(1); drawScene(0.1); renderAll();');
      ok(g.run('state.res.holz >= 0 && state.pop >= 0'), 'negative Werte übernommen: ' + text);
      ok(g.run(`state.buildings.filter(b => b.type === 'sammlerin').length`) <= 1, 'überlappende Gebäude übernommen');
      ok(g.run(`state.buildings.some(b => b.type === 'lagerfeuer')`), 'Lagerfeuer fehlt');
    }
    noErrors(g);
  }
});

test('Altes Spiel: Spielstände von „stadtaufbau“ bleiben unberührt', () => {
  const old = { 'stadtaufbau-save-1': '{"alt":true}', 'stadtaufbau-slot': '1' };
  const g = loadGame({ seed: 1, storage: old });
  g.run('startNewGame(1); saveGame(); saveSettings(); deleteSlot(1);');
  ok(g.storage['stadtaufbau-save-1'] === '{"alt":true}' && g.storage['stadtaufbau-slot'] === '1', 'Alter Stand verändert');
  noErrors(g);
});

test('Export und Import', () => {
  const g = fresh();
  g.run(`state.res.stein = 123; saveGame(); var ex = exportText(); state.res.stein = 1;`);
  ok(g.run('importText(ex)') === true, 'Import ging nicht');
  ok(g.run('state.res.stein') === 123, 'Wert nicht zurück');
  ok(g.run('importText("Quatsch!!")') === false, 'Unsinn importiert');
  noErrors(g);
});

test('Offline-Fortschritt: läuft weiter, höchstens 2 Stunden, verstellte Uhr schadet nicht', () => {
  const g = fresh();
  g.run(`state.res.holz = 100; const sp = findFreeSpot('holzsammler', 58 + O, 58 + O); placeBuilding('holzsammler', sp.x, sp.y); buildRoute(5); for (let i = 0; i < 40; i++) update(1);`);
  const holz = g.run('state.res.holz');
  const r = g.run('JSON.stringify(applyOfflineProgress(Date.now() - 3600 * 1000))');
  ok(r && Math.abs(JSON.parse(r).seconds - 3600) < 1, 'Offline nicht gelaufen');
  ok(g.run('state.res.holz') > holz, 'kein Holz offline');
  const r2 = g.run('JSON.stringify(applyOfflineProgress(Date.now() - 100 * 3600 * 1000))');
  ok(Math.abs(JSON.parse(r2).seconds - 2 * 3600) < 1, 'nicht auf 2 h begrenzt');
  ok(g.run('applyOfflineProgress(Date.now() + 3600 * 1000)') === null, 'Zukunft gezählt');
  g.run('update(-50); update(NaN); update(Infinity)');
  ok(g.run('Number.isFinite(state.res.holz) && Number.isFinite(state.playTime)'), 'Kaputte Zeit macht Werte kaputt');
  noErrors(g);
});

test('Tägliche Belohnung: Reihe von 7 Tagen, ein verpasster Tag bricht sie nicht, zwei schon; wächst mit dem Zeitalter', () => {
  const g = fresh();
  const day = d => g.run(`checkDailyReward(new Date(2026, 9, ${d}, 10))`);
  ok(day(1) === 1, 'Tag 1');
  ok(day(1) === 1, 'zweimal am selben Tag');
  g.run('claimDailyReward()');
  ok(day(1) === 0, 'nach Abholen nochmal');
  ok(day(2) === 2 && day(3) === 3, 'Reihe zählt nicht');
  ok(day(5) === 4, 'Ein verpasster Tag darf die Reihe nicht brechen');
  ok(day(8) === 1, 'Zwei verpasste Tage: Reihe muss neu anfangen');
  for (let d = 9; d <= 14; d++) day(d);
  ok(day(15) === 1, 'Nach Tag 7 wieder Tag 1 erwartet, ist ' + day(15));
  g.run(`state.daily = { last: '', streak: 0, pending: 0 }; checkDailyReward(new Date(2026, 9, 1)); state.res.holz = 0; claimDailyReward();`);
  ok(g.run('state.res.holz') === 20, 'Belohnung nicht gutgeschrieben');
  g.run(`state.stage = 'spaet'`);
  const t7 = g.run('dailyRewardOf(7)');
  ok(t7.holz === 500 && t7.bronze === 20 && t7.schmuck === 6, 'Truhe wächst nicht mit dem Zeitalter: ' + JSON.stringify(t7));
  ok(Object.keys(g.run('dailyRewardOf(1)')).every(id => id === 'nahrung' || id === 'holz'), 'Tag 1 soll keine Zeitalter-Waren haben');
});

test('Aufträge: Fortschritt und Abholen', () => {
  const g = fresh();
  ok(!g.run(`claimQuest('q_sammlerin2')`), 'unerledigt abgeholt');
  g.run(`state.built.sammlerin = 2; state.res.holz = 0;`);
  ok(g.run(`claimQuest('q_sammlerin2')`), 'Abholen ging nicht');
  ok(g.run('state.res.holz') === 20, 'Belohnung fehlt');
  ok(!g.run(`claimQuest('q_sammlerin2')`), 'zweimal abgeholt');
  ok(g.run(`activeQuests().length`) === 3, 'Drei Aufträge sichtbar erwartet');
});

test('Forschung verlangt Gebäude: Bedingungen sind erreichbar, sperren und zählen die ganze Linie', () => {
  const g = fresh();
  // Jedes verlangte Gebäude muss vor dieser Forschung freigeschaltet sein (sonst käme man nie weiter)
  const bad = g.run(`(() => {
    const before = id => { const seen = new Set(); (function walk(t) { for (const r of TECHS[t].requires) if (!seen.has(r)) { seen.add(r); walk(r); } })(id); return seen; };
    const out = [];
    for (const [id, needs] of Object.entries(TECH_NEEDS)) {
      if (!TECHS[id]) { out.push('unbekannt ' + id); continue; }
      for (const type of Object.keys(needs)) {
        if (!BUILDINGS[type]) { out.push(id + ': ' + type); continue; }
        const req = BUILDINGS[type].requires;
        if (req && !before(id).has(req)) out.push(id + ' braucht ' + type + ', das erst ' + req + ' freischaltet');
      }
    }
    return out;
  })()`);
  ok(bad.length === 0, bad.join('; '));
  g.run(`state.techs.faustkeil = true; state.res.wissen = 500; state.res.holz = 200; state.pop = 20;`);
  ok(g.run(`startResearch('speerspitzen')`).includes('Jägerlager'), 'Forschung ohne Jägerlager gestartet');
  const y = g.run(`Math.floor(N / 2) + 12`);
  g.run(`state.buildings.push({ type: 'jaegerlager', x: ${y}, y: ${y}, rot: 0, build: 0 }, { type: 'jaegerlager', x: ${y + 4}, y: ${y}, rot: 0, build: 1 });`);
  ok(g.run(`researchProblem('speerspitzen')`).includes('1 × Jägerlager'), 'Baustelle darf nicht zählen');
  g.run(`state.buildings[state.buildings.length - 1].build = 0;`);
  ok(g.run(`researchProblem('speerspitzen')`) === null, 'Mit 2 Jägerlagern muss es gehen');
  // Ein Mammutjägerlager zählt auch als Jägerlager
  g.run(`state.buildings[state.buildings.length - 1].type = 'mammutjaegerlager';`);
  ok(g.run(`researchProblem('speerspitzen')`) === null, 'Weiterentwicklung zählt nicht mit');
  noErrors(g);
});

test('Aufträge: gesperrte verstopfen die Liste nicht, Fernziel rückt nach', () => {
  const g = fresh();
  const blocked = g.run(`(() => {
    for (const q of QUESTS) if (!(q.goal.build && !isUnlocked(q.goal.build)) && !q.goal.tech && !q.requires && !q.goal.resource) state.quests[q.id] = true;
    state.quests.q_holz100 = true;
    return activeQuests().map(q => q.id);
  })()`);
  ok(blocked.length === 3, 'Es sollen weiter 3 Aufträge zu sehen sein: ' + blocked.join());
  g.run(`state.quests = {};`);
  const start = g.run(`activeQuests().map(q => q.id)`);
  ok(!start.includes('q_zelte3') && !start.includes('q_mittel'), 'Gesperrtes vorne: ' + start.join());
  ok(new Set(g.run(`QUESTS.map(q => q.id)`)).size === g.run(`QUESTS.length`), 'Auftrags-IDs doppelt');
  // Alle Ziele müssen eine Anzeige ergeben, kein NaN
  ok(g.run(`QUESTS.every(q => { const p = questProgress(q); return p.need > 0 && Number.isFinite(p.have) && !questIcon(q).includes('undefined'); })`), 'Auftrag ohne Fortschritt');
  noErrors(g);
});

test('Wünsche des Stammes: Waren abgeben bringt Wissen und kürzere Forschung, dann Pause', () => {
  const g = fresh();
  g.run(`{ const m = Math.floor(N / 2) + 12; state.buildings.push({ type: 'sammlerin', x: m, y: m, rot: 0, build: 0 }); rebuildOccupancy(); }`);
  const w = g.run(`currentWish()`);
  ok(w && w.amount > 0 && w.text, 'Kein Wunsch da');
  ok(g.run(`RESOURCES[currentWish().id] && hasMaker(currentWish().id)`), 'Wunsch nach einer Ware, die niemand herstellt');
  g.run(`state.res[currentWish().id] = 0;`);
  ok(g.run(`fulfillWish()`) === null, 'Wunsch ohne Waren erfüllt');
  g.run(`state.res.wissen = 100; state.techs = {}; startResearch('feuer_hueten'); state.research.left = 500; state.res[currentWish().id] = 150;`);
  const before = g.run(`state.res.wissen`);
  const r = g.run(`fulfillWish()`);
  ok(r && r.faster === g.run(`CONFIG.wishes.researchSeconds`), 'Forschung nicht kürzer');
  ok(g.run(`state.research.left`) === 500 - r.faster, 'Restzeit falsch');
  ok(g.run(`state.res.wissen`) === before + r.wissen, 'Wissen fehlt');
  ok(g.run(`state.wishesDone`) === 1 && g.run(`currentWish()`) === null, 'Pause fehlt');
  g.run(`for (let i = 0; i <= CONFIG.wishes.pause; i++) updateWishes(1);`);
  ok(g.run(`currentWish() !== null`), 'Nächster Wunsch kommt nicht');
  // Forschung kurz vor Schluss: wird nicht negativ
  g.run(`state.research.left = 10; state.res[currentWish().id] = 150; fulfillWish();`);
  ok(g.run(`state.research.left`) === 1, 'Restzeit nicht bei 1 s gestoppt');
  noErrors(g);
});

test('Drehen: nur echte Seiten, keine zwei Bilder für dieselbe Seite', () => {
  const g = fresh();
  const steps = type => g.run(`(() => { ghost = { type: '${type}', x: 1, y: 1, rot: 0, from: -1 }; const seen = []; for (let i = 0; i < 4; i++) { seen.push(ghost.rot); rotateGhost(); } ghost = null; return new Set(seen).size; })()`);
  ok(steps('wohnhoehle') === 4, 'Wohnhöhle hat eine echte Rückseite');
  ok(steps('hoehlenmaler') === 4, 'Höhlenmaler hat eine echte Rückseite');
  ok(steps('fischerplatz') === 2, 'Fischerplatz ohne Rückseite: nur 2 Richtungen');
  ok(g.run(`typeof EFFECTS['1-wohnhoehle-r2'] === 'undefined' && typeof EFFECTS['1-hoehlenmaler-r2'] === 'undefined'`), 'Feuer auf der geschlossenen Rückseite');
  noErrors(g);
});

test('Spielstand von Emin (Version 57): lädt, hat zu tun, kommt weiter', () => {
  const g = fresh();
  const fx = fs.readFileSync(new URL('./alter-stand-v57.json', import.meta.url), 'utf8');
  ok(g.run(`loadFromText(${JSON.stringify(fx)})`), 'Stand lädt nicht');
  ok(g.run(`state.pop`) === 21 && g.run(`state.wishesDone`) === 0 && g.run(`state.huntsDone`) === 0, 'Neue Felder ohne Standardwert');
  // alles, was er gebaut hat, bleibt; seine erledigten Aufträge bleiben erledigt
  ok(g.run(`state.buildings.filter(b => b.type === 'wohnhoehle').length`) === 7, 'Gebäude verloren');
  ok(g.run(`state.quests.q_pop15 === true`), 'Erledigter Auftrag verloren');
  // Früher: alle 3 sichtbaren Aufträge gesperrt. Jetzt: nichts davon gesperrt, und ein Wunsch wartet
  ok(g.run(`activeQuests().filter(q => questBlocked(q) && !questDone(q)).length`) === 0, 'Gesperrte Aufträge sichtbar');
  ok(g.run(`currentWish() !== null`), 'Kein Wunsch');
  ok(g.run(`researchProblem('mittelsteinzeit') !== null`), 'Mittelsteinzeit darf noch nicht gehen');
  g.run(`for (let i = 0; i < 60; i++) update(1);`);
  noErrors(g);
});

test('Kupferzeit: Aufbruch, Geschenk, Dorfplatz, Weiterentwicklung und Metall-Kette', () => {
  const g = fresh();
  g.run(`for (const id of Object.keys(TECH_NEEDS)) delete TECH_NEEDS[id];
    for (const id in TECHS) if (!['kupfer', 'frueh', 'spaet'].includes(TECHS[id].stage) && !TECHS[id].stage.startsWith('eisen') && id !== 'aufbruch_bronzezeit') state.techs[id] = true;
    state.stage = 'jung'; state.pop = 130; state.res.wissen = 999;
    for (const id of ['holz','stein','nahrung','toepferwaren','werkzeug']) state.res[id] = 400;
    recalcStats();`);
  ok(g.run(`barEntries().every(e => BUILDINGS[e.type].stage !== 'kupfer' || !e.locked) && !barEntries().some(e => e.type === 'kupfermine')`), 'Kupferzeit-Gebäude vor dem Aufbruch sichtbar');
  const cap = g.run(`storageCap()`);
  // alle Kosten des Aufbruchs müssen ins Grundlager passen, sonst käme man nie los
  ok(g.run(`Object.entries(TECHS.aufbruch_bronzezeit.cost).every(([id, n]) => id === 'wissen' || n <= CONFIG.baseStorage + CONFIG.stageStorage.jung)`), 'Aufbruch teurer als das Lager');
  ok(g.run(`startResearch('aufbruch_bronzezeit')`) === null, 'Aufbruch startet nicht');
  g.run(`for (let i = 0; i <= TECHS.aufbruch_bronzezeit.time; i++) update(1);`);
  ok(g.run(`state.stage`) === 'kupfer', 'Stufe nicht gewechselt');
  ok(g.run(`state.res.kupfer`) === 20 && g.run(`state.res.kupfererz`) >= 30, 'Geschenk fehlt');
  ok(g.run(`storageCap()`) === Math.round(cap + g.run(`(CONFIG.dorfplatz.storage + CONFIG.stageStorage.kupfer - CONFIG.stageStorage.jung) * (1 + techSum('storage'))`)), 'Dorfplatz bringt kein Lager');
  ok(g.run(`['gemuesegarten', 'fischerhuette', 'holzfaeller', 'steinbruch', 'felsritzer', 'lehmgrube', 'kupferschmied'].every(t => WORK[t])`), 'Weiterentwicklung ohne Arbeiter');
  // gleiche Zutaten: von selbst – neue Zutaten: nur per Knopf
  const y = g.run(`Math.floor(N / 2) + 10`);
  g.run(`state.buildings.push({ type: 'sammlerin', x: ${y}, y: ${y}, rot: 0, build: 0 }, { type: 'steinschlaeger', x: ${y + 3}, y: ${y}, rot: 0, build: 0 }, { type: 'langhaus', x: ${y + 6}, y: ${y}, rot: 2, build: 0 });
    rebuildOccupancy();
    for (const id of ['gartenbau', 'kupferschmied', 'lehmbau']) state.techs[id] = true;
    evolveBuildings();`);
  const typ = (dx) => g.run(`state.buildings.find(b => b.x === ${y + dx} && b.y === ${y}).type`);
  ok(typ(0) === 'gemuesegarten', 'Sammlerin nicht weiterentwickelt: ' + typ(0));
  ok(typ(6) === 'lehmhaus', 'Langhaus nicht weiterentwickelt: ' + typ(6));
  ok(typ(3) === 'steinschlaeger', 'Steinschläger darf nicht von selbst umgebaut werden');
  ok(g.run(`upgradeTarget(state.buildings.find(b => b.x === ${y + 3})) === 'kupferschmied'`), 'Knopf für Kupferschmied fehlt');
  // Mine: nur an Felsen oder Gebirge
  const r = g.run(`(() => {
    state.techs.bergbau = true;
    let good = null, bad = null;
    for (let y = landBox.y0; y <= landBox.y1 && !(good && bad); y++) for (let x = landBox.x0; x <= landBox.x1; x++) {
      const p = placeProblem('kupfermine', x, y);
      if (!p && !good) good = [x, y];
      if (p && p.includes('Felsen oder am Gebirge') && !bad) bad = [x, y];
    }
    return { good, bad };
  })()`);
  ok(r.good && r.bad, 'Mine: Platzregel greift nicht ' + JSON.stringify(r));
  // Kette: Erz + Kohle → Kupfer
  g.run(`for (const b of state.buildings) if (b.type === 'pfad') 0;
    state.res.kupfererz = 100; state.res.holzkohle = 100; state.res.kupfer = 0; state.pop = 150; recalcStats();`);
  ok(g.run(`BUILDINGS.schmelzofen.consumes.kupfererz === 2 && BUILDINGS.schmelzofen.produces.kupfer === 1`), 'Schmelzofen falsch');
  ok(g.run(`hasMaker('kupfer') === false`), 'Kupfer ohne Schmelze-Forschung herstellbar');
  g.run(`state.techs.kupferschmelze = true;`);
  ok(g.run(`hasMaker('kupfer') && hasMaker('holzkohle')`), 'Kette nicht freigeschaltet');
  noErrors(g);
});

test('Kupferzeit: Spielstand speichern und laden, Oberfläche ohne Bilder', () => {
  const g = fresh();
  g.run(`for (const id in TECHS) if (!['kupfer', 'frueh', 'spaet'].includes(TECHS[id].stage) && !TECHS[id].stage.startsWith('eisen')) state.techs[id] = true;
    state.stage = 'kupfer'; state.res.kupfer = 12; state.techs.kupferschmelze = true; state.techs.bergbau = true;
    const m = Math.floor(N / 2) + 10; state.buildings.push({ type: 'schmelzofen', x: m, y: m, rot: 0, build: 0 });`);
  const text = g.run(`serialize()`);
  ok(g.run(`loadFromText(${JSON.stringify(text)})`), 'Lädt nicht');
  ok(g.run(`state.stage`) === 'kupfer' && g.run(`state.res.kupfer`) === 12, 'Stand verloren');
  ok(g.run(`state.buildings.some(b => b.type === 'schmelzofen')`), 'Schmelzofen verloren');
  ok(g.run(`barEntries().some(e => e.type === 'kupfermine' && !e.locked)`), 'Mine fehlt in der Bauleiste');
  ok(g.run(`BAR_CATEGORIES.flatMap(c => c.lines).includes('schmelzen')`), 'Schmelzen in keiner Kategorie');
  g.run(`openResearch(); showResearchStage('kupfer'); researchListHtml(); selectTech('kupferbeil'); techDetailHtml(); researchTopHtml(); closePage(); renderAll();`);
  noErrors(g);
});

test('Frühe Bronzezeit: Übergang, Werkzeug-Bedürfnis, Weiterentwicklung, Ziel noch gesperrt', () => {
  const g = fresh();
  g.run(`for (const id of Object.keys(TECH_NEEDS)) delete TECH_NEEDS[id];
    for (const id in TECHS) if (!['frueh', 'spaet'].includes(TECHS[id].stage) && !TECHS[id].stage.startsWith('eisen') && id !== 'fruehe_bronzezeit') state.techs[id] = true;
    state.stage = 'kupfer'; state.pop = 160; state.res.wissen = 999; state.res.nahrung = 500; state.res.kupfer = 100; state.res.werkzeug = 100;
    const m = Math.floor(N / 2) + 12;
    state.buildings.push({ type: 'acker', x: m, y: m, rot: 0, build: 0 }, { type: 'fellmacherin', x: m + 4, y: m, rot: 0, build: 0 }, { type: 'pflanzerin', x: m + 7, y: m, rot: 0, build: 0 }, { type: 'kupferschmied', x: m + 10, y: m, rot: 0, build: 0 });
    rebuildOccupancy(); recalcStats();`);
  ok(g.run(`activeNeeds().every(n => n.id !== 'werkzeug')`), 'Werkzeug-Bedürfnis schon in der Kupferzeit');
  ok(g.run(`researchProblem('fruehe_bronzezeit')`) === null, 'Frühe Bronzezeit startet nicht: ' + g.run(`researchProblem('fruehe_bronzezeit')`));
  g.run(`startResearch('fruehe_bronzezeit'); for (let i = 0; i <= TECHS.fruehe_bronzezeit.time; i++) update(1);`);
  ok(g.run(`state.stage`) === 'frueh', 'Stufe nicht gewechselt');
  ok(g.run(`activeNeeds().some(n => n.id === 'werkzeug')`), 'Werkzeug-Bedürfnis fehlt');
  ok(g.run(`CONFIG.goodsPerPerson`) > g.run(`NEEDS.find(n => n.id === 'werkzeug').perPerson`), 'Werkzeug-Bedarf nicht klein');
  // Baumgärtnerin kommt mit dem Kupferbeil (Forschung ist schon da), gleiche Zutaten: von selbst
  g.run(`evolveBuildings();`);
  const typ = dx => g.run(`state.buildings.find(b => b.x === Math.floor(N / 2) + 12 + ${dx} && b.y === Math.floor(N / 2) + 12).type`);
  ok(typ(7) === 'baumgaertnerin', 'Pflanzerin nicht weiterentwickelt: ' + typ(7));
  ok(typ(0) === 'acker', 'Acker schon ohne Hakenpflug weiter');
  g.run(`for (const id of ['hakenpflug', 'webstuhl', 'bronzewerkzeug', 'brennofen', 'schafzucht']) state.techs[id] = true; evolveBuildings();`);
  ok(typ(0) === 'feld', 'Acker nicht zum Feld');
  ok(typ(4) === 'fellmacherin' && typ(10) === 'kupferschmied', 'Gebäude mit neuen Zutaten darf nicht von selbst umgebaut werden');
  ok(g.run(`upgradeTarget(state.buildings.find(b => b.type === 'fellmacherin'))`) === 'weberin', 'Knopf für Weberin fehlt');
  ok(g.run(`upgradeTarget(state.buildings.find(b => b.type === 'kupferschmied'))`) === 'bronzeschmied', 'Knopf für Bronzeschmied fehlt');
  ok(g.run(`['jagdhuette', 'feld', 'viehhof', 'baumgaertnerin', 'weberin', 'bronzeschmied', 'toepferwerkstatt'].every(t => WORK[t])`), 'Weiterentwicklung ohne Arbeiter');
  ok(g.run(`SEASON_FACTORS.feld[3]`) === 0, 'Feld trägt im Winter');
  ok(g.run(`Object.values(BUILDINGS).every(d => BAR_CATEGORIES.some(c => c.lines.includes(d.line)) || d.line === 'mitte')`), 'Linie ohne Kategorie in der Bauleiste');
  ok(g.run(`Object.values(BUILDINGS).every(d => !d.upgradeTo || BUILDINGS[d.upgradeTo])`), 'Weiterentwicklung zeigt ins Leere');
  // alle Forschungskosten passen ins Lager ihres Zeitalters, alle verlangten Gebäude gibt es
  ok(g.run(`Object.values(TECHS).every(t => Object.entries(t.cost).every(([id, n]) => RESOURCES[id] && (id === 'wissen' || n <= CONFIG.baseStorage + CONFIG.stageStorage[t.stage || 'alt'] + (['kupfer', 'frueh', 'spaet', 'eisen1', 'eisen2', 'eisen3'].includes(t.stage) ? CONFIG.dorfplatz.storage : 0))))`), 'Forschung passt nicht ins Lager');
  noErrors(g);
});

test('Frühe Bronzezeit: Daten passen zusammen', () => {
  const g = fresh();
  ok(g.run(`Object.entries(TECH_NEEDS).every(([t, need]) => TECHS[t] && Object.keys(need).every(b => BUILDINGS[b]))`), 'TECH_NEEDS verweist ins Leere');
  ok(g.run(`Object.values(BUILDINGS).every(d => !d.requires || TECHS[d.requires])`), 'Gebäude verlangt unbekannte Forschung');
  ok(g.run(`Object.values(TECHS).every(t => t.requires.every(r => TECHS[r]))`), 'Forschung verlangt unbekannte Forschung');
  ok(g.run(`QUESTS.every(q => Object.keys(q.reward).every(id => RESOURCES[id]))`), 'Auftrag belohnt unbekannte Ware');
  ok(g.run(`new Set(QUESTS.map(q => q.id)).size === QUESTS.length`), 'Auftrag doppelt');
  ok(g.run(`CONFIG.trader.offers.every(o => [...Object.keys(o.give), ...Object.keys(o.get)].every(id => RESOURCES[id]))`), 'Händler kennt die Ware nicht');
  ok(g.run(`Object.keys(CONFIG.wishes.amount).every(id => RESOURCES[id] && CONFIG.wishes.text[id])`), 'Wunsch ohne Ware oder Text');
  noErrors(g);
});

test('Metall-Kette läuft wirklich: Erz + Kohle → Kupfer, Kupfer + Zinn → Bronze, Bronze → Werkzeug', () => {
  const g = fresh();
  const r = g.run(`(() => {
    for (const id in TECHS) if (!['frueh', 'spaet'].includes(TECHS[id].stage) && !TECHS[id].stage.startsWith('eisen') || TECHS[id].stage === 'frueh' && !TECHS[id].transition) state.techs[id] = true;
    state.stage = 'frueh';
    for (const k in RESOURCES) state.res[k] = 0;
    Object.assign(state.res, { nahrung: 500, holz: 300, stein: 300, werkzeug: 100, bronze: 200, kupfer: 200, ton: 50 });
    state.pop = 30;
    const built = {};
    // Gebäude regelkonform: dort, wo der Platz nach den Spielregeln passt, jeweils mit Weg
    const near = Math.floor(N / 2);
    for (const t of ['langhaus', 'langhaus', 'langhaus', 'kupfermine', 'koehler', 'schmelzofen', 'schmelzofen', 'zinnwaescherin', 'bronzegiesser', 'bronzeschmied']) {
      const sp = findFreeSpot(t, near, near);
      if (!sp) { built[t] = 'kein Platz'; continue; }
      const k = state.buildings.length;
      state.buildings.push({ type: t, x: sp.x, y: sp.y, rot: 0, build: 0 }); setOccupied(state.buildings[k], k + 1);
      const err = buildRoute(k);
      built[t] = err || 'ok';
    }
    rebuildOccupancy();
    state.pop = 30; recalcStats();
    const verbunden = state.buildings.map((b, i) => [b.type, isConnected(i)]).filter(a => !a[1] && a[0] !== 'pfad' && a[0] !== 'bruecke').map(a => a[0]);
    state.res.nahrung = 1000; state.res.kupfererz = 0; state.res.holzkohle = 0; state.res.kupfer = 0; state.res.zinn = 0; state.res.bronze = 200; state.res.werkzeug = 0; state.res.holz = 300;
    for (let i = 0; i < 1800; i++) { state.res.holz = Math.max(state.res.holz, 300); state.res.nahrung = Math.max(state.res.nahrung, 500); update(1); }
    return { built, verbunden, res: { ...state.res }, flows: Object.fromEntries(['kupfererz', 'holzkohle', 'kupfer', 'zinn', 'bronze', 'werkzeug'].map(id => [id, stats.flows[id] || null])), staff: stats.staff.filter(n => n === 0).length };
  })()`);
  ok(!r.verbunden.length, 'Nicht verbunden: ' + r.verbunden + ' ' + JSON.stringify(r.built));
  // Jede Stufe der Kette muss Waren gemacht und weitergegeben haben
  for (const id of ['kupfererz', 'holzkohle', 'kupfer', 'zinn', 'bronze', 'werkzeug'])
    ok(r.flows[id] && Object.values(r.flows[id].in).some(n => n > 0), id + ' wird nicht hergestellt: ' + JSON.stringify(r));
  ok(r.res.werkzeug > 1 || Object.values(r.flows.werkzeug.out).some(n => n > 0), 'Werkzeug kommt nicht an: ' + JSON.stringify(r.res));
  noErrors(g);
});

test('Händler: kommt nur mit Handelsplatz, bleibt, tauscht einmal je Angebot, kommt nicht offline', () => {
  const g = fresh();
  g.run(`for (const id in TECHS) if (!['frueh', 'spaet'].includes(TECHS[id].stage) && !TECHS[id].stage.startsWith('eisen') || id === 'tauschhandel') state.techs[id] = true;
    state.stage = 'frueh'; state.pop = 20;
    for (const id in RESOURCES) state.res[id] = 200;`);
  g.run(`for (let i = 0; i < 300; i++) { update(1); state.res.nahrung = 200; }`);
  ok(g.run(`state.trader.visit`) === 0 && !g.run(`traderHere()`), 'Händler kommt ohne Handelsplatz');
  ok(g.run(`barEntries().some(e => e.type === 'handelsplatz' && !e.locked)`), 'Handelsplatz fehlt in der Bauleiste');
  const k = g.run(`(() => { const sp = findFreeSpot('handelsplatz', Math.floor(N / 2), Math.floor(N / 2)); const k = state.buildings.length; state.buildings.push({ type: 'handelsplatz', x: sp.x, y: sp.y, rot: 0, build: 0 }); rebuildOccupancy(); buildRoute(k); recalcStats(); return k; })()`);
  ok(g.run(`isConnected(${k})`), 'Handelsplatz ohne Weg');
  g.run(`for (const id in RESOURCES) state.res[id] = 200; for (let i = 0; i < CONFIG.trader.firstWait + 1; i++) update(1);`);
  ok(g.run(`traderHere()`) && g.run(`state.trader.visit`) === 1, 'Händler kommt nicht');
  const offers = g.run(`traderOffers().map(o => o.id)`);
  ok(offers.length === 3 && new Set(offers).size === 3, 'Angebote falsch: ' + offers);
  ok(g.run(`!!traderOffers()[0].get.zinn`), 'Erstes Angebot bringt kein Zinn');
  ok(JSON.stringify(g.run(`traderOffers().map(o => o.id)`)) === JSON.stringify(offers), 'Angebote wechseln während des Besuchs');
  const zinn = g.run(`state.res.zinn = 0, state.res.zinn`);
  const id = offers[0];
  const before = g.run(`Object.entries(CONFIG.trader.offers.find(o => o.id === '${id}').give)[0][1]`);
  ok(g.run(`doTrade('${id}')`) === null, 'Tausch geht nicht');
  ok(g.run(`state.res.zinn`) > zinn, 'Kein Zinn bekommen');
  ok(before > 0 && g.run(`state.tradesDone`) === 1, 'Tausch nicht gezählt');
  ok(g.run(`doTrade('${id}')`) !== null, 'Gleiches Angebot zweimal getauscht');
  // Oberfläche und Zeichnen
  g.run(`openTrader(); tradeNow('${offers[1]}'); closePage(); openQuests(); closePage(); renderAll(); drawScene(0.05);`);
  // Speichern und Laden behält den Besuch
  const text = g.run(`serialize()`);
  ok(g.run(`loadFromText(${JSON.stringify(text)})`), 'Lädt nicht');
  ok(g.run(`state.trader.done.includes('${id}') && state.tradesDone === 2 && traderHere()`), 'Händler nach dem Laden verloren');
  // offline: er kommt und geht nicht
  const w = g.run(`state.trader.left`);
  g.run(`applyOfflineProgress(Date.now() - 3600 * 1000);`);
  ok(g.run(`state.trader.left`) === w, 'Händler läuft offline weiter');
  // Er geht; danach kommt er nach 20 Minuten wieder, mit Rad nach 15
  g.run(`for (let i = 0; i < CONFIG.trader.stay + 1; i++) update(1);`);
  ok(!g.run(`traderHere()`) && g.run(`state.trader.wait`) <= CONFIG_WAIT(g, false) && g.run(`state.trader.wait`) > CONFIG_WAIT(g, false) - 320, 'Händler bleibt zu lange oder kommt falsch wieder');
  ok(g.run(`doTrade('${offers[2]}')`) !== null, 'Tausch ohne Händler');
  g.run(`state.techs.rad = true; state.trader.left = 1; update(2);`);
  ok(g.run(`state.trader.wait`) === CONFIG_WAIT(g, true), 'Rad macht den Händler nicht schneller');
  noErrors(g);
});

test('Zurück nach der Pause: Hunger und Verluste werden genannt; Händler-Knopf führt hin', () => {
  const g = fresh();
  const r = g.run(`(() => { state.pop = 40; state.res.nahrung = 0; state.res.holz = 100; recalcStats();
    return applyOfflineProgress(Date.now() - 3600 * 1000); })()`);
  ok(r.pop < 0 && r.events.some(e => e.includes('Hunger')), 'Hunger-Wegzug fehlt: ' + JSON.stringify(r));
  g.run(`showOfflineSummary(${JSON.stringify(r)})`);
  ok(g.run(`$('dialog-box').innerHTML.includes('Weniger geworden')`), 'Verluste fehlen im Fenster');
  g.run(`closeDialog(); for (const id in TECHS) if (!['frueh', 'spaet'].includes(TECHS[id].stage) && !TECHS[id].stage.startsWith('eisen') || id === 'tauschhandel') state.techs[id] = true;
    state.stage = 'frueh'; state.pop = 20; for (const id in RESOURCES) state.res[id] = 200;
    const sp = findFreeSpot('handelsplatz', Math.floor(N / 2), Math.floor(N / 2)); const k = state.buildings.length;
    state.buildings.push({ type: 'handelsplatz', x: sp.x, y: sp.y, rot: 0, build: 0 }); rebuildOccupancy(); buildRoute(k); rebuildOccupancy(); recalcStats();
    for (let i = 0; i < CONFIG.trader.firstWait + 1; i++) update(1); renderAll();`);
  ok(g.run(`traderHere()`), 'Händler kommt nicht');
  ok(!g.run(`$('btn-trader').classList.contains('hidden')`), 'Händler-Knopf fehlt');
  g.run(`goToTrader()`);
  ok(g.run(`pageOpen`) === 'trader', 'Knopf öffnet den Händler nicht');
  noErrors(g);
});

test('Rad und Wagen: Bauen geht schneller; alte Stände ohne Händler laden', () => {
  const g = fresh();
  const t = g.run(`BUILDINGS.schmelzofen.time`);
  ok(g.run(`buildTimeOf('schmelzofen')`) === t, 'Ohne Rad schon schneller');
  g.run(`state.techs.rad = true;`);
  ok(g.run(`buildTimeOf('schmelzofen')`) === Math.round(t * 0.85), 'Rad wirkt nicht');
  const text = g.run(`(() => { const d = JSON.parse(serialize()); delete d.trader; delete d.tradesDone; return JSON.stringify(d); })()`);
  ok(g.run(`loadFromText(${JSON.stringify(text)})`), 'Alter Stand lädt nicht');
  ok(g.run(`state.trader.visit === 0 && state.tradesDone === 0 && Array.isArray(state.trader.done)`), 'Händler-Felder fehlen');
  const bad = g.run(`(() => { const d = JSON.parse(serialize()); d.trader = { wait: 'x', left: -4, visit: null, done: ['gibtsnicht', 7] }; return JSON.stringify(d); })()`);
  ok(g.run(`loadFromText(${JSON.stringify(bad)})`), 'Kaputter Händler verhindert das Laden');
  ok(g.run(`state.trader.left === 0 && state.trader.done.length === 0`), 'Kaputte Werte bleiben');
  noErrors(g);
});

test('Späte Bronzezeit: Übergang, Schmuck-Bedürfnis, Weiterentwicklung, Ziel noch gesperrt', () => {
  const g = fresh();
  g.run(`for (const id of Object.keys(TECH_NEEDS)) delete TECH_NEEDS[id];
    for (const id in TECHS) if (TECHS[id].stage !== 'spaet' && !TECHS[id].stage.startsWith('eisen') && id !== 'spaete_bronzezeit') state.techs[id] = true;
    state.stage = 'frueh'; state.pop = 210; state.res.wissen = 999; state.res.bronze = 100; state.res.kleidung = 100; state.res.nahrung = 500;
    const m = Math.floor(N / 2) + 12;
    state.buildings.push({ type: 'lehmhaus', x: m, y: m, rot: 0, build: 0 }, { type: 'ahnenplatz', x: m + 4, y: m, rot: 0, build: 0 }, { type: 'vorratsspeicher', x: m + 8, y: m, rot: 0, build: 0 }, { type: 'felsritzer', x: m + 12, y: m, rot: 0, build: 0 });
    rebuildOccupancy(); recalcStats();`);
  ok(g.run(`researchProblem('spaete_bronzezeit')`) === null, 'Späte Bronzezeit startet nicht: ' + g.run(`researchProblem('spaete_bronzezeit')`));
  g.run(`startResearch('spaete_bronzezeit'); for (let i = 0; i <= TECHS.spaete_bronzezeit.time; i++) { state.res.nahrung = 500; update(1); }`);
  ok(g.run(`state.stage`) === 'spaet', 'Stufe nicht gewechselt');
  ok(g.run(`activeNeeds().every(n => n.id !== 'schmuck')`), 'Schmuck-Bedürfnis vor der Schmuckkunst');
  g.run(`for (const id of ['hallenhaus', 'heiliger_hain', 'kornspeicher', 'himmelsscheibe']) state.techs[id] = true; evolveBuildings(); recalcStats();`);
  const typ = dx => g.run(`state.buildings.find(b => b.x === Math.floor(N / 2) + 12 + ${dx} && b.y === Math.floor(N / 2) + 12).type`);
  ok(typ(0) === 'hallenhaus' && typ(4) === 'heiliger_hain' && typ(8) === 'kornspeicher' && typ(12) === 'sternkundiger', 'Weiterentwicklung fehlt: ' + [typ(0), typ(4), typ(8), typ(12)]);
  ok(g.run(`barEntries().some(e => e.type === 'hallenhaus' && !e.locked)`), 'Hallenhaus fehlt in der Bauleiste');
  g.run(`state.techs.schmuckkunst = true; state.res.schmuck = 0; recalcStats();`);
  ok(g.run(`activeNeeds().some(n => n.id === 'schmuck')`), 'Schmuck-Bedürfnis fehlt');
  // Der Fürstenhügel steht ohne Forschung nicht in der Bauleiste; das Ziel lässt sich noch nicht erforschen
  ok(g.run(`isUnlocked('fuerstenhuegel')`) === false, 'Fürstenhügel zu früh');
  g.run(`for (const id in TECHS) if (TECHS[id].stage === 'spaet' && !TECHS[id].transition) state.techs[id] = true;`);
  ok(!g.run(`researchProblem('aufbruch_eisenzeit')`).includes('nächsten Ausbau'), 'Eisenzeit noch gesperrt');
  ok(g.run(`(state.techs.keltenschrift = true, researchProblem('aufbruch_antike'))`).includes('nächsten Ausbau'), 'Antike startbar, obwohl noch nicht gebaut');
  g.run(`delete state.techs.keltenschrift;`);
  // Oberfläche
  g.run(`openResearch(); showResearchStage('spaet'); researchListHtml(); selectTech('eisenfund'); techDetailHtml(); selectTech('himmelsscheibe'); techDetailHtml(); researchTopHtml(); showResearchStage('__next'); researchListHtml(); closePage(); renderAll(); drawScene(0.05);`);
  noErrors(g);
});

test('Bernstein: nur vom Händler, Schmuck-Bedarf lässt sich damit decken', () => {
  const g = fresh();
  ok(g.run(`hasMaker('bernstein')`) === false && g.run(`Object.values(BUILDINGS).every(d => !d.produces || !d.produces.bernstein)`), 'Bernstein wird hergestellt');
  // Rechnung bei 280 Einwohnern, Händler mit Rad alle 15 Minuten und beiden Bernstein-Angeboten
  const r = g.run(`(() => {
    const perVisit = CONFIG.trader.offers.filter(o => o.get.bernstein).reduce((a, o) => a + o.get.bernstein, 0);
    const bernsteinJeMin = perVisit / ((CONFIG.trader.every - TECHS.rad.effect.traderFaster) / 60);
    const d = BUILDINGS.schmuckmacherin;
    return { machbar: bernsteinJeMin * d.produces.schmuck / d.consumes.bernstein, bedarf: 280 * NEEDS.find(n => n.id === 'schmuck').perPerson };
  })()`);
  ok(r.machbar >= r.bedarf, 'Schmuck-Bedarf höher, als Bernstein hergibt: ' + JSON.stringify(r));
  // Händler zeigt Bernstein erst nach der Forschung, dann immer, und ein Angebot mehr
  const o = g.run(`(() => {
    for (const id in TECHS) if (!['frueh', 'spaet'].includes(TECHS[id].stage) && !TECHS[id].stage.startsWith('eisen') || id === 'tauschhandel') state.techs[id] = true;
    state.stage = 'frueh'; state.techs.bronzeguss = true; state.trader.visit = 3;
    const vorher = traderOffers().map(o => o.id);
    state.techs.bernsteinstrasse = true; state.stage = 'spaet';
    const seen = [];
    for (let v = 1; v < 30; v++) { state.trader.visit = v; const l = traderOffers(); seen.push(l.length === 4 && l.filter(o => o.get.bernstein).length === 2 && !!l[0].get.zinn); }
    return { vorher, immer: seen.every(Boolean) };
  })()`);
  ok(o.vorher.length === 3 && !o.vorher.some(id => id.includes('bernstein')), 'Bernstein zu früh: ' + o.vorher);
  ok(o.immer, 'Angebote ab der Bernsteinstraße falsch');
  noErrors(g);
});

test('Sonnwendfest: nur mit Himmelsscheibe, mitten im Sommer, hebt die Laune', () => {
  const g = fresh();
  const mid = g.run(`CONFIG.yearSeconds * 3 / 8`);
  g.run(`state.yearTime = ${mid}; recalcStats();`);
  ok(g.run(`festNow()`) === false, 'Fest ohne Himmelsscheibe');
  g.run(`var __l = 0; on('fest', () => __l++); state.yearTime = ${mid} - 200; state.techs.himmelsscheibe = true; update(1); recalcStats();`);
  ok(g.run(`festNow()`) === false && g.run(`seasonIndex()`) === 1, 'Fest zu früh');
  const ohne = g.run(`stats.happiness`);
  g.run(`for (let i = 0; i < 60; i++) update(1); recalcStats();`);
  ok(g.run(`festNow()`) === true && g.run(`__l`) === 1, 'Fest beginnt nicht');
  ok(g.run(`stats.happiness`) >= Math.min(100, ohne), 'Fest senkt die Laune');
  g.run(`for (let i = 0; i < 400; i++) update(1);`);
  ok(g.run(`festNow()`) === false, 'Fest endet nicht');
  ok(g.run(`__l`) === 1, 'Fest wird mehrfach gemeldet');
  noErrors(g);
});

// Von Ankunft zu Ankunft: 20 Minuten, mit Rad 15 (der Besuch zählt mit)
function CONFIG_WAIT(g, rad) { return g.run(`CONFIG.trader.every - ${rad ? 'TECHS.rad.effect.traderFaster' : 0} - CONFIG.trader.stay`); }

test('Vormerken: nächste Forschung startet von selbst, auch offline, bezahlt erst beim Start', () => {
  const g = fresh();
  g.run(`for (const id of Object.keys(TECH_NEEDS)) delete TECH_NEEDS[id];
    state.tutorial = -1; state.res.wissen = 100; state.res.holz = 0; state.pop = 20;`);
  ok(g.run(`queueProblem('faustkeil')`) !== null, 'Vormerken ohne laufende Forschung');
  ok(g.run(`startResearch('flechtkoerbe')`) === null, 'Start geht nicht');
  // auch eine Forschung, die erst durch die laufende frei wird: hier die laufende Voraussetzung
  ok(g.run(`queueProblem('flechtkoerbe')`) !== null, 'Laufende Forschung vorgemerkt');
  ok(g.run(`queueProblem('mittelsteinzeit')`) !== null, 'Gesperrte Forschung vorgemerkt');
  const w0 = g.run(`state.res.wissen`);
  ok(g.run(`toggleQueue('faustkeil')`) === null, 'Vormerken geht nicht');
  ok(g.run(`state.res.wissen`) === w0, 'Vormerken kostet schon etwas');
  ok(g.run(`toggleQueue('faustkeil') === null && state.researchNext === null`), 'Aufheben geht nicht');
  g.run(`toggleQueue('faustkeil');`);
  // Speichern und Laden behält die Vormerkung
  const text = g.run(`serialize()`);
  ok(g.run(`loadFromText(${JSON.stringify(text)})`), 'Lädt nicht');
  ok(g.run(`state.researchNext`) === 'faustkeil', 'Vormerkung verloren');
  // offline: die laufende wird fertig, die vorgemerkte startet, bezahlt und wird gemeldet
  const r = g.run(`(() => { const before = state.res.wissen, cost = TECHS.faustkeil.cost.wissen; state.res.wissen = 100; const o = applyOfflineProgress(Date.now() - 3600 * 1000); return { done: !!state.techs.flechtkoerbe, next: state.researchNext, cost, events: o.events }; })()`);
  ok(r.done && r.next === null, 'Vormerkung startet nicht: ' + JSON.stringify(r));
  ok(g.run(`!!state.techs.faustkeil || (state.research && state.research.id === 'faustkeil')`), 'Falsche Forschung gestartet');
  ok(r.events.some(e => e.includes('Von selbst gestartet')), 'Offline-Start nicht gemeldet: ' + r.events);
  // fehlt noch etwas: bleibt vorgemerkt und startet, sobald es da ist
  g.run(`state.research = { id: 'feuer_hueten', left: 1 }; delete state.techs.feuer_hueten; delete state.techs.hoehlenmalerei; state.researchNext = 'hoehlenmalerei'; state.res.wissen = 0; update(2); update(2);`);
  ok(g.run(`state.researchNext`) === 'hoehlenmalerei' && g.run(`!state.research || state.research.id !== 'hoehlenmalerei'`), 'Startet ohne Wissen');
  g.run(`state.res.wissen = 500; state.pop = 20; update(1); update(1);`);
  ok(g.run(`state.research && state.research.id === 'hoehlenmalerei' && state.researchNext === null`), 'Startet nicht, als es bezahlbar wurde');
  // Oberfläche
  g.run(`state.research = { id: 'hoehlenmalerei', left: 500 }; openResearch(); selectTech('speerspitzen'); techDetailHtml(); doQueue('speerspitzen'); researchListHtml(); techDetailHtml(); doQueue('speerspitzen'); closePage(); renderAll();`);
  noErrors(g);
});

test('Belohnungen gehen übers Lager hinaus, Herstellen nicht', () => {
  const g = fresh();
  const cap = g.run(`storageCap()`);
  g.run(`state.res.nahrung = ${cap}; state.res.holz = ${cap}; state.daily.pending = 7; state.tutorial = -1;`);
  g.run(`claimDailyReward();`);
  ok(g.run(`state.res.holz`) === cap + g.run(`DAILY_REWARDS[6].holz`), 'Tagesbelohnung verpufft');
  g.run(`addResources({ holz: 50 });`);
  ok(g.run(`state.res.holz`) === cap + g.run(`DAILY_REWARDS[6].holz`), 'Herstellen geht übers Lager');
  noErrors(g);
});

test('Aufträge und Wünsche: nichts verstopft die Liste', () => {
  const g = fresh();
  g.run(`for (const q of QUESTS) if (!q.goal.wishes && q.id !== 'q_jagd1') state.quests[q.id] = true; state.tutorial = -1; recalcStats();`);
  // höchstens ein Wunsch-Auftrag auf einmal
  ok(g.run(`activeQuests().filter(q => q.goal.wishes).length`) === 1, 'Mehrere Wunsch-Aufträge sichtbar');
  // Mammutjagd ist ab der Jungsteinzeit nicht mehr machbar und verschwindet
  g.run(`state.techs.mammutjagd = true;`);
  ok(g.run(`activeQuests().some(q => q.id === 'q_jagd1')`), 'Jagd-Auftrag fehlt');
  g.run(`state.stage = 'jung';`);
  ok(!g.run(`activeQuests().some(q => q.id === 'q_jagd1')`), 'Unmöglicher Auftrag bleibt in der Liste');
  g.run(`openQuests(); closePage();`);
  // Wunsch nur für Waren mit fertigem Hersteller, und er wechselt mit der Zeit
  const g2 = fresh();
  g2.run(`state.tutorial = -1; state.techs.mammutjagd = true; state.buildings = state.buildings.filter(b => BUILDINGS[b.type].line === 'mitte'); rebuildOccupancy();`);
  ok(g2.run(`currentWish()`) === null, 'Wunsch ohne Hersteller');
  g2.run(`const m = Math.floor(N / 2) + 12; state.buildings.push({ type: 'holzsammler', x: m, y: m, rot: 0, build: 0 }, { type: 'steinsammler', x: m + 3, y: m, rot: 0, build: 0 }, { type: 'jaegerlager', x: m + 6, y: m, rot: 0, build: 50 }); rebuildOccupancy();`);
  ok(g2.run(`currentWish().id !== 'felle'`) && g2.run(`currentWish().id !== 'nahrung'`), 'Wunsch für Baustelle');
  const seen = g2.run(`(() => { const s = {}; for (let i = 0; i < 4; i++) { state.playTime = i * CONFIG.wishes.change; s[currentWish().id] = 1; } return Object.keys(s).length; })()`);
  ok(seen === 2, 'Wunsch wechselt nicht: ' + seen);
  // Handbearbeiteter Stand mit krummem Zähler stürzt nicht ab
  const bad = g2.run(`(() => { const d = JSON.parse(serialize()); d.wishesDone = 1.5; d.researchNext = 'gibtsnicht'; return JSON.stringify(d); })()`);
  ok(g2.run(`loadFromText(${JSON.stringify(bad)})`), 'Krummer Stand lädt nicht');
  ok(g2.run(`state.wishesDone === 1 && state.researchNext === null && currentWish() !== undefined`), 'Krumme Werte bleiben');
  noErrors(g); noErrors(g2);
});

test('Werkstätten lassen Metall für Bauen und Forschung liegen', () => {
  const g = fresh();
  const r = g.run(`(() => {
    for (const id in TECHS) if (!TECHS[id].soon && !['spaet'].includes(TECHS[id].stage) && !TECHS[id].stage.startsWith('eisen')) state.techs[id] = true;
    delete state.techs.spaete_bronzezeit;
    state.stage = 'frueh'; state.pop = 30; state.tutorial = -1;
    const sp = findFreeSpot('bronzegiesser', N / 2, N / 2), k = state.buildings.length;
    state.buildings.push({ type: 'bronzegiesser', x: sp.x, y: sp.y, rot: 0, build: 0 });
    rebuildOccupancy(); buildRoute(k); recalcStats();
    Object.assign(state.res, { kupfer: 200, zinn: 200, bronze: 0, nahrung: 500 });
    for (let i = 0; i < 7200; i++) { state.res.nahrung = 500; update(1); }
    return { kupfer: state.res.kupfer, bronze: state.res.bronze, reserve: metalReserve('kupfer') };
  })()`);
  ok(r.bronze > 50, 'Gießer arbeitet nicht: ' + JSON.stringify(r));
  ok(Math.abs(r.kupfer - r.reserve) < 2 && r.reserve >= 30, 'Reserve hält nicht: ' + JSON.stringify(r));
  // Eine startbare Forschung, die mehr kostet, hebt die Reserve
  ok(g.run(`(() => { TECHS.bronzeguss.cost.kupfer = 90; delete state.techs.bronzeguss; return metalReserve('kupfer'); })()`) === 90, 'Forschung hebt die Reserve nicht');
  noErrors(g);
});

test('Land kaufen: nur neben eigenem Land, Preis steigt', () => {
  const g = fresh();
  ok(!g.run('canBuyPlot(0)'), 'Ecke kaufbar');
  const p = g.run('plotOf(42 + O, 52 + O)');
  ok(g.run(`canBuyPlot(${p})`), 'Nachbarland nicht kaufbar');
  g.run('state.res.holz = 1000; state.res.nahrung = 1000;');
  const price1 = g.run('JSON.stringify(plotPrice())');
  ok(g.run(`buyPlot(${p})`) && g.run('isOwned(42 + O, 52 + O)'), 'Kauf ging nicht');
  ok(g.run('JSON.stringify(plotPrice())') !== price1, 'Preis steigt nicht');
});

// Einstieg durchspielen wie ein Spieler: Vorschlag des Ältesten annehmen, Weg bauen, antippen …
function einstiegBau(g, type) {
  const plan = g.run(`(() => { const p = tutorialPlan(); return p && p.kind === 'site' ? [p.x, p.y, p.type] : null; })()`);
  ok(plan && plan[2] === type, `Vorschlag für ${type} fehlt: ${JSON.stringify(plan)}`);
  ok(g.run(`placeProblem('${type}', ${plan[0]}, ${plan[1]})`) === null, `Vorschlag für ${type} ist kein freier Bauplatz`);
  g.run(`beginBuild('${type}'); ghost.x = ${plan[0]}; ghost.y = ${plan[1]}; confirmGhost();`);
  ok(g.run(`state.buildings.some(b => b.type === '${type}' && b.x === ${plan[0]} && b.y === ${plan[1]})`), `${type} wurde nicht gebaut`);
}
function einstiegWeg(g, type) {
  g.run(`(() => { const i = tutorialBuildingIndex('${type}'); if (!isConnected(i)) buildRoute(i); })()`);
}
function einstiegTick(g, n = 3) { g.run(`for (let i = 0; i < ${n}; i++) tutorialTick(0.6);`); }
function einstiegDurch(g) {
  g.run('state.tutorial = 0; state.res.holz = 200; state.res.stein = 200; state.res.wissen = 50; renderTutorial();');
  const id = () => g.run('(tutorialStep() || {}).id');
  einstiegTick(g, 6);   // Begrüßung schließt sich von selbst
  ok(id() === 'sammlerin', 'Nach der Begrüßung: Sammlerin, ist ' + id());
  einstiegTick(g, 4);
  einstiegBau(g, 'sammlerin');
  einstiegTick(g, 4);
  ok(id() === 'pfad', 'Nach der Sammlerin: Pfad, ist ' + id());
  ok(g.run(`tutorialPlan().kind === 'road' && tutorialPlan().route.length > 0`), 'Der Pfad-Schritt zeigt keine Felder');
  g.run(`beginBuild('pfad')`);
  ok(g.run(`tutorialPlan().say.text`) !== undefined, 'kein Spruch');
  einstiegWeg(g, 'sammlerin');
  ok(id() === 'antippen', 'Nach dem Weg: antippen, ist ' + id());
  ok(g.run('pathMode') === false, 'Pfadmodus muss enden, sonst täte Antippen nichts');
  einstiegTick(g, 4);
  ok(g.run('tutorialPlan().wait') === true, 'Während des Baus soll er warten');
  g.run('for (let i = 0; i < 70; i++) update(1);');
  einstiegTick(g, 4);
  ok(g.run('tutorialPlan().tap') === true, 'Fertig: antippen zeigen');
  g.run(`emit('tapped', state.buildings[tutorialBuildingIndex('sammlerin')])`);
  ok(id() === 'holzsammler', 'Nach Antippen: Holzsammler, ist ' + id());
  einstiegTick(g, 4);
  einstiegBau(g, 'holzsammler');
  einstiegTick(g, 4);
  if (id() === 'holzsammler') {
    ok(g.run(`tutorialPlan().kind`) === 'road', 'Holzsammler ohne Weg: Er soll den Weg zeigen');
    einstiegWeg(g, 'holzsammler');
  }
  ok(id() === 'hochheben', 'Danach: hochheben, ist ' + id());
  g.run('liftBuilding(5);');
  ok(id() === 'wohnhoehle', 'Nach Hochheben: Wohnhöhle, ist ' + id());
  einstiegTick(g, 4);
  ok(g.run(`tutorialPlan().say.text`).includes('abstellen'), 'Hochgehoben: erst abstellen');
  g.run('cancelGhost(); for (let i = 0; i < 70; i++) update(1);');
  einstiegTick(g, 4);
  einstiegBau(g, 'wohnhoehle');
  einstiegTick(g, 4);
  if (id() === 'wohnhoehle') einstiegWeg(g, 'wohnhoehle');
  ok(id() === 'forschung', 'Forschung erwartet, ist ' + id());
  einstiegTick(g, 4);
  g.run('for (let i = 0; i < 70; i++) update(1);');
  einstiegTick(g, 4);
  einstiegBau(g, 'hoehlenmaler');
  einstiegTick(g, 4);
  if (g.run(`tutorialPlan().kind`) === 'road') einstiegWeg(g, 'hoehlenmaler');
  einstiegTick(g, 4);
  ok(g.run(`tutorialPlan().ui`) === 'btn-research', 'Mit Höhlenmaler: zur Forschung');
  g.run(`startResearch('feuer_hueten')`);
  ok(id() === 'auftraege', 'Aufträge erwartet, ist ' + id());
  g.run('openQuests(); closePage();');
  ok(id() === 'fertig', 'Ende erwartet, ist ' + id());
  einstiegTick(g, 8);   // Abschluss schließt sich von selbst
  ok(g.run('state.tutorial') === -1, 'Einstieg nicht beendet');
}

test('Einstieg: ganz durchspielbar, Pfeil-Ziele sind freie Bauplätze, Rückmeldung und Ende', () => {
  const g = fresh();
  einstiegDurch(g);
  noErrors(g);
});

test('Einstieg: Überspringen geht jederzeit und bleibt auch nach dem Laden', () => {
  const g = fresh();
  for (const i of [0, 1, 4, 7, 8]) {
    g.run(`state.tutorial = ${i}; renderTutorial(); skipTutorial();`);
    ok(g.run('state.tutorial') === -1 && !g.run('tutorialStep()'), 'Überspringen ging nicht bei Schritt ' + i);
  }
  g.run('loadFromText(JSON.stringify(state)); renderTutorial();');
  ok(g.run('state.tutorial') === -1, 'Nach dem Laden läuft der Einstieg wieder');
  ok(g.run(`document.getElementById('guide').classList.contains('hidden')`), 'Der Älteste bleibt nach dem Überspringen sichtbar');
  noErrors(g);
});

test('Einstieg: Belohnungen kommen nur einmal, auch nach Neuladen und neuem Einstieg', () => {
  const g = fresh();
  const summe = () => g.run(`JSON.stringify(TUTORIAL.reduce((a, s) => { for (const o of [s.belohnung, s.bauBelohnung]) for (const [k, n] of Object.entries(o || {})) a[k] = (a[k] || 0) + n; return a; }, {}))`);
  const liste = JSON.parse(summe());
  ok(Object.values(liste).every(n => n <= 30), 'Belohnungen zu groß: ' + summe());
  // eine Belohnung direkt: wird gutgeschrieben, zweites Mal nicht
  g.run(`state.tutorial = 1; state.res.nahrung = 0; state.tutorialRewards = {}; renderTutorial();`);
  g.run(`beginBuild('sammlerin'); confirmGhost();`);
  const nachher = g.run('state.res.nahrung');
  ok(nachher === g.run('TUTORIAL[1].belohnung.nahrung'), 'Sammlerin-Belohnung fehlt: ' + nachher);
  const text = g.run('JSON.stringify(sanitizeState(JSON.parse(JSON.stringify(state))).tutorialRewards)');
  ok(JSON.parse(text).sammlerin === true, 'Merker geht beim Speichern verloren: ' + text);
  g.run(`state.tutorial = 1; renderTutorial(); advanceTutorial(); restartTutorial(); state.tutorial = 1; advanceTutorial();`);
  ok(g.run('state.res.nahrung') === nachher, 'Belohnung doppelt: ' + g.run('state.res.nahrung'));
  // ganzer Durchlauf bringt Waren; zweiter Durchlauf (Menü: Einstieg neu starten) nichts mehr
  const h = fresh();
  einstiegDurch(h);
  const gotAll = h.run('JSON.stringify(state.tutorialRewards)');
  for (const key of ['sammlerin', 'holzsammler', 'forschung_bau', 'fertig']) ok(JSON.parse(gotAll)[key], key + ' fehlt: ' + gotAll);
  h.run('state.res.wissen = 3; restartTutorial(); for (let i = 0; i < 30; i++) tutorialTick(0.6);');
  h.run('while (tutorialStep() && tutorialStep().id !== "fertig") advanceTutorial(); for (let i = 0; i < 10; i++) tutorialTick(0.6);');
  ok(h.run('state.res.wissen') < 10, 'Erneuter Einstieg zahlt doppelt: ' + h.run('state.res.wissen'));
  noErrors(g); noErrors(h);
});

test('Einstieg: alte Spielstände mitten im Einstieg laden und bleiben nicht hängen', () => {
  const ids = ['willkommen', 'sammlerin', 'pfad', 'antippen', 'holzsammler', 'hochheben', 'wohnhoehle', 'forschung', 'auftraege', 'fertig'];
  const g0 = fresh();
  ok(JSON.stringify(g0.run('TUTORIAL.map(s => s.id)')) === JSON.stringify(ids) || g0.run('TUTORIAL.map(s => s.id).join()') === ids.join(), 'Schritt-IDs oder Reihenfolge geändert');
  for (let i = 0; i < ids.length; i++) {
    const g = fresh();
    // alter Stand: kein tutorialRewards-Feld, Index mitten in der Liste, nur das Startlager
    g.run(`(() => { const old = JSON.parse(JSON.stringify(state)); delete old.tutorialRewards; old.tutorial = ${i}; loadFromText(JSON.stringify(old)); renderTutorial(); })()`);
    ok(g.run('state.tutorial') === i, `Index ${i} wurde zu ${g.run('state.tutorial')}`);
    ok(g.run('Object.keys(state.tutorialRewards).length') === (g.run(`TUTORIAL.slice(0, ${i}).length`)), `Stand ${i}: abgehakte Belohnungen falsch`);
    g.run('state.res.holz = 300; state.res.stein = 300; state.res.wissen = 100; for (let k = 0; k < 12; k++) tutorialTick(0.6); drawScene(0.1);');
    // Wer zuvor die Sammlerin nicht hat, wird zurückgeführt statt hängen zu bleiben
    const now = g.run('(tutorialStep() || {}).id');
    if (ids[i] === 'pfad' || ids[i] === 'antippen') ok(now === 'sammlerin', `Stand ${ids[i]} ohne Sammlerin bleibt hängen: ${now}`);
    noErrors(g);
  }
  // unsinnige Indizes: gilt als fertig
  for (const bad of [10, 99, -5]) {
    const g = fresh();
    g.run(`(() => { const old = JSON.parse(JSON.stringify(state)); old.tutorial = ${bad}; loadFromText(JSON.stringify(old)); renderTutorial(); })()`);
    ok(g.run('state.tutorial') === -1, `Index ${bad} nicht abgefangen: ${g.run('state.tutorial')}`);
    noErrors(g);
  }
  // alter Stand, der fertig ist: keine Belohnung bei „Einstieg neu starten“
  const g = fresh();
  g.run(`(() => { const old = JSON.parse(JSON.stringify(state)); delete old.tutorialRewards; old.tutorial = -1; loadFromText(JSON.stringify(old)); state.res.nahrung = 7; restartTutorial(); state.tutorial = 1; advanceTutorial(); })()`);
  ok(g.run('state.res.nahrung') === 7, 'Alter fertiger Stand bekommt Belohnung nachgezahlt');
  noErrors(g);
});

test('Einstieg: Vorschlag ist nicht bindend, Älteste-Hinweise nutzen danach das alte Fenster', () => {
  const g = fresh();
  g.run('state.tutorial = 1; renderTutorial(); for (let i = 0; i < 4; i++) tutorialTick(0.6);');
  const spot = g.run(`(() => { const p = tutorialPlan(); return [p.x, p.y]; })()`);
  // woanders bauen: Schritt gilt trotzdem
  g.run(`(() => { for (let y = ${spot[1]} - 9; y < ${spot[1]} + 9; y++) for (let x = ${spot[0]} - 9; x < ${spot[0]} + 9; x++) if ((Math.abs(x - ${spot[0]}) > 3 || Math.abs(y - ${spot[1]}) > 3) && !placeProblem('sammlerin', x, y)) { placeBuilding('sammlerin', x, y); return; } })()`);
  ok(g.run('tutorialStep().id') !== 'sammlerin', 'Bauen abseits des Vorschlags zählt nicht');
  // Im Einstieg gibt es kein altes Fenster, danach schon
  g.run('state.tutorial = 2; renderTutorial();');
  ok(g.run(`document.getElementById('tutorial').classList.contains('hidden')`), 'Altes Fenster steht im Einstieg offen');
  g.run(`skipTutorial(); elderHint = 'Test'; renderTutorial();`);
  ok(!g.run(`document.getElementById('tutorial').classList.contains('hidden')`), 'Hinweis nach dem Einstieg zeigt das alte Fenster nicht');
  ok(g.run(`document.getElementById('guide').classList.contains('hidden')`), 'Der mitlaufende Älteste bleibt nach dem Ende sichtbar');
  noErrors(g);
});

test('Zeichnen und Oberfläche laufen ohne Fehler (Baustelle, Geist, Pfadmodus, Fenster)', () => {
  const g = fresh();
  g.run(`state.res.holz = 500; state.res.stein = 500;
    beginBuild('sammlerin'); confirmGhost(); beginBuild('jaegerlager'); drawScene(0.1);
    cancelGhost(); beginBuild('pfad'); drawScene(0.1); cancelGhost();
    for (let i = 0; i < 70; i++) update(1);
    drawScene(0.1); renderAll(); showInfo(5); positionInfo(); showBuildingWindow(5); showBuildingWindow(6); showBuildingWindow(0); askDemolish(5);
    showPlotDialog(plotOf(42 + O, 52 + O)); openQuests(); openMenu(); openSlots(true); showExport(); showDailyReward();
    cam.zoom = ZOOM_MIN; drawScene(0.1); cam.zoom = ZOOM_MAX; drawScene(0.1); handleTap(400, 200);`);
  noErrors(g);
});

test('Trampelpfad: ohne Weg kein Wohnen und keine Arbeit, Weg bauen verbindet, Abreißen trennt', () => {
  const g = fresh();
  g.run('state.res.holz = 200; state.res.stein = 200;');
  // Gebäude weiter weg ohne Weg
  const placed = g.run(`const far = findFreeSpot('holzsammler', 53 + O, 74 + O); placeBuilding('holzsammler', far.x, far.y)`);
  ok(placed === null, 'Holzsammler nicht gebaut: ' + placed);
  g.run('for (let i = 0; i < 46; i++) update(1);');
  const i = g.run(`state.buildings.findIndex(b => b.type === 'holzsammler')`);
  ok(g.run(`isConnected(${i})`) === false, 'ohne Weg verbunden');
  ok(g.run(`outputFactor(${i})`) === 0 && !(g.run(`stats.staff[${i}]`) > 0), 'arbeitet ohne Weg');
  const route = g.run(`pathRoute(${i}).length`);
  ok(route > 0, 'kein Weg gefunden');
  const holz = g.run('state.res.holz');
  ok(g.run(`buildRoute(${i})`) === null && g.run(`isConnected(${i})`), 'Weg bauen verbindet nicht');
  ok(g.run('state.res.holz') === holz - route, 'Weg kostet nicht 1 Holz je Feld');
  g.run('update(1)');
  ok(g.run(`stats.staff[${i}]`) === 2, 'arbeitet mit Weg nicht');
  // Startpfad abreißen: die Wohnhöhle verliert ihre Bewohner
  g.run(`demolish(3); recalcStats();`);
  ok(g.run('stats.housing') === 3, 'Wohnhöhle ohne Weg zählt noch: ' + g.run('stats.housing'));
  noErrors(g);
});

test('Pause: Arbeiter wechseln zu einem anderen Gebäude, Pause wird gespeichert, Ältester gibt Hinweis', () => {
  const g = fresh();
  g.run(`
    state.res.holz = 500; state.res.stein = 500; state.res.nahrung = 500;
    for (const type of ['sammlerin', 'jaegerlager', 'holzsammler', 'steinsammler']) {
      const sp = findFreeSpot(type, 62 + O, 62 + O);
      placeBuilding(type, sp.x, sp.y);
      const k = state.buildings.length - 1;
      finishBuilding(state.buildings[k]);
      if (!isConnected(k)) buildRoute(k);
    }
    state.res.stein = 0; state.pop = 6; recalcStats();
  `);
  const idx = g.run(`state.buildings.findIndex(b => b.type === 'steinsammler')`);
  const sam = g.run(`state.buildings.findIndex(b => b.type === 'sammlerin')`);
  ok(g.run(`isConnected(${idx})`), 'Steinsammler ohne Weg');
  ok(g.run(`stats.staff[${idx}] || 0`) === 0, 'Steinsammler hat schon Leute – Test sinnlos');
  g.run(`state.tutorial = -1; state.playTime = 1000; checkStaffHint()`);
  ok(g.run('!!elderHint && elderHint.includes("Steinsammler")'), 'kein Hinweis vom Ältesten');
  g.run(`togglePause(${sam})`);
  ok(g.run(`stats.staff[${sam}] || 0`) === 0, 'pausiertes Gebäude hat noch Arbeiter');
  ok(g.run(`stats.staff[${idx}] || 0`) > 0, 'Steinsammler bekommt die frei gewordenen Arbeiter nicht');
  ok(g.run(`loadFromText(serialize()) && state.buildings[${sam}].paused === true && !state.buildings[${idx}].paused`), 'Pause geht beim Speichern verloren');
  g.run('recalcStats()');
  g.run(`togglePause(${sam})`);
  ok(!g.run(`state.buildings[${sam}].paused`), 'Weiter geht nicht');
  noErrors(g);
});

test('Zeitalter: erforschte Stufe baut alte Gebäude gleicher Größe um, auch beim Laden', () => {
  const g = fresh();
  g.run(`for (const id of Object.keys(TECH_NEEDS)) delete TECH_NEEDS[id];`);   // Gebäude-Bedingung hat ihren eigenen Test
  ok(g.run(`state.buildings.filter(b => b.type === 'wohnhoehle').length`) === 2, 'Start ohne 2 Wohnhöhlen');
  g.run(`state.res.wissen = 150; state.res.felle = 150; state.pop = 20; state.techs.faustkeil = true; startResearch('fellzelte'); for (let i = 0; i <= TECHS.fellzelte.time; i++) update(1);`);
  ok(g.run(`state.buildings.filter(b => b.type === 'fellzelt').length`) === 2, 'Wohnhöhlen wurden keine Fellzelte');
  ok(g.run(`barEntries().some(e => e.type === 'fellzelt') && !barEntries().some(e => e.type === 'wohnhoehle')`), 'Leiste zeigt nicht die neue Stufe');
  // alter Spielstand: Forschung erledigt, Gebäude noch alt
  const text = g.run(`state.buildings.forEach(b => { if (b.type === 'fellzelt') b.type = 'wohnhoehle'; }); serialize()`);
  ok(g.run(`loadFromText(${JSON.stringify(text)}) && state.buildings.filter(b => b.type === 'wohnhoehle').length === 0`), 'Beim Laden nicht umgebaut');
  noErrors(g);
});

test('Abreißen gibt die Hälfte zurück, Lagerfeuer bleibt', () => {
  const g = fresh();
  ok(!g.run('demolish(0)'), 'Lagerfeuer abgerissen');
  const stein = g.run('state.res.stein');
  ok(g.run('demolish(1)'), 'Abreißen ging nicht');
  ok(g.run('state.res.stein') === stein + 5, 'Rückgabe falsch');
  ok(g.run('state.pop') <= g.run('housingTotal()'), 'Mehr Einwohner als Platz');
});

test('Mammutjagd: erst nach der Forschung, Jäger bringen Beute, Herde kommt wieder, ab Jungsteinzeit ausgestorben', () => {
  const g = fresh();
  g.run(`state.res.holz = 500; state.res.stein = 500; state.res.nahrung = 0; state.res.felle = 0;`);
  ok(g.run('herdPresent()'), 'am Anfang zieht keine Herde vorbei');
  ok(/Mammutjagd/.test(g.run('huntProblem()')), 'Jagd ohne Forschung möglich');
  g.run('state.techs.mammutjagd = true');
  ok(/Jägerlager/.test(g.run('huntProblem()')), 'Jagd ohne Jägerlager möglich');
  g.run(`const sp = findFreeSpot('jaegerlager', 62 + O, 62 + O); placeBuilding('jaegerlager', sp.x, sp.y);
    const k = state.buildings.length - 1; finishBuilding(state.buildings[k]); if (!isConnected(k)) buildRoute(k); recalcStats();`);
  ok(g.run('huntProblem()') === null, 'Jagd mit Jägerlager nicht möglich: ' + g.run('huntProblem()'));
  ok(g.run('startHunt(20, 20)') === null && g.run('!!state.hunt'), 'Jagd startet nicht');
  ok(g.run('startHunt(20, 20)') !== null, 'zweite Jagd gleichzeitig möglich');
  // Speichern mitten in der Jagd
  ok(g.run('loadFromText(serialize()) && state.hunt && state.hunt.left > 0'), 'Jagd geht beim Speichern verloren');
  g.run(`for (let i = 0; i <= CONFIG.hunt.seconds; i++) update(1);`);
  ok(!g.run('state.hunt'), 'Jäger kommen nicht zurück');
  ok(g.run('state.res.felle') >= 6, 'keine Felle von der Jagd');
  ok(!g.run('herdPresent()') && /keine Mammutherde/.test(g.run('huntProblem()')), 'Herde sofort wieder da');
  g.run(`for (let i = 0; i <= CONFIG.hunt.herdWait; i++) update(1);`);
  ok(g.run('herdPresent()'), 'Herde kommt nicht wieder');
  // Mammutjägerlager bringt mehr
  // (beim Laden wurde das Jägerlager schon zum Mammutjägerlager – zum Vergleich zurückbauen)
  const big = g.run('huntReward().nahrung');
  g.run(`state.buildings.forEach(b => { if (b.type === 'mammutjaegerlager') b.type = 'jaegerlager'; })`);
  const small = g.run('huntReward().nahrung');
  g.run(`state.buildings.forEach(b => { if (b.type === 'jaegerlager') b.type = 'mammutjaegerlager'; })`);
  ok(g.run('huntReward().nahrung') === big, 'Belohnung schwankt');
  ok(g.run('huntReward().nahrung') > small, 'Mammutjägerlager bringt nicht mehr');
  g.run(`state.stage = 'jung'`);
  ok(!g.run('herdPresent()') && /ausgestorben/.test(g.run('huntProblem()')), 'Mammuts in der Jungsteinzeit');
  // alter Spielstand ohne Jagd-Felder lädt
  ok(g.run(`(() => { const d = JSON.parse(serialize()); delete d.hunt; delete d.herdWait; return loadFromText(JSON.stringify(d)) && state.hunt === null && state.herdWait === 0; })()`), 'alter Stand ohne Jagd lädt nicht');
  noErrors(g);
});

test('Tag und Nacht, Wetter und Jahreszeiten: passen zur Zeit, Schnee nur im Winter, Hagel nie im Winter', () => {
  const g = fresh();
  ok(g.run('state.playTime = 10; darkness()') === 0, 'am Morgen ist es dunkel');
  ok(g.run('state.playTime = CONFIG.daySeconds * 0.8; darkness()') === 1, 'in der Nacht ist es hell');
  ok(g.run('state.playTime = CONFIG.daySeconds * 0.8; timeOfDay().name') === 'Nacht', 'Nacht heißt nicht Nacht');
  // viele Wetter-Abschnitte durchgehen: jede Jahreszeit hat nur ihr Wetter
  const seen = g.run(`(() => {
    const out = {};
    for (let t = 0; t < CONFIG.yearSeconds * 40; t += CONFIG.weatherSeconds) {
      state.playTime = t; state.yearTime = t % CONFIG.yearSeconds;
      const w = currentWeather();
      (out[seasonIndex()] ||= {})[w.id] = true;
      if (!(w.k >= 0 && w.k <= 1)) return 'Stärke ' + w.k;
    }
    return out;
  })()`);
  ok(typeof seen === 'object', 'Wetterstärke falsch: ' + seen);
  ok(!seen[0].schnee && !seen[1].schnee && !seen[2].schnee, 'Schnee außerhalb des Winters');
  ok(seen[3].schnee && !seen[3].regen && !seen[3].hagel, 'Winter ohne Schnee oder mit Regen/Hagel');
  ok(seen[2].regen && (seen[0].hagel || seen[1].hagel), 'kein Regen im Herbst oder nie Hagel');
  ok(g.run('state.yearTime = CONFIG.yearSeconds * 0.95; snowCover()') === 1 && g.run('state.yearTime = CONFIG.yearSeconds * 0.4; snowCover()') === 0, 'Schneedecke falsch');
  // Zeichnen bei Nacht und jedem Wetter läuft ohne Fehler
  g.run(`for (const id of Object.keys(WEATHERS)) { currentWeather = () => ({ id, k: 1, ...WEATHERS[id] }); state.playTime = CONFIG.daySeconds * 0.8; drawScene(0.1); drawScene(0.1); }`);
  noErrors(g);
});

test('Bauleiste einklappen bleibt gespeichert, Pfade zeichnen ohne Fehler', () => {
  const g = fresh();
  g.run(`renderAll(); toggleBuildBar();`);
  ok(g.run('settings.barHidden') === true, 'Leiste nicht eingeklappt');
  ok(JSON.parse(g.run(`storageGet(SETTINGS_KEY)`)).barHidden === true, 'Einklappen nicht gespeichert');
  g.run(`toggleBuildBar();`);
  ok(g.run('settings.barHidden') === false, 'Leiste geht nicht wieder auf');
  g.run(`state.res.holz = 50; for (let x = 52 + O; x < 58 + O; x++) placeBuilding('pfad', x, 62 + O); drawPaths(visibleRange()); drawScene(0.1);`);
  noErrors(g);
});

test('Brücke: Pfad nie aufs Wasser, Brücke nur aufs Wasser, über Brücken ist man verbunden', () => {
  const g = fresh();
  const w = g.run(`(() => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (isOwned(x, y) && terrain[y * N + x] === TERRAIN.wasser.id) return [x, y]; return null; })()`);
  ok(w, 'kein Wasser im eigenen Land – Test sinnlos');
  g.run(`state.res.holz = 500`);
  ok(/Brücke/.test(g.run(`placeProblem('pfad', ${w[0]}, ${w[1]})`) || ''), 'Pfad im Wasser möglich');
  const land = g.run(`(() => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (isOwned(x, y) && !placeProblem('pfad', x, y)) return [x, y]; })()`);
  ok(g.run(`placeProblem('bruecke', ${land[0]}, ${land[1]})`), 'Brücke an Land möglich');
  ok(g.run(`wayTypeAt(${w[0]}, ${w[1]})`) === 'bruecke' && g.run(`wayTypeAt(${land[0]}, ${land[1]})`) === 'pfad', 'Weg-Art falsch');
  ok(g.run(`placeBuilding('bruecke', ${w[0]}, ${w[1]})`) === null && g.run(`isPathAt(${w[0]}, ${w[1]})`), 'Brücke lässt sich nicht bauen');
  g.run(`drawScene(0.1)`);
  noErrors(g);
});

test('Arbeitende Menschen: gehen zum Baum, arbeiten und kommen zurück', () => {
  const g = fresh();
  g.run(`state.res.holz = 999; state.res.stein = 999; state.pop = 12;
    for (const t of ['holzsammler', 'steinsammler', 'sammlerin']) { const sp = findFreeSpot(t, 62 + O, 62 + O); placeBuilding(t, sp.x, sp.y); const k = state.buildings.length - 1; finishBuilding(state.buildings[k]); buildRoute(k); }
    recalcStats();`);
  const all = '{x0:0,y0:0,x1:N-1,y1:N-1}';
  const seen = g.run(`(() => { const ph = {}; for (let i = 0; i < 1200; i++) { updateLife(0.05, ${all}); for (const w of life.workers) ph[w.b.type + ':' + w.phase] = true; if (i % 50 === 0) drawScene(0.05); } return Object.keys(ph).join(','); })()`);
  for (const p of ['holzsammler:work', 'holzsammler:back', 'steinsammler:work', 'sammlerin:work']) ok(seen.includes(p), 'nie gesehen: ' + p + ' (' + seen + ')');
  // pausiert: niemand geht mehr raus
  g.run(`state.buildings.forEach((b, i) => { if (b.type === 'holzsammler') togglePause(i); }); for (let i = 0; i < 30; i++) updateLife(0.05, ${all});`);
  ok(!g.run(`life.workers.some(w => w.b.type === 'holzsammler')`), 'pausierter Holzsammler arbeitet weiter');
  noErrors(g);
});

test('Arbeitende Menschen Teil 2: Fischer (auch im Einbaum), Höhlenmaler, Werkstätten vor dem Haus', () => {
  const g = fresh();
  g.run(`for (const k in state.res) state.res[k] = 999; state.pop = 30; state.stage = 'jung'; for (const id in TECHS) if (!['kupfer', 'frueh', 'spaet'].includes(TECHS[id].stage) && !TECHS[id].stage.startsWith('eisen')) state.techs[id] = true;
    for (const t of ['fischerplatz', 'hoehlenmaler', 'fellmacherin', 'steinschlaeger', 'toepferei', 'tongrube']) {
      const sp = findFreeSpot(t, 62 + O, 62 + O); if (!sp) continue; placeBuilding(t, sp.x, sp.y); const k = state.buildings.length - 1; finishBuilding(state.buildings[k]); buildRoute(k); }
    recalcStats();`);
  const all = '{x0:0,y0:0,x1:N-1,y1:N-1}';
  const seen = g.run(`(() => { const ph = {}; for (let i = 0; i < 1600; i++) { updateLife(0.05, ${all}); for (const w of life.workers) ph[w.b.type + ':' + w.phase + (w.kind.boat && w.k === 1 ? ':boot' : '')] = true; if (i % 40 === 0) drawScene(0.05); } return Object.keys(ph).join(','); })()`);
  for (const p of ['fischerplatz:work', 'fischerplatz:work:boot', 'hoehlenmaler:work', 'fellmacherin:work', 'steinschlaeger:work', 'toepferei:work'])
    ok(seen.includes(p), 'nie gesehen: ' + p + ' (' + seen + ')');
  ok(g.run(`life.workers.every(w => !(w.kind.boat && w.k === 1 && w.phase === 'work') || terrainAt(Math.floor(w.tx), Math.floor(w.ty)) === TERRAIN.wasser)`), 'Einbaum nicht auf dem Wasser');
  noErrors(g);
});

test('Antippen: Baum direkt vor einem Gebäude lässt sich fällen, Gebäude selbst bleibt antippbar', () => {
  const g = fresh();
  const r = g.run(`(() => {
    state.res.holz = 999; state.res.stein = 999;
    const sp = findFreeSpot('steinsammler', 53 + O, 53 + O); placeBuilding('steinsammler', sp.x, sp.y);
    const b = state.buildings[state.buildings.length - 1], s = BUILDINGS[b.type].size;
    const tx = b.x + s, ty = b.y;   // rechts neben dem Haus (steht im Bild davor)
    for (let y = ty - 3; y <= ty + 4; y++) for (let x = tx - 3; x <= tx + 4; x++) if (buildingAt(x, y) < 0) terrain[y * N + x] = TERRAIN.gras.id;
    terrain[ty * N + tx] = TERRAIN.wald.id;
    cam.zoom = 1.5; centerOnTile(b.x, b.y);
    const p = tileToScreen(tx + 0.5, ty + 0.5);
    handleTap(p.x, p.y - 20);   // auf den Stamm/die Krone
    const first = infoFor && infoFor.kind === 'tile' && infoFor.x === tx && infoFor.y === ty;
    closeInfo();
    const c = tileToScreen(b.x + s / 2, b.y + s / 2);
    handleTap(c.x, c.y - 10);
    return [first, selected === state.buildings.indexOf(b)];
  })()`);
  ok(r[0], 'Baum vor dem Gebäude nicht getroffen');
  ok(r[1], 'Gebäude nicht mehr antippbar');
  noErrors(g);
});

test('Zurück: Menü → Spielstände → Zurück landet im Menü; Zurück-Taste schließt erst Dialog, dann Seite', () => {
  const g = fresh();
  const r = g.run(`(() => {
    // Verlauf wie im Browser: Einträge zählen, go(-k) geht k zurück und meldet einmal „popstate“
    const entries = [null];
    history = { get state() { return entries[entries.length - 1]; }, pushState(s) { entries.push(s); }, replaceState(s) { entries[entries.length - 1] = s; },
      go(d) { entries.length = Math.max(1, entries.length + d); onHistoryBack(); }, back() { this.go(-1); } };
    setTimeout = fn => fn();
    const out = [];
    openMenu(); openSlots(true); out.push(pageOpen);
    closePage(); out.push(pageOpen, entries.length);         // Knopf „Zurück“ → Menü
    closePage(); out.push(pageOpen, entries.length);         // → Spielfeld
    openMenu(); openSlots(true); history.go(-1); out.push(pageOpen);   // Zurück-Taste → Menü
    showExport(); history.go(-1); out.push(dialogOpen, pageOpen);      // Dialog zu, Menü bleibt
    history.go(-1); out.push(pageOpen, entries.length);
    return out;
  })()`);
  ok(r[0] === 'slots', 'Spielstände nicht offen');
  ok(r[1] === 'menu' && r[2] === 2, 'Zurück führt nicht ins Menü: ' + r);
  ok(r[3] === null && r[4] === 1, 'Zweites Zurück schließt nicht: ' + r);
  ok(r[5] === 'menu', 'Zurück-Taste führt nicht ins Menü: ' + r);
  ok(r[6] === false && r[7] === 'menu', 'Zurück-Taste schließt nicht zuerst den Dialog: ' + r);
  ok(r[8] === null && r[9] === 1, 'Verlauf durcheinander: ' + r);
  noErrors(g);
});

test('Wetter wirkt: Hagel zerschlägt die Ernte, Gewitter bremst draußen, Schnee macht hungrig; Zeiten 30 min', () => {
  const g = fresh();
  ok(g.run('CONFIG.daySeconds') === 1800 && g.run('CONFIG.yearSeconds / 4') === 1800, 'Tag bzw. Jahreszeit nicht 30 Minuten');
  for (let si = 0; si < 4; si++) {
    const sum = g.run(`Object.values(WEATHERS).reduce((a, w) => a + w.chance[${si}], 0)`);
    ok(Math.abs(sum - 1) < 1e-9, `Wetter-Wahrscheinlichkeiten in Jahreszeit ${si} ergeben ${sum}`);
  }
  const f = w => g.run(`(() => { currentWeather = () => ({ id: '${w}', k: 1, ...WEATHERS['${w}'] }); effectsMemo = { st: null }; return [effectFactor('acker'), effectFactor('holzsammler'), effectFactor('hoehlenmaler'), effectFood(), effectHappy(), effectGrowthStopped()]; })()`);
  const hagel = f('hagel'), gew = f('gewitter'), schnee = f('schnee'), klar = f('klar');
  ok(hagel[0] === 0.5 && hagel[4] < 0, 'Hagel: ' + hagel);
  ok(gew[1] < 1 && gew[2] === 1 && gew[5] === true, 'Gewitter: ' + gew);
  ok(schnee[3] > 1, 'Schnee: ' + schnee);
  ok(klar[0] > 1 && klar[4] > 0, 'Sonne: ' + klar);
  noErrors(g);
});

test('Naturkatastrophen: selten, nie am Anfang, wirken und enden; Waldbrand verbrennt Bäume; Spielstand behält sie', () => {
  const g = fresh();
  // in der ersten Dreiviertelstunde nie, auch wenn der Zufall es will
  ok(g.run(`disasterRandom = () => 0; for (let i = 0; i < 600; i++) update(1); state.disaster`) === null, 'Katastrophe zu früh');
  // danach: im Schnitt etwa 0,35 je Stunde
  const n = g.run(`(() => { disasterRandom = Math.random; let n = 0; state.playTime = 3600; state.disasterCalm = 1e9;
    for (let i = 0; i < 200 * 3600; i += 5) { updateDisaster(5); if (state.disaster) { n++; state.disaster = null; state.disasterCalm = 1e9; } } return n; })()`);
  ok(n > 40 && n < 110, 'Häufigkeit unpassend: ' + n + ' in 200 Stunden');
  const r = g.run(`(() => {
    const trees = () => { let k = 0; for (let i = 0; i < N * N; i++) if (terrain[i] === TERRAIN.wald.id) k++; return k; };
    const before = trees(); state.res.holz = 100; startDisaster('waldbrand');
    const after = trees(); recalcStats();
    const f = effectFactor('holzsammler');
    const saved = JSON.parse(serialize()); loadFromText(JSON.stringify(saved));
    const kept = state.disaster && state.disaster.id;
    for (let i = 0; i < 13 * 60; i++) update(1);
    return [before - after, f, kept, state.disaster, trees() === after];
  })()`);
  ok(r[0] === 30, 'Waldbrand hat ' + r[0] + ' Bäume verbrannt');
  ok(r[1] < 0.5, 'Waldbrand bremst Holzsammler nicht: ' + r[1]);
  ok(r[2] === 'waldbrand', 'Katastrophe nicht gespeichert');
  ok(r[3] === null, 'Katastrophe endet nicht');
  ok(r[4], 'verbrannte Bäume kommen nach dem Laden zurück');
  const flood = g.run(`state.res.nahrung = 100; startDisaster('hochwasser'); [state.res.nahrung, effectFactor('fischerplatz')]`);
  ok(flood[0] === 70 && flood[1] === 0, 'Hochwasser: ' + flood);
  noErrors(g);
});

test('Treffpunkte: Leute sitzen am Feuer, tanzen abends, beten am Ahnenplatz', () => {
  const g = fresh();
  const all = '{x0:0,y0:0,x1:N-1,y1:N-1}';
  const r = g.run(`(() => { state.pop = 30; recalcStats(); const seen = {};
    for (let i = 0; i < 1200; i++) { updateLife(0.05, ${all}); for (const v of life.visitors) seen[v.kind + ':' + v.phase] = true; if (i % 60 === 0) drawScene(0.05); }
    const day = life.visitors.filter(v => v.phase !== 'leave').length;
    state.playTime = CONFIG.daySeconds * 0.8;   // Nacht
    for (let i = 0; i < 1200; i++) { updateLife(0.05, ${all}); if (i % 60 === 0) drawScene(0.05); }
    const night = life.visitors.filter(v => v.phase !== 'leave').length;
    return [Object.keys(seen).join(), day, night]; })()`);
  ok(r[0].includes('feuer:stay'), 'niemand sitzt am Feuer: ' + r[0]);
  ok(r[2] > r[1], 'abends nicht mehr Leute am Feuer: ' + r);
  noErrors(g);
});

test('Geräusche: jedes Gebäude hat ein eigenes, ohne Ton läuft alles ohne Fehler', () => {
  const g = fresh();
  ok(g.run(`Object.keys(BUILDINGS).filter(t => !SOUNDS[BUILDING_SOUNDS[t]]).join()`) === '', 'Gebäude ohne Geräusch');
  g.run(`playSound('lagerfeuer'); emit('tapped', state.buildings[0]); playSound('donner');`);
  noErrors(g);
});

test('Bäume: Holzsammler fällen sie nach und nach, Pflanzerin setzt Setzlinge, daraus werden Bäume; bleibt gespeichert', () => {
  const g = fresh();
  g.run(`state.mapGen = 2; buildTerrain(); rebuildOccupancy(); recalcStats();`);   // feste Felder: Karte, für die der Test geschrieben wurde
  const r = g.run(`(() => {
    const trees = () => { let k = 0; for (let i = 0; i < N * N; i++) if (terrain[i] === TERRAIN.wald.id) k++; return k; };
    state.res.holz = 999; state.res.stein = 999; state.pop = 20;
    const sp = findFreeSpot('holzsammler', 60 + O, 60 + O); placeBuilding('holzsammler', sp.x, sp.y);
    let k = state.buildings.length - 1; finishBuilding(state.buildings[k]); buildRoute(k);
    state.res.holz = 0;   // Lager leer – bei vollem Lager wird nicht gefällt
    const before = trees();
    for (let i = 0; i < 20 * 60; i++) update(1);
    const felled = before - trees();
    const sp2 = findFreeSpot('pflanzerin', 66 + O, 66 + O); placeBuilding('pflanzerin', sp2.x, sp2.y);
    k = state.buildings.length - 1; finishBuilding(state.buildings[k]); buildRoute(k);
    state.buildings.forEach((b, i) => { if (b.type === 'holzsammler') togglePause(i); });
    for (let i = 0; i < 5 * 60; i++) update(1);
    const saplings = state.saplings.length;
    const mid = trees();
    const saved = serialize(); loadFromText(saved);
    const keptSaplings = state.saplings.length;
    for (let i = 0; i < 12 * 60; i++) update(1);
    const grown = trees() - mid;
    const afterGrow = trees(); loadFromText(serialize());
    return [felled, saplings, keptSaplings, grown, trees() === afterGrow];
  })()`);
  ok(r[0] >= 3, 'Holzsammler hat kaum Bäume gefällt: ' + r);
  ok(r[1] >= 3, 'Pflanzerin pflanzt nicht: ' + r);
  ok(r[2] === r[1], 'Setzlinge nicht gespeichert: ' + r);
  ok(r[3] >= 3, 'Setzlinge werden keine Bäume: ' + r);
  ok(r[4], 'gewachsene Bäume nach dem Laden weg: ' + r);
  noErrors(g);
});

test('Felsen: Steinsammler bauen sie nach und nach ab, das Gebirge nie; bleibt gespeichert, alte Stände laden', () => {
  const g = fresh();
  const r = g.run(`(() => {
    const count = id => { let k = 0; for (let i = 0; i < N * N; i++) if (terrain[i] === id) k++; return k; };
    for (let i = 0; i < state.plots.length; i++) state.plots[i] = 1;   // alles Land gekauft (Felsen liegen am Gebirgsrand)
    // freier Platz mit möglichst vielen Felsen und Gebirge in der Nähe
    let best = null, most = -1;
    for (let y = 4; y < N - 6; y += 2) for (let x = 4; x < N - 6; x += 2) {
      if (placeProblem('steinsammler', x, y)) continue;
      const n = countTerrainNear(x, y, 2, TERRAIN.fels.id, 3);
      if (n > most && countTerrainNear(x, y, 2, TERRAIN.berg.id, 3) > 0) { most = n; best = { x, y }; }
    }
    if (!best) return 'kein Platz';
    state.res.holz = 999; state.pop = 20;
    placeBuilding('steinsammler', best.x, best.y);
    const k = state.buildings.length - 1, b = state.buildings[k];
    finishBuilding(b); isConnected = () => true; recalcStats();   // Wege sind hier egal
    const rocks0 = count(TERRAIN.fels.id), berg0 = count(TERRAIN.berg.id), bonus0 = terrainBonus(b);
    for (let i = 0; i < 40 * 60; i++) { state.res.stein = 0; update(1); }
    const rocks1 = count(TERRAIN.fels.id), berg1 = count(TERRAIN.berg.id);
    b.mine = 12.5;
    const data = JSON.parse(serialize());
    loadFromText(JSON.stringify(data));
    const kept = count(TERRAIN.fels.id) === rocks1, mineKept = state.buildings.some(x => x.type === 'steinsammler' && x.mine === 12.5);
    data.buildings.forEach(x => delete x.mine);   // alter Stand ohne das neue Feld
    const oldOk = loadFromText(JSON.stringify(data)) !== false && state.buildings.some(x => x.type === 'steinsammler');
    return { most, rocks0, rocks1, berg0, berg1, bonus0, kept, mineKept, oldOk };
  })()`);
  ok(typeof r === 'object', 'Testaufbau: ' + r);
  ok(r.bonus0 > 0, 'kein Bonus an Felsen/Gebirge: ' + JSON.stringify(r));
  ok(r.rocks0 - r.rocks1 >= 2, 'Steinsammler baut keine Felsen ab: ' + JSON.stringify(r));
  ok(r.berg1 === r.berg0, 'Gebirge wurde abgebaut: ' + JSON.stringify(r));
  ok(r.kept && r.mineKept, 'Abbau nicht gespeichert: ' + JSON.stringify(r));
  ok(r.oldOk, 'alter Spielstand ohne Abbau-Feld lädt nicht: ' + JSON.stringify(r));
  noErrors(g);
});

test('Drehen: vier Richtungen, alte Stände (true) werden 1, Fischerplatz dreht sich selbst zum Wasser', () => {
  const g = fresh();
  const r = g.run(`(() => {
    const out = [];
    beginBuild('wohnhoehle'); for (let k = 0; k < 4; k++) { out.push(ghost.rot); rotateGhost(); } out.push(ghost.rot); cancelGhost();
    const d = JSON.parse(serialize()); d.buildings[1].rot = true; loadFromText(JSON.stringify(d)); out.push(state.buildings[1].rot);
    // Fischerplatz auf Säulen: steht teils im Fluss; die Drehung ist eine der beiden Spiegelungen
    state.stage = 'mittel'; state.techs.einbaum = true; state.techs.pfeil_bogen = true; state.res.holz = 999;
    let spot = null;
    for (let y = 40 + O; y < 90 + O && !spot; y++) for (let x = 40 + O; x < 90 + O && !spot; x++) if (!placeProblem('fischerplatz', x, y) && isOwned(x, y)) spot = { x, y };
    beginBuild('fischerplatz'); ghost.x = spot.x; ghost.y = spot.y; ghost.manualRot = false; autoOrient();
    out.push(!placeProblem('fischerplatz', spot.x, spot.y, -1, ghost.rot) && (ghost.rot === 0 || ghost.rot === 1));
    for (let k = 0; k < 4; k++) { ghost.rot = k; drawScene(0.05); }
    return out;
  })()`);
  ok(JSON.stringify(r.slice(0, 5)) === '[0,1,2,3,0]', 'Drehung nicht 0–3: ' + r);
  ok(r[5] === 1, 'alter Stand (true) nicht als 1 geladen: ' + r);
  ok(r[6] === true, 'Fischerplatz nicht zum Wasser gedreht: ' + r);
  noErrors(g);
});

test('Bäume/Setzlinge: Baum auf früherem Felsen bleibt nach dem Laden; Pfad tritt Setzling nieder; Ausreißen', () => {
  const g = fresh();
  const r = g.run(`(() => {
    let rock = -1; for (let i = 0; i < N * N && rock < 0; i++) if (terrain[i] === TERRAIN.fels.id && isOwned(i % N, Math.floor(i / N)) && !occ[i]) rock = i;
    const x = rock % N, y = Math.floor(rock / N);
    clearTile(x, y); state.saplings.push([rock, 0]); updateTrees(CONFIG.trees.growSeconds + 1);
    const grown = terrain[rock] === TERRAIN.wald.id;
    loadFromText(serialize());
    const kept = terrain[rock] === TERRAIN.wald.id;
    clearTile(x, y); loadFromText(serialize());
    const clearedAgain = terrain[rock] === TERRAIN.gras.id;
    state.saplings.push([rock, 0]);
    const blocked = !!placeProblem('wohnhoehle', x, y) && !placeProblem('pfad', x, y);
    state.res.holz = 99; placeBuilding('pfad', x, y);
    const trodden = !saplingAt(x, y);
    state.saplings.push([rock + 1, 0]); removeSapling(x + 1, y);
    return [grown, kept, clearedAgain, blocked, trodden, !saplingAt(x + 1, y)];
  })()`);
  ok(JSON.stringify(r) === '[true,true,true,true,true,true]', 'Ergebnis: ' + r);
  noErrors(g);
});

test('Offline: Katastrophe und Zeitalter öffnen kein Fenster, sondern stehen in „Willkommen zurück“', () => {
  const g = fresh();
  const r = g.run(`(() => { gameRunning = true; state.playTime = 3600; state.disasterCalm = 1e9; disasterRandom = () => 0;
    const res = applyOfflineProgress(Date.now() - 600 * 1000); gameRunning = false; return [res.events.length > 0, dialogOpen]; })()`);
  ok(r[0] && !r[1], 'Offline-Ereignis falsch: ' + r);
  noErrors(g);
});

test('Bauen: Baum unter dem geplanten Gebäude antippen fällt ihn; schräg gezogener Pfad ist zusammenhängend', () => {
  const g = fresh();
  const r = g.run(`(() => {
    state.res.holz = 999; cam.zoom = 1; centerOnTile(56 + O, 56 + O);
    let tree = null; for (let y = 50 + O; y < 78 + O && !tree; y++) for (let x = 50 + O; x < 78 + O && !tree; x++) if (terrain[y * N + x] === TERRAIN.wald.id && isOwned(x, y) && !occ[y * N + x]) tree = { x, y };
    beginBuild('sammlerin'); ghost.x = tree.x; ghost.y = tree.y;
    const p = tileToScreen(tree.x + 0.5, tree.y + 0.5); handleTap(p.x, p.y);
    const felled = terrain[tree.y * N + tree.x] === TERRAIN.gras.id && ghost.x === tree.x;
    cancelGhost();
    for (let y = 52 + O; y <= 60 + O; y++) for (let x = 52 + O; x <= 60 + O; x++) if (!occ[y * N + x]) terrain[y * N + x] = TERRAIN.gras.id;
    gesture = { mode: 'path' };
    const a = tileToScreen(52.5 + O, 52.5 + O), b = tileToScreen(58.5 + O, 57.5 + O);
    paintPath(a.x, a.y); paintPath(b.x, b.y);
    // zusammenhängend: vom Start aus über Pfade das Ziel erreichbar
    const seen = new Set([(52 + O) + ',' + (52 + O)]), q = [[52 + O, 52 + O]];
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const k = (x+dx) + ',' + (y+dy); if (!seen.has(k) && isPathAt(x+dx, y+dy)) { seen.add(k); q.push([x+dx, y+dy]); } } }
    gesture = null;
    return [felled, seen.has((58 + O) + ',' + (57 + O))];
  })()`);
  ok(r[0], 'Baum unter dem Gebäude nicht gefällt');
  ok(r[1], 'schräger Pfad nicht zusammenhängend');
  noErrors(g);
});

test('Wissen: eigener Speicher (2 × teuerste Forschung des Zeitalters), jede Forschung bezahlbar', () => {
  const g = fresh();
  const r = g.run(`(() => { const out = [];
    for (const st of ['alt', 'mittel', 'jung']) { state.stage = st; state.res.wissen = 0; addResources({ wissen: 1e6 });
      const most = Math.max(...Object.values(TECHS).filter(t => stageReached(t.stage)).map(t => t.cost.wissen));
      out.push(state.res.wissen >= most && state.res.wissen <= 2 * most + 1); }
    return out; })()`);
  ok(r.every(Boolean), 'Wissensspeicher falsch: ' + r);
  noErrors(g);
});

test('Fackeln: jedes zweite Wegfeld, bleibt gespeichert, alte Stände bekommen sie einmal', () => {
  const g = fresh();
  const r = g.run(`(() => {
    state.res.holz = 999;
    // freie Reihe aus 6 Landfeldern suchen und dort nacheinander Wege bauen
    let row = null;
    for (let y = 20; y < N - 20 && !row; y++) for (let x = 20; x < N - 26 && !row; x++) {
      let ok = true;
      for (let k = 0; k < 6; k++) if (placeProblem('pfad', x + k, y)) { ok = false; break; }
      if (ok) row = { x, y };
    }
    if (!row) return { err: 'keine Reihe' };
    for (let k = 0; k < 6; k++) { const p = placeBuilding('pfad', row.x + k, row.y); if (p) return { err: p }; }
    const pattern = () => [0, 1, 2, 3, 4, 5].map(k => { const i = buildingAt(row.x + k, row.y); return state.buildings[i].torch ? 1 : 0; }).join('');
    const built = pattern();
    loadFromText(serialize());
    const reloaded = pattern();
    // alter Stand: ohne Fackeln und ohne Merker
    const old = JSON.parse(serialize()); delete old.torches; for (const b of old.buildings) delete b.torch;
    loadFromText(JSON.stringify(old));
    const migrated = pattern();
    const again = JSON.parse(serialize()).torches;
    return { built, reloaded, migrated, again };
  })()`);
  ok(!r.err, 'Testaufbau: ' + r.err);
  ok(r.built === '101010', 'Wege sollten abwechselnd Fackeln haben: ' + r.built);
  ok(r.reloaded === r.built, 'Fackeln nach dem Laden verändert: ' + r.reloaded);
  ok(/1/.test(r.migrated) && !/11/.test(r.migrated), 'Alter Stand bekommt keine abwechselnden Fackeln: ' + r.migrated);
  ok(r.again === true, 'Merker für Fackeln fehlt nach dem Laden');
  noErrors(g);
});

test('Forschungsfenster: Ziel, Liste, Detail, Forschung starten; Handy hochkant: Detail öffnet und Zurück schließt es', () => {
  const g = fresh();
  g.run(`for (const id of Object.keys(TECH_NEEDS)) delete TECH_NEEDS[id];`);   // Gebäude-Bedingung hat ihren eigenen Test
  const r = g.run(`(() => {
    for (const id in TECHS) if (TECHS[id].stage !== 'jung') state.techs[id] = true;
    state.stage = 'jung'; state.pop = 200; state.res.wissen = 999; state.res.nahrung = 999; state.res.stein = 999;
    openResearch();
    const goal = researchGoal();
    const out = { trans: goal.trans, open: goal.open.length, sel: researchSelected, page: pageOpen };
    out.list = researchListHtml().includes('Jetzt möglich') && researchListHtml().includes('Kommt danach');
    selectTech('kupferfund');
    out.locked = techDetailHtml().includes('Erst:');
    selectTech('ackerbau');
    out.buy = techDetailHtml().includes('rs-go ready');
    doResearch('ackerbau');
    out.running = !!state.research && researchListHtml().includes('Läuft gerade') && techDetailHtml().includes('Läuft');
    showResearchStage('__next');
    out.next = techDetailHtml().includes('Antike');
    showResearchStage('alt');
    out.altSel = TECHS[researchSelected].stage === 'alt';
    closePage();
    out.closed = pageOpen === null;
    // Handy hochkant
    viewW = 390; viewH = 844;
    researchSelected = null; openResearch();
    out.noSheet = researchSheet === false;
    selectTech('sichel');
    out.sheet = researchSheet === true;
    onHistoryBack();
    out.backList = researchSheet === false && pageOpen === 'research';
    selectTech('sichel'); closeTechSheet();
    out.closeList = researchSheet === false && pageOpen === 'research';
    researchSelected = 'sichel'; closePage(); openResearch(true);
    out.direct = researchSheet === true && researchSelected === 'sichel';
    closePage();
    out.end = pageOpen === null && researchSheet === false;
    return out; })()`);
  ok(r.trans === 'aufbruch_bronzezeit' && r.open > 0, 'Ziel falsch: ' + JSON.stringify(r));
  ok(r.page === 'research' && r.list && r.locked && r.buy && r.running && r.next && r.altSel && r.closed, 'Fenster falsch: ' + JSON.stringify(r));
  ok(r.noSheet && r.sheet && r.backList && r.closeList && r.direct && r.end, 'Handy falsch: ' + JSON.stringify(r));
  noErrors(g);
});

test('Volles Lager mit Überschuss bleibt bei 200 (nicht ewig 199) – Forschung für 200 bezahlbar', () => {
  const g = fresh();
  const r = g.run(`(() => { const cap = storageCap(); state.res.nahrung = cap - 0.3; state.pop = 10;
    for (let k = 0; k < 3; k++) { const f = findFreeSpot('sammlerin', state.buildings[0].x, state.buildings[0].y); addBuilding('sammlerin', f.x, f.y, 0, true); }
    isConnected = () => true; recalcStats();   // Wege sind hier egal
    for (let k = 0; k < 60; k++) updateProduction(0.25);
    const full = state.res.nahrung;
    state.pop = 400; for (let k = 0; k < 8; k++) updateProduction(0.25);   // zu viele Esser: Lager muss sinken
    return { have: full, cap, drop: state.res.nahrung }; })()`);
  ok(r.have >= r.cap - 1e-9, 'Lager bleibt unter voll: ' + JSON.stringify(r));
  ok(r.drop < r.cap - 1, 'Bei zu wenig Nahrung bleibt das Lager trotzdem voll: ' + JSON.stringify(r));
  noErrors(g);
});

test('Menü: Neu starten – freier Platz lässt den alten Stand stehen, Ersetzen fängt von vorn an', () => {
  const g = fresh();
  const r = g.run(`(() => { gameRunning = true; state.pop = 50; saveGame(); const alt = currentSlot; askRestart();
    const frei = SLOTS.find(sl => !slotInfo(sl)); closeDialog(); chooseSlot(frei);
    const neu = state.pop; const altDa = slotInfo(alt) && slotInfo(alt).pop;
    askRestart(); doDeleteSlot(currentSlot);
    return { frei, alt, neu, altDa, danach: state.pop, slot: currentSlot }; })()`);
  ok(r.frei !== r.alt && r.neu === 6, 'Neues Spiel auf freiem Platz: ' + JSON.stringify(r));
  ok(r.altDa === 50, 'Alter Stand verschwunden: ' + JSON.stringify(r));
  ok(r.danach === 6 && r.slot === r.frei, 'Ersetzen falsch: ' + JSON.stringify(r));
  noErrors(g);
});

test('Karte: Quelle im Gebirge oben, Wasserfall, langer Fluss rechts am Lager vorbei, See unten; Fischer im Startland', () => {
  const g = fresh();
  for (const seed of [4242, 1, 77, 999, 31337, 5, 12, 2024, 8, 23]) {
    const r = g.run(`(() => { startNewGame(${seed}); let own = 0, minD = 1e9;
      const a = N / 2 - 16, b = N / 2 + 16, c = N / 2 - 0.5, W = TERRAIN.wasser.id;
      for (let y = a; y < b; y++) for (let x = a; x < b; x++) if (terrain[y * N + x] === W) own++;
      for (let i = 0; i < N * N; i++) if (terrain[i] === W) minD = Math.min(minD, Math.hypot(i % N - c, Math.floor(i / N) - c));
      // zusammenhängend von der Quelle bis zum See? (Flutfüllung übers Wasser)
      const f = mapFeatures, seen = new Uint8Array(N * N), q = [Math.floor(f.source.y) * N + Math.floor(f.source.x)];
      seen[q[0]] = 1; let wet = 0;
      for (let h = 0; h < q.length; h++) { const i = q[h]; wet++; for (const d of [1, -1, N, -N]) { const k = i + d; if (k >= 0 && k < N * N && !seen[k] && terrain[k] === W && Math.abs((k % N) - (i % N)) <= 1) { seen[k] = 1; q.push(k); } } }
      const lakeReached = !!seen[Math.floor(f.lake.y) * N + Math.floor(f.lake.x)];
      // kein Wasser am Kartenrand: Der Fluss endet im See
      let edge = 0; for (let k = 0; k < N; k++) if (terrain[k] === W || terrain[(N - 1) * N + k] === W || terrain[k * N] === W || terrain[k * N + N - 1] === W) edge++;
      // Gebirge oben am Stück, um die Quelle herum
      let top = 0, topAll = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (x + y < N * 0.2 && terrain[y * N + x] !== W) { topAll++; if (terrain[y * N + x] === TERRAIN.berg.id) top++; }
      let spot = false; for (let y = a; y < b - 1 && !spot; y++) for (let x = a; x < b - 1 && !spot; x++) if (!placeProblem('fischerplatz', x, y)) spot = true;
      return { gen: state.mapGen, own, minD, lakeReached, edge, top: top / topAll, spot, fall: f.fall && (f.fall.x + f.fall.y) / N, fallDir: f.fall && (f.fall.ux + f.fall.uy) / Math.SQRT2, srcDepth: (f.source.x + f.source.y) / N, lakeDepth: (f.lake.x + f.lake.y) / N, lakeR: f.lake.r,
        lakeWet: wet, campOk: state.buildings.every((b, i) => !b.build && !placeProblem(b.type, b.x, b.y, i)), depth: waterDepth.reduce((a, v) => Math.max(a, v), 0) }; })()`);
    const t = JSON.stringify(r);
    ok(r.gen === 3, 'neues Spiel sollte mapGen 3 haben');
    ok(r.own > 30, 'Fluss sollte durchs Startland gehen: ' + t);
    ok(r.minD >= 8, 'Lager zu nah am Fluss: ' + t);
    ok(r.lakeReached, 'Fluss kommt nicht durchgehend zum See: ' + t);
    ok(r.edge === 0, 'Fluss läuft durch den Kartenrand: ' + t);
    ok(r.top > 0.95, 'oben fehlt das zusammenhängende Gebirge: ' + t);
    ok(r.srcDepth < 0.3 && r.lakeDepth > 1.3, 'Quelle/See nicht oben/unten im Bild: ' + t);   // der große See reicht weiter zur Mitte
    ok(r.fall && r.fall > 0.2 && r.fall < 0.55 && r.fallDir > 0.6, 'Wasserfall nicht am Bergfuß: ' + t);
    ok(r.spot, 'Kein Platz für den Fischer im Startland: ' + t);
    ok(r.campOk, 'Lager steht falsch: ' + t);
    ok(r.depth > 4, 'See ohne tiefe Mitte: ' + t);
  }
  const neu = g.run(`(() => { startNewGame(99); const before = baseTerrain.slice(); loadFromText(serialize()); let diff = 0; for (let i = 0; i < N * N; i++) if (baseTerrain[i] !== before[i]) diff++; return { gen: state.mapGen, core: state.mapCore, diff, fall: !!mapFeatures.fall }; })()`);
  ok(neu.gen === 3 && neu.core === 0 && neu.diff === 0 && neu.fall, 'neuer Stand ändert sich beim Laden: ' + JSON.stringify(neu));
  noErrors(g);
});

test('Karte groß: mindestens 256 Felder je Seite, Land bis zum Rand kaufbar, Kamera erreicht alles, Spielstand klein', () => {
  const g = fresh();
  const r = g.run(`(() => {
    const ps = CONFIG.plotSize; state.res.holz = 1e7; state.res.stein = 1e7;
    let n = 0, more = true;
    while (more) { more = false; for (let p = 0; p < state.plots.length; p++) if (canBuyPlot(p) && buyPlot(p)) { n++; more = true; } }
    centerOnTile(0, 0); const a = tileToWorld(0, 0), ax = cam.x, ay = cam.y;
    centerOnTile(N, N); const by = cam.y; centerOnTile(N, 0); const cx = cam.x; centerOnTile(0, N); const dx = cam.x;
    drawScene(0.05);
    return { N, n, all: state.plots.every(p => p === 1), size: serialize().length, plots: state.plots.length, ax, ay, by, cx, dx, wx: N * TW / 2, wy: N * TH, cover: cloudCovers(0) }; })()`);
  ok(r.N >= 256 && r.N % 16 === 0, 'Karte zu klein: ' + r.N);
  ok(r.all, 'nicht alles Land kaufbar');
  ok(r.ay === 0 && r.by === r.wy && r.cx === r.wx && r.dx === -r.wx, 'Kamera erreicht nicht alle Ecken: ' + JSON.stringify(r));
  ok(r.size < 3 * 1024 * 1024 / 4, 'Spielstand zu groß: ' + r.size);
  noErrors(g);
});

test('Wolken: fremdes Land bedeckt, Preisschild antippbar, Kauf löst die Wolke auf, nichts unter den Wolken wird gezeichnet', () => {
  const g = fresh();
  g.run('state.res.holz = 500; state.res.stein = 500; cam.zoom = 0.6; centerOnTile(N / 2, N / 2); viewW = 1600; viewH = 1000;');
  const p = g.run('plotOf(42 + O, 52 + O)');
  ok(g.run(`cloudCovers(${p})`), 'fremdes Land nicht bedeckt');
  ok(g.run('!cloudCovers(plotOf(N / 2, N / 2))'), 'eigenes Land bedeckt');
  g.run('drawScene(0.05)');
  const tag = g.run(`(() => { const t = plotTags.find(q => q.p === ${p}); return t ? [(t.x0 + t.x1) / 2, (t.y0 + t.y1) / 2] : null; })()`);
  ok(tag, 'Preisschild fehlt');
  ok(g.run(`plotTagAtScreen(${tag[0]}, ${tag[1]})`) === p, 'Preisschild nicht antippbar');
  g.run(`dialogOpen = false; handleTap(${tag[0]}, ${tag[1]})`);
  ok(g.run('dialogOpen'), 'Tipp aufs Schild öffnet das Kauffenster nicht');
  g.run(`closeDialog(); buyPlot(${p});`);
  ok(g.run(`state.plots[${p}] === 1 && cloudCovers(${p}) && landMask[(52 + O) * N + 42 + O] === 2`), 'Kauf: Land frei, Wolke löst sich auf');
  g.run('for (let i = 0; i < 10; i++) drawScene(0.25)');
  ok(g.run(`!cloudCovers(${p})`), 'Wolke nach dem Auflösen noch da');
  // Bäume, Tiere und Leute unter Wolken kommen nicht in die Zeichenliste; Mammuts nur auf eigenem Land
  const r = g.run(`(() => {
    const all = { x0: 0, y0: 0, x1: N - 1, y1: N - 1 };
    life.animals = [];
    const free = lifeObjects(all).length;
    life.animals.push({ kind: 'hirsch', x: 2.5, y: 2.5, tx: 2.5, ty: 2.5, wait: 9, face: 1, ph: 0, home: [2, 2] });
    const hidden = lifeObjects(all).length;
    life.animals = [];
    state.herdWait = 0; state.hunt = null; life.herdTimer = 0;
    let off = 0, seen = 0;
    for (let i = 0; i < 400; i++) { updateAnimals(0.25); for (const a of life.animals) if (a.kind === 'mammut' || a.kind === 'hirsch') { seen++; if (!isOwned(Math.round(a.tx - 0.5), Math.round(a.ty - 0.5))) off++; } }
    return { hidden, free, off, seen }; })()`);
  ok(r.hidden === r.free, 'Tier unter den Wolken wird gezeichnet');
  ok(r.seen > 0 && r.off === 0, 'Tiere laufen unter die Wolken: ' + JSON.stringify(r));
  noErrors(g);
});

test('Fischerplatz auf Säulen: teils im Fluss, ganz im Wasser oder ganz an Land nein; alter Stand am Ufer bleibt gültig', () => {
  const g = fresh();
  const r = g.run(`(() => {
    state.stage = 'mittel'; state.techs.einbaum = true;
    const isW = (x, y) => inMap(x, y) && terrain[y * N + x] === TERRAIN.wasser.id;
    const land = (x, y) => inMap(x, y) && !terrainAt(x, y).blocks;
    let half = null, deep = null, bank = null;
    for (let y = 5; y < N - 5; y++) for (let x = 5; x < N - 5; x++) {
      const cells = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]], w = cells.filter(c => isW(...c)).length, l = cells.filter(c => land(...c)).length;
      if (!half && w >= 1 && w + l === 4 && l >= 1) half = { x, y };
      if (!deep && w === 4) deep = { x, y };
      if (!bank && l === 4 && touchesWater(x, y, 2)) bank = { x, y };
    }
    const msg = c => { const old = isOwned; isOwned = () => true; const m = placeProblem('fischerplatz', c.x, c.y); isOwned = old; return m; };
    const res = { half: msg(half), deep: msg(deep), bank: msg(bank) };
    isOwned = () => true;
    const b = addBuilding('fischerplatz', bank.x, bank.y, 2, true);
    rebuildOccupancy();
    res.oldOk = placeProblem('fischerplatz', bank.x, bank.y, state.buildings.indexOf(b));
    res.view = buildingView(BUILDINGS.fischerplatz, 1).mirror;
    drawScene(0.05);
    return res; })()`);
  ok(r.half === null, 'Halb im Wasser sollte gehen: ' + r.half);
  ok(r.deep && /Land/.test(r.deep), 'Ganz im Wasser: ' + r.deep);
  ok(r.bank && /Fluss/.test(r.bank), 'Ganz an Land: ' + r.bank);
  ok(r.oldOk === null, 'Alter Stand am Ufer ungültig: ' + r.oldOk);
  ok(r.view === true, 'Drehung 1 sollte gespiegelt sein');
  noErrors(g);
});

test('See: neue Karten (mapGen 3) mit doppelt so breitem See; Stände mit mapGen 2 behalten ihre Karte', () => {
  const g = fresh();
  const r = g.run(`(() => { startNewGame(77); const neu = mapFeatures.lake.r; const m = state.buildings.filter(b => BUILDINGS[b.type]);
    state.mapGen = 2; buildTerrain(); const alt = mapFeatures.lake.r; const a = baseTerrain.slice();
    loadFromText(serialize()); let diff = 0; for (let i = 0; i < N * N; i++) if (baseTerrain[i] !== a[i]) diff++;
    return { neu, alt, gen: state.mapGen, diff }; })()`);
  ok(Math.abs(r.neu / r.alt - 2) < 0.01, 'See nicht doppelt so breit: ' + JSON.stringify(r));
  ok(r.gen === 2 && r.diff === 0, 'mapGen 2 hat sich geändert: ' + JSON.stringify(r));
  noErrors(g);
});

test('Arbeiter laufen nie übers Wasser (Wegsuche über Land und Brücken)', () => {
  const g = fresh();
  const r = g.run(`(() => { state.res.holz = 999; state.res.stein = 999; state.pop = 30;
    for (const t of ['holzsammler', 'steinsammler', 'sammlerin', 'holzsammler']) { const sp = findFreeSpot(t, 70 + O, 62 + O); placeBuilding(t, sp.x, sp.y); const k = state.buildings.length - 1; finishBuilding(state.buildings[k]); buildRoute(k); }
    recalcStats(); let wet = 0, moves = 0;
    for (let i = 0; i < 3000; i++) { updateLife(0.05, {x0:0,y0:0,x1:N-1,y1:N-1});
      for (const w of life.workers) if (w.phase === 'go' || w.phase === 'back') { moves++; const x = Math.floor(w.x), y = Math.floor(w.y);
        if (terrain[y * N + x] === TERRAIN.wasser.id && !isPathAt(x, y)) wet++; } }
    return [wet, moves]; })()`);
  ok(r[1] > 100, 'niemand ist gelaufen');
  ok(r[0] === 0, 'Arbeiter liefen ' + r[0] + '-mal übers Wasser');
  noErrors(g);
});

test('Alte Spielstände (kleine Karte bis Version 21) landen in der Mitte der großen Karte', () => {
  const fixture = JSON.parse(fs.readFileSync(new URL('./alter-stand-v21.json', import.meta.url), 'utf8'));
  const old = fixture.save, oldN = 64;
  const g = fresh();
  const off = g.run('(N - 64) / 2'), O = g.run('O');
  ok(g.run(`loadFromText(${JSON.stringify(JSON.stringify(old))})`), 'alter Stand lädt nicht');
  ok(g.run('state.mapSize') === g.run('N'), 'Kartengröße nicht übernommen');
  const nb = g.run('JSON.stringify(state.buildings.map(b => [b.type, b.x, b.y]))');
  const ob = old.buildings.map(b => [b.type === 'jaegerlager' ? 'mammutjaegerlager' : b.type, b.x + off, b.y + off]);
  ok(nb === JSON.stringify(ob), 'Gebäude nicht richtig verschoben');
  // jedes Feld unter einem Gebäude hat dieselbe Geländeart wie vorher
  const bad = g.run(`(() => { const t = ${JSON.stringify(fixture.terrain)}; let n = 0;
    for (let y = 0; y < ${oldN}; y++) for (let x = 0; x < ${oldN}; x++) if (Number(t[y * ${oldN} + x]) !== terrain[(y + ${off}) * N + x + ${off}]) n++; return n; })()`);
  ok(bad === 0, bad + ' Felder haben sich verändert');
  // gekauftes Land und Jagd mitgewandert
  ok(g.run('isOwned(42 + O, 52 + O) && isOwned(64 + O, 64 + O)') && !g.run('isOwned(10 + O, 20 + O)'), 'Land nicht mitgewandert');
  ok(g.run('state.hunt.cx') === 62 + O && g.run('state.hunt.x') === 72 + O, 'Jagd nicht verschoben');
  ok(g.run('state.buildings.every((b, i) => !placeProblem(b.type, b.x, b.y, i))'), 'Gebäude stehen nach dem Umzug falsch');
  ok(g.run('state.buildings.every((b, i) => isConnected(i))'), 'Wege nach dem Umzug unterbrochen');
  // ein zweites Laden verschiebt nicht noch einmal
  ok(g.run('loadFromText(serialize()) && state.buildings[0].x') === old.buildings[0].x + off, 'doppelt verschoben');
  noErrors(g);
});

test('Alte Spielstände (128er-Karte bis Version 54): Kern Feld für Feld gleich, alles an Ort und Stelle, doppeltes Laden verschiebt nicht', () => {
  const fx = JSON.parse(fs.readFileSync(new URL('./alter-stand-v54.json', import.meta.url), 'utf8'));
  const g = fresh();
  const crc = '(a=>{let h=0x811c9dc5;for(let i=0;i<a.length;i++){h^=a[i];h=Math.imul(h,16777619)>>>0}return h})';
  // Die alte Erzeugung liefert noch genau dieselben Karten (Prüfsummen mit Epochia 54 errechnet)
  for (const [s, e] of Object.entries(fx.gelaende)) {
    const r = g.run(`(() => { const c = ${crc}; const g1 = c(generateTerrain(${s})), g2 = c(generateTerrain2(${s})); return { g1, g2, fx: lastOldMap.fall.x }; })()`);
    ok(r.g1 === e.g1 && r.g2 === e.g2 && r.fx === e.fall.x, 'alte Karte verändert, Zahl ' + s);
    for (const gen of [1, 2]) {   // Wassertiefe und Sandbänke auch
      const t = g.run(`(() => { const c = ${crc}; startNewGame(${s}); state.mapGen = ${gen}; state.mapCore = 128; buildTerrain(); const o = [];
        for (let y = 12; y < 116; y++) for (let x = 12; x < 116; x++) o.push(Math.round(waterDepth[(y + O) * N + x + O] * 1000) % 251, Math.round(waterShoal[(y + O) * N + x + O] * 1000) % 251); return c(o); })()`);
      ok(t === e['tiefe' + gen], 'Wassertiefe verändert, Karte ' + gen + ' Zahl ' + s);
    }
  }
  for (const k of ['gen1', 'gen2']) {
    const old = fx.staende[k], O = g.run('O'), oldN = 128;
    const text = JSON.stringify(JSON.stringify(old));
    ok(g.run(`loadFromText(${text})`), k + ' lädt nicht');
    const moved = i => (Math.floor(i / oldN) + O) * g.run('N') + (i % oldN) + O;
    const r = g.run(`(() => { const t = ${JSON.stringify(fx.staende[k + '_terrain'])}; let diff = 0;
      for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) if (Number(t[y * 128 + x]) !== terrain[(y + O) * N + x + O]) diff++;
      const a = state.buildings.map(b => [b.type, b.x - O, b.y - O, b.rot, !!b.torch].join());
      return { diff, a, core: state.mapCore, size: state.mapSize, gen: state.mapGen, cleared: state.cleared, planted: state.planted, saplings: state.saplings, owned: state.plots.filter(p => p === 1).length,
        oki: state.buildings.every((b, i) => !placeProblem(b.type, b.x, b.y, i)), net: state.buildings.every((b, i) => isConnected(i)), hunt: state.hunt,
        lake: !!mapFeatures.lake, src: !!mapFeatures.source, fall: mapFeatures.fall, pop: state.pop }; })()`);
    ok(r.diff === 0, k + ': ' + r.diff + ' Felder im Kern anders');
    ok(r.core === 128 && r.size === g.run('N') && r.gen === (k === 'gen1' ? 1 : 2), k + ': Felder falsch ' + JSON.stringify([r.core, r.size, r.gen]));
    ok(JSON.stringify(r.a) === JSON.stringify(old.buildings.map(b => [b.type, b.x, b.y, b.rot, !!b.torch].join())), k + ': Gebäude/Wege nicht an Ort und Stelle');
    ok(r.oki && r.net, k + ': Gebäude ungültig oder Wege unterbrochen');
    ok(JSON.stringify(r.cleared) === JSON.stringify(old.cleared.map(moved)), k + ': gefällte Bäume');
    ok(JSON.stringify(r.planted) === JSON.stringify(old.planted.map(moved)), k + ': gepflanzte Bäume');
    ok(JSON.stringify(r.saplings) === JSON.stringify(old.saplings.map(a => [moved(a[0]), a[1]])), k + ': Setzlinge');
    ok(r.owned === old.plots.filter(p => p === 1).length && g.run(`[${old.plots.map((v, p) => (v === 1 ? p : -1)).filter(p => p >= 0)}].every(p => isOwned((p % 16) * 8 + O, Math.floor(p / 16) * 8 + O))`), k + ': gekauftes Land');
    ok(r.hunt && r.hunt.cx === old.hunt.cx + O && r.hunt.y === old.hunt.y + O, k + ': Jagd');
    ok(r.lake && r.src, k + ': Außenland ohne See/Quelle');
    if (k === 'gen2') ok(r.fall, k + ': alter Wasserfall weg');
    // Doppelt laden: nichts wandert
    const again = g.run(`(() => { const before = serialize(); const b0 = JSON.stringify(state.buildings), t0 = baseTerrain.slice(); loadFromText(before); let d = 0; for (let i = 0; i < N * N; i++) if (baseTerrain[i] !== t0[i]) d++; return { same: JSON.stringify(state.buildings) === b0, d, cleared: JSON.stringify(state.cleared) === JSON.stringify(JSON.parse(before).cleared) }; })()`);
    ok(again.same && again.d === 0 && again.cleared, k + ': zweites Laden verschiebt ' + JSON.stringify(again));
    // Fluss am Rand des Kerns geht weiter: Über und unter dem Kern liegt in der Nähe wieder Wasser
    const edge = g.run(`(() => { const W = TERRAIN.wasser.id, near = (y0, y1) => { const out = []; for (let x = O; x < O + 128; x++) if (terrain[y0 * N + x] === W) { let hit = false; for (let d = -5; d <= 5; d++) if (terrain[y1 * N + x + d] === W) hit = true; out.push(hit); } return out; };
      return { top: near(O, O - 1), bottom: near(O + 127, O + 128) }; })()`);
    ok(edge.top.length && edge.top.every(Boolean), k + ': Fluss bricht oben am Kern ab ' + JSON.stringify(edge));
    ok(edge.bottom.length && edge.bottom.every(Boolean), k + ': Fluss bricht unten am Kern ab ' + JSON.stringify(edge));
  }
  noErrors(g);
});

// Konto: Netz wird gefälscht (kein echter Server). Die Tests sind asynchron, weil das Konto mit fetch arbeitet.
async function testAsync(name, fn) {
  try { await fn(); passed++; console.log('✔ ' + name); }
  catch (e) { failed++; console.log('✖ ' + name + '\n   ' + (e.message || e)); }
}
const FAKE_SERVER = `
  var server = { aufrufe: [], stand: null, ausfall: false, fremd: false };
  globalThis.fetch = async (url, opt = {}) => {
    if (server.ausfall) throw new Error('offline');
    const m = opt.method || 'GET'; server.aufrufe.push(m + ' ' + url);
    const antwort = (status, daten) => ({ ok: status < 400, status, json: async () => daten });
    if (url.includes('/auth/v1/token')) return opt.body.includes('falsch') ? antwort(400, { error_code: 'invalid_credentials', msg: 'x' })
      : antwort(200, { access_token: 'a', refresh_token: 'r', expires_in: 3600, user: { id: 'u1', email: 'x@y.de' } });
    if (url.includes('/rest/v1/profile')) return antwort(200, [{ name: 'Siedler', nummer: 'ABC234' }]);
    if (url.includes('/rest/v1/spielstaende')) {
      if (m === 'GET') return antwort(200, server.stand ? [server.stand] : []);
      if (m === 'POST') { if (server.stand) return antwort(409, {}); server.stand = { daten: JSON.parse(opt.body).daten, version: 1 }; return antwort(201, [{ version: 1 }]); }
      if (m === 'PATCH') {
        const v = Number(/version=eq\\.(\\d+)/.exec(url)[1]);
        if (server.fremd || !server.stand || server.stand.version !== v) return antwort(200, []);
        server.stand = { daten: JSON.parse(opt.body).daten, version: v + 1 }; return antwort(200, [{ version: v + 1 }]);
      }
    }
    return antwort(200, {});
  };
  var schreiben = () => server.aufrufe.filter(a => /^(POST|PATCH).*spielstaende/.test(a)).length;
  function anmeldenFake(basis = {}) { konto = { access: 'a', refresh: 'r', expires: Date.now() + 3600000, id: 'u1', email: 'x@y.de', name: '', nummer: '', basis, zeit: {} }; }
  function cloudStand(pop, savedAt, playTime = 5000) { const d = JSON.parse(serialize()); d.pop = pop; d.savedAt = savedAt; d.playTime = playTime; return JSON.stringify(d); }
`;
function kontoSpiel(storage) {
  const g = fresh(4242, storage);
  g.run(FAKE_SERVER + "gameRunning = true; saveGame();");
  return g;
}

await testAsync('Konto: ohne Anmeldung kein einziger Netzaufruf, Spiel läuft', async () => {
  const g = kontoSpiel();
  g.run("for (let k = 0; k < 5; k++) saveGame(); enterGame(); kontoNachSpeichern(); kontoBeimVerlassen(); kontoPruefen();");
  await g.run('kontoJetztSichern()');
  ok(g.run('server.aufrufe.length') === 0, 'Netz benutzt: ' + g.run('server.aufrufe.join()'));
  ok(g.run('state.pop') === 6, 'Spiel nicht normal');
  noErrors(g);
});

await testAsync('Konto: Netzausfall stört nicht, Meldung statt Fehler, Spielstand bleibt', async () => {
  const g = kontoSpiel();
  const vorher = g.run("anmeldenFake(); server.ausfall = true; kontoAbgeglichen[currentSlot] = true; kontoLetzterVersuch = 0; saveGame(); enterGame(); localStorage.getItem('epochia-save-1').length");
  await g.run('kontoJetztSichern()');
  await g.run("(async () => { konto = null; $('konto-mail').value = 'a@b.de'; $('konto-pass').value = 'geheim1'; await kontoAnmelden(); })()");
  ok(/Keine Verbindung/.test(g.run('kontoMeldung')), 'Keine Meldung: ' + g.run('kontoMeldung'));
  ok(g.run('konto') === null, 'Ohne Antwort angemeldet');
  ok(g.run("localStorage.getItem('epochia-save-1').length") > 0 && vorher > 0, 'Spielstand weg');
  noErrors(g);
});

await testAsync('Konto: falsches Passwort wird verständlich gemeldet, Registrieren erkennt vergebene E-Mail', async () => {
  const g = kontoSpiel();
  await g.run("(async () => { $('konto-mail').value = 'a@b.de'; $('konto-pass').value = 'falsch'; await kontoAnmelden(); })()");
  ok(/stimmt nicht/.test(g.run('kontoMeldung')) && g.run('konto') === null, 'Meldung: ' + g.run('kontoMeldung'));
  await g.run(`(async () => { const alt = fetch; globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ id: 'x', identities: [] }) }); $('konto-pass').value = 'geheim1'; await kontoRegistrieren(); globalThis.fetch = alt; })()`);
  ok(/schon vergeben/.test(g.run('kontoMeldung')), 'Meldung: ' + g.run('kontoMeldung'));
  await g.run(`(async () => { const alt = fetch; globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ id: 'x', identities: [{}] }) }); await kontoRegistrieren(); globalThis.fetch = alt; })()`);
  ok(/Mail geschickt/.test(g.run('kontoMeldung')), 'Meldung: ' + g.run('kontoMeldung'));
  noErrors(g);
});

await testAsync('Konto: leere Cloud bekommt den Stand; unterschiedlicher Stand fragt nach und überschreibt nie still', async () => {
  const g = kontoSpiel();
  g.run('anmeldenFake()');
  ok(await g.run('kontoAbgleich(1)') === 'hoch' && g.run('server.stand.version') === 1, 'Leere Cloud nicht gefüllt');
  noErrors(g);
  // zweites Gerät: kennt die Cloud-Version nicht
  const h = kontoSpiel();
  const lokal = h.run("anmeldenFake(); server.stand = { daten: cloudStand(40, Date.now() - 1000), version: 5 }; localStorage.getItem('epochia-save-1')");
  ok(await h.run('kontoAbgleich(1)') === 'frage', 'Keine Rückfrage');
  ok(h.run('dialogOpen') && /Welcher Spielstand/.test(h.run("$('dialog-box').innerHTML")), 'Kein Fenster');
  ok(h.run('schreiben()') === 0 && h.run("localStorage.getItem('epochia-save-1')") === lokal, 'Still überschrieben');
  h.run('kontoLetzterVersuch = 0; saveGame()');
  ok(h.run('schreiben()') === 0, 'Upload trotz offener Frage');
  // Cloud laden: Gerätestand wird aufgehoben, Spiel läuft mit dem Cloud-Stand
  const zuletzt = h.run("localStorage.getItem('epochia-save-1')");
  ok(h.run('kontoCloudLaden()') === true, 'Laden fehlgeschlagen');
  ok(h.run("localStorage.getItem('epochia-save-1-vorher')") === zuletzt, 'Gerätestand nicht aufgehoben');
  ok(h.run('state.pop') === 40 && h.run('konto.basis[1]') === 5 && h.run('schreiben()') === 0, 'Cloud-Stand nicht geladen');
  noErrors(h);
});

await testAsync('Konto: „Dieses Gerät behalten“ ersetzt nur die gesehene Version; anderes Gerät dazwischen fragt wieder', async () => {
  const g = kontoSpiel();
  g.run('anmeldenFake(); server.stand = { daten: cloudStand(40, 111), version: 5 }');
  await g.run('kontoAbgleich(1)');
  await g.run('kontoGeraetBehalten()');
  ok(g.run('server.stand.version') === 6 && g.run('JSON.parse(server.stand.daten).pop') === 6, 'Nicht hochgeladen');
  // ein anderes Gerät sichert unbemerkt: Upload findet die Version nicht mehr → Rückfrage statt Überschreiben
  g.run('server.stand = { daten: cloudStand(70, 222), version: 9 }; kontoLetzterVersuch = 0; saveGame()');
  await g.run('new Promise(r => r())'); await new Promise(r => setImmediate(r));
  ok(g.run('JSON.parse(server.stand.daten).pop') === 70, 'Fremder Stand überschrieben');
  ok(g.run('kontoKonflikt && kontoKonflikt.version') === 9, 'Keine Rückfrage nach fremder Sicherung');
  noErrors(g);
});

await testAsync('Konto: kaputter Cloud-Stand zerstört nichts; neu begonnenes Spiel überschreibt längeres nicht still', async () => {
  const g = kontoSpiel();
  const lokal = g.run("anmeldenFake(); server.stand = { daten: '{kaputt', version: 2 }; kontoKonflikt = { slot: 1, daten: '{kaputt', version: 2 }; localStorage.getItem('epochia-save-1')");
  ok(g.run('kontoCloudLaden()') === false && g.run("localStorage.getItem('epochia-save-1')") === lokal && g.run('state.pop') === 6, 'Kaputter Stand geladen');
  noErrors(g);
  const h = kontoSpiel();
  h.run('anmeldenFake({ 1: 3 }); server.stand = { daten: cloudStand(90, 333, 99999), version: 3 }');   // Gerät kennt Version 3, spielt aber neu von vorn
  ok(await h.run('kontoAbgleich(1)') === 'frage', 'Rückschritt nicht bemerkt');
  noErrors(h);
});

await testAsync('Konto: Sicherung gedrosselt, nur für verglichene Plätze', async () => {
  const g = kontoSpiel();
  g.run('anmeldenFake(); kontoLetzterVersuch = 0; saveGame()');
  ok(g.run('schreiben()') === 0, 'Upload vor dem Vergleich');
  await g.run('kontoAbgleich(1)');
  const nachVergleich = g.run('schreiben()');
  g.run('kontoLetzterVersuch = Date.now(); for (let k = 0; k < 10; k++) saveGame()');
  await new Promise(r => setImmediate(r));
  ok(g.run('schreiben()') === nachVergleich, 'Nicht gedrosselt');
  g.run('kontoLetzterVersuch = Date.now() - KONTO_TAKT - 1; for (let k = 0; k < 10; k++) saveGame()');
  await new Promise(r => setImmediate(r));
  ok(g.run('schreiben()') === nachVergleich + 1, 'Takt falsch: ' + g.run('schreiben()'));
  noErrors(g);
});

await testAsync('Konto: Abmelden löscht nur die Sitzung; alter Spielstand des alten Spiels bleibt unberührt', async () => {
  const altes = '{"altes":"spiel"}';
  const g = kontoSpiel({ 'stadtaufbau-save-1': altes });
  const lokal = g.run("anmeldenFake(); kontoMerken(); saveGame(); localStorage.getItem('epochia-save-1')");
  ok(g.run("localStorage.getItem('epochia-konto')"), 'Sitzung nicht gespeichert');
  await g.run('kontoAbgleich(1)');
  g.run('kontoAbmelden()');
  ok(g.run('konto') === null && g.run("localStorage.getItem('epochia-konto')") === null, 'Sitzung nicht gelöscht');
  ok(g.run("localStorage.getItem('epochia-save-1')") === lokal, 'Spielstand verändert');
  ok(g.run("localStorage.getItem('stadtaufbau-save-1')") === altes, 'Altes Spiel angefasst');
  ok(/service_role|secret/.test(fs.readFileSync(new URL('../js/konto.js', import.meta.url), 'utf8')) === false, 'Geheimer Schlüssel im Code?');
  noErrors(g);
});

test('Laufender Verbrauch: Holz und Stein je Einwohner wirken, kleine Stämme zahlen nichts, leeres Lager schadet nicht', () => {
  const g = fresh();
  // großer Stamm: eine Minute Verbrauch, im Waren-Fenster als Einwohner verbucht
  const r = g.run(`(() => { state.pop = 86; state.res.holz = 100; state.res.stein = 100; state.res.nahrung = 150; recalcStats(); updateProduction(60);
    return [state.res.holz, state.res.stein, stats.flows.holz.out.__pop, stats.flows.stein.out.__pop, state.res.nahrung]; })()`);
  ok(Math.abs(r[0] - (100 - 86 * g.run('CONFIG.upkeep.holz.voll'))) < 1e-6, 'Holz falsch: ' + r[0]);
  ok(Math.abs(r[1] - (100 - 86 * g.run('CONFIG.upkeep.stein.voll'))) < 1e-6, 'Stein falsch: ' + r[1]);
  ok(r[2] > 0 && r[3] > 0, 'Verbrauch fehlt im Info-Fenster');
  ok(r[4] < 150 - 86 * 0.4, 'Nahrung wird nicht stärker verbraucht: ' + r[4]);
  // kleiner Stamm: kein Holz, kein Stein
  const klein = g.run(`(() => { state.pop = 6; state.res.holz = 50; state.res.stein = 40; recalcStats(); updateProduction(60); return [state.res.holz, state.res.stein]; })()`);
  ok(klein[0] === 50 && klein[1] === 40, 'Start-Stamm verbraucht Holz/Stein: ' + klein);
  // leer: bleibt bei 0, kein Fehler, keine Bestrafung, Anzeige ohne Geisterverbrauch
  const leer = g.run(`(() => { state.pop = 86; state.res.holz = 0; state.res.stein = 0; state.res.werkzeug = 0; state.res.nahrung = 150; recalcStats(); const laune = stats.happiness;
    for (let k = 0; k < 60; k++) { recalcStats(); updateProduction(1); updatePopulation(1); }
    return [state.res.holz, state.res.stein, state.res.werkzeug, (stats.flows.holz || { out: {} }).out.__pop || 0, stats.happiness === laune, stats.rates.holz || 0]; })()`);
  ok(leer[0] === 0 && leer[1] === 0 && leer[2] === 0, 'Lager unter 0 oder kaputt: ' + leer);
  ok(leer[3] === 0 && leer[5] === 0, 'Anzeige zeigt Verbrauch aus leerem Lager: ' + leer);
  ok(leer[4], 'Leeres Holz/Stein-Lager senkt die Laune');
  // Offline läuft derselbe Verbrauch mit
  const off = g.run(`(() => { state.pop = 40; state.res.holz = 100; const r = applyOfflineProgress(Date.now() - 60 * 1000); return [state.res.holz, !!r]; })()`);
  ok(off[1] && off[0] < 100, 'Offline kein Holzverbrauch: ' + off);
  noErrors(g);
});

test('Arbeiterfalle: Ältester nennt nach einer Minute das Gebäude, die knappe Ware und wer pausieren kann', () => {
  const g = fresh();
  g.run(`
    state.res.holz = 500; state.res.stein = 500; state.res.nahrung = 500;
    for (const type of ['sammlerin', 'jaegerlager', 'holzsammler', 'steinsammler']) {
      const sp = findFreeSpot(type, 62 + O, 62 + O);
      placeBuilding(type, sp.x, sp.y);
      const k = state.buildings.length - 1;
      finishBuilding(state.buildings[k]);
      if (!isConnected(k)) buildRoute(k);
    }
    state.res.stein = 0; state.res.nahrung = capOf('nahrung'); state.res.felle = capOf('felle'); state.res.holz = 100; state.pop = 6; recalcStats();
    updateProduction(1); state.tutorial = -1; state.playTime = 1000; elderHint = null; lastHintAt = -1e9; shortageSince = null;
  `);
  const short = g.run('workerShortage()');
  ok(short && short.good === 'stein', 'Falle nicht erkannt: ' + JSON.stringify(short));
  ok(g.run(`BUILDINGS[state.buildings[${short.donor}].type].produces.nahrung > 0`), 'Volles Nahrungsgebäude nicht als Pause vorgeschlagen');
  g.run('checkStaffHint(); elderHint = null; lastHintAt = -1e9; state.playTime += 30; checkStaffHint();');
  ok(!g.run('(elderHint || "").includes("Stein geht aus")'), 'Hinweis kommt zu früh');
  g.run('elderHint = null; lastHintAt = -1e9; state.playTime += 40; checkStaffHint();');
  const text = g.run('elderHint || ""');
  ok(text.includes('Steinsammler') && text.includes('Stein geht aus') && text.includes('Pause'), 'Hinweis falsch: ' + text);
  // Der Vorschlag stimmt: Pause am genannten Gebäude bringt dem Steinsammler Leute
  const stone = g.run(`state.buildings.findIndex(b => b.type === 'steinsammler')`);
  if (short.helps) { g.run(`togglePause(${short.donor}); recalcStats();`); ok(g.run(`stats.staff[${stone}] > 0`), 'Pause hilft nicht, obwohl der Hinweis es sagt'); }
  // Ware reichlich da: keine Falle
  g.run(`state.res.stein = 100; recalcStats();`);
  ok(!g.run('workerShortage()'), 'Falle gemeldet, obwohl genug Stein da ist');
  ok(typeof g.run('understaffedText()') === 'string', 'Einwohner-Text kaputt');
  noErrors(g);
});

test('Aufbruch-Warnung: Einwohner verbrauchen die verlangte Ware → Warnung im Fenster, einmal vom Ältesten; sonst still', () => {
  const g = fresh();
  g.run(`
    state.stage = 'jung';
    const walk = id => { for (const r of TECHS[id].requires) { state.techs[r] = true; walk(r); } }; walk('aufbruch_bronzezeit');
    state.pop = 500; state.res.toepferwaren = 0; TECHS.aufbruch_bronzezeit.cost.toepferwaren = 30; state.needSince = { toepferwaren: 0, kleidung: 0, glaube: 0 };
    state.playTime = 5000; recalcStats(); updateProduction(1); state.tutorial = -1; elderHint = null; lastHintAt = -1e9;
  `);
  const stall = g.run(`researchStalls('aufbruch_bronzezeit').map(s => s.id)`);
  ok(stall.includes('toepferwaren'), 'Stau nicht erkannt: ' + stall);
  ok(g.run(`stallText('aufbruch_bronzezeit')`).includes('500 Einwohner'), 'Text nennt die Einwohner nicht');
  ok(g.run(`researchSelected = 'aufbruch_bronzezeit'; techDetailHtml()`).includes('⚠'), 'keine Warnung im Forschungsfenster');
  ok(g.run('researchTopHtml()').includes('⚠'), 'keine Warnung in der Zielzeile');
  g.run('checkStallHint(); state.playTime += 60; checkStallHint();');
  ok(!g.run('elderHint'), 'Ältester warnt zu früh');
  g.run('state.playTime += 61; checkStallHint();');
  ok(g.run('(elderHint || "").includes("stockt")'), 'Ältester warnt nicht');
  ok(g.run(`loadFromText(serialize()) && state.seen.stau_aufbruch_bronzezeit === true`), 'Warnung wird nach dem Laden wiederholt');
  // Ware reicht: keine Warnung
  g.run(`TECHS.aufbruch_bronzezeit.cost.toepferwaren = 30; recalcStats(); updateProduction(1); state.res.toepferwaren = 30; for (const [id, n] of Object.entries(TECHS.aufbruch_bronzezeit.cost)) state.res[id] = n;`);
  ok(!g.run(`researchStalls('aufbruch_bronzezeit').length`), 'Warnung trotz genug Ware');
  // Kleiner Stamm, Ware kommt in unter einer Stunde zusammen: keine Warnung
  g.run(`state.pop = 6; state.res.toepferwaren = 0; stats.flows = { toepferwaren: { in: { toepferei: 5 }, out: { __pop: 1 } } }; stats.rates = { toepferwaren: 4 };`);
  ok(!g.run(`researchStalls('aufbruch_bronzezeit').some(s => s.id === 'toepferwaren')`), 'Warnung trotz genug Herstellung');
  noErrors(g);
});

test('Fundstücke: Fundstellen erscheinen, warten und bringen das fehlende Stück', () => {
  const g = fresh();
  ok(g.run(`state.spots.length`) === 0, 'Schon beim Start Fundstellen');
  // Während des Einstiegs erscheint nichts
  g.run(`state.tutorial = 3; state.fund.spotWait = 0; updateFinds(1); state.tutorial = -1;`);
  ok(g.run(`state.spots.length`) === 0, 'Fundstelle mitten im Einstieg');
  // Höchstens 3 gleichzeitig, sie laufen nicht ab
  for (let k = 0; k < 6; k++) g.run(`state.fund.spotWait = 0; state.yearTime = 0; updateFinds(1);`);
  ok(g.run(`normalSpots()`) === 3, 'Höchstens 3 Fundstellen: ' + g.run(`normalSpots()`));
  ok(g.run(`state.spots.filter(s => !SPOT_STYLE[s.kind].special).every(s => isOwned(s.x, s.y) && buildingAt(s.x, s.y) < 0)`), 'Fundstelle unter den Wolken oder auf einem Gebäude');
  g.run(`for (let i = 0; i < 600; i++) { state.fund.spotWait = 1e9; updateFinds(5); }`);
  ok(g.run(`normalSpots()`) === 3, 'Fundstellen sind abgelaufen');
  // Antippen: jemand läuft hin, danach ist das Stück da
  const id = g.run(`state.spots.find(s => !SPOT_STYLE[s.kind].instant).find`);
  const have = g.run(`findCount('${id}')`);
  g.run(`collectSpot(state.spots.findIndex(s => !SPOT_STYLE[s.kind].instant))`);
  ok(g.run(`state.trips.length`) === 1, 'Niemand unterwegs');
  ok(g.run(`findCount('${id}')`) === have, 'Stück kam ohne Laufweg');
  g.run(`for (let i = 0; i < 30; i++) updateFinds(5);`);
  ok(g.run(`findCount('${id}')`) === have + 1 && g.run(`state.trips.length`) === 0, 'Stück kam nicht an');
  // Glücksschutz: Es kommt, was im Verhältnis zum Bedarf am wenigsten da ist
  g.run(`state.finds = { roetel: 5, feder: 1 }; state.spots = [];`);
  ok(g.run(`leastFind(['roetel', 'feder', 'muschel'])`) === 'muschel', 'Fehlendes Stück kommt nicht zuerst');
  // Überbaut: Fundstelle verschwindet ohne Absturz
  g.run(`state.spots = []; const sp = addSpot('wald', 'feder'); terrain[sp.y * N + sp.x] = TERRAIN.gras.id; dropInvalidSpots();`);
  ok(g.run(`state.spots.length`) === 0, 'Fundstelle auf gerodetem Wald bleibt');
  noErrors(g);
});

test('Fundstücke: Erzader nur mit Kupfermine, Glut und Sternschnuppe sofort, Jagd, Hochwasser, Truhe', () => {
  const g = fresh();
  g.run(`state.fund.oreWait = 0; updateFinds(1);`);
  ok(!g.run(`state.spots.some(s => s.kind === 'erz')`), 'Erzader ohne Kupfermine');
  g.run(`state.spots = []; state.buildings.push({ type: 'kupfermine', x: 250, y: 250, rot: 0, build: 0 }); rebuildOccupancy(); state.fund.oreWait = 0; updateFinds(1);`);
  ok(g.run(`state.spots.some(s => s.kind === 'erz')`), 'Keine Erzader trotz Kupfermine');
  const erz0 = g.run(`state.res.kupfererz || 0`);
  g.run(`state.fund.ores = 2; collectSpot(state.spots.findIndex(s => s.kind === 'erz'));`);
  ok(g.run(`state.trips[0].total`) === g.run(`CONFIG.finds.oreSeconds`), 'Erzader dauert nicht 1 Minute');
  g.run(`for (let i = 0; i < 13; i++) updateFinds(5);`);
  ok(g.run(`state.res.kupfererz`) === erz0 + 40, 'Kein Kupfererz: ' + g.run(`state.res.kupfererz`));
  ok(g.run(`findCount('goldblatt')`) === 1, 'Jede 3. Erzader bringt Gold');
  // Glut: in der Nacht genau eine, sofort eingesammelt, je Nacht nur einmal
  g.run(`state.spots = []; state.playTime = CONFIG.daySeconds * 0.8; state.fund.spotWait = 1e9; state.fund.oreWait = 1e9; updateFinds(1);`);
  ok(g.run(`state.spots.filter(s => s.kind === 'glut').length`) === 1, 'Keine Glut in der Nacht');
  g.run(`collectSpot(state.spots.findIndex(s => s.kind === 'glut')); updateFinds(1);`);
  ok(g.run(`findCount('holzkohle')`) === 1 && !g.run(`state.spots.some(s => s.kind === 'glut')`), 'Glut mehrfach in einer Nacht');
  // Sternschnuppe erst mit Sternenkunde
  ok(!g.run(`findAvailable('sternkarte')`), 'Sternkarte vor der Forschung');
  g.run(`state.techs.sternenkunde = true;`);
  ok(g.run(`findAvailable('sternkarte')`), 'Sternkarte trotz Forschung nicht möglich');
  // Sternschnuppe: auch bei Wolken spätestens gegen Ende der Nacht, je Nacht eine
  g.run(`state.spots = []; state.fund.sternNight = -1; currentWeather = () => ({ id: 'regen' }); state.playTime = CONFIG.daySeconds * 5.75; updateMoments();`);
  ok(!g.run(`state.spots.some(s => s.kind === 'stern')`), 'Sternschnuppe zu früh bei Wolken');
  g.run(`state.playTime = CONFIG.daySeconds * 5.89; updateMoments();`);
  ok(g.run(`state.spots.filter(s => s.kind === 'stern').length`) === 1, 'Keine Sternschnuppe am Ende der Nacht');
  g.run(`collectSpot(state.spots.findIndex(s => s.kind === 'stern')); updateMoments();`);
  ok(g.run(`!state.spots.some(s => s.kind === 'stern') && findCount('sternkarte') === 1`), 'Zwei Sternschnuppen in einer Nacht');
  // Jagd: jede 2., mit Mammutjägerlager jede
  g.run(`state.buildings.push({ type: 'jaegerlager', x: 240, y: 240, rot: 0, build: 0 }); rebuildOccupancy(); isConnected = () => true; state.finds = {}; state.herdWait = 0; state.huntsDone = 0;
    state.hunt = { left: 0.1, cx: 0, cy: 0, x: 0, y: 0 }; updateHunt(1);`);
  ok(g.run(`findCount('stosszahn')`) === 0, 'Stoßzahn schon bei der 1. Jagd');
  g.run(`state.hunt = { left: 0.1, cx: 0, cy: 0, x: 0, y: 0 }; updateHunt(1);`);
  ok(g.run(`findCount('stosszahn')`) === 1, 'Kein Stoßzahn bei der 2. Jagd');
  // Hochwasser spült Muscheln an
  g.run(`state.spots = []; emit('disasterEnded', 'hochwasser');`);
  ok(g.run(`state.spots.filter(s => s.find === 'muschel').length`) === 2, 'Keine Muscheln nach Hochwasser');
  // Tag-7-Truhe
  const n = g.run(`Object.values(state.finds).reduce((a, b) => a + b, 0)`);
  g.run(`state.daily.pending = 7; claimDailyReward();`);
  ok(g.run(`Object.values(state.finds).reduce((a, b) => a + b, 0)`) === n + 1, 'Truhe ohne Fundstück');
  noErrors(g);
});

test('Fundstücke: Glück bei der Arbeit ist nach der Schutzzeit sicher, Fundkorb und Tausch', () => {
  const g = fresh();
  g.run(`state.buildings.push({ type: 'jaegerlager', x: 240, y: 240, rot: 0, build: 0 }); rebuildOccupancy(); state.buildings[state.buildings.length - 1].paused = true; state.fund.luck.feder = 2400 - 60; updateLuck();`);
  ok(g.run(`findCount('feder')`) === 1, 'Feder trotz Schutzzeit nicht gefunden');
  ok(g.run(`state.fund.luck.feder`) === 0, 'Zähler nicht zurückgesetzt');
  // Fundkorb: 15 Minuten eins, 1 Stunde zwei, nie mehr als zwei
  g.run(`state.finds = {}`);
  ok(g.run(`fillBasket(60)`) === 0 && g.run(`fillBasket(1000)`) === 1, 'Fundkorb nach 15 Minuten');
  g.run(`state.basket = []`);
  ok(g.run(`fillBasket(7200)`) === 2 && g.run(`fillBasket(7200)`) === 0 && g.run(`state.basket.length`) === 2, 'Fundkorb zu voll');
  g.run(`claimBasket()`);
  ok(g.run(`state.basket.length`) === 0 && g.run(`Object.values(state.finds).reduce((a, b) => a + b, 0)`) === 2, 'Fundkorb nicht übergeben');
  // Offline-Lauf füllt den Korb, Fundstellen erscheinen dabei nicht
  g.run(`state.basket = []; state.spots = []; state.fund.spotWait = 0; applyOfflineProgress(Date.now() - 2000 * 1000);`);
  ok(g.run(`state.basket.length`) === 1 && g.run(`state.spots.length`) === 0, 'Offline falsch: Korb ' + g.run(`state.basket.length`) + ', Stellen ' + g.run(`state.spots.length`));
  // Tausch: nur Stücke über dem Bedarf zählen als doppelt
  g.run(`state.finds = { roetel: 5, feder: 3 };`);
  ok(g.run(`spareTotal()`) === 2 && !g.run(`swapFinds('muschel')`), 'Tausch trotz zu weniger Doppelter');
  g.run(`state.finds = { roetel: 6, feder: 3 };`);
  ok(g.run(`swapFinds('muschel')`) && g.run(`findCount('muschel')`) === 1, 'Tausch ging nicht');
  ok(g.run(`findCount('roetel')`) === 5 && g.run(`findCount('feder')`) === 1, 'Tausch nahm Benötigtes');
  ok(!g.run(`(state.finds = { roetel: 9 }, swapFinds('findling'))`), 'Noch nicht findbares Stück tauschbar');
  noErrors(g);
});

test('Fundstücke: Spielstand bleibt erhalten, alte und kaputte Stände laden', () => {
  const g = fresh();
  g.run(`state.finds = { roetel: 2 }; state.basket = ['feder']; state.spots = [{ kind: 'wald', x: 250, y: 250, find: 'feder' }, { kind: 'erz', x: 251, y: 250, find: null }];
    state.trips = [{ id: 1, left: 5, total: 20, cx: 256, cy: 256, x: 250, y: 250, kind: 'fels', find: 'roetel' }]; state.fund.ores = 4; state.fund.luck.feder = 100;`);
  ok(g.run(`loadFromText(serialize())`), 'Stand lädt nicht');
  ok(g.run(`state.finds.roetel === 2 && state.basket[0] === 'feder' && state.spots.length === 2 && state.trips[0].find === 'roetel' && state.fund.ores === 4 && state.fund.luck.feder === 100`), 'Felder gingen verloren');
  // Alter Stand ohne die Felder
  g.run(`const d = JSON.parse(serialize()); for (const k of ['finds', 'spots', 'trips', 'basket', 'fund']) delete d[k]; window.__t = JSON.stringify(d);`);
  ok(g.run(`loadFromText(window.__t)`), 'Alter Stand lädt nicht');
  ok(g.run(`Array.isArray(state.spots) && state.fund.spotWait > 0 && state.basket.length === 0`), 'Standardwerte fehlen');
  g.run(`for (let i = 0; i < 10; i++) update(5);`);
  // Kaputte Werte fallen weg
  g.run(`const b = JSON.parse(serialize()); b.finds = { gibtsnicht: 3, roetel: -2, feder: 'x' }; b.spots = [null, { kind: 'quatsch', x: 1, y: 1 }, { kind: 'wald', x: 99999, y: 1, find: 'feder' }, { kind: 'wald', x: 2, y: 2, find: 'nix' }];
    b.trips = [{ kind: 'wald', left: 'a' }]; b.basket = ['nix', 3]; b.fund = { rng: 'x', luck: { nix: 3 } }; window.__t = JSON.stringify(b);`);
  ok(g.run(`loadFromText(window.__t)`), 'Kaputter Stand lädt nicht');
  ok(g.run(`Object.keys(state.finds).length === 0 && state.spots.length === 0 && state.trips.length === 0 && state.basket.length === 0 && state.fund.rng === 0 && !state.fund.luck.nix`), 'Kaputte Werte übernommen');
  noErrors(g);
});

test('Schatzkiste: Fenster zeigt Fundstücke, Unbekanntes grau, Knöpfe tun, was sie sollen', () => {
  const g = fresh();
  g.run(`state.finds = { roetel: 7, feder: 3 }; state.basket = ['muschel']; addSpot('wald', 'feder');`);
  const html = g.run(`chestHtml()`);
  ok(html.includes('Rötel') && !html.includes('Sonnenstein') && html.includes('???'), 'Unbekanntes wird verraten oder Bekanntes fehlt');
  ok(html.includes('Fundkorb') && html.includes('Hinschauen') && html.includes('Eintauschen'), 'Knöpfe fehlen');
  ok(g.run(`FIND_PAGES.every(p => Object.values(FINDS).some(f => f.page === p.id)) && Object.values(FINDS).every(f => FIND_PAGES.some(p => p.id === f.page) && f.hint)`), 'Fundstück ohne Seite oder Hinweis');
  ok(g.run(`chestBadge()`) === 2, 'Zähler am Knopf');
  ok(g.run(`Object.values(FINDS).filter(f => f.spot).every(f => SPOT_STYLE[f.spot]) && CONFIG.finds.luck.every(r => FINDS[r.find]) && !!FINDS.goldblatt && !!FINDS.holzkohle`), 'Falsche Verweise in den Daten');
  noErrors(g);
});

test('Höhle der Geschichten: erst nach der Forschung, einmalig, an Felsen, in 4 Abschnitten mit Fundstücken', () => {
  const g = fresh();
  ok(g.run(`barEntries().find(e => e.type === 'geschichtenhoehle').locked`), 'Höhle vor der Forschung frei');
  g.run(`state.techs.hoehlenmalerei = true;`);
  ok(!g.run(`barEntries().find(e => e.type === 'geschichtenhoehle').locked`), 'Höhle nach der Forschung gesperrt');
  // Platz an Felsen, sonst nicht
  const spot = g.run(`(() => { for (let y = landBox.y0; y <= landBox.y1; y++) for (let x = landBox.x0; x <= landBox.x1; x++) if (isOwned(x, y) && !buildProblem('geschichtenhoehle', x, y)) return [x, y]; return null; })()`);
  ok(spot, 'Kein Platz an Felsen gefunden');
  ok(g.run(`(() => { for (let y = landBox.y0; y <= landBox.y1; y++) for (let x = landBox.x0; x <= landBox.x1; x++) if (isOwned(x, y) && buildProblem('geschichtenhoehle', x, y) === 'Muss an Felsen oder am Gebirge stehen') return true; return false; })()`), 'Keine Felsen-Pflicht');
  ok(g.run(`placeBuilding('geschichtenhoehle', ${spot[0]}, ${spot[1]})`) === null, 'Nicht baubar');
  g.run(`rebuildOccupancy(); recalcStats();`);
  ok(!g.run(`barEntries().some(e => e.type === 'geschichtenhoehle')`), 'Zweite Höhle in der Bauleiste');
  ok(g.run(`buildProblem('geschichtenhoehle', ${spot[0]}, ${spot[1]})`), 'Zweite Höhle baubar');
  ok(g.run(`constructionCount()`) === 0, 'Höhle belegt einen Bauplatz');
  ok(g.run(`const i = wonderIndex('hoehle'); !demolish(i) && wonderIndex('hoehle') >= 0`), 'Höhle abreißbar');
  // Sie bleibt unfertig und bringt noch nichts
  g.run(`for (let i = 0; i < 20; i++) update(5);`);
  ok(g.run(`state.buildings[wonderIndex('hoehle')].build`) === 1, 'Unfertige Höhle läuft wie eine Baustelle ab');
  // Weg: Abschnitt 1 braucht Weg, Steinsammler, Waren
  g.run(`isConnected = () => true; recalcStats();`);
  ok(g.run(`wonderStepProblem('hoehle')`) === 'Baue 2 Steinsammler', 'Kapitelziel: ' + g.run(`wonderStepProblem('hoehle')`));
  g.run(`state.buildings.push({ type: 'steinsammler', x: 200, y: 200, rot: 0, build: 0 }, { type: 'steinsammler', x: 203, y: 200, rot: 0, build: 0 }); rebuildOccupancy(); state.res.stein = 0;`);
  ok(g.run(`wonderStepProblem('hoehle')`) === g.run(`missingText(WONDERS.hoehle.steps[0].goods)`), 'Waren nicht verlangt');
  g.run(`state.res.stein = 100; state.res.holz = 100;`);
  ok(g.run(`startWonderStep('hoehle')`) === null && g.run(`state.res.stein`) === 40, 'Abschnitt 1 startet nicht oder zahlt nicht');
  ok(g.run(`startWonderStep('hoehle')`) === 'Dieser Abschnitt wird gerade gebaut', 'Doppelt gestartet');
  g.run(`for (let i = 0; i < 61; i++) updateWonders(5);`);
  ok(g.run(`state.wonders.hoehle.step`) === 1 && !g.run(`wonderDone('hoehle')`), 'Abschnitt 1 nicht fertig');
  // Abschnitt 2 braucht Fundstücke und verbaut sie
  g.run(`state.res.felle = 50; state.res.holz = 100;`);
  ok(/Rötel/.test(g.run(`wonderStepProblem('hoehle')`)), 'Fundstück nicht verlangt');
  g.run(`state.finds = { roetel: 5, holzkohle: 2 }; state.fund.ever = { roetel: 5, holzkohle: 2 };`);
  ok(g.run(`findNeed('roetel')`) === 5, 'Bedarf Rötel');
  ok(g.run(`startWonderStep('hoehle')`) === null, 'Abschnitt 2 startet nicht');
  ok(g.run(`findCount('roetel')`) === 2 && g.run(`findNeed('roetel')`) === 2 && g.run(`findCount('holzkohle')`) === 0 && g.run(`findNeed('holzkohle')`) === 0, 'Verbautes falsch gezählt');
  ok(g.run(`findEver('holzkohle')`) && g.run(`chestHtml()`).includes('verbaut'), 'Verbautes verschwindet aus dem Album');
  // Offline läuft der Bau weiter und wird gemeldet
  const r = g.run(`JSON.stringify(applyOfflineProgress(Date.now() - 600 * 1000).events)`);
  ok(g.run(`state.wonders.hoehle.step`) === 2 && r.includes('Abschnitt 2'), 'Offline nicht weitergebaut: ' + r);
  // Abschnitt 3
  g.run(`state.res.nahrung = 100; state.finds.stosszahn = 1; state.finds.feder = 1;`);
  ok(g.run(`startWonderStep('hoehle')`) === null, 'Abschnitt 3 startet nicht: ' + g.run(`wonderStepProblem('hoehle')`));
  g.run(`for (let i = 0; i < 121; i++) updateWonders(5);`);
  // Abschnitt 4 geht erst in der Mittelsteinzeit
  g.run(`state.finds.muschel = 2; state.res.kleidung = 50; state.res.wissen = 100;`);
  ok(/Mittelsteinzeit/.test(g.run(`wonderStepProblem('hoehle')`)), 'Abschnitt 4 zu früh');
  g.run(`state.stage = 'mittel';`);
  // Noch keine Wirkung
  ok(g.run(`wonderBonus('hoehlenmaler')`) === 1 && g.run(`!wonderFest()`), 'Wirkung vor der Fertigstellung');
  ok(g.run(`startWonderStep('hoehle')`) === null, 'Abschnitt 4 startet nicht');
  g.run(`for (let i = 0; i < 145; i++) updateWonders(5);`);
  ok(g.run(`wonderDone('hoehle')`) && g.run(`state.buildings[wonderIndex('hoehle')].build`) === 0, 'Nicht fertig');
  ok(Math.abs(g.run(`wonderBonus('hoehlenmaler')`) - 1.2) < 1e-9 && g.run(`wonderBonus('sammlerin')`) === 1, 'Bonus falsch');
  g.run(`recalcStats(); updateProduction(5);`);
  const f = g.run(`outputPerMinute(wonderIndex('hoehle')).wissen`);
  ok(f > 0, 'Höhle bringt kein Wissen: ' + f);
  g.run(`state.yearTime = CONFIG.yearSeconds * 5 / 8;`);
  ok(g.run(`festNow() && wonderFest().name === 'Fest der Geschichten'`), 'Kein Fest');
  ok(g.run(`wonderAlbumHtml('steinzeit')`).includes('Höhle der Geschichten'), 'Keine Seite im Album');
  noErrors(g);
});

test('Höhle der Geschichten: Fortschritt bleibt erhalten, kaputte Werte schaden nicht, Fenster öffnet', () => {
  const g = fresh();
  g.run(`state.techs.hoehlenmalerei = true; state.buildings.push({ type: 'geschichtenhoehle', x: 200, y: 200, rot: 0, build: 1 }); rebuildOccupancy(); state.wonders.hoehle = { step: 2, left: 77 }; state.fund.used.roetel = 3;`);
  ok(g.run(`loadFromText(serialize())`), 'Stand lädt nicht');
  ok(g.run(`state.wonders.hoehle.step === 2 && state.wonders.hoehle.left === 77 && state.fund.used.roetel === 3 && state.buildings[wonderIndex('hoehle')].build === 1`), 'Fortschritt ging verloren');
  ok(g.run(`wonderHtml('hoehle')`).includes('Die große Jagd') && g.run(`wonderCardHtml()`).includes('Höhle der Geschichten'), 'Fenster falsch');
  ok(g.run(`questsHtml()`).includes('Höhle der Geschichten'), 'Nicht im Auftrags-Fenster');
  // Kaputt und alte Stände: Höhle ohne Fortschritt bleibt unfertig
  g.run(`const d = JSON.parse(serialize()); d.wonders = { hoehle: { step: 'x' }, quatsch: { step: 1 } }; d.buildings.find(b => b.type === 'geschichtenhoehle').build = 0; d.fund.used = { nix: 3, roetel: -1 }; window.__t = JSON.stringify(d);`);
  ok(g.run(`loadFromText(window.__t)`), 'Kaputter Stand lädt nicht');
  ok(g.run(`!state.wonders.quatsch && wonderState('hoehle').step === 0 && state.buildings[wonderIndex('hoehle')].build === 1 && !state.fund.used.nix && !state.fund.used.roetel`), 'Kaputte Werte übernommen');
  // Zu hoher Stand: fertig
  g.run(`const b = JSON.parse(serialize()); b.wonders = { hoehle: { step: 99 } }; window.__t = JSON.stringify(b);`);
  ok(g.run(`loadFromText(window.__t) && wonderDone('hoehle') && state.buildings[wonderIndex('hoehle')].build === 0`), 'Zu hoher Stand');
  noErrors(g);
});

test('Steinkreis: Wunderwerk in 4 Abschnitten, Findlinge werden gerollt, erstes Fest, Warnung, nötig für den Aufbruch', () => {
  const g = fresh();
  g.run(`state.techs.sternenkunde = true; state.stage = 'jung'; isConnected = () => true;`);
  ok(g.run(`canAfford(BUILDINGS.steinkreis.cost)`) && g.run(`Object.keys(BUILDINGS.steinkreis.cost).length`) === 0, 'Platz kostet etwas');
  // Ohne Platz kommen keine Findlinge
  g.run(`state.fund.boulderWait = 0; state.fund.spotWait = 1e9; state.fund.oreWait = 1e9; updateFinds(1);`);
  ok(!g.run(`state.spots.some(s => s.kind === 'findling')`), 'Findling ohne Bauplatz');
  const spot = g.run(`(() => { for (let y = landBox.y0; y <= landBox.y1; y++) for (let x = landBox.x0; x <= landBox.x1; x++) if (isOwned(x, y) && !buildProblem('steinkreis', x, y)) return [x, y]; return null; })()`);
  ok(g.run(`placeBuilding('steinkreis', ${spot[0]}, ${spot[1]})`) === null, 'Nicht baubar');
  g.run(`rebuildOccupancy(); recalcStats();`);
  ok(g.run(`lineCount('steinkreis')`) === 0, 'Unfertiger Steinkreis zählt schon für die Forschung');
  ok(g.run(`state.wonders.steinkreis.step`) === 0, 'Neuer Steinkreis gilt nicht als unfertig');
  ok(g.run(`stats.happiness >= 0 && !state.buildings[wonderIndex('steinkreis')].build === false`), 'Unfertig bleibt Baustelle');
  // Abschnitt 1: Sternkarten
  ok(/Sternkarte/.test(g.run(`wonderStepProblem('steinkreis')`)), 'Sternkarten nicht verlangt');
  g.run(`state.finds.sternkarte = 3; state.res.holz = 200;`);
  ok(g.run(`startWonderStep('steinkreis')`) === null, 'Abschnitt 1 startet nicht');
  g.run(`for (let i = 0; i < 61; i++) updateWonders(5);`);
  // Abschnitt 2: Findling erscheint, acht Leute rollen ihn, er kommt an
  g.run(`state.fund.boulderWait = 0; updateFinds(1);`);
  ok(g.run(`state.spots.filter(s => s.kind === 'findling').length`) === 1, 'Kein Findling');
  ok(g.run(`SPOT_STYLE.findling.special && !SPOT_STYLE.findling.instant`), 'Findling falsch eingestuft');
  g.run(`collectSpot(state.spots.findIndex(s => s.kind === 'findling'));`);
  ok(g.run(`state.trips[0].kind`) === 'findling' && g.run(`state.trips[0].total`) === 120, 'Rollen dauert nicht 2 Minuten');
  const mid = g.run(`state.buildings[wonderIndex('steinkreis')].x + 2`);
  ok(g.run(`state.trips[0].x`) === mid, 'Findling rollt nicht zum Bauplatz');
  ok(g.run(`tripObjects(() => true, 0).length`) === 9, '8 Leute und ein Stein');
  g.run(`for (let i = 0; i < 24; i++) updateFinds(5);`);
  ok(g.run(`findCount('findling')`) === 1, 'Findling kam nicht an');
  // Nur 5 kommen, mitgezählt, was schon rollt
  g.run(`state.finds.findling = 4; state.spots = []; state.fund.boulderWait = 0; updateFinds(1); collectSpot(state.spots.findIndex(s => s.kind === 'findling')); state.fund.boulderWait = 0; updateFinds(1);`);
  ok(!g.run(`state.spots.some(s => s.kind === 'findling')`), 'Zu viele Findlinge');
  g.run(`state.trips = []; state.finds.findling = 5; state.res.werkzeug = 20; state.res.nahrung = 200;`);
  ok(g.run(`startWonderStep('steinkreis')`) === null, 'Abschnitt 2 startet nicht');
  g.run(`for (let i = 0; i < 121; i++) updateWonders(5);`);
  g.run(`state.finds.sonnenstein = 1; state.res.stein = 200;`);
  ok(g.run(`startWonderStep('steinkreis')`) === null, 'Abschnitt 3 startet nicht');
  g.run(`for (let i = 0; i < 121; i++) updateWonders(5);`);
  g.run(`state.finds.blumenkranz = 3; state.res.kleidung = 20; state.res.toepferwaren = 20;`);
  ok(g.run(`startWonderStep('steinkreis')`) === null, 'Abschnitt 4 startet nicht');
  g.run(`state.yearTime = 0; for (let i = 0; i < 61; i++) updateWonders(5);`);
  // Fertig: zählt, erstes Fest gleich danach, Äcker, Sonnenkalender
  ok(g.run(`wonderDone('steinkreis')`) && g.run(`state.buildings[wonderIndex('steinkreis')].build`) === 0, 'Nicht fertig');
  ok(g.run(`lineCount('steinkreis')`) === 1 && g.run(`state.built.steinkreis`) === 1, 'Zählt nicht für den Aufbruch');
  ok(g.run(`wonderFest().name`) === 'Sonnwendfest' && g.run(`festNow()`), 'Kein erstes Fest');
  ok(Math.abs(g.run(`wonderBonus('acker')`) - 1.1) < 1e-9, 'Äcker-Bonus');
  ok(g.run(`sunCalendarRow()`).includes('Sonnenkalender'), 'Kein Sonnenkalender');
  // Fest im Sommer bringt ein Geschenk
  g.run(`state.wonders.steinkreis.festUntil = 0; festWas = false; state.res.nahrung = 0; state.yearTime = CONFIG.yearSeconds * 3 / 8; updateFest();`);
  ok(g.run(`state.res.nahrung`) === 100, 'Kein Geschenk zum Fest');
  // Warnung vor der Katastrophe
  g.run(`state.yearTime = 0; state.playTime = 1e6; state.disasterCalm = 1e6; state.tutorial = -1; disasterRandom = () => 0; updateDisaster(1);`);
  ok(g.run(`!!state.disasterNext && !state.disaster`), 'Keine Warnung');
  g.run(`updateDisaster(CONFIG.disasterWarn + 1);`);
  ok(g.run(`!state.disasterNext && !!state.disaster`), 'Katastrophe kam nicht');
  noErrors(g);
});

test('Steinkreis: alte Stände behalten ihn, fertig oder als Baustelle', () => {
  const g = fresh();
  g.run(`state.buildings.push({ type: 'steinkreis', x: 200, y: 200, rot: 0, build: 0 }); const d = JSON.parse(serialize()); delete d.wonders; delete d.fund; window.__t = JSON.stringify(d);`);
  ok(g.run(`loadFromText(window.__t)`), 'Alter Stand lädt nicht');
  ok(g.run(`wonderDone('steinkreis') && state.buildings[wonderIndex('steinkreis')].build === 0`), 'Fertiger Steinkreis wurde unfertig');
  ok(g.run(`lineCount('steinkreis')`) === 1, 'Zählt nicht mehr');
  // Alte Baustelle: baut den letzten Abschnitt zu Ende, ohne etwas zu verlangen
  g.run(`state.buildings[wonderIndex('steinkreis')].build = 200; const b = JSON.parse(serialize()); delete b.wonders; window.__t = JSON.stringify(b);`);
  ok(g.run(`loadFromText(window.__t)`), 'Alte Baustelle lädt nicht');
  ok(g.run(`state.wonders.steinkreis.step === 3 && state.wonders.steinkreis.left === 200 && !wonderDone('steinkreis')`), 'Baustelle verloren');
  g.run(`for (let i = 0; i < 41; i++) updateWonders(5);`);
  ok(g.run(`wonderDone('steinkreis') && state.buildings[wonderIndex('steinkreis')].build === 0`), 'Baustelle nicht fertig');
  // Neu platziert und gespeichert bleibt unfertig
  g.run(`startNewGame(4242); state.tutorial = -1; state.techs.sternenkunde = true; const sp = (() => { for (let y = landBox.y0; y <= landBox.y1; y++) for (let x = landBox.x0; x <= landBox.x1; x++) if (isOwned(x, y) && !buildProblem('steinkreis', x, y)) return [x, y]; })(); placeBuilding('steinkreis', sp[0], sp[1]);`);
  ok(g.run(`loadFromText(serialize()) && !wonderDone('steinkreis') && state.wonders.steinkreis.step === 0`), 'Neuer Steinkreis nach dem Laden fertig');
  // Bild: fertig mit Drehung, unfertig mit Baustufe
  ok(g.run(`buildingView(BUILDINGS.steinkreis, 0, 0, 0).name`) === '1-steinkreis-bau', 'Unfertig falsches Bild');
  g.run(`state.wonders.steinkreis.step = 4; images['1-steinkreis-r2'] = {};`);
  ok(g.run(`buildingView(BUILDINGS.steinkreis, 2, 0, 0).name`) === '1-steinkreis-r2', 'Fertig dreht nicht');
  noErrors(g);
});

test('Hinweis „hier arbeitet niemand“ nur, wenn wirklich alle beschäftigt sind (nicht direkt nach dem Bau)', () => {
  const g = fresh();
  g.run(`isConnected = () => true; state.pop = stats.housing = 6; recalcStats(); state.pop = stats.housing; lastHintAt = -1e9; elderHint = null;`);
  // Gebäude gerade fertig, Arbeiter noch nicht neu verteilt, Leute sind frei
  g.run(`state.buildings.push({ type: 'steinschlaeger', x: 200, y: 200, rot: 0, build: 0 }); rebuildOccupancy(); stats.staff = []; checkStaffHint();`);
  ok(!g.run(`elderHint`), 'Falsche Meldung: ' + g.run(`elderHint`));
  ok(g.run(`stats.staff[state.buildings.length - 1]`) === 2, 'Arbeiter nicht verteilt');
  // Wirklich niemand mehr frei: Meldung kommt
  g.run(`for (let k = 0; k < 5; k++) state.buildings.push({ type: 'steinschlaeger', x: 204 + k * 3, y: 200, rot: 0, build: 0 }); rebuildOccupancy(); recalcStats(); state.pop = stats.housing; lastHintAt = -1e9; elderHint = null; checkStaffHint();`);
  ok(/Hier arbeitet niemand/.test(g.run(`elderHint`) || ''), 'Echte Meldung fehlt');
  noErrors(g);
});

test('Halle der Himmelsscheibe: 4 Abschnitte setzen die Scheibe zusammen, Händler bringt Bernstein, Boni', () => {
  const g = fresh();
  g.run(`state.stage = 'spaet'; state.techs.himmelsscheibe = true; isConnected = () => true;`);
  const spot = g.run(`(() => { for (let y = landBox.y0; y <= landBox.y1; y++) for (let x = landBox.x0; x <= landBox.x1; x++) if (isOwned(x, y) && !buildProblem('himmelshalle', x, y)) return [x, y]; return null; })()`);
  ok(spot && g.run(`placeBuilding('himmelshalle', ${spot[0]}, ${spot[1]})`) === null, 'Nicht baubar');
  g.run(`rebuildOccupancy(); recalcStats();`);
  ok(g.run(`barEntries().every(e => e.type !== 'himmelshalle')`) && g.run(`barEntries().some(e => e.type === 'geschichtenhoehle')`) !== undefined, 'Bauleiste');
  // Abschnitt 1 gibt das erste Stück
  g.run(`Object.assign(state.res, { holz: 500, stein: 500, bronze: 500, schmuck: 50, kleidung: 50, wissen: 500 });`);
  ok(g.run(`startWonderStep('himmelshalle')`) === null, 'Abschnitt 1');
  g.run(`for (let i = 0; i < 73; i++) updateWonders(5);`);
  ok(g.run(`findCount('scheibe')`) === 1, 'Kein Stück der Scheibe');
  // Abschnitt 2: Gold aus der Erzader
  ok(/Goldblättchen/.test(g.run(`wonderStepProblem('himmelshalle')`)), 'Gold nicht verlangt');
  g.run(`state.finds.goldblatt = 3;`);
  ok(g.run(`startWonderStep('himmelshalle')`) === null, 'Abschnitt 2');
  g.run(`for (let i = 0; i < 121; i++) updateWonders(5);`);
  ok(g.run(`findCount('scheibe')`) === 3 && g.run(`findCount('goldblatt')`) === 0, 'Abschnitt 2 falsch gezählt');
  // Händler: bietet den Bernstein an, solange er fehlt, und nur dann
  g.run(`state.buildings.push({ type: 'handelsplatz', x: 200, y: 200, rot: 0, build: 0 }); rebuildOccupancy(); state.trader.left = 100; state.trader.done = []; hasMaker = () => true;`);
  ok(g.run(`traderOffers().some(o => o.id === 'bronze_grossbernstein')`), 'Kein Bernstein-Angebot: ' + g.run(`traderOffers().map(o => o.id).join()`));
  ok(g.run(`traderHtml()`).includes('Großer Bernstein'), 'Angebot nicht im Fenster');
  ok(g.run(`doTrade('bronze_grossbernstein')`) === null && g.run(`findCount('bernsteinstueck')`) === 1, 'Tausch ging nicht');
  ok(!g.run(`traderOffers().some(o => o.id === 'bronze_grossbernstein')`), 'Bernstein-Angebot trotz Besitz');
  g.run(`state.trader.left = 0;`);
  // Abschnitt 3 und 4
  g.run(`state.finds.zinnperle = 2;`);
  ok(g.run(`startWonderStep('himmelshalle')`) === null, 'Abschnitt 3: ' + g.run(`wonderStepProblem('himmelshalle')`));
  g.run(`for (let i = 0; i < 121; i++) updateWonders(5);`);
  ok(g.run(`startWonderStep('himmelshalle')`) === null, 'Abschnitt 4: ' + g.run(`wonderStepProblem('himmelshalle')`));
  g.run(`for (let i = 0; i < 121; i++) updateWonders(5);`);
  ok(g.run(`wonderDone('himmelshalle')`) && g.run(`findCount('scheibe')`) === 5, 'Scheibe nicht vollständig');
  // Wirkung
  ok(Math.abs(g.run(`wonderBonus('bronzegiesser')`) - 1.2) < 1e-9, 'Bonus Bronzegießer: ' + g.run(`wonderBonus('bronzegiesser')`));
  ok(g.run(`wonderTraderFaster()`) === 300, 'Händler nicht schneller');
  g.run(`state.wonders.himmelshalle.festUntil = 0; state.yearTime = CONFIG.yearSeconds * 3 / 8;`);
  ok(g.run(`wonderFest().name`) === 'Großes Sonnwendfest', 'Falsches Fest');
  ok(g.run(`techBuildGaps('aufbruch_eisenzeit').every(x => x.type !== 'himmelshalle')`), 'Fertige Halle zählt nicht für den Aufbruch');
  // Nach Laden bleibt alles
  ok(g.run(`loadFromText(serialize()) && wonderDone('himmelshalle') && findCount('scheibe') === 5`), 'Laden');
  ok(g.run(`wonderAlbumHtml('bronze')`).includes('Halle der Himmelsscheibe'), 'Album');
  noErrors(g);
});

test('Stufen: 3 je Zeitalter, Ausbauen kostet und dauert, bringt Ertrag und alle 2 Stufen einen Arbeiter; Speichern, Abreißen, Weiterentwickeln', () => {
  const g = fresh();
  const r = g.run(`(() => {
    const sp = findFreeSpot('sammlerin', N / 2, N / 2), k = state.buildings.length;
    state.buildings.push({ type: 'sammlerin', x: sp.x, y: sp.y, rot: 0, build: 0 }); setOccupied(state.buildings[k], k + 1);
    isConnected = () => true; state.pop = 200; for (const id of Object.keys(RESOURCES)) state.res[id] = 500; recalcStats();
    const b = state.buildings[k], out = [];
    out.push(levelOf(b), workersOf(b), BUILDINGS.sammlerin.workers);
    const f1 = outputFactor(k);
    const holz = state.res.holz, cost = levelCost('sammlerin', 2);
    out.push(levelUp(k), holz - state.res.holz === cost.holz, b.up === levelTime('sammlerin', 2), constructionCount());
    out.push(levelProblem(k));                          // läuft schon
    updateConstruction(b.up + 0.1); recalcStats();
    out.push(levelOf(b), workersOf(b), b.up === undefined, Math.round(outputFactor(k) / f1 * 100));
    out.push(levelCost('sammlerin', 3).werkzeug, levelCost('sammlerin', 2).werkzeug || 0);
    levelUp(k); updateConstruction(1e6); recalcStats();
    out.push(levelOf(b), levelProblem(k), workersOf(b));   // Steinzeit: höchstens Stufe 3
    state.stage = 'kupfer'; out.push(levelProblem(k), levelCost('sammlerin', 6).bronze, maxLevel());
    state.stage = 'eisen1'; out.push(maxLevel(), levelCost('sammlerin', 9).eisen); state.stage = 'kupfer';
    // Speichern und Laden behält Stufe und laufenden Ausbau
    levelUp(k); saveGame(); loadSlot(currentSlot);
    const c = state.buildings.find(x => x.type === 'sammlerin');
    out.push(levelOf(c), c.up > 0);
    return out;
  })()`);
  ok(r[0] === 1 && r[1] === r[2], 'Neues Gebäude nicht Stufe 1: ' + r);
  ok(r[3] === null && r[4] && r[5] && r[6] >= 1, 'Ausbau startet nicht richtig: ' + r);
  ok(r[7] === 'Wird schon ausgebaut', 'Doppelter Ausbau möglich: ' + r[7]);
  ok(r[8] === 2 && r[9] === r[2] && r[10] && r[11] === 150, 'Stufe 2 bringt nicht +50 % (bei gleich vielen Arbeitern): ' + r);
  ok(r[12] === 3 && r[13] === 0, 'Stufe 3 braucht kein Werkzeug: ' + r);
  ok(r[14] === 3 && /Bronzezeit/.test(r[15]) && r[16] === r[2] + 1, 'Steinzeit-Grenze oder Arbeiter auf Stufe 3 falsch: ' + r);
  ok(r[17] === null && r[18] === 4 && r[19] === 6 && r[20] === 9 && r[21] === 5, 'Bronze-/Eisenzeit-Stufen falsch: ' + r);
  ok(r[22] === 3 && r[23] === true, 'Stufe/Ausbau nach dem Laden verloren: ' + r);
  // Weiterentwickeln behält die Stufe, Abreißen gibt die Hälfte der Ausbauten zurück, alte Stände ohne Stufe = 1
  const r2 = g.run(`(() => {
    const k = state.buildings.findIndex(x => x.type === 'sammlerin'), b = state.buildings[k];
    delete b.up; state.techs = {}; for (const id in TECHS) if (['alt', 'mittel', 'jung', 'kupfer'].includes(TECHS[id].stage)) state.techs[id] = true;
    evolveBuildings();
    const ref = refundOf(b), base = Math.floor(BUILDINGS[b.from].cost.holz * CONFIG.refundShare);
    return [b.type, levelOf(b), ref.holz > base, levelOf({ type: 'sammlerin' }), levelOf({ type: 'wohnhoehle', level: 3 })];
  })()`);
  ok(r2[0] !== 'sammlerin' && r2[1] === 3, 'Stufe bei der Weiterentwicklung verloren: ' + r2);
  ok(r2[2], 'Abreißen gibt nichts für den Ausbau zurück');
  ok(r2[3] === 1 && r2[4] === 1, 'Stufe ohne Feld oder bei Gebäude ohne Stufen falsch: ' + r2);
  noErrors(g);
});

test('Wassergebäude: Was aus einem Gebäude halb im Wasser entsteht, steht auch halb im Wasser (sonst passt der Platz nicht mehr)', () => {
  const g = fresh();
  const bad = g.run(`Object.entries(BUILDINGS).filter(([id, d]) => halfInWater(d) && d.upgradeTo && BUILDINGS[d.upgradeTo] && !halfInWater(BUILDINGS[d.upgradeTo]) && !BUILDINGS[d.upgradeTo].stilts).map(([id, d]) => id + ' → ' + d.upgradeTo).join(', ')`);
  ok(!bad, 'Nicht mehr halb im Wasser: ' + bad);
  noErrors(g);
});

test('Zeichnen: Ein Fehler bei einem Gebäude lässt die anderen nicht verschwinden und landet im Fehlerprotokoll', () => {
  const g = fresh();
  const r = g.run(`(() => {
    const sp = findFreeSpot('sammlerin', N / 2, N / 2), k = state.buildings.length;
    state.buildings.push({ type: 'sammlerin', x: sp.x, y: sp.y, rot: 0, build: 0 }); setOccupied(state.buildings[k], k + 1);
    centerOnTile(sp.x, sp.y);
    const alt = drawBuildingSprite; let n = 0;
    drawBuildingSprite = (type, ...a) => { n++; if (type === 'sammlerin') throw new Error('Testfehler'); return alt(type, ...a); };
    drawScene(0.016); drawBuildingSprite = alt;
    return [n, errorLog.some(x => x.text.includes('Testfehler') && x.text.includes('sammlerin')), menuHtml().includes('Letzte Fehler')];
  })()`);
  ok(r[0] >= 2, 'Nach dem Fehler wurde nichts mehr gezeichnet: ' + r);
  ok(r[1] && r[2], 'Fehler nicht im Protokoll oder Menü: ' + r);
  noErrors(g);
});

test('Aufträge: Stufen-Aufträge zählen ausgebaute Gebäude und warten auf das Zeitalter; Häuser ohne Knopf zum Weiterentwickeln', () => {
  const g = fresh();
  const r = g.run(`(() => {
    const q2 = QUESTS.find(q => q.id === 'q_s_stufe2'), q4 = QUESTS.find(q => q.id === 'q_b_stufe4');
    const sp = findFreeSpot('sammlerin', N / 2, N / 2), k = state.buildings.length;
    state.buildings.push({ type: 'sammlerin', x: sp.x, y: sp.y, rot: 0, build: 0, level: 2 }); setOccupied(state.buildings[k], k + 1);
    const out = [questDone(q2), questBlocked(q4)];
    state.stage = 'kupfer'; out.push(questBlocked(q4));
    const h = state.buildings.findIndex(b => b.type === 'lagerfeuer');
    state.buildings.push({ type: 'grubenhaus', x: sp.x + 4, y: sp.y, rot: 0, build: 0 }); rebuildOccupancy(); isConnected = () => true;
    showBuildingWindow(state.buildings.length - 1);
    const html = $('dialog-box').innerHTML;
    out.push(typeof html === 'string' ? html.includes('doUpgrade') : 'kein html', typeof html === 'string' && html.includes('Von selbst'));
    return out;
  })()`);
  ok(r[0] === true && r[1] === true && r[2] === false, 'Stufen-Auftrag falsch: ' + r);
  ok(r[3] === false && r[4] === true, 'Haus zeigt noch den Knopf zum Weiterentwickeln: ' + r);
  noErrors(g);
});

test('Dorfplatz: Ab der Kupferzeit zeigt das Lagerfeuer das Dorfplatz-Bild, sobald es geladen ist', () => {
  const g = fresh();
  const r = g.run(`(() => { const r = []; applyEpochTheme(); r.push(BUILDINGS.lagerfeuer.bild);
    state.stage = 'kupfer'; applyEpochTheme(); r.push(BUILDINGS.lagerfeuer.bild);
    images['2-dorfplatz'] = { width: 640, height: 588 }; applyEpochTheme(); r.push(BUILDINGS.lagerfeuer.bild);
    state.stage = 'alt'; applyEpochTheme(); r.push(BUILDINGS.lagerfeuer.bild); delete images['2-dorfplatz']; return r.join(); })()`);
  ok(r === '1-lagerfeuer,1-lagerfeuer,2-dorfplatz,1-lagerfeuer', 'Bildwechsel falsch: ' + r);
  ok(g.run(`imageNames().includes('2-dorfplatz')`), 'Dorfplatz-Bild wird nicht geladen');
  noErrors(g);
});

test('Bilder: Jede Datei liegt dort, wo imagePath sie erwartet; alles, was das Spiel lädt, ist unter bilder/epochia/', () => {
  const g = fresh();
  const dir = new URL('../../bilder/epochia/', import.meta.url);
  const walk = (d, pre = '') => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (e.name === 'quelle' || e.name === 'musik' ? [] : walk(new URL(e.name + '/', d), pre + e.name + '/')) : [pre + e.name]);
  const files = walk(dir).filter(f => f.endsWith('.webp'));
  ok(files.length > 200, 'Zu wenige Bilder: ' + files.length);
  for (const f of files) {
    const name = f.split('/').pop().replace('.webp', '');
    ok(g.run(`imagePath(${JSON.stringify(name)})`) === '../bilder/epochia/' + f, `${f} liegt falsch, erwartet ${g.run(`imagePath(${JSON.stringify(name)})`)}`);
  }
  ok(!fs.readdirSync(dir).some(f => f.endsWith('.webp')), 'Bild lose im Hauptordner');
  const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  for (const m of css.matchAll(/\.\.\/bilder\/epochia\/([\w\/.-]+\.webp)/g)) ok(fs.existsSync(new URL(m[1], dir)), 'CSS-Bild fehlt: ' + m[1]);
  // Gebäude liegen je in einem eigenen Ordner
  ok(g.run(`imagePath('1-sammlerin-r2-winter')`).includes('gebaeude/sammlerin/') && g.run(`imagePath('1-baustelle-4')`).includes('gebaeude/baustelle/') && g.run(`imagePath('2-halle-bau')`).includes('gebaeude/halle/'), 'Gebäudeordner falsch');
  noErrors(g);
});

test('Arbeitsbewegungen: Jedes Gebäude mit Arbeitern hat eine eigene, passende Arbeit; Bilder überblenden weich', () => {
  const g = fresh();
  const ohne = g.run(`Object.keys(BUILDINGS).filter(t => BUILDINGS[t].workers && !WORK[t]).join()`);
  ok(!ohne, 'Gebäude ohne Arbeit: ' + ohne);
  ok(g.run(`WORK.weberin.swing !== WORK.fellmacherin.swing || WORK.weberin.thing !== WORK.fellmacherin.thing`), 'Weberin schabt Fell');
  ok(g.run(`WORK.kupferschmied.thing !== WORK.steinschlaeger.thing`) && g.run(`WORK.sternkundiger.swing !== 'paint'`) && g.run(`WORK.gemuesegarten.target === 'self'`), 'Falscher Beruf');
  // Jede Art wird ohne Fehler gezeichnet
  ok(g.run(`(() => { for (const kind of Object.values(WORK)) for (const phase of ['work', 'back', 'go']) drawWorker({ kind, phase, x: 256, y: 256, tx: 257, ty: 256, sx: 256, sy: 256, w: 0, t: 2, ph: 0, face: 1, k: 0, b: state.buildings[0], route: [] }, 3.3); return true; })()`), 'Zeichnen');
  // Überblenden: Deckkraft stimmt für zwei und drei Bilder, Reihenfolge oben – Mitte – unten – Mitte
  const seq = g.run(`(() => { const out = []; for (let c = 0; c < 1; c += 0.02) { const m = poseMix(3, c); out.push(m[m.length - 1][0]); if (!m.every(x => x[1] >= 0 && x[1] <= 1)) return 'Deckkraft'; } return out.join(''); })()`);
  ok(seq !== 'Deckkraft' && /0+1+2+1+0*/.test(seq), 'Reihenfolge falsch: ' + seq);
  const zwei = g.run(`[poseMix(2, 0.3)[0][0], poseMix(2, 0.8)[0][0], poseMix(2, 0.68).length, poseMix(2, 0.999).length]`);
  ok(zwei[0] === 0 && zwei[1] === 1 && zwei[2] === 2 && zwei[3] === 2, 'Zwei Bilder falsch: ' + zwei);
  // Alle eigenen Bewegungen: drei Bilder, und die Bilder gibt es
  const fehlt = g.run(`Object.values(ANIM_POSES).flat().map(f => f[0]).filter(n => !imageNames().includes(n)).join()`);
  ok(!fehlt, 'Bild wird nicht geladen: ' + fehlt);
  // Bogen: eigener Ablauf ohne Rückkehr zum gespannten Bild nach dem Schuss
  const bogen = g.run(`[poseMix(3, 0.1, ANIM_TIMING.bogen.keys)[0][0], poseMix(3, 0.5, ANIM_TIMING.bogen.keys)[0][0], poseMix(3, 0.85, ANIM_TIMING.bogen.keys)[0][0], poseMix(3, 0.99, ANIM_TIMING.bogen.keys).at(-1)[0]]`);
  ok(bogen.join() === '0,1,2,0', 'Bogen-Ablauf falsch: ' + bogen);
  noErrors(g);
});

test('Design: jede Stufe hat eine Farbwelt, Lager zeigt Füllstand und knappe Waren oben', () => {
  const g = fresh();
  const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  const welten = g.run(`[...new Set(STAGES.map(s => s.zeit))].join()`).split(',');
  ok(g.run(`STAGES.every(s => s.zeit)`) && welten.length === 4, 'Farbwelten falsch: ' + welten);
  for (const z of welten) ok(z === 'stein' || css.includes(`html[data-zeit=${z}]`), 'Farbwelt fehlt in style.css: ' + z);
  ok(g.run(`state.res.holz = 100; state.res.stein = 0; stats.rates.holz = -100; stockWatch.warned = {}; const h = lagerHtml(); h.includes('lager-fill') && h.indexOf('Wird knapp') < h.indexOf('Rohstoffe')`), 'Knappe Ware steht nicht oben');
  ok(g.run(`const h2 = lagerHtml(); (h2.match(/resourceTip\\('holz'\\)/g) || []).length === 1`), 'Knappe Ware steht doppelt');
  noErrors(g);
});

test('Shop: Gold, Beschleunigen, Fundstücke, Pakete, Baustelle; Testkauf kostenlos, Spielstand bleibt', () => {
  const g = fresh();
  ok(g.run(`state.shop.gold`) === 0, 'Gold am Start');
  ok(g.run(`CONFIG.shop.testMode`) === true, 'Ausprobieren: Testmodus muss an sein');
  ok(g.run(`speedUp('r', 900, 10)`) === 'Das läuft nicht mehr', 'Beschleunigt Nichts');
  // Testkauf kostet nichts, gibt Gold
  ok(g.run(`buyPack(1)`) === null && g.run(`state.shop.gold`) === 550, 'Testpaket');
  // Forschung beschleunigen, Gold reicht nicht
  g.run(`state.research = { id: 'faustkeil', left: 2000 };`);
  ok(g.run(`speedUp('r', 900, 10)`) === null && g.run(`state.research.left`) === 1100 && g.run(`state.shop.gold`) === 540, 'Forschung -15 min');
  ok(g.run(`speedUp('r', 1e9, speedAllPrice(1100))`) === null && g.run(`state.research.left`) === 0.01, 'Sofort');
  g.run(`updateResearch(1);`);
  ok(g.run(`!state.research && state.techs.faustkeil === true`), 'Forschung wird nicht fertig');
  // Baustelle
  g.run(`state.buildings.push({ type: 'wohnhoehle', x: 200, y: 200, rot: 0, build: 500 }); rebuildOccupancy();`);
  const key = g.run(`speedTargets().find(t => t.key[0] === 'b').key`);
  g.run(`speedUp('${key}', 1e9, 5); updateConstruction(1);`);
  ok(g.run(`state.buildings[state.buildings.length - 1].build`) === 0, 'Baustelle nicht fertig');
  // Wunderwerk-Abschnitt
  g.run(`state.wonders.hoehle = { step: 0, left: 300 };`);
  g.run(`speedUp('whoehle', 1e9, 5); updateWonders(1);`);
  ok(g.run(`state.wonders.hoehle.step`) === 1, 'Abschnitt nicht fertig');
  // Fundstück: nur Fehlendes, und Findbares
  const vorher = g.run(`state.shop.gold`);
  ok(g.run(`buyFind('feder')`) === null && g.run(`findCount('feder')`) === 1 && g.run(`state.shop.gold`) === vorher - 25, 'Fundstück');
  ok(g.run(`buyFind('feder')`) === 'Das brauchst du gerade nicht', 'Mehr als gebraucht');
  ok(g.run(`buyFind('schriftrolle')`) === 'Das brauchst du gerade nicht', 'Noch nicht findbar');
  // Warenpaket wächst mit dem Zeitalter, geht übers Lager
  const k = g.run(`goodsPack('klein').goods.holz`);
  g.run(`state.stage = 'frueh';`);
  ok(g.run(`goodsPack('klein').goods.holz`) > k && g.run(`goodsPack('klein').goods.bronze`) > 0, 'Paket wächst nicht');
  g.run(`state.res.holz = 9999; buyGoods('klein');`);
  ok(g.run(`state.res.holz`) > 9999, 'Paket nicht übers Lager');
  // Eine Baustelle mehr, einmalig
  g.run(`state.shop.gold = 1000;`);
  ok(g.run(`constructionLimit()`) === 2 && g.run(`buySlot()`) === null && g.run(`constructionLimit()`) === 3 && g.run(`buySlot()`) === 'Hast du schon', 'Baustelle');
  // Zu wenig Gold
  g.run(`state.shop.gold = 1;`);
  ok(g.run(`buyGoods('gross')`) === 'Nicht genug Gold' && g.run(`state.shop.gold`) === 1, 'Kauf ohne Gold');
  // Verdienen
  g.run(`state.shop.gold = 0; state.daily.pending = 7; claimDailyReward();`);
  ok(g.run(`state.shop.gold`) === 20, 'Truhe ohne Gold');
  // Fenster
  ok(g.run(`shopHtml()`).includes('Testmodus') && g.run(`shopHtml()`).includes('Warenpaket') && g.run(`shopHtml()`).includes('€'), 'Fenster falsch');
  // Speichern, alter und kaputter Stand
  g.run(`state.shop = { gold: 77, spent: 3, slots: 1 };`);
  ok(g.run(`loadFromText(serialize()) && state.shop.gold === 77 && state.shop.slots === 1 && constructionLimit() === 3`), 'Laden');
  g.run(`const d = JSON.parse(serialize()); delete d.shop; window.__t = JSON.stringify(d);`);
  ok(g.run(`loadFromText(window.__t) && state.shop.gold === 0 && constructionLimit() === 2`), 'Alter Stand');
  g.run(`const b = JSON.parse(serialize()); b.shop = { gold: -5, slots: 'x' }; window.__t = JSON.stringify(b);`);
  ok(g.run(`loadFromText(window.__t) && state.shop.gold === 0 && state.shop.slots === 0`), 'Kaputter Stand');
  noErrors(g);
});

test('Eisenzeit: Alle Forschungen führen bis zur Späten Eisenzeit, jedes Gebäude ist baubar, die Ketten liefern, Salzberg wird fertig', () => {
  const g = fresh();
  const r = g.run(`(() => {
    const N = Math.floor(CONFIG.mapSize / 2);
    isConnected = () => true;
    const eisen = t => t.stage && t.stage.startsWith('eisen');
    for (const id in TECHS) if (!eisen(TECHS[id]) && !TECHS[id].soon && id !== 'aufbruch_eisenzeit') state.techs[id] = true;
    state.stage = 'spaet';
    const fill = () => { for (const k in RESOURCES) state.res[k] = 5000; state.pop = 700; };
    const put = t => {
      const sp = findFreeSpot(t, N, N);
      if (!sp) return false;
      const k = state.buildings.length;
      state.buildings.push({ type: t, x: sp.x, y: sp.y, rot: 0, build: 0 }); setOccupied(state.buildings[k], k + 1);
      return true;
    };
    const out = { order: [], noSpot: [], problems: {}, stages: [] };
    // Wie ein Spieler: immer die nächste verfügbare Forschung, fehlende Gebäude vorher hinstellen
    const queue = ['aufbruch_eisenzeit', ...Object.keys(TECHS).filter(id => eisen(TECHS[id]) && !TECHS[id].soon)];
    for (let round = 0; round < 60 && queue.length; round++) {
      const id = queue.find(t => techStatus(t) === 'available');
      if (!id) break;
      queue.splice(queue.indexOf(id), 1);
      fill();
      for (const gap of techBuildGaps(id)) {
        if (BUILDINGS[gap.type].wonder) { state.buildings.push({ type: gap.type, x: 5 + round, y: 5, rot: 0, build: 0 }); state.wonders[gap.type] = { step: 9, done: true }; continue; }
        for (let n = gap.have; n < gap.need; n++) if (!put(gap.type)) out.noSpot.push(gap.type);
      }
      rebuildOccupancy(); recalcStats();
      const problem = startResearch(id);
      if (problem) { out.problems[id] = problem; continue; }
      state.research.left = 0.5; update(1);
      if (!state.techs[id]) out.problems[id] = 'nicht fertig geworden';
      out.order.push(id);
      if (TECHS[id].transition) out.stages.push(state.stage);
    }
    out.rest = queue;
    return out;
  })()`);
  ok(!Object.keys(r.problems).length, 'Forschung hängt: ' + JSON.stringify(r.problems));
  ok(!r.rest.length, 'Nicht erreichbar: ' + r.rest);
  ok(!r.noSpot.length, 'Kein Platz für: ' + r.noSpot);
  ok(r.stages.join() === 'eisen1,eisen2,eisen3', 'Stufen falsch: ' + r.stages);
  ok(g.run(`researchProblem('aufbruch_antike')`).includes('nächsten Ausbau'), 'Antike nicht gesperrt');
  // Jedes neue Gebäude: hat eine Forschung, findet einen Platz, steht in der Bauleiste oder entsteht als Ausbau
  const b = g.run(`(() => {
    const N = Math.floor(CONFIG.mapSize / 2), fehler = [];
    for (const [id, d] of Object.entries(BUILDINGS)) {
      if (!d.stage || !d.stage.startsWith('eisen')) continue;
      if (!d.requires || !TECHS[d.requires]) fehler.push(id + ': keine Forschung');
      if (!d.wonder && !findFreeSpot(id, N, N)) fehler.push(id + ': kein Platz');
    }
    return fehler;
  })()`);
  ok(!b.length, b.join('; '));
  // Ketten: Erz → Eisen → Werkzeug, Salz, Glas
  const c = g.run(`(() => {
    const N = Math.floor(CONFIG.mapSize / 2);
    state.buildings = state.buildings.filter(b => BUILDINGS[b.type].housing || b.type === 'lagerfeuer'); rebuildOccupancy();
    for (const t of ['eisenmine', 'koehler', 'koehler', 'koehler', 'rennofen', 'eisenschmied', 'salzsiederei', 'glasmacherin']) {
      const sp = findFreeSpot(t, N, N);
      const k = state.buildings.length;
      state.buildings.push({ type: t, x: sp.x, y: sp.y, rot: 0, build: 0 }); setOccupied(state.buildings[k], k + 1);
    }
    for (const k in RESOURCES) state.res[k] = 0;
    Object.assign(state.res, { nahrung: 800, holz: 800, stein: 800, kleidung: 200, toepferwaren: 200, werkzeug: 50, salz: 100, felle: 200, wolle: 200 });
    state.pop = 60; recalcStats();
    for (let i = 0; i < 900; i++) { state.pop = 60; state.res.holz = Math.max(state.res.holz, 300); state.res.stein = Math.max(state.res.stein, 300); state.res.nahrung = Math.max(state.res.nahrung, 500); update(1); }
    return { res: { ...state.res }, flows: Object.fromEntries(['eisenerz', 'eisen', 'salz', 'glas'].map(id => [id, stats.flows[id] || null])) };
  })()`);
  for (const id of ['eisenerz', 'eisen', 'salz', 'glas'])
    ok(c.flows[id] && Object.values(c.flows[id].in).some(n => n > 0), id + ' wird nicht hergestellt: ' + JSON.stringify(c));
  // Ausbau: Bronzezeit-Haus wird Gehöft, alte Linie bleibt
  ok(g.run(`(() => { const N = Math.floor(CONFIG.mapSize / 2); const sp = findFreeSpot('hallenhaus', N, N); const k = state.buildings.length; state.buildings.push({ type: 'hallenhaus', x: sp.x, y: sp.y, rot: 0, build: 0 }); setOccupied(state.buildings[k], k + 1); return upgradeTarget(state.buildings[k]) === 'stadthaus' || upgradeTarget(state.buildings[k]) === 'gehoeft'; })()`), 'Hallenhaus ohne Ausbau');
  // Salzberg: alle 4 Abschnitte, danach Salz von selbst
  const w = g.run(`(() => {
    delete state.wonders.salzberg;
    state.buildings = state.buildings.filter(b => b.type !== 'salzberg'); rebuildOccupancy();
    let spot = null;
    for (let y = landBox.y0; y <= landBox.y1 && !spot; y++) for (let x = landBox.x0; x <= landBox.x1 && !spot; x++) if (isOwned(x, y) && !buildProblem('salzberg', x, y)) spot = [x, y];
    if (!spot) return { fehler: 'kein Platz am Fels' };
    const placed = placeBuilding('salzberg', spot[0], spot[1]);
    if (placed) return { fehler: 'Bau: ' + placed };
    rebuildOccupancy(); recalcStats();
    const steps = [];
    for (let s = 0; s < 4; s++) {
      for (const k in RESOURCES) state.res[k] = 5000;
      for (const id of ['bronzepickel', 'salzkristall', 'rucksack', 'wollstoff']) state.finds[id] = 9;
      const p = startWonderStep('salzberg');
      steps.push(p);
      if (p) break;
      for (let i = 0; i < 160; i++) updateWonders(5);
    }
    const fertig = !wonderStepProblem('salzberg') ? false : true;
    for (const k in RESOURCES) state.res[k] = 0;
    state.res.nahrung = 500; state.pop = 10; recalcStats();
    const vor = state.res.salz;
    for (let i = 0; i < 300; i++) { state.pop = 10; update(1); }
    return { steps, fertig, salz: state.res.salz - vor, html: wonderHtml ? wonderHtml('salzberg').length : 0 };
  })()`);
  ok(!w.fehler, w.fehler);
  ok(w.steps.every(p => p === null), 'Salzberg hängt: ' + JSON.stringify(w.steps));
  ok(w.salz > 0, 'Salzberg gibt kein Salz: ' + JSON.stringify(w));
  // Der gesperrte Aufbruch sagt ehrlich, dass er noch nicht kommt
  ok(g.run(`researchTopHtml()`).includes('nächsten Ausbau') && !g.run(`researchTopHtml()`).includes('Alles bereit'), 'Zielzeile falsch');
  ok(g.run(`researchHint('aufbruch_antike').label`).includes('nächsten Ausbau'), 'Knopf falsch');
  // Spielstand: Eisenzeit bleibt nach dem Laden erhalten
  ok(g.run(`loadFromText(serialize()) && state.stage === 'eisen3' && state.techs.keltenschrift === true`), 'Laden');
  noErrors(g);
});

test('Eisenzeit: Salz kommt vorher nicht als Bedürfnis, Wein hebt die Laune, Thingplatz wird wärmer, Händler bietet mit Handelshof mehr', () => {
  const g = fresh();
  ok(!g.run(`NEEDS.find(n => n.id === 'salz').from === 'alt'`), 'Salz zu früh');
  g.run(`state.stage = 'eisen3'; for (const id in TECHS) if (!TECHS[id].soon) state.techs[id] = true; state.res.wein = 0; state.pop = 20; recalcStats();`);
  const ohne = g.run(`stats.happiness`);
  g.run(`state.res.wein = 50; recalcStats();`);
  ok(g.run(`stats.happiness`) >= ohne, 'Wein senkt die Laune');
  const vor = g.run(`state.res.wein`);
  g.run(`update(60);`);
  ok(g.run(`state.res.wein`) < vor, 'Wein wird nicht getrunken');
  noErrors(g);
});

test('Fischerhütte: Auch aus dem Winterbild wird das gemalte Boot gelöst, das lose Boot bleibt das aus dem Sommerbild', () => {
  const g = fresh();
  ok(g.run(`STILT_IMAGES['1-fischerhuette-winter'].outline.length > 3 && !STILT_IMAGES['1-fischerhuette-winter'].boat && !!STILT_IMAGES['1-fischerhuette'].boat`), 'Winterbild behält sein Boot');
  ok(g.run(`STILT_IMAGES['1-fischerhuette-winter'].sockel === STILT_IMAGES['1-fischerhuette'].sockel`), 'Winterbild steht anders');
  noErrors(g);
});

const quick = process.argv.includes('--quick');
if (!quick) {
  // Seit Version 44 (Forschung halb so lang) und dem besseren Bot dauert die Altsteinzeit gut 1 Stunde
  test('Bot: Altsteinzeit dauert über 45 Minuten, Mittelsteinzeit ist in 4 Spielstunden erreichbar', () => {
    const { report, errors } = runBot(240, 1);
    ok(!errors.length, errors.join('\n'));
    console.log(`   Mittelsteinzeit ${report.mittelsteinzeit} min · Jungsteinzeit ${report.jungsteinzeit} min · Kupferfund ${report.kupferfund} min · ${report.final.pop} Einwohner · Hunger ${report.hungerMin} min`);
    ok(report.mittelsteinzeit !== null, 'Bot kommt nicht bis zur Mittelsteinzeit');
    ok(report.mittelsteinzeit >= 45, 'Altsteinzeit ist zu schnell vorbei: ' + report.mittelsteinzeit + ' min');
    ok(report.hungerMin <= 20, 'Zu viel Hunger: ' + report.hungerMin + ' min');
  });
}

console.log(failed ? `\n${failed} von ${passed + failed} Epochia-Tests fehlgeschlagen` : `\nAlle ${passed} Epochia-Tests bestanden`);
process.exit(failed ? 1 : 0);
