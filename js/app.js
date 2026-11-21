import * as store from './store.js';
import * as C from './cycle.js';
import { mantraFor, practiceFor, SCRIPTS, CATEGORIES, LETTER_PROMPTS, WEIGHT, hash } from './content.js';
import { mountWave } from './wave.js';
import { calendarHTML } from './calendar.js';
import { icon, heavyWave } from './icons.js';
import { ART } from '../art/art.js';

const $ = (s, r = document) => r.querySelector(s);
const view = $('#view');
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const catLabel = (k) => (CATEGORIES.find(([key]) => key === k) || [, 'something else'])[1];

let stopWave = null;
let lastRoute = null;
let practiceOffset = 0;
let flash = null; // one-time message shown at the top of the next render
let chosenPrompt = null; // lighthouse question being answered
let draft = new Set(); // period starts picked during setup, before saving
const calOffset = { welcome: 0, cycle: 0 }; // months back from now

function countText(set) {
  const groups = C.groupPeriods([...set]);
  if (!groups.length) return 'no dates yet. tap a day above.';
  return `${plural(groups.length, 'period')} picked · most recent started ${C.fmt(groups[groups.length - 1].start, { month: 'long', day: 'numeric' })}`;
}

const rangeText = (g) => (g.end ? `${C.fmt(g.start)}–${C.fmt(g.end)}` : C.fmt(g.start));

// what tapping a calendar day does: start a period, set or move its last day, or remove it.
// returns { marks, msg }, or null if a removal wasn't confirmed.
function tapDay(marks, d, ask) {
  const groups = C.groupPeriods(marks);
  const inGroup = (p, g) => p >= g.start && p <= (g.end || g.start);
  const g = groups.find((x) => inGroup(d, x));
  if (g && d === g.start) {
    if (ask && !ask(`remove the period ${g.end ? rangeText(g) : `that started ${C.fmt(g.start)}`}?`)) return null;
    return { marks: marks.filter((p) => !inGroup(p, g)), msg: 'period removed' };
  }
  const withoutEnd = (list, x) => list.filter((p) => !(inGroup(p, x) && p !== x.start));
  if (g && d === g.end) return { marks: C.normalizeMarks(withoutEnd(marks, g)), msg: 'last day cleared' };
  if (g) return { marks: C.normalizeMarks([...withoutEnd(marks, g), d]), msg: `period: ${C.fmt(g.start)}–${C.fmt(d)}` };
  // a new day. just before a period, it becomes that period's new first day.
  let next = [...marks, d];
  const after = groups.find((x) => x.start > d && C.diffDays(x.start, d) < C.MAX_PERIOD_DAYS);
  if (after && after.end && C.diffDays(after.end, d) >= C.MAX_PERIOD_DAYS) next = next.filter((p) => p !== after.end);
  next = C.normalizeMarks(next);
  const ng = C.groupPeriods(next).find((x) => inGroup(d, x));
  return { marks: next, msg: ng.start === d && !ng.end ? `period start logged: ${C.fmt(d)}` : `period: ${rangeText(ng)}` };
}

// a quick "my period started" replaces any start logged within a week of it
function addPeriodNear(s, d) {
  s.periods = s.periods.filter((p) => Math.abs(C.diffDays(p, d)) > 7);
  s.periods.push(d);
  s.periods = C.normalizeMarks(s.periods);
}

// a lighthouse note: the question it answers (if any) and the words.
// older notes had the question pasted into the text, so split it back out.
function noteParts(l) {
  if (l.prompt) return { prompt: l.prompt, body: l.text };
  const p = LETTER_PROMPTS.find((q) => l.text.startsWith(q));
  return p ? { prompt: p, body: l.text.slice(p.length).trim() } : { prompt: null, body: l.text };
}

function noteHTML(l) {
  const { prompt, body } = noteParts(l);
  return `${prompt ? `<p class="note-q">${esc(prompt)}</p>` : ''}${body ? `<p class="letter-body">${esc(body)}</p>` : ''}`;
}

const lbl = (ico, text) => `<p class="label with-ico">${icon(ico)}<span>${text}</span></p>`;
const stamp = (title) => {
  const a = ART.find((x) => x.title === title);
  return a ? `<span class="stamp" aria-hidden="true"><img src="${a.src}" alt=""></span>` : '';
};

function pickArt(date, phase) {
  if (!ART.length) return null;
  const pool = ART.filter((a) => a.phase === phase);
  const list = pool.length ? pool : ART;
  return list[hash(date + 'art') % list.length];
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------------- views ---------------- */

function welcome() {
  const t = C.today();
  const art = ART.find((a) => a.title === 'big wave') || ART[0];
  return `
  <section class="hero hero-welcome">
    ${art ? `<img class="hero-art" src="${art.src}" alt="${esc(art.title)}, from red wave by juujuumama">` : ''}
    <canvas id="wave" aria-hidden="true"></canvas>
    <div class="hero-label torn">
      <p class="eyebrow">for the luteal phase</p>
      <h1>hold the wave</h1>
    </div>
  </section>
  <section class="page">
    <p class="lede">a companion for pmdd. it learns when your hardest days are coming and helps you hold off on all-or-nothing decisions until you’re yourself again.</p>
    <form class="card torn" data-form="onboard">
      <p class="label">tap the first day of each period</p>
      <p class="fine">tap the last day too if you know it. use ‹ to go back a month. more dates mean better predictions, and one is enough to start. if you track in another app, copy the start dates from its history. if you’re on your period now, tap the day it started.</p>
      <div class="cal" id="cal" data-cal="welcome">${calendarHTML({ selected: draft, offset: calOffset.welcome, today: t })}</div>
      <p class="cal-count" id="cal-count">${esc(countText(draft))}</p>
      <label class="field">usual cycle length, if you know it
        <span class="inline"><input type="number" name="len" value="28" min="18" max="50" inputmode="numeric"> days</span>
      </label>
      <button class="primary">begin</button>
    </form>
    <p class="fine center">everything stays on this phone. no account, no server, no one else can see it.</p>
    <p class="center"><a href="#about">why i made this →</a></p>
  </section>`;
}

function statusLine(m) {
  const t = m.on;
  switch (m.phase) {
    case 'calm': {
      const n = C.diffDays(m.ovulation, t);
      return `the swell starts in ${plural(n, 'day')}`;
    }
    case 'rising': {
      const n = C.diffDays(m.crestStart, t);
      return `the swell is building · crest in ${plural(n, 'day')}`;
    }
    case 'crest':
      return m.late ? 'your period may be running late. the wave could break any day.'
                    : m.daysUntilNext === 0 ? 'release is due today' : `${plural(m.daysUntilNext, 'day')} until release`;
    default:
      return `the wave is going out · decisions open ${C.fmtLong(m.revisit)}`;
  }
}

function home(s, m) {
  const t = m.on;
  const art = pickArt(t, m.phase);
  const ready = s.urges.filter((u) => !u.outcome && u.revisit <= t).length;
  const letter = m.pausing && s.letters.length ? s.letters[hash(t) % s.letters.length] : null;
  const practice = practiceFor(t, m.phase, practiceOffset);
  const rating = s.ratings[t];

  return `
  <section class="hero">
    ${art ? `<img class="hero-art" src="${art.src}" alt="${esc(art.title)}, from red wave by juujuumama">` : ''}
    <canvas id="wave" aria-hidden="true"></canvas>
    <div class="hero-label torn">
      <p class="eyebrow">${esc(C.fmt(t, { weekday: 'long', month: 'long', day: 'numeric' }))} · day ${m.cycleDay}</p>
      <h1>${C.PHASES[m.phase].name}</h1>
      <p class="status">${esc(statusLine(m))}</p>
    </div>
    ${art ? `<p class="credit">${esc(art.title)} · red wave, 2026</p>` : ''}
  </section>

  <section class="page">
    ${flash ? `<p class="flash">${esc(flash)}</p>` : ''}
    ${m.pausing ? `
      <a class="pause-banner torn" href="#vault">
        ${icon('hourglass', 'ico big')}
        <div><strong>pause window · until ${esc(C.fmtLong(m.revisit))}</strong>
        <span>feel everything. decide later.</span></div>
      </a>` : ''}
    ${m.late ? `<a class="notice" href="#cycle">${icon('calendar')} period running late, or forgot to log it? add the date →</a>` : ''}
    ${ready ? `<a class="notice" href="#vault">${icon('envelope')} ${ready === 1 ? 'something you sealed is' : `${ready} things you sealed are`} ready to open →</a>` : ''}

<div class="cols"><div class="col">
    <article class="card mantra torn">
      ${lbl('wave', 'today’s mantra')}
      <blockquote>${esc(mantraFor(t, m.phase))}</blockquote>
      ${icon('wave', 'mantra-wave')}
    </article>

    ${letter ? `
    <article class="card letter torn">
      ${lbl('lighthouse', `from the lighthouse · ${esc(C.fmt(letter.created))}`)}
      ${noteHTML(letter)}
    </article>` : ''}

    <div class="actions">
      <a class="big-btn stamped" href="#vault">
        <div><span>something’s pulling at me</span><small>${icon('envelope')} name it, seal it</small></div>
        ${stamp('kitchen flood')}
      </a>
      <a class="big-btn alt stamped" href="#lighthouse">
        <div><span>${m.pausing ? 'read the lighthouse' : 'leave a light on'}</span><small>${icon('lighthouse')} ${m.pausing ? 'from the clear-headed you' : 'for your next hard day'}</small></div>
        ${stamp('lighthouse 1')}
      </a>
    </div>

</div><div class="col">
    <article class="card torn">
      <p class="label">one small thing</p>
      <div class="practice">
        <span class="practice-ico">${icon(practice.icon || 'heart')}</span>
        <div><h3>${esc(practice.title)}</h3><p>${esc(practice.body)}</p></div>
      </div>
      <button class="link" data-act="next-practice">try a different one</button>
    </article>

    <article class="card torn">
      <p class="label">how heavy is today?</p>
      <div class="scale" role="group" aria-label="how heavy is today">
        ${[1, 2, 3, 4, 5].map((n) => `
          <button data-act="rate" data-n="${n}" class="${rating === n ? 'on' : ''}" aria-pressed="${rating === n}">
            ${heavyWave(n)}<small>${WEIGHT[n]}</small>
          </button>`).join('')}
      </div>
      ${rating === 5 ? `<p class="gentle">that sounds really hard. if you’re having thoughts of hurting yourself, please <a href="#help">reach out now</a>. you deserve support today, not just next week.</p>` : ''}
      <p class="fine">rate a couple of cycles and the app learns your personal hard days.</p>
    </article>

    ${m.cycleDay >= 18 || m.late ? `
    <article class="card torn">
      ${lbl('calendar', 'did your period start?')}
      <div class="trio">
        <button class="ghost" data-act="period-on" data-ago="0">today</button>
        <button class="ghost" data-act="period-on" data-ago="1">yesterday</button>
        <a class="ghost" href="#cycle">another day</a>
      </div>
    </article>` : ''}
    </div></div>
  </section>`;
}

const isVent = (u) => u.cat === 'vent';

function openCard(u) {
  const vent = isVent(u);
  return `
      <article class="card checkin opened torn" id="u-${u.id}">
        <p class="label">✉ unsealed · held on ${esc(C.fmt(u.created))}${u.cycleDay ? `, day ${u.cycleDay}` : ''}${C.PHASES[u.phase] ? ` (${C.PHASES[u.phase].short})` : ''}</p>
        <p class="quote">“${esc(u.text)}”</p>
        ${u.words ? `
        <p class="fine">what you wanted to say${u.to ? ` to ${esc(u.to)}` : ''}:</p>
        <p class="letter-body sealed-words">${esc(u.words)}</p>` : ''}
        ${vent ? '' : `<p class="fine">${esc(catLabel(u.cat))}${u.urgency ? ` · felt ${u.urgency}/10 urgent then` : ''}</p>`}
        <p>${vent ? 'reading it now, with a clearer head, what do you want to do?' : 'you’re clearer now. does it still feel true?'}</p>
        <div class="stack">
          <button class="primary" data-act="held-out" data-id="${u.id}" data-o="act">${vent ? 'keep it. some of this was true' : 'still true. i’ll act on it, clear-headed'}</button>
          <button class="ghost" data-act="held-out" data-id="${u.id}" data-o="release">${vent ? 'release it' : 'it passed. let it go'}</button>
          <button class="link" data-act="held-out" data-id="${u.id}" data-o="later">not sure yet, ask me in a week</button>
        </div>
      </article>`;
}

function vault(s, m) {
  const t = m.on;
  const def = m.pausing ? m.revisit : C.addDays(t, 3);
  const open = s.urges.filter((u) => !u.outcome && u.revisit <= t);
  const holding = s.urges.filter((u) => !u.outcome && u.revisit > t).sort((a, b) => a.revisit.localeCompare(b.revisit));
  const kept = s.urges.filter((u) => u.outcome === 'act' && u.words);
  return `
  <section class="page">
    <header class="page-head">
      <p class="eyebrow">${m.pausing ? `pause window · until ${esc(C.fmtLong(m.revisit))}` : 'clear water'}</p>
      <h1>the vault</h1>
      <p>${m.pausing
        ? 'something pulling at you? name it, say everything you need to say, and seal it. the urge is real data. the verdict can wait until the wave goes out.'
        : 'you’re in clear water, the version of you who gets a vote. a good time to open what you sealed and look at the big stuff.'}</p>
    </header>

    ${flash ? `<p class="flash">${esc(flash)}</p>` : ''}

<div class="cols"><div class="col">
    ${open.map(openCard).join('')}

    <form class="card torn" data-form="held">
      <p class="label">what’s pulling at you?</p>
      <div class="note-sheet">
        <label class="note-line"><span>re:</span>
          <input name="text" autocomplete="off" required placeholder="i want to…" aria-label="what it’s about, in a few words">
        </label>
        <label class="note-line"><span>to:</span>
          <input name="to" autocomplete="off" placeholder="anyone? (optional)" aria-label="who it’s for (optional)">
        </label>
        <textarea name="words" class="note-body" rows="8" aria-label="say everything (optional)"
          placeholder="say everything you want to say, or leave this blank. no one will read it, not even you, until it opens."></textarea>
      </div>
      <label class="field">file it under
        <select name="cat">${CATEGORIES.map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select>
      </label>
      <label class="field urgency">how urgent does it feel? <output id="urg-out">7</output>/10
        <input type="range" name="urgency" min="1" max="10" value="7" data-out="urg-out">
      </label>
      <label class="field">sealed until
        <input type="date" name="until" value="${def}" min="${t}" required>
      </label>
      <button class="primary">✉ seal it</button>
      <p class="fine">${m.pausing ? 'if it’s true now, it’ll still be true then. you’re not saying no, just not yet.' : 'pick today to look at it now.'}</p>
    </form>

</div><div class="col">
    ${holding.length ? `
    <section>
      <h2>sealed</h2>
      ${holding.map((u) => `
        <div class="row-item sealed">
          <div><p>${esc(u.text)}</p><p class="fine">${u.words ? `sealed note${u.to ? ` to ${esc(u.to)}` : ''} · ` : ''}opens ${esc(C.fmtLong(u.revisit))}</p></div>
          <button class="x" data-act="held-del" data-id="${u.id}" aria-label="delete without opening">×</button>
        </div>`).join('')}
    </section>` : ''}

    <section>
      <h2>words for right now</h2>
      <p class="fine">for when someone wants an answer and you’re not ready to give one.</p>
      ${SCRIPTS.map((sc, i) => `
        <div class="script torn">
          <p>${esc(sc.replace('[date]', C.fmtLong(m.pausing ? m.revisit : C.addDays(t, 7))))}</p>
          <button class="link" data-act="copy" data-i="${i}">copy</button>
        </div>`).join('')}
    </section>

    ${patterns(s)}

    ${kept.length ? `
    <section>
      <h2>kept</h2>
      ${kept.map((u) => `
        <details class="card torn">
          <summary>${esc(u.text)} · ${esc(C.fmt(u.created))}</summary>
          <p class="letter-body">${esc(u.words)}</p>
          <button class="link" data-act="held-del" data-id="${u.id}">delete</button>
        </details>`).join('')}
    </section>` : ''}
</div></div>
    <p class="fine center">the seal is a promise to yourself, not a locked door. everything lives only on this phone.</p>
  </section>`;
}

function patterns(s) {
  const decisions = s.urges.filter((u) => !isVent(u));
  const resolved = decisions.filter((u) => u.outcome === 'act' || u.outcome === 'release');
  if (!resolved.length) {
    return `<section><h2>patterns</h2><p class="fine">once you’ve opened a few held decisions, this shows which urges pass with the wave and which keep coming back in clear water.</p></section>`;
  }
  const groups = {};
  for (const u of decisions) {
    const g = (groups[u.cat] ||= { total: 0, act: 0, release: 0, cycles: new Set() });
    g.total++;
    if (u.outcome === 'act') g.act++;
    if (u.outcome === 'release') g.release++;
    const c = C.cycleOf(s.periods, u.created); if (c) g.cycles.add(c);
  }
  return `
  <section>
    <h2>patterns</h2>
    ${Object.entries(groups).map(([cat, g]) => {
      const done = g.act + g.release;
      let read = 'not enough check-ins yet to tell.';
      if (done >= 2 && g.release / done >= 0.6) read = 'this one usually passes with the wave.';
      else if (done >= 2 && g.act / done >= 0.6) read = 'this keeps feeling true in clear water. it might be real and worth working on, with support.';
      else if (done >= 2) read = 'mixed. sometimes it passes, sometimes it stays.';
      return `
        <div class="card pattern torn">
          <h3>${esc(catLabel(cat))}</h3>
          <p class="fine">came up ${plural(g.total, 'time')} across ${plural(g.cycles.size, 'cycle')} · ${g.release} passed · ${g.act} stayed true</p>
          <p>${read}</p>
        </div>`;
    }).join('')}
  </section>`;
}

function lighthouse(s, m) {
  const list = [...s.letters].reverse().sort((a, b) => b.created.localeCompare(a.created)); // newest first, even on the same day
  const art = ART.find((a) => a.title === 'lighthouse 1');
  return `
  <section class="page">
    <header class="page-head">
      <p class="eyebrow">from the shore</p>
      <h1>lighthouse</h1>
      <p>${m.pausing
        ? 'notes the clear-headed you left on for today. one shines on your home screen each day of the wave.'
        : 'you’re on the shore right now. leave a light on for the you who’ll be out on the wave. one note will shine on each hard day.'}</p>
    </header>
    ${flash ? `<p class="flash">${esc(flash)}</p>` : ''}
<div class="cols"><div class="col">
    ${art ? `<figure class="art-card torn"><img src="${art.src}" alt="lighthouse 1, from red wave by juujuumama"><figcaption>lighthouse 1 · red wave, 2026</figcaption></figure>` : ''}
    <form class="card torn" data-form="letter">
      <p class="label">need a place to start? pick a question (optional)</p>
      <div class="chips">${LETTER_PROMPTS.map((p, i) => `<button type="button" class="chip${chosenPrompt === p ? ' on' : ''}" data-act="prompt" data-i="${i}" aria-pressed="${chosenPrompt === p}">${esc(p)}</button>`).join('')}</div>
      <div class="answering" id="answering"${chosenPrompt ? '' : ' hidden'}>
        <p class="note-q" id="answering-q">${esc(chosenPrompt || '')}</p>
        <button type="button" class="link" data-act="prompt-clear">clear question</button>
      </div>
      <label class="field"><span id="note-label">${chosenPrompt ? 'your answer' : 'your note'}</span>
        <textarea name="text" rows="6" required placeholder="dear me, out on the wave…"></textarea>
      </label>
      <button class="primary">leave the light on</button>
    </form>
</div><div class="col">
    ${list.length ? `<h2 class="col-head">your notes</h2>` : '<p class="fine">no notes yet. the first one you write will be waiting for you on your next hard day.</p>'}
    ${list.map((l) => `
      <article class="card letter torn">
        <p class="label">${esc(C.fmt(l.created, { month: 'long', day: 'numeric', year: 'numeric' }))}</p>
        ${noteHTML(l)}
        <button class="link" data-act="letter-del" data-id="${l.id}">delete</button>
      </article>`).join('')}
</div></div>
  </section>`;
}

function cycle(s, m) {
  const t = m.on;
  const days = Math.max(m.length, m.cycleDay);
  const strip = Array.from({ length: days }, (_, i) => {
    const d = C.addDays(m.last, i);
    const ph = C.phaseOn(m, d);
    return `<span class="d ${ph}${d === t ? ' today' : ''}" title="${esc(C.fmt(d))} · ${C.PHASES[ph].name}"></span>`;
  }).join('');
  const groups = C.groupPeriods(s.periods).reverse();
  const plen = C.avgPeriodLength(s.periods, s.settings.periodLength);
  return `
  <section class="page">
    <header class="page-head">
      <p class="eyebrow">day ${m.cycleDay} of about ${m.length}</p>
      <h1>your cycle</h1>
    </header>

<div class="cols"><div class="col">
    <article class="card torn">
      <div class="strip" aria-label="this cycle by phase">${strip}</div>
      <div class="legend">
        <span><i class="d release"></i>release</span><span><i class="d calm"></i>calm</span>
        <span><i class="d rising"></i>swell</span><span><i class="d crest"></i>crest</span>
      </div>
      <p class="fine">${m.count
        ? `average cycle: ${m.length} days, from ${plural(m.count, 'cycle')}${m.spread ? `, varies by about ${plural(m.spread, 'day')}` : ''}.`
        : `using a ${m.length}-day cycle until you log a second period.`}
        ${m.crestWin.learned
          ? ` your crest is learned from your ratings: about ${-m.crestWin.from} to ${-Math.min(m.crestWin.to, -1)} days before your period.`
          : ' the crest is estimated as the week before your period. rate your days to make it yours.'}
        ${m.spread >= 6 ? `<p class="fine">your cycles vary quite a bit (about ${m.spread} days), so your swell can arrive earlier than shown. if you feel it coming early, trust that over the calendar.</p>` : ''}
    </article>

    <article class="card torn">
      <h2>coming up</h2>
      <table class="forecast">
        <thead><tr><th>swell</th><th>crest</th><th>period</th><th>clear</th></tr></thead>
        <tbody>${C.forecast(m).map((f) => `
          <tr><td>${esc(C.fmt(f.swell))}</td><td>${esc(C.fmt(f.crestStart))}–${esc(C.fmt(f.crestEnd))}</td><td>${esc(C.fmt(f.period))}</td><td>${esc(C.fmt(f.clear))}</td></tr>`).join('')}
        </tbody>
      </table>
      <p class="fine">the pause window runs from the swell until clear. these are estimates. bodies aren’t clocks.</p>
    </article>

</div><div class="col">
    <article class="card torn">
      <p class="label">tap the first day of each period</p>
      <p class="fine">tap the last day too if you know it. tap a first day again to remove that period. use ‹ › to change months.</p>
      <div class="cal" id="cal" data-cal="cycle">${calendarHTML({ selected: s.periods, offset: calOffset.cycle, periodLength: plen, today: t })}</div>
    </article>

    <section>
      <h2>logged</h2>
      ${groups.map((g, i) => `
        <div class="row-item"><div><p>${esc(C.fmt(g.start, { month: 'long', day: 'numeric' }))}${g.end ? `–${esc(C.fmt(g.end, g.end.slice(5, 7) === g.start.slice(5, 7) ? { day: 'numeric' } : { month: 'long', day: 'numeric' }))}` : ''}, ${g.start.slice(0, 4)}</p>
        <p class="fine">${i === 0 ? `current cycle · day ${C.diffDays(t, g.start) + 1}` : `${C.diffDays(groups[i - 1].start, g.start)}-day cycle`}${g.end ? ` · ${C.diffDays(g.end, g.start) + 1}-day period` : ''}</p></div>
        <button class="x" data-act="period-del" data-d="${g.start}" aria-label="remove this period">×</button></div>`).join('')}
    </section>

</div></div>
    <p class="center"><a href="#settings">settings & your data →</a></p>
  </section>`;
}

function settings(s) {
  return `
  <section class="page">
    <header class="page-head"><h1>settings</h1></header>
    <form class="card torn" data-form="settings">
      <label class="field">usual cycle length (used until you log 2+ periods)
        <span class="inline"><input type="number" name="len" min="18" max="50" value="${s.settings.cycleLength}" inputmode="numeric"> days</span>
      </label>
      <label class="field">usual period length
        <span class="inline"><input type="number" name="plen" min="2" max="10" value="${s.settings.periodLength}" inputmode="numeric"> days</span>
      </label>
      <label class="field">luteal phase length (usually 12–14)
        <span class="inline"><input type="number" name="luteal" min="9" max="17" value="${s.settings.lutealLength}" inputmode="numeric"> days</span>
      </label>
      <button class="primary">save</button>
    </form>

    <article class="card torn">
      <h2>your data</h2>
      <p class="fine">everything lives only on this phone. back it up now and then. if you clear your browser or lose your phone, it’s gone.</p>
      <div class="stack">
        <button class="ghost" data-act="export">download a backup</button>
        <label class="ghost file">restore from a backup<input type="file" accept="application/json,.json" data-act="import" hidden></label>
        <button class="link danger" data-act="wipe">delete everything</button>
      </div>
      <p class="fine">your daily ratings are good evidence for a doctor. pmdd is usually diagnosed from about two months of daily tracking.</p>
    </article>

    <article class="card torn">
      <h2>add it to your home screen</h2>
      <p class="fine">iphone: tap share, then “add to home screen.” android: tap the menu, then “install app.” it works offline once installed.</p>
    </article>
  </section>`;
}

function about() {
  return `
  <section class="hero hero-about">
    <img class="hero-art" src="art/cover.jpg" alt="cover image of red wave by juujuumama">
    <div class="hero-label torn"><p class="eyebrow">about</p><h1>why i made this</h1></div>
  </section>
  <section class="page prose">
    <p>i live with pmdd. every month, for about two weeks, something moves through me that isn’t me. it rises slowly, then all at once. it floods ordinary rooms: the kitchen, the bathroom mirror, the dinner table. then it goes back out like it was never there.</p>
    <p>red wave started as a way to make that visible. thirty collages of a crimson tide moving through homes and familiar landscapes. the places stay the same. the water is what changes.</p>
    <p>the hardest part isn’t only the feeling. it’s what the feeling tells you to do. quit. leave. cut them off. say it. burn it down. on the wave, those urges feel like clarity, like finally seeing things as they really are. but they’re coming from a version of me who isn’t thinking clearly and doesn’t have my best interest at heart.</p>
    <p>so i made the thing i needed. hold the wave doesn’t try to fix the feeling. it holds the decision. it knows when my wave is coming. it reminds me that nothing permanent should be decided in a temporary storm. and it keeps the things i need to say somewhere safe until i’m myself again.</p>
    <p>if you have pmdd: you’re not crazy, you’re not dramatic, and you’re not alone. the feeling is real. the verdict can wait. the tide always goes back out.</p>
    <p class="sig">sierra renee · juujuumama</p>

    <h2>the art</h2>
    <p><em>red wave</em> (2026) is a series of 30 works about living with premenstrual dysphoric disorder. every image in this app is from it. <a href="https://juujuumama.art/project/red-wave" target="_blank" rel="noopener">see the full series at juujuumama.art →</a></p>

    <h2>the app</h2>
    <p>everything you enter stays on your phone. there’s no account, no server, no tracking. hold the wave isn’t medical advice or a substitute for care. if your symptoms are severe, please talk to a doctor. you deserve treatment, not just coping.</p>
    <p>for support and information about pmdd, <a href="https://iapmd.org" target="_blank" rel="noopener">iapmd.org</a> is a good place to start.</p>
    <p><a href="#help">need help right now →</a></p>
  </section>`;
}

function help() {
  return `
  <section class="page">
    <header class="page-head">
      <p class="eyebrow">you don’t have to hold this alone</p>
      <h1>help now</h1>
      <p>pmdd can bring thoughts of suicide or self-harm. those thoughts are a symptom, not the truth, and they deserve real support right now.</p>
    </header>
    <div class="stack">
      <a class="big-btn" href="tel:988"><span>call 988</span><small>suicide & crisis lifeline (us)</small></a>
      <a class="big-btn alt" href="sms:988"><span>text 988</span><small>if talking feels like too much</small></a>
      <a class="big-btn alt" href="https://findahelpline.com" target="_blank" rel="noopener"><span>outside the us</span><small>find a free helpline in your country</small></a>
    </div>
    <article class="card torn">
      <p>if you’re in immediate danger, call your local emergency number (911 in the us).</p>
      <p class="fine">for pmdd-specific peer support, <a href="https://iapmd.org" target="_blank" rel="noopener">iapmd.org</a> has resources, a provider directory and peer support groups.</p>
    </article>
  </section>`;
}

const VIEWS = { home, vault, lighthouse, cycle, settings, about, help };
const ALIASES = { pause: 'vault', letters: 'lighthouse' }; // old links keep working

// pick (or clear) the lighthouse question without touching what's typed
function setPrompt(p) {
  chosenPrompt = p;
  document.querySelectorAll('[data-act="prompt"]').forEach((c) => {
    const on = LETTER_PROMPTS[Number(c.dataset.i)] === p;
    c.classList.toggle('on', on); c.setAttribute('aria-pressed', on);
  });
  $('#answering').hidden = !p;
  $('#answering-q').textContent = p || '';
  $('#note-label').textContent = p ? 'your answer' : 'your note';
  const ta = $('[data-form="letter"] textarea');
  ta.placeholder = p ? 'write your answer…' : 'dear me, out on the wave…';
  ta.focus({ preventScroll: true });
  $('#answering').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function refreshWelcomeCal() {
  $('#cal').innerHTML = calendarHTML({ selected: draft, offset: calOffset.welcome });
  $('#cal-count').textContent = countText(draft);
}

function refreshCycleCal() {
  const s = store.get();
  $('#cal').innerHTML = calendarHTML({ selected: s.periods, offset: calOffset.cycle, periodLength: C.avgPeriodLength(s.periods, s.settings.periodLength) });
}

function stepCal(el, delta) {
  const which = el.closest('[data-cal]').dataset.cal;
  calOffset[which] = Math.min(Math.max(calOffset[which] + delta, 0), 60);
  if (which === 'welcome') refreshWelcomeCal(); else refreshCycleCal();
}

/* ---------------- render ---------------- */

function render() {
  const s = store.get();
  let route = (location.hash.slice(1) || 'home').split('/')[0];
  route = ALIASES[route] || route;
  const needsSetup = !s.periods.length;
  if (needsSetup && !['about', 'help', 'settings'].includes(route)) route = 'welcome';
  const m = needsSetup ? null : C.model(s);

  if (stopWave) { stopWave(); stopWave = null; }
  view.innerHTML = route === 'welcome' ? welcome() : (VIEWS[route] || home)(s, m || {});
  flash = null;

  document.body.dataset.route = route;
  document.body.dataset.phase = m ? m.phase : 'calm';
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === route));
  $('.nav').hidden = needsSetup;

  const cv = $('#wave');
  if (cv) stopWave = mountWave(cv, route === 'welcome' ? 0.55 : m ? m.intensity : 0.3);
  if (route !== lastRoute) { window.scrollTo(0, 0); view.focus({ preventScroll: true }); }
  lastRoute = route;
}

function go(route, message) {
  flash = message || null;
  if (location.hash === '#' + route) render(); else location.hash = route;
}

/* ---------------- actions ---------------- */

const actions = {
  'cal-toggle'(el) {
    const d = el.dataset.d;
    if (el.closest('[data-cal]').dataset.cal === 'welcome') {
      draft = new Set(tapDay([...draft], d).marks);
      refreshWelcomeCal();
      return;
    }
    const res = tapDay(store.get().periods, d, (q) => confirm(q));
    if (!res) return;
    store.update((st) => { st.periods = res.marks; });
    if (!res.marks.length) { go('home'); return; }
    toast(res.msg);
    render();
  },
  'cal-prev'(el) { stepCal(el, 1); },
  'cal-next'(el) { stepCal(el, -1); },
  'next-practice'() { practiceOffset++; render(); },
  rate(el) {
    const n = Number(el.dataset.n), t = C.today();
    store.update((s) => { if (s.ratings[t] === n) delete s.ratings[t]; else s.ratings[t] = n; });
    render();
  },
  'period-on'(el) {
    const d = C.addDays(C.today(), -Number(el.dataset.ago || 0));
    store.update((st) => addPeriodNear(st, d));
    go('home', `logged ${C.fmt(d, { month: 'long', day: 'numeric' })}. the wave is going out. be gentle with yourself for a few more days.`);
  },
  'held-out'(el) {
    const o = el.dataset.o, id = el.dataset.id;
    const u0 = store.get().urges.find((x) => x.id === id); if (!u0) return;
    const vent = isVent(u0);
    const apply = () => {
      store.update((s) => {
        const u = s.urges.find((x) => x.id === id); if (!u) return;
        if (o === 'later') { u.revisit = C.addDays(C.today(), 7); return; }
        u.outcome = o; u.resolved = C.today();
        if (o === 'release') { delete u.words; delete u.to; } // released words are gone for good
      });
      flash = {
        act: vent ? 'kept. some of it was real, and now you can deal with it clearly.' : 'okay. you decided this with a clear head. that’s exactly the point.',
        release: vent ? 'released. you never had to send it.' : 'released. the wave took it with it.',
        later: 'okay. it’s sealed again for a week.',
      }[o];
      render();
    };
    if (o === 'release') { $('#u-' + id)?.classList.add('releasing'); setTimeout(apply, 700); } else apply();
  },
  'held-del'(el) {
    if (!confirm('delete this for good, without opening it?')) return;
    store.update((s) => { s.urges = s.urges.filter((u) => u.id !== el.dataset.id); });
    render();
  },
  copy(el) {
    const p = el.closest('.script').querySelector('p').textContent;
    navigator.clipboard?.writeText(p).then(() => toast('copied'), () => toast('couldn’t copy. press and hold to select it.'));
  },
  prompt(el) {
    const p = LETTER_PROMPTS[Number(el.dataset.i)];
    setPrompt(chosenPrompt === p ? null : p);
  },
  'prompt-clear'() { setPrompt(null); },
  'letter-del'(el) { if (confirm('delete this letter?')) { store.update((s) => { s.letters = s.letters.filter((l) => l.id !== el.dataset.id); }); render(); } },
  'period-del'(el) {
    const g = C.groupPeriods(store.get().periods).find((x) => x.start === el.dataset.d);
    if (!g || !confirm(`remove the period ${rangeText(g)}?`)) return;
    store.update((s) => { s.periods = s.periods.filter((p) => p < g.start || p > (g.end || g.start)); });
    if (!store.get().periods.length) { go('home'); return; }
    render();
  },
  export() {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `hold-the-wave-backup-${C.today()}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  wipe() {
    const typed = prompt('this deletes every date, note and letter on this phone. type “delete” to confirm.');
    if (typed && typed.trim().toLowerCase() === 'delete') { store.wipe(); go('home'); toast('everything deleted'); }
  },
};

const forms = {
  onboard(f) {
    const dates = [...draft];
    if (!dates.length) { toast('tap the day your last period started'); return; }
    const len = Number(f.len.value) || 28;
    store.update((s) => {
      s.periods = C.normalizeMarks([...s.periods, ...dates]);
      s.settings.cycleLength = Math.min(Math.max(len, 18), 50);
    });
    store.persist();
    draft = new Set();
    go('home');
  },
  held(f) {
    const s = store.get(), m = C.model(s);
    const t = C.today();
    const text = f.text.value.trim(); if (!text) return;
    const words = f.words.value.trim();
    const revisit = f.until.value >= t ? f.until.value : t;
    const u = {
      id: store.uid(), text, cat: f.cat.value, urgency: f.cat.value === 'vent' ? null : Number(f.urgency.value),
      created: t, cycleDay: m.cycleDay, phase: m.phase, revisit, outcome: null,
      ...(words ? { words, to: f.to.value.trim() } : {}),
    };
    store.update((st) => st.urges.push(u));
    flash = revisit === t
      ? 'logged. it’s ready to look at now.'
      : `sealed until ${C.fmtLong(revisit)}. ${words ? 'you got it out. ' : ''}you’re not saying no, just not yet.`;
    render();
  },
  letter(f) {
    const text = f.text.value.trim(); if (!text) return;
    const note = { id: store.uid(), text, created: C.today(), ...(chosenPrompt ? { prompt: chosenPrompt } : {}) };
    store.update((s) => s.letters.push(note));
    chosenPrompt = null;
    flash = 'the light is on. it’ll find you on a hard day.';
    render();
  },
  settings(f) {
    store.update((s) => {
      s.settings.cycleLength = Math.min(Math.max(Number(f.len.value) || 28, 18), 50);
      s.settings.lutealLength = Math.min(Math.max(Number(f.luteal.value) || 14, 9), 17);
      s.settings.periodLength = Math.min(Math.max(Number(f.plen.value) || 5, 2), 10);
    });
    toast('saved'); render();
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'INPUT') return;
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el); }
});

document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-form]');
  if (!f) return;
  e.preventDefault();
  forms[f.dataset.form]?.(f);
});

document.addEventListener('input', (e) => {
  const out = e.target.dataset?.out;
  if (out) $('#' + out).textContent = e.target.value;
});

document.addEventListener('change', async (e) => {
  if (e.target.name === 'cat') {
    const vent = e.target.value === 'vent';
    const f = e.target.form;
    f.querySelector('.urgency').hidden = vent;
    f.text.placeholder = vent ? 'what’s this about?' : 'i want to…';
  }
  if (e.target.dataset?.act !== 'import') return;
  const file = e.target.files?.[0]; if (!file) return;
  try { store.importJSON(await file.text()); toast('restored'); go('home'); }
  catch (err) { toast(err.message || 'couldn’t read that file'); }
});

window.addEventListener('hashchange', render);
// re-render when the day changes while the app is open
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

store.load();
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
