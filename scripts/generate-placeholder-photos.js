#!/usr/bin/env node
/* Replaces the photographic assets with mock artwork.
 *
 * The originals were real press shots and real crowd photography (one of them
 * with another promoter's logo across the frame), which have no place in a
 * prototype. These stand-ins are drawn from the site's own palette so the
 * layout still reads as intended: stage scenes for the event cards, lit
 * figures for the line-up backdrops.
 *
 *   node scripts/generate-placeholder-photos.js
 *
 * Sizes are taken from the files being replaced, so every object-position and
 * background-position already tuned in index.html keeps working.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const FONT = 'Arial, Helvetica, sans-serif';

/* Deterministic per-file randomness: the same name always draws the same
 * picture, so re-running the script does not churn the repo. */
function rng(seedText) {
  let n = 0;
  for (const ch of seedText) n = (n * 31 + ch.charCodeAt(0)) & 0x7fffffff;
  return () => ((n = (n * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

/* Palette drawn from index.html: deep teal ground, amber stage light. */
const HUES = [
  { glow: '#edae42', beam: '#ffd98a', sky: '#07191a', far: '#123436' },
  { glow: '#e07b30', beam: '#ffc08a', sky: '#0a1f20', far: '#15393a' },
  { glow: '#aff3d4', beam: '#d8fff0', sky: '#061a1c', far: '#0f3a3a' },
  { glow: '#7f9bd6', beam: '#cfe0ff', sky: '#081626', far: '#143052' },
  { glow: '#d1566c', beam: '#ffc2cd', sky: '#1a0d18', far: '#3d1730' },
];

/* Small sunrise mark, matching assets/oac-logo.png. */
function mark(cx, cy, size, color, opacity) {
  const s = size / 100;
  const g = [`<g transform="translate(${cx - size / 2} ${cy}) scale(${s})" fill="none" stroke="${color}" stroke-opacity="${opacity}">`];
  [46, 32, 18].forEach((r, i) => {
    g.push(`<path d="M ${50 - r} 52 A ${r} ${r} 0 0 1 ${50 + r} 52" stroke-width="${7 - i}" />`);
  });
  g.push(`<circle cx="50" cy="48" r="9" fill="${color}" fill-opacity="${opacity}" stroke="none" />`);
  g.push(`<rect x="2" y="52" width="30" height="6" fill="${color}" fill-opacity="${opacity}" stroke="none" />`);
  g.push(`<rect x="68" y="52" width="30" height="6" fill="${color}" fill-opacity="${opacity}" stroke="none" />`);
  g.push('</g>');
  return g.join('');
}

/* ---- Event cards: a stage seen over a crowd ---------------------------- */
function stageSvg(w, h, seed, hue) {
  const r = rng(seed);
  const p = HUES[hue % HUES.length];
  const horizon = h * (0.6 + r() * 0.12);
  const stageW = w * 0.52;
  const stageX = (w - stageW) / 2;

  /* Light beams fanning out from above the stage. */
  const beams = [];
  const originX = w / 2 + (r() - 0.5) * w * 0.1;
  const originY = horizon - h * 0.3;
  for (let i = 0; i < 9; i++) {
    const spread = (i - 4) * (w * 0.09) + (r() - 0.5) * w * 0.03;
    const width = w * (0.012 + r() * 0.02);
    beams.push(
      `<polygon points="${originX - width},${originY} ${originX + width},${originY} ` +
        `${originX + spread + width * 6},${h} ${originX + spread - width * 6},${h}" ` +
        `fill="${p.beam}" opacity="${(0.1 + r() * 0.16).toFixed(3)}" />`
    );
  }

  /* Sparks drifting over the crowd — stops the air reading as flat colour. */
  const sparks = [];
  for (let i = 0; i < 90; i++) {
    const x = r() * w;
    const y = horizon - h * 0.35 + r() * (h - horizon + h * 0.35);
    sparks.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(w * (0.0008 + r() * 0.0022)).toFixed(2)}" fill="${p.beam}" opacity="${(0.15 + r() * 0.5).toFixed(2)}" />`);
  }

  /* Crowd: heads and raised arms along the bottom, three ranks deep. */
  const crowd = [];
  for (let rank = 0; rank < 3; rank++) {
    const base = h - h * 0.02 - rank * h * 0.055;
    const shade = ['#000000', '#02100f', '#04181a'][rank];
    const op = 0.95 - rank * 0.12;
    for (let x = -w * 0.02; x < w * 1.02; x += w * (0.018 + r() * 0.022)) {
      /* Vary each silhouette's size so the rank does not read as a comb. */
      const headR = w * (0.009 - rank * 0.0016) * (0.75 + r() * 0.7);
      const y = base - h * 0.03 + (r() - 0.5) * h * 0.03;
      crowd.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${headR.toFixed(1)}" fill="${shade}" opacity="${op}" />`);
      crowd.push(
        `<path d="M ${(x - headR * 1.5).toFixed(1)} ${h} L ${(x - headR * 1.2).toFixed(1)} ${(y + headR).toFixed(1)} ` +
          `L ${(x + headR * 1.2).toFixed(1)} ${(y + headR).toFixed(1)} L ${(x + headR * 1.5).toFixed(1)} ${h} Z" fill="${shade}" opacity="${op}" />`
      );
      if (r() > 0.55) {
        const dir = r() > 0.5 ? 1 : -1;
        crowd.push(
          `<path d="M ${x.toFixed(1)} ${(y + headR * 1.6).toFixed(1)} L ${(x + dir * headR * 2.2).toFixed(1)} ${(y - headR * 3.4).toFixed(1)}" ` +
            `stroke="${shade}" stroke-width="${(headR * 0.7).toFixed(1)}" stroke-linecap="round" opacity="${op}" fill="none" />`
        );
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${p.sky}" />
      <stop offset="62%" stop-color="${p.far}" />
      <stop offset="100%" stop-color="${p.sky}" />
    </linearGradient>
    <radialGradient id="halo" cx="50%" cy="${((horizon / h) * 100).toFixed(0)}%" r="55%">
      <stop offset="0%" stop-color="${p.glow}" stop-opacity="0.55" />
      <stop offset="45%" stop-color="${p.glow}" stop-opacity="0.16" />
      <stop offset="100%" stop-color="${p.glow}" stop-opacity="0" />
    </radialGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="${(w * 0.012).toFixed(1)}" />
    </filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)" />
  <rect width="${w}" height="${h}" fill="url(#halo)" />
  <g filter="url(#soft)">${beams.join('')}</g>

  <!-- Stage: truss, screen, risers -->
  <rect x="${stageX}" y="${horizon - h * 0.26}" width="${stageW}" height="${h * 0.26}" fill="#02100f" opacity="0.9" />
  <rect x="${stageX + stageW * 0.12}" y="${horizon - h * 0.22}" width="${stageW * 0.76}" height="${h * 0.15}" fill="${p.glow}" opacity="0.5" />
  <rect x="${stageX + stageW * 0.12}" y="${horizon - h * 0.22}" width="${stageW * 0.76}" height="${h * 0.05}" fill="${p.beam}" opacity="0.28" />
  <rect x="${stageX - w * 0.02}" y="${horizon - h * 0.3}" width="${stageW + w * 0.04}" height="${h * 0.018}" fill="#02100f" />
  <rect x="${stageX - w * 0.02}" y="${horizon - h * 0.3}" width="${stageW + w * 0.04}" height="${h * 0.004}" fill="${p.beam}" opacity="0.5" />
  ${[0, 1].map((i) => `<rect x="${i === 0 ? stageX - w * 0.05 : stageX + stageW + w * 0.015}" y="${horizon - h * 0.24}" width="${w * 0.035}" height="${h * 0.24}" fill="#02100f" opacity="0.95" />`).join('')}
  ${mark(w / 2, horizon - h * 0.17, w * 0.1, '#ffffff', 0.5)}

  <!-- Crowd, sitting in a band of haze lit from the stage -->
  <rect x="0" y="${horizon - h * 0.02}" width="${w}" height="${h - horizon + h * 0.02}" fill="${p.glow}" opacity="0.1" />
  <rect x="0" y="${horizon}" width="${w}" height="${h - horizon}" fill="#02100f" opacity="0.35" />
  ${crowd.join('')}
  ${sparks.join('')}

  <!-- Haze over everything, so the silhouettes sit in air rather than on top -->
  <rect width="${w}" height="${h}" fill="${p.glow}" opacity="0.06" />
</svg>`;
}

/* ---- Line-up backdrops: a lit figure --------------------------------- */
function figureSvg(w, h, seed, hue) {
  const r = rng(seed);
  const p = HUES[hue % HUES.length];
  const cx = w * (0.44 + r() * 0.12);
  const headR = w * 0.145;
  const headY = h * (0.3 + r() * 0.05);
  const side = r() > 0.5 ? 1 : -1; /* which side the key light falls on */
  const shoulderY = headY + headR * 1.95;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="${p.far}" />
      <stop offset="55%" stop-color="${p.sky}" />
      <stop offset="100%" stop-color="#02100f" />
    </linearGradient>
    <radialGradient id="rim" cx="${((cx / w) * 100).toFixed(0)}%" cy="${((headY / h) * 100).toFixed(0)}%" r="62%">
      <stop offset="0%" stop-color="${p.glow}" stop-opacity="0.5" />
      <stop offset="52%" stop-color="${p.glow}" stop-opacity="0.12" />
      <stop offset="100%" stop-color="${p.glow}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="body" x1="${side > 0 ? 1 : 0}" y1="0" x2="${side > 0 ? 0 : 1}" y2="1">
      <stop offset="0%" stop-color="#20332f" stop-opacity="0.95" />
      <stop offset="45%" stop-color="#071a1a" stop-opacity="0.97" />
      <stop offset="100%" stop-color="#02100f" stop-opacity="0.98" />
    </linearGradient>
    <radialGradient id="vig" cx="50%" cy="42%" r="72%">
      <stop offset="55%" stop-color="#000000" stop-opacity="0" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.55" />
    </radialGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="${(w * 0.02).toFixed(1)}" />
    </filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)" />
  <rect width="${w}" height="${h}" fill="url(#rim)" />

  <!-- Two soft beams raking across the backdrop -->
  <g filter="url(#soft)" opacity="0.5">
    <polygon points="${w * 0.1},0 ${w * 0.24},0 ${w * 0.62},${h} ${w * 0.4},${h}" fill="${p.beam}" opacity="0.09" />
    <polygon points="${w * 0.78},0 ${w * 0.92},0 ${w * 0.72},${h} ${w * 0.5},${h}" fill="${p.beam}" opacity="0.07" />
  </g>

  <!-- Figure: head, neck, shoulders, with the key light raking one side.
       Shoulders are drawn wide and low so it reads as a portrait crop rather
       than a dome. -->
  <g filter="url(#soft)" opacity="0.6">
    <ellipse cx="${cx + side * headR * 0.5}" cy="${headY}" rx="${headR * 1.9}" ry="${headR * 2.1}" fill="${p.glow}" opacity="0.4" />
  </g>
  <rect x="${cx - headR * 0.42}" y="${headY + headR * 0.5}" width="${headR * 0.84}" height="${headR * 1.3}" fill="url(#body)" />
  <path d="M ${cx - headR * 2.9} ${h}
           C ${cx - headR * 2.85} ${shoulderY + headR * 1.1}, ${cx - headR * 2.0} ${shoulderY + headR * 0.1}, ${cx - headR * 0.9} ${shoulderY - headR * 0.3}
           L ${cx + headR * 0.9} ${shoulderY - headR * 0.3}
           C ${cx + headR * 2.0} ${shoulderY + headR * 0.1}, ${cx + headR * 2.85} ${shoulderY + headR * 1.1}, ${cx + headR * 2.9} ${h} Z" fill="url(#body)" />
  <ellipse cx="${cx}" cy="${headY}" rx="${headR * 0.92}" ry="${headR * 1.12}" fill="url(#body)" />
  <!-- Rim light: a crescent down the lit edge of the head and shoulder. -->
  <path d="M ${cx + side * headR * 0.72} ${headY - headR * 0.72}
           A ${headR * 0.92} ${headR * 1.12} 0 0 ${side > 0 ? 1 : 0} ${cx + side * headR * 0.5} ${headY + headR * 0.95}"
        fill="none" stroke="${p.beam}" stroke-width="${w * 0.011}" stroke-linecap="round" opacity="0.65" />
  <path d="M ${cx + side * headR * 1.1} ${shoulderY - headR * 0.25}
           C ${cx + side * headR * 2.1} ${shoulderY + headR * 0.15}, ${cx + side * headR * 2.8} ${shoulderY + headR * 1.1}, ${cx + side * headR * 2.85} ${h}"
        fill="none" stroke="${p.beam}" stroke-width="${w * 0.008}" stroke-linecap="round" opacity="0.35" />
  <!-- Vignette, then the mark low in the frame. -->
  <rect width="${w}" height="${h}" fill="url(#vig)" />
  ${mark(w / 2, h * 0.93, w * 0.13, '#ffffff', 0.3)}
</svg>`;
}

/* ---- Files to replace -------------------------------------------------- */
async function run() {
  const jobs = [];
  for (const [dir, draw] of [['assets/events', stageSvg], ['assets/artists', figureSvg]]) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of fs.readdirSync(abs)) {
      if (!/\.(webp|png|jpe?g)$/i.test(file)) continue;
      jobs.push({ file: path.join(abs, file), rel: `${dir}/${file}`, draw });
    }
  }

  jobs.sort((a, b) => a.rel.localeCompare(b.rel));
  for (const [i, job] of jobs.entries()) {
    /* Read through a buffer: sharp keeps a handle on a file it opened by
     * path, and Windows will not let us write back over it. */
    const meta = await sharp(fs.readFileSync(job.file)).metadata();
    /* Walk the palette rather than picking at random, so neighbouring cards
     * in a carousel never land on the same colour. */
    const svg = job.draw(meta.width, meta.height, job.rel, i);
    const buf = await sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer();
    fs.writeFileSync(job.file, buf);
    console.log(`redrew ${job.rel}  ${meta.width}x${meta.height}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
