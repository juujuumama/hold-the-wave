// one-month tap calendar with ‹ › arrows for marking the day each period started.
// `offset` is how many months back from the current month to show.
import * as C from './cycle.js';

const DOW = ['s', 'm', 't', 'w', 't', 'f', 's'];

export function calendarHTML({ selected, offset = 0, periodLength = 5, today = C.today() }) {
  const sel = new Set(selected);
  const bleed = new Set();
  for (const s of sel) for (let i = 1; i < periodLength; i++) bleed.add(C.addDays(s, i));
  const t = C.parse(today);
  const first = new Date(t.getFullYear(), t.getMonth() - offset, 1);
  const y = first.getFullYear(), mo = first.getMonth();
  const daysIn = new Date(y, mo + 1, 0).getDate();
  const prefix = `${y}-${String(mo + 1).padStart(2, '0')}`;
  const inMonth = [...sel].filter((d) => d.startsWith(prefix)).length;

  let cells = DOW.map((d) => `<span class="cal-dow" aria-hidden="true">${d}</span>`).join('');
  cells += '<span></span>'.repeat(first.getDay());
  for (let d = 1; d <= daysIn; d++) {
    const iso = C.toISO(new Date(y, mo, d));
    const isStart = sel.has(iso);
    const cls = ['cal-day', isStart && 'start', !isStart && bleed.has(iso) && 'bleed', iso === today && 'is-today'].filter(Boolean).join(' ');
    cells += `<button type="button" class="${cls}" data-act="cal-toggle" data-d="${iso}"${iso > today ? ' disabled' : ''} aria-pressed="${isStart}" aria-label="${C.fmt(iso, { month: 'long', day: 'numeric' })}${isStart ? ', period started' : ''}">${d}</button>`;
  }
  const title = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toLowerCase();
  return `
    <div class="cal-head">
      <button type="button" class="cal-nav" data-act="cal-prev" aria-label="earlier month">‹</button>
      <div class="cal-title-wrap">
        <p class="cal-title" aria-live="polite">${title}</p>
        <p class="cal-sub">${inMonth ? `${inMonth} start${inMonth > 1 ? 's' : ''} this month` : offset === 0 ? 'this month' : `${offset} month${offset > 1 ? 's' : ''} ago`}</p>
      </div>
      <button type="button" class="cal-nav" data-act="cal-next" aria-label="later month"${offset === 0 ? ' disabled' : ''}>›</button>
    </div>
    <div class="cal-grid">${cells}</div>`;
}
