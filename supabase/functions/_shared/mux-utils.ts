
// Utility functions for interacting with Mux API

export async function createMuxAsset(inputUrl: string, requestId: string) {
  try {
    console.log(`🎥 [${requestId}] Creating Mux asset from URL: ${inputUrl}`);

    const MUX_TOKEN_ID = Deno.env.get('MUX_TOKEN_ID');
    const MUX_TOKEN_SECRET = Deno.env.get('MUX_TOKEN_SECRET');

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      throw new Error('Missing Mux credentials in environment variables');
    }

    const credentials = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);

    const response = await fetch('https://api.mux.com/video/v1/assets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: JSON.stringify({
        input: inputUrl,
        playback_policy: ['public'],
        mp4_support: "standard"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${requestId}] Mux API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Mux API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ [${requestId}] Mux asset created: ${data.data.id}`);
    
    return data.data;
  } catch (error) {
    console.error(`❌ [${requestId}] Error creating Mux asset:`, error);
    throw error;
  }
}

export async function getMuxAsset(assetId: string, requestId: string) {
  try {
    console.log(`🔍 [${requestId}] Getting Mux asset: ${assetId}`);

    const MUX_TOKEN_ID = Deno.env.get('MUX_TOKEN_ID');
    const MUX_TOKEN_SECRET = Deno.env.get('MUX_TOKEN_SECRET');

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      throw new Error('Missing Mux credentials in environment variables');
    }

    const credentials = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);

    const response = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${requestId}] Mux API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Mux API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ [${requestId}] Mux asset retrieved: ${data.data.id}`);
    
    return data.data;
  } catch (error) {
    console.error(`❌ [${requestId}] Error getting Mux asset:`, error);
    throw error;
  }
}

// Get recording media from Nylas
export const getNylasRecordingMedia = async (
  grantId: string, 
  notetakerId: string,
  requestId: string
): Promise<{
  recordingUrl: string | null;
  transcriptUrl: string | null;
}> => {
  console.log(`🎬 [${requestId}] Getting recording media from Nylas for notetaker ${notetakerId}`);
  
  try {
    const nylasApiKey = Deno.env.get('NYLAS_CLIENT_SECRET');
    if (!nylasApiKey) {
      throw new Error('NYLAS_CLIENT_SECRET not configured');
    }

    // Fetch media from Nylas
    const response = await fetch(
      `https://api.us.nylas.com/v3/grants/${grantId}/notetakers/${notetakerId}/media`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json, application/gzip',
          'Authorization': `Bearer ${nylasApiKey}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${requestId}] Failed to fetch media from Nylas: ${response.status} ${response.statusText} - ${errorText}`);
      throw new Error(`Nylas API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ [${requestId}] Successfully retrieved media from Nylas: ${JSON.stringify(data)}`);
    
    // Extract recording and transcript URLs from the updated response format
    const recordingUrl = data?.data?.recording?.url || null;
    const transcriptUrl = data?.data?.transcript?.url || null;

    if (!recordingUrl) {
      console.error(`❌ [${requestId}] No recording URL in Nylas response`);
      throw new Error('No recording URL in Nylas response');
    }

    return {
      recordingUrl,
      transcriptUrl
    };
  } catch (error) {
    console.error(`❌ [${requestId}] Error retrieving media from Nylas:`, error);
    throw error;
  }
};

// New function to fetch transcript JSON data from the URL
export const fetchTranscriptContent = async (
  transcriptUrl: string,
  requestId: string
): Promise<any | null> => {
  console.log(`📝 [${requestId}] Fetching transcript content from URL: ${transcriptUrl}`);
  
  try {
    const response = await fetch(transcriptUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${requestId}] Failed to fetch transcript: ${response.status} ${response.statusText} - ${errorText}`);
      return null;
    }
    
    // Parse the JSON data
    const transcriptData = await response.json();
    console.log(`✅ [${requestId}] Successfully fetched transcript content`);
    
    // Process the transcript data into a usable format
    // The format depends on what's returned by Nylas, but generally we want to structure it into 
    // entries with speaker, text, timestamps, etc.
    const processedTranscript = processRawTranscript(transcriptData, requestId);
    
    return processedTranscript;
  } catch (error) {
    console.error(`❌ [${requestId}] Error fetching transcript content:`, error);
    return null;
  }
};

// Process raw transcript data into a standardized format for our app
const processRawTranscript = (rawData: any, requestId: string): any => {
  console.log(`🔄 [${requestId}] Processing raw transcript data`);
  
  try {
    // Check if the data is already in our expected format
    if (Array.isArray(rawData) && rawData.length > 0 && 'text' in rawData[0]) {
      console.log(`✅ [${requestId}] Transcript data is already in expected format`);
      return rawData;
    }
    
    // If the transcript is in a different format, we need to transform it
    // This will depend on Nylas's format, which could change
    // Here's a general approach:
    
    // Extract entries - the exact access path may need to be adjusted
    const entries = rawData.entries || rawData.segments || rawData.transcript || rawData;
    
    if (!entries || !Array.isArray(entries)) {
      console.error(`❌ [${requestId}] Unexpected transcript format:`, rawData);
      return null;
    }
    
    // Map to our standard format
    const standardizedEntries = entries.map((entry: any) => {
      // Default values
      const result: any = {
        start: 0,
        end: 0,
        speaker: 'Unknown',
        text: ''
      };
      
      // Map fields - adjust based on actual Nylas format
      if (entry.start_time !== undefined) result.start = entry.start_time;
      if (entry.start !== undefined) result.start = entry.start;
      
      if (entry.end_time !== undefined) result.end = entry.end_time;
      if (entry.end !== undefined) result.end = entry.end;
      
      if (entry.speaker !== undefined) result.speaker = entry.speaker;
      if (entry.speaker_id !== undefined) result.speaker = `Speaker ${entry.speaker_id}`;
      
      if (entry.text !== undefined) result.text = entry.text;
      if (entry.content !== undefined) result.text = entry.content;
      
      return result;
    });
    
    console.log(`✅ [${requestId}] Successfully processed transcript into ${standardizedEntries.length} entries`);
    return standardizedEntries;
  } catch (error) {
    console.error(`❌ [${requestId}] Error processing transcript:`, error);
    return null;
  }
};
