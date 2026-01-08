import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { avatar_path } = await req.json();

    if (!avatar_path) {
      return new Response(
        JSON.stringify({ error: "avatar_path is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role to generate signed URLs
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Normalize the path - remove any leading slashes and extract just the path
    let normalizedPath = avatar_path;
    
    // If it's already a full URL, extract the path
    if (avatar_path.includes('user-uploads/')) {
      const pathMatch = avatar_path.match(/user-uploads\/(.+)/);
      if (pathMatch) {
        normalizedPath = pathMatch[1];
      }
    }

    // Remove any leading slashes
    normalizedPath = normalizedPath.replace(/^\/+/, '');

    console.log('[get-public-avatar] Generating signed URL for:', normalizedPath);

    // Generate a signed URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from("user-uploads")
      .createSignedUrl(normalizedPath, 3600);

    if (error) {
      console.error('[get-public-avatar] Error generating signed URL:', error);
      return new Response(
        JSON.stringify({ error: "Failed to generate signed URL", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('[get-public-avatar] Generated signed URL successfully');

    return new Response(
      JSON.stringify({ signedUrl: data.signedUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[get-public-avatar] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
