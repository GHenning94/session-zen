import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, accessToken, calendarId = 'primary', eventData } = await req.json();

    // Google API Key não é necessário para OAuth2
    // A autorização é feita via access token do usuário

    let response;
    const baseUrl = 'https://www.googleapis.com/calendar/v3';

    switch (action) {
      case 'listEvents':
        const eventsUrl = `${baseUrl}/calendars/${calendarId}/events?timeMin=${new Date().toISOString()}&maxResults=250&singleEvents=true&orderBy=startTime`;
        response = await fetch(eventsUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        break;

      case 'createEvent':
        const createUrl = `${baseUrl}/calendars/${calendarId}/events`;
        response = await fetch(createUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        });
        break;

      default:
        throw new Error('Invalid action');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Google Calendar API error');
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Google Calendar API Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});