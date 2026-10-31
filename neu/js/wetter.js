'use strict';
// Epochia – Tag und Nacht, Wetter und Jahreszeiten im Bild: Dämmerung, Nacht mit leuchtenden Feuern,
// Wolkenschatten, Regen mit Spritzern, Hagel, Schnee, Schneedecke im Winter, Herbstlaub, Blütenblätter im Frühling.
// Reine Darstellung – welches Wetter gerade ist, rechnet logik.js aus (currentWeather, darkness, snowCover).

const weatherFx = { drops: [], splashes: [], flakes: [], hail: [], leaves: [], clouds: [], lights: [], gusts: [], smoke: [] };
let lightning = { t: 3, flash: 0, bolt: null };
let nightCanvas = null, nightCtx = null;

// Feuer der Gebäude als Lichtquellen für die Nacht (drawBuildingEffects meldet sie hier an)
function addLight(x, y, r) { weatherFx.lights.push({ x, y, r }); }

function weatherRandom() { return Math.random(); }

// ---------------------------------------------------------------------
// Boden je Jahreszeit (wird unter Bäumen und Gebäuden gezeichnet)
// ---------------------------------------------------------------------

function drawSeasonGround() {
  const si = seasonIndex(), snow = snowCover();
  if (si === 1) { ctx.fillStyle = 'rgba(255,225,120,0.06)'; ctx.fillRect(0, 0, viewW, viewH); }
  if (si === 2) { ctx.fillStyle = 'rgba(200,110,30,0.16)'; ctx.fillRect(0, 0, viewW, viewH); }
  if (snow > 0) { ctx.fillStyle = `rgba(246,250,255,${0.68 * snow})`; ctx.fillRect(0, 0, viewW, viewH); }
}

// ---------------------------------------------------------------------
// Wetter: Wolken, Regen, Hagel, Schnee, Blätter (in Bildschirm-Koordinaten über allem)
// ---------------------------------------------------------------------

function keepCount(list, want, make) {
  while (list.length < want) list.push(make(list.length));
  if (list.length > want) list.length = Math.max(0, want);
}

function updateWeatherFx(dt, w) {
  const area = viewW * viewH / (900 * 500);   // auf kleinen Bildschirmen weniger Teilchen
  const k = w.k;
  // Regen: schräge Striche, beim Aufkommen ein kleiner Wasserring (beim Gewitter mehr und schräger)
  const rainy = w.id === 'regen' ? 1 : w.id === 'gewitter' ? 1.5 : 0;
  keepCount(weatherFx.drops, Math.round(170 * rainy * k * area), () => ({
    x: weatherRandom() * (viewW + 80), y: -weatherRandom() * viewH, v: 620 + weatherRandom() * 200, ground: viewH * (0.15 + weatherRandom() * 0.85),
  }));
  for (const d of weatherFx.drops) {
    d.y += d.v * dt; d.x -= d.v * 0.18 * dt;
    if (d.y >= d.ground) {
      if (weatherFx.splashes.length < 60) weatherFx.splashes.push({ x: d.x, y: d.y, k: 0 });
      d.y = -10 - weatherRandom() * 60; d.x = weatherRandom() * (viewW + 80); d.ground = viewH * (0.15 + weatherRandom() * 0.85);
    }
  }
  // Hagel: weiße Körner, fallen schnell und hüpfen einmal
  keepCount(weatherFx.hail, w.id === 'hagel' ? Math.round(110 * k * area) : 0, () => ({
    x: weatherRandom() * viewW, y: -weatherRandom() * viewH, v: 520 + weatherRandom() * 160, ground: viewH * (0.15 + weatherRandom() * 0.85), bounce: 0,
  }));
  for (const h of weatherFx.hail) {
    if (h.bounce > 0) {
      h.bounce -= dt;
      if (h.bounce <= 0) { h.y = -10 - weatherRandom() * 80; h.x = weatherRandom() * viewW; h.ground = viewH * (0.15 + weatherRandom() * 0.85); }
      continue;
    }
    h.y += h.v * dt; h.x -= h.v * 0.08 * dt;
    if (h.y >= h.ground) h.bounce = 0.35;
  }
  // Schnee: Flocken schweben und pendeln
  keepCount(weatherFx.flakes, w.id === 'schnee' ? Math.round(150 * k * area) : 0, () => ({
    x: weatherRandom() * viewW, y: -weatherRandom() * viewH, v: 30 + weatherRandom() * 40, r: 1.2 + weatherRandom() * 2.4, ph: weatherRandom() * 9,
  }));
  for (const f of weatherFx.flakes) {
    f.y += f.v * dt; f.x += Math.sin(frameTime * 1.3 + f.ph) * 18 * dt - 6 * dt;
    if (f.y > viewH + 5) { f.y = -5; f.x = weatherRandom() * viewW; }
    if (f.x < -5) f.x = viewW + 5;
  }
  // Gewitter: ab und zu ein Blitz – der Himmel leuchtet auf, ein gezackter Strahl
  lightning.flash = Math.max(0, lightning.flash - dt * 3);
  if (w.id === 'gewitter' && w.k > 0.5) {
    lightning.t -= dt;
    if (lightning.t <= 0) {
      lightning.t = 4 + weatherRandom() * 9;
      lightning.flash = 1;
      const x0 = viewW * (0.15 + weatherRandom() * 0.7), pts = [[x0, -10]];
      let x = x0, y = -10;
      const ground = viewH * (0.35 + weatherRandom() * 0.4);
      while (y < ground) { y += 18 + weatherRandom() * 26; x += (weatherRandom() - 0.5) * 46; pts.push([x, y]); }
      lightning.bolt = pts;
      if (typeof playSound === 'function') setTimeout(() => playSound('donner'), 300 + weatherRandom() * 900);
    }
  }
  // Sturm: Windstreifen jagen über den Bildschirm
  keepCount(weatherFx.gusts, w.id === 'sturm' ? Math.round(40 * k * area) : 0, () => ({
    x: weatherRandom() * viewW, y: weatherRandom() * viewH, v: 500 + weatherRandom() * 300, len: 30 + weatherRandom() * 60,
  }));
  for (const g of weatherFx.gusts) { g.x += g.v * dt; g.y += g.v * 0.12 * dt; if (g.x > viewW + 80) { g.x = -80; g.y = weatherRandom() * viewH; } }
  // Herbstlaub und Frühlingsblüten bei schönem Wetter, im Sturm fliegen Blätter in jeder Jahreszeit
  const si = seasonIndex(), calm = w.id === 'klar' || w.id === 'wolkig', storm = w.id === 'sturm';
  const leafKind = si === 2 ? 'laub' : si === 0 ? 'bluete' : storm && si !== 3 ? 'gruen' : null;
  keepCount(weatherFx.leaves, leafKind && (calm || storm) ? Math.round((storm ? 40 : 14) * area) : 0, () => ({
    x: weatherRandom() * viewW, y: -weatherRandom() * viewH, v: 22 + weatherRandom() * 20, ph: weatherRandom() * 9,
    c: leafKind === 'laub' ? ['#d9822b', '#c2561f', '#e8b23a', '#a8432a'][Math.floor(weatherRandom() * 4)]
      : leafKind === 'gruen' ? ['#5f9e3a', '#7cb648', '#4a7d2c'][Math.floor(weatherRandom() * 3)] : ['#ffc6dc', '#ffe0ec', '#ffffff'][Math.floor(weatherRandom() * 3)],
  }));
  for (const l of weatherFx.leaves) {
    if (storm) { l.x += (260 + Math.sin(frameTime * 2 + l.ph) * 60) * dt; l.y += (l.v * 0.6 + Math.sin(frameTime * 3 + l.ph) * 40) * dt; }
    else { l.y += l.v * dt; l.x += (Math.sin(frameTime * 0.9 + l.ph) * 30 - 10) * dt; }
    if (l.y > viewH + 10) { l.y = -10; l.x = weatherRandom() * viewW; }
    if (l.x > viewW + 10) { l.x = -10; l.y = weatherRandom() * viewH; }
  }
  // Waldbrand: Rauch steigt über der Brandstelle auf
  const fire = state.disaster && state.disaster.id === 'waldbrand' && lastBurnt.length;
  keepCount(weatherFx.smoke, fire ? 30 : 0, () => ({ i: Math.floor(weatherRandom() * 1e6), k: weatherRandom() }));
  for (const sm of weatherFx.smoke) { sm.k += dt / 6; if (sm.k > 1) { sm.k = 0; sm.i = Math.floor(weatherRandom() * 1e6); } }
  for (const s of weatherFx.splashes) s.k += dt / 0.35;
  weatherFx.splashes = weatherFx.splashes.filter(s => s.k < 1);
  // Wolkenschatten ziehen langsam über das Land
  keepCount(weatherFx.clouds, w.id === 'klar' ? 0 : 5, i => ({ x: weatherRandom() * viewW * 1.4 - viewW * 0.2, y: weatherRandom() * viewH, r: 120 + weatherRandom() * 140 }));
  for (const c of weatherFx.clouds) { c.x += 14 * dt; if (c.x - c.r > viewW) { c.x = -c.r; c.y = weatherRandom() * viewH; } }
}

function drawWeather(dt) {
  const w = currentWeather();
  updateWeatherFx(dt, w);
  const k = w.k;
  // trüber Himmel
  const dim = { wolkig: 0.10, regen: 0.20, hagel: 0.22, schnee: 0.08, gewitter: 0.34, sturm: 0.14 }[w.id] || 0;
  if (dim) { ctx.fillStyle = `rgba(45,55,75,${dim * k})`; ctx.fillRect(0, 0, viewW, viewH); }
  // Katastrophen färben das Land: Dürre gelb, Kälte bläulich, Hochwasser trüb, Waldbrand rauchig
  const tint = state.disaster && { duerre: 'rgba(235,185,70,0.16)', kaeltewelle: 'rgba(175,215,255,0.22)', hochwasser: 'rgba(60,110,160,0.14)', waldbrand: 'rgba(120,70,40,0.12)' }[state.disaster.id];
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, viewW, viewH); }
  for (const sm of weatherFx.smoke) {
    const [bx, by] = lastBurnt[sm.i % lastBurnt.length];
    const p = tileToScreen(bx + 0.5, by + 0.5), z = cam.zoom;
    const r = (10 + sm.k * 40) * z;
    ctx.fillStyle = `rgba(70,65,60,${0.35 * (1 - sm.k)})`;
    ctx.beginPath(); ctx.arc(p.x + Math.sin(sm.k * 4 + sm.i) * 12 * z, p.y - sm.k * 120 * z, r, 0, 7); ctx.fill();
    if (sm.k < 0.15) { ctx.fillStyle = `rgba(255,${120 + (sm.i % 80)},40,${0.7 * (1 - sm.k / 0.15)})`; ctx.beginPath(); ctx.arc(p.x, p.y - 6 * z, 6 * z, 0, 7); ctx.fill(); }
  }
  // Sturm-Streifen
  if (weatherFx.gusts.length) {
    ctx.strokeStyle = 'rgba(235,240,245,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const g of weatherFx.gusts) { ctx.moveTo(g.x, g.y); ctx.lineTo(g.x - g.len, g.y - g.len * 0.12); }
    ctx.stroke();
  }
  for (const c of weatherFx.clouds) {
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    g.addColorStop(0, `rgba(30,40,60,${0.13 * k})`);
    g.addColorStop(1, 'rgba(30,40,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r, c.r * 0.55, 0, 0, 7); ctx.fill();
  }
  // Regen
  if (weatherFx.drops.length) {
    ctx.strokeStyle = 'rgba(200,215,240,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const d of weatherFx.drops) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 3, d.y - 16); }
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  for (const s of weatherFx.splashes) {
    ctx.strokeStyle = `rgba(220,235,255,${0.6 * (1 - s.k)})`;
    ctx.beginPath(); ctx.ellipse(s.x, s.y, 2 + s.k * 6, 0.8 + s.k * 2.2, 0, 0, 7); ctx.stroke();
  }
  // Hagel
  for (const h of weatherFx.hail) {
    const up = h.bounce > 0 ? Math.sin((1 - h.bounce / 0.35) * Math.PI) * 7 : 0;
    ctx.fillStyle = h.bounce > 0 ? `rgba(255,255,255,${h.bounce / 0.35})` : 'rgba(250,252,255,0.95)';
    ctx.beginPath(); ctx.arc(h.x, (h.bounce > 0 ? h.ground : h.y) - up, 2.2, 0, 7); ctx.fill();
  }
  // Schnee
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  for (const f of weatherFx.flakes) { ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); }
  // Blitz: Strahl und heller Himmel
  if (lightning.flash > 0) {
    ctx.fillStyle = `rgba(235,240,255,${0.45 * lightning.flash})`;
    ctx.fillRect(0, 0, viewW, viewH);
    if (lightning.bolt && lightning.flash > 0.4) {
      ctx.strokeStyle = `rgba(255,255,240,${lightning.flash})`; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.shadowColor = '#bcd2ff'; ctx.shadowBlur = 14;
      ctx.beginPath(); lightning.bolt.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
  // Laub und Blüten
  for (const l of weatherFx.leaves) {
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate(Math.sin(frameTime * 2 + l.ph) * 1.2);
    ctx.fillStyle = l.c;
    ctx.beginPath(); ctx.ellipse(0, 0, 4, 2.2 * Math.abs(Math.cos(frameTime * 3 + l.ph)) + 0.6, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------------
// Tag und Nacht: Abendrot, dunkle Nacht, Feuer leuchten
// ---------------------------------------------------------------------

function drawDayNight() {
  const d = darkness(), p = dayPart();
  const lights = weatherFx.lights;
  weatherFx.lights = [];
  // Abend- und Morgenrot
  const glow = p >= 0.55 && p < 0.75 ? Math.sin((p - 0.55) / 0.20 * Math.PI) : p >= 0.88 || p < 0.05 ? Math.sin(((p + 0.12) % 1) / 0.17 * Math.PI) : 0;
  if (glow > 0) { ctx.fillStyle = `rgba(255,120,50,${0.16 * glow})`; ctx.fillRect(0, 0, viewW, viewH); }
  if (d <= 0.01) return;
  // Dunkelheit auf einer halb so großen Leinwand, Löcher um die Feuer
  if (!nightCanvas && typeof document !== 'undefined') {
    nightCanvas = document.createElement('canvas');
    nightCtx = nightCanvas.getContext('2d');
  }
  if (!nightCtx) return;
  const s = 0.5, w = Math.max(1, Math.ceil(viewW * s)), h = Math.max(1, Math.ceil(viewH * s));
  if (nightCanvas.width !== w || nightCanvas.height !== h) { nightCanvas.width = w; nightCanvas.height = h; }
  nightCtx.globalCompositeOperation = 'source-over';
  nightCtx.clearRect(0, 0, w, h);
  nightCtx.fillStyle = `rgba(12,20,55,${0.62 * d})`;
  nightCtx.fillRect(0, 0, w, h);
  nightCtx.globalCompositeOperation = 'destination-out';
  for (const l of lights) {
    const fl = 0.92 + 0.08 * Math.sin(frameTime * 9 + l.x);
    const r = l.r * s * fl;
    const g = nightCtx.createRadialGradient(l.x * s, l.y * s, 0, l.x * s, l.y * s, r);
    g.addColorStop(0, 'rgba(0,0,0,0.95)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.5)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    nightCtx.fillStyle = g;
    nightCtx.beginPath(); nightCtx.ellipse(l.x * s, l.y * s, r, r * 0.7, 0, 0, 7); nightCtx.fill();
  }
  ctx.drawImage(nightCanvas, 0, 0, viewW, viewH);
  // warmer Schein ums Feuer
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    const r = l.r * 0.6;
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
    g.addColorStop(0, `rgba(255,150,60,${0.22 * d})`);
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(l.x, l.y, r, r * 0.7, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
}

// Wie stark weht der Wind? 1 = normal, im Sturm 3 (Bäume, Rauch)
function windStrength() {
  const w = currentWeather();
  return w.id === 'sturm' ? 1 + 2 * w.k : w.id === 'gewitter' ? 1 + 0.8 * w.k : 1;
}

// Neues Spiel oder anderer Spielstand: Teilchen weg
function resetWeather() {
  for (const key of Object.keys(weatherFx)) weatherFx[key] = [];
}
