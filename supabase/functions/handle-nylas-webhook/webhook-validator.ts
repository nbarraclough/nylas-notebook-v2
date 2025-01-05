import { logSignatureVerification } from '../_shared/webhook-logger.ts';

export const validateWebhook = async (req: Request, rawBody: string) => {
  // Get and validate webhook secret
  const webhookSecret = Deno.env.get('NYLAS_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('❌ NYLAS_WEBHOOK_SECRET not configured');
    throw new Error('NYLAS_WEBHOOK_SECRET not configured');
  }

  // Get and validate signature
  const signature = req.headers.get('x-nylas-signature') || req.headers.get('X-Nylas-Signature');
  if (!signature) {
    console.error('❌ No signature in webhook request');
    throw new Error('No signature in webhook request');
  }

  // Create HMAC using webhook secret
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Generate signature from raw body
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(rawBody)
  );

  // Convert to hex string
  const calculatedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Compare signatures
  const isValid = calculatedSignature === signature;
  logSignatureVerification(isValid);

  if (!isValid) {
    console.error('❌ Invalid webhook signature');
    console.log('Expected:', signature);
    console.log('Calculated:', calculatedSignature);
    throw new Error('Invalid webhook signature');
  }

  return { rawBody, isValid };
};