import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Save, Loader2, Eye, EyeOff, ExternalLink, Palette, RotateCcw } from "lucide-react";

const DEFAULT_TEMPLATE = {
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

export const EmailSettings = () => {
  const [resendApiKey, setResendApiKey] = useState<string>("");
  const [fromEmail, setFromEmail] = useState<string>("Codex Generator <onboarding@resend.dev>");
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Template settings
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load Resend API key
      const { data: apiKeyData } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "resend_api_key")
        .maybeSingle();

      if (apiKeyData?.setting_value) {
        setResendApiKey(String(apiKeyData.setting_value));
      }

      // Load from email
      const { data: fromEmailData } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "notification_from_email")
        .maybeSingle();

      if (fromEmailData?.setting_value) {
        setFromEmail(String(fromEmailData.setting_value));
      }

      // Load notifications enabled
      const { data: enabledData } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "email_notifications_enabled")
        .maybeSingle();

      if (enabledData?.setting_value !== undefined) {
        setNotificationsEnabled(Boolean(enabledData.setting_value));
      }

      // Load email template
      const { data: templateData } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "email_template")
        .maybeSingle();

      if (templateData?.setting_value) {
        const savedTemplate = templateData.setting_value as Record<string, string>;
        setTemplate({ ...DEFAULT_TEMPLATE, ...savedTemplate });
      }
    } catch (error: any) {
      toast({
        title: "Error loading settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const upsertSetting = async (key: string, value: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Check if setting exists
    const { data: existing } = await supabase
      .from("system_settings")
      .select("id")
      .eq("setting_key", key)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("system_settings")
        .update({
          setting_value: value,
          updated_by: session?.user?.id,
        })
        .eq("setting_key", key);
    } else {
      await supabase
        .from("system_settings")
        .insert({
          setting_key: key,
          setting_value: value,
          description: `Email notification setting: ${key}`,
          updated_by: session?.user?.id,
        });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertSetting("resend_api_key", resendApiKey);
      await upsertSetting("notification_from_email", fromEmail);
      await upsertSetting("email_notifications_enabled", notificationsEnabled);
      await upsertSetting("email_template", template);

      toast({
        title: "Settings saved",
        description: "Email notification settings have been updated",
      });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetTemplate = () => {
    setTemplate(DEFAULT_TEMPLATE);
    toast({
      title: "Template reset",
      description: "Email template has been reset to defaults. Remember to save!",
    });
  };

  const updateTemplate = (key: keyof typeof DEFAULT_TEMPLATE, value: string) => {
    setTemplate(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Configure email notifications sent to users when their codexes are ready.
            Uses <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
              Resend <ExternalLink className="h-3 w-3" />
            </a> for email delivery.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send emails to users when their codexes finish generating
              </p>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>

          {/* Resend API Key */}
          <div className="space-y-2">
            <Label htmlFor="resend-api-key">Resend API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="resend-api-key"
                  type={showApiKey ? "text" : "password"}
                  value={resendApiKey}
                  onChange={(e) => setResendApiKey(e.target.value)}
                  placeholder="re_xxxxxxxxxx"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Get your API key from{" "}
              <a 
                href="https://resend.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                resend.com/api-keys
              </a>
            </p>
          </div>

          {/* From Email */}
          <div className="space-y-2">
            <Label htmlFor="from-email">From Email Address</Label>
            <Input
              id="from-email"
              type="text"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="Your App <noreply@yourdomain.com>"
            />
            <p className="text-sm text-muted-foreground">
              Must be from a verified domain in Resend. Use "onboarding@resend.dev" for testing.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email Template Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Email Template
              </CardTitle>
              <CardDescription>
                Customize the email template with your branding and messages. Use {"{{persona_title}}"} and {"{{codex_list}}"} as placeholders.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetTemplate}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Default
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="content" className="space-y-4">
            <TabsList>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="colors">Colors</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  value={template.subject}
                  onChange={(e) => updateTemplate("subject", e.target.value)}
                  placeholder="Your Codexes are ready!"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="heading">Email Heading</Label>
                <Input
                  id="heading"
                  value={template.heading}
                  onChange={(e) => updateTemplate("heading", e.target.value)}
                  placeholder="🎉 Your Codexes Are Ready!"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body_text">Body Text</Label>
                <Textarea
                  id="body_text"
                  value={template.body_text}
                  onChange={(e) => updateTemplate("body_text", e.target.value)}
                  placeholder="Great news! Your persona has finished generating."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Available placeholders: {"{{persona_title}}"}, {"{{codex_count}}"}, {"{{user_name}}"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="button_text">Button Text</Label>
                <Input
                  id="button_text"
                  value={template.button_text}
                  onChange={(e) => updateTemplate("button_text", e.target.value)}
                  placeholder="View Your Codexes →"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="footer_text">Footer Text</Label>
                <Textarea
                  id="footer_text"
                  value={template.footer_text}
                  onChange={(e) => updateTemplate("footer_text", e.target.value)}
                  placeholder="You can now download your codexes as PDFs."
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="colors" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary_color"
                      type="color"
                      value={template.primary_color}
                      onChange={(e) => updateTemplate("primary_color", e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={template.primary_color}
                      onChange={(e) => updateTemplate("primary_color", e.target.value)}
                      placeholder="#f97316"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary_color">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary_color"
                      type="color"
                      value={template.secondary_color}
                      onChange={(e) => updateTemplate("secondary_color", e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={template.secondary_color}
                      onChange={(e) => updateTemplate("secondary_color", e.target.value)}
                      placeholder="#ea580c"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="background_color">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="background_color"
                      type="color"
                      value={template.background_color}
                      onChange={(e) => updateTemplate("background_color", e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={template.background_color}
                      onChange={(e) => updateTemplate("background_color", e.target.value)}
                      placeholder="#fff7ed"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="text_color">Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="text_color"
                      type="color"
                      value={template.text_color}
                      onChange={(e) => updateTemplate("text_color", e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={template.text_color}
                      onChange={(e) => updateTemplate("text_color", e.target.value)}
                      placeholder="#374151"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview">
              <div className="border rounded-lg overflow-hidden">
                <div 
                  style={{ 
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    maxWidth: "600px",
                    margin: "0 auto",
                    padding: "20px",
                    backgroundColor: "#ffffff"
                  }}
                >
                  <h1 style={{ color: template.primary_color, marginBottom: "24px" }}>
                    {template.heading}
                  </h1>
                  
                  <p style={{ fontSize: "16px", color: template.text_color, lineHeight: 1.6 }}>
                    {template.body_text.replace("{{persona_title}}", "My Coach Persona")}
                  </p>
                  
                  <div style={{ 
                    background: `linear-gradient(135deg, ${template.background_color} 0%, ${template.background_color}dd 100%)`,
                    borderRadius: "12px",
                    padding: "20px",
                    margin: "24px 0",
                    borderLeft: `4px solid ${template.primary_color}`
                  }}>
                    <h3 style={{ margin: "0 0 12px 0", color: template.secondary_color }}>
                      Completed Codexes (3)
                    </h3>
                    <p style={{ margin: 0, color: template.text_color, lineHeight: 1.8 }}>
                      ✅ Identity Codex<br/>
                      ✅ Methodology Codex<br/>
                      ✅ Communication Codex
                    </p>
                  </div>
                  
                  <button style={{ 
                    display: "inline-block",
                    background: `linear-gradient(135deg, ${template.primary_color} 0%, ${template.secondary_color} 100%)`,
                    color: "white",
                    padding: "14px 28px",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: 600,
                    margin: "16px 0",
                    cursor: "pointer"
                  }}>
                    {template.button_text}
                  </button>
                  
                  <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "32px" }}>
                    {template.footer_text}
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save All Email Settings
          </>
        )}
      </Button>
    </div>
  );
};