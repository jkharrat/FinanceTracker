import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushPayload {
  family_id: string;
  sender_token?: string | null;
  notification: { title: string; message: string };
}

interface WebPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
): Promise<void> {
  if (tokens.length === 0) return;

  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    title,
    body,
  }));

  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
}

function base64UrlToBase64(base64url: string): string {
  return base64url.replace(/-/g, '+').replace(/_/g, '/');
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

async function importVapidKeys(
  publicKeyB64: string,
  privateKeyB64: string,
): Promise<{ publicKey: Uint8Array; privateKey: CryptoKey }> {
  const publicKeyBytes = base64UrlDecode(publicKeyB64);
  const privateKeyBytes = base64UrlDecode(privateKeyB64);

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  return { publicKey: publicKeyBytes, privateKey };
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createVapidAuthHeader(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: CryptoKey,
): Promise<{ authorization: string; cryptoKeyHeader: string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const expiry = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp: expiry, sub: 'mailto:push@financetracker.app' };

  const encodedHeader = arrayBufferToBase64Url(
    new TextEncoder().encode(JSON.stringify(header)),
  );
  const encodedPayload = arrayBufferToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    vapidPrivateKey,
    new TextEncoder().encode(unsignedToken),
  );

  const jwt = `${unsignedToken}.${arrayBufferToBase64Url(signature)}`;

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    cryptoKeyHeader: `p256ecdsa=${vapidPublicKey}`,
  };
}

async function sendWebPush(
  subscriptions: string[],
  title: string,
  body: string,
): Promise<void> {
  if (subscriptions.length === 0) return;

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKeyB64 = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!vapidPublicKey || !vapidPrivateKeyB64) {
    console.error('Missing VAPID keys');
    return;
  }

  const { privateKey } = await importVapidKeys(vapidPublicKey, vapidPrivateKeyB64);

  const payload = JSON.stringify({ title, body, icon: '/assets/icon.png' });

  for (const subJson of subscriptions) {
    try {
      const sub: WebPushSubscription = JSON.parse(subJson);

      const { authorization, cryptoKeyHeader } = await createVapidAuthHeader(
        sub.endpoint,
        vapidPublicKey,
        privateKey,
      );

      await fetch(sub.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'aes128gcm',
          Authorization: authorization,
          'Crypto-Key': cryptoKeyHeader,
          TTL: '86400',
          Urgency: 'high',
        },
        body: new TextEncoder().encode(payload),
      });
    } catch (error) {
      console.error('Failed to send web push to subscription:', error);
    }
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { family_id, sender_token, notification } = (await req.json()) as PushPayload;

    if (!family_id || !notification?.title) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const mobileTokens = tokens
      .filter((t) => t.platform === 'ios' || t.platform === 'android')
      .map((t) => t.token);
    const webSubscriptions = tokens
      .filter((t) => t.platform === 'web')
      .map((t) => t.token);

    await Promise.allSettled([
      sendExpoPush(mobileTokens, notification.title, notification.message),
      sendWebPush(webSubscriptions, notification.title, notification.message),
    ]);

    return new Response(
      JSON.stringify({ sent: mobileTokens.length + webSubscriptions.length }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
