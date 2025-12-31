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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { providerId, apiKey } = await req.json();

    if (!providerId || !apiKey) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if key already exists for this provider
    const { data: existingKey } = await supabase
      .from("ai_provider_keys")
      .select("id")
      .eq("provider_id", providerId)
      .single();

    if (existingKey) {
      // Update existing key
      const { error: updateError } = await supabase
        .from("ai_provider_keys")
        .update({
          api_key_encrypted: apiKey, // In production, encrypt this
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingKey.id);

      if (updateError) throw updateError;

      console.log(`Updated API key for provider ${providerId}`);
    } else {
      // Insert new key
      const { error: insertError } = await supabase
        .from("ai_provider_keys")
        .insert({
          provider_id: providerId,
          api_key_encrypted: apiKey, // In production, encrypt this
          created_by: user.id,
        });

      if (insertError) throw insertError;

      console.log(`Created API key for provider ${providerId}`);
    }

    // Log admin activity
    await supabase.from("admin_activity_log").insert({
      admin_id: user.id,
      action: existingKey ? "update_ai_provider_key" : "create_ai_provider_key",
      details: { provider_id: providerId },
    });

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error saving API key:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
