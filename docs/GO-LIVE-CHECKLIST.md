# Merch store — go-live checklist

**Rewritten:** 13 August 2026 · **Status:** nothing on `main`; two Shopify blockers open

Supersedes the 11 Aug version, which described a four-product shop that no
longer exists.

Production site: `https://anjunadeep.odeysse.com`
Production portal: `tickets.odeysse.com`
Shopify: `odeysse.myshopify.com` *(canonical: `sditnu-rd.myshopify.com`)*

---

## The flow you are shipping

```
anjunadeep.odeysse.com          unboxing animation, one button
   │
   ▼
shop.anjunadeep.odeysse.com     Shopify product page
   │                            colour AND quantity chosen here
   ▼  Add to cart
Shopify cart                    checkout button is REWIRED to us
   │
   ▼
anjunadeep.odeysse.com/merch/slip?mode=pre&items=<variant:qty>
   │                            pay, upload the slip
   ▼
Shopify checkout                cart rebuilt, slip UUID attached
   │
   ▼
orders/create webhook           claims the slip, cross-checks the amount
   │
   ▼
/admin/slips                    review → Approve & mark paid
```

**One product**: "Anjunadeep Merch Pack", handle `anjunadeep-merch-pack`,
24 variants (Scarf ×4 · Wrist Band ×3 · Paper Fan ×2), all one price. The pieces
are not sold separately.

**The checkout exit is ours wherever the buyer starts.** Someone landing directly
on the Shopify domain still goes through pay-and-upload.

---

## ⚠️ Read this before anything else

**The live theme's checkout button points at staging.**
`snippets/cart-summary.liquid` carries
`https://anjunadeepodc-staging.up.railway.app` in two places.

Right now that is harmless *only because* the pack costs Rs 0.00 and 0 of 24
variants are in stock, so nobody can buy. **The moment you set a real price and
stock, real buyers get sent to a test server.**

So: **fix the theme URL before, or in the same sitting as, setting the price.**
Never set the price first.

---

## Blockers (neither is code)

**1. Merch Pack price is Rs 0.00** on all 24 variants.
**2. 0 of 24 variants are available** — every colour reads out of stock.

A side effect worth knowing, because it makes the review queue look broken: a
zero-value order has no outstanding balance, so **Shopify marks it PAID
automatically** before anyone reviews the slip. Approve/Reject then appear to do
nothing. Setting a real price fixes that on its own.

The price must equal `MERCH_PACK_PRICE` (staging: 4500) or every order is flagged
as an amount mismatch.

---

## Step 0 — Prerequisites

- [ ] **Final pack price** decided, delivery included
- [ ] Same figure set on **all 24 variants** in Shopify
- [ ] **Stock set** on all 24 variants
- [ ] **Real bank details** for the account buyers transfer to
- [ ] Someone at Odeysse **owns the slip queue**, and knows the promised
      turnaround is "within 24 hours on working days"

No variant IDs are needed in code any more. The site no longer holds a product
catalogue.

---

## Step 1 — Production environment variables (site)

Railway → `modest-ambition` → **production** → `anjunadeep_odc` → Variables.

Already set: `DATABASE_URL`, `ADMIN_TOKEN`. Everything below is missing.

### 1a. Copy verbatim

| Variable | Value |
|---|---|
| `R2_ACCOUNT_ID` | `2760bacb044be8a68c15009fbcf2e16c` |
| `R2_BUCKET` | `anjunadeep-slips` |
| `SHOPIFY_STORE_DOMAIN` | `odeysse.myshopify.com` |
| `WHATSAPP_NUMBER` | `94786817588` |

⚠️ Staging's `SHOPIFY_STORE_DOMAIN` carries a **leading tab**. Type it fresh.

### 1b. Copy the secrets across from staging's Variables screen

| Variable | Expected length |
|---|---|
| `R2_ACCESS_KEY_ID` | 32 |
| `R2_SECRET_ACCESS_KEY` | 64 |
| `SHOPIFY_CLIENT_ID` | 32 |
| `SHOPIFY_CLIENT_SECRET` | 38 |
| `SHOPIFY_WEBHOOK_SECRET` | 64 |

Same R2 bucket and Shopify app serve both environments — intended, no collision.

### 1c. NEW — the pack price

```
MERCH_PACK_PRICE = <the real price, digits only, e.g. 4500>
```

This is the amount the buyer is told to transfer, multiplied by quantity. It is
server-side on purpose: the buyer arrives from Shopify with their cart in the
URL, and if the price rode along too they could edit it down.

**It must equal the Shopify variant price exactly.**

### 1d. Real bank details (staging holds test values)

`BANK_NAME`, `BANK_ACCOUNT_NAME`, `BANK_ACCOUNT_NUMBER`, `BANK_BRANCH`

Staging says "Test Bank" / "Test account holder" / "1234567890" / "Test Branch ".
**These are shown to real buyers being asked to transfer money.**

### 1e. Rotate the admin token

Production and staging currently **share** `ADMIN_TOKEN`, it has a trailing
space, and it has appeared in a chat transcript.

```
openssl rand -hex 24
```

Different value per environment. No whitespace.

**Done when:** all of the above are present and nothing has leading or trailing
whitespace.

---

## Step 2 — Code

Nothing to change. The old shop — `OA_MERCH`, the bag, swatches,
`buildCheckoutUrl`, `OA_PRECHECKOUT_PAY` — is **deleted** from `index.html`
(verified: zero occurrences). The price is no longer in code, and no variant ID
is either.

- [x] No test wiring survives — `afd4605` pointed the pack at "Sample Product
      Merch", `13763de` removed it. Verified 13 Aug: `48706766799102` and
      `Sample Product` appear nowhere outside `.themework/`.
- [ ] Commit anything still unstaged in the working tree before merging.

---

## Step 3 — Full run on staging first

With the real price and stock live in Shopify, walk the whole thing on staging:

- [ ] Site → merch section → the unboxing animation plays, button works
- [ ] Shopify product page → pick a colour and quantity → Add to cart
- [ ] Cart → checkout button goes to **our** slip page, not Shopify's checkout
- [ ] Slip page shows the correct amount — **price × quantity**
- [ ] Bank details shown are the **real** ones
- [ ] Upload a slip → returns into Shopify checkout
- [ ] Complete the order
- [ ] `/admin/slips` → slip already attached, **no amount mismatch**
- [ ] Approve & mark paid → order flips to **PAID** in Shopify
- [ ] Go back to the slip link → it is **refused** (spent), not reusable
- [ ] "Buy it now" is absent from the product page; express checkout is off
- [ ] **Watch the buyer's inbox** — does approving send a *duplicate* order
      confirmation? Unknown, and unsuppressable if so

Do not merge until this passes end to end.

---

## Step 4 — Merge the site to production

```bash
cd d:/FERN/Anjunadeep/anjunadeep_odc
git checkout dev && git pull
gh pr create --base main --head dev --title "Merch: pack, unboxing, pay-first checkout"
```

Railway auto-deploys `main`.

**Done when:**
- `https://anjunadeep.odeysse.com/merch/slip?mode=pre&items=1:1` → **200**
- `https://anjunadeep.odeysse.com/admin/slips` → **401** without a token
- `https://anjunadeep.odeysse.com/api/merch/slip/state?uuid=x` → **400
  `invalid_uuid`** (a 404 means the route didn't deploy)
- The merch section renders with the unboxing animation

⚠️ Must come **before** Step 6 (theme URL). Repointing the theme at a 404 breaks
every checkout.

---

## Step 5 — Portal env + merge

Railway → ODC portal → **production** → Variables:

```
SLIPS_ADMIN_URL   = https://anjunadeep.odeysse.com/admin/slips
SLIPS_ADMIN_TOKEN = <the NEW production ADMIN_TOKEN from 1e>
```

Must match the site's production `ADMIN_TOKEN` exactly, or the button lands on a
401.

```bash
cd "D:/FERN/ODC demo"
git checkout dev && git pull
gh pr create --base main --head dev --title "Add Payment slips button to the portal"
```

**Done when:** production portal → Anjunadeep event → **Payment slips** opens the
queue already authenticated.

---

## Step 6 — Repoint the theme at production ← the critical one

In the **live** theme (`Odeysse pay-first DRAFT`), edit
`snippets/cart-summary.liquid`. Two occurrences:

```liquid
href="https://anjunadeep.odeysse.com/merch/slip?mode=pre&items={{ cart_items | url_encode }}"
data-slip-base="https://anjunadeep.odeysse.com"
```

Working copies are in `.themework/cart-summary.new.liquid` (lines 287 and 289).

⚠️ **`.themework/` is gitignored** — it exists only on this machine. The theme
itself lives in Shopify, so nothing is lost if the folder goes, but there is no
backup of the working copies. Consider archiving them.

**Done when:** add to cart on the live store → checkout → lands on
`anjunadeep.odeysse.com`, not the staging host.

**Rollback themes:** `Horizon backup pre-brand 2026-08-12`, `Odeysse brand
DRAFT`, `Odeysse homepage DRAFT`, original `Horizon`.

> `docs/SHOPIFY-THEME.md` is out of date — it still describes `Horizon` as live
> and `Odeysse brand DRAFT` as unpublished. Worth correcting.

---

## Step 7 — Shopify webhooks

They **are** configured and delivering — orders #1005 and #1012–#1021 are in the
database attached to slips. (An earlier note claiming zero deliveries was wrong.)

They still point at staging. Settings → Notifications → Webhooks:

| Event | Format | URL |
|---|---|---|
| Order creation | JSON | `https://anjunadeep.odeysse.com/api/merch/webhook` |
| Order payment | JSON | `https://anjunadeep.odeysse.com/api/merch/webhook` |

Confirm the signing secret matches production's `SHOPIFY_WEBHOOK_SECRET`.

**Done when:** a production test order appears at
`/api/merch/orders.csv?token=<prod token>`.

---

## Step 8 — Order confirmation email

Shopify → Settings → Notifications → Order confirmation → Edit code.

1. **Save the current template to a file first** — Shopify's docs warn
   customisations cannot be recovered once overwritten
2. Paste `scraps/email/order-confirmation-PRODUCTION.liquid` *(committed in the
   repo — not the older unstyled file in Downloads)*
3. Save

### What the slip block in that template is for

Not the happy path. Buyers pay and upload **before** ordering, so the slip is
normally already attached by the time this email is sent — and telling someone
who has just paid to "upload your payment slip" reads as though the payment
failed, with the likely reaction being a second transfer.

So the block is gated on `attributes.slip == blank` and only appears when **no
slip reference arrived** — someone who reached Shopify checkout without going
through our page. It is worded as a nudge, not an instruction, because we cannot
tell from Shopify whether they have already transferred:

> **We haven't received your payment slip**
> If you've already transferred Rs 4,500.00, send us the slip using the button
> below and we'll match it to this order. **Please don't pay twice.**

The `?order=&email=` route it links to still works — that mode was kept
deliberately as the fallback for exactly this case.

**Done when:**
- A normal order's email is branded and shows **no** slip block *(the slip was
  attached at purchase)*
- An order placed without going through the slip page **does** show it, and the
  button opens the production page with the order number and email prefilled

---

## Step 9 — Shopify housekeeping

- [x] Store renamed to "Anjunadeep Open Air Colombo" — done
- [ ] Shipping still flat **LKR 0**, tax **inclusive**
- [ ] **Tipping off** (Settings → Checkout) — a tip changes the total and breaks
      the amount match
- [ ] Markets tax display **static**, not dynamic
- [ ] Storefront password **off**
- [ ] Five policy pages published (refund, return, privacy, terms, contact)
- [ ] Express / Shop Pay checkout still **disabled** — it bypasses the cart and
      therefore the slip step

---

## Step 10 — One real order before announcing

Small amount, real money, all the way through: pay → upload → approve → PAID →
buyer receives confirmation. Then refund it.

Staging proves nothing about production secrets. This is the only test that does.

---

## Step 11 — Day-one operations

- **Cancel stale unpaid orders daily.** Shopify never releases stock from unpaid
  orders; on a limited run they silently consume inventory. Cancelling restocks.
- **Work the "No order yet" queue** — buyers who paid then abandoned checkout.
  You hold their money and they have no order.
- **Never fulfil a PENDING order.** PAID is the only signal money arrived.

---

## When OnePay is approved (later)

**Order matters:**

1. Revert the theme's cart checkout button to Shopify's own checkout
2. *Then* Shopify → Payments: activate OnePay, **deactivate** Bank Deposit
   (leave it configured — one toggle away if OnePay fails)
3. Re-enable express / Shop Pay if wanted

Reversed, buyers pay by transfer and then find no matching option at checkout.

"OnePay is stable" = **20+ real transactions with no failures, and one refund
verified against the OnePay payout report.** Refunds are the biggest untested
unknown — OnePay's Shopify listing never mentions them.

---

## Rollback

| Break | Fastest fix |
|---|---|
| Site broken after merge | `git revert -m 1 <merge-commit>` on `main` |
| Theme broken | Publish `Horizon backup pre-brand 2026-08-12` |
| Checkout sending buyers to the wrong host | Edit the two lines in `cart-summary.liquid` — seconds, no deploy |
| Anything financial unclear | Deactivate Bank Deposit in Shopify. Nobody can order, nobody transfers into a broken flow |
