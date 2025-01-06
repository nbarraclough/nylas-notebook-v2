import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AuditAction = Database['public']['Enums']['audit_action'];

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
        user_id: userId,
        action,
        details: sanitizedDetails
      });

    if (error) {
      console.error('Error logging audit event:', {
        eventType: action,
        error: error.message
      });
    }
  } catch (error) {
    console.error('Failed to log audit event:', {
      eventType: action,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const AuditAction = {
  VIDEO_SHARE: 'video_share' as const,
  PASSWORD_ATTEMPT: 'password_attempt' as const,
  ORGANIZATION_UPDATE: 'organization_update' as const,
  SETTINGS_UPDATE: 'settings_update' as const
} as const;