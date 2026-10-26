// Balancing-Bot: spielt das Spiel im Zeitraffer mit der echten Spiellogik wie ein geübter Spieler.
// Wird von tools/bot.mjs und tools/test.mjs im Spiel ausgeführt (Zugriff auf state, update, placeBuilding …).
// Rückgabe: Bericht mit Meilensteinen, Engpässen und Auffälligkeiten.
function runBalanceBot(minutes = 90) {
  const snapshots = [];
  const out = (...a) => snapshots.push(a.join(' '));
  localStorage.clear(); newGame(); recalcStats();
  const C = N / 2;
  const slots = [];
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    if (y % 3 !== 0) slots.push({ x, y, d: Math.hypot(x - C + 0.5, y - C + 0.5) });
  }
  slots.sort((a, b) => a.d - b.d);
  const roadFor = (x, y) => (y % 3 === 1 ? [x, y - 1] : [x, y + 1]);
  const freeSlots = (type = 'house') => {
    const [w, h] = footprintSize(type);
    return slots.filter(s => {
      if (h > 1 && s.y % 3 !== 1) return false;               // große Gebäude: Ecke direkt unter einer Straßenreihe
      if (!canPlaceAt(type, s.x, s.y)) return false;
      const [rx, ry] = roadFor(s.x, s.y);
      const rc = getCell(rx, ry);
      return isOwned(rx, ry) && ((rc === null && !terrainBlocked(rx, ry)) || (rc && BUILDINGS[rc.type].isRoad));
    });
  };
  const want = {};
  let upgrades = 0;
  const plotsBoughtAt = [];
  let bought = 0;
  const built = {};

  // Holz, das für den kommenden/laufenden Winter zurückgelegt wird
  function woodReserve() {
    const id = season().id;
    if (id === 'autumn') return heatingRate() * CONFIG.seasonLength * 1.1;
    if (id === 'winter') return heatingRate() * seasonLeft() * 1.1;
    return 0;
  }

  function tryBuild(type, slot) {
    const def = BUILDINGS[type];
    if (!isUnlocked(type)) return false;
    // Alle Baustellen belegt: warten
    if (buildTimeOf(type) > 0 && constructionCount() >= CONFIG.maxConstructions) {
      want.site = (want.site || 0) + 1;
      return false;
    }
    // Keine Betriebe ohne Leute (außer Farmen und Gelehrten-Gebäude)
    if (def.jobs && !FOOD_FIRST.includes(type) && !def.jobs.scholar && stats.unemployed < 1) {
      want.people = (want.people || 0) + 1;
      return false;
    }
    // Betriebe mit Geländebonus an den besten der nahen Plätze stellen (Sägewerk am Wald, Steinbruch am Berg …)
    if (!slot && TERRAIN_BONUS[type]) {
      const [fw, fh] = footprintSize(type);
      let best = -1;
      for (const s of freeSlots(type).slice(0, 120)) {
        const b = terrainBonusOf(type, s.x, s.y, fw, fh) - s.d * 0.004;
        if (b > best) { best = b; slot = s; }
      }
    }
    slot = slot || freeSlots(type)[0];
    if (!slot) return false;
    if (!canPlaceAt(type, slot.x, slot.y)) return false;
    const [rx, ry] = roadFor(slot.x, slot.y);
    const needRoad = getCell(rx, ry) === null;
    const cost = { ...costOf(type) };
    if (needRoad) for (const [id, n] of Object.entries(costOf('road'))) cost[id] = (cost[id] || 0) + n;
    if (cost.wood && state.resources.wood - cost.wood < woodReserve()) {
      want.reserve = (want.reserve || 0) + 1;
      return false;
    }
    if (!canAfford(cost)) {
      for (const [id, n] of Object.entries(cost)) if (state.resources[id] < n) want[id] = (want[id] || 0) + 1;
      return false;
    }
    if (needRoad) placeBuilding(rx, ry, 'road');
    const ok = placeBuilding(slot.x, slot.y, type);
    if (ok) built[type] = (built[type] || 0) + 1;
    return ok;
  }

  function rate(id) {
    let r = 0;
    state.grid.forEach((c, i) => {
      const def = c && BUILDINGS[c.type];
      if (!def || !def.interval || !isActive(i % N, Math.floor(i / N))) return;
      r += (buildingOutput(c.type)[id] || 0) / def.interval;
      if (def.consumes) r -= (def.consumes[id] || 0) / def.interval;
    });
    return r;
  }

  function housesList() {
    const list = [];
    state.grid.forEach((c, i) => {
      if (c && BUILDINGS[c.type].population && isActive(i % N, Math.floor(i / N))) list.push({ i, x: i % N, y: Math.floor(i / N) });
    });
    return list;
  }

  function bestServiceSlot(type) {
    const def = BUILDINGS[type];
    const area = areaOf(def);
    const houses = housesList().filter(h => area.key === 'fire'
      ? !fireProtected(h.x, h.y)
      : !(stats.houseNeeds.get(h.i) || new Set()).has(area.key));
    if (houses.length < 2) return null;
    let best = null, bestScore = 0;
    for (const s of freeSlots(type).slice(0, 250)) {
      let score = 0;
      const [fw, fh] = footprintSize(type);
      for (const h of houses) if (rectGap(s.x, s.y, fw, fh, h.x, h.y, 1, 1) <= area.radius) score++;
      if (def.beautifies) for (const h of housesList()) if (rectGap(s.x, s.y, fw, fh, h.x, h.y, 1, 1) <= 1 && !isNiceHouse(h.x, h.y)) score += 1;
      if (score > bestScore) { best = s; bestScore = score; }
    }
    return bestScore >= 3 ? best : null;
  }

  // Steinzeit: Hütten, Sammlerinnen/Jäger, Holzfäller, Steinsammler, Feuerstellen – dann aufsteigen
  function stoneAge() {
    const pop = state.population, cap = stats.capacity;
    const huts = countBuildings('hut');
    const foodRate = rate('food') - pop * CONFIG.foodPerCitizen;
    const futureNeed = (cap - pop + 3) * CONFIG.foodPerCitizen;
    const next = nextAge();
    const saving = next && pop >= next.need.population;   // genug Einwohner: auf den Aufstieg sparen
    const tasks = [];
    if ((pop > 0 || countBuildings('gatherer') === 0) && (foodRate < futureNeed || (state.resources.food < 10 && foodRate <= 0.05))) {
      tasks.push([countBuildings('gatherer') <= countBuildings('hunter') ? 'gatherer' : 'hunter']);
    }
    if (!saving && (pop >= cap - 2 || stats.unemployed < 2) && stats.happiness >= HAPPINESS.growAbove) tasks.push(['hut']);
    if (countBuildings('woodcutter') < 1 + Math.floor(huts / 4)) tasks.push(['woodcutter']);
    if (huts >= 2 && countBuildings('stonecutter') < 1 + Math.floor(huts / 5)) tasks.push(['stonecutter']);
    if (pop >= 4) {
      const slot = bestServiceSlot('fireplace');
      if (slot) tasks.push(['fireplace', slot]);
    }
    if (huts >= 3 && countBuildings('painter') < 1) tasks.push(['painter']);
    if (pop >= 6) {
      const slot = bestServiceSlot('watertrough');
      if (slot) tasks.push(['watertrough', slot]);
    }
    let builds = 0;
    for (const [type, slot] of tasks) {
      if (builds >= 2) break;
      if (tryBuild(type, slot)) builds++;
    }
  }

  function decide(t) {
    for (const q of activeQuests()) if (questProgress(q).done) claimQuest(q.id);
    state.grid.forEach((c, i) => {
      if (c?.fire && !c.fire.brigade && canAfford(extinguishCost())) extinguish(i % N, Math.floor(i / N));
    });
    if (canAdvanceAge()) {
      advanceAge();
      ageTimes[AGES[state.age].id] = +(t / 60).toFixed(1);
    }
    if (state.age === 0) return stoneAge();
    const pop = state.population, cap = stats.capacity;
    const houses = countBuildings('house');
    const foodRate = rate('food') - pop * CONFIG.foodPerCitizen;
    const futureNeed = (cap - pop + 4) * CONFIG.foodPerCitizen;

    if (stats.happiness >= 72 && state.taxLevel < 2) setTaxLevel(state.taxLevel + 1);
    else if (stats.happiness < 55 && state.taxLevel > 0) setTaxLevel(state.taxLevel - 1);

    if (!state.research) {
      const avail = Object.keys(TECHS).filter(id => techStatus(id) === 'available' && canAfford(TECHS[id].cost))
        .sort((a, b) => (TECHS[a].cost.knowledge || 0) - (TECHS[b].cost.knowledge || 0));
      if (avail[0]) startResearch(avail[0]);
    }

    // Land dazukaufen, wenn der Platz knapp wird (nächstgelegene kaufbare Fläche)
    if (freeSlots('farm').length < 6) {
      // nächstgelegene kaufbare Fläche, Berge und Seen machen sie weniger attraktiv
      const S = CONFIG.plotSize;
      const blocked = p => countTerrainNear((p % P) * S, Math.floor(p / P) * S, S, S, 'rock', 0) + countTerrainNear((p % P) * S, Math.floor(p / P) * S, S, S, 'water', 0);
      const score = p => Math.hypot(p % P - P / 2 + 0.5, Math.floor(p / P) - P / 2 + 0.5) + blocked(p) / 16;
      const buyable = state.plots.map((_, p) => p).filter(canBuyPlot).sort((a, b) => score(a) - score(b));
      if (buyable.length && state.resources.money >= plotPrice().money + 30) { buyPlot(buyable[0]); plotsBoughtAt.push((t / 60).toFixed(1)); }
      else if (buyable.length) want.land = (want.land || 0) + 1;
    }
    // Banditenlager ausheben, sobald die Wachen stark genug sind
    for (let ci = state.camps.length - 1; ci >= 0; ci--) {
      if (cityDefense() >= state.camps[ci].strength && canAfford(campCost(state.camps[ci]))) clearCamp(ci);
    }
    const tasks = [];
    const farmsOk = pop > 0 || countBuildings('farm') === 0;   // ohne Einwohner liefert keine Farm etwas
    if (farmsOk && (foodRate < futureNeed || (state.resources.food < 10 && foodRate <= 0.05))) tasks.push(['farm']);
    if ((pop >= cap - 2 || stats.jobs.ratio < 1 || stats.unemployed < 3) && stats.happiness >= HAPPINESS.growAbove) {
      // Wohnraum: je Zeitalter das größte Wohnhaus, sonst ein normales Haus
      for (const type of ['highrise', 'tenement']) if (isUnlocked(type)) tasks.push([type]);
      tasks.push(['house']);
    }
    if (countBuildings('sawmill') < 1 + Math.floor(houses / 6)) tasks.push(['sawmill']);
    if (houses >= 2 && countBuildings('market') < 1 + Math.floor(pop / 40)) tasks.push(['market']);
    if (houses >= 2 && countBuildings('quarry') < 1 + Math.floor(houses / 8)) tasks.push(['quarry']);
    // Lager nur, wenn Platz wirklich gebraucht wird: für die nächste Sehenswürdigkeit oder wenn Holz überläuft
    const nextLm = ['plaza', 'townhall', 'cathedral', 'clocktower', 'airport'].find(tp => isUnlocked(tp) && countBuildings(tp) === 0);
    const needSpace = nextLm ? Math.max(...Object.entries(costOf(nextLm)).filter(([id]) => RESOURCES[id].stored).map(([, n]) => n)) : 0;
    const winterNeed = heatingRate() * CONFIG.seasonLength * 1.1;
    if (stats.storage < Math.max(needSpace, winterNeed) + 20 || state.resources.wood >= storageCap('wood') * 0.9) tasks.unshift(['warehouse']);
    if (houses >= 3 && countBuildings('scriptorium') < 1 + Math.floor(pop / 50)) tasks.push(['scriptorium']);
    if (isUnlocked('library') && countBuildings('library') < 1) tasks.push(['library']);
    if (isUnlocked('bakery') && countBuildings('bakery') < 1 + Math.floor(pop / 60)) tasks.push(['bakery']);
    if (isUnlocked('carpentry') && countBuildings('carpentry') < 1 + Math.floor(pop / 80)) tasks.push(['carpentry']);
    if (isUnlocked('brickworks') && countBuildings('brickworks') < 1 + Math.floor(pop / 80)) tasks.push(['brickworks']);
    // Weitere Handwerksketten ab 50 Einwohnern: Bier, Wolle → Stoff, Eisen → Werkzeug
    if (pop >= 50) {
      if (countBuildings('brewery') < Math.floor(pop / 90) + 1) tasks.push(['brewery']);
      if (countBuildings('sheepfarm') < Math.floor(pop / 120) + 1) tasks.push(['sheepfarm']);
      if (countBuildings('sheepfarm') && countBuildings('weaver') < countBuildings('sheepfarm')) tasks.push(['weaver']);
      if (countBuildings('mine') < Math.floor(pop / 150) + 1) tasks.push(['mine']);
      if (countBuildings('mine') && countBuildings('smithy') < countBuildings('mine')) tasks.push(['smithy']);
    }
    // Industrie: Kohle → Stahl → Fabrikwaren → Bahnhof
    if (state.age >= 3) {
      if (countBuildings('coalmine') < 1 + Math.floor(pop / 150)) tasks.push(['coalmine']);
      if (countBuildings('mine') < countBuildings('coalmine')) tasks.push(['mine']);
      if (countBuildings('steelworks') < countBuildings('coalmine')) tasks.push(['steelworks']);
      if (countBuildings('factory') < 1 + Math.floor(pop / 300)) tasks.push(['factory']);
      if (countBuildings('factory') && countBuildings('weaver') < 2 * countBuildings('factory')) tasks.push(['weaver'], ['sheepfarm']);
      if (countBuildings('factory') && countBuildings('station') < countBuildings('factory')) tasks.push(['station']);
    }
    // Moderne: Strom → Beton und Elektronik, Supermarkt, Universität
    if (state.age >= 4) {
      if (countBuildings('powerplant') < 1 + Math.floor(pop / 300)) tasks.push(['powerplant']);
      if (countBuildings('concreteworks') < countBuildings('powerplant')) tasks.push(['concreteworks']);
      if (pop >= 400 && countBuildings('electronicsworks') < 1) tasks.push(['electronicsworks']);
      if (countBuildings('supermarket') < Math.floor(pop / 250)) tasks.push(['supermarket']);
      if (countBuildings('university') < 1) tasks.push(['university']);
    }
    // Die erste Anlage jeder neuen Kette hat Vorrang (sonst belegen Häuser und Lager alle Baustellen)
    const firsts = ['coalmine', 'steelworks', 'factory', 'station', 'powerplant', 'concreteworks', 'electronicsworks', 'university'];
    for (const type of firsts) {
      if (isUnlocked(type) && countBuildings(type) === 0 && tasks.some(([t]) => t === type)) tasks.unshift([type]);
    }
    // Viele Arbeitslose: zusätzliche Betriebe bauen (wie ein Spieler auf die Warnung reagiert)
    if (pop >= 20 && stats.unemployed / pop > CONFIG.unemploymentTolerance) {
      const options = ['sawmill', 'quarry', 'carpentry', 'brickworks', 'bakery', 'market'].filter(isUnlocked);
      tasks.push([options[Math.floor(t / 2) % options.length]]);
    }
    for (const type of ['park', 'firestation', 'well', 'school', 'guard', 'hospital', 'police', 'stadium']) {
      if (!isUnlocked(type) || (type !== 'park' && pop < 8)) continue;
      const slot = bestServiceSlot(type);
      if (slot) tasks.push([type, slot]);
    }
    for (const type of ['townhall', 'plaza', 'cathedral', 'clocktower', 'airport']) {
      if (isUnlocked(type) && countBuildings(type) === 0) tasks.push([type]);
    }
    // Ab 100 Einwohnern auf die nächste Sehenswürdigkeit sparen: nur noch Farmen und Lager nebenbei
    const pendingLandmark = ['plaza', 'townhall', 'cathedral', 'clocktower', 'airport'].find(tp => isUnlocked(tp) && countBuildings(tp) === 0);
    if (pendingLandmark && pop >= 100 && (t / 60) % 10 < 6) {
      if (tryBuild(pendingLandmark)) return;
      const keep = tasks.filter(([type]) => type === 'farm' || type === 'warehouse');
      tasks.length = 0;
      tasks.push(...keep);
    }
    let builds = 0;
    for (const [type, slot] of tasks) {
      if (builds >= 2) break;
      if (tryBuild(type, slot)) builds++;
    }
    // Mit überschüssigem Geld Holz kaufen (wie ein Spieler es tun würde)
    if (hasMarket()) for (let n = 0; n < 3 && state.resources.money > 300 && state.resources.wood < Math.max(60, woodReserve()); n++) {
      trade('wood', true);
      bought++;
    }
    // Ausbauen: Häuser bei Wohnungsnot, sonst Betriebe – vor allem wenn das Land knapp wird
    if (state.maxLevel >= 1 && freeSlots('farm').length < 12) {
      const wantHouses = pop >= cap - 2;
      const types = wantHouses ? ['house'] : ['farm', 'sawmill', 'quarry', 'market', 'carpentry', 'brickworks', 'bakery', 'scriptorium', 'house'];
      let best = null;
      state.grid.forEach((c, i) => {
        if (!c || !types.includes(c.type) || levelOf(c) >= MAX_BUILDING_LEVEL) return;
        const up = UPGRADES[levelOf(c) + 1];
        if (state.maxLevel < up.minLevel) return;
        if (!best || levelOf(c) < levelOf(best.c)) best = { c, i };
      });
      if (best) {
        const cost = upgradeCost(best.c.type, levelOf(best.c) + 1);
        if (canAfford(cost) && (!cost.wood || state.resources.wood - cost.wood >= woodReserve())) {
          upgradeBuilding(best.i % N, Math.floor(best.i / N));
          upgrades++;
        }
      }
    }
    // Überschüsse verkaufen
    if (hasMarket()) for (const id of ['wood', 'stone', 'food', 'planks', 'bricks', 'bread', 'beer', 'cloth', 'wool', 'iron', 'tools', 'coal', 'steel', 'goods', 'concrete', 'electronics']) {
      if (state.resources[id] >= storageCap(id)) trade(id, false);
    }
  }

  const DT = 0.25, TOTAL = minutes * 60;
  let t = 0, nextDecision = 0, nextSnap = 0, techCount = 0;
  const milestones = {}, techTimes = [], questTimes = [], landmarkTimes = {}, ageTimes = {};
  let lowHappy = 0, starving = 0, freezing = 0;
  const wall = performance.now();
  while (t < TOTAL) {
    update(DT);
    t += DT;
    if (stats.happiness < HAPPINESS.growAbove) lowHappy += DT;
    if (stats.starving) starving += DT;
    if (isFreezing()) freezing += DT;
    if (t >= nextDecision) {
      recalcStats();
      checkLevel();
      checkAchievements(true);
      decide(t);
      nextDecision += 2;
    }
    for (const m of [8, 21, 50, 101, 150, 200]) if (!milestones[m] && state.population >= m) milestones[m] = t;
    if (state.techs.length > techCount) { techTimes.push(state.techs[techCount] + '@' + (t / 60).toFixed(1)); techCount++; }
    for (const tp of ['townhall', 'plaza', 'cathedral', 'clocktower', 'airport']) if (!landmarkTimes[tp] && countBuildings(tp)) landmarkTimes[tp] = (t / 60).toFixed(1);
    if (state.questsClaimed.length > questTimes.length) questTimes.push((t / 60).toFixed(1));
    if (t >= nextSnap) {
      const r = state.resources;
      out(`t=${(t / 60).toFixed(0)}min ${season().icon} pop=${state.population}/${stats.capacity} happy=${stats.happiness} tax=${state.taxLevel}`,
        `money=${r.money} wood=${r.wood} stone=${r.stone} food=${r.food} know=${r.knowledge} store=${stats.storage}`,
        `jobs W${stats.jobs.assigned.worker}/${stats.jobs.demand.worker} H${stats.jobs.assigned.trader}/${stats.jobs.demand.trader} G${stats.jobs.assigned.scholar}/${stats.jobs.demand.scholar}(max${stats.jobs.scholarCap}) arbeitslos=${stats.unemployed}`,
        `houses=${countBuildings('house')} farms=${countBuildings('farm')} saw=${countBuildings('sawmill')} quarry=${countBuildings('quarry')} market=${countBuildings('market')}`);
      nextSnap += 300;
    }
  }
  const min = k => (milestones[k] ? +(milestones[k] / 60).toFixed(1) : null);
  return {
    minutes,
    milestones: { pop21: min(21), pop50: min(50), pop101: min(101), pop150: min(150), pop200: min(200) },
    ages: ageTimes,
    techs: techTimes,
    landmarks: landmarkTimes,
    quests: `${state.questsClaimed.length}/${QUESTS.length}`,
    openQuests: activeQuests().map(q => q.id),
    problems: {
      lowHappyMin: +(lowHappy / 60).toFixed(1),
      starvingMin: +(starving / 60).toFixed(1),
      freezingMin: +(freezing / 60).toFixed(1),
      waitingBuildings: state.grid.filter(c => c && c.waiting).length,
    },
    want,
    built,
    economy: { money: state.resources.money, population: state.population, capacity: stats.capacity, unemployed: stats.unemployed, happiness: stats.happiness },
    bandits: { camps: state.camps.length, cleared: state.counters.campsCleared || 0, repelled: state.counters.repelled || 0, defense: cityDefense() },
    carts: state.counters.carts || 0,
    plots: { bought: plotsBought(), at: plotsBoughtAt, nextPrice: plotPrice().money },
    upgrades: { done: upgrades, level3: state.grid.filter(c => c && levelOf(c) >= 3).length },
    achievements: state.achievements.length,
    snapshots,
    seconds: +((performance.now() - wall) / 1000).toFixed(1),
  };
}
