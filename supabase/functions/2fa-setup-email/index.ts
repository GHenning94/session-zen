import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    const { enable } = await req.json();

    // Get or create 2FA settings
    const { data: settings, error: settingsError } = await supabase
      .from('user_2fa_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      throw settingsError;
    }

    if (!settings) {
      // Create settings if they don't exist
      const { error: createError } = await supabase
        .from('user_2fa_settings')
        .insert({
          user_id: user.id,
          email_2fa_enabled: enable,
        });

      if (createError) throw createError;
    } else {
      // Update existing settings
      const { error: updateError } = await supabase
        .from('user_2fa_settings')
        .update({ email_2fa_enabled: enable })
        .eq('user_id', user.id);

      if (updateError) throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, message: `2FA por e-mail ${enable ? 'ativado' : 'desativado'} com sucesso` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in 2fa-setup-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
