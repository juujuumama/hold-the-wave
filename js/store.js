// all data lives on this device, in localStorage. no accounts, no server.
const KEY = 'hold-the-wave:v1';

const blank = () => ({
  version: 1,
  settings: { cycleLength: 28, lutealLength: 14 },
  periods: [],   // ['YYYY-MM-DD', ...] period start dates
  ratings: {},   // { 'YYYY-MM-DD': 1..5 }  how heavy the day felt
  urges: [],     // decisions that were put on pause
  vault: [],     // sealed notes
  letters: [],   // letters from clear-water you
});

let state = null;

export function load() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
  const b = blank();
  state = saved ? { ...b, ...saved, settings: { ...b.settings, ...(saved.settings || {}) } } : b;
  return state;
}

export const get = () => state || load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
}

export function update(fn) { fn(get()); return save(); }

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

export function exportJSON() {
  return JSON.stringify({ app: 'hold-the-wave', exported: new Date().toISOString(), ...get() }, null, 2);
}

export function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.periods)) throw new Error('that file doesn’t look like a hold the wave backup');
  const b = blank();
  state = { ...b, ...data, settings: { ...b.settings, ...(data.settings || {}) } };
  delete state.app; delete state.exported;
  save();
}

export function wipe() {
  state = blank();
  try { localStorage.removeItem(KEY); } catch {}
}

// ask the browser not to evict our data (matters most on iOS)
export function persist() {
  try { navigator.storage?.persist?.(); } catch {}
}
