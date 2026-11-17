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

function drawSeasonGround(range) {
  const si = seasonIndex(), snow = snowCover();
  if (si === 1) { ctx.fillStyle = 'rgba(255,225,120,0.06)'; ctx.fillRect(0, 0, viewW, viewH); }
  if (si === 2) { ctx.fillStyle = 'rgba(200,110,30,0.16)'; ctx.fillRect(0, 0, viewW, viewH); }
  if (snow <= 0) return;
  if (typeof groundSnowBaked !== 'undefined' && groundSnowBaked) return;   // liegt schon in den Bodenstücken (V209)
  // Schneedecke: verschneite Wiese als Bild, die mit der Karte wandert (Emin, 15.11.: der weiße Schleier machte die
  // natürliche Wiese milchig); ohne Bild wie früher ein weißer Schleier
  const o = worldToScreen(0, 0), pattern = groundPattern(ctx, 'schneewiese', o.x, o.y, cam.zoom);
  const old = ctx.globalAlpha;
  let patched = false;
  if (pattern && snow < 0.98 && range) { try { patched = drawSnowPatches(pattern, snow, range); } catch (e) { patched = false; ctx.restore && ctx.setTransform(dpr, 0, 0, dpr, 0, 0); } }
  if (patched) return;
  if (pattern) { ctx.globalAlpha = old * Math.min(1, 0.92 * snow); ctx.fillStyle = pattern; }
  else ctx.fillStyle = `rgba(246,250,255,${0.68 * snow})`;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.globalAlpha = old;
}

// Schnee kommt und taut fleckig: erst liegen einzelne Flecken, die wachsen zusammen (Frühling: schrumpfen wieder).
// Vorher lag die Schneedecke halb durchsichtig über allem – ein milchiger Schleier über Wiese und Sand (16.11.).
// Eine kleine Karte (ein Bildpunkt je Feld) sagt, wo schon Schnee liegt; sie wird weich vergrößert und schneidet die Schneedecke zu.
let snowMask = null, snowLayer = null;
// Wie viel Schnee liegt auf Feld (x, y), wenn die Schneedecke insgesamt bei snow steht? (0–1, weiche Flecken je etwa 5 Felder)
function snowPatchAt(x, y, snow = snowCover()) {
  if (snow >= 0.98) return 1;
  if (snow <= 0) return 0;
  const lattice = (i, j) => hash(i * 3 + 17, j * 5 + 29);
  const gx = x / 5, gy = y / 5, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const v = (lattice(ix, iy) * (1 - sx) + lattice(ix + 1, iy) * sx) * (1 - sy) + (lattice(ix, iy + 1) * (1 - sx) + lattice(ix + 1, iy + 1) * sx) * sy;
  const noise = 0.78 * v + 0.22 * hash(Math.floor(x), Math.floor(y));
  return Math.max(0, Math.min(1, (snow * 1.3 - 0.15 - noise) / 0.12));
}
function drawSnowPatches(pattern, snow, range) {
  if (typeof document === 'undefined' || !ctx.canvas || !(ctx.canvas.width > 0)) return false;
  const x0 = range.x0 - 2, y0 = range.y0 - 2, x1 = range.x1 + 2, y1 = range.y1 + 2, W = x1 - x0 + 1, H = y1 - y0 + 1;
  const key = [x0, y0, x1, y1, Math.round(snow * 100)].join();
  if (!snowMask || snowMask.key !== key) {
    const c = snowMask && snowMask.c.width === W && snowMask.c.height === H ? snowMask.c : newCanvas();
    c.width = W; c.height = H;
    const g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++) {
        const a = snowPatchAt(x0 + i, y0 + j, snow), o = (j * W + i) * 4;
        d[o] = d[o + 1] = d[o + 2] = 0; d[o + 3] = a * 255;
      }
    g.putImageData(img, 0, 0);
    snowMask = { c, key };
  }
  const cw = ctx.canvas.width, chh = ctx.canvas.height;
  if (!snowLayer) snowLayer = newCanvas();
  if (snowLayer.width !== cw || snowLayer.height !== chh) { snowLayer.width = cw; snowLayer.height = chh; }
  const g = snowLayer.getContext('2d');
  if (!g) return false;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, cw, chh);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = pattern; g.fillRect(0, 0, viewW, viewH);
  // Maske in Feld-Koordinaten darüberlegen (wie das Wasser: Feld → Bildschirm)
  const p0 = tileToScreen(0, 0), ex = tileToScreen(1, 0), ey = tileToScreen(0, 1);
  g.globalCompositeOperation = 'destination-in';
  g.imageSmoothingEnabled = true;
  g.setTransform((ex.x - p0.x) * dpr, (ex.y - p0.y) * dpr, (ey.x - p0.x) * dpr, (ey.y - p0.y) * dpr, p0.x * dpr, p0.y * dpr);
  g.drawImage(snowMask.c, x0, y0, W, H);   // Bildpunkt i liegt auf Feld x0 + i
  g.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= 0.95;
  ctx.drawImage(snowLayer, 0, 0);
  ctx.restore();
  return true;
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
  // Wolkenschatten ziehen langsam über das Land. Sie liegen auf der Karte (Weltkoordinaten), nicht auf dem Bildschirm –
  // sonst blieben sie beim Verschieben stehen und das Land rutschte darunter weg (Emin, 07.11.2026).
  const z = cam.zoom || 1, halfW = viewW / 2 / z, halfH = viewH / 2 / z;
  const spawn = (left) => { const r = (120 + weatherRandom() * 140) / Math.max(0.5, Math.min(1.5, z));
    return { wx: left ? cam.x - halfW - r : cam.x + (weatherRandom() * 2.8 - 1.4) * halfW, wy: cam.y + (weatherRandom() * 2 - 1) * halfH, r }; };
  keepCount(weatherFx.clouds, w.id === 'klar' ? 0 : 5, () => spawn(false));
  for (const c of weatherFx.clouds) {
    if (c.wx === undefined) Object.assign(c, spawn(false));
    c.wx += 14 * dt / z;
    // weit aus dem Bild (gezogen oder verschoben): links neu hereinziehen lassen
    if (Math.abs(c.wx - cam.x) > halfW * 1.6 + c.r || Math.abs(c.wy - cam.y) > halfH * 1.6 + c.r) Object.assign(c, spawn(c.wx > cam.x));
  }
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
  // Wolkenschatten werden nicht mehr gezeichnet: Emin und sein Bruder (iPhone) hielten die runden dunklen Flecken für einen Fehler (07.11.)
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
    nightCanvas = newCanvas();
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
  // Flackern hängt am Ort auf der Karte, nicht am Bildschirm – sonst flackert es beim Verschieben schneller
  const o = worldToScreen(0, 0), zz = cam.zoom || 1;
  for (const l of lights) {
    const fl = 0.92 + 0.08 * Math.sin(frameTime * 9 + ((l.x - o.x) + (l.y - o.y) * 0.7) / zz * 0.05);
    const r = l.r * s * fl;
    const g = nightCtx.createRadialGradient(l.x * s, l.y * s, 0, l.x * s, l.y * s, r);
    // weicher Abfall (fast wie echtes Licht: innen hell, nach außen langsam auslaufend)
    g.addColorStop(0, 'rgba(0,0,0,0.97)');
    g.addColorStop(0.2, 'rgba(0,0,0,0.85)');
    g.addColorStop(0.45, 'rgba(0,0,0,0.5)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.2)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    nightCtx.fillStyle = g;
    nightCtx.beginPath(); nightCtx.ellipse(l.x * s, l.y * s, r, r * 0.7, 0, 0, 7); nightCtx.fill();
  }
  ctx.drawImage(nightCanvas, 0, 0, viewW, viewH);
  // warmer Schein ums Feuer
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    // warmes Streulicht: heller Kern, breiter orangefarbener Hof, der weich in die Nacht ausläuft
    const fl = 0.94 + 0.06 * Math.sin(frameTime * 7 + ((l.x - o.x) - (l.y - o.y)) / zz * 0.05);
    const r = l.r * 0.95 * fl;
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
    g.addColorStop(0, `rgba(255,190,110,${0.30 * d})`);
    g.addColorStop(0.18, `rgba(255,150,60,${0.20 * d})`);
    g.addColorStop(0.5, `rgba(255,120,40,${0.08 * d})`);
    g.addColorStop(1, 'rgba(255,100,30,0)');
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

// ---------------------------------------------------------------------
// Hochwasser und Dürre sichtbar machen (V220 – vorher nur ein Farbschleier)
// Hochwasser: trübes Wasser steigt 1–3 Felder über die Ufer und geht am Ende zurück.
// Dürre: vertrocknete, rissige Flecken im Gras und treibender Staub.
// ---------------------------------------------------------------------

let shoreDist = null, shoreDistKey = null;
// Abstand jedes Landfeldes zum nächsten Wasser (1–3, sonst 0); einmal je Geländestand
function shoreDistance() {
  const key = typeof terrainVersion !== 'undefined' ? terrainVersion : 0;
  if (shoreDist && shoreDistKey === key && shoreDist.length === N * N) return shoreDist;
  const d = new Uint8Array(N * N), water = TERRAIN.wasser.id;
  let front = [];
  for (let i = 0; i < N * N; i++) if (terrain[i] === water) front.push(i);
  for (let r = 1; r <= 3; r++) {
    const next = [];
    for (const i of front) {
      const x = i % N, y = (i - x) / N;
      for (const j of [x > 0 ? i - 1 : -1, x < N - 1 ? i + 1 : -1, y > 0 ? i - N : -1, y < N - 1 ? i + N : -1]) {
        if (j < 0 || d[j] || terrain[j] === water) continue;
        d[j] = r; next.push(j);
      }
    }
    front = next;
  }
  shoreDist = d; shoreDistKey = key;
  return d;
}

// 0–1: steigt in der ersten Minute, fällt in der letzten
function disasterLevel() {
  const s = state.disaster, d = s && DISASTERS[s.id];
  if (!d) return 0;
  const total = d.minutes * 60;
  return Math.max(0, Math.min(1, (total - s.left) / 60, s.left / 60));
}

// Flächen erst deckend in eine kleine Leinwand malen und dann weich und halb durchsichtig darüberlegen:
// so überlappen sich die Flecken nicht zu Ringen, und die Ränder werden beim Vergrößern weich.
let disasterLayer = null;
function softLayer(paint) {
  const k = 3, w = Math.max(1, Math.ceil(viewW / k)), h = Math.max(1, Math.ceil(viewH / k));
  if (!disasterLayer) disasterLayer = newCanvas();
  if (disasterLayer.width !== w || disasterLayer.height !== h) { disasterLayer.width = w; disasterLayer.height = h; }
  const g = disasterLayer.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); g.setTransform(1 / k, 0, 0, 1 / k, 0, 0);
  paint(g);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(disasterLayer, 0, 0, w * k, h * k);
}

function drawDisasterGround(range) {
  const s = state.disaster;
  if (!s || (s.id !== 'hochwasser' && s.id !== 'duerre') || typeof Path2D === 'undefined' || typeof newCanvas !== 'function') return;
  const lvl = disasterLevel();
  if (lvl <= 0.01) return;
  const land = clipToLand(range), z = cam.zoom, t = frameTime;
  if ((land.x1 - land.x0) * (land.y1 - land.y0) > 40000) return;   // ganz weit draußen genügt der Farbschleier
  const rx = TW * 0.5 * z, ry = TH * 0.5 * z, old = ctx.globalAlpha;
  if (s.id === 'hochwasser') {
    const dist = shoreDistance(), reach = 0.6 + lvl * 2.4;
    const deep = new Path2D(), all = new Path2D(), shine = [];
    for (let y = land.y0; y <= land.y1; y++) for (let x = land.x0; x <= land.x1; x++) {
      const i = y * N + x, dd = dist[i];
      if (!dd || dd > reach || terrain[i] === TERRAIN.berg.id || landMask[i] !== 2) continue;
      const p = tileToScreen(x + 0.5, y + 0.5), k = 0.95 + hash(x, y) * 0.35;
      all.moveTo(p.x + rx * k, p.y); all.ellipse(p.x, p.y, rx * k, ry * k, 0, 0, Math.PI * 2);
      if (dd <= reach - 1) { deep.moveTo(p.x + rx * k * 0.8, p.y); deep.ellipse(p.x, p.y, rx * k * 0.8, ry * k * 0.8, 0, 0, Math.PI * 2); }
      if (hash(x + 7, y + 3) < 0.2) shine.push(p);
    }
    ctx.globalAlpha = old * 0.85 * lvl;
    softLayer(g => { g.fillStyle = '#86aaa0'; g.fill(all); g.fillStyle = '#5e9aa6'; g.fill(deep); });   // trüb am Rand, flussblau innen
    ctx.globalAlpha = old;
    // Lichtkringel auf dem Wasser
    ctx.strokeStyle = `rgba(230,240,235,${0.4 * lvl})`; ctx.lineWidth = Math.max(1, 1.4 * z);
    ctx.beginPath();
    for (const p of shine) {
      const ph = (t * 0.4 + (p.x * 0.013 + p.y * 0.007)) % 1, r = 12 * z * (0.4 + ph);
      ctx.moveTo(p.x + r, p.y); ctx.ellipse(p.x, p.y, r, r * 0.4, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
    return;
  }
  // Dürre
  const dry = new Path2D(), cracks = new Path2D();
  for (let y = land.y0; y <= land.y1; y++) for (let x = land.x0; x <= land.x1; x++) {
    const i = y * N + x;
    if (terrain[i] !== TERRAIN.gras.id || landMask[i] !== 2) continue;
    const h = hash(x * 3 + 5, y * 7 + 1);
    if (h > 0.3 + lvl * 0.35) continue;
    const p = tileToScreen(x + 0.5 + (hash(x, y + 9) - 0.5) * 0.6, y + 0.5 + (hash(x + 9, y) - 0.5) * 0.6), k = 0.7 + hash(x + 2, y) * 0.8;
    dry.moveTo(p.x + rx * k, p.y); dry.ellipse(p.x, p.y, rx * k, ry * k, 0, 0, Math.PI * 2);
    if (z > 0.45 && h < 0.22) {   // Risse im Boden
      for (let c = 0; c < 3; c++) {
        const a = hash(x + c, y * 2 + c) * 6.28, l = (8 + hash(c, x + y) * 10) * z;
        cracks.moveTo(p.x, p.y); cracks.lineTo(p.x + Math.cos(a) * l, p.y + Math.sin(a) * l * 0.5);
        cracks.lineTo(p.x + Math.cos(a + 0.4) * l * 1.6, p.y + Math.sin(a + 0.4) * l * 0.8);
      }
    }
  }
  ctx.globalAlpha = old * 0.62 * lvl;
  softLayer(g => { g.fillStyle = '#c4a463'; g.fill(dry); });
  ctx.globalAlpha = old;
  ctx.strokeStyle = `rgba(105,75,40,${0.5 * lvl})`; ctx.lineWidth = Math.max(1, 1.2 * z); ctx.stroke(cracks);
  // treibender Staub (Bildschirm-Koordinaten, ziehen langsam nach rechts)
  ctx.fillStyle = `rgba(215,185,130,${0.2 * lvl})`;
  ctx.beginPath();
  for (let n = 0; n < 26; n++) {
    const sx = ((hash(n, 1) * viewW + t * (18 + hash(n, 2) * 25)) % (viewW + 200)) - 100, sy = hash(n, 3) * viewH + Math.sin(t * 0.7 + n) * 12;
    const r = (14 + hash(n, 4) * 30);
    ctx.moveTo(sx + r, sy); ctx.ellipse(sx, sy, r, r * 0.35, 0, 0, Math.PI * 2);
  }
  ctx.fill();
}
