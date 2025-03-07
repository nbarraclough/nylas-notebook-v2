
// Utility functions for interacting with Mux API
import { logFetchError, analyzeErrorType } from './webhook-logger.ts';

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
      const errorText = await logFetchError(requestId, 'https://api.mux.com/video/v1/assets', response);
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
      const errorText = await logFetchError(requestId, `https://api.mux.com/video/v1/assets/${assetId}`, response);
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
      const errorText = await logFetchError(requestId, `https://api.us.nylas.com/v3/grants/${grantId}/notetakers/${notetakerId}/media`, response);
      
      // Parse the error to determine if this is a media-not-ready situation
      if (errorText.toLowerCase().includes('no recording available') || 
          response.status === 404 ||
          errorText.toLowerCase().includes('not found')) {
        throw new Error('MEDIA_NOT_READY: No recording available yet');
      }
      
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

// Fetch transcript JSON data from the URL with retry capability
export const fetchTranscriptContent = async (
  transcriptUrl: string,
  requestId: string,
  maxRetries = 3
): Promise<any | null> => {
  console.log(`📝 [${requestId}] Fetching transcript content from URL: ${transcriptUrl}`);
  
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const response = await fetch(transcriptUrl, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorText = await logFetchError(requestId, transcriptUrl, response);
        const errorType = analyzeErrorType(errorText);
        
        if (errorType === 'temporary' && retries < maxRetries - 1) {
          // For temporary errors, retry with exponential backoff
          retries++;
          const backoffMs = Math.pow(2, retries) * 1000;
          console.log(`⏳ [${requestId}] Temporary error, retrying in ${backoffMs}ms (attempt ${retries}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        } else if (errorType === 'expired') {
          // URL has likely expired - we need to get a fresh URL
          console.log(`⚠️ [${requestId}] URL appears to be expired, a fresh URL will be needed`);
          return null;
        } else if (errorType === 'unavailable') {
          // Recording is truly unavailable
          console.log(`⚠️ [${requestId}] Transcript appears to be unavailable`);
          return null;
        } else {
          // Permanent error or out of retries
          console.error(`❌ [${requestId}] Failed to fetch transcript after ${retries} retries: ${response.status} ${response.statusText}`);
          return null;
        }
      }
      
      // Parse the JSON data
      const transcriptText = await response.text();
      console.log(`✅ [${requestId}] Successfully fetched transcript content. Size: ${transcriptText.length} bytes`);
      
      // Log a small sample of the transcript for debugging
      const sampleText = transcriptText.substring(0, 200) + (transcriptText.length > 200 ? "..." : "");
      console.log(`🔍 [${requestId}] Transcript sample: ${sampleText}`);
      
      try {
        const transcriptData = JSON.parse(transcriptText);
        
        // Process the transcript data into a usable format
        const processedTranscript = processRawTranscript(transcriptData, requestId);
        
        // Log processed data size
        console.log(`✅ [${requestId}] Processed transcript has ${processedTranscript ? processedTranscript.length : 0} entries`);
        
        return processedTranscript;
      } catch (parseError) {
        console.error(`❌ [${requestId}] Error parsing transcript JSON:`, parseError);
        console.log(`🔍 [${requestId}] Failed JSON content sample: ${sampleText}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ [${requestId}] Error fetching transcript content (attempt ${retries + 1}/${maxRetries}):`, error);
      
      if (retries < maxRetries - 1) {
        // Retry with exponential backoff
        retries++;
        const backoffMs = Math.pow(2, retries) * 1000;
        console.log(`⏳ [${requestId}] Retrying in ${backoffMs}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      } else {
        console.error(`❌ [${requestId}] Failed to fetch transcript after ${maxRetries} attempts`);
        return null;
      }
    }
  }
  
  return null;
};

// Process raw transcript data into a standardized format for our app
const processRawTranscript = (rawData: any, requestId: string): any => {
  console.log(`🔄 [${requestId}] Processing raw transcript data`);
  
  try {
    // Check if the data is already in our expected format
    if (Array.isArray(rawData) && rawData.length > 0 && 'text' in rawData[0]) {
      console.log(`✅ [${requestId}] Transcript data is already in expected format with ${rawData.length} entries`);
      return rawData;
    }
    
    // If the transcript is in a different format, we need to transform it
    let entries;
    
    // Check for various transcript format structures
    if (rawData.transcript && Array.isArray(rawData.transcript)) {
      console.log(`🔍 [${requestId}] Found transcript array in 'transcript' field with ${rawData.transcript.length} items`);
      entries = rawData.transcript;
    } else if (rawData.entries && Array.isArray(rawData.entries)) {
      console.log(`🔍 [${requestId}] Found transcript array in 'entries' field with ${rawData.entries.length} items`);
      entries = rawData.entries;
    } else if (rawData.segments && Array.isArray(rawData.segments)) {
      console.log(`🔍 [${requestId}] Found transcript array in 'segments' field with ${rawData.segments.length} items`);
      entries = rawData.segments;
    } else if (Array.isArray(rawData)) {
      console.log(`🔍 [${requestId}] Raw data is already an array with ${rawData.length} items`);
      entries = rawData;
    } else {
      // Log the structure of the raw data to help debug format issues
      console.error(`❌ [${requestId}] Unexpected transcript format. Keys:`, Object.keys(rawData));
      return null;
    }
    
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      console.error(`❌ [${requestId}] No valid transcript entries found`);
      return null;
    }
    
    // Log sample entry to help with debugging format issues
    console.log(`🔍 [${requestId}] Sample entry:`, JSON.stringify(entries[0]).substring(0, 200));
    
    // Map to our standard format
    const standardizedEntries = entries.map((entry: any, index: number) => {
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
