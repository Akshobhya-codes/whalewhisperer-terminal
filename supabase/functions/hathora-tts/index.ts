import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HATHORA_API_KEY = Deno.env.get('HATHORA_API_KEY');
    if (!HATHORA_API_KEY) {
      throw new Error('HATHORA_API_KEY not configured');
    }

    const { text, voice = 'af_bella', speed = 1.0 } = await req.json();
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: 'No text provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending text to Hathora TTS (Kokoro model)...', { text, voice, speed });

    const response = await fetch('https://api.hathora.com/models/v1/text-to-speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HATHORA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'kokoro',
        input: text,
        voice: voice,
        speed: speed,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hathora TTS error:', response.status, errorText);
      throw new Error(`Hathora TTS failed: ${errorText}`);
    }

    // Get audio as array buffer
    const audioBuffer = await response.arrayBuffer();
    console.log('TTS audio generated, size:', audioBuffer.byteLength);

    // Convert to base64 for JSON transport
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(audioBuffer))
    );

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('TTS Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
