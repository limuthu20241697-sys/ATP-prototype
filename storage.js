// Cloudflare R2 storage for payment slips.
//
// Slips are financial documents and must never be publicly reachable. Two
// constraints rule out writing them to disk:
//   1. Railway's filesystem is ephemeral — local files vanish on every deploy.
//   2. server.js serves the whole project root via express.static(__dirname),
//      so anything written inside the repo is downloadable by URL guess.
//
// R2 is S3-compatible, so the standard AWS SDK works. Egress is free and the
// 10 GB free tier covers this use case many times over.

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const BUCKET = process.env.R2_BUCKET || 'anjunadeep-slips';

// Built lazily so the site still boots (and serves statically) when R2 isn't
// configured — same fail-soft posture as db.js. isConfigured() gates the routes.
let client = null;

function isConfigured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY
  );
}

function s3() {
  if (client) return client;
  if (!isConfigured()) throw new Error('R2 is not configured');
  client = new S3Client({
    // R2 ignores the region but the SDK requires one; "auto" is what
    // Cloudflare documents for S3-compatible clients.
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

// Store a slip. `key` is caller-generated and includes a random component so
// object names can't be guessed even if the bucket were ever exposed.
async function putSlip(key, buffer, contentType) {
  await s3().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return key;
}

// Short-lived read URL for the admin review page. R2 caps presigned URLs at
// 7 days; we want minutes, not days — these point at financial documents.
async function signedSlipUrl(key, expiresIn = 900) {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
    expiresIn,
  });
}

async function deleteSlip(key) {
  await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

module.exports = { isConfigured, putSlip, signedSlipUrl, deleteSlip, BUCKET };
