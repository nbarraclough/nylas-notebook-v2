import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { MessageOpenedWebhook, MessageLinkClickedWebhook } from '../../../src/integrations/supabase/types/webhook-types/message.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

export async function handleMessageOpened(webhookData: MessageOpenedWebhook) {
  const messageId = webhookData.data.object.message_id;
  const openCount = webhookData.data.object.message_data.count;

  console.log('📨 Processing message.opened webhook:', {
    messageId,
    openCount,
    timestamp: webhookData.data.object.timestamp
  });

  try {
    const { error } = await supabaseAdmin
      .from('email_shares')
      .update({ opens: openCount })
      .eq('message_id', messageId);

    if (error) {
      console.error('❌ Error updating email_shares opens count:', error);
      throw error;
    }

    console.log('✅ Successfully updated opens count for message:', messageId);
    return { success: true, messageId, openCount };
  } catch (error) {
    console.error('❌ Error in handleMessageOpened:', error);
    throw error;
  }
}

export async function handleMessageLinkClicked(webhookData: MessageLinkClickedWebhook) {
  const messageId = webhookData.data.object.message_id;
  const totalClicks = webhookData.data.object.link_data.reduce((sum, link) => sum + link.count, 0);

  console.log('🔗 Processing message.link_clicked webhook:', {
    messageId,
    totalClicks,
    timestamp: webhookData.data.object.timestamp
  });

  try {
    const { error } = await supabaseAdmin
      .from('email_shares')
      .update({ link_clicks: totalClicks })
      .eq('message_id', messageId);

    if (error) {
      console.error('❌ Error updating email_shares link_clicks count:', error);
      throw error;
    }

    console.log('✅ Successfully updated link_clicks count for message:', messageId);
    return { success: true, messageId, totalClicks };
  } catch (error) {
    console.error('❌ Error in handleMessageLinkClicked:', error);
    throw error;
  }
}