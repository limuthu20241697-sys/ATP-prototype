# open-air-colombo

Prototype site for **Open Air Colombo** — Lotus Tower, Colombo. Presented by
ATP Events. Everything on the page is mock branding; no real artist, promoter
or merchandise artwork ships with this repo.

## Run it

```bash
npm install
npm start           # http://localhost:3000
```

## Regenerating brand art

Both scripts render SVG to bitmaps with `sharp`, so the art can be re-cut at
any size without a design tool.

```bash
node scripts/generate-brand-images.js    # assets/og-image.png, favicon.png, oac-logo.webp
node scripts/generate-merch-textures.js  # assets/merch3d/*.webp (unboxing scene)
```

The mark itself lives in `assets/oac-logo.png` and `assets/prototype-logo.svg`;
the two scripts redraw it inline so they stay in step with it.
