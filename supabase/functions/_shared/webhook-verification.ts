
export const verifyWebhookSignature = async (signature: string, body: string) => {
  const webhookSecret = Deno.env.get('NYLAS_WEBHOOK_SECRET');
  
  if (!webhookSecret) {
    console.error('NYLAS_WEBHOOK_SECRET not configured');
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
      ["sign"] // Changed from "verify" to "sign" - we're generating our own signature
    );

    // Generate our HMAC signature
    const hmacBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(body)
    );

    // Convert our signature to hex string to match Nylas's format
    const calculatedSignature = Array.from(new Uint8Array(hmacBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    console.log('Calculated signature:', calculatedSignature);
    console.log('Received signature:', signature);

    // Constant-time comparison of the signatures to prevent timing attacks
    // Note: This is more secure than using a simple equality check
    if (calculatedSignature.length !== signature.length) {
      console.error('Signature length mismatch');
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < calculatedSignature.length; i++) {
      result |= calculatedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    
    const isValid = result === 0;
    console.log('Signature validation result:', isValid);
    
    return isValid;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
};

// Helper function to convert hex string to Uint8Array
const hexToUint8Array = (hexString: string) => {
  const pairs = hexString.match(/[\dA-F]{2}/gi) || [];
  return new Uint8Array(
    pairs.map(s => parseInt(s, 16))
  );
};
