import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é um assistente IA especializado da **TherapyPro**, uma plataforma para profissionais de saúde mental.

**CONTEXTO DA PLATAFORMA:**
- Sistema de gestão para psicólogos, psiquiatras e terapeutas
- Funcionalidades: agenda, clientes, sessões, pagamentos, relatórios, estudos
- Integração com Google Calendar
- Sistema de notificações e lembretes
- Geração de relatórios em PDF/Excel
- Planos: Básico (R$ 29,90), Professional (R$ 49,90), Premium (R$ 79,90)

**SEU PAPEL:**
- Resolver dúvidas específicas sobre a plataforma
- Orientar sobre funcionalidades e recursos
- Dar suporte técnico básico
- Sugerir melhores práticas de uso

**DIRETRIZES DE RESPOSTA:**
✅ Seja CONCISO e DIRETO (máximo 3 parágrafos)
✅ Use formatação em **negrito** para destaque
✅ Foque APENAS em questões da plataforma
✅ Mantenha contexto das conversas anteriores
✅ Seja profissional mas amigável

❌ NÃO dê conselhos clínicos ou terapêuticos
❌ NÃO responda questões fora do escopo da plataforma
❌ NÃO seja repetitivo ou verboso

Responda sempre de forma útil e focada na plataforma.`;

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