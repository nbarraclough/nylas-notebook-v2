
export interface NotetakerRecord {
  id: string;
  notetaker_id: string;
  status: string;
  manual_override?: boolean; // Added as optional to maintain compatibility
  event: {
    title: string;
    start_time: string;
    manual_meeting?: {
      title: string;
      meeting_url: string;
    } | null;
  };
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
