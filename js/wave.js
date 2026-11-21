// the crimson tide drawn over the day's artwork. `intensity` (0..1) sets how high it rises.
export function mountWave(canvas, intensity = 0.3) {
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cs = getComputedStyle(canvas);
  const cols = ['--tide-1', '--tide-2', '--tide-3'].map((v) => cs.getPropertyValue(v).trim() || '#e0284f');
  const foam = cs.getPropertyValue('--foam').trim() || 'rgba(255,248,240,.8)';
  let raf = 0, w = 0, h = 0;

  const layers = [
    { amp: 1.0, len: 1.1, speed: 0.30, y: 0.00, c: 0 },
    { amp: 0.8, len: 0.7, speed: 0.45, y: 0.06, c: 1 },
    { amp: 0.6, len: 1.6, speed: 0.22, y: 0.13, c: 2 },
  ];

  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = Math.max(1, w * dpr); canvas.height = Math.max(1, h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    const level = 0.9 - intensity * 0.4; // fraction of height where the water sits
    layers.forEach((L) => {
      const base = h * (level + L.y);
      const amp = h * (0.02 + intensity * 0.07) * L.amp;
      const speed = 0.001 * L.speed * (0.6 + intensity);
      const pts = [];
      for (let x = 0; x <= w + 6; x += 6) {
        const k = (x / w) * Math.PI * 2 / L.len;
        pts.push([x, base + Math.sin(k + t * speed) * amp + Math.sin(k * 2.7 - t * speed * 0.8) * amp * 0.35]);
      }
      ctx.beginPath(); ctx.moveTo(0, h);
      pts.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(w, h); ctx.closePath();
      ctx.fillStyle = cols[L.c]; ctx.fill();
      // foam along the crest of the front layers
      if (L.c < 2) {
        ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.strokeStyle = foam; ctx.lineWidth = 1.2 + intensity * 1.6; ctx.globalAlpha = 0.55; ctx.stroke(); ctx.globalAlpha = 1;
      }
    });
    if (!reduce) raf = requestAnimationFrame(draw);
  }

  size();
  const ro = new ResizeObserver(() => { size(); if (reduce) draw(0); });
  ro.observe(canvas);
  raf = requestAnimationFrame(draw);
  return () => { cancelAnimationFrame(raf); ro.disconnect(); };
}
