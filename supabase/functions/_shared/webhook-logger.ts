export const logWebhookRequest = (req: Request) => {
  console.log('🔔 Webhook received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });
};

export const logRawBody = (body: string) => {
  console.log('📦 Raw webhook body:', body);
};

export const logParsedWebhook = (data: any) => {
  console.log('🔍 Parsed webhook data:', {
    type: data.type,
    grantId: data.data?.object?.grant_id,
    data: data
  });
};

export const logWebhookError = (stage: string, error: any) => {
  console.error(`❌ Error in ${stage}:`, {
    message: error.message,
    stack: error.stack
  });
};

export const logWebhookSuccess = (type: string) => {
  console.log(`✅ Successfully processed ${type} webhook`);
};