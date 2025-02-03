import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from './cors.ts';
import { NylasWebhookPayload } from './types.ts';
import { processEventData } from './event-utils.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function handleWebhookType(webhookData: NylasWebhookPayload, grantId: string, requestId: string) {
  console.log(`🎯 [${requestId}] Processing webhook type: ${webhookData.type}`);

  try {
    const eventGrant = webhookData.data?.object?.grant_id;
    const effectiveGrantId = grantId || eventGrant;

    console.log(`📝 [${requestId}] Using grant ID:`, effectiveGrantId);

    switch (webhookData.type) {
      case 'event.created':
      case 'event.updated': {
        console.log(`📝 [${requestId}] Processing event ${webhookData.type}:`, webhookData.data.object.id);
        const eventData = webhookData.data.object;
        
        // Find user associated with this grant
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('nylas_grant_id', effectiveGrantId)
          .maybeSingle();

        if (profileError) {
          console.error(`❌ [${requestId}] Error finding profile for grant:`, profileError);
          return { success: false, message: profileError.message };
        }

        if (!profile) {
          console.error(`❌ [${requestId}] No profile found for grant: ${effectiveGrantId}`);
          return { success: false, message: `No profile found for grant: ${effectiveGrantId}` };
        }

        // Process the event data
        const result = await processEventData(eventData, profile.id, requestId);

        if (!result.success) {
          console.error(`❌ [${requestId}] Error processing event:`, result.message);
          return { success: false, message: result.message };
        }

        console.log(`✅ [${requestId}] Successfully processed event:`, result);
        return { success: true, message: 'Event processed successfully' };
      }

      case 'event.deleted': {
        console.log(`📝 [${requestId}] Processing event deleted:`, webhookData.data.object.id);
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('nylas_grant_id', effectiveGrantId)
          .maybeSingle();

        if (profileError) {
          console.error(`❌ [${requestId}] Error finding profile:`, profileError);
          return { success: false, message: profileError.message };
        }

        if (!profile) {
          console.error(`❌ [${requestId}] No profile found for grant: ${effectiveGrantId}`);
          return { success: false, message: 'Profile not found' };
        }

        const { error: eventError } = await supabase
          .from('events')
          .delete()
          .eq('nylas_event_id', webhookData.data.object.id)
          .eq('user_id', profile.id);

        if (eventError) {
          console.error(`❌ [${requestId}] Error deleting event:`, eventError);
          return { success: false, message: eventError.message };
        }

        console.log(`✅ [${requestId}] Successfully deleted event`);
        return { success: true, message: 'Event deleted' };
      }

      // Handle other webhook types as needed
      case 'grant.created':
      case 'grant.updated':
      case 'grant.deleted':
      case 'grant.expired':
      case 'notetaker.media_updated':
      case 'notetaker.status_updated':
        console.warn(`⚠️ [${requestId}] Unhandled webhook type:`, webhookData.type);
        return { success: false, message: `Unhandled webhook type: ${webhookData.type}` };
    }
  } catch (error) {
    console.error(`❌ [${requestId}] Error processing webhook:`, error);
    return { success: false, message: error.message };
  }
}
