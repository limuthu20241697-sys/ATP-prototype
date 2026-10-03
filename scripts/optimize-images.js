// One-off, run locally:  npm run optimize:images
// Re-encodes JPEG/PNG images in assets/ and uploads/ in place, keeping the same
// filename and format so no HTML references change. Conservative quality settings
// (visually near-lossless) and only downscales images wider than MAX_WIDTH.
// Originals stay in git history, so this is fully reversible.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const DIRS = ['assets', 'uploads'];
const MAX_WIDTH = 2000;        // plenty for full-width retina display
const JPEG_QUALITY = 82;       // web-standard; differences need pixel-peeping
const PNG_QUALITY = 88;        // sharp applies palette quantization near-losslessly
// Only overwrite when we save at least this fraction — avoids re-encoding an
// already-lean image (which just adds generational quality loss for ~no gain).
const MIN_SAVING_RATIO = 0.15;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function fmtKB(bytes) {
  return (bytes / 1024).toFixed(0) + ' KB';
}

(async () => {
  const files = DIRS.flatMap((d) => {
    const p = path.join(ROOT, d);
    return fs.existsSync(p) ? walk(p) : [];
  }).filter((f) => /\.(jpe?g|png)$/i.test(f));

  let totalBefore = 0;
  let totalAfter = 0;
  let changed = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const before = fs.statSync(file).size;
    totalBefore += before;

    try {
      // Read via fs and hand sharp a buffer — libvips' own file-open throws a
      // libuv UNKNOWN error on some Windows setups, but buffer input is reliable.
      const input = fs.readFileSync(file);
      const img = sharp(input, { failOn: 'none' });
      const meta = await img.metadata();

      let pipeline = img;
      if (meta.width && meta.width > MAX_WIDTH) {
        pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
      }

      if (ext === '.png') {
        pipeline = pipeline.png({ compressionLevel: 9, effort: 10, palette: true, quality: PNG_QUALITY });
      } else {
        pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true, progressive: true });
      }

      const buf = await pipeline.toBuffer();

      // Only write when the saving clears the threshold; otherwise keep the
      // original to avoid needless generational quality loss.
      if (buf.length <= before * (1 - MIN_SAVING_RATIO)) {
        fs.writeFileSync(file, buf);
        totalAfter += buf.length;
        changed++;
        const pct = (100 * (1 - buf.length / before)).toFixed(0);
        console.log(`  ${path.relative(ROOT, file)}  ${fmtKB(before)} -> ${fmtKB(buf.length)}  (-${pct}%)`);
      } else {
        totalAfter += before;
        console.log(`  ${path.relative(ROOT, file)}  ${fmtKB(before)}  (kept original — already lean)`);
      }
    } catch (err) {
      totalAfter += before;
      console.log(`  ${path.relative(ROOT, file)}  SKIPPED (${err.message})`);
    }
  }

  console.log('\n----------------------------------------');
  console.log(`Files processed: ${files.length}  |  re-encoded: ${changed}`);
  console.log(`Total: ${fmtKB(totalBefore)} -> ${fmtKB(totalAfter)}  (saved ${fmtKB(totalBefore - totalAfter)})`);
})();
