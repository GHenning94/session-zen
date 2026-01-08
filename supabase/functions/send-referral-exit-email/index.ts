import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDPULSE_API_ID = Deno.env.get("SENDPULSE_API_ID") || "";
const SENDPULSE_API_SECRET = Deno.env.get("SENDPULSE_API_SECRET") || "";

async function getSendPulseToken(): Promise<string> {
  const response = await fetch("https://api.sendpulse.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: SENDPULSE_API_ID,
      client_secret: SENDPULSE_API_SECRET,
    }),
  });

  const data = await response.json();
  if (!data.access_token) {
    throw new Error("Failed to get SendPulse access token");
  }
  return data.access_token;
}

async function sendEmail(
  token: string,
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const response = await fetch("https://api.sendpulse.com/smtp/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: {
        subject,
        from: { name: "TherapyPro", email: "nao-responda@therapypro.app.br" },
        to: [{ email: to }],
        html,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendPulse error: ${error}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, userName, userEmail, pendingCommissionsCancelled, totalReferrals } = await req.json();

    if (!userId || !userEmail) {
      throw new Error("Missing required fields: userId, userEmail");
    }

    console.log("[send-referral-exit-email] Processing for user:", userId);

    const exitDate = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

// Build email HTML - using string concatenation to avoid template literal issues
    const html = '<!DOCTYPE html>' +
      '<html lang="pt-BR">' +
      '<head>' +
      '  <meta charset="UTF-8">' +
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '  <title>Confirmação de Saída do Programa de Indicação</title>' +
      '</head>' +
      '<body style="margin: 0; padding: 0; font-family: \'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f7;">' +
      '  <table role="presentation" style="width: 100%; border-collapse: collapse;">' +
      '    <tr>' +
      '      <td style="padding: 40px 0;">' +
      '        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">' +
      '          <tr>' +
      '            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #6b7280 0%, #374151 100%); border-radius: 12px 12px 0 0;">' +
      '              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Programa de Indicação</h1>' +
      '              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Confirmação de Saída</p>' +
      '            </td>' +
      '          </tr>' +
      '          <tr>' +
      '            <td style="padding: 40px;">' +
      '              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">' +
      '                Olá <strong>' + (userName || 'Usuário') + '</strong>,' +
      '              </p>' +
      '              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">' +
      '                Confirmamos que você deixou o <strong>Programa de Indicação do TherapyPro</strong> em <strong>' + exitDate + '</strong>.' +
      '              </p>' +
      '              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">' +
      '                <p style="margin: 0 0 15px; color: #dc2626; font-size: 14px; font-weight: 600;">⚠️ Consequências da saída:</p>' +
      '                <ul style="margin: 0; padding-left: 20px; color: #7f1d1d; font-size: 14px; line-height: 1.8;">' +
      '                  <li>Seu link de indicação foi <strong>desativado permanentemente</strong></li>' +
      '                  <li>Você deixou de receber <strong>comissões futuras</strong>, incluindo recorrentes</li>' +
      (pendingCommissionsCancelled ? '<li>Comissões pendentes foram <strong>canceladas</strong></li>' : '') +
      '                  <li>Indicações anteriores (' + (totalReferrals || 0) + ') <strong>não serão reativadas</strong> em caso de reingresso</li>' +
      '                </ul>' +
      '              </div>' +
      '              <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0;">' +
      '                <p style="margin: 0 0 10px; color: #0369a1; font-size: 14px; font-weight: 600;">ℹ️ Informações importantes:</p>' +
      '                <ul style="margin: 0; padding-left: 20px; color: #0c4a6e; font-size: 14px; line-height: 1.8;">' +
      '                  <li>Os descontos concedidos aos seus indicados <strong>permanecem válidos</strong></li>' +
      '                  <li>Você pode reingressar no programa após <strong>30 dias</strong></li>' +
      '                  <li>Ao reingressar, um <strong>novo link será gerado</strong> e a contagem de indicados será reiniciada</li>' +
      '                </ul>' +
      '              </div>' +
      '              <p style="margin: 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">' +
      '                Se você saiu por engano ou tem alguma dúvida, entre em contato com nosso suporte.' +
      '              </p>' +
      '              <div style="margin: 30px 0; text-align: center;">' +
      '                <a href="https://therapypro.app.br/suporte" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #1d4ed8; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">' +
      '                  Falar com Suporte' +
      '                </a>' +
      '              </div>' +
      '            </td>' +
      '          </tr>' +
      '          <tr>' +
      '            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">' +
      '              <p style="margin: 0; color: #9ca3af; font-size: 12px;">' +
      '                © ' + new Date().getFullYear() + ' TherapyPro. Todos os direitos reservados.' +
      '              </p>' +
      '              <p style="margin: 10px 0 0; color: #9ca3af; font-size: 12px;">' +
      '                Este é um email automático. Por favor, não responda.' +
      '              </p>' +
      '            </td>' +
      '          </tr>' +
      '        </table>' +
      '      </td>' +
      '    </tr>' +
      '  </table>' +
      '</body>' +
      '</html>';

    console.log("[send-referral-exit-email] HTML length:", html.length);

    // Send email via SendPulse
    const token = await getSendPulseToken();
    await sendEmail(
      token,
      userEmail,
      "Confirmação de Saída do Programa de Indicação - TherapyPro",
      html
    );

    console.log("[send-referral-exit-email] ✅ Email sent successfully to:", userEmail);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[send-referral-exit-email] ❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
