// Lädt game.js ohne Browser in Node – mit einfachen Platzhaltern für Seite (DOM), Canvas und Speicher.
// So können Tests und der Balancing-Bot die echte Spiellogik (und den Zeichencode) ausführen.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Platzhalter für ein HTML-Element: nimmt alles an, tut nichts Sichtbares
function fakeElement(tag = 'div') {
  const classes = new Set();
  const el = {
    tagName: tag.toUpperCase(),
    children: [],
    dataset: {},
    style: {},
    textContent: '',
    innerHTML: '',
    value: '',
    title: '',
    disabled: false,
    readOnly: false,
    offsetHeight: 120,
    classList: {
      add: (...c) => c.forEach(x => classes.add(x)),
      remove: (...c) => c.forEach(x => classes.delete(x)),
      toggle(c, force) {
        const on = force === undefined ? !classes.has(c) : !!force;
        if (on) classes.add(c); else classes.delete(c);
        return on;
      },
      contains: c => classes.has(c),
    },
    addEventListener() {},
    removeEventListener() {},
    appendChild(child) { el.children.push(child); return child; },
    remove() {},
    focus() {},
    select() {},
    click() {},
    setPointerCapture() {},
    closest: () => null,
    querySelector: () => fakeElement(),
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 600 }),
    getContext: () => fakeCanvasContext(),
  };
  return el;
}

// Canvas-Platzhalter: jede Zeichenfunktion existiert und tut nichts
function fakeCanvasContext() {
  const store = {};
  return new Proxy(store, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return text => ({ width: String(text).length * 8 });
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => ({ addColorStop() {} });
      return () => {};
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
}

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: k => { delete data[k]; },
    clear: () => { for (const k of Object.keys(data)) delete data[k]; },
    _data: data,
  };
}

// Reproduzierbarer Zufall (für vergleichbare Bot-Läufe)
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Startet das Spiel ohne Browser.
 * @param {object} options
 * @param {object} [options.storage] Inhalt des localStorage (z. B. ein Spielstand aus einem früheren Lauf)
 * @param {number} [options.seed]    Startwert für Math.random (gleicher Wert = gleicher Ablauf)
 * @returns {{ run: (code: string) => any, errors: string[], logs: string[], storage: object }}
 */
export function loadGame({ storage = {}, seed } = {}) {
  const errors = [];
  const logs = [];
  const elements = new Map();
  const version = (fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/name="app-version" content="(\d+)"/) || [])[1];
  const local = fakeStorage(storage);
  const math = Object.create(Math);
  if (seed !== undefined) math.random = seededRandom(seed);

  const document = {
    body: fakeElement('body'),
    visibilityState: 'visible',
    getElementById(id) {
      if (!elements.has(id)) {
        const el = fakeElement(id === 'map' ? 'canvas' : 'div');
        if (id !== 'map') el.classList.add('hidden');   // Fenster sind anfangs zu, wie in index.html
        elements.set(id, el);
      }
      return elements.get(id);
    },
    createElement: tag => fakeElement(tag),
    querySelector: sel => (sel.includes('app-version') ? { content: version } : fakeElement()),
    querySelectorAll: () => [],
    addEventListener() {},
  };

  const context = {
    console: {
      log: (...a) => logs.push(a.join(' ')),
      warn: (...a) => logs.push('WARN ' + a.join(' ')),
      error: (...a) => errors.push(a.join(' ')),
    },
    document,
    localStorage: local,
    sessionStorage: fakeStorage(),
    navigator: {},
    location: { reload() {}, href: 'http://localhost/' },
    performance: { now: () => performance.now() },
    Math: math,
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval: () => 0,
    clearInterval() {},
    requestAnimationFrame: () => 0,
    ResizeObserver: class { observe() {} },
    confirm: () => true,
    prompt: () => '',
    alert() {},
    devicePixelRatio: 1,
    addEventListener() {},
    TextEncoder,
    TextDecoder,
  };
  context.window = context;
  vm.createContext(context);

  const source = fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8');
  try {
    vm.runInContext(source, context, { filename: 'game.js' });
  } catch (e) {
    errors.push(`Start: ${e.stack || e}`);
  }

  return {
    // Code im Spiel ausführen (hat Zugriff auf state, update, placeBuilding …)
    run(code) {
      try {
        return vm.runInContext(code, context, { filename: 'tools' });
      } catch (e) {
        errors.push(e.stack || String(e));
        return undefined;
      }
    },
    errors,
    logs,
    storage: local._data,
  };
}
