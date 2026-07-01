// Ender Launcher — Supporter Worker
// Handles three routes:
//   GET  /release     → proxies GitHub latest release (tag + exe URL), edge-cached 5 min
//   GET  /supporters  → returns supporters list from KV (used by the marketing site)
//   POST /webhook     → validates Stripe webhook signature, stores new supporter in KV
//
// Required Worker secrets (set via `wrangler secret put`):
//   STRIPE_WEBHOOK_SECRET  — from Stripe Dashboard → Webhooks → your endpoint → Signing secret
//
// Required KV namespace binding: SUPPORTERS (see wrangler.toml)
//
// Stripe setup:
//   1. Create a Payment Link (or one per tier) in Stripe Dashboard.
//   2. Under the Payment Link → Metadata, add key "tier" with the tier name
//      (e.g. "Supporter", "Backer", "Legend"). This tells the Worker which tier to assign.
//   3. In Stripe Dashboard → Webhooks, add an endpoint pointing at:
//      https://<your-worker>.workers.dev/webhook
//      and select the event: checkout.session.completed
//   4. Copy the signing secret and run: wrangler secret put STRIPE_WEBHOOK_SECRET

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
};

const MAX_SUPPORTERS = 200;

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (pathname === '/release' && request.method === 'GET') {
      return handleRelease();
    }

    if (pathname === '/supporters' && request.method === 'GET') {
      return handleGet(env);
    }

    if (pathname === '/webhook' && request.method === 'POST') {
      return handleWebhook(request, env);
    }

    return new Response('Not found', { status: 404 });
  },
};

async function handleRelease() {
  const GH_URL = 'https://api.github.com/repos/Sxarlos/EnderClient/releases/latest';
  const CACHE_TTL = 300; // 5 minutes
  const cache = caches.default;
  const cacheKey = new Request(GH_URL);

  const cached = await cache.match(cacheKey);
  if (cached) {
    return new Response(await cached.text(), {
      headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_TTL}` },
    });
  }

  const res = await fetch(GH_URL, {
    headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'EnderLauncher-Site/1.0' },
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'upstream' }), {
      status: 502,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const data = await res.json();
  const tag = (data.tag_name || '').trim();
  const exe = ((data.assets || []).find(a => /\.exe$/i.test(a.name || '')) || {}).browser_download_url || '';
  const payload = JSON.stringify({ tag, exe });

  await cache.put(cacheKey, new Response(payload, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_TTL}` },
  }));

  return new Response(payload, {
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_TTL}` },
  });
}

async function handleGet(env) {
  const raw = await env.supporters.get('list');
  return new Response(raw || '[]', {
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' },
  });
}

async function handleWebhook(request, env) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature') || '';

  if (!env.STRIPE_WEBHOOK_SECRET) {
    return new Response('Worker not configured', { status: 500 });
  }

  const valid = await verifyStripeSignature(body, sig, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    return new Response('Unauthorized', { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object ?? {};
    const name = (session.customer_details?.name || 'Anonymous').trim().slice(0, 64);
    const tier = ((session.metadata?.tier) || 'Supporter').trim().slice(0, 32);

    const existing = JSON.parse((await env.supporters.get('list')) || '[]');
    existing.unshift({ name, tier, joinedAt: new Date().toISOString() });
    if (existing.length > MAX_SUPPORTERS) existing.splice(MAX_SUPPORTERS);
    await env.supporters.put('list', JSON.stringify(existing));
  }

  return new Response('OK', { status: 200, headers: CORS });
}

async function verifyStripeSignature(payload, signature, secret) {
  if (!signature || !secret) return false;

  const parts = {};
  for (const part of signature.split(',')) {
    const eq = part.indexOf('=');
    if (eq > 0) parts[part.slice(0, eq)] = part.slice(eq + 1);
  }

  const timestamp = parts['t'];
  const expectedSig = parts['v1'];
  if (!timestamp || !expectedSig) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sigBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${payload}`));
  const computed = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (computed.length !== expectedSig.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  return diff === 0;
}
