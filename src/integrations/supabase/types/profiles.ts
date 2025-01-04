export type Profile = {
  id: string;
  email: string;
  notetaker_name: string | null;
  record_external_meetings: boolean | null;
  record_internal_meetings: boolean | null;
  created_at: string;
  updated_at: string;
  nylas_grant_id: string | null;
};

export type ProfileInsert = {
  id: string;
  email: string;
  notetaker_name?: string | null;
  record_external_meetings?: boolean | null;
  record_internal_meetings?: boolean | null;
  created_at?: string;
  updated_at?: string;
  nylas_grant_id?: string | null;
};

export type ProfileUpdate = Partial<ProfileInsert>;