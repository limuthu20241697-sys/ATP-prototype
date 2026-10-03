# Shopify branding — exact settings

**For:** whoever has the Shopify admin login.
**Store:** `shop.anjunadeep.odeysse.com` (same store as `odeysse.myshopify.com`)
**Plan:** Grow

Every value below is taken from `index.html`, ranked by real usage. Copy them
verbatim — don't eyeball a near match, the whole point is that the two surfaces
agree.

## The palette

| Name | Hex | Where it belongs |
|---|---|---|
| Gold | `#edae42` | Primary accent, buttons, the amount |
| Ink | `#eafaf1` | Headings |
| Burnt orange | `#e07b30` | Eyebrows, gradient end |
| Mint | `#aff3d4` | Focus rings, success only — **never a button** |
| Deep teal-black | `#0a1f20` | Page background; text **on** gold buttons |
| Body | `#cfe7dc` | Paragraph text |

Contrast is verified: `#0a1f20` on `#edae42` is 8.73:1, and every text pair
above passes WCAG AA on the dark ground.

---

## Step 1 — Store identity (15 min, do first)

**Settings → General**

- Store name: `My Store` → **`Odeysse`**
  Currently visible at checkout and in every email. Confirmed live.
- Sender email: confirm `tickets@odeysse.com` (domain already authenticated).

**Products → Sample Product Merch** — vendor is `My Store`; fix or delete.

---

## Step 2 — The 26 August deadline (before any branding)

Shopify retires the old Thank you / Order status pages for non-Plus stores on
**26 Aug 2026** — four days after the event. After that Shopify auto-upgrades
and discards customisations.

**Settings → Checkout → Configurations.** Read whether a notice offers an
upgrade.

- Already on the new pages → nothing to do; note it and move on.
- Not yet → upgrade **now**, deliberately, before the drop. This store has no
  legacy scripts to lose.

Do this before Step 3: upgrading afterwards can discard branding work.

---

## Step 3 — Checkout editor

**Settings → Checkout → Configurations → Edit.** Work in a **draft**, preview
on desktop and mobile, then publish.

| Setting | Value |
|---|---|
| Logo | `assets/anjunadeep-logotype.png` (2000×445) |
| Logo position / width | Left, ~180px |
| Header background | `#0a1f20` |
| Header accent | `#edae42` |
| Main background | `#0a1f20` |
| Order summary background | `#0c2425` |
| Buttons | `#edae42` |
| Accents | `#edae42` |
| Form fields | Transparent |
| Error colour | `#ff8f84` |
| Layout | One-page |
| Typography | A clean neutral (Inter or nearest). **Not** a condensed face. |

**On the font:** the site uses Decima Sans, which cannot go here — custom fonts
need the Checkout Branding API, and Shopify's docs state that requires Plus.
Decima is a *condensed geometric*; Shopify's library has no true match, so a
near-miss would read worse than an honest neutral. Pick a well-made neutral and
let checkout be deliberately plain.

**Expected losses, not bugs:**
- Gradients aren't supported — the gold→orange button flattens to `#edae42`.
- Background images were removed from the header and main area on **5 Feb 2026**;
  solid colours only. The order summary can still take one.
- Corner radius isn't adjustable on Grow.

---

## Step 4 — Theme (Horizon 4.1.3)

**Decide the exposure question first.** The storefront is public with no
password, and `shop.anjunadeep.odeysse.com/products.json` currently returns
`"Sample Product Merch"`, `"vendor":"My Store"`, `"price":"1500.00"` to anyone.
Either password-protect it until the real products exist, or `noindex` it.
Branding a publicly-indexed sample product is the worst of both.

Then, **Online Store → Themes → Customise** (no code needed):

- Background `#0a1f20`, text `#cfe7dc`, headings `#eafaf1`
- Accent / buttons `#edae42`, secondary `#e07b30`
- Favicon `assets/favicon.png`
- Header/footer logo `assets/anjunadeep-logo.png`
- Point the homepage at `anjunadeep.odeysse.com` rather than leaving stock
  Horizon content

Buyers arrive by cart permalink and land straight in checkout, so they never
see these pages on the normal path. This is exposure control, not conversion
work.

---

## Step 5 — Emails

**Settings → Notifications → Customer notifications.**

**First, one setting that brands every email at once:** the templates draw
buttons from `{{ shop.email_accent_color }}`. Set the email accent colour to
**`#edae42`** and every notification's button turns gold — no template editing.

**Then the order confirmation:** branded templates are ready in the repo at

```
scraps/email/order-confirmation-PRODUCTION.liquid   → production
scraps/email/order-confirmation-STAGING.liquid      → staging
```

Paste the whole file into **Order confirmation → Edit code**. The slip block is
restyled into the palette; the Liquid is untouched (405 if/endif and 83
for/endfor, identical to the originals).

The two differ only by the link domain — production points at
`anjunadeep.odeysse.com`, staging at the Railway URL. Use the matching one.

Notes:
- The block is wrapped in `{% if financial_status != 'paid' ... %}`, so card
  payers never see it. Correct — leave it.
- It uses `{{ order_number }}`. **Never `{{ order.order_number }}`** — email
  templates omit the `order.` prefix and the wrong one renders blank.
- Custom fonts don't work in email (Gmail ignores `@font-face`), so the type
  falls back to a web-safe stack by design.

---

## Verification

1. Load `https://shop.anjunadeep.odeysse.com/cart/48706766799102:1` — confirm a
   branded checkout, and that "My Store" is gone. Check mobile width.
2. Place **one** test order; read the confirmation in **Gmail web and iOS Mail**
   (different renderers). Confirm the order number is not blank and the slip
   button is gold.
3. Load the storefront root; confirm branding and that the password/noindex
   decision took effect.

**Don't test-order during the drop** — a real order creates a real PENDING
record someone has to cancel.
