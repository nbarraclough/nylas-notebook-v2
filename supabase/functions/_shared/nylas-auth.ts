export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export const verifyNylasWebhook = async (req: Request, rawBody: string): Promise<boolean> => {
  try {
    // For challenge requests, bypass signature verification
    const url = new URL(req.url);
    if (url.searchParams.get('challenge')) {
      console.log('Challenge request detected, bypassing signature verification');
      return true;
    }

    const clientSecret = Deno.env.get('NYLAS_CLIENT_SECRET');
    if (!clientSecret) {
      console.error('NYLAS_CLIENT_SECRET not configured');
      return false;
    }

    const signature = req.headers.get('x-nylas-signature');
    if (!signature) {
      console.error('No Nylas signature found in headers');
      return false;
    }

    // Log headers and body for debugging
    console.log('Headers:', Object.fromEntries(req.headers.entries()));
    console.log('Raw body (first 100 chars):', rawBody.slice(0, 100));

    // Create HMAC using client secret
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(clientSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Generate signature
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(rawBody)
    );

    // Convert the signature to hex string
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    console.log('Computed signature:', computedSignature);
    console.log('Received signature:', signature);

    return signature === computedSignature;

  } catch (error) {
    console.error('Error verifying webhook:', error);
    return false;
  }
};