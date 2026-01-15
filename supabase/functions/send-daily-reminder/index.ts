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

function formatTime(time: string): string {
  return time.substring(0, 5);
}

function generateSessionsTable(sessions: any[], clients: Map<string, string>): string {
  if (sessions.length === 0) {
    return `
      <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; text-align: center;">
        <p style="margin: 0; color: #16a34a; font-size: 16px;">
          ✨ Você não tem sessões agendadas para hoje. Aproveite seu dia de descanso!
        </p>
      </div>
    `;
  }

  const sortedSessions = sessions.sort((a, b) => a.horario.localeCompare(b.horario));

  let rows = sortedSessions.map((session, index) => {
    const clientName = clients.get(session.client_id) || "Cliente";
    const bgColor = index % 2 === 0 ? "#f9fafb" : "#ffffff";
    const statusColor = session.status === "confirmada" ? "#16a34a" : 
                       session.status === "cancelada" ? "#dc2626" : "#f59e0b";
    const statusText = session.status === "confirmada" ? "Confirmada" :
                      session.status === "cancelada" ? "Cancelada" : "Agendada";
    
    return `
      <tr style="background-color: ${bgColor};">
        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
          <span style="font-weight: 600; color: #1d4ed8; font-size: 16px;">${formatTime(session.horario)}</span>
        </td>
        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
          <span style="color: #374151; font-weight: 500;">${clientName}</span>
        </td>
        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          <span style="display: inline-block; padding: 4px 12px; background-color: ${statusColor}20; color: ${statusColor}; border-radius: 12px; font-size: 12px; font-weight: 600;">
            ${statusText}
          </span>
        </td>
      </tr>
    `;
  }).join("");

  return `
    <table role="presentation" style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <thead>
        <tr style="background: linear-gradient(135deg, #1d4ed8 0%, #7e22ce 100%);">
          <th style="padding: 16px; text-align: left; color: #ffffff; font-weight: 600; font-size: 14px;">Horário</th>
          <th style="padding: 16px; text-align: left; color: #ffffff; font-weight: 600; font-size: 14px;">Paciente</th>
          <th style="padding: 16px; text-align: center; color: #ffffff; font-weight: 600; font-size: 14px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function generateEmailHtml(userName: string, todayFormatted: string, sessionsHtml: string, sessionCount: number): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lembrete Diário - TherapyPro</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f7;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #1d4ed8 0%, #7e22ce 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">📅 Lembrete Diário</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">${todayFormatted}</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 10px; color: #374151; font-size: 16px; line-height: 1.6;">
                Bom dia, <strong>${userName}</strong>! 👋
              </p>
              
              <p style="margin: 0 0 25px; color: #374151; font-size: 16px; line-height: 1.6;">
                ${sessionCount > 0 
                  ? `Você tem <strong>${sessionCount} ${sessionCount === 1 ? 'sessão agendada' : 'sessões agendadas'}</strong> para hoje:`
                  : 'Veja seu resumo do dia:'}
              </p>
              
              ${sessionsHtml}
              
              <div style="margin-top: 30px; text-align: center;">
                <a href="https://therapypro.app.br/agenda" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1d4ed8 0%, #7e22ce 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  Ver Agenda Completa
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get current hour in Brazil timezone (UTC-3)
    const now = new Date();
    const brazilOffset = -3 * 60; // -3 hours in minutes
    const brazilTime = new Date(now.getTime() + (brazilOffset - now.getTimezoneOffset()) * 60000);
    const currentHour = brazilTime.getHours().toString().padStart(2, '0') + ':00';
    const today = brazilTime.toISOString().split('T')[0];
    
    console.log(`[send-daily-reminder] Running for hour: ${currentHour}, date: ${today}`);

    // Find all users with daily reminder enabled at this hour
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('user_id, time, events')
      .eq('type', 'email')
      .eq('enabled', true);

    if (settingsError) {
      throw new Error(`Error fetching notification settings: ${settingsError.message}`);
    }

    if (!settings || settings.length === 0) {
      console.log('[send-daily-reminder] No users with email notifications enabled');
      return new Response(
        JSON.stringify({ success: true, message: 'No users to notify', processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Filter users who have daily_reminder enabled and matching time
    const usersToNotify = settings.filter(s => {
      const events = s.events as string[] || [];
      const userTime = s.time ? s.time.substring(0, 5) : '07:00';
      return events.includes('daily_reminder') && userTime === currentHour;
    });

    console.log(`[send-daily-reminder] Found ${usersToNotify.length} users to notify at ${currentHour}`);

    if (usersToNotify.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No users to notify at this hour', processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get SendPulse token once for all emails
    const sendPulseToken = await getSendPulseToken();
    let successCount = 0;
    let errorCount = 0;

    for (const setting of usersToNotify) {
      try {
        const userId = setting.user_id;

        // Get user email
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
        if (userError || !userData?.user?.email) {
          console.error(`[send-daily-reminder] User ${userId} not found`);
          errorCount++;
          continue;
        }

        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome')
          .eq('user_id', userId)
          .single();

        const userName = profile?.nome || 'Usuário';
        const userEmail = userData.user.email;

        // Get today's sessions for this user (excluding cancelled)
        const { data: sessions, error: sessionsError } = await supabase
          .from('sessions')
          .select('id, client_id, horario, status, data')
          .eq('user_id', userId)
          .eq('data', today)
          .neq('status', 'cancelada')
          .order('horario', { ascending: true });

        if (sessionsError) {
          console.error(`[send-daily-reminder] Error fetching sessions for ${userId}:`, sessionsError);
          errorCount++;
          continue;
        }

        // Get client names
        const clientIds = [...new Set((sessions || []).map(s => s.client_id))];
        const clientsMap = new Map<string, string>();

        if (clientIds.length > 0) {
          const { data: clients } = await supabase
            .from('clients')
            .select('id, nome')
            .in('id', clientIds);

          (clients || []).forEach(c => clientsMap.set(c.id, c.nome));
        }

        // Format date for display
        const dateParts = today.split('-');
        const todayFormatted = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
          .toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        // Generate email
        const sessionsHtml = generateSessionsTable(sessions || [], clientsMap);
        const emailHtml = generateEmailHtml(userName, todayFormatted, sessionsHtml, (sessions || []).length);
        const sessionCount = (sessions || []).length;
        const subject = sessionCount > 0 
          ? `📅 Você tem ${sessionCount} ${sessionCount === 1 ? 'sessão' : 'sessões'} hoje - TherapyPro`
          : '📅 Sua agenda do dia - TherapyPro';

        // Send email
        await sendEmail(sendPulseToken, userEmail, subject, emailHtml);
        console.log(`[send-daily-reminder] ✅ Email sent to ${userEmail}`);
        successCount++;

      } catch (error) {
        console.error(`[send-daily-reminder] Error processing user:`, error);
        errorCount++;
      }
    }

    console.log(`[send-daily-reminder] Completed: ${successCount} sent, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Daily reminders sent`, 
        processed: usersToNotify.length,
        sent: successCount,
        errors: errorCount 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("[send-daily-reminder] ❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
