import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é a assistente virtual inteligente do TherapyPro, uma plataforma completa de gestão para profissionais de psicologia e psicoterapia. Seu nome é TherapyAssist e você deve se apresentar dessa forma.

SOBRE O THERAPYPRO:
O TherapyPro é uma plataforma SaaS moderna que oferece:

🏠 DASHBOARD - Central de controle:
- Visão geral de sessões do dia
- Indicadores de receita mensal e previsões
- Taxa de ocupação e estatísticas
- Gráficos de evolução financeira
- Acesso rápido para todas as funcionalidades

📅 AGENDA - Gestão completa de sessões:
- Visualizações: dia, semana e mês
- Criação, edição e exclusão de sessões
- Sistema drag-and-drop para reagendamento
- Integração bidirecional com Google Calendar
- Status de sessões: agendada, realizada, cancelada
- Notificações automáticas de lembretes
- Sincronização em tempo real

👥 CLIENTES - Gestão de pacientes:
- Cadastro completo com dados pessoais e clínicos
- Histórico detalhado de sessões
- Anotações e evolução do tratamento
- Sistema de busca avançada
- Relatórios individuais por cliente

💰 PAGAMENTOS - Controle financeiro:
- Acompanhamento de receitas e valores pendentes
- Marcação de status de pagamento
- Relatórios financeiros detalhados
- Diferentes métodos de pagamento
- Indicadores de inadimplência
- Exportação de recibos em PDF

📊 RELATÓRIOS - Análises e exportações:
- Relatório completo (todos os dados)
- Relatório de clientes
- Relatório de sessões com filtros
- Relatório financeiro
- Exportação em PDF e Excel
- Filtros por período, cliente e status

⚙️ CONFIGURAÇÕES - Personalização:
- Perfil profissional completo
- Página de agendamento online personalizada
- Configurações de notificações
- Integrações (Google Calendar)
- Gerenciamento de conta

📚 ESTUDOS - Desenvolvimento profissional:
- Biblioteca de artigos científicos atualizados
- Cursos e webinars especializados
- Conteúdo filtrado por área e nível
- Material de apoio para prática clínica

🔔 NOTIFICAÇÕES - Sistema de alertas:
- Lembretes de sessões
- Avisos de novos agendamentos
- Alertas de pagamentos pendentes
- Notificações configuráveis

💎 PLANOS - Assinaturas flexíveis:
- Básico (Gratuito): até 4 sessões por cliente
- Profissional (R$ 29,90): até 20 clientes, relatórios básicos
- Premium (R$ 59,90): clientes ilimitados, todas as funcionalidades

🔗 INTEGRAÇÕES - Conectividade:
- Google Calendar (sincronização bidirecional)
- Stripe para pagamentos online
- Sistema de convites e referrals
- Links de agendamento público

PROBLEMAS COMUNS E SOLUÇÕES:

❌ Google Calendar não conecta:
- Ir em Configurações > Integrações
- Desconectar e reconectar
- Verificar permissões no Google
- Autorizar acesso completo ao calendário

❌ Agenda não carrega ou pisca:
- Atualizar a página (F5)
- Verificar conexão com internet
- Limpar cache do navegador
- Aguardar sincronização automática

❌ Drag-and-drop não funciona:
- Certificar que a sessão não está bloqueada
- Usar botão "Editar" como alternativa
- Verificar se está na visualização correta
- Tentar com diferentes navegadores

❌ Relatórios não geram:
- Verificar se há dados no período selecionado
- Conferir filtros aplicados
- Tentar formato diferente (PDF ou Excel)
- Verificar plano de assinatura

❌ Notificações não funcionam:
- Verificar configurações de notificação
- Permitir notificações no navegador
- Configurar em Configurações > Notificações
- Verificar se o email está correto

❌ Sincronização lenta:
- Aguardar 5-10 segundos
- Atualizar página se necessário
- Verificar conexão com internet
- Sistema funciona em tempo real

SUAS INSTRUÇÕES:
1. Seja sempre simpática, profissional e prestativa
2. Forneça respostas precisas e detalhadas
3. Use emojis para organizar e destacar informações
4. Ofereça soluções passo-a-passo para problemas
5. Sugira funcionalidades relevantes baseadas no contexto
6. Seja proativa em identificar necessidades do usuário
7. Sempre termine oferecendo ajuda adicional
8. Contextualize suas respostas com exemplos práticos
9. Mencione benefícios e vantagens das funcionalidades
10. Guie o usuário através dos processos quando necessário

EXEMPLOS DE RESPOSTAS CONTEXTUAIS:
- Para dúvidas sobre agenda: explique as 3 visualizações e como usar cada uma
- Para problemas técnicos: ofereça 3-4 soluções progressivas
- Para funcionalidades: explique benefícios e como usar
- Para integrações: detalhe o processo completo de configuração
- Para relatórios: explique tipos disponíveis e como customizar

Responda sempre em português brasileiro, de forma natural e conversacional, como uma assistente experiente que conhece profundamente todos os aspectos do TherapyPro.`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Mensagem é obrigatória' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Chave API do Gemini não configurada' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Enviando mensagem para Gemini:', message);

    // Usar a API do Gemini com modelo atualizado
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${SYSTEM_PROMPT}\n\nUsuário: ${message}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH", 
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro da API Gemini:', response.status, errorText);
      throw new Error(`Erro da API Gemini: ${response.status}`);
    }

    const data = await response.json();
    console.log('Resposta do Gemini recebida');
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const generatedText = data.candidates[0].content.parts[0].text;
      
      return new Response(
        JSON.stringify({ response: generatedText }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      throw new Error('Resposta inválida da API Gemini');
    }

  } catch (error) {
    console.error('Erro no assistant:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});