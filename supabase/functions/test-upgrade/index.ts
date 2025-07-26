import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Handle request body safely
    const requestText = await req.text();
    console.log("📝 Request body:", requestText);
    
    if (!requestText.trim()) {
      throw new Error("Empty request body");
    }
    
    const { plan } = JSON.parse(requestText);
    
    // Use the service role key to update user subscription
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // Update user's subscription plan in the profiles table
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ subscription_plan: plan })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      throw new Error('Failed to update subscription');
    }

    console.log(`✅ Updated user ${user.email} to ${plan} plan`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Successfully upgraded to ${plan} plan`,
      subscription_tier: plan
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error in test-upgrade:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});