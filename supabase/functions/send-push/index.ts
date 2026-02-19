import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const PUSH_FETCH_TIMEOUT_MS = 10_000;
const FUNCTION_VERSION = '2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  family_id: string;
  sender_token?: string | null;
  notification: { title: string; message: string };
}

interface WebPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// ---------------------------------------------------------------------------
// Encoding helpers
// ---------------------------------------------------------------------------

function base64UrlToBase64(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad === 2) base64 += '==';
  else if (pad === 3) base64 += '=';
  return base64;
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = base64UrlToBase64(str);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toBase64Url(data: Uint8Array | ArrayBuffer): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// ---------------------------------------------------------------------------
// HKDF using Web Crypto
// ---------------------------------------------------------------------------

async function hkdfDerive(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, [
    'deriveBits',
  ]);
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info },
      key,
      length * 8,
    ),
  );
}

// ---------------------------------------------------------------------------
// Web Push payload encryption (RFC 8291 – aes128gcm)
// ---------------------------------------------------------------------------

async function encryptWebPushPayload(
  plaintext: Uint8Array,
  clientPublicKeyBytes: Uint8Array,
  authSecretBytes: Uint8Array,
): Promise<Uint8Array> {
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', localKeyPair.publicKey),
  );

  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientKey },
      localKeyPair.privateKey,
      256,
    ),
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info\0" || ua_public || as_public, 32)
  const ikmInfo = concatBytes(
    new TextEncoder().encode('WebPush: info\0'),
    clientPublicKeyBytes,
    localPublicKeyRaw,
  );
  const ikm = await hkdfDerive(authSecretBytes, sharedSecret, ikmInfo, 32);

  // CEK = HKDF(salt, ikm, "Content-Encoding: aes128gcm\0", 16)
  const cek = await hkdfDerive(
    salt,
    ikm,
    new TextEncoder().encode('Content-Encoding: aes128gcm\0'),
    16,
  );

  // Nonce = HKDF(salt, ikm, "Content-Encoding: nonce\0", 12)
  const nonce = await hkdfDerive(
    salt,
    ikm,
    new TextEncoder().encode('Content-Encoding: nonce\0'),
    12,
  );

  // Pad: plaintext || 0x02 (single-record delimiter)
  const padded = new Uint8Array(plaintext.length + 1);
  padded.set(plaintext);
  padded[plaintext.length] = 2;

  const aesKey = await crypto.subtle.importKey(
    'raw',
    cek,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  );
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded),
  );

  // aes128gcm header: salt(16) | rs(4 big-endian) | idlen(1) | keyid(65)
  const header = new Uint8Array(86);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = localPublicKeyRaw.length;
  header.set(localPublicKeyRaw, 21);

  return concatBytes(header, ciphertext);
}

// ---------------------------------------------------------------------------
// VAPID helpers
// ---------------------------------------------------------------------------

async function importVapidKeys(
  publicKeyB64: string,
  privateKeyB64: string,
): Promise<{ publicKey: Uint8Array; privateKey: CryptoKey }> {
  const publicKeyBytes = base64UrlDecode(publicKeyB64);
  const privateKeyBytes = base64UrlDecode(privateKeyB64);

  let privateKey: CryptoKey;

  if (privateKeyBytes.length <= 33) {
    // Raw 32-byte key (common output from web-push generate-vapid-keys)
    const x = toBase64Url(publicKeyBytes.slice(1, 33));
    const y = toBase64Url(publicKeyBytes.slice(33, 65));
    const d = toBase64Url(privateKeyBytes);
    privateKey = await crypto.subtle.importKey(
      'jwk',
      { kty: 'EC', crv: 'P-256', x, y, d },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    );
  } else {
    // PKCS8 DER format
    privateKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBytes,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    );
  }

  return { publicKey: publicKeyBytes, privateKey };
}

async function createVapidAuthHeader(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: CryptoKey,
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const expiry = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: expiry,
    sub: 'mailto:push@financetracker.app',
  };

  const encodedHeader = toBase64Url(
    new TextEncoder().encode(JSON.stringify(header)),
  );
  const encodedPayload = toBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    vapidPrivateKey,
    new TextEncoder().encode(unsignedToken),
  );

  const jwt = `${unsignedToken}.${toBase64Url(signature)}`;
  return `vapid t=${jwt}, k=${vapidPublicKey}`;
}

// ---------------------------------------------------------------------------
// Expo (mobile) push
// ---------------------------------------------------------------------------

async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  adminClient: ReturnType<typeof createClient>,
): Promise<number> {
  if (tokens.length === 0) return 0;

  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    title,
    body,
  }));

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), PUSH_FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
      signal: controller.signal,
    });

    if (!resp.ok) {
      console.error(`Expo push API returned ${resp.status}`);
      return 0;
    }

    const result = await resp.json();
    const tickets: Array<{ status: string; details?: { error?: string } }> =
      result?.data ?? [];

    let sent = 0;
    const staleTokens: string[] = [];

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket.status === 'ok') {
        sent++;
      } else {
        const errorType = ticket.details?.error;
        if (errorType === 'DeviceNotRegistered' || errorType === 'InvalidCredentials') {
          staleTokens.push(tokens[i]);
        }
        console.warn(`Expo push failed for token ${i}: ${errorType ?? 'unknown'}`);
      }
    }

    if (staleTokens.length > 0) {
      console.log(`Removing ${staleTokens.length} stale mobile push token(s)`);
      await adminClient
        .from('push_tokens')
        .delete()
        .in('token', staleTokens);
    }

    return sent;
  } finally {
    clearTimeout(tid);
  }
}

// ---------------------------------------------------------------------------
// Web push (browser)
// ---------------------------------------------------------------------------

async function sendWebPush(
  subscriptions: string[],
  title: string,
  body: string,
  adminClient: ReturnType<typeof createClient>,
): Promise<number> {
  if (subscriptions.length === 0) return 0;

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKeyB64 = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!vapidPublicKey || !vapidPrivateKeyB64) {
    console.error('Missing VAPID keys – skipping web push');
    return 0;
  }

  const { privateKey: vapidPrivateKey } = await importVapidKeys(
    vapidPublicKey,
    vapidPrivateKeyB64,
  );

  const payload = new TextEncoder().encode(
    JSON.stringify({ title, body, icon: '/assets/icon.png' }),
  );

  let sent = 0;

  for (const subJson of subscriptions) {
    try {
      const sub: WebPushSubscription = JSON.parse(subJson);

      const clientPublicKey = base64UrlDecode(sub.keys.p256dh);
      const authSecret = base64UrlDecode(sub.keys.auth);

      const encrypted = await encryptWebPushPayload(
        payload,
        clientPublicKey,
        authSecret,
      );

      const authorization = await createVapidAuthHeader(
        sub.endpoint,
        vapidPublicKey,
        vapidPrivateKey,
      );

      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), PUSH_FETCH_TIMEOUT_MS);
      try {
        const resp = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            Authorization: authorization,
            TTL: '86400',
            Urgency: 'high',
          },
          body: encrypted,
          signal: controller.signal,
        });

        if (resp.ok) {
          sent++;
        } else if (resp.status === 404 || resp.status === 410) {
          console.warn(`Subscription expired (${resp.status}), removing stale token`);
          await adminClient
            .from('push_tokens')
            .delete()
            .eq('token', subJson);
        } else {
          const text = await resp.text().catch(() => '');
          console.error(`Web push endpoint returned ${resp.status}: ${text}`);
        }
      } finally {
        clearTimeout(tid);
      }
    } catch (error) {
      console.error('Failed to send web push to subscription:', error);
    }
  }

  return sent;
}

// ---------------------------------------------------------------------------
// Edge function handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const { family_id, sender_token, notification } =
      (await req.json()) as PushPayload;

    if (!family_id || !notification?.title) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    let query = adminClient
      .from('push_tokens')
      .select('token, platform')
      .eq('family_id', family_id);

    if (sender_token) {
      query = query.neq('token', sender_token);
    }

    const { data: tokens, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const mobileTokens = tokens
      .filter((t) => t.platform === 'ios' || t.platform === 'android')
      .map((t) => t.token);
    const webSubscriptions = tokens
      .filter((t) => t.platform === 'web')
      .map((t) => t.token);

    const [mobileResult, webResult] = await Promise.allSettled([
      sendExpoPush(mobileTokens, notification.title, notification.message, adminClient),
      sendWebPush(webSubscriptions, notification.title, notification.message, adminClient),
    ]);

    const mobileCount = mobileResult.status === 'fulfilled' ? mobileResult.value : 0;
    const webCount = webResult.status === 'fulfilled' ? webResult.value : 0;

    return new Response(
      JSON.stringify({
        sent: mobileCount + webCount,
        mobile: mobileCount,
        mobileTotal: mobileTokens.length,
        web: webCount,
        webTotal: webSubscriptions.length,
      }),
      { headers: { 'Content-Type': 'application/json', ...CORS } },
    );
  } catch (error) {
    console.error('send-push error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
});
