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

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
}

function formatTime(time: string): string {
  return time.substring(0, 5);
}

function generateEmailHtml(userName: string, clientName: string, sessionDate: string, sessionTime: string, reason?: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sessão Cancelada - TherapyPro</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f7;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">❌ Sessão Cancelada</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Uma sessão foi cancelada</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Olá, <strong>${userName}</strong>,
              </p>
              
              <p style="margin: 0 0 25px; color: #374151; font-size: 16px; line-height: 1.6;">
                Informamos que a seguinte sessão foi cancelada:
              </p>
              
              <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; padding: 25px; margin: 20px 0; border-left: 4px solid #dc2626;">
                <table role="presentation" style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #6b7280; font-size: 14px;">Paciente</span><br>
                      <span style="color: #1f2937; font-size: 18px; font-weight: 600;">${clientName}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #6b7280; font-size: 14px;">Data</span><br>
                      <span style="color: #1f2937; font-size: 16px; font-weight: 500; text-decoration: line-through;">${sessionDate}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #6b7280; font-size: 14px;">Horário</span><br>
                      <span style="color: #dc2626; font-size: 24px; font-weight: 700; text-decoration: line-through;">${sessionTime}</span>
                    </td>
                  </tr>
                  ${reason ? `
                  <tr>
                    <td style="padding: 12px 0 0;">
                      <span style="color: #6b7280; font-size: 14px;">Motivo</span><br>
                      <span style="color: #1f2937; font-size: 14px;">${reason}</span>
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <p style="margin: 25px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                O horário ficou disponível novamente na sua agenda para novos agendamentos.
              </p>
              
              <div style="margin-top: 30px; text-align: center;">
                <a href="https://therapypro.app.br/agenda" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1d4ed8 0%, #7e22ce 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  Ver Agenda
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} TherapyPro. Todos os direitos reservados.
              </p>
              <p style="margin: 10px 0 0; color: #9ca3af; font-size: 12px;">
                Este é um email automático. Para desativá-lo, acesse Configurações → Notificações.
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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, sessionId, clientId, clientName, sessionDate, sessionTime, reason } = await req.json();

    if (!userId) {
      throw new Error("Missing required field: userId");
    }

    console.log("[send-booking-cancelled-email] Processing for user:", userId);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if user has booking_cancelled notification enabled (handle duplicates by getting most recent)
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('enabled, events')
      .eq('user_id', userId)
      .eq('type', 'email')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.log("[send-booking-cancelled-email] Error fetching settings:", settingsError);
    }

    const events = settings?.events as string[] || [];
    if (!settings?.enabled || !events.includes('booking_cancelled')) {
      console.log("[send-booking-cancelled-email] User has booking_cancelled notifications disabled");
      return new Response(
        JSON.stringify({ success: true, message: 'Notification disabled for this user', skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

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

    // Get client name if not provided
    let resolvedClientName = clientName;
    if (!resolvedClientName && clientId) {
      const { data: client } = await supabase
        .from('clients')
        .select('nome')
        .eq('id', clientId)
        .single();
      resolvedClientName = client?.nome || 'Paciente';
    }

    // Format date and time
    const formattedDate = formatDate(sessionDate);
    const formattedTime = formatTime(sessionTime);

    // Generate and send email
    const html = generateEmailHtml(userName, resolvedClientName || 'Paciente', formattedDate, formattedTime, reason);
    const token = await getSendPulseToken();
    await sendEmail(token, userEmail, `❌ Sessão cancelada: ${resolvedClientName} - TherapyPro`, html);

    console.log("[send-booking-cancelled-email] ✅ Email sent to:", userEmail);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[send-booking-cancelled-email] ❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
