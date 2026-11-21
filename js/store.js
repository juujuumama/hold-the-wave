// all data lives on this device, in localStorage. no accounts, no server.
const KEY = 'hold-the-wave:v1';

const blank = () => ({
  version: 1,
  settings: { cycleLength: 28, lutealLength: 14, periodLength: 5 },
  periods: [],   // ['YYYY-MM-DD', ...] period start dates
  ratings: {},   // { 'YYYY-MM-DD': 1..5 }  how heavy the day felt
  urges: [],     // everything sealed in the vault: decisions on hold, plus any words written with them
  vault: [],     // (v1 only, migrated into urges)
  letters: [],   // lighthouse notes from the clear-headed you
});

let state = null;

export function load() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
  const b = blank();
  state = saved ? { ...b, ...saved, settings: { ...b.settings, ...(saved.settings || {}) } } : b;
  migrate(state);
  return state;
}

// v1 kept sealed notes in a separate `vault` list. they now live with held decisions.
function migrate(s) {
  if (!Array.isArray(s.vault) || !s.vault.length) { s.vault = []; return; }
  for (const v of s.vault) {
    s.urges.push({
      id: v.id, text: v.to ? `a note to ${v.to}` : 'something i needed to say', cat: 'vent', urgency: null,
      created: v.created, revisit: v.until, words: v.text, to: v.to || '',
      outcome: v.reviewed ? (v.kept ? 'act' : 'release') : null,
    });
  }
  s.vault = [];
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
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
  migrate(state);
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
