import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateBackupCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // Delete old backup codes
    await supabase
      .from('user_2fa_backup_codes')
      .delete()
      .eq('user_id', user.id);

    // Generate new backup codes
    const codes: string[] = [];
    const insertData = [];

    for (let i = 0; i < 10; i++) {
      const code = generateBackupCode();
      codes.push(code);
      insertData.push({
        user_id: user.id,
        code,
        used: false,
      });
    }

    const { error: insertError } = await supabase
      .from('user_2fa_backup_codes')
      .insert(insertData);

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ codes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in 2fa-generate-backup-codes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar códigos de backup';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
