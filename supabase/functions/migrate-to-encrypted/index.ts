import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { encryptFields, isEncrypted } from '../_shared/encryption.ts';
import { getTablesWithSensitiveFields, getSensitiveFields } from '../_shared/sensitive-fields.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-session',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get session token from header or body
    let sessionToken = req.headers.get('X-Admin-Session')
    let body: any = {}
    
    try {
      body = await req.json()
      if (!sessionToken) {
        sessionToken = body.sessionToken
      }
    } catch {
      // Body parsing failed
    }

    // Verify admin session (if sessionToken provided) or user auth
    if (sessionToken) {
      const { data: session, error: sessionError } = await supabaseClient
        .from('admin_sessions')
        .select('user_id')
        .eq('session_token', sessionToken)
        .eq('revoked', false)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired admin session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Fallback to regular user auth
      const {
        data: { user },
        error: authError,
      } = await supabaseClient.auth.getUser(
        req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
      );

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Admin access required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { table, dryRun = true } = body;

    const tablesToMigrate = table 
      ? [table] 
      : getTablesWithSensitiveFields();

    const results: Record<string, any> = {};

    for (const tableName of tablesToMigrate) {
      console.log(`[Migration] Processing table: ${tableName}`);
      
      const sensitiveFields = getSensitiveFields(tableName);
      if (sensitiveFields.length === 0) {
        console.log(`[Migration] No sensitive fields for ${tableName}, skipping`);
        continue;
      }

      // Fetch all records
      const { data: records, error: fetchError } = await supabaseClient
        .from(tableName)
        .select('*');

      if (fetchError) {
        console.error(`[Migration] Error fetching ${tableName}:`, fetchError);
        results[tableName] = { error: fetchError.message };
        continue;
      }

      if (!records || records.length === 0) {
        console.log(`[Migration] No records in ${tableName}`);
        results[tableName] = { processed: 0, encrypted: 0, skipped: 0 };
        continue;
      }

      let encrypted = 0;
      let skipped = 0;

      for (const record of records) {
        // Check if any field needs encryption
        let needsEncryption = false;
        
        for (const field of sensitiveFields) {
          const value = record[field];
          if (value && typeof value === 'string' && !isEncrypted(value)) {
            needsEncryption = true;
            break;
          }
        }

        if (!needsEncryption) {
          skipped++;
          continue;
        }

        // Encrypt sensitive fields
        const encryptedData = await encryptFields(record, sensitiveFields);

        if (!dryRun) {
          // Update record
          const { error: updateError } = await supabaseClient
            .from(tableName)
            .update(encryptedData)
            .eq('id', record.id);

          if (updateError) {
            console.error(`[Migration] Error updating ${tableName} record ${record.id}:`, updateError);
          } else {
            encrypted++;
          }
        } else {
          encrypted++;
        }
      }

      results[tableName] = {
        processed: records.length,
        encrypted,
        skipped,
        mode: dryRun ? 'dry-run' : 'live'
      };

      console.log(`[Migration] ${tableName}: ${encrypted} encrypted, ${skipped} skipped (${dryRun ? 'DRY RUN' : 'LIVE'})`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: dryRun 
          ? 'Migration simulation completed. Set dryRun=false to apply changes.'
          : 'Migration completed successfully.',
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Migration] Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
