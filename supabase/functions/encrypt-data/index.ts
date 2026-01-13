import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { encrypt, decrypt, encryptFields, decryptFields } from '../_shared/encryption.ts';
import { getSensitiveFields } from '../_shared/sensitive-fields.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { table, data, operation, batch } = await req.json();

    if (!table || !operation) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: table, operation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['encrypt', 'decrypt'].includes(operation)) {
      return new Response(
        JSON.stringify({ error: 'Invalid operation. Must be "encrypt" or "decrypt"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get sensitive fields for this table
    const sensitiveFields = getSensitiveFields(table);

    if (sensitiveFields.length === 0) {
      return new Response(
        JSON.stringify({ error: `No sensitive fields defined for table: ${table}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle batch processing
    if (batch && Array.isArray(batch)) {
      const results = await Promise.all(
        batch.map(async (item: Record<string, any>) => {
          if (operation === 'encrypt') {
            return await encryptFields(item, sensitiveFields);
          } else {
            return await decryptFields(item, sensitiveFields);
          }
        })
      );
      
      console.log(`[${operation === 'encrypt' ? 'Encrypt' : 'Decrypt'}] Batch processed ${batch.length} items for table ${table}`);
      
      return new Response(
        JSON.stringify({ success: true, data: results }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle single item processing (backward compatibility)
    if (!data) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: data or batch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;
    if (operation === 'encrypt') {
      result = await encryptFields(data, sensitiveFields);
      console.log(`[Encrypt] Encrypted ${sensitiveFields.length} fields for table ${table}`);
    } else {
      result = await decryptFields(data, sensitiveFields);
      console.log(`[Decrypt] Decrypted ${sensitiveFields.length} fields for table ${table}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Encrypt-Data] Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});