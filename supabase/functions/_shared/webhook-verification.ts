
export const verifyWebhookSignature = async (signature: string, body: string) => {
  // Check for both production and development webhook secrets
  const webhookSecret = Deno.env.get('NYLAS_WEBHOOK_SECRET') || Deno.env.get('NYLAS_PROD_WEBHOOK_SECRET');
  
  if (!webhookSecret) {
    console.error('CRITICAL ERROR: No webhook secret configured! Set NYLAS_WEBHOOK_SECRET or NYLAS_PROD_WEBHOOK_SECRET');
    return false;
  }

  // Check for both lowercase and uppercase header variations
  if (!signature) {
    console.error('No signature in webhook request');
    return false;
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
    console.log(`Calculated signature prefix: ${calculatedSignature.substring(0, 8)}...`);
    console.log(`Received signature prefix: ${receivedSignature.substring(0, 8)}...`);

    // Constant-time comparison of the signatures to prevent timing attacks
    if (calculatedSignature.length !== receivedSignature.length) {
      console.error('Signature length mismatch');
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < calculatedSignature.length; i++) {
      result |= calculatedSignature.charCodeAt(i) ^ receivedSignature.charCodeAt(i);
    }
    
    const isValid = result === 0;
    console.log('Signature validation result:', isValid);
    
    return isValid;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
};
