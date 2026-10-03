// Postgres access for newsletter signups.
// One shared pool for the whole process. Connection comes from DATABASE_URL
// (Railway injects this when a Postgres service is linked). Locally it comes
// from .env via dotenv (loaded in server.js).

const { Pool } = require('pg');

// Railway's *internal* connection URL doesn't use SSL; the *public* URL does.
// Set DATABASE_SSL=true when pointing at a public/external Postgres URL.
const useSsl = process.env.DATABASE_SSL === 'true';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  // Don't crash the static site if an idle DB client errors out.
  console.error('[db] idle client error:', err.message);
});

// Create the table on boot. Safe to run every start.
async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id          BIGSERIAL PRIMARY KEY,
      email       TEXT NOT NULL UNIQUE,
      consent     BOOLEAN NOT NULL DEFAULT false,
      source      TEXT,
      ip          TEXT,
      user_agent  TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

// Insert a subscriber. Email is expected pre-normalised (trimmed + lowercased).
// Returns { inserted: true } on a new row, { inserted: false } if it already existed.
async function insertSubscriber({ email, consent, source, ip, ua }) {
  const result = await pool.query(
    `INSERT INTO subscribers (email, consent, source, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [email, consent, source || null, ip || null, ua || null]
  );
  return { inserted: result.rowCount > 0 };
}

// Local mirror of Shopify merch orders. Shopify stays the source of truth for
// money, stock and fulfilment — this table exists so support and reporting
// don't require a Shopify login, and so we keep attribution (which campaign
// drove the sale) alongside the order.
//
// webhook_id is the dedupe key: Shopify delivers at-least-once, so the same
// order can arrive twice. UNIQUE + ON CONFLICT DO NOTHING makes replay a no-op.
async function ensureMerchSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS merch_orders (
      id                 BIGSERIAL PRIMARY KEY,
      shopify_order_id   TEXT NOT NULL,
      webhook_id         TEXT UNIQUE,
      topic              TEXT,
      order_number       TEXT,
      email              TEXT,
      total_price        NUMERIC(12,2),
      currency           TEXT,
      financial_status   TEXT,
      fulfillment_status TEXT,
      line_items         JSONB,
      attributes         JSONB,
      raw                JSONB,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS merch_orders_order_id_idx
      ON merch_orders (shopify_order_id);

    -- Added after launch; ALTER ... IF NOT EXISTS keeps this safe to re-run
    -- against a database that already holds live rows.
    ALTER TABLE merch_orders ADD COLUMN IF NOT EXISTS admin_graphql_api_id TEXT;
    ALTER TABLE merch_orders ADD COLUMN IF NOT EXISTS customer_name TEXT;

    -- findMerchOrder runs on EVERY slip upload and filters on order_number,
    -- which had no index at all — a sequential scan over an append-only table
    -- that grows with every webhook event, not just every order.
    CREATE INDEX IF NOT EXISTS merch_orders_order_number_idx
      ON merch_orders (order_number, created_at DESC);
  `);
}

// Insert one order event. Returns { inserted:false } when the webhook was
// already processed, which is the normal path for a Shopify retry.
async function insertMerchOrder({
  shopifyOrderId, adminGraphqlApiId, webhookId, topic, orderNumber, customerName,
  email, totalPrice, currency, financialStatus, fulfillmentStatus, lineItems,
  attributes, raw,
}) {
  const result = await pool.query(
    `INSERT INTO merch_orders (
       shopify_order_id, admin_graphql_api_id, webhook_id, topic, order_number,
       customer_name, email, total_price, currency, financial_status,
       fulfillment_status, line_items, attributes, raw
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (webhook_id) DO NOTHING
     RETURNING id`,
    [
      String(shopifyOrderId), adminGraphqlApiId || null, webhookId || null,
      topic || null, orderNumber || null, customerName || null, email || null,
      totalPrice ?? null, currency || null,
      financialStatus || null, fulfillmentStatus || null,
      JSON.stringify(lineItems || []), JSON.stringify(attributes || {}),
      JSON.stringify(raw || {}),
    ]
  );
  return { inserted: result.rowCount > 0 };
}

// All merch orders, newest first — used by the CSV export.
async function listMerchOrders() {
  const result = await pool.query(
    `SELECT id, shopify_order_id, order_number, email, total_price, currency,
            financial_status, fulfillment_status, line_items, attributes, created_at
     FROM merch_orders
     ORDER BY created_at DESC`
  );
  return result.rows;
}

// Bank-transfer payment slips. The image itself lives in R2 (see storage.js);
// this table holds the metadata, the R2 key, and the review status.
//
// This is a review queue, not an accounting record — Shopify remains the source
// of truth for whether an order is actually paid. A human verifies the slip
// here, then marks the order paid in Shopify.
async function ensureSlipSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS merch_slips (
      id           BIGSERIAL PRIMARY KEY,
      order_number TEXT NOT NULL,
      email        TEXT,
      r2_key       TEXT NOT NULL,
      filename     TEXT,
      mime         TEXT,
      bytes        INTEGER,
      status       TEXT NOT NULL DEFAULT 'pending',
      note         TEXT,
      ip           TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      reviewed_at  TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS merch_slips_order_idx  ON merch_slips (order_number);
    CREATE INDEX IF NOT EXISTS merch_slips_status_idx ON merch_slips (status);

    -- Who acted, and whether we already pushed "paid" to Shopify. The latter
    -- matters because orderMarkAsPaid is NOT idempotent — a second call errors.
    ALTER TABLE merch_slips ADD COLUMN IF NOT EXISTS reviewed_by    TEXT;
    ALTER TABLE merch_slips ADD COLUMN IF NOT EXISTS paid_marked_at TIMESTAMPTZ;

    -- Pre-checkout slips: the buyer pays and uploads BEFORE the Shopify order
    -- exists, so there is no order number yet. An opaque UUID rides on the cart
    -- permalink as attributes[slip] and the orders/create webhook claims it.
    ALTER TABLE merch_slips ALTER COLUMN order_number DROP NOT NULL;
    ALTER TABLE merch_slips ADD COLUMN IF NOT EXISTS slip_uuid       TEXT;
    ALTER TABLE merch_slips ADD COLUMN IF NOT EXISTS declared_amount NUMERIC(12,2);
    ALTER TABLE merch_slips ADD COLUMN IF NOT EXISTS currency        TEXT;
    ALTER TABLE merch_slips ADD COLUMN IF NOT EXISTS consumed_at     TIMESTAMPTZ;
    ALTER TABLE merch_slips ADD COLUMN IF NOT EXISTS amount_mismatch BOOLEAN NOT NULL DEFAULT false;
    -- UNIQUE, not just indexed: the UUID is the claim key, and two rows sharing
    -- one would let a single payment be attached to two different orders.
    CREATE UNIQUE INDEX IF NOT EXISTS merch_slips_uuid_idx
      ON merch_slips (slip_uuid) WHERE slip_uuid IS NOT NULL;
  `);
}

async function insertSlip({ orderNumber, email, r2Key, filename, mime, bytes, ip }) {
  const result = await pool.query(
    `INSERT INTO merch_slips (order_number, email, r2_key, filename, mime, bytes, ip)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, created_at`,
    [orderNumber, email || null, r2Key, filename || null, mime || null, bytes || null, ip || null]
  );
  return result.rows[0];
}

// A slip uploaded BEFORE the Shopify order exists. Status 'awaiting_order'
// distinguishes "paid but no order yet" from "waiting for a reviewer", which
// matters operationally: those are two different people's problems.
async function insertPreOrderSlip({
  slipUuid, email, r2Key, filename, mime, bytes, declaredAmount, currency, ip,
}) {
  const result = await pool.query(
    `INSERT INTO merch_slips
       (slip_uuid, email, r2_key, filename, mime, bytes, declared_amount, currency, ip, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'awaiting_order')
     RETURNING id, slip_uuid, created_at`,
    [
      slipUuid, email || null, r2Key, filename || null, mime || null,
      bytes || null, declaredAmount ?? null, currency || null, ip || null,
    ]
  );
  return result.rows[0];
}

async function findSlipByUuid(slipUuid) {
  const result = await pool.query(
    `SELECT * FROM merch_slips WHERE slip_uuid = $1`,
    [slipUuid]
  );
  return result.rows[0] || null;
}

// Claim a pre-order slip for an order.
//
// The WHERE clause is the single-use guard and it lives in SQL on purpose:
// two concurrent webhook deliveries for the same UUID would otherwise both
// read "unconsumed" and both attach. Only one UPDATE can match, so the second
// returns zero rows and is reported as a replay.
async function attachSlipToOrder(slipUuid, { orderNumber, email, amountMismatch }) {
  const result = await pool.query(
    `UPDATE merch_slips
        SET order_number    = $2,
            email           = COALESCE(email, $3),
            consumed_at     = now(),
            amount_mismatch = $4,
            status          = 'pending'
      WHERE slip_uuid = $1
        AND consumed_at IS NULL
      RETURNING id, order_number, declared_amount, currency`,
    [slipUuid, orderNumber, email || null, Boolean(amountMismatch)]
  );
  return { attached: result.rowCount > 0, row: result.rows[0] || null };
}

// Newest first, with the order details the reviewer actually needs.
//
// merch_orders is an append-only event log (orders/create and orders/paid each
// insert a row), so the join takes the LATEST row per order number via
// DISTINCT ON — otherwise a slip would fan out into one card per webhook event
// and show a stale financial_status.
//
// The previous version selected only from merch_slips, which is why the review
// screen could not show the amount, the buyer's name, or whether Shopify had
// already been marked paid — the reviewer was asked to check a slip against a
// bank statement without being told what figure to look for.
async function listSlips(status, { limit = 50, offset = 0, search = null } = {}) {
  const where = [];
  const params = [];

  if (status) {
    params.push(status);
    where.push(`s.status = $${params.length}`);
  }
  if (search) {
    params.push('%' + String(search).replace(/^#/, '') + '%');
    where.push(`(s.order_number ILIKE $${params.length} OR s.email ILIKE $${params.length})`);
  }
  params.push(limit, offset);

  const result = await pool.query(
    // o.currency is aliased below: merch_slips now has its own `currency`
    // column, and an unaliased o.currency would silently overwrite the slip's
    // own value in the returned row.
    `SELECT s.*,
            o.customer_name, o.total_price, o.currency AS order_currency,
            o.financial_status, o.shopify_order_id, o.admin_graphql_api_id,
            (SELECT COUNT(*)::int FROM merch_slips x
              WHERE s.order_number IS NOT NULL
                AND x.order_number = s.order_number) AS slip_count
       FROM merch_slips s
       LEFT JOIN (
         SELECT DISTINCT ON (order_number)
                order_number, customer_name, total_price, currency,
                financial_status, shopify_order_id, admin_graphql_api_id
           FROM merch_orders
          WHERE order_number IS NOT NULL
          ORDER BY order_number, created_at DESC
       ) o ON o.order_number = s.order_number
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY s.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return result.rows;
}

// Total matching rows, for paging controls.
async function countSlips(status, search = null) {
  const where = [];
  const params = [];
  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  if (search) {
    params.push('%' + String(search).replace(/^#/, '') + '%');
    where.push(`(order_number ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }
  const result = await pool.query(
    `SELECT COUNT(*)::int AS n FROM merch_slips
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`,
    params
  );
  return result.rows[0].n;
}

async function getSlip(id) {
  const result = await pool.query(`SELECT * FROM merch_slips WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function setSlipStatus(id, status, note, reviewedBy) {
  const result = await pool.query(
    `UPDATE merch_slips
        SET status = $2, note = $3, reviewed_by = $4,
            reviewed_at = CASE WHEN $2 = 'pending' THEN NULL ELSE now() END
      WHERE id = $1
      RETURNING id, order_number, status`,
    [id, status, note || null, reviewedBy || null]
  );
  return { updated: result.rowCount > 0, row: result.rows[0] || null };
}

// Stamped once Shopify has actually been told the order is paid, so a second
// click can be recognised as a repeat rather than firing a non-idempotent
// mutation again.
async function markSlipPaid(id) {
  const result = await pool.query(
    `UPDATE merch_slips SET paid_marked_at = now() WHERE id = $1 RETURNING id`,
    [id]
  );
  return { updated: result.rowCount > 0 };
}

// One slip plus its order context — used by the mark-paid route, which needs
// the Shopify GID and the current financial status.
async function getSlipWithOrder(id) {
  const result = await pool.query(
    `SELECT s.*,
            o.customer_name, o.total_price, o.currency AS order_currency,
            o.financial_status, o.shopify_order_id, o.admin_graphql_api_id
       FROM merch_slips s
       LEFT JOIN (
         SELECT DISTINCT ON (order_number)
                order_number, customer_name, total_price, currency,
                financial_status, shopify_order_id, admin_graphql_api_id
           FROM merch_orders
          WHERE order_number IS NOT NULL
          ORDER BY order_number, created_at DESC
       ) o ON o.order_number = s.order_number
      WHERE s.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

// What the buyer is shown on the slip page: how much to transfer, and whether
// we already have a slip from them.
async function getOrderSummary(orderNumber) {
  const order = await findMerchOrder(orderNumber);
  if (!order) return null;
  const slips = await pool.query(
    `SELECT id, status, created_at FROM merch_slips
      WHERE order_number = $1 ORDER BY created_at DESC`,
    [order.order_number]
  );
  return { order, slips: slips.rows };
}

// How many slips this order already has — used to rate-limit re-uploads and to
// tell the buyer their slip is already with us.
async function countSlipsForOrder(orderNumber) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS n FROM merch_slips WHERE order_number = $1`,
    [orderNumber]
  );
  return result.rows[0].n;
}

// Does this order exist, and does the email match? Used to authorise an upload
// when the signed link token is missing or wrong.
async function findMerchOrder(orderNumber) {
  const result = await pool.query(
    `SELECT shopify_order_id, admin_graphql_api_id, order_number, customer_name,
            email, total_price, currency, financial_status
       FROM merch_orders
      WHERE order_number = $1 OR order_number = $2
      ORDER BY created_at DESC
      LIMIT 1`,
    [orderNumber, '#' + String(orderNumber).replace(/^#/, '')]
  );
  return result.rows[0] || null;
}

// All subscribers, oldest first — used by the CSV export.
async function listSubscribers() {
  const result = await pool.query(
    `SELECT id, email, consent, source, created_at
     FROM subscribers
     ORDER BY created_at ASC`
  );
  return result.rows;
}

module.exports = {
  pool,
  ensureSchema,
  insertSubscriber,
  listSubscribers,
  ensureMerchSchema,
  insertMerchOrder,
  listMerchOrders,
  ensureSlipSchema,
  insertSlip,
  insertPreOrderSlip,
  findSlipByUuid,
  attachSlipToOrder,
  listSlips,
  countSlips,
  getSlip,
  getSlipWithOrder,
  setSlipStatus,
  markSlipPaid,
  countSlipsForOrder,
  findMerchOrder,
  getOrderSummary,
};
