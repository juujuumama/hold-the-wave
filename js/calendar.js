// tap calendar for marking the day each period started.
// most recent month first, so recent periods are one tap away.
import * as C from './cycle.js';

const DOW = ['s', 'm', 't', 'w', 't', 'f', 's'];

export function calendarHTML({ selected, months = 6, periodLength = 5, today = C.today() }) {
  const sel = new Set(selected);
  const bleed = new Set();
  for (const s of sel) for (let i = 1; i < periodLength; i++) bleed.add(C.addDays(s, i));
  const t = C.parse(today);
  let html = '';
  for (let k = 0; k < months; k++) {
    const first = new Date(t.getFullYear(), t.getMonth() - k, 1);
    const y = first.getFullYear(), mo = first.getMonth();
    const daysIn = new Date(y, mo + 1, 0).getDate();
    let cells = DOW.map((d) => `<span class="cal-dow" aria-hidden="true">${d}</span>`).join('');
    cells += '<span></span>'.repeat(first.getDay());
    for (let d = 1; d <= daysIn; d++) {
      const iso = C.toISO(new Date(y, mo, d));
      const isStart = sel.has(iso);
      const cls = ['cal-day', isStart && 'start', !isStart && bleed.has(iso) && 'bleed', iso === today && 'is-today'].filter(Boolean).join(' ');
      cells += `<button type="button" class="${cls}" data-act="cal-toggle" data-d="${iso}"${iso > today ? ' disabled' : ''} aria-pressed="${isStart}" aria-label="${C.fmt(iso, { month: 'long', day: 'numeric' })}${isStart ? ', period started' : ''}">${d}</button>`;
    }
    const title = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toLowerCase();
    html += `<div class="cal-month"><p class="cal-title">${title}</p><div class="cal-grid">${cells}</div></div>`;
  }
  return html;
}
