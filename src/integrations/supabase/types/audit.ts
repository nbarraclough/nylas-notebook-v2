import type { Json } from './json';

export interface AuditLog {
  id: string;
  action: AuditAction;
  user_id: string;
  details: Json;
  created_at: string;
}

export interface AuditLogInsert {
  id?: string;
  action: AuditAction;
  user_id: string;
  details?: Json;
  created_at?: string;
}

export interface AuditLogUpdate {
  id?: string;
  action?: AuditAction;
  user_id?: string;
  details?: Json;
  created_at?: string;
}

export type AuditAction = 'video_share' | 'password_attempt' | 'organization_update' | 'settings_update';