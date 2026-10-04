#!/usr/bin/env node
/* Regenerates the site's brand bitmaps (share card + favicon) from the
 * Open Air Colombo sunrise mark, so no real logo ships with the prototype.
 *
 *   node scripts/generate-brand-images.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS = path.join(__dirname, '..', 'assets');
const FONT = 'Arial, Helvetica, sans-serif';
const INK = '#0a1f20'; /* same page background as index.html / 404.html */

/* Sunrise mark on a 100x62 grid, baseline along the bottom. Kept in step with
 * assets/oac-logo.png and scripts/generate-merch-textures.js. */
function mark(cx, cy, size, color) {
  const s = size / 100;
  const parts = [`<g transform="translate(${cx - size / 2} ${cy}) scale(${s})" fill="none" stroke="${color}">`];
  [46, 32, 18].forEach((r, i) => {
    parts.push(`<path d="M ${50 - r} 52 A ${r} ${r} 0 0 1 ${50 + r} 52" stroke-width="${7 - i}" />`);
  });
  parts.push(`<circle cx="50" cy="48" r="9" fill="${color}" stroke="none" />`);
  parts.push(`<rect x="2" y="52" width="30" height="6" fill="${color}" stroke="none" />`);
  parts.push(`<rect x="68" y="52" width="30" height="6" fill="${color}" stroke="none" />`);
  parts.push('</g>');
  return parts.join('');
}

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="50%" cy="46%" r="58%">
      <stop offset="0%" stop-color="#edae42" stop-opacity="0.26" />
      <stop offset="62%" stop-color="#e07b30" stop-opacity="0.1" />
      <stop offset="100%" stop-color="${INK}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="${INK}" />
  <rect width="1200" height="630" fill="url(#glow)" />
  ${mark(600, 170, 230, '#eafaf1')}
  <g text-anchor="middle" font-family="${FONT}" fill="#eafaf1">
    <text x="600" y="400" font-size="84" font-weight="700" letter-spacing="-1">Open Air Colombo</text>
    <text x="600" y="462" font-size="26" font-weight="400" letter-spacing="7" fill="#7ea296">LOTUS TOWER &#183; COLOMBO, SRI LANKA</text>
    <text x="600" y="540" font-size="22" font-weight="700" letter-spacing="8" fill="#aff3d4">ATP EVENTS</text>
  </g>
</svg>`;

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="${INK}" />
  ${mark(256, 330, 320, '#eafaf1')}
</svg>`;

(async () => {
  for (const [file, svg] of [['og-image.png', og], ['favicon.png', favicon]]) {
    const out = path.join(ASSETS, file);
    await sharp(Buffer.from(svg)).png().toFile(out);
    console.log(`wrote assets/${file}`);
  }
  /* The site also loads a .webp copy of the logotype in a couple of places. */
  if (fs.existsSync(path.join(ASSETS, 'oac-logo.png'))) {
    await sharp(path.join(ASSETS, 'oac-logo.png')).webp({ quality: 90 }).toFile(path.join(ASSETS, 'oac-logo.webp'));
    console.log('wrote assets/oac-logo.webp');
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
