
export interface NotetakerRecord {
  id: string;
  notetaker_id: string;
  status: string;
  manual_override?: boolean;
  created_at?: string; // Added for sorting fallback
  event: {
    id?: string | null;
    title: string;
    start_time: string;
    manual_meeting?: {
      title: string;
      meeting_url: string;
    } | null;
  } | null; // Allow event to be null
  source: 'recording' | 'queue' | 'both';
  queueId?: string;
}

export interface NotetakerActionsProps {
  notetakerId: string;
  recordingId: string;
  status: string;
  isKicking: boolean;
  isRetrieving: boolean;
  onKick: () => Promise<void>;
  onRetrieve: (forceRefresh?: boolean) => Promise<void>;
}
