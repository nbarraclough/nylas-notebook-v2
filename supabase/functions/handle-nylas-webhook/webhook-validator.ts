import { logSignatureVerification } from '../_shared/webhook-logger.ts';
import { verifyWebhookSignature } from '../_shared/webhook-verification.ts';

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

  // Verify signature and log result
  const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
  logSignatureVerification(isValid);

  if (!isValid) {
    console.error('❌ Invalid webhook signature');
    throw new Error('Invalid webhook signature');
  }

  return { rawBody, isValid };
};