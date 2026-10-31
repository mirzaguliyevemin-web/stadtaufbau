'use strict';
// Epochia – Geräusche, ganz ohne Tondateien: alles wird mit der Web-Audio-Schnittstelle aus Tönen und Rauschen
// zusammengesetzt (klein, lädt sofort, offline). Jedes Gebäude hat sein eigenes Geräusch beim Antippen, dazu
// Klänge für Bauen, Fertig, Forschung, Auftrag, Donner und Katastrophen. Abschaltbar im Menü (settings.sound).

let audio = null, master = null, noiseBuf = null;

// iPhones erlauben Töne erst nach einer Berührung – dann einmal anlegen bzw. aufwecken
function unlockAudio() {
  if (typeof window === 'undefined') return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!audio) {
    try { audio = new AC(); } catch (e) { audio = null; return; }
    master = audio.createGain();
    master.gain.value = 0.55;
    master.connect(audio.destination);
    noiseBuf = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (audio.state === 'suspended' && audio.resume) audio.resume();
}

// Ton: Form (sine, triangle, square, sawtooth), Frequenz (auch gleitend), Lautstärke mit kurzem Anstieg und Abklingen
function tone(t, { f = 440, to = null, dur = 0.2, type = 'sine', vol = 0.3, attack = 0.005, vib = 0, vibRate = 6, filter = null }) {
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  if (vib) {   // Zittern in der Stimme (Ziege, Horn)
    const l = audio.createOscillator(), lg = audio.createGain();
    l.frequency.value = vibRate; lg.gain.value = vib;
    l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (filter) { const fl = audio.createBiquadFilter(); fl.type = filter.type; fl.frequency.value = filter.f; fl.Q.value = filter.q || 1; node.connect(fl); node = fl; }
  node.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

// Rauschen durch einen Filter: Knistern, Rascheln, Platschen, Wind, Donner
function noise(t, { dur = 0.2, type = 'bandpass', f = 1000, to = null, q = 1, vol = 0.3, attack = 0.005 }) {
  const s = audio.createBufferSource(), fl = audio.createBiquadFilter(), g = audio.createGain();
  s.buffer = noiseBuf; s.loop = true;
  fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t);
  if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(master);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}

const rnd = (a, b) => a + Math.random() * (b - a);

// Die Geräusche. t = Startzeit
const SOUNDS = {
  // Feuer knistert, dazu ein leises Fauchen
  feuer: t => { noise(t, { dur: 0.9, type: 'lowpass', f: 600, vol: 0.12, attack: 0.15 }); for (let i = 0; i < 9; i++) noise(t + rnd(0, 0.8), { dur: 0.03, type: 'highpass', f: rnd(1500, 4000), vol: rnd(0.1, 0.3) }); },
  // Höhle: hohles Brummen und ein Tropfen mit Echo
  hoehle: t => { tone(t, { f: 140, dur: 0.7, vol: 0.12, attack: 0.1 }); for (let i = 0; i < 3; i++) tone(t + 0.25 + i * 0.22, { f: 1400, to: 700, dur: 0.12, vol: 0.18 / (i + 1) }); },
  // Zeltplane flattert
  zelt: t => { for (let i = 0; i < 3; i++) noise(t + i * 0.11, { dur: 0.09, type: 'lowpass', f: 900, vol: 0.25 }); },
  // Holzhaus: zweimal anklopfen, leises Gemurmel
  haus: t => { tone(t, { f: 230, to: 180, dur: 0.1, type: 'triangle', vol: 0.35 }); tone(t + 0.16, { f: 230, to: 180, dur: 0.1, type: 'triangle', vol: 0.35 }); noise(t + 0.3, { dur: 0.6, f: 500, q: 4, vol: 0.06, attack: 0.1 }); },
  // Pfahlbau: Wasser plätschert ans Holz
  pfahl: t => { SOUNDS.platsch(t); tone(t + 0.25, { f: 210, to: 170, dur: 0.1, type: 'triangle', vol: 0.3 }); },
  // Sammlerin: Blätter rascheln, eine Beere ploppt in den Korb
  rascheln: t => { for (let i = 0; i < 4; i++) noise(t + i * 0.09, { dur: 0.08, type: 'highpass', f: 3000, vol: 0.12 }); tone(t + 0.42, { f: 600, to: 900, dur: 0.06, vol: 0.25 }); },
  // Jäger: Horn ruft
  horn: t => { tone(t, { f: 196, dur: 0.7, type: 'sawtooth', vol: 0.16, attack: 0.08, vib: 3, filter: { type: 'lowpass', f: 900 } }); tone(t + 0.05, { f: 294, dur: 0.6, type: 'sawtooth', vol: 0.08, attack: 0.1, filter: { type: 'lowpass', f: 1100 } }); },
  // Mammutjäger: tiefes Horn, das Mammut trötet zurück
  mammut: t => { tone(t, { f: 130, dur: 0.6, type: 'sawtooth', vol: 0.16, attack: 0.08, filter: { type: 'lowpass', f: 700 } }); tone(t + 0.55, { f: 350, to: 520, dur: 0.5, type: 'sawtooth', vol: 0.12, vib: 18, vibRate: 9, filter: { type: 'bandpass', f: 900, q: 2 } }); },
  // Fisch platscht
  platsch: t => { noise(t, { dur: 0.3, f: 1800, to: 400, q: 1.5, vol: 0.3 }); for (let i = 0; i < 3; i++) tone(t + 0.12 + i * 0.07, { f: rnd(1200, 2000), to: 2600, dur: 0.05, vol: 0.1 }); },
  // Acker: Wind im Korn, Sichel
  korn: t => { noise(t, { dur: 0.8, f: 700, to: 1400, q: 0.8, vol: 0.12, attack: 0.3 }); noise(t + 0.5, { dur: 0.15, type: 'highpass', f: 4000, vol: 0.15 }); },
  // Ziege: „Mäh“
  ziege: t => { for (const [d, f] of [[0, 520], [0.35, 470]]) tone(t + d, { f, dur: 0.3, type: 'sawtooth', vol: 0.1, attack: 0.02, vib: 25, vibRate: 11, filter: { type: 'bandpass', f: 1100, q: 3 } }); },
  // Axt ins Holz
  hacken: t => { for (const d of [0, 0.32]) { noise(t + d, { dur: 0.08, type: 'lowpass', f: 1200, vol: 0.4 }); tone(t + d, { f: 140, to: 90, dur: 0.12, type: 'triangle', vol: 0.4 }); } },
  // Spitzhacke auf Stein
  klirren: t => { for (const d of [0, 0.28]) { tone(t + d, { f: 2100, dur: 0.18, type: 'square', vol: 0.05 }); tone(t + d, { f: 3150, dur: 0.12, vol: 0.12 }); noise(t + d, { dur: 0.04, type: 'highpass', f: 3000, vol: 0.2 }); } },
  // Pinsel an der Felswand
  pinsel: t => { for (let i = 0; i < 3; i++) noise(t + i * 0.18, { dur: 0.14, f: 2500, to: 1800, q: 2, vol: 0.12, attack: 0.04 }); },
  // Fell schaben
  schaben: t => { for (let i = 0; i < 4; i++) noise(t + i * 0.15, { dur: 0.11, f: 1300, q: 3, vol: 0.16, attack: 0.03 }); },
  // Feuerstein schlagen: harte Klicks
  klopfen: t => { for (let i = 0; i < 3; i++) { noise(t + i * 0.16, { dur: 0.025, type: 'highpass', f: 2500, vol: 0.4 }); tone(t + i * 0.16, { f: 1700, dur: 0.06, vol: 0.08 }); } },
  // Ahnenplatz: Trommel
  trommel: t => { for (const [d, v] of [[0, 0.5], [0.2, 0.3], [0.4, 0.5]]) { tone(t + d, { f: 110, to: 55, dur: 0.25, vol: v }); noise(t + d, { dur: 0.05, type: 'lowpass', f: 400, vol: 0.2 }); } },
  // Tongrube: matschiges Schmatzen
  matsch: t => { noise(t, { dur: 0.25, type: 'lowpass', f: 500, vol: 0.35 }); tone(t + 0.05, { f: 90, to: 60, dur: 0.2, vol: 0.2, vib: 20, vibRate: 25 }); },
  // Töpferscheibe summt, der Topf klingt
  toepfern: t => { tone(t, { f: 110, dur: 0.7, type: 'triangle', vol: 0.12, attack: 0.15, vib: 2, vibRate: 4 }); tone(t + 0.55, { f: 880, dur: 0.4, vol: 0.12 }); tone(t + 0.55, { f: 1320, dur: 0.3, vol: 0.05 }); },
  // Speicher: Holz knarzt
  knarzen: t => { tone(t, { f: 85, to: 120, dur: 0.5, type: 'sawtooth', vol: 0.09, attack: 0.05, filter: { type: 'bandpass', f: 600, q: 5 } }); },
  // Steinkreis: tiefer, schwebender Klang
  steinkreis: t => { for (const f of [110, 165, 220]) tone(t, { f, dur: 1.6, vol: 0.09, attack: 0.5 }); tone(t + 0.3, { f: 880, dur: 1.2, vol: 0.03, attack: 0.4 }); },
  // Pflanzerin: Erde graben, Wasser gießen
  graben: t => { for (const d of [0, 0.2]) noise(t + d, { dur: 0.12, type: 'lowpass', f: 700, vol: 0.3 }); for (let i = 0; i < 4; i++) tone(t + 0.45 + i * 0.06, { f: rnd(900, 1500), to: 600, dur: 0.06, vol: 0.08 }); },
  // Schritt auf Erde
  schritt: t => { noise(t, { dur: 0.07, type: 'lowpass', f: 300, vol: 0.3 }); noise(t + 0.18, { dur: 0.07, type: 'lowpass', f: 300, vol: 0.25 }); },

  // Baum kracht um
  baumfall: t => { for (let i = 0; i < 5; i++) noise(t + i * 0.05, { dur: 0.04, type: 'highpass', f: 2000, vol: 0.15 }); noise(t + 0.3, { dur: 0.6, type: 'lowpass', f: 250, vol: 0.45, attack: 0.02 }); },

  // Ereignisse
  bauen: t => { for (let i = 0; i < 3; i++) { tone(t + i * 0.13, { f: 300, to: 200, dur: 0.07, type: 'triangle', vol: 0.3 }); noise(t + i * 0.13, { dur: 0.03, type: 'lowpass', f: 1500, vol: 0.2 }); } },
  fertig: t => { [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.08, { f, dur: 0.35, type: 'triangle', vol: 0.18 })); },
  forschung: t => { [440, 554, 659, 880, 1109].forEach((f, i) => tone(t + i * 0.09, { f, dur: 0.6, vol: 0.12, attack: 0.02 })); },
  muenze: t => { tone(t, { f: 988, dur: 0.1, type: 'square', vol: 0.06 }); tone(t + 0.08, { f: 1319, dur: 0.3, type: 'square', vol: 0.06 }); },
  fehler: t => { tone(t, { f: 150, dur: 0.18, type: 'square', vol: 0.06 }); tone(t + 0.12, { f: 110, dur: 0.25, type: 'square', vol: 0.06 }); },
  wachsen: t => { tone(t, { f: 660, to: 990, dur: 0.15, vol: 0.12 }); },
  donner: t => { noise(t, { dur: 2.2, type: 'lowpass', f: 300, to: 60, vol: 0.5, attack: 0.03 }); noise(t + 0.1, { dur: 0.4, type: 'lowpass', f: 900, vol: 0.25 }); },
  katastrophe: t => { noise(t, { dur: 1.6, type: 'lowpass', f: 200, vol: 0.4, attack: 0.2 }); [220, 233, 311].forEach(f => tone(t + 0.2, { f, dur: 1.2, type: 'sawtooth', vol: 0.05, attack: 0.2, filter: { type: 'lowpass', f: 900 } })); },
};

// Welches Geräusch gehört zu welchem Gebäude?
const BUILDING_SOUNDS = {
  lagerfeuer: 'feuer', feuerplatz: 'feuer', wohnhoehle: 'hoehle', fellzelt: 'zelt', grubenhaus: 'haus', langhaus: 'haus', pfahlbau: 'pfahl',
  sammlerin: 'rascheln', jaegerlager: 'horn', mammutjaegerlager: 'mammut', fischerplatz: 'platsch', acker: 'korn', ziegengehege: 'ziege',
  holzsammler: 'hacken', pflanzerin: 'graben', steinsammler: 'klirren', hoehlenmaler: 'pinsel', fellmacherin: 'schaben', steinschlaeger: 'klopfen',
  ahnenplatz: 'trommel', tongrube: 'matsch', toepferei: 'toepfern', vorratsspeicher: 'knarzen', steinkreis: 'steinkreis',
  pfad: 'schritt', bruecke: 'schritt',
};

let lastSoundAt = {};
function playSound(name) {
  if (!settings.sound) return;
  const key = BUILDING_SOUNDS[name] || name;
  if (!SOUNDS[key] || !audio || audio.state !== 'running') return;
  const now = audio.currentTime;
  if (lastSoundAt[key] && now - lastSoundAt[key] < 0.12) return;   // nicht zehnmal übereinander
  lastSoundAt[key] = now;
  try { SOUNDS[key](now + 0.01); } catch (e) { /* Ton ist nicht wichtig */ }
}

if (typeof document !== 'undefined' && document.addEventListener) {
  for (const ev of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(ev, unlockAudio, { passive: true });
}
on('tapped', b => playSound(b.type));
on('placed', b => { if (!BUILDINGS[b.type].isPath) playSound('bauen'); });
on('finished', b => { if (BUILDINGS[b.type].time > 0 && !BUILDINGS[b.type].isPath) playSound('fertig'); });
on('researchDone', () => playSound('forschung'));
on('treeFelled', () => { if (gameRunning) playSound('baumfall'); });
