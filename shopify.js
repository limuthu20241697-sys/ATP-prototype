// Shopify Admin API — marking a bank-transfer order as paid.
//
// Manual-payment orders sit at financial_status = "pending" until a human
// confirms the money arrived. This lets an admin do that from our slip review
// screen instead of switching to the Shopify admin, which is what made the
// review flow feel broken: the slip queue and the money lived in two places
// with no link between them.
//
// Verified against shopify.dev on 10 Aug 2026.

const API_VERSION = '2026-07'; // current stable; supported until Jul 2027

// Trimmed everywhere: a value pasted into a dashboard easily carries a stray
// space or tab, and an untrimmed host produces an unresolvable URL.
const env = (k) => (process.env[k] || '').trim();

// Two ways to authenticate, because Shopify changed this on 1 Jan 2026:
//
//   1. SHOPIFY_ADMIN_TOKEN — a permanent token. Only obtainable from a custom
//      app created in the Shopify admin BEFORE Jan 2026. Simplest if you have
//      one; those apps still work.
//   2. SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET — apps created since then show
//      only these. There is no permanent token to copy; you exchange the pair
//      for one that expires after 24 hours, so we cache and re-request it.
//
// Either is enough. A static token wins if both are present.
function isConfigured() {
  if (!env('SHOPIFY_STORE_DOMAIN')) return false;
  return Boolean(
    env('SHOPIFY_ADMIN_TOKEN') ||
      (env('SHOPIFY_CLIENT_ID') && env('SHOPIFY_CLIENT_SECRET'))
  );
}

let cachedToken = null;      // { token, expiresAt }

async function accessToken() {
  const stat = env('SHOPIFY_ADMIN_TOKEN');
  if (stat) return stat;

  // Re-use while it has more than a minute left, so a request can't be issued
  // with a token that expires mid-flight.
  if (cachedToken && cachedToken.expiresAt - Date.now() > 60_000) {
    return cachedToken.token;
  }

  const res = await fetch(
    `https://${env('SHOPIFY_STORE_DOMAIN')}/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: env('SHOPIFY_CLIENT_ID'),
        client_secret: env('SHOPIFY_CLIENT_SECRET'),
      }),
      signal: AbortSignal.timeout(15000),
    }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    // shop_not_permitted means the app and store are in different Shopify
    // organizations — client credentials only works on a store you own.
    throw new Error(
      'shopify_auth_failed' + (json.error ? ': ' + json.error : ` (HTTP ${res.status})`)
    );
  }
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + (Number(json.expires_in || 86399) * 1000),
  };
  return cachedToken.token;
}

async function graphql(query, variables) {
  if (!isConfigured()) throw new Error('shopify_not_configured');
  const url = `https://${env('SHOPIFY_STORE_DOMAIN')}/admin/api/${API_VERSION}/graphql.json`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': await accessToken(),
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`shopify_http_${res.status}`);
  }
  const json = await res.json();
  // Shopify returns HTTP 200 with an errors array for GraphQL-level failures.
  if (json.errors && json.errors.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  return json.data;
}

// Build the GID only as a fallback. The webhook payload carries
// admin_graphql_api_id directly, which is what we store and prefer — hand
// assembly is where wrong-resource bugs come from. Keep the id a STRING:
// Shopify order ids exceed JS safe-integer range.
function orderGid(order) {
  if (order && order.admin_graphql_api_id) return order.admin_graphql_api_id;
  const id = String((order && order.shopify_order_id) || '').trim();
  if (!/^\d+$/.test(id)) return null;
  return `gid://shopify/Order/${id}`;
}

const ORDER_QUERY = `
  query slipOrder($id: ID!) {
    order(id: $id) {
      id
      name
      cancelledAt
      canMarkAsPaid
      displayFinancialStatus
      totalOutstandingSet { shopMoney { amount currencyCode } }
    }
  }`;

const MARK_PAID = `
  mutation markPaid($input: OrderMarkAsPaidInput!) {
    orderMarkAsPaid(input: $input) {
      userErrors { field message }
      order { id name displayFinancialStatus }
    }
  }`;

// Ask Shopify what state the order is in before trying to change it.
//
// This exists because OrderMarkAsPaid's userErrors have NO code field — every
// failure comes back as the same string, "Order cannot be marked as paid."
// Without a pre-flight we could not tell an admin whether the order was
// already paid, cancelled, or had nothing outstanding.
async function getOrderState(order) {
  const gid = orderGid(order);
  if (!gid) return { ok: false, reason: 'no_order_id' };

  const data = await graphql(ORDER_QUERY, { id: gid });
  const o = data && data.order;
  if (!o) return { ok: false, reason: 'not_found' };

  const outstanding = Number(
    (o.totalOutstandingSet && o.totalOutstandingSet.shopMoney &&
      o.totalOutstandingSet.shopMoney.amount) || 0
  );

  return {
    ok: true,
    gid,
    name: o.name,
    financialStatus: o.displayFinancialStatus,
    cancelled: Boolean(o.cancelledAt),
    canMarkAsPaid: Boolean(o.canMarkAsPaid),
    outstanding,
    currency:
      (o.totalOutstandingSet && o.totalOutstandingSet.shopMoney &&
        o.totalOutstandingSet.shopMoney.currencyCode) || null,
  };
}

// Mark an order paid, returning a result the UI can show verbatim.
//
// NOT idempotent — a second call errors rather than succeeding quietly. An
// order that is already PAID is therefore reported as SUCCESS here: from the
// admin's point of view the desired end state holds, and showing a failure
// for a double-click would be actively misleading.
async function markOrderPaid(order) {
  const state = await getOrderState(order);
  if (!state.ok) {
    return { ok: false, code: state.reason, message: 'Could not find this order in Shopify.' };
  }

  if (state.financialStatus === 'PAID') {
    return { ok: true, alreadyPaid: true, message: 'Already marked paid in Shopify.' };
  }
  if (state.cancelled) {
    return { ok: false, code: 'cancelled', message: 'This order was cancelled in Shopify.' };
  }
  if (state.outstanding <= 0) {
    return { ok: false, code: 'nothing_outstanding', message: 'This order has nothing outstanding.' };
  }
  if (!state.canMarkAsPaid) {
    return {
      ok: false,
      code: 'cannot_mark',
      message: `Shopify won't accept a manual payment for this order (status: ${state.financialStatus}).`,
    };
  }

  const data = await graphql(MARK_PAID, { input: { id: state.gid } });
  const payload = (data && data.orderMarkAsPaid) || {};
  const errs = payload.userErrors || [];
  if (errs.length) {
    return { ok: false, code: 'user_error', message: errs.map((e) => e.message).join('; ') };
  }

  return {
    ok: true,
    message: 'Marked paid in Shopify.',
    financialStatus: payload.order && payload.order.displayFinancialStatus,
  };
}

module.exports = { isConfigured, getOrderState, markOrderPaid, orderGid, API_VERSION };
