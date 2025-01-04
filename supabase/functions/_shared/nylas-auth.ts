import { HmacSha256 } from "https://deno.land/std@0.177.0/hash/hmac_sha256.ts";

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const verifyNylasWebhook = (req: Request, rawBody: string): boolean => {
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
    const hmac = new HmacSha256(key);
    hmac.update(message);
    const computedSignature = hmac.hex();

    // Compare signatures
    const isValid = signature === computedSignature;
    if (!isValid) {
      console.error('Signature mismatch:', {
        received: signature,
        computed: computedSignature
      });
    }
    return isValid;
  } catch (error) {
    console.error('Error verifying webhook:', error);
    return false;
  }
};