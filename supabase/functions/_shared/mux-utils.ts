
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
