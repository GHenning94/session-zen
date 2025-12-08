import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DowngradeEmailRequest {
  email: string;
  userName: string;
  previousPlan: string;
  cancelAt: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, userName, previousPlan, cancelAt }: DowngradeEmailRequest = await req.json();

    console.log("[send-downgrade-email] Sending remarketing email to:", email);

    // Autenticar com SendPulse
    const authResponse = await fetch("https://api.sendpulse.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: Deno.env.get("SENDPULSE_API_ID"),
        client_secret: Deno.env.get("SENDPULSE_API_SECRET"),
      }),
    });

    const authData = await authResponse.json();
    
    if (!authData.access_token) {
      throw new Error("Falha na autenticação SendPulse");
    }

    const accessToken = authData.access_token;
    const cancelDate = new Date(cancelAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const getPlanName = (plan: string) => {
      switch (plan) {
        case 'premium': return 'Premium';
        case 'pro': return 'Profissional';
        default: return 'Básico';
      }
    };

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sentiremos sua falta - TherapyPro</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
        Sentiremos sua falta 💜
      </h1>
    </div>
    
    <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 20px;">
        Olá, <strong>${userName || 'Profissional'}</strong>!
      </p>
      
      <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 20px;">
        Recebemos sua solicitação de cancelamento do plano <strong>${getPlanName(previousPlan)}</strong>.
      </p>
      
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>⚡ Seu acesso premium continua até ${cancelDate}</strong><br>
          Aproveite ao máximo todas as funcionalidades até lá!
        </p>
      </div>
      
      <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 20px;">
        Sabemos que a decisão de cancelar não é fácil. Queremos que saiba que estamos sempre trabalhando para melhorar o TherapyPro.
      </p>
      
      <div style="background: #f0fdf4; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="color: #166534; margin: 0 0 16px 0; font-size: 18px;">
          🎁 Oferta especial para você voltar
        </h3>
        <p style="color: #166534; margin: 0 0 16px 0; font-size: 14px;">
          Se mudar de ideia, temos uma surpresa: <strong>20% de desconto</strong> no primeiro mês ao reativar sua assinatura!
        </p>
        <a href="https://therapypro.app.br/upgrade" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Reativar com Desconto
        </a>
      </div>
      
      <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 20px;">
        <strong>O que você perderá após ${cancelDate}:</strong>
      </p>
      
      <ul style="color: #6b7280; font-size: 14px; line-height: 1.8; padding-left: 20px;">
        <li>Relatórios avançados em PDF</li>
        <li>Integrações com Google Calendar</li>
        <li>Suporte prioritário</li>
        <li>Pacientes/clientes ilimitados</li>
        <li>Prontuários e evoluções completos</li>
      </ul>
      
      <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 24px;">
        <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 0;">
          Ficou com alguma dúvida? Nosso suporte está aqui para ajudar!<br>
          <a href="mailto:suporte@therapypro.app.br" style="color: #667eea; text-decoration: none;">suporte@therapypro.app.br</a>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 32px;">
        <p style="font-size: 14px; color: #9ca3af; margin: 0;">
          Com carinho,<br>
          <strong style="color: #667eea;">Equipe TherapyPro</strong>
        </p>
      </div>
    </div>
    
    <div style="text-align: center; padding: 24px;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        © ${new Date().getFullYear()} TherapyPro. Todos os direitos reservados.<br>
        <a href="https://therapypro.app.br" style="color: #667eea; text-decoration: none;">therapypro.app.br</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Enviar email via SendPulse
    const emailResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: {
          html: emailHtml,
          text: `Olá ${userName}! Recebemos sua solicitação de cancelamento do plano ${getPlanName(previousPlan)}. Seu acesso continua até ${cancelDate}. Se mudar de ideia, visite https://therapypro.app.br/upgrade`,
          subject: "Sentiremos sua falta 💜 - TherapyPro",
          from: {
            name: "TherapyPro",
            email: "nao-responda@therapypro.app.br"
          },
          to: [{ email }]
        }
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("[send-downgrade-email] Email result:", emailResult);

    if (!emailResponse.ok) {
      throw new Error(`Erro ao enviar email: ${JSON.stringify(emailResult)}`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "Email de remarketing enviado com sucesso"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[send-downgrade-email] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error) 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
