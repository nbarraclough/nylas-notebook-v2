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
    
    if (!recordingId || !notetakerId) {
      throw new Error('Missing required parameters');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Attempt to get recording media
    try {
      const s3Client = new S3Client({
        region: Deno.env.get('AWS_REGION')!,
        credentials: {
          accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
          secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
        },
      });

      const getObjectCommand = new GetObjectCommand({
        Bucket: Deno.env.get('AWS_BUCKET_NAME')!,
        Key: `recordings/${notetakerId}/recording.webm`,
      });

      const { Body } = await s3Client.send(getObjectCommand);
      if (!Body) throw new Error('No recording found');

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

      const formData = new FormData();
      const blob = new Blob([buffer], { type: 'video/webm' });
      formData.append('file', blob, 'recording.webm');

      const muxResponse = await fetch('https://api.mux.com/video/v1/assets', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(Deno.env.get('MUX_TOKEN_ID')! + ':' + Deno.env.get('MUX_TOKEN_SECRET')!)}`,
        },
        body: formData,
      });

      if (!muxResponse.ok) {
        throw new Error(`Failed to upload to Mux: ${await muxResponse.text()}`);
      }

      const muxData = await muxResponse.json();
      const assetId = muxData.data.id;

      const { error: updateError } = await supabase
        .from('recordings')
        .update({
          mux_asset_id: assetId,
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', recordingId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});