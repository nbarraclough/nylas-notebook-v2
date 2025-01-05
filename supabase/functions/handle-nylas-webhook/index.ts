import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { validateWebhook } from './webhook-validator.ts'
import { 
  handleEventCreated, 
  handleEventUpdated, 
  handleEventDeleted,
  handleGrantCreated,
  handleGrantUpdated,
  handleGrantDeleted,
  handleGrantExpired
} from '../_shared/webhook-handlers.ts'

serve(async (req) => {
  const startTime = performance.now();
  console.log(`⚡ Webhook handler started at ${new Date().toISOString()}`);

  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Handle challenge parameter in URL
    const url = new URL(req.url);
    const challenge = url.searchParams.get('challenge');
    if (challenge) {
      console.log('🎯 Challenge received:', challenge);
      return new Response(challenge, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    // Get signature and body
    const signature = req.headers.get('x-nylas-signature');
    const rawBody = await req.text();
    
    // Validate webhook immediately
    const { isValid } = await validateWebhook(rawBody, signature);
    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return new Response('Invalid signature', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    // Parse webhook data after validation
    const webhookData = JSON.parse(rawBody);
    console.log('📥 Received webhook:', {
      type: webhookData.type,
      timestamp: new Date().toISOString()
    });

    const grantId = webhookData.data.object.grant_id;
    
    // Process webhook based on type
    let processingResult;
    switch (webhookData.type) {
      case 'event.created':
        processingResult = await handleEventCreated(webhookData.data.object, grantId);
        break;
      case 'event.updated':
        processingResult = await handleEventUpdated(webhookData.data.object, grantId);
        break;
      case 'event.deleted':
        processingResult = await handleEventDeleted(webhookData.data.object, grantId);
        break;
      case 'grant.created':
        processingResult = await handleGrantCreated(webhookData.data);
        break;
      case 'grant.updated':
        processingResult = await handleGrantUpdated(webhookData.data);
        break;
      case 'grant.deleted':
        processingResult = await handleGrantDeleted(webhookData.data);
        break;
      case 'grant.expired':
        processingResult = await handleGrantExpired(webhookData.data);
        break;
      default:
        return new Response(
          JSON.stringify({
            success: false,
            message: `Unhandled webhook type: ${webhookData.type}`,
            status: 'acknowledged'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

    const endTime = performance.now();
    console.log(`✅ Webhook processed in ${endTime - startTime}ms:`, {
      type: webhookData.type,
      result: processingResult
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${webhookData.type} webhook`,
        result: processingResult,
        status: 'acknowledged'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Webhook error:', {
      error: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
        status: 'acknowledged'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})