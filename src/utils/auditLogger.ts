import { supabase } from "@/integrations/supabase/client";

export enum AuditAction {
  VIDEO_SHARE = 'video_share',
  PASSWORD_ATTEMPT = 'password_attempt',
  ORGANIZATION_UPDATE = 'organization_update',
  SETTINGS_UPDATE = 'settings_update'
}

interface AuditLogEntry {
  action: AuditAction;
  userId: string;
  details: Record<string, any>;
}

export const logAuditEvent = async ({ action, userId, details }: AuditLogEntry) => {
  try {
    // Remove any sensitive information
    const sanitizedDetails = { ...details };
    delete sanitizedDetails.password;
    delete sanitizedDetails.token;
    delete sanitizedDetails.apiKey;

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        action,
        user_id: userId,
        details: sanitizedDetails
      });

    if (error) {
      console.error('Error logging audit event:', {
        action,
        error: error.message
      });
    }
  } catch (error) {
    console.error('Failed to log audit event:', {
      action,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};