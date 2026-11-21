// date helpers + cycle predictions. dates are local 'YYYY-MM-DD' strings throughout.

export const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return toISO(d); };
export const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 86400000); // a − b
export const today = () => toISO(new Date());
export const fmt = (s, o = { month: 'short', day: 'numeric' }) => parse(s).toLocaleDateString(undefined, o).toLowerCase();
export const fmtLong = (s) => fmt(s, { weekday: 'short', month: 'short', day: 'numeric' });

export const PHASES = {
  calm:    { name: 'calm water',  short: 'calm' },
  rising:  { name: 'the swell',   short: 'swell' },
  crest:   { name: 'the crest',   short: 'crest' },
  release: { name: 'release',     short: 'release' },
};

const DEFAULT_CREST = { from: -7, to: -1, learned: false }; // days relative to next period start

// the raw dates you've tapped (period starts, plus optional last days)
export function sortedPeriods(periods) {
  return [...new Set(periods)].sort();
}

// taps within 10 days of a period's first day belong to that same period:
// the first is the start, the last is the end. so "aug 3" + "aug 8" = one period, aug 3–8.
export const MAX_PERIOD_DAYS = 10;
export function groupPeriods(marks) {
  const out = [];
  for (const d of sortedPeriods(marks)) {
    const g = out[out.length - 1];
    if (g && diffDays(d, g.start) < MAX_PERIOD_DAYS) g.end = d;
    else out.push({ start: d, end: null });
  }
  return out;
}
export const periodStarts = (marks) => groupPeriods(marks).map((g) => g.start);
// back to just a start (+ end) per period, dropping any taps in between
export const normalizeMarks = (marks) => groupPeriods(marks).flatMap((g) => (g.end ? [g.start, g.end] : [g.start]));

export function avgPeriodLength(marks, fallback = 5) {
  const lens = groupPeriods(marks).filter((g) => g.end).map((g) => diffDays(g.end, g.start) + 1);
  return lens.length ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : fallback;
}

export function averageCycle(periods, fallback = 28) {
  const s = periodStarts(periods);
  const diffs = [];
  for (let i = 1; i < s.length; i++) {
    const d = diffDays(s[i], s[i - 1]);
    if (d >= 18 && d <= 50) diffs.push(d); // ignore gaps that are probably missed logs
  }
  const recent = diffs.slice(-6);
  if (!recent.length) return { length: fallback, count: 0, spread: null };
  const length = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
  return { length, count: recent.length, spread: Math.max(...recent) - Math.min(...recent) };
}

// learn the personal crest from daily ratings across completed cycles.
// needs ratings in at least 2 completed cycles; finds the 7-day stretch
// (between 14 days before and 2 days into a period) with the heaviest average.
export function learnCrest(periods, ratings) {
  const s = periodStarts(periods);
  const byOffset = {};
  const cyclesWithData = new Set();
  for (let i = 1; i < s.length; i++) {
    const start = s[i - 1], next = s[i];
    for (const [date, val] of Object.entries(ratings)) {
      let off = null;
      if (date >= start && date < next) off = diffDays(date, next);       // negative: days before period
      else if (date >= next && date <= addDays(next, 1)) off = diffDays(date, next); // 0..1
      if (off !== null && off >= -14 && off <= 1) {
        (byOffset[off] ||= []).push(val);
        cyclesWithData.add(next);
      }
    }
  }
  if (cyclesWithData.size < 2) return null;
  const avg = (o) => (byOffset[o] ? byOffset[o].reduce((a, b) => a + b, 0) / byOffset[o].length : null);
  let best = null;
  for (let from = -14; from <= -5; from++) {
    const vals = [];
    for (let o = from; o < from + 7; o++) { const a = avg(o); if (a !== null) vals.push(a); }
    if (vals.length < 4) continue;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (!best || mean > best.mean) best = { from, to: Math.min(from + 6, 1), mean };
  }
  return best ? { from: best.from, to: best.to, learned: true } : null;
}

// the full picture for a given day
export function model(state, on = today()) {
  const periods = periodStarts(state.periods);
  const past = periods.filter((p) => p <= on);
  if (!past.length) return null;

  const { length, count, spread } = averageCycle(periods, state.settings.cycleLength);
  const luteal = Math.min(Math.max(state.settings.lutealLength || 14, 9), 17);
  const crestWin = learnCrest(periods, state.ratings) || DEFAULT_CREST;

  const last = past[past.length - 1];
  const next = addDays(last, length);
  const cycleDay = diffDays(on, last) + 1;
  const late = on > next;
  const ovulation = addDays(next, -luteal);
  const crestStart = addDays(next, crestWin.from);
  const crestEnd = addDays(next, Math.min(crestWin.to, -1));

  let phase, pausing, revisit;
  if (cycleDay <= 3) {
    // first days of bleeding: the wave is going out, but still no big moves
    phase = 'release'; pausing = true; revisit = addDays(last, 3);
  } else if (late || on >= crestStart) {
    phase = 'crest'; pausing = true; revisit = addDays(late ? on : next, 3);
  } else if (on >= ovulation) {
    phase = 'rising'; pausing = true; revisit = addDays(next, 3);
  } else {
    phase = 'calm'; pausing = false; revisit = on;
  }

  // 0..1, how high the tide is drawn
  let intensity;
  if (phase === 'calm') intensity = 0.12;
  else if (phase === 'rising') {
    const span = Math.max(diffDays(crestStart, ovulation), 1);
    intensity = 0.3 + 0.4 * (diffDays(on, ovulation) / span);
  } else if (phase === 'crest') intensity = 1;
  else intensity = [0.75, 0.55, 0.35][cycleDay - 1];

  return {
    on, last, next, length, count, spread, luteal, cycleDay, late,
    ovulation, crestStart, crestEnd, crestWin,
    phase, pausing, revisit, intensity,
    daysUntilNext: Math.max(diffDays(next, on), 0),
  };
}

// phase for any date inside the current predicted cycle (used for the strip)
export function phaseOn(m, date) {
  const day = diffDays(date, m.last) + 1;
  if (day <= 3) return 'release';
  if (date >= m.crestStart) return 'crest';
  if (date >= m.ovulation) return 'rising';
  return 'calm';
}

export function forecast(m, cycles = 3) {
  const out = [];
  for (let k = 0; k < cycles; k++) {
    const start = addDays(m.next, k * m.length);
    out.push({
      swell: addDays(start, -m.luteal),
      crestStart: addDays(start, m.crestWin.from),
      crestEnd: addDays(start, Math.min(m.crestWin.to, -1)),
      period: start,
      clear: addDays(start, 3),
    });
  }
  return out;
}

// which cycle (by its start date) a date belongs to
export function cycleOf(periods, date) {
  const past = periodStarts(periods).filter((p) => p <= date);
  return past.length ? past[past.length - 1] : null;
}
