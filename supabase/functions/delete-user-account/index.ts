import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized: No authorization header');
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Admin client with service role for all operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Extract JWT token and verify it using service role client
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      throw new Error('Unauthorized: Invalid or missing user session');
    }

    const userId = user.id;
    console.log(`Starting account deletion for user: ${userId}`);

    // Get password from request body
    const { password } = await req.json();

    if (!password) {
      throw new Error('Senha é obrigatória para confirmar a exclusão');
    }

    // Verify password
    console.log('[Delete Account] Verificando senha do usuário');
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: user.email!,
      password: password,
    });

    if (signInError) {
      console.error('[Delete Account] Senha incorreta:', signInError);
      
      // Get user name for email
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('nome')
        .eq('user_id', userId)
        .single();

      const userName = profile?.nome || 'Usuário';

      // Send security alert email
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-security-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            email: user.email,
            type: 'failed_account_deletion_attempt',
            userName: userName
          })
        });
      } catch (emailError) {
        console.error('[Delete Account] Erro ao enviar notificação de falha:', emailError);
      }

      // Return 200 with success: false so frontend can read the error message
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Senha incorreta',
          errorType: 'INVALID_PASSWORD'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Delete user data in proper order (respecting foreign key constraints)
    // Order matters: child tables first, then parent tables

    console.log('Deleting session_notes...');
    await supabaseAdmin.from('session_notes').delete().eq('user_id', userId);

    console.log('Deleting evolucoes...');
    await supabaseAdmin.from('evolucoes').delete().eq('user_id', userId);

    console.log('Deleting anamneses...');
    await supabaseAdmin.from('anamneses').delete().eq('user_id', userId);

    console.log('Deleting filled_records...');
    await supabaseAdmin.from('filled_records').delete().eq('user_id', userId);

    console.log('Deleting payments...');
    await supabaseAdmin.from('payments').delete().eq('user_id', userId);

    console.log('Deleting packages...');
    await supabaseAdmin.from('packages').delete().eq('user_id', userId);

    console.log('Deleting sessions...');
    await supabaseAdmin.from('sessions').delete().eq('user_id', userId);

    console.log('Deleting recurring_sessions...');
    await supabaseAdmin.from('recurring_sessions').delete().eq('user_id', userId);

    console.log('Deleting clients...');
    await supabaseAdmin.from('clients').delete().eq('user_id', userId);

    console.log('Deleting events...');
    await supabaseAdmin.from('events').delete().eq('user_id', userId);

    console.log('Deleting notifications...');
    await supabaseAdmin.from('notifications').delete().eq('user_id', userId);

    console.log('Deleting notification_settings...');
    await supabaseAdmin.from('notification_settings').delete().eq('user_id', userId);

    console.log('Deleting push_subscriptions...');
    await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', userId);

    console.log('Deleting registration_tokens...');
    await supabaseAdmin.from('registration_tokens').delete().eq('user_id', userId);

    console.log('Deleting user_2fa_backup_codes...');
    await supabaseAdmin.from('user_2fa_backup_codes').delete().eq('user_id', userId);

    console.log('Deleting user_2fa_email_codes...');
    await supabaseAdmin.from('user_2fa_email_codes').delete().eq('user_id', userId);

    console.log('Deleting user_2fa_reset_requests...');
    await supabaseAdmin.from('user_2fa_reset_requests').delete().eq('user_id', userId);

    console.log('Deleting user_2fa_settings...');
    await supabaseAdmin.from('user_2fa_settings').delete().eq('user_id', userId);

    console.log('Deleting user_roles...');
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);

    console.log('Deleting record_templates...');
    await supabaseAdmin.from('record_templates').delete().eq('user_id', userId);

    console.log('Deleting configuracoes...');
    await supabaseAdmin.from('configuracoes').delete().eq('user_id', userId);

    console.log('Deleting profiles...');
    await supabaseAdmin.from('profiles').delete().eq('user_id', userId);

    console.log('Deleting audit_log...');
    await supabaseAdmin.from('audit_log').delete().eq('user_id', userId);

    console.log('Deleting medical_audit_log...');
    await supabaseAdmin.from('medical_audit_log').delete().eq('user_id', userId);

    // Delete storage files
    console.log('Deleting storage files...');
    try {
      const { data: files } = await supabaseAdmin.storage
        .from('user-uploads')
        .list(userId);

      if (files && files.length > 0) {
        const filePaths = files.map(file => `${userId}/${file.name}`);
        await supabaseAdmin.storage.from('user-uploads').remove(filePaths);
        console.log(`Deleted ${files.length} files from storage`);
      }
    } catch (storageError) {
      console.error('Error deleting storage files:', storageError);
      // Continue even if storage deletion fails
    }

    // Finally, delete the user from auth.users
    console.log('Deleting user from auth.users...');
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      throw new Error(`Failed to delete user from auth: ${deleteUserError.message}`);
    }

    console.log(`Successfully deleted user account: ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Conta deletada permanentemente com sucesso',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in delete-user-account function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao deletar conta',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
