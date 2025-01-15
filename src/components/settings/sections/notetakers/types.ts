export type NotetakerRecord = {
  id: string;
  notetaker_id: string;
  queueId?: string;
  source: 'recording' | 'queue' | 'both';
  event: {
    title: string;
    start_time: string;
    manual_meeting?: {
      title: string;
      meeting_url: string;
    } | null;
  };
};

export interface NotetakerActionsProps {
  notetakerId: string;
  recordingId: string;
  isKicking: boolean;
  isRetrieving: boolean;
  onKick: () => void;
  onRetrieve: () => void;
}