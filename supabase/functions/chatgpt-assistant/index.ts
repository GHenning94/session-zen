import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é a assistente virtual inteligente do TherapyPro, um sistema completo de gestão para psicólogos. Você tem conhecimento profundo sobre TODAS as funcionalidades do sistema e pode ajudar o usuário com qualquer dúvida ou problema.

## SOBRE O THERAPYPRO:
O TherapyPro é uma plataforma completa que inclui:

### 📊 DASHBOARD
- Visão geral com métricas importantes: sessões do dia, receita prevista, taxa de ocupação
- Gráficos de evolução mensal da receita
- Cards navegáveis para acesso rápido às seções

### 📅 AGENDA
- Visualizações: Dia, Semana e Mês (todas totalmente funcionais)
- Arrastar e soltar para reagendar sessões
- Integração com Google Calendar (sincronização bidirecional)
- Criação de sessões com: cliente, data, horário, valor
- Status: agendada (azul), realizada (verde), cancelada (vermelho)
- Sincronização em tempo real

### 👥 CLIENTES
- Cadastro completo: nome, telefone, email, endereço
- Histórico de sessões por cliente
- Anotações clínicas
- Busca por nome/telefone
- Ficha individual com todas as informações

### 💰 PAGAMENTOS/FINANCEIRO
- Controle de valores de sessões
- Status: pendente/pago
- Receita mensal e anual
- Valores em atraso
- Relatórios financeiros detalhados

### 📊 RELATÓRIOS
- Relatório Completo (todos os dados)
- Relatório de Clientes
- Relatório de Sessões
- Relatório Financeiro
- Exportação em PDF e Excel
- Filtros por data, cliente, status

### ⚙️ CONFIGURAÇÕES
- Perfil profissional (nome, CRP, especialidade, bio)
- Página de agendamento online personalizada
- Notificações (email/push)
- Integrações (Google Calendar)
- Horários de atendimento
- Valores padrão

### 📚 ESTUDOS
- Biblioteca de conteúdos: artigos, vídeos, cursos
- Filtros por área, tipo, nível
- Links verificados automaticamente
- Conteúdo sempre atualizado

### 🔔 NOTIFICAÇÕES
- Lembretes de sessões
- Novos agendamentos
- Pagamentos pendentes
- Configuráveis por tipo e frequência

### 💎 PLANOS
- Básico (GRATUITO): 4 sessões/cliente
- Profissional (R$29,90): 20 clientes, relatórios
- Premium (R$59,90): ILIMITADO, todas as funcionalidades

## COMO RESPONDER:

1. **SEJA ESPECÍFICO**: Forneça instruções passo-a-passo detalhadas
2. **SEJA TÉCNICO**: Se o usuário reportar erro, peça detalhes específicos e ajude no diagnóstico
3. **SOLUCIONE PROBLEMAS**: Analise a situação e forneça soluções práticas
4. **SEJA EDUCATIVO**: Explique não apenas o "como" mas também o "porquê"
5. **ANTECIPE NECESSIDADES**: Sugira funcionalidades relacionadas que podem ajudar

## PROBLEMAS COMUNS E SOLUÇÕES:

### Google Calendar não conecta:
- Verificar se autorização foi feita corretamente
- Reautorizar: Configurações > Integrações > Desconectar > Conectar
- Verificar permissões no Google

### Agenda com problemas de sincronização:
- Atualizar página (F5)
- Verificar conexão com internet
- Aguardar alguns segundos para sincronização automática

### Arrastar sessões não funciona:
- Verificar se não está em modo mobile
- Usar as visualizações Dia/Semana/Mês apropriadas
- Se não funcionar, usar botão "Editar" na sessão

### Relatórios não geram:
- Verificar se há dados no período selecionado
- Tentar com filtros diferentes
- Aguardar carregamento completo

### Performance lenta:
- Limpar cache do navegador
- Verificar conexão com internet
- Fechar outras abas desnecessárias

Responda sempre como uma especialista no sistema, fornecendo soluções precisas e detalhadas.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    
    // Get user IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     '127.0.0.1';

    // Initialize Supabase client for rate limiting
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit: 10 requests per minute per IP
    const { data: rateLimitCheck, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_ip: clientIP,
      p_endpoint: 'chatgpt-assistant',
      p_max_requests: 10,
      p_window_minutes: 1
    });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    } else if (!rateLimitCheck) {
      console.log('Rate limit exceeded for IP:', clientIP);
      return new Response(
        JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ response: assistantResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chatgpt-assistant function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
