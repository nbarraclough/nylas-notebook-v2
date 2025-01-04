import { createHmac } from "crypto";

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, X-Nylas-Signature',
};

export const verifyNylasWebhook = (request: Request, rawBody: string): boolean => {
  const nylasSignature = request.headers.get('X-Nylas-Signature');
  if (!nylasSignature) {
    console.error('No Nylas signature found in request headers');
    return false;
  }

  const clientSecret = Deno.env.get('NYLAS_CLIENT_SECRET');
  if (!clientSecret) {
    console.error('NYLAS_CLIENT_SECRET not found in environment');
    return false;
  }

  const hmac = createHmac('sha256', clientSecret);
  hmac.update(rawBody);
  const computedSignature = hmac.digest('hex');

  return computedSignature === nylasSignature;
};