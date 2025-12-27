import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-session',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get session token from header or body
    let sessionToken = req.headers.get('X-Admin-Session')
    
    if (!sessionToken) {
      try {
        const body = await req.json()
        sessionToken = body.sessionToken
      } catch {
        // Body parsing failed
      }
    }

    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'No session token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar sessão de admin
    const { data: session } = await supabase
      .from('admin_sessions')
      .select('user_id')
      .eq('session_token', sessionToken)
      .eq('revoked', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Sessão inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se é admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user_id)
      .eq('role', 'admin')
      .single()

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar ENCRYPTION_KEY
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY')
    const hasValidKey = encryptionKey && encryptionKey.length === 64

    // Teste de criptografia
    let encryptionWorking = false
    let testError = null

    if (hasValidKey) {
      try {
        const testData = 'test-data-123'
        const encoder = new TextEncoder()
        const data = encoder.encode(testData)
        
        const keyData = new Uint8Array(32)
        for (let i = 0; i < 32; i++) {
          keyData[i] = parseInt(encryptionKey!.substr(i * 2, 2), 16)
        }

        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'AES-GCM' },
          false,
          ['encrypt', 'decrypt']
        )

        const iv = crypto.getRandomValues(new Uint8Array(12))
        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          cryptoKey,
          data
        )

        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          cryptoKey,
          encrypted
        )

        const decoder = new TextDecoder()
        const decryptedText = decoder.decode(decrypted)
        
        encryptionWorking = decryptedText === testData
      } catch (error) {
        testError = error.message
        console.error('[Security Audit] Encryption test failed:', error)
      }
    }

    // Buscar estatísticas
    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, dados_clinicos, historico')

    const sensitiveFieldsCount = {
      total_clients: clientsData?.length || 0,
      with_dados_clinicos: clientsData?.filter(c => c.dados_clinicos).length || 0,
      with_historico: clientsData?.filter(c => c.historico).length || 0,
    }

    // Buscar logs de auditoria recentes
    const { data: auditLogs } = await supabase
      .from('medical_audit_log')
      .select('*')
      .order('access_timestamp', { ascending: false })
      .limit(100)

    const { data: recentAccess } = await supabase
      .from('medical_audit_log')
      .select('action')
      .gte('access_timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const auditStats = {
      total_logs: auditLogs?.length || 0,
      last_24h: recentAccess?.length || 0,
      unauthorized_attempts: recentAccess?.filter(l => l.action.includes('UNAUTHORIZED')).length || 0,
    }

    const report = {
      timestamp: new Date().toISOString(),
      encryption: {
        key_configured: !!encryptionKey,
        key_valid: hasValidKey,
        algorithm: 'AES-256-GCM',
        test_passed: encryptionWorking,
        test_error: testError,
      },
      sensitive_data: sensitiveFieldsCount,
      audit: auditStats,
      recommendations: [],
    }

    // Gerar recomendações
    if (!hasValidKey) {
      report.recommendations.push({
        severity: 'critical',
        message: 'ENCRYPTION_KEY não configurada ou inválida',
        action: 'Configure uma chave de 64 caracteres hexadecimais',
      })
    }

    if (!encryptionWorking) {
      report.recommendations.push({
        severity: 'critical',
        message: 'Teste de criptografia falhou',
        action: 'Verifique a ENCRYPTION_KEY e reinstale se necessário',
      })
    }

    if (auditStats.unauthorized_attempts > 0) {
      report.recommendations.push({
        severity: 'high',
        message: `${auditStats.unauthorized_attempts} tentativas de acesso não autorizado nas últimas 24h`,
        action: 'Revisar logs de segurança e investigar',
      })
    }

    if (sensitiveFieldsCount.with_dados_clinicos === 0 && sensitiveFieldsCount.with_historico === 0) {
      report.recommendations.push({
        severity: 'info',
        message: 'Nenhum dado sensível armazenado ainda',
        action: 'Sistema pronto para receber dados criptografados',
      })
    }

    // Log da ação
    await supabase.from('audit_log').insert({
      user_id: session.user_id,
      action: 'ADMIN_SECURITY_AUDIT',
      table_name: 'system',
      new_values: report,
    })

    return new Response(
      JSON.stringify({ success: true, report }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Security Audit] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})