// one-month tap calendar with ‹ › arrows for marking periods.
// tap the first day of a period, and the last day too if you know it.
// `offset` is how many months back from the current month to show.
import * as C from './cycle.js';

const DOW = ['s', 'm', 't', 'w', 't', 'f', 's'];

export function calendarHTML({ selected, offset = 0, periodLength = 5, today = C.today() }) {
  const groups = C.groupPeriods(selected);
  const kind = {}; // date -> 'start' | 'end' | 'range' | 'est'
  for (const g of groups) {
    if (g.end) {
      for (let d = g.start; d <= g.end; d = C.addDays(d, 1)) kind[d] = 'range';
      kind[g.end] = 'end';
    } else {
      for (let i = 1; i < periodLength; i++) kind[C.addDays(g.start, i)] = 'est';
    }
    kind[g.start] = 'start';
  }
  const t = C.parse(today);
  const first = new Date(t.getFullYear(), t.getMonth() - offset, 1);
  const y = first.getFullYear(), mo = first.getMonth();
  const daysIn = new Date(y, mo + 1, 0).getDate();
  const prefix = `${y}-${String(mo + 1).padStart(2, '0')}`;
  const inMonth = groups.filter((g) => g.start.startsWith(prefix)).length;

  let cells = DOW.map((d) => `<span class="cal-dow" aria-hidden="true">${d}</span>`).join('');
  cells += '<span></span>'.repeat(first.getDay());
  for (let d = 1; d <= daysIn; d++) {
    const iso = C.toISO(new Date(y, mo, d));
    const k = kind[iso];
    const cls = ['cal-day', k === 'start' && 'start', k === 'end' && 'end', k === 'range' && 'range', k === 'est' && 'bleed', iso === today && 'is-today'].filter(Boolean).join(' ');
    const note = { start: ', period started', end: ', last day of period', range: ', period day' }[k] || '';
    cells += `<button type="button" class="${cls}" data-act="cal-toggle" data-d="${iso}"${iso > today ? ' disabled' : ''} aria-pressed="${k === 'start' || k === 'end'}" aria-label="${C.fmt(iso, { month: 'long', day: 'numeric' })}${note}">${d}</button>`;
  }
  const title = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toLowerCase();
  return `
    <div class="cal-head">
      <button type="button" class="cal-nav" data-act="cal-prev" aria-label="earlier month">‹</button>
      <div class="cal-title-wrap">
        <p class="cal-title" aria-live="polite">${title}</p>
        <p class="cal-sub">${inMonth ? `${inMonth} period${inMonth > 1 ? 's' : ''} started this month` : offset === 0 ? 'this month' : `${offset} month${offset > 1 ? 's' : ''} ago`}</p>
      </div>
      <button type="button" class="cal-nav" data-act="cal-next" aria-label="later month"${offset === 0 ? ' disabled' : ''}>›</button>
    </div>
    <div class="cal-grid">${cells}</div>
    <div class="cal-key"><span><i class="k-start"></i>first day</span><span><i class="k-range"></i>period</span><span><i class="k-est"></i>estimated</span></div>`;
}
