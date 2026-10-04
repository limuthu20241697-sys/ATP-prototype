// Static file server for the Open Air Colombo site.
//
// The event ran on 22 August 2026 and is over. The site is now a single closing
// page, so this server does nothing but hand out files: gzip/brotli compression
// plus sensible cache headers, and that is all.
//
// Everything that made it dynamic has been removed — the VVIP booking proxy, the
// Shopify merch webhook, the payment-slip upload flow and its admin queue, the
// newsletter API, and the timed sell-out gate. The Postgres data those routes
// wrote (subscribers, merch orders, slips) is untouched and still in the
// database; only the ways in are gone. The previous site is preserved verbatim
// at oac-2026-archive.html, and all of the above is recoverable from git.

require('dotenv').config();

const express = require('express');
const compression = require('compression');

const app = express();

// Compress text responses (HTML / JS / CSS). Images are already compressed
// binary formats, so compression middleware skips them automatically.
app.use(compression());

// Kept deliberately: costs nothing, and gives uptime checks something cheap to
// hit that does not depend on the filesystem.
app.get('/api/health', (req, res) => res.json({ ok: true }));

const ONE_WEEK = 7 * 24 * 60 * 60;   // seconds
const ONE_DAY = 24 * 60 * 60;

app.use(
  express.static(__dirname, {
    // lets "/vvip-tables" resolve to vvip-tables.html, while "/vvip-tables.html"
    // also still works directly (no redirect hop).
    extensions: ['html'],
    setHeaders(res, filePath) {
      if (/\.html$/i.test(filePath)) {
        // HTML: always revalidate so content/links update immediately on deploy.
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      } else if (/\.(png|jpe?g|webp|gif|svg|avif|woff2?|ttf|otf|eot|mp4|webm|pdf|ico)$/i.test(filePath)) {
        // Media & fonts: cache a week. Not "immutable" because filenames aren't
        // content-hashed, so a same-name replacement still refreshes within 7 days.
        res.setHeader('Cache-Control', `public, max-age=${ONE_WEEK}`);
      } else if (/\.(js|css)$/i.test(filePath)) {
        res.setHeader('Cache-Control', `public, max-age=${ONE_DAY}`);
      }
    },
  })
);

// /reserve?tier=gold|platinum -> seat map (demo prototype redirect)
app.get('/reserve', (req, res) => {
  const tier = req.query.tier || '';
  const dest = tier ? `/vvip-tables?tier=${encodeURIComponent(tier)}` : '/vvip-tables';
  res.redirect(302, dest);
});

// Anything that isn't a real file lands here: the old ticket, booking and merch
// URLs that people may still have saved or shared. Registered AFTER the static
// handler, so a genuine file always wins and only true misses are caught.
//
// 302 rather than 301 -- a permanent redirect is cached by the browser
// indefinitely and would be painful to undo if any of these paths is ever
// brought back. Non-GET requests get a plain 404 instead of being bounced to a
// page they cannot use.
app.use((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(404).json({ ok: false, error: 'not_found' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.redirect(302, '/');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Open Air Colombo site listening on port ${port}`);
});
