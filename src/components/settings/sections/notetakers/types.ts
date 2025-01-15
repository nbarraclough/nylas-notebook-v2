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