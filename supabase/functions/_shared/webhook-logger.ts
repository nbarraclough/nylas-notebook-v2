export const logWebhookRequest = (req: Request) => {
  console.log('🔔 Webhook received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });
};

export const logWebhookBody = (body: string) => {
  console.log('📥 Raw webhook body:', body);
  
  try {
    const parsedBody = JSON.parse(body);
    console.log('📦 Parsed webhook data:', JSON.stringify(parsedBody, null, 2));
    console.log('📋 Webhook type:', parsedBody.type);
    return parsedBody;
  } catch (error) {
    console.error('❌ Error parsing webhook JSON:', error);
    return null;
  }
};

export const logSignatureVerification = (isValid: boolean) => {
  console.log('🔐 Signature verification:', isValid ? 'valid' : 'invalid');
};