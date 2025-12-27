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

    // Verificar sessão de admin - a sessão só existe se o login foi feito com credenciais corretas
    // (ADMIN_EMAIL/ADMIN_PASSWORD), então não precisamos verificar user_roles
    const { data: session, error: sessionError } = await supabase
      .from('admin_sessions')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .eq('revoked', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !session) {
      console.log('[Security Audit] Session not found or expired:', sessionError?.message)
      return new Response(
        JSON.stringify({ error: 'Sessão inválida ou expirada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Security Audit] Valid admin session for user:', session.user_id)

    // Verificar ENCRYPTION_KEY - aceita hex (64 chars) ou base64 (44 chars)
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY')
    
    // Helper para converter hex para bytes
    function hexToBytes(hex: string): Uint8Array {
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
      }
      return bytes;
    }
    
    // Detectar formato e validar
    let keyBytes: Uint8Array | null = null
    let keyFormat = 'unknown'
    
    if (encryptionKey) {
      try {
        // Tentar hex primeiro (64 caracteres = 32 bytes)
        if (encryptionKey.length === 64 && /^[0-9a-fA-F]+$/.test(encryptionKey)) {
          keyBytes = hexToBytes(encryptionKey)
          keyFormat = 'hex'
        }
        // Tentar base64 (44 caracteres = 32 bytes)
        else if (encryptionKey.length === 44 || encryptionKey.length === 43) {
          keyBytes = Uint8Array.from(atob(encryptionKey), c => c.charCodeAt(0))
          keyFormat = 'base64'
        }
        // Tentar base64 genérico
        else {
          try {
            keyBytes = Uint8Array.from(atob(encryptionKey), c => c.charCodeAt(0))
            if (keyBytes.length === 32) {
              keyFormat = 'base64'
            } else {
              keyBytes = null
            }
          } catch {
            keyBytes = null
          }
        }
      } catch (e) {
        console.error('[Security Audit] Error parsing key:', e)
        keyBytes = null
      }
    }
    
    const hasValidKey = keyBytes !== null && keyBytes.length === 32
    console.log('[Security Audit] Key configured:', !!encryptionKey, 'Format:', keyFormat, 'Valid:', hasValidKey, 'Length:', keyBytes?.length || 0)

    // Teste de criptografia
    let encryptionWorking = false
    let testError = null

    if (hasValidKey && keyBytes) {
      try {
        const testData = 'test-data-123'
        const encoder = new TextEncoder()
        const data = encoder.encode(testData)

        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          keyBytes,
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
        console.log('[Security Audit] Encryption test result:', encryptionWorking)
      } catch (error: any) {
        testError = error.message
        console.error('[Security Audit] Encryption test failed:', error)
      }
    } else if (encryptionKey) {
      testError = `Key length mismatch: expected 32 bytes, got ${keyBytes?.length || 'unknown'} (format: ${keyFormat})`
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
        key_format: keyFormat,
        algorithm: 'AES-256-GCM',
        test_passed: encryptionWorking,
        test_error: testError,
      },
      sensitive_data: sensitiveFieldsCount,
      audit: auditStats,
      recommendations: [] as any[],
    }

    // Gerar recomendações
    if (!encryptionKey) {
      report.recommendations.push({
        severity: 'critical',
        message: 'ENCRYPTION_KEY não configurada',
        action: 'Configure uma chave de 64 caracteres hexadecimais ou 44 caracteres base64 (32 bytes)',
      })
    } else if (!hasValidKey) {
      report.recommendations.push({
        severity: 'critical',
        message: 'ENCRYPTION_KEY inválida',
        action: `Formato detectado: ${keyFormat}. A chave deve ter 32 bytes (64 hex ou 44 base64)`,
      })
    }

    if (hasValidKey && !encryptionWorking) {
      report.recommendations.push({
        severity: 'critical',
        message: 'Teste de criptografia falhou',
        action: testError || 'Verifique a ENCRYPTION_KEY e reinstale se necessário',
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