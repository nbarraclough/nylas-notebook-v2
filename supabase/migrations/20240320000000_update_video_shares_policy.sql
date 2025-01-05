-- Update the video_shares policy to allow public access to external shares
CREATE POLICY "Anyone can view external video shares" ON video_shares
FOR SELECT
TO public
USING (share_type = 'external');

-- Update the recordings policy to allow public access through valid shares
CREATE POLICY "Anyone can view shared recordings" ON recordings
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM video_shares 
    WHERE video_shares.recording_id = recordings.id 
    AND video_shares.share_type = 'external'
  )
);

-- Update the events policy to allow public access through valid shares
CREATE POLICY "Anyone can view events for shared recordings" ON events
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM recordings 
    JOIN video_shares ON video_shares.recording_id = recordings.id 
    WHERE recordings.event_id = events.id 
    AND video_shares.share_type = 'external'
  )
);

-- Allow public to create video views
CREATE POLICY "Anyone can create video views" ON video_views
FOR INSERT
TO public
WITH CHECK (true);