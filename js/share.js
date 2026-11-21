// draws the share cards (1080×1350) on a canvas, right on the phone. nothing is uploaded.
const W = 1080, H = 1350, PAD = 70;
const COL = {
  paper: '#f1e8d8', card: '#fbf5ea', ink: '#2a211f', muted: '#76685e', line: '#dccbb2',
  crimson: '#e2264d', deep: '#b5122f', pink: '#f27391', pinkp: '#f8d3d9', rising: '#f5a9bb',
  teal: '#6fb3ad', tealp: '#cfe5df', teald: '#2d6b69',
};
const SERIF = "'Fraunces', Georgia, serif";
const MONO = "'Courier Prime', 'Courier New', monospace";

const images = {};
const loadImage = (src) => (images[src] ||= new Promise((res, rej) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
}));

export async function fontsReady() {
  try {
    await Promise.all(['italic 100px Fraunces', '400 36px Fraunces', '26px "Courier Prime"'].map((f) => document.fonts.load(f)));
  } catch {}
}

/* ---------- drawing helpers ---------- */

let noise = null;
function grain(ctx) {
  if (!noise) {
    noise = document.createElement('canvas'); noise.width = noise.height = 180;
    const n = noise.getContext('2d'); const d = n.createImageData(180, 180);
    for (let i = 0; i < d.data.length; i += 4) { const v = 120 + Math.random() * 135; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    n.putImageData(d, 0, 0);
  }
  ctx.save(); ctx.globalAlpha = 0.1; ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = ctx.createPattern(noise, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
}

function cover(ctx, img, x, y, w, h, focus = 0.4) {
  const s = Math.max(w / img.width, h / img.height);
  const iw = img.width * s, ih = img.height * s;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) * focus, iw, ih);
  ctx.restore();
}

// torn paper edge along the bottom of the artwork
function torn(ctx, y) {
  const pts = [6, 3, 7, 1, 6, 4, 9, 0, 7, 5, 6, 2, 8, 4, 7, 0, 9, 5, 6, 3, 8, 1, 7, 4, 8, 2, 7, 5, 9, 1];
  ctx.fillStyle = COL.paper; ctx.beginPath(); ctx.moveTo(0, y + 2);
  let x = 0, i = 0;
  while (x < W) { ctx.lineTo(x, y - 22 + pts[i % pts.length] * 2.4); x += 16 + ((i * 7) % 11); i++; }
  ctx.lineTo(W, y - 10); ctx.lineTo(W, y + 2); ctx.closePath(); ctx.fill();
}

function credit(ctx, t) {
  ctx.font = `22px ${MONO}`;
  const w = ctx.measureText(t).width + 24;
  ctx.fillStyle = 'rgba(251,245,234,.88)'; ctx.fillRect(W - 28 - w, 28, w, 38);
  ctx.fillStyle = COL.ink; ctx.fillText(t, W - 28 - w + 12, 54);
}

// wrapped text made of styled runs: [{ t, font, color }]. returns the y after the last line.
function rich(ctx, runs, x, y, maxW, lh, draw = true) {
  const words = [];
  runs.forEach((r) => r.t.split(/(\s+)/).forEach((w) => { if (w) words.push({ w, font: r.font, color: r.color }); }));
  const lines = []; let line = [], lw = 0;
  for (const wd of words) {
    ctx.font = wd.font;
    const ww = ctx.measureText(wd.w).width;
    const space = /^\s+$/.test(wd.w);
    if (!space && lw + ww > maxW && line.length) {
      while (line.length && /^\s+$/.test(line[line.length - 1].w)) line.pop();
      lines.push(line); line = []; lw = 0;
    }
    if (space && !line.length) continue;
    line.push({ ...wd, ww }); lw += ww;
  }
  if (line.length) lines.push(line);
  if (draw) lines.forEach((ln, i) => {
    let cx = x;
    ln.forEach((wd) => { ctx.font = wd.font; ctx.fillStyle = wd.color; ctx.fillText(wd.w, cx, y + i * lh); cx += wd.ww; });
  });
  return y + lines.length * lh;
}
const text = (ctx, t, font, color, x, y, maxW, lh, draw) => rich(ctx, [{ t, font, color }], x, y, maxW, lh, draw);

function footer(ctx, left, right) {
  ctx.font = `22px ${MONO}`; ctx.fillStyle = COL.muted;
  ctx.fillText(left, PAD, H - 44);
  ctx.fillText(right, W - PAD - ctx.measureText(right).width, H - 44);
}

async function artTop(ctx, art, h) {
  ctx.fillStyle = COL.tealp; ctx.fillRect(0, 0, W, h);
  const img = await loadImage(art.src).catch(() => null);
  if (img) cover(ctx, img, 0, 0, W, h, art.focus ?? 0.4);
  torn(ctx, h);
  credit(ctx, `${art.title} · red wave, 2026`);
}

function noteBox(ctx, x, y, w, heading, items, bg, headColor, angle) {
  const itemFont = `29px ${SERIF}`, lh = 38;
  // measure
  let hgt = 26 + 30 + 16;
  items.forEach((it) => { hgt = text(ctx, `~ ${it}`, itemFont, COL.ink, 0, hgt, w - 56, lh, false) + 4; });
  hgt += 6;
  ctx.save();
  ctx.translate(x + w / 2, y + hgt / 2); ctx.rotate(angle); ctx.translate(-w / 2, -hgt / 2);
  ctx.shadowColor = 'rgba(60,30,20,.22)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, hgt);
  ctx.shadowColor = 'transparent';
  text(ctx, heading, `24px ${MONO}`, headColor, 28, 26 + 22, w - 56, 30);
  let yy = 26 + 30 + 16 + 30;
  items.forEach((it) => {
    yy = rich(ctx, [{ t: '~ ', font: itemFont, color: COL.crimson }, { t: it, font: itemFont, color: COL.ink }], 28, yy, w - 56, lh) + 4;
  });
  ctx.restore();
  return y + hgt;
}

/* ---------- card 1: wave report ---------- */
// d: { dateLabel, title, lede, strip?: { days: [{ phase, today }], left, mid, right }, today?: { word, level },
//      helps: [], hurts: [], art: { src, title, focus } }
export async function drawReport(canvas, d) {
  await fontsReady();
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COL.paper; ctx.fillRect(0, 0, W, H);
  const A = 400;
  await artTop(ctx, d.art, A);

  let y = A + 56;
  text(ctx, d.dateLabel, `26px ${MONO}`, COL.muted, PAD, y, W - 2 * PAD, 30);
  y += 112;
  text(ctx, d.title, `italic 104px ${SERIF}`, COL.ink, PAD, y, W - 2 * PAD, 104);
  y += 66;
  y = text(ctx, d.lede, `37px ${SERIF}`, COL.deep, PAD, y, W - 2 * PAD - 20, 48);

  if (d.strip) {
    y += 8;
    const n = d.strip.days.length, gap = 6, bw = (W - 2 * PAD - gap * (n - 1)) / n, bh = 90;
    const hf = { calm: 0.28, rising: 0.58, crest: 1, release: 0.7 };
    const col = { calm: COL.teal, rising: COL.rising, crest: COL.crimson, release: COL.pink };
    d.strip.days.forEach((day, i) => {
      const h = bh * hf[day.phase], x = PAD + i * (bw + gap);
      ctx.fillStyle = col[day.phase]; ctx.fillRect(x, y + bh - h, bw, h);
      if (day.today) { ctx.strokeStyle = COL.ink; ctx.lineWidth = 4; ctx.strokeRect(x - 4, y + bh - h - 4, bw + 8, h + 8); }
    });
    y += bh + 40;
    ctx.font = `22px ${MONO}`;
    ctx.fillStyle = COL.muted; ctx.fillText(d.strip.left, PAD, y);
    const rw = ctx.measureText(d.strip.right).width; ctx.fillText(d.strip.right, W - PAD - rw, y);
    ctx.fillStyle = COL.deep; const mw = ctx.measureText(d.strip.mid).width; ctx.fillText(d.strip.mid, (W - mw) / 2, y);
  }

  if (d.today) {
    y += 34;
    const r = 32, cx = PAD + r, cy = y + r;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = COL.card; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.fillStyle = COL.crimson; ctx.fillRect(cx - r, cy + r - 2 * r * d.today.level, 2 * r, 2 * r * d.today.level);
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, r - 1.5, 0, Math.PI * 2); ctx.strokeStyle = COL.crimson; ctx.lineWidth = 3; ctx.stroke();
    rich(ctx, [{ t: 'today feels ', font: `34px ${SERIF}`, color: COL.ink }, { t: d.today.word, font: `34px ${SERIF}`, color: COL.deep }], cx + r + 22, cy + 12, 800, 40);
    y += 2 * r;
  }

  if (d.helps.length || d.hurts.length) {
    y += 40;
    const gap = 30, bw = (W - 2 * PAD - gap) / 2;
    if (d.helps.length && d.hurts.length) {
      noteBox(ctx, PAD, y, bw, 'what helps', d.helps, COL.card, COL.teald, -0.014);
      noteBox(ctx, PAD + bw + gap, y, bw, 'what doesn’t', d.hurts, COL.pinkp, COL.deep, 0.012);
    } else if (d.helps.length) noteBox(ctx, PAD, y, W - 2 * PAD, 'what helps', d.helps, COL.card, COL.teald, -0.008);
    else noteBox(ctx, PAD, y, W - 2 * PAD, 'what doesn’t', d.hurts, COL.pinkp, COL.deep, 0.008);
  }

  footer(ctx, 'sent with hold the wave', 'art: juujuumama');
  grain(ctx);
}

/* ---------- card 2: what is pmdd ---------- */
export async function drawExplainer(canvas, art) {
  await fontsReady();
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COL.paper; ctx.fillRect(0, 0, W, H);
  const A = 330;
  await artTop(ctx, art, A);
  const body = `36px ${SERIF}`, lh = 52, mw = W - 2 * PAD - 10;
  let y = A + 56;
  text(ctx, 'for the people who love me', `30px ${SERIF}`, COL.muted, PAD, y, mw, 34);
  y += 104;
  text(ctx, 'what is pmdd?', `italic 96px ${SERIF}`, COL.ink, PAD, y, mw, 96);
  y += 76;
  y = rich(ctx, [
    { t: 'i have ', font: body, color: COL.ink },
    { t: 'premenstrual dysphoric disorder', font: `italic 36px ${SERIF}`, color: COL.deep },
    { t: '. it’s a real, diagnosable condition, not a mood or a personality trait.', font: body, color: COL.ink },
  ], PAD, y, mw, lh) + 18;
  y = text(ctx, 'for about one to two weeks before my period, my brain reacts strongly to normal hormone shifts. things can feel hopeless, urgent or unbearable, even when nothing has changed.', body, COL.ink, PAD, y, mw, lh) + 18;
  y = text(ctx, 'it always passes once my period starts. the version of me you know is still here, just underwater for a while.', body, COL.ink, PAD, y, mw, lh) + 10;
  // highlighted ask
  const ask = 'during those weeks i try not to make big decisions. if i say something drastic, the kindest thing is to hear me, stay steady, and help me wait it out.';
  const hb = text(ctx, ask, `33px ${SERIF}`, COL.ink, 0, 0, mw - 64, 48, false);
  ctx.save(); ctx.translate(PAD, y); ctx.rotate(-0.008);
  ctx.fillStyle = COL.tealp; ctx.fillRect(0, 0, W - 2 * PAD, hb + 40);
  text(ctx, ask, `33px ${SERIF}`, COL.ink, 32, 52, mw - 64, 48);
  ctx.restore();
  footer(ctx, 'sent with hold the wave', 'learn more: iapmd.org');
  grain(ctx);
}

export const SIZE = { W, H };
