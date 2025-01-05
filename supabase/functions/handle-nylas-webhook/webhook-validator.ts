export const validateWebhook = async (rawBody: string, signature: string | null) => {
  const requestId = crypto.randomUUID();
  console.log(`🔐 [${requestId}] Starting webhook validation`);
  console.log(`📦 [${requestId}] Raw body:`, rawBody);
  console.log(`🔑 [${requestId}] Signature:`, signature);

  // Temporarily return true for all requests
  return { isValid: true };
};