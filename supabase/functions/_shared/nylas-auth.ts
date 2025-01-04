import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, X-Nylas-Signature',
};

export const verifyNylasWebhook = (request: Request, rawBody: string): boolean => {
  const nylasSignature = request.headers.get('X-Nylas-Signature');
  if (!nylasSignature) {
    console.error('No Nylas signature found in request headers');
    return false;
  }

  const clientSecret = Deno.env.get('NYLAS_CLIENT_SECRET');
  if (!clientSecret) {
    console.error('NYLAS_CLIENT_SECRET not found in environment');
    return false;
  }

  const encoder = new TextEncoder();
  const key = encoder.encode(clientSecret);
  const message = encoder.encode(rawBody);
  
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    hmacKey,
    message
  );

  const computedSignature = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computedSignature === nylasSignature;
};