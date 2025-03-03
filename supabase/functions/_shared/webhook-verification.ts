
export interface VerificationResult {
  isValid: boolean;
  error?: 'no_secret' | 'no_signature' | 'length_mismatch' | 'verification_failed' | 'processing_error';
  details?: string;
}

export const verifyWebhookSignature = async (signature: string, body: string, requestId?: string): Promise<VerificationResult> => {
  const logPrefix = requestId ? `[${requestId}]` : '';
  
  // Check for both production and development webhook secrets
  const webhookSecret = Deno.env.get('NYLAS_WEBHOOK_SECRET') || Deno.env.get('NYLAS_PROD_WEBHOOK_SECRET');
  
  // Log which webhook secret we're attempting to use (truncated for security)
  const secretSource = Deno.env.get('NYLAS_WEBHOOK_SECRET') ? 'NYLAS_WEBHOOK_SECRET' : 
                       Deno.env.get('NYLAS_PROD_WEBHOOK_SECRET') ? 'NYLAS_PROD_WEBHOOK_SECRET' : 'NONE';
  
  console.log(`${logPrefix} Using webhook secret from: ${secretSource}`);
  
  if (!webhookSecret) {
    console.error(`${logPrefix} CRITICAL ERROR: No webhook secret configured! Set NYLAS_WEBHOOK_SECRET or NYLAS_PROD_WEBHOOK_SECRET`);
    return {
      isValid: false,
      error: 'no_secret',
      details: 'No webhook secret configured. Set NYLAS_WEBHOOK_SECRET or NYLAS_PROD_WEBHOOK_SECRET'
    };
  }

  // Check for signature
  if (!signature) {
    console.error(`${logPrefix} No signature in webhook request`);
    return {
      isValid: false,
      error: 'no_signature',
      details: 'No signature provided in webhook request'
    };
  }

  // Basic signature format validation
  const hexRegex = /^[0-9a-fA-F]+$/;
  if (!hexRegex.test(signature)) {
    console.error(`${logPrefix} Invalid signature format: ${signature.substring(0, 8)}...`);
    return {
      isValid: false,
      error: 'verification_failed',
      details: 'Signature is not a valid hex string'
    };
  }

  try {
    // Generate our own HMAC signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Generate our HMAC signature
    const hmacBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(body)
    );

    // Convert our signature to lowercase hex string
    const calculatedSignature = Array.from(new Uint8Array(hmacBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Convert received signature to lowercase for comparison
    const receivedSignature = signature.toLowerCase();
    
    // Log portions of signatures for debugging (not full for security)
    console.log(`${logPrefix} Calculated signature prefix: ${calculatedSignature.substring(0, 8)}...`);
    console.log(`${logPrefix} Received signature prefix: ${receivedSignature.substring(0, 8)}...`);

    // Constant-time comparison of the signatures to prevent timing attacks
    if (calculatedSignature.length !== receivedSignature.length) {
      console.error(`${logPrefix} Signature length mismatch: expected ${calculatedSignature.length}, got ${receivedSignature.length}`);
      return {
        isValid: false,
        error: 'length_mismatch',
        details: `Signature length mismatch: expected ${calculatedSignature.length}, got ${receivedSignature.length}`
      };
    }
    
    let result = 0;
    for (let i = 0; i < calculatedSignature.length; i++) {
      result |= calculatedSignature.charCodeAt(i) ^ receivedSignature.charCodeAt(i);
    }
    
    const isValid = result === 0;
    console.log(`${logPrefix} Signature validation result: ${isValid ? 'valid' : 'invalid'}`);
    
    return { 
      isValid,
      ...(isValid ? {} : {
        error: 'verification_failed',
        details: 'Signatures do not match'
      })
    };
  } catch (error) {
    console.error(`${logPrefix} Error verifying webhook signature:`, error);
    return {
      isValid: false,
      error: 'processing_error',
      details: error instanceof Error ? error.message : 'Unknown error during verification'
    };
  }
};
