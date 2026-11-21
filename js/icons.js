// small line icons, drawn to sit beside the type. they use currentColor.
const P = {
  wave: 'M2 10c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3M2 16c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3',
  envelope: 'M3 6h18v12H3zM3 7l9 6 9-6',
  lighthouse: 'M9 21l1.6-11h2.8L15 21zM9.9 15.5h4.2M10.5 10V7h3v3M10 7l2-2.2L14 7M4.5 8.5h3.5M16 8.5h3.5M5 5.5l3 1.6M19 5.5l-3 1.6M7 21h10',
  hourglass: 'M7 3h10M7 21h10M8 3c0 4 3 6 4 9-1 3-4 5-4 9M16 3c0 4-3 6-4 9 1 3 4 5 4 9M10 18h4',
  drop: 'M12 3c3 4.5 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 3-6.5 6-11z',
  breath: 'M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h8',
  eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
  steps: 'M8 13c-1.7 0-3-1.8-3-4.5S6.3 3 8 3s3 2.3 3 5.5S9.7 13 8 13zM6.5 16.5h3M16 19c-1.7 0-3-1.8-3-4.5S14.3 9 16 9s3 2.3 3 5.5S17.7 19 16 19zM14.5 21.5h3',
  check: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM8 12.5l3 3 5-6',
  bowl: 'M3 11h18a9 9 0 0 1-18 0zM8 7.5c0-1.2 1.2-1.6 1.2-3M12 7.5c0-1.2 1.2-1.6 1.2-3M16 7.5c0-1.2 1.2-1.6 1.2-3',
  message: 'M4 5h16v11H9l-5 4zM8 9.5h8M8 12.5h5',
  clock: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7v5l3 2',
  bath: 'M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM6 12V6.5a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2',
  pen: 'M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  calendar: 'M4 5h16v15H4zM4 9.5h16M8 3v4M16 3v4M8 14h2M14 14h2',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
};

export function icon(name, cls = 'ico') {
  const d = P[name] || P.wave;
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
}

// a single wave whose height grows with n (1..5), for "how heavy is today?"
export function heavyWave(n) {
  const a = [0.4, 1.3, 2.3, 3.4, 4.6][n - 1];
  const y = 12;
  const line = (yy, amp, w) => `<path d="M1 ${yy}c1.5 0 2-${amp} 3.5-${amp}s2 ${amp} 3.5 ${amp} 2-${amp} 3.5-${amp} 2 ${amp} 3.5 ${amp} 2-${amp} 3.5-${amp} 2 ${amp} 3.5 ${amp}" stroke-width="${w}"/>`;
  return `<svg class="heavy" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round">${line(y, a, 1.4 + n * 0.2)}${n >= 3 ? line(y + 6, a * 0.6, 1.1) : ''}</svg>`;
}
