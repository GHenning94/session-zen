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
    const { userId, planName, billingInterval, invoiceUrl, invoicePdf, amount } = await req.json();

    if (!userId || !planName) {
      throw new Error("Missing required fields: userId, planName");
    }

    console.log("[send-upgrade-email] Processing for user:", userId);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userData?.user?.email) {
      throw new Error("User not found");
    }

    const userEmail = userData.user.email;

    // Get user profile name
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome")
      .eq("user_id", userId)
      .single();

    const userName = profile?.nome || "Usuário";
    const planDisplayName = planName === "premium" ? "Premium" : "Profissional";
    const intervalDisplay = billingInterval === "yearly" ? "Anual" : "Mensal";
    const amountDisplay = amount ? `R$ ${(amount / 100).toFixed(2).replace(".", ",")}` : "";

    // Build email HTML
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Plano ${planDisplayName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f7;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #1d4ed8 0%, #7e22ce 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🎉 Parabéns!</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Seu upgrade foi realizado com sucesso</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Olá <strong>${userName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Sua assinatura do plano <strong>${planDisplayName} ${intervalDisplay}</strong> foi ativada com sucesso!
              </p>
              
              ${amountDisplay ? `
              <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 600;">Valor da cobrança</p>
                <p style="margin: 5px 0 0; color: #1d4ed8; font-size: 24px; font-weight: 700;">${amountDisplay}</p>
              </div>
              ` : ""}
              
              <p style="margin: 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Agora você tem acesso a todos os recursos ${planDisplayName === "Premium" ? "premium" : "profissionais"} do TherapyPro!
              </p>
              
              ${invoiceUrl || invoicePdf ? `
              <div style="margin: 30px 0; text-align: center;">
                ${invoiceUrl ? `
                <a href="${invoiceUrl}" target="_blank" style="display: inline-block; margin: 5px; padding: 12px 24px; background-color: #1d4ed8; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  Ver Recibo
                </a>
                ` : ""}
                ${invoicePdf ? `
                <a href="${invoicePdf}" target="_blank" style="display: inline-block; margin: 5px; padding: 12px 24px; background-color: #6b7280; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  Download PDF
                </a>
                ` : ""}
              </div>
              ` : ""}
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Você pode gerenciar sua assinatura e ver seu histórico de cobranças em Configurações → Assinatura.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} TherapyPro. Todos os direitos reservados.
              </p>
              <p style="margin: 10px 0 0; color: #9ca3af; font-size: 12px;">
                Este é um email automático. Por favor, não responda.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send email via SendPulse
    const token = await getSendPulseToken();
    await sendEmail(
      token,
      userEmail,
      `✅ Seu plano ${planDisplayName} foi ativado - TherapyPro`,
      html
    );

    console.log("[send-upgrade-email] ✅ Email sent successfully to:", userEmail);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[send-upgrade-email] ❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
