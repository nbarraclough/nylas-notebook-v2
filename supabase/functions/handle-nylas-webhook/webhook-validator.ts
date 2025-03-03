
import { VerificationResult } from "../_shared/webhook-verification.ts";

export interface ValidationResult {
  isValid: boolean;
  webhookData?: any;
  error?: string;
  details?: string;
  status?: number;
}

export const validateWebhook = async (
  rawBody: string, 
  signature: string | null, 
  requestId: string
): Promise<ValidationResult> => {
  console.log(`🔐 [${requestId}] Starting webhook validation`);

  // Get and validate webhook secret
  const webhookSecret = Deno.env.get('NYLAS_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error(`❌ [${requestId}] NYLAS_WEBHOOK_SECRET not configured`);
    return {
      isValid: false,
      error: 'no_secret',
      details: 'NYLAS_WEBHOOK_SECRET not configured',
      status: 500
    };
  }

  // Validate signature presence
  if (!signature) {
    console.error(`❌ [${requestId}] No signature in webhook request`);
    return {
      isValid: false,
      error: 'no_signature',
      details: 'No signature in webhook request',
      status: 400
    };
  }

  try {
    console.log(`🔍 [${requestId}] Validating signature:`, signature);

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
    console.log(`✅ [${requestId}] Webhook signature validation: ${isValid ? 'valid' : 'invalid'}`);
    console.log(`📊 [${requestId}] Signature comparison:`, {
      received: signature,
      calculated: calculatedSignature
    });

    if (!isValid) {
      return {
        isValid: false,
        error: 'verification_failed',
        details: 'Signature verification failed',
        status: 401
      };
    }

    // Parse webhook data
    try {
      const webhookData = JSON.parse(rawBody);
      return { isValid: true, webhookData };
    } catch (parseError) {
      console.error(`❌ [${requestId}] Failed to parse webhook data:`, parseError);
      return {
        isValid: false,
        error: 'invalid_json',
        details: 'Failed to parse webhook JSON data',
        status: 400
      };
    }
  } catch (error) {
    console.error(`❌ [${requestId}] Error validating webhook signature:`, error);
    return {
      isValid: false,
      error: 'processing_error',
      details: error instanceof Error ? error.message : 'Unknown error during verification',
      status: 500
    };
  }
};
