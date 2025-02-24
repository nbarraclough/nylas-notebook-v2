
export const verifyWebhookSignature = async (signature: string, body: string) => {
  const webhookSecret = Deno.env.get('NYLAS_WEBHOOK_SECRET');
  
  if (!webhookSecret) {
    console.error('NYLAS_WEBHOOK_SECRET not configured');
    return false;
  }

  if (!signature) {
    console.error('No signature in webhook request');
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const actualSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      hexToUint8Array(signature),
      encoder.encode(body)
    );

    return actualSignature;
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
