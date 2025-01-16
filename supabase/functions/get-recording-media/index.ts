import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Upload } from "https://esm.sh/@aws-sdk/lib-storage@3.354.0";
import { S3Client, GetObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.354.0";
import { Readable } from "https://deno.land/std@0.168.0/node/stream.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recordingId, notetakerId } = await req.json();
    console.log('📝 Processing media request for:', { recordingId, notetakerId });
    
    if (!recordingId || !notetakerId) {
      console.error('❌ Missing required parameters:', { recordingId, notetakerId });
      throw new Error('Missing required parameters');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update status to retrieving before attempting to get media
    const { error: updateError } = await supabase
      .from('recordings')
      .update({
        status: 'retrieving',
        updated_at: new Date().toISOString()
      })
      .eq('id', recordingId);

    if (updateError) {
      console.error('❌ Error updating recording status:', updateError);
      throw updateError;
    }

    // Attempt to get recording media
    try {
      console.log('🔄 Initializing S3 client...');
      const s3Client = new S3Client({
        region: Deno.env.get('AWS_REGION')!,
        credentials: {
          accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
          secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
        },
      });

      console.log('📥 Fetching recording from S3...');
      const getObjectCommand = new GetObjectCommand({
        Bucket: Deno.env.get('AWS_BUCKET_NAME')!,
        Key: `recordings/${notetakerId}/recording.webm`,
      });

      const { Body } = await s3Client.send(getObjectCommand);
      if (!Body) {
        console.error('❌ No recording found in S3');
        throw new Error('No recording found');
      }

      console.log('✅ Successfully retrieved recording from S3');
      const stream = Body as Readable;
      const chunks: Uint8Array[] = [];
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      const buffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }

      console.log('🎥 Preparing to upload to Mux...');
      const formData = new FormData();
      const blob = new Blob([buffer], { type: 'video/webm' });
      formData.append('file', blob, 'recording.webm');

      console.log('📤 Uploading to Mux...');
      const muxResponse = await fetch('https://api.mux.com/video/v1/assets', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(Deno.env.get('MUX_TOKEN_ID')! + ':' + Deno.env.get('MUX_TOKEN_SECRET')!)}`,
        },
        body: formData,
      });

      if (!muxResponse.ok) {
        console.error('❌ Failed to upload to Mux:', await muxResponse.text());
        throw new Error(`Failed to upload to Mux: ${muxResponse.statusText}`);
      }

      const muxData = await muxResponse.json();
      const assetId = muxData.data.id;
      console.log('✅ Successfully uploaded to Mux. Asset ID:', assetId);

      const { error: finalUpdateError } = await supabase
        .from('recordings')
        .update({
          mux_asset_id: assetId,
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', recordingId);

      if (finalUpdateError) {
        console.error('❌ Error updating recording with Mux asset ID:', finalUpdateError);
        throw finalUpdateError;
      }

      return new Response(
        JSON.stringify({ success: true, assetId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('❌ Error processing media:', error);
      
      // Update status to error if media retrieval fails
      await supabase
        .from('recordings')
        .update({
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', recordingId);

      throw error;
    }

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});