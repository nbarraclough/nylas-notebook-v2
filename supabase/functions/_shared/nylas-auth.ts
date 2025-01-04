export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Simplified verification that only checks for challenge requests
export const verifyNylasWebhook = async (req: Request): Promise<{ isValid: boolean; challenge?: string }> => {
  try {
    const url = new URL(req.url);
    const challenge = url.searchParams.get('challenge');
    
    // If this is a challenge request, consider it valid and return the challenge
    if (challenge) {
      console.log('Challenge request detected:', challenge);
      return { isValid: true, challenge };
    }

    // For non-challenge requests, do basic validation
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.error('Invalid content type:', contentType);
      return { isValid: false };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error in webhook verification:', error);
    return { isValid: false };
  }
};