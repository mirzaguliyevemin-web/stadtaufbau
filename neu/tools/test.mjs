// Epochia – automatische Tests. Aufruf: node neu/tools/test.mjs   (Code 1 bei Fehlschlag)
import { loadGame } from './headless.mjs';
import fs from 'node:fs';
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
  ok(g.run(`state.buildings.map(b => b.type).join()`) === 'lagerfeuer,wohnhoehle,wohnhoehle,pfad,pfad', 'Startgebäude falsch');
  ok(g.run('state.buildings.every((b, i) => isConnected(i))'), 'Start-Wohnhöhlen ohne Weg');
  ok(g.run('state.pop') === 6, 'Einwohner');
  ok(g.run('stats.housing') === 6, 'Wohnplätze');
  ok(g.run('isOwned(64, 64) && isOwned(48, 48) && isOwned(79, 79) && !isOwned(47, 64)'), 'Start-Land falsch');
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
  const spot = g.run(`JSON.stringify(findFreeSpot('sammlerin', 64, 58))`);
  const r1 = g.run(`const s1 = findFreeSpot('sammlerin', 64, 58); placeBuilding('sammlerin', s1.x, s1.y)`);
  ok(r1 === null, 'Sammlerin nicht gebaut: ' + r1 + ' ' + spot);
  g.run(`const s2 = findFreeSpot('holzsammler', 58, 58); placeBuilding('holzsammler', s2.x, s2.y)`);
  const r3 = g.run(`const s3 = findFreeSpot('steinsammler', 70, 58); placeBuilding('steinsammler', s3.x, s3.y)`);
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
  ok(g.run(`placeProblem('sammlerin', 63, 63)`) === 'Hier steht schon etwas', 'Überlappung erlaubt');
  ok(g.run(`placeProblem('sammlerin', 2, 2)`).includes('gehört dir'), 'fremdes Land erlaubt');
  const water = g.run(`(() => { for (let y = 48; y < 80; y++) for (let x = 48; x < 80; x++) if (terrain[y * N + x] === TERRAIN.wasser.id) return [x, y]; })()`);
  ok(water, 'Kein Wasser im Startland');
  ok(g.run(`placeProblem('sammlerin', ${water[0]}, ${water[1]})`) !== null, 'Bauen im Wasser erlaubt');
  ok(g.run(`placeProblem('fischerplatz', 52, 52)`) !== null, 'Fischer fern vom Wasser erlaubt');
  ok(g.run(`(() => { for (let y = 48; y < 78; y++) for (let x = 48; x < 78; x++) if (!placeProblem('fischerplatz', x, y)) return true; return false; })()`), 'Kein Platz für den Fischer am Fluss');
});

test('Baum fällen und Felsen abtragen geben Holz/Stein und machen Platz', () => {
  const g = fresh();
  const tree = g.run(`(() => { for (let y = 48; y < 80; y++) for (let x = 48; x < 80; x++) if (terrain[y * N + x] === TERRAIN.wald.id) return [x, y]; })()`);
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
  // Grubenhaus (2×2) → Langhaus (3×3) neben einem Hindernis
  g.run(`state.techs.grubenhaus = state.techs.langhausbau = true; state.buildings[1].type = 'grubenhaus'; rebuildOccupancy();`);
  const b = g.run('JSON.stringify(state.buildings[1])');
  const blocked = g.run(`const bb = state.buildings[1]; addBuilding('feuerplatz', bb.x + 2, bb.y, false, true); rebuildOccupancy(); upgradeProblem(1)`);
  ok(blocked && blocked.includes('mehr Platz'), 'Langhaus trotz Hindernis erlaubt: ' + blocked + ' ' + b);
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
  const spot = g.run(`JSON.stringify(findFreeSpot('wohnhoehle', 56, 56))`);
  const r = g.run(`const sp = ${spot}; moveBuilding(1, sp.x, sp.y, true)`);
  ok(r === null, 'Verschieben ging nicht: ' + r);
  ok(g.run(`state.buildings[1].rot === 1 && buildingAt(${JSON.parse(spot).x}, ${JSON.parse(spot).y}) === 1`), 'Platz/Drehung falsch');
  ok(g.run(`buildingAt(28, 32)`) === -1, 'Alter Platz noch belegt');
  ok(g.run(`moveBuilding(1, 31, 31, false)`) !== null, 'Verschieben auf Lagerfeuer erlaubt');
  // über die Bedienung: hochheben, ✔
  g.run(`liftBuilding(2); ghost.x -= 6; confirmGhost();`);
  ok(g.run('ghost === null && state.buildings[2].x === 57'), 'Hochheben + ✔ ging nicht');
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
  g.run(`addBuilding('wohnhoehle', 49, 49, false, true); rebuildOccupancy(); buildRoute(state.buildings.length - 1); recalcStats();`);
  ok(g.run('isConnected(5)'), 'ferne Wohnung nicht angeschlossen');
  ok(g.run('stats.needs.waerme') < 1, 'Ferne Wohnung trotzdem warm');
  ok(g.run('stats.happiness') < 100, 'Zufriedenheit unverändert');
});

test('Speichern und Laden ergibt denselben Stand', () => {
  const g = fresh();
  g.run(`state.res.holz = 77.5; state.techs.faustkeil = true; state.research = { id: 'feuer_hueten', left: 12 }; placeBuilding('sammlerin', findFreeSpot('sammlerin', 62, 56).x, findFreeSpot('sammlerin', 62, 56).y); state.plots[0] = 0; saveGame();`);
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
  g.run(`state.res.holz = 100; const sp = findFreeSpot('holzsammler', 58, 58); placeBuilding('holzsammler', sp.x, sp.y); buildRoute(5); for (let i = 0; i < 40; i++) update(1);`);
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
  const p = g.run('plotOf(42, 52)');
  ok(g.run(`canBuyPlot(${p})`), 'Nachbarland nicht kaufbar');
  g.run('state.res.holz = 1000; state.res.nahrung = 1000;');
  const price1 = g.run('JSON.stringify(plotPrice())');
  ok(g.run(`buyPlot(${p})`) && g.run('isOwned(42, 52)'), 'Kauf ging nicht');
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
    showPlotDialog(plotOf(42, 52)); openQuests(); openMenu(); openSlots(true); showExport(); showDailyReward();
    cam.zoom = ZOOM_MIN; drawScene(0.1); cam.zoom = ZOOM_MAX; drawScene(0.1); handleTap(400, 200);`);
  noErrors(g);
});

test('Trampelpfad: ohne Weg kein Wohnen und keine Arbeit, Weg bauen verbindet, Abreißen trennt', () => {
  const g = fresh();
  g.run('state.res.holz = 200; state.res.stein = 200;');
  // Gebäude weiter weg ohne Weg
  const placed = g.run(`const far = findFreeSpot('holzsammler', 53, 74); placeBuilding('holzsammler', far.x, far.y)`);
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
      const sp = findFreeSpot(type, 62, 62);
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
  g.run(`const sp = findFreeSpot('jaegerlager', 62, 62); placeBuilding('jaegerlager', sp.x, sp.y);
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
  g.run(`state.res.holz = 50; for (let x = 52; x < 58; x++) placeBuilding('pfad', x, 62); drawPaths(visibleRange()); drawScene(0.1);`);
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
    for (const t of ['holzsammler', 'steinsammler', 'sammlerin']) { const sp = findFreeSpot(t, 62, 62); placeBuilding(t, sp.x, sp.y); const k = state.buildings.length - 1; finishBuilding(state.buildings[k]); buildRoute(k); }
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
  g.run(`for (const k in state.res) state.res[k] = 999; state.pop = 30; state.stage = 'jung'; for (const id in TECHS) state.techs[id] = true;
    for (const t of ['fischerplatz', 'hoehlenmaler', 'fellmacherin', 'steinschlaeger', 'toepferei', 'tongrube']) {
      const sp = findFreeSpot(t, 62, 62); if (!sp) continue; placeBuilding(t, sp.x, sp.y); const k = state.buildings.length - 1; finishBuilding(state.buildings[k]); buildRoute(k); }
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
    const sp = findFreeSpot('steinsammler', 53, 53); placeBuilding('steinsammler', sp.x, sp.y);
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
  const r = g.run(`(() => {
    const trees = () => { let k = 0; for (let i = 0; i < N * N; i++) if (terrain[i] === TERRAIN.wald.id) k++; return k; };
    state.res.holz = 999; state.res.stein = 999; state.pop = 20;
    const sp = findFreeSpot('holzsammler', 60, 60); placeBuilding('holzsammler', sp.x, sp.y);
    let k = state.buildings.length - 1; finishBuilding(state.buildings[k]); buildRoute(k);
    state.res.holz = 0;   // Lager leer – bei vollem Lager wird nicht gefällt
    const before = trees();
    for (let i = 0; i < 20 * 60; i++) update(1);
    const felled = before - trees();
    const sp2 = findFreeSpot('pflanzerin', 66, 66); placeBuilding('pflanzerin', sp2.x, sp2.y);
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
    for (let y = 40; y < 90 && !spot; y++) for (let x = 40; x < 90 && !spot; x++) if (!placeProblem('fischerplatz', x, y) && isOwned(x, y)) spot = { x, y };
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
    state.res.holz = 999; cam.zoom = 1; centerOnTile(56, 56);
    let tree = null; for (let y = 50; y < 78 && !tree; y++) for (let x = 50; x < 78 && !tree; x++) if (terrain[y * N + x] === TERRAIN.wald.id && isOwned(x, y) && !occ[y * N + x]) tree = { x, y };
    beginBuild('sammlerin'); ghost.x = tree.x; ghost.y = tree.y;
    const p = tileToScreen(tree.x + 0.5, tree.y + 0.5); handleTap(p.x, p.y);
    const felled = terrain[tree.y * N + tree.x] === TERRAIN.gras.id && ghost.x === tree.x;
    cancelGhost();
    for (let y = 52; y <= 60; y++) for (let x = 52; x <= 60; x++) if (!occ[y * N + x]) terrain[y * N + x] = TERRAIN.gras.id;
    gesture = { mode: 'path' };
    const a = tileToScreen(52.5, 52.5), b = tileToScreen(58.5, 57.5);
    paintPath(a.x, a.y); paintPath(b.x, b.y);
    // zusammenhängend: vom Start aus über Pfade das Ziel erreichbar
    const seen = new Set(['52,52']), q = [[52, 52]];
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const k = (x+dx) + ',' + (y+dy); if (!seen.has(k) && isPathAt(x+dx, y+dy)) { seen.add(k); q.push([x+dx, y+dy]); } } }
    gesture = null;
    return [felled, seen.has('58,57')];
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
    out.next = techDetailHtml().includes('Bronzezeit');
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
  ok(r.trans === 'kupferfund' && r.open > 0, 'Ziel falsch: ' + JSON.stringify(r));
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

test('Karte: neues Spiel hat breiten, kurvigen Fluss mit Wasserfall; alter Stand behält seine Karte', () => {
  const g = fresh();
  for (const seed of [4242, 1, 77, 999]) {
    const r = g.run(`(() => { startNewGame(${seed}); let water = 0, own = 0, minW = 99, maxX = 0, minX = N;
      for (let y = 8; y < N - 8; y++) { let c = 0, sx = 0; for (let x = 0; x < N; x++) if (terrain[y * N + x] === TERRAIN.wasser.id) { c++; sx += x; } if (c) { minW = Math.min(minW, c); maxX = Math.max(maxX, sx / c); minX = Math.min(minX, sx / c); } }
      for (let y = 48; y < 80; y++) for (let x = 48; x < 80; x++) if (terrain[y * N + x] === TERRAIN.wasser.id) own++;
      return { gen: state.mapGen, own, minW, swing: maxX - minX, fall: !!mapFeatures.fall, campOk: state.buildings.every((b, i) => !b.build && !placeProblem(b.type, b.x, b.y, i)), depth: Math.max(...waterDepth) }; })()`);
    ok(r.gen === 2, 'neues Spiel sollte mapGen 2 haben');
    ok(r.own > 30, 'Fluss sollte durchs Startland gehen: ' + JSON.stringify(r));
    ok(r.minW >= 2, 'Fluss überall durchgehend: ' + JSON.stringify(r));
    ok(r.swing > 25, 'Fluss schlängelt zu wenig: ' + JSON.stringify(r));
    ok(r.fall, 'kein Wasserfall: ' + seed);
    ok(r.campOk, 'Lager steht falsch: ' + JSON.stringify(r));
    ok(r.depth > 2.5, 'keine tiefen Stellen: ' + JSON.stringify(r));
  }
  // alter Stand ohne mapGen: Karte wie früher (alte Erzeugung), mapGen bleibt beim Speichern und Laden erhalten
  const old = g.run(`(() => { startNewGame(4242); const d = JSON.parse(serialize()); delete d.mapGen; loadFromText(JSON.stringify(d));
    const expect = generateTerrain(state.seed); let diff = 0; for (let i = 0; i < N * N; i++) if (baseTerrain[i] !== expect[i]) diff++;
    return { gen: state.mapGen, diff, fall: mapFeatures.fall }; })()`);
  ok(old.gen === 1 && old.diff === 0 && !old.fall, 'alter Stand hat andere Karte: ' + JSON.stringify(old));
  const neu = g.run(`(() => { startNewGame(99); const before = baseTerrain.slice(); loadFromText(serialize()); let diff = 0; for (let i = 0; i < N * N; i++) if (baseTerrain[i] !== before[i]) diff++; return { gen: state.mapGen, diff, fall: !!mapFeatures.fall }; })()`);
  ok(neu.gen === 2 && neu.diff === 0 && neu.fall, 'neuer Stand ändert sich beim Laden: ' + JSON.stringify(neu));
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

test('Arbeiter laufen nie übers Wasser (Wegsuche über Land und Brücken)', () => {
  const g = fresh();
  const r = g.run(`(() => { state.res.holz = 999; state.res.stein = 999; state.pop = 30;
    for (const t of ['holzsammler', 'steinsammler', 'sammlerin', 'holzsammler']) { const sp = findFreeSpot(t, 70, 62); placeBuilding(t, sp.x, sp.y); const k = state.buildings.length - 1; finishBuilding(state.buildings[k]); buildRoute(k); }
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
  const old = fixture.save, oldN = 64, off = 32;
  const g = fresh();
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
  ok(g.run('isOwned(42, 52) && isOwned(64, 64)') && !g.run('isOwned(10, 20)'), 'Land nicht mitgewandert');
  ok(g.run('state.hunt.cx') === 62 && g.run('state.hunt.x') === 72, 'Jagd nicht verschoben');
  ok(g.run('state.buildings.every((b, i) => !placeProblem(b.type, b.x, b.y, i))'), 'Gebäude stehen nach dem Umzug falsch');
  ok(g.run('state.buildings.every((b, i) => isConnected(i))'), 'Wege nach dem Umzug unterbrochen');
  // ein zweites Laden verschiebt nicht noch einmal
  ok(g.run('loadFromText(serialize()) && state.buildings[0].x') === old.buildings[0].x + off, 'doppelt verschoben');
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
