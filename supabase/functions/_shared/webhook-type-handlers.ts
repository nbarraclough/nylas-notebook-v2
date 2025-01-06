import { corsHeaders } from './cors.ts';
import { 
  handleEventCreated, 
  handleEventUpdated, 
  handleEventDeleted,
  handleGrantCreated,
  handleGrantUpdated,
  handleGrantDeleted,
  handleGrantExpired 
} from './webhook-handlers.ts';
import { logWebhookSuccess, logWebhookError } from './webhook-logger.ts';

export const handleWebhookType = async (webhookData: any, grantId: string, requestId: string) => {
  try {
    switch (webhookData.type) {
      case 'event.created':
        const createResult = await handleEventCreated(webhookData.data.object, grantId);
        logWebhookSuccess(webhookData.type);
        return { success: true, result: createResult };

      case 'event.updated':
        const updateResult = await handleEventUpdated(webhookData.data.object, grantId);
        logWebhookSuccess(webhookData.type);
        return { success: true, result: updateResult };

      case 'event.deleted':
        const deleteResult = await handleEventDeleted(webhookData.data.object, grantId);
        logWebhookSuccess(webhookData.type);
        return { success: true, result: deleteResult };

      case 'grant.created':
        const grantCreateResult = await handleGrantCreated(webhookData.data);
        logWebhookSuccess(webhookData.type);
        return { success: true, result: grantCreateResult };

      case 'grant.updated':
        const grantUpdateResult = await handleGrantUpdated(webhookData.data);
        logWebhookSuccess(webhookData.type);
        return { success: true, result: grantUpdateResult };

      case 'grant.deleted':
        const grantDeleteResult = await handleGrantDeleted(webhookData.data);
        logWebhookSuccess(webhookData.type);
        return { success: true, result: grantDeleteResult };

      case 'grant.expired':
        const grantExpireResult = await handleGrantExpired(webhookData.data);
        logWebhookSuccess(webhookData.type);
        return { success: true, result: grantExpireResult };

      default:
        if (webhookData.type.startsWith('notetaker.')) {
          console.log(`📝 [${requestId}] Processing ${webhookData.type} webhook`);
          logWebhookSuccess(webhookData.type);
          return { 
            success: true, 
            message: `Successfully processed ${webhookData.type} webhook` 
          };
        }
        
        console.log(`⚠️ [${requestId}] Unhandled webhook type: ${webhookData.type}`);
        return { 
          success: false, 
          message: `Unhandled webhook type: ${webhookData.type}` 
        };
    }
  } catch (error) {
    logWebhookError('webhook type handling', error);
    return { 
      success: false, 
      message: `Error processing webhook: ${error.message}` 
    };
  }
};