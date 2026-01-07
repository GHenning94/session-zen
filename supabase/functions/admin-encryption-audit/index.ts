import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { encrypt, decrypt } from '../_shared/encryption.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-session',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get session token from header or body
    let sessionToken = req.headers.get('X-Admin-Session')
    let body: any = {}
    
    try {
      body = await req.json()
      if (!sessionToken) {
        sessionToken = body.sessionToken
      }
    } catch {
      // Body parsing failed, continue
    }
    
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'No session token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin session
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

    const { operation, table, data } = body

    // Handle different operations
    if (operation === 'test-encryption') {
      // Test if encryption key is configured and working
      try {
        const testData = 'test_encryption_data_' + Date.now()
        const encrypted = await encrypt(testData)
        const decrypted = await decrypt(encrypted)
        
        const success = decrypted === testData
        
        return new Response(
          JSON.stringify({ 
            success: true,
            keyConfigured: true,
            encryptionWorking: success,
            message: success ? 'Criptografia funcionando corretamente' : 'Falha na criptografia'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error: any) {
        console.error('Encryption test error:', error)
        return new Response(
          JSON.stringify({ 
            success: true,
            keyConfigured: false,
            encryptionWorking: false,
            message: 'Chave de criptografia não configurada ou inválida: ' + error.message
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (operation === 'encrypt' && table && data) {
      // Encrypt data
      const sensitiveFields: Record<string, string[]> = {
        clients: ['dados_clinicos', 'historico', 'tratamento', 'cpf'],
        anamneses: [
          'queixa_principal', 'motivo_consulta', 'historico_medico',
          'historico_familiar', 'antecedentes_relevantes', 'diagnostico_inicial',
          'observacoes_adicionais'
        ],
        evolucoes: ['evolucao'],
        session_notes: ['notes']
      }

      const fields = sensitiveFields[table] || []
      const encryptedData = { ...data }

      for (const field of fields) {
        if (encryptedData[field] && typeof encryptedData[field] === 'string') {
          encryptedData[field] = await encrypt(encryptedData[field])
        }
      }

      return new Response(
        JSON.stringify({ success: true, data: encryptedData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (operation === 'decrypt' && table && data) {
      // Decrypt data
      const sensitiveFields: Record<string, string[]> = {
        clients: ['dados_clinicos', 'historico', 'tratamento', 'cpf'],
        anamneses: [
          'queixa_principal', 'motivo_consulta', 'historico_medico',
          'historico_familiar', 'antecedentes_relevantes', 'diagnostico_inicial',
          'observacoes_adicionais'
        ],
        evolucoes: ['evolucao'],
        session_notes: ['notes']
      }

      const fields = sensitiveFields[table] || []
      const decryptedData = { ...data }

      for (const field of fields) {
        if (decryptedData[field] && typeof decryptedData[field] === 'string') {
          try {
            decryptedData[field] = await decrypt(decryptedData[field])
          } catch {
            // Keep original value if decryption fails (might be plaintext)
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, data: decryptedData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (operation === 'get-stats') {
      // Get encryption statistics
      const { data: clients, error: clientsError } = await supabaseClient
        .from('clients')
        .select('dados_clinicos, historico, tratamento')
        .limit(1000)

      if (clientsError) throw clientsError

      let encryptedCount = 0
      let plaintextCount = 0
      let nullCount = 0

      for (const client of clients || []) {
        for (const field of ['dados_clinicos', 'historico', 'tratamento']) {
          const value = client[field as keyof typeof client]
          if (!value) {
            nullCount++
          } else if (typeof value === 'string' && value.length > 50 && value.includes('=')) {
            // Likely encrypted (base64)
            encryptedCount++
          } else {
            plaintextCount++
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          stats: {
            total_fields: (clients?.length || 0) * 3,
            encrypted: encryptedCount,
            plaintext: plaintextCount,
            null_values: nullCount
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid operation' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
