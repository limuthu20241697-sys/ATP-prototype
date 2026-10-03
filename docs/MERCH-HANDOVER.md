# Anjunadeep merch store — full handover

**Last updated:** 11 August 2026
**Status:** built and deployed to staging; not on production; cannot sell yet (see [Blockers](#blockers))

This is the complete state of the merch/payments work. It is written so a new
session can pick up without re-deriving anything.

---

## 1. The business situation

Odeysse runs **Anjunadeep Open Air Colombo** (22 Aug 2026, Lotus Tower). Tickets
and VVIP tables already sell through the ODESSE portal. This work adds a **merch
store**: flag scarfs (4 colourways), paper fans (4 designs), silicone wristbands
(6 colours), collector boxes (3 finishes) — 17 variants total.

Sri Lanka, LKR, Shopify with a manual **Bank Deposit** payment method. Shopify
Payments is unavailable in Sri Lanka; **OnePay** is the intended card gateway and
is not yet approved.

---

## 2. Architecture — and why

```
anjunadeep.odeysse.com            Railway · Express · single static index.html
  └── <section id="oa-merch">     product grid, cart in localStorage
        │
        ├── pay-before-checkout   /merch/slip?mode=pre   (CURRENT, flag ON)
        │      buyer transfers → uploads slip → R2 + Postgres → gets a UUID
        │      → "Continue to checkout" button
        │
        ▼
shop.anjunadeep.odeysse.com/cart/<variantId>:<qty>?attributes[slip]=<uuid>
        │  Shopify hosted checkout · Bank Deposit · order = PENDING
        ▼
POST /api/merch/webhook  (orders/create + orders/paid)
        └── claims the slip by UUID, cross-checks the amount
        ▼
/admin/slips   admin reviews → "Approve & mark paid" → Shopify orderMarkAsPaid
        ▲
        └── reached from the ODESSE portal topbar (separate repo)
```

**No framework.** `index.html` is ~8,300 lines of hand-written HTML with inline
styles, served by a small Express app. All merch JS lives inside the existing
`<script type="text/x-dc">` block in `componentDidMount`. Do not introduce a
build step.

### Decisions that shaped this

**Cart permalinks, not the Storefront API.** Verified against shopify.dev: a
permalink needs no token, no app, no server code — a plain `<a href>` reaches a
real checkout. The Storefront API is optional and only needed for live inventory.
This is why the site stayed on Express/Railway instead of becoming a Next.js app,
which is what an earlier research runbook (`onepay-shopify-runbook.html`)
assumed.

**A file cannot ride a cart permalink.** The `properties` parameter is
base64-encoded **text**; `/cart/add.js` takes key-value pairs only. Checkout UI
extensions have a Drop zone component but it stores nothing and is Plus-only for
pre-purchase steps. So the image goes to R2 and only an opaque UUID travels as
`attributes[slip]`. This is the same pattern Shopify prescribes to Plus merchants.

**PayProofy (Shopify app) was evaluated and rejected.** Its listing says the
upload form works "from any page, **except the checkout and thank you pages**" —
buyers arrive by permalink straight into checkout and never load a theme page, so
they would never see it. Also 0 reviews, no English support, and a privacy policy
whose company address is still the template placeholder *"123 Payment Street,
Commerce City, Country"*. No mature alternative exists; the closest (Conform,
2021) has 1 review and doesn't mark orders paid.

**WhatsApp cannot auto-attach a file.** Click-to-chat supports only `text`; the
Cloud API refuses to message the business's own number (error 131021). So the
site is the system of record and WhatsApp is a notification channel. The order
number is baked into the **filename** because WhatsApp usually drops the caption
when a file is attached.

---

## 3. Repos, branches, environments

| | anjunadeep_odc (site) | Odeysse-platform (ODC portal) |
|---|---|---|
| Path | `d:\FERN\Anjunadeep\anjunadeep_odc` | `D:\FERN\ODC demo` |
| Remote | `wearefern/anjunadeep_odc` | `wearefern/Odeysse-platform` |
| Branch | `dev` | `dev` |
| Staging | `https://anjunadeepodc-staging.up.railway.app` | its own Railway staging |
| Production | `https://anjunadeep.odeysse.com` | `tickets.odeysse.com` |
| Stack | Express + static HTML + Postgres | Next.js 16 App Router, plain CSS |

**Both repos deploy `dev` → staging automatically.** Production deploys from
`main`. Railway CLI is linked: `railway link -p modest-ambition -e staging -s anjunadeep_odc`.

⚠️ **Staging has its own Postgres** (`postgres-4jpk`), separate from production.

---

## 4. Files

| File | Role |
|---|---|
| `index.html` | Merch section, cart, permalink builder, `OA_PRECHECKOUT_PAY` flag |
| `merch-slip.html` | Buyer slip upload — two modes, pre-order and post-order |
| `server.js` | Webhook, slip routes, admin queue, order summary, seed route |
| `db.js` | Postgres — `subscribers`, `merch_orders`, `merch_slips` |
| `storage.js` | Cloudflare R2 via the S3 SDK |
| `shopify.js` | Admin API — preflight + `orderMarkAsPaid` |
| `assets/merch/` | 17 product images extracted from the client's PDF |
| `scraps/merch-policy-brief.md` | Policy/content brief for the PM/BA |
| ODC portal: `app/portal/slips/route.ts` | Session-gated redirect into the slip queue |

---

## 5. Commits (this session, oldest first)

`anjunadeep_odc` on `dev`, from `17e8970`:

```
9ed51ba  Change merch headline to "Releasing soon"
0de1e00  Add merch store section backed by Shopify checkout
d9338d4  Hide merch prices until Shopify holds the real figures
5309998  Add bank-transfer payment slip upload with WhatsApp handoff
0f3915f  Make the slip review flow actually usable end to end
3b39ffc  Wire the Shopify sample product in for end-to-end testing
7482579  Trim the admin token before comparing
f4bdcfb  Trim the slip link secret too
4f19458  Prefill the email from the slip link
c4ccfec  Trim SHOPIFY_STORE_DOMAIN and the admin token
1effd62  Support Shopify client credentials as well as a static token
d25451e  Refuse to be framed on the slip review page
941d7b8  Let buyers pay and upload the slip before checkout
3f7c717  Turn on pay-before-checkout
7ae5cc1  Stop a paid slip unlocking a bag it never paid for
feab822  Confirm the slip, then let the buyer press Continue
3aa3fca  Document the merch store build and its decisions
5c3cb40  Go straight to checkout after the slip upload again  (reverts feab822)
```

ODC portal on `dev`: `cba406c  Add a Payment slips button to the portal for Anjunadeep`

Production `main` is at `1368531` — **none of the merch work is on production.**

---

## 6. Bugs found and fixed (do not reintroduce)

| Bug | Fix |
|---|---|
| **Webhook ACKed Shopify before persisting** — a failed insert reported success, Shopify never retried, the order silently vanished | Persist first, then ACK; 500 on failure so Shopify retries |
| **Rate limiter shared with `/api/subscribe`** — a newsletter signup blocked a payment-slip upload | Per-endpoint buckets + eviction sweep |
| **No index on `merch_orders(order_number)`** — seq scan on every upload | Composite `(order_number, created_at DESC)` |
| **Admin queue showed no amount/name/status** — reviewers were told to check against a bank statement with no figure on screen | Join `merch_orders`, show amount, name, Shopify status, order link |
| **`o.currency` overwrote `s.currency`** in the admin join | Aliased to `order_currency` |
| **Thumbnails `object-fit:cover`** cropped the amount off portrait slip photos | `contain` + click-to-zoom |
| **Status update returned 200 with `ok:false`** — client rendered a no-op as success | 404 when nothing updated |
| **Whitespace in env vars** — `ADMIN_TOKEN` has a trailing space; HTTP strips trailing whitespace from headers, so it worked via `?token=` but never via header. `SHOPIFY_STORE_DOMAIN` has a leading tab | All env reads trimmed |
| **A paid slip unlocked any bag** — pay once, add more items, still "Continue to checkout" → free goods | Slip must match the cart total, and is spent on the way to checkout |
| **A spent slip kept unlocking checkout** — the "spent on the way to checkout" half above never actually ran. The slip page hands off straight to Shopify, so the shop page's click handler never fires, and the `?checkout=success` path it also relied on is dead (Shopify never returns the buyer to our origin). A buyer who completed an order could re-add the same product and go straight to checkout | `GET /api/merch/slip/state` exposes `consumed_at`; the shop page checks it on load, on `pageshow` and on tab focus, and drops the slip when spent. Slip is also bound to a signature of the exact bag, not just the total |

### Settled by trying it: no interstitial after the slip upload

A confirmation screen was added between the upload and Shopify (`feab822`)
on the reasoning that an automatic jump right after a payment is
disorienting. In use it read as an interruption rather than progress —
the buyer has just pressed "Upload slip & continue", so landing on
checkout is the step they were promised, and the extra screen only asked
them to re-confirm a choice already made. **Reverted in `5c3cb40`; the
upload now redirects straight to Shopify checkout.** Don't reintroduce it
without a specific reason.

---

## 7. Fraud model — read before changing the flow

**Nothing on the buyer's side is trustworthy.** The "Pay & upload slip" button is
just a link; anyone can construct the Shopify cart permalink and skip it. There
is no way to make Shopify require a slip.

**The control that actually works:** an order is only **PAID** when a human
matches a slip against the bank statement. Everything before that is convenience.

Therefore:
- **Never fulfil a PENDING order.** Fulfilment must key off PAID, not off an
  order existing.
- The webhook **cross-checks** `declared_amount` against `order.total_price` and
  flags a mismatch in the queue.
- Slips are **single-use** (SQL `WHERE consumed_at IS NULL`, so concurrent
  webhook deliveries can't both claim one), **expire after 24h**, and are
  validated against the cart total client-side.

---

## 8. Payment method decisions

**Now:** Bank Deposit only. Every buyer is a bank-transfer buyer, so gating
everyone through pay-and-upload taxes nobody. `OA_PRECHECKOUT_PAY = true`.

**When OnePay is approved:** OnePay becomes the only **visible** method. Bank
Deposit stays **configured but deactivated**, so it can be re-enabled in ~15
seconds if OnePay fails on drop night (it has no status page, no public outage
history, no merchant reviews).

**Switchover, in this order** — order matters:
1. Flip `OA_PRECHECKOUT_PAY = false` in `index.html`, deploy
2. *Then* in Shopify: activate OnePay, deactivate Bank Deposit

Reversed, there's a window where buyers pay by transfer on our page and find no
Bank Deposit option at checkout.

Definition of "OnePay is stable" — agreed to be concrete, not a judgement call:
**20+ real transactions with no failures, and one refund verified against the
OnePay payout report.** Refunds are the biggest untested unknown — OnePay's
Shopify listing never mentions them.

The slip pages and admin queue stay in the codebase, dormant. Nothing to delete.

---

## 9. Pricing

**Price shown must equal price paid.** Introduced for pre-checkout payment, but
keep it permanently — switching back to added shipping would read as a price rise.

- Shipping: flat **LKR 0** (delivery folded into product prices)
- Tax: **inclusive** — `taxesIncluded: true` confirmed via the Admin API
- Tipping must stay **off** (a tip lets the buyer increase the total)
- Markets tax display must be **static**, not dynamic

⚠️ The `price` values in `OA_MERCH` are **placeholders** (4500 / 1800 / 750 /
9500). They are now rendered to buyers because the flag is on. **Real prices are
required before anyone can be allowed to pay.**

---

## 10. Environment variables

**Site (Railway `anjunadeep_odc`):**

| Var | Status |
|---|---|
| `DATABASE_URL` | set (staging has its own Postgres) |
| `ADMIN_TOKEN` | set — **has a trailing space**; code trims, but clean it and rotate |
| `SHOPIFY_WEBHOOK_SECRET` | set |
| `R2_ACCOUNT_ID` | `2760bacb044be8a68c15009fbcf2e16c` |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | set and working |
| `R2_BUCKET` | `anjunadeep-slips` |
| `SHOPIFY_STORE_DOMAIN` | `odeysse.myshopify.com` — **has a leading tab** |
| `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET` | set — client-credentials grant |
| `WHATSAPP_NUMBER` | `94786817588` |
| `BANK_*` | test values — need real ones |

**Shopify auth note:** admin-created custom apps were removed on 1 Jan 2026. New
apps expose only a Client ID + Secret, exchanged for a **24-hour** token.
`shopify.js` handles the exchange and caches it. A static `SHOPIFY_ADMIN_TOKEN`
is still supported for pre-2026 apps. Scope: **`write_orders` only** — note this
does *not* include `read_customers` or `deliveryProfiles`, so shipping settings
cannot be read back via the API.

**ODC portal (Railway, staging):** `SLIPS_ADMIN_URL`, `SLIPS_ADMIN_TOKEN` —
**must be set or the portal button 503s.** Deliberately not `NEXT_PUBLIC_*`:
those are inlined into the browser bundle and this token unlocks bank slips.

---

## 11. Shopify configuration

- Store: `odeysse.myshopify.com`, primary domain `shop.anjunadeep.odeysse.com`
- Store name is still **"My Store"** — appears in customer emails, should change
- Sender email: `tickets@odeysse.com`, domain **authenticated** (6 DKIM CNAMEs
  verified resolving; SPF and DMARC corrected — a duplicate DMARC record was
  removed, which had been voiding the policy entirely)
- One product exists: **"Sample Product Merch"**, variant `48706766799102`
  (Red, LKR 1,500), wired into the Flag Scarf's first colourway **as a test**
- Order confirmation email: modified templates prepared at
  `C:\Users\ASUS\Downloads\email-with-slip.txt` (staging) and
  `email-with-slip-PRODUCTION.txt`. Use `{{ order_number }}`, **not**
  `{{ order.order_number }}` — email templates omit the `order.` prefix and the
  wrong one renders blank.
- **Webhooks: CONFIGURED and delivering** (verified 12 Aug 2026). Slips in the
  staging queue carry real order numbers (#1005, #1012–#1018), which only
  `claimPreOrderSlip` sets — so `orders/create` is arriving and `consumed_at` is
  being stamped. This corrects an earlier note that said zero deliveries had ever
  reached the server.

---

## 12. Verification already done

All against a running server with pg/R2/Shopify stubbed, plus live staging:

- Webhook: HMAC valid/invalid/missing/garbage/mutated-body; replay deduped;
  **DB failure returns 500 so Shopify retries**
- Pre-order slip: upload → claim by UUID → **replay rejected** → **24h expiry** →
  **amount mismatch flagged** → `note` fallback recovers a stripped attribute
- Slip reuse: 6 cases — only the exact bag paid for is waved through
- Permalink: numeric IDs, primary domain, attributes survive into the checkout
  URL (verified against the live store)
- R2: real upload to the real bucket, 42,877 bytes retrieved byte-identical via
  a 15-minute signed URL
- Shopify: token exchange 200, `write_orders`, read order #1007 with
  `canMarkAsPaid: true`
- Portal: signed out → login; tampered cookie → login; **token absent from the
  served HTML and every client JS chunk**; 39/39 portal tests still pass

---

## 13. Blockers

**Cannot sell anything until:**

1. **Real prices** for the four products, delivery included
2. **14 numeric variant IDs** from Shopify (16 of 17 are still `null`; the flag
   is ON so placeholder prices are visible to buyers — a real risk)
3. ~~**Webhooks configured** in Shopify~~ — **done**, verified delivering
   12 Aug 2026 (see §11)

**Also outstanding:**
- `SLIPS_ADMIN_URL` / `SLIPS_ADMIN_TOKEN` on the portal's staging environment
- Real bank details in `BANK_*`
- Order confirmation email template pasted into Shopify
- Policy pages (brief written, not returned by the PM/BA)
- OnePay application not started
- Nothing merged to `main` — production still shows the old placeholder

---

## 14. Known unknowns

- **Does `orderMarkAsPaid` email the customer a duplicate order confirmation?**
  Shopify's docs are silent and there is no suppression flag. Only observable by
  watching a real inbox during approval.
- **Shipping rate can't be verified via API** (`write_orders` doesn't grant
  `deliveryProfiles`). Confirm subtotal === total with one manual test checkout.
- **Web Share to WhatsApp on real devices** — whether WhatsApp appears as a share
  target on Android/iOS is undocumented; needs a 10-minute device test.
- **OnePay refunds from the Shopify admin** — their listing never mentions
  refunds; may create a Shopify record with no money movement.

---

## 15. Operational risks

- **Unpaid orders hold stock and Shopify never releases them.** No auto-expiry
  for manual payments. Someone must cancel stale unpaid orders daily or a limited
  run sells out to people who never paid.
- **Buyers pay before an order exists** (current flow). If they abandon checkout,
  you hold money with no order. These appear under the **"No order yet"** tab with
  no approve button — a real list someone must work.
- **`write_orders` is broad** — it reads every order from the last 60 days
  including customer names, emails and addresses. Keep the token in Railway only.
- **The portal has no role model** — any logged-in portal user reaches the slip
  queue and therefore customers' bank slips.
