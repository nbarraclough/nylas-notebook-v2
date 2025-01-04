export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const verifyNylasWebhook = async (req: Request, rawBody: string): Promise<boolean> => {
  try {
    // For challenge requests, bypass signature verification
    const url = new URL(req.url);
    if (url.searchParams.get('challenge')) {
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

    // Create HMAC using client secret
    const key = new TextEncoder().encode(clientSecret);
    const message = new TextEncoder().encode(rawBody);

    // Import key for HMAC
    const hmacKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    // Generate signature
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      hmacKey,
      message
    );

    // Convert the signature to hex string
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Compare signatures
    const isValid = signature === computedSignature;
    if (!isValid) {
      console.error('Signature mismatch:', {
        received: signature,
        computed: computedSignature,
        rawBody: rawBody.slice(0, 100) + '...' // Log first 100 chars of body for debugging
      });
    }
    return isValid;

  } catch (error) {
    console.error('Error verifying webhook:', error);
    return false;
  }
};