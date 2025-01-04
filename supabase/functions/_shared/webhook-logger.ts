export const logWebhookRequest = (req: Request) => {
  const timestamp = new Date().toISOString();
  console.log(`🔔 [${timestamp}] Webhook received:`, {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });
};

export const logWebhookBody = (body: string) => {
  const timestamp = new Date().toISOString();
  console.log(`📥 [${timestamp}] Raw webhook body:`, body);
  
  try {
    const parsedBody = JSON.parse(body);
    console.log('📦 Parsed webhook data:', JSON.stringify(parsedBody, null, 2));
    console.log('📋 Webhook type:', parsedBody.type);
    console.log('🆔 Grant ID:', parsedBody.data?.object?.grant_id);
    
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
    console.error(`❌ [${timestamp}] Error parsing webhook JSON:`, error);
    return null;
  }
};

export const logSignatureVerification = (isValid: boolean) => {
  const timestamp = new Date().toISOString();
  console.log(`🔐 [${timestamp}] Signature verification:`, isValid ? 'valid' : 'invalid');
};

export const logWebhookProcessing = (type: string, result: any) => {
  const timestamp = new Date().toISOString();
  console.log(`✨ [${timestamp}] Processing ${type}:`, JSON.stringify(result, null, 2));
};

export const logWebhookError = (type: string, error: any) => {
  const timestamp = new Date().toISOString();
  console.error(`❌ [${timestamp}] Error processing ${type}:`, {
    message: error.message,
    stack: error.stack,
    details: error
  });
};

export const logWebhookSuccess = (type: string, data: any) => {
  const timestamp = new Date().toISOString();
  console.log(`✅ [${timestamp}] Successfully processed ${type}:`, JSON.stringify(data, null, 2));
};