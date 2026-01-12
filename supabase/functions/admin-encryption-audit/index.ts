import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { encrypt, decrypt, isEncrypted } from '../_shared/encryption.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-session',
}

// Helper function to count encryption status for records
function countEncryptionStatus(records: any[], fields: string[]): { total: number; encrypted: number; plaintext: number; null_values: number } {
  let encrypted = 0
  let plaintext = 0
  let nullCount = 0

  for (const record of records) {
    for (const field of fields) {
      const value = record[field]
      if (!value) {
        nullCount++
      } else if (typeof value === 'string' && isEncrypted(value)) {
        encrypted++
      } else {
        plaintext++
      }
    }
  }

  return {
    total: records.length * fields.length,
    encrypted,
    plaintext,
    null_values: nullCount
  }
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
      // Encrypt data - using shared sensitive fields config
      const sensitiveFields: Record<string, string[]> = {
        clients: ['dados_clinicos', 'historico', 'tratamento', 'cpf'],
        anamneses: [
          'queixa_principal', 'motivo_consulta', 'historico_medico',
          'historico_familiar', 'antecedentes_relevantes', 'diagnostico_inicial',
          'observacoes_adicionais'
        ],
        evolucoes: ['evolucao'],
        session_notes: ['notes'],
        profiles: ['bio', 'banco', 'agencia', 'conta', 'cpf_cnpj', 'chave_pix', 'nome_titular'],
        configuracoes: ['chave_pix', 'dados_bancarios'],
        packages: ['observacoes'],
        payments: ['observacoes']
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
      // Decrypt data - using shared sensitive fields config
      const sensitiveFields: Record<string, string[]> = {
        clients: ['dados_clinicos', 'historico', 'tratamento', 'cpf'],
        anamneses: [
          'queixa_principal', 'motivo_consulta', 'historico_medico',
          'historico_familiar', 'antecedentes_relevantes', 'diagnostico_inicial',
          'observacoes_adicionais'
        ],
        evolucoes: ['evolucao'],
        session_notes: ['notes'],
        profiles: ['bio', 'banco', 'agencia', 'conta', 'cpf_cnpj', 'chave_pix', 'nome_titular'],
        configuracoes: ['chave_pix', 'dados_bancarios'],
        packages: ['observacoes'],
        payments: ['observacoes']
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
      // Get encryption statistics for ALL tables with sensitive data
      const stats: Record<string, { total: number; encrypted: number; plaintext: number; null_values: number }> = {}
      
      // Check clients table
      const { data: clients } = await supabaseClient
        .from('clients')
        .select('dados_clinicos, historico, tratamento')
        .limit(1000)
      
      stats.clients = countEncryptionStatus(clients || [], ['dados_clinicos', 'historico', 'tratamento'])

      // Check profiles table (bank details)
      const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('bio, banco, agencia, conta, cpf_cnpj, chave_pix, nome_titular')
        .limit(1000)
      
      stats.profiles = countEncryptionStatus(profiles || [], ['bio', 'banco', 'agencia', 'conta', 'cpf_cnpj', 'chave_pix', 'nome_titular'])

      // Check anamneses table
      const { data: anamneses } = await supabaseClient
        .from('anamneses')
        .select('queixa_principal, motivo_consulta, historico_medico, historico_familiar, antecedentes_relevantes, diagnostico_inicial, observacoes_adicionais')
        .limit(1000)
      
      stats.anamneses = countEncryptionStatus(anamneses || [], ['queixa_principal', 'motivo_consulta', 'historico_medico', 'historico_familiar', 'antecedentes_relevantes', 'diagnostico_inicial', 'observacoes_adicionais'])

      // Check evolucoes table
      const { data: evolucoes } = await supabaseClient
        .from('evolucoes')
        .select('evolucao')
        .limit(1000)
      
      stats.evolucoes = countEncryptionStatus(evolucoes || [], ['evolucao'])

      // Check session_notes table
      const { data: sessionNotes } = await supabaseClient
        .from('session_notes')
        .select('notes')
        .limit(1000)
      
      stats.session_notes = countEncryptionStatus(sessionNotes || [], ['notes'])

      // Calculate totals
      let totalFields = 0
      let totalEncrypted = 0
      let totalPlaintext = 0
      let totalNull = 0

      for (const tableStat of Object.values(stats)) {
        totalFields += tableStat.total
        totalEncrypted += tableStat.encrypted
        totalPlaintext += tableStat.plaintext
        totalNull += tableStat.null_values
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          stats: {
            total_fields: totalFields,
            encrypted: totalEncrypted,
            plaintext: totalPlaintext,
            null_values: totalNull
          },
          byTable: stats
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
