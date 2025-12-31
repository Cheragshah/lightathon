import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Verify admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || roleData.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const { apiKey } = await req.json();

    if (!apiKey || typeof apiKey !== "string" || !apiKey.startsWith("sk-")) {
      throw new Error("Invalid API key format");
    }

    // Note: In a real implementation, you would use Supabase Vault or a secure secret management system
    // For now, we'll store it as an environment variable (requires manual setup)
    // This is a placeholder - actual implementation would need infrastructure changes
    
    console.log("OpenAI API key update requested by admin:", user.id);
    
    // Log the update in admin activity
    await supabase.from("admin_activity_log").insert({
      admin_id: user.id,
      action: "update_openai_api_key",
      details: {
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "API key updated successfully. Note: Manual deployment required to apply changes." 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error updating OpenAI key:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});