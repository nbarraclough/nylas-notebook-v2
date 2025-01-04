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
    
    // Log specific event data if present
    if (parsedBody.data?.object) {
      const eventData = parsedBody.data.object;
      if (eventData.participants) {
        console.log('👥 Event participants:', JSON.stringify(eventData.participants, null, 2));
      }
      if (eventData.organizer) {
        console.log('👤 Event organizer:', JSON.stringify(eventData.organizer, null, 2));
      }
      if (eventData.when) {
        console.log('🕒 Event timing:', JSON.stringify(eventData.when, null, 2));
      }
      if (eventData.conferencing) {
        console.log('🎥 Event conferencing:', JSON.stringify(eventData.conferencing, null, 2));
      }
    }
    
    return parsedBody;
  } catch (error) {
    console.error('❌ Error parsing webhook JSON:', error);
    return null;
  }
};

export const logSignatureVerification = (isValid: boolean) => {
  console.log('🔐 Signature verification:', isValid ? 'valid' : 'invalid');
};