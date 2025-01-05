export const validateWebhook = async (rawBody: string, signature: string | null) => {
  const requestId = crypto.randomUUID();
  console.log(`🔐 [${requestId}] Starting webhook validation`);

  // Get and validate webhook secret
  const webhookSecret = Deno.env.get('NYLAS_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error(`❌ [${requestId}] NYLAS_WEBHOOK_SECRET not configured`);
    throw new Error('NYLAS_WEBHOOK_SECRET not configured');
  }

  // Validate signature presence
  if (!signature) {
    console.error(`❌ [${requestId}] No signature in webhook request`);
    throw new Error('No signature in webhook request');
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

    return { isValid };
  } catch (error) {
    console.error(`❌ [${requestId}] Error validating webhook signature:`, error);
    return { isValid: false };
  }
};