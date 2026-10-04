#!/usr/bin/env node
/* Regenerates the merch textures used by the unboxing scene on index.html.
 *
 * The originals shipped with the client's artwork baked into the pixels
 * (artist name, promoter logotype). For the prototype we draw our own art
 * instead, so nothing on screen carries a real brand: the Open Air Colombo
 * sunrise mark, the event name, and ATP EVENTS as the promoter line.
 *
 *   node scripts/generate-merch-textures.js
 *
 * Output sizes match the files they replace so the CSS in index.html
 * (background-position / aspect-ratio) keeps framing them the same way.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'merch3d');
const FONT = 'Arial, Helvetica, sans-serif';

/* The sunrise mark from assets/oac-logo.png, redrawn as inline SVG so it can
 * be scaled into each texture. Viewbox is 100x62, baseline along the bottom. */
function mark(cx, cy, size, color, opacity) {
  const s = size / 100;
  const g = [];
  g.push(`<g transform="translate(${cx - size / 2} ${cy}) scale(${s})" fill="none" stroke="${color}" stroke-opacity="${opacity}">`);
  [46, 32, 18].forEach((r, i) => {
    g.push(`<path d="M ${50 - r} 52 A ${r} ${r} 0 0 1 ${50 + r} 52" stroke-width="${7 - i}" />`);
  });
  g.push(`<circle cx="50" cy="48" r="9" fill="${color}" fill-opacity="${opacity}" stroke="none" />`);
  g.push(`<rect x="2" y="52" width="30" height="6" fill="${color}" fill-opacity="${opacity}" stroke="none" />`);
  g.push(`<rect x="68" y="52" width="30" height="6" fill="${color}" fill-opacity="${opacity}" stroke="none" />`);
  g.push('</g>');
  return g.join('');
}

/* A band of soft, overlapping waves — stands in for the marbled fabric print
 * without needing a photographic source. Deterministic: same seed, same art. */
function waves(w, h, colors, seed, count) {
  let n = seed;
  const rand = () => ((n = (n * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const out = [];
  for (let i = 0; i < count; i++) {
    const c = colors[i % colors.length];
    const y = rand() * h;
    const amp = h * (0.16 + rand() * 0.5);
    const width = h * (0.12 + rand() * 0.3);
    const phase = rand() * Math.PI * 2;
    const cycles = 1 + Math.floor(rand() * 3);
    const pts = [];
    for (let x = -20; x <= w + 20; x += w / 60) {
      pts.push(`${x.toFixed(1)},${(y + Math.sin(phase + (x / w) * Math.PI * 2 * cycles) * amp).toFixed(1)}`);
    }
    out.push(
      `<polyline points="${pts.join(' ')}" fill="none" stroke="${c}" stroke-width="${width.toFixed(1)}" ` +
        `stroke-linecap="round" opacity="${(0.35 + rand() * 0.45).toFixed(2)}" />`
    );
  }
  return `<g filter="url(#soften)">${out.join('')}</g>`;
}

/* ---- Fans -------------------------------------------------------------- */
/* Drawn flat; index.html slices them into blades with a conic gradient, so a
 * centred lockup on a radial sun reads as a printed fan once it opens. */
function fanSvg(w, h, p) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="sun" cx="52%" cy="46%" r="62%">
      <stop offset="0%" stop-color="${p.core}" />
      <stop offset="42%" stop-color="${p.mid}" />
      <stop offset="78%" stop-color="${p.outer}" />
      <stop offset="100%" stop-color="${p.edge}" />
    </radialGradient>
    <linearGradient id="vignette" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${p.edge}" stop-opacity="0.75" />
      <stop offset="45%" stop-color="${p.edge}" stop-opacity="0" />
      <stop offset="100%" stop-color="${p.edge}" stop-opacity="0.6" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="${p.edge}" />
  <rect width="${w}" height="${h}" fill="url(#sun)" />
  <rect width="${w}" height="${h}" fill="url(#vignette)" />
  ${mark(w / 2, h * 0.16, 76, '#ffffff', 0.92)}
  <g fill="#ffffff" text-anchor="middle" font-family="${FONT}">
    <text x="${w / 2}" y="${h * 0.49}" font-size="46" font-weight="700" letter-spacing="-0.5">Open Air</text>
    <text x="${w / 2}" y="${h * 0.63}" font-size="46" font-weight="700" letter-spacing="-0.5">Colombo</text>
    <text x="${w / 2}" y="${h * 0.8}" font-size="17" font-weight="700" letter-spacing="5" opacity="0.88">ATP EVENTS</text>
  </g>
</svg>`;
}

/* ---- Scarves ----------------------------------------------------------- */
/* Long strips, shown nearly full width in the scene, so the lockup sits in
 * the middle and the name repeats vertically at both ends like a real scarf. */
function scarfSvg(w, h, p) {
  /* Centre the mark + wordmark as one lockup. Arial's average advance is
   * close enough to 0.53em for a title this short. */
  const titleSize = h * 0.3;
  const title = 'Open Air Colombo';
  const titleW = title.length * titleSize * 0.53;
  const markW = h * 0.46;
  const startX = (w - (markW + h * 0.14 + titleW)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
      ${p.base.map((c, i) => `<stop offset="${(i / (p.base.length - 1)) * 100}%" stop-color="${c}" />`).join('')}
    </linearGradient>
    <filter id="soften" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${(h * 0.06).toFixed(1)}" />
    </filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#base)" />
  ${waves(w, h, p.waves, p.seed, 22)}
  <rect width="${w}" height="${h}" fill="${p.shade}" opacity="0.18" />
  ${mark(startX + markW / 2, h * 0.32, markW, '#ffffff', 0.95)}
  <g fill="#ffffff" font-family="${FONT}">
    <text x="${(startX + markW + h * 0.14).toFixed(1)}" y="${h * 0.46}" font-size="${titleSize.toFixed(0)}" font-weight="700" letter-spacing="-0.5">${title}</text>
    <text x="${w / 2}" y="${h * 0.82}" font-size="${(h * 0.14).toFixed(0)}" font-weight="700" letter-spacing="6" text-anchor="middle" opacity="0.9">ATP EVENTS</text>
  </g>
  <g fill="#ffffff" font-family="${FONT}" font-size="${(h * 0.12).toFixed(0)}" font-weight="700" letter-spacing="3" opacity="0.9" text-anchor="middle">
    <text transform="translate(${h * 0.3} ${h / 2}) rotate(-90)">COLOMBO</text>
    <text transform="translate(${w - h * 0.3} ${h / 2}) rotate(90)">COLOMBO</text>
  </g>
</svg>`;
}

const TEXTURES = [
  { file: 'fan-red.webp', w: 600, h: 328, svg: fanSvg, p: { core: '#ffd39b', mid: '#f4722c', outer: '#c22914', edge: '#2b0806' } },
  { file: 'fan-blue.webp', w: 600, h: 334, svg: fanSvg, p: { core: '#bdf0ff', mid: '#3f9ad6', outer: '#2e4fa8', edge: '#0b1430' } },
  {
    file: 'scarf-orange.webp', w: 700, h: 116, svg: scarfSvg,
    p: { base: ['#f0a23c', '#e2631d', '#f3c27a'], waves: ['#ffd9a0', '#d8491a', '#2f8fb0', '#fff1dc', '#a8370f'], shade: '#8a3a0c', seed: 7 },
  },
  {
    file: 'scarf-blue.webp', w: 700, h: 125, svg: scarfSvg,
    p: { base: ['#2f6fb8', '#1b3f84', '#4aa6c8'], waves: ['#bfe6f5', '#15306b', '#6f5fc0', '#eaf6ff', '#1d7f9e'], shade: '#0d1f4a', seed: 19 },
  },
  {
    file: 'scarf-coral.webp', w: 700, h: 131, svg: scarfSvg,
    p: { base: ['#f2795e', '#d93f55', '#f7b48a'], waves: ['#ffd7c2', '#b32442', '#f4a63c', '#fff0e6', '#8c1f3c'], shade: '#6e1428', seed: 31 },
  },
];

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const t of TEXTURES) {
    const svg = t.svg(t.w, t.h, t.p);
    const out = path.join(OUT_DIR, t.file);
    await sharp(Buffer.from(svg)).webp({ quality: 88 }).toFile(out);
    console.log(`wrote ${path.relative(path.join(__dirname, '..'), out)}  ${t.w}x${t.h}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
