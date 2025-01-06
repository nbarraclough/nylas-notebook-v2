export interface NotetakerRecord {
  id: string;
  notetaker_id: string;
  event: {
    title: string;
    start_time: string;
    manual_meeting?: {
      title: string;
      meeting_url: string;
    };
  };
}