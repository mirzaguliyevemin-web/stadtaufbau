// Epochia – automatische Tests. Aufruf: node neu/tools/test.mjs   (Code 1 bei Fehlschlag)
import { loadGame } from './headless.mjs';
import { runBot } from './bot.mjs';

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
  ok(g.run(`state.buildings.map(b => b.type).join()`) === 'lagerfeuer,wohnhoehle,wohnhoehle', 'Startgebäude falsch');
  ok(g.run('state.pop') === 6, 'Einwohner');
  ok(g.run('stats.housing') === 6, 'Wohnplätze');
  ok(g.run('isOwned(32, 32) && isOwned(16, 16) && isOwned(47, 47) && !isOwned(15, 32)'), 'Start-Land falsch');
  ok(g.run('state.buildings.every(b => !placeProblem(b.type, b.x, b.y, state.buildings.indexOf(b)))'), 'Startgebäude stehen auf ungültigem Platz');
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
  const spot = g.run(`JSON.stringify(findFreeSpot('sammlerin', 32, 26))`);
  const r1 = g.run(`const s1 = findFreeSpot('sammlerin', 32, 26); placeBuilding('sammlerin', s1.x, s1.y)`);
  ok(r1 === null, 'Sammlerin nicht gebaut: ' + r1 + ' ' + spot);
  g.run(`const s2 = findFreeSpot('holzsammler', 26, 26); placeBuilding('holzsammler', s2.x, s2.y)`);
  const r3 = g.run(`const s3 = findFreeSpot('steinsammler', 38, 26); placeBuilding('steinsammler', s3.x, s3.y)`);
  ok(r3 && r3.includes('Baustellen'), 'Dritte Baustelle müsste warten: ' + r3);
  ok(g.run(`state.res.holz`) === 90, 'Kosten nicht abgezogen');
  g.run('for (let i = 0; i < 31; i++) update(1)');
  ok(g.run('constructionCount()') === 0, 'Baustellen nicht fertig');
  ok(g.run('state.built.sammlerin') === 1, 'Fertig-Zähler');
  const food = g.run('state.res.nahrung');
  g.run('for (let i = 0; i < 60; i++) update(1)');
  ok(g.run('stats.staff[3] === 2'), 'Sammlerin hat keine Arbeiter');
  ok(g.run('(stats.rates.nahrung || 0)') > 0, 'Nahrung wächst nicht (Rate ' + g.run('stats.rates.nahrung') + ')');
  ok(g.run('state.res.nahrung') > food, 'Nahrung nicht mehr geworden');
  noErrors(g);
});

test('Bauplatz: nicht im Wasser, nicht auf fremdem Land, nicht übereinander; Fischer nur am Wasser', () => {
  const g = fresh();
  ok(g.run(`placeProblem('sammlerin', 31, 31)`) === 'Hier steht schon etwas', 'Überlappung erlaubt');
  ok(g.run(`placeProblem('sammlerin', 2, 2)`).includes('gehört dir'), 'fremdes Land erlaubt');
  const water = g.run(`(() => { for (let y = 16; y < 48; y++) for (let x = 16; x < 48; x++) if (terrain[y * N + x] === TERRAIN.wasser.id) return [x, y]; })()`);
  ok(water, 'Kein Wasser im Startland');
  ok(g.run(`placeProblem('sammlerin', ${water[0]}, ${water[1]})`) !== null, 'Bauen im Wasser erlaubt');
  ok(g.run(`placeProblem('fischerplatz', 20, 20)`) !== null, 'Fischer fern vom Wasser erlaubt');
  ok(g.run(`(() => { for (let y = 16; y < 46; y++) for (let x = 16; x < 46; x++) if (!placeProblem('fischerplatz', x, y)) return true; return false; })()`), 'Kein Platz für den Fischer am Fluss');
});

test('Baum fällen und Felsen abtragen geben Holz/Stein und machen Platz', () => {
  const g = fresh();
  const tree = g.run(`(() => { for (let y = 16; y < 48; y++) for (let x = 16; x < 48; x++) if (terrain[y * N + x] === TERRAIN.wald.id) return [x, y]; })()`);
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
  ok(bar().includes('fischerplatz🔒'), 'Gesperrtes der nächsten Stufe fehlt: ' + bar());
  ok(!bar().includes('acker'), 'Jungsteinzeit-Gebäude zu früh sichtbar');
  ok(!bar().includes('lagerfeuer') && !bar().includes('mammutjaegerlager'), 'Nicht baubares in der Leiste');
  g.run(`state.techs.faustkeil = true; state.techs.fellzelte = true;`);
  ok(bar().includes('fellzelt') && !bar().includes('wohnhoehle'), 'Nach „Fellzelte“ nur Fellzelt erwartet: ' + bar());
});

test('Forschung: kostet Wissen, nur eine gleichzeitig, Übergang öffnet die nächste Stufe', () => {
  const g = fresh();
  ok(g.run(`startResearch('feuer_hueten')`).includes('Es fehlt'), 'ohne Wissen erlaubt');
  g.run(`state.res.wissen = 100;`);
  ok(g.run(`startResearch('speerspitzen')`).startsWith('Erst'), 'Voraussetzung ignoriert');
  ok(g.run(`startResearch('feuer_hueten')`) === null, 'Start ging nicht');
  ok(g.run(`startResearch('faustkeil')`).includes('läuft schon'), 'Zwei Forschungen gleichzeitig');
  ok(g.run('state.res.wissen') === 95, 'Wissen nicht abgezogen');
  g.run('for (let i = 0; i < 46; i++) update(1)');
  ok(g.run('state.techs.feuer_hueten === true && state.research === null'), 'Forschung nicht fertig');
  g.run(`for (const id of ['flechtkoerbe','speerspitzen','fellzelte','faustkeil','hoehlenmalerei']) state.techs[id] = true; state.res.nahrung = 100; state.res.wissen = 100;`);
  ok(g.run(`startResearch('mittelsteinzeit')`).includes('15 Einwohner'), 'Einwohner-Bedingung fehlt');
  g.run(`state.pop = 15; startResearch('mittelsteinzeit'); for (let i = 0; i < 121; i++) update(1);`);
  ok(g.run('state.stage') === 'mittel', 'Stufe nicht gewechselt');
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
  g.run('for (let i = 0; i < 31; i++) update(1)');
  ok(g.run('housingOf("fellzelt")') === 5 && g.run('stats.housing') === 8, 'Wohnplätze falsch: ' + g.run('stats.housing'));
  // Grubenhaus (2×2) → Langhaus (3×3) neben einem Hindernis
  g.run(`state.techs.grubenhaus = state.techs.langhausbau = true; state.buildings[1].type = 'grubenhaus'; rebuildOccupancy();`);
  const b = g.run('JSON.stringify(state.buildings[1])');
  const blocked = g.run(`const bb = state.buildings[1]; addBuilding('feuerplatz', bb.x + 2, bb.y, false, true); rebuildOccupancy(); upgradeProblem(1)`);
  ok(blocked && blocked.includes('mehr Platz'), 'Langhaus trotz Hindernis erlaubt: ' + blocked + ' ' + b);
  noErrors(g);
});

test('Verschieben und Drehen', () => {
  const g = fresh();
  const spot = g.run(`JSON.stringify(findFreeSpot('wohnhoehle', 24, 24))`);
  const r = g.run(`const sp = ${spot}; moveBuilding(1, sp.x, sp.y, true)`);
  ok(r === null, 'Verschieben ging nicht: ' + r);
  ok(g.run(`state.buildings[1].rot === true && buildingAt(${JSON.parse(spot).x}, ${JSON.parse(spot).y}) === 1`), 'Platz/Drehung falsch');
  ok(g.run(`buildingAt(28, 32)`) === -1, 'Alter Platz noch belegt');
  ok(g.run(`moveBuilding(1, 31, 31, false)`) !== null, 'Verschieben auf Lagerfeuer erlaubt');
  // über die Bedienung: hochheben, ✔
  g.run(`liftBuilding(2); ghost.x -= 6; confirmGhost();`);
  ok(g.run('ghost === null && state.buildings[2].x === 25'), 'Hochheben + ✔ ging nicht');
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
  const g = fresh();
  ok(g.run('stats.needs.waerme') === 1, 'Startwohnungen kalt');
  g.run(`addBuilding('wohnhoehle', 17, 17, false, true); rebuildOccupancy(); recalcStats();`);
  ok(g.run('stats.needs.waerme') < 1, 'Ferne Wohnung trotzdem warm');
  ok(g.run('stats.happiness') < 100, 'Zufriedenheit unverändert');
});

test('Speichern und Laden ergibt denselben Stand', () => {
  const g = fresh();
  g.run(`state.res.holz = 77.5; state.techs.faustkeil = true; state.research = { id: 'feuer_hueten', left: 12 }; placeBuilding('sammlerin', findFreeSpot('sammlerin', 30, 24).x, findFreeSpot('sammlerin', 30, 24).y); state.plots[0] = 0; saveGame();`);
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

test('Offline-Fortschritt: läuft weiter, höchstens 8 Stunden, verstellte Uhr schadet nicht', () => {
  const g = fresh();
  g.run(`state.res.holz = 100; const sp = findFreeSpot('holzsammler', 26, 26); placeBuilding('holzsammler', sp.x, sp.y); for (let i = 0; i < 40; i++) update(1);`);
  const holz = g.run('state.res.holz');
  const r = g.run('JSON.stringify(applyOfflineProgress(Date.now() - 3600 * 1000))');
  ok(r && JSON.parse(r).seconds === 3600, 'Offline nicht gelaufen');
  ok(g.run('state.res.holz') > holz, 'kein Holz offline');
  const r2 = g.run('JSON.stringify(applyOfflineProgress(Date.now() - 100 * 3600 * 1000))');
  ok(JSON.parse(r2).seconds === 8 * 3600, 'nicht auf 8 h begrenzt');
  ok(g.run('applyOfflineProgress(Date.now() + 3600 * 1000)') === null, 'Zukunft gezählt');
  g.run('update(-50); update(NaN); update(Infinity)');
  ok(g.run('Number.isFinite(state.res.holz) && Number.isFinite(state.playTime)'), 'Kaputte Zeit macht Werte kaputt');
  noErrors(g);
});

test('Tägliche Belohnung: Reihe von 7 Tagen, verpasster Tag fängt neu an', () => {
  const g = fresh();
  const day = d => g.run(`checkDailyReward(new Date(2026, 9, ${d}, 10))`);
  ok(day(1) === 1, 'Tag 1');
  ok(day(1) === 1, 'zweimal am selben Tag');
  g.run('claimDailyReward()');
  ok(day(1) === 0, 'nach Abholen nochmal');
  ok(day(2) === 2 && day(3) === 3, 'Reihe zählt nicht');
  ok(day(5) === 1, 'Verpasster Tag nicht zurückgesetzt');
  for (let d = 6; d <= 11; d++) day(d);
  ok(day(12) === 1, 'Nach Tag 7 wieder Tag 1 erwartet, ist ' + day(12));
  g.run(`state.daily = { last: '', streak: 0, pending: 0 }; checkDailyReward(new Date(2026, 9, 1)); state.res.holz = 0; claimDailyReward();`);
  ok(g.run('state.res.holz') === 20, 'Belohnung nicht gutgeschrieben');
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

test('Land kaufen: nur neben eigenem Land, Preis steigt', () => {
  const g = fresh();
  ok(!g.run('canBuyPlot(0)'), 'Ecke kaufbar');
  const p = g.run('plotOf(10, 20)');
  ok(g.run(`canBuyPlot(${p})`), 'Nachbarland nicht kaufbar');
  g.run('state.res.holz = 1000; state.res.nahrung = 1000;');
  const price1 = g.run('JSON.stringify(plotPrice())');
  ok(g.run(`buyPlot(${p})`) && g.run('isOwned(10, 20)'), 'Kauf ging nicht');
  ok(g.run('JSON.stringify(plotPrice())') !== price1, 'Preis steigt nicht');
});

test('Einstieg: Schritte folgen den Handlungen, überspringen geht', () => {
  const g = fresh();
  g.run('state.tutorial = 0; state.res.holz = 200; state.res.stein = 200; state.res.wissen = 50; renderTutorial();');
  g.run('advanceTutorial()');   // Willkommen
  ok(g.run('tutorialStep().id') === 'sammlerin', 'Schritt 2 erwartet');
  g.run(`beginBuild('sammlerin'); confirmGhost();`);
  ok(g.run('tutorialStep().id') === 'antippen', 'Nach Sammlerin: antippen');
  g.run('for (let i = 0; i < 31; i++) update(1); emit("tapped", state.buildings[3]);');
  ok(g.run('tutorialStep().id') === 'holzsammler', 'Nach Antippen: Holzsammler');
  g.run(`beginBuild('holzsammler'); confirmGhost();`);
  g.run('liftBuilding(3); cancelGhost();');
  ok(g.run('tutorialStep().id') === 'wohnhoehle', 'Nach Hochheben: Wohnhöhle, ist ' + g.run('tutorialStep().id'));
  g.run('for (let i = 0; i < 31; i++) update(1);');
  g.run(`beginBuild('wohnhoehle'); confirmGhost();`);
  ok(g.run('tutorialStep().id') === 'forschung', 'Forschung erwartet');
  g.run(`startResearch('feuer_hueten')`);
  ok(g.run('tutorialStep().id') === 'auftraege', 'Aufträge erwartet');
  g.run('openQuests(); closePage();');
  ok(g.run('tutorialStep().id') === 'fertig', 'Ende erwartet');
  g.run('advanceTutorial()');
  ok(g.run('state.tutorial') === -1, 'Einstieg nicht beendet');
  g.run('restartTutorial(); skipTutorial();');
  ok(g.run('state.tutorial') === -1, 'Überspringen ging nicht');
  noErrors(g);
});

test('Zeichnen und Oberfläche laufen ohne Fehler (Baustelle, Geist, Pfadmodus, Fenster)', () => {
  const g = fresh();
  g.run(`state.res.holz = 500; state.res.stein = 500;
    beginBuild('sammlerin'); confirmGhost(); beginBuild('jaegerlager'); drawScene(0.1);
    cancelGhost(); beginBuild('pfad'); drawScene(0.1); cancelGhost();
    for (let i = 0; i < 70; i++) update(1);
    drawScene(0.1); renderAll(); showInfo(3); positionInfo(); showBuildingWindow(3); showBuildingWindow(0); askDemolish(3);
    showPlotDialog(plotOf(10, 20)); openQuests(); openMenu(); openSlots(true); showExport(); showDailyReward();
    cam.zoom = ZOOM_MIN; drawScene(0.1); cam.zoom = ZOOM_MAX; drawScene(0.1); handleTap(400, 200);`);
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

const quick = process.argv.includes('--quick');
if (!quick) {
  test('Bot: die ganze Steinzeit ist in 90 Spielminuten durchspielbar', () => {
    const { report, errors } = runBot(90, 1);
    ok(!errors.length, errors.join('\n'));
    console.log(`   Mittelsteinzeit ${report.mittelsteinzeit} min · Jungsteinzeit ${report.jungsteinzeit} min · Kupferfund ${report.kupferfund} min · ${report.final.pop} Einwohner · Hunger ${report.hungerMin} min`);
    ok(report.mittelsteinzeit !== null && report.jungsteinzeit !== null, 'Bot kommt nicht bis zur Jungsteinzeit');
    ok(report.hungerMin <= 5, 'Zu viel Hunger: ' + report.hungerMin + ' min');
  });
}

console.log(failed ? `\n${failed} von ${passed + failed} Epochia-Tests fehlgeschlagen` : `\nAlle ${passed} Epochia-Tests bestanden`);
process.exit(failed ? 1 : 0);
