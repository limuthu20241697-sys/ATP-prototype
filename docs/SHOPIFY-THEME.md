# Shopify storefront theme — Odeysse brand

**Status:** built and pushed to a **draft** theme. Not live. Nothing customer-facing has changed.

## Where things are

| Theme | ID | Role | What it is |
|---|---|---|---|
| `Horizon` | `161012777214` | **LIVE** | Untouched. Still stock white/Inter. |
| `Horizon backup pre-brand 2026-08-12` | `161141719294` | unpublished | Snapshot taken before any work. Rollback point. |
| `Odeysse brand DRAFT` | `161141752062` | unpublished | The branded build. |

**Preview:** Online Store → Themes → *Odeysse brand DRAFT* → Preview.

## What was done

The important discovery: Horizon derives nearly everything from **one
four-colour palette** plus a set of native settings. So most of the branding is
*settings*, not code — which matters, because settings survive a theme update
and hand-written CSS may not.

**Native settings** (`config/settings_data.json`):

- `color_palette` → background `#0a1f20`, foreground `#eafaf1`, body `#cfe7dc`,
  line `#1e3a33`. Everything else cascades from this.
- Primary button `#edae42` with `#0a1f20` text, radius `100px` (the site's pill)
- Secondary button: transparent with a gold border
- Inputs, drawers, popovers → panel `#0c2425`, mint focus
- Cards `16px` radius; variant swatches round, mint when selected
- Badges: gold for Sale, muted for Sold out
- **Heading weight 300** with tight tracking — the site's headings are light,
  and Horizon's default 700 reads as a different brand even in the right colours
- Page width `wide` (the site's merch grid is wide, not a narrow column)

**CSS** (`assets/odeysse-brand.css`, loaded via `snippets/stylesheets.liquid`) —
only what settings cannot express:

- The gold→orange CTA gradient (settings take a solid colour only)
- Card surfaces: faint panel fill + mint hairline, as on the site
- The warm radial glow behind product imagery — the site's most recognisable
  treatment
- Eyebrow styling: `12px / 0.34em / uppercase / #e07b30`
- Mint focus rings, gold text selection
- A `prefers-reduced-motion` guard on the button hover

Footprint is deliberately small: **one asset file and one line** in
`snippets/stylesheets.liquid`. Delete both and the theme is still correctly
coloured, just plainer.

## Verified

- Draft renders with `--color-background: #0a1f20`, `--color-primary-button-background: rgb(237 174 66)`, `--style-border-radius-buttons-primary: 100px`, `--font-heading--weight: 300`
- **Live theme confirmed untouched** — still serves `#eef1ea`/`#ffffff`
- **Checkout unaffected** — theme CSS does not leak into `/checkouts/...`; cart permalink still resolves, currency still LKR
- Contrast, all AA or better: ink 15.81:1, body 13.11:1, gold 8.73:1, button text on gold 8.73:1, and 7.26:1 on Shopify's auto-generated hover shade

## Not done

**Decima is not applied.** Horizon's font picker offers Shopify's library only,
so Decima has to come through CSS — and its webfont licence is unresolved.
`shop.anjunadeep.odeysse.com` is a *second domain* and these licences are
commonly single-domain. The theme currently uses Inter.

The complete `@font-face` block is written and waiting in
`.themework/odeysse-brand.css`. To apply it once the licence is confirmed:
upload five WOFF2 files via **Content → Files**, paste the URLs into the block,
and swap the font stack. Nothing else depends on it.

**Homepage and product page content.** The homepage is still near-empty (header
+ cart drawer) and the only product is the placeholder. Styling is ready; the
content is not, and that needs the real catalogue.

**The catalogue problem is unchanged.** One product: *"Sample Product Merch"*,
vendor `My Store`, description `"Sample Descriptino"` (typo), 2 variants at
LKR 1,500, one image — all publicly readable via `products.json`. A
*well-styled* page selling a sample product looks more deliberate than an
unstyled one, so consider the storefront password until real products exist.

## To go live

Online Store → Themes → *Odeysse brand DRAFT* → **Publish**. Roll back by
publishing `Horizon backup pre-brand 2026-08-12`.

Preview it on a phone first — the overrides shouldn't affect Horizon's
responsiveness, but that's worth seeing rather than assuming.
