import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  personaRunId: string;
  userId: string;
}

interface EmailTemplate {
  subject: string;
  heading: string;
  body_text: string;
  button_text: string;
  footer_text: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
}

const DEFAULT_TEMPLATE: EmailTemplate = {
  subject: '🎉 Your Codexes for "{{persona_title}}" are ready!',
  heading: "🎉 Your Codexes Are Ready!",
  body_text: 'Great news! Your persona "{{persona_title}}" has finished generating.',
  button_text: "View Your Codexes →",
  footer_text: "You can now download your codexes as PDFs or share them with others.",
  primary_color: "#f97316",
  secondary_color: "#ea580c",
  background_color: "#fff7ed",
  text_color: "#374151",
};

function replacePlaceholders(text: string, data: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { personaRunId, userId }: NotificationRequest = await req.json();

    console.log(`Sending notification for persona run ${personaRunId} to user ${userId}`);

    // Check if notifications are enabled
    const { data: enabledSetting } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "email_notifications_enabled")
      .maybeSingle();

    if (enabledSetting?.setting_value === false) {
      console.log("Email notifications are disabled, skipping");
      return new Response(
        JSON.stringify({ success: false, message: "Email notifications are disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Resend API key from system_settings
    const { data: resendSetting, error: settingError } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "resend_api_key")
      .maybeSingle();

    if (settingError || !resendSetting?.setting_value) {
      console.log("Resend API key not configured, skipping email notification");
      return new Response(
        JSON.stringify({ success: false, message: "Email notifications not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = String(resendSetting.setting_value);
    
    if (!resendApiKey || resendApiKey === "" || resendApiKey === "null") {
      console.log("Resend API key is empty, skipping email notification");
      return new Response(
        JSON.stringify({ success: false, message: "Email notifications not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user email from auth
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !userData?.user?.email) {
      console.error("Could not get user email:", userError);
      return new Response(
        JSON.stringify({ success: false, message: "Could not get user email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userEmail = userData.user.email;
    const userName = userData.user.user_metadata?.full_name || userData.user.email.split('@')[0];

    // Get persona run details
    const { data: personaRun, error: runError } = await supabase
      .from("persona_runs")
      .select("title, status")
      .eq("id", personaRunId)
      .single();

    if (runError || !personaRun) {
      console.error("Could not get persona run:", runError);
      return new Response(
        JSON.stringify({ success: false, message: "Could not get persona run details" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get codex completion stats
    const { data: codexes } = await supabase
      .from("codexes")
      .select("codex_name, status, completed_sections, total_sections")
      .eq("persona_run_id", personaRunId);

    const completedCodexes = codexes?.filter(c => c.status === "ready" || c.status === "ready_with_errors") || [];
    const failedCodexes = codexes?.filter(c => c.status === "failed") || [];

    // Get from email setting
    const { data: fromEmailSetting } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "notification_from_email")
      .maybeSingle();

    const fromEmail = fromEmailSetting?.setting_value 
      ? String(fromEmailSetting.setting_value) 
      : "Codex Generator <onboarding@resend.dev>";

    // Get email template
    const { data: templateSetting } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "email_template")
      .maybeSingle();

    const template: EmailTemplate = templateSetting?.setting_value 
      ? { ...DEFAULT_TEMPLATE, ...(templateSetting.setting_value as Partial<EmailTemplate>) }
      : DEFAULT_TEMPLATE;

    console.log("Using email template:", template);

    // Dynamically import Resend
    const { Resend } = await import("https://esm.sh/resend@2.0.0");
    const resend = new Resend(resendApiKey);

    // Prepare placeholder data
    const placeholderData: Record<string, string> = {
      persona_title: personaRun.title,
      codex_count: String(completedCodexes.length),
      user_name: userName,
    };

    // Build email content
    const codexList = completedCodexes.map(c => `✅ ${c.codex_name}`).join("<br>");
    const failedList = failedCodexes.length > 0 
      ? `<br><br><strong>Failed Codexes:</strong><br>${failedCodexes.map(c => `❌ ${c.codex_name}`).join("<br>")}`
      : "";

    const viewUrl = `${supabaseUrl?.replace('.supabase.co', '.lovable.app') || 'https://your-app.lovable.app'}/persona-run/${personaRunId}`;

    // Apply placeholders to template
    const subject = replacePlaceholders(template.subject, placeholderData);
    const heading = replacePlaceholders(template.heading, placeholderData);
    const bodyText = replacePlaceholders(template.body_text, placeholderData);
    const buttonText = replacePlaceholders(template.button_text, placeholderData);
    const footerText = replacePlaceholders(template.footer_text, placeholderData);

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: ${template.primary_color}; margin-bottom: 24px;">${heading}</h1>
        
        <p style="font-size: 16px; color: ${template.text_color}; line-height: 1.6;">
          ${bodyText}
        </p>
        
        <div style="background: linear-gradient(135deg, ${template.background_color} 0%, ${template.background_color}dd 100%); border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid ${template.primary_color};">
          <h3 style="margin: 0 0 12px 0; color: ${template.secondary_color};">Completed Codexes (${completedCodexes.length})</h3>
          <p style="margin: 0; color: ${template.text_color}; line-height: 1.8;">
            ${codexList || "No codexes completed"}
          </p>
          ${failedList}
        </div>
        
        <a href="${viewUrl}" style="display: inline-block; background: linear-gradient(135deg, ${template.primary_color} 0%, ${template.secondary_color} 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
          ${buttonText}
        </a>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 32px;">
          ${footerText}
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
        
        <p style="font-size: 12px; color: #9ca3af;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [userEmail],
      subject: subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});