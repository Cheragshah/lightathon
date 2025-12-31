import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Loader2, Upload, X } from "lucide-react";

export const SystemConfiguration = () => {
  const [appName, setAppName] = useState<string>("");
  const [appTagline, setAppTagline] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load all branding settings at once
      const { data } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["app_name", "app_logo_url", "app_tagline"]);

      if (data) {
        data.forEach((setting) => {
          const value = String(setting.setting_value).replace(/^"|"$/g, '');
          switch (setting.setting_key) {
            case "app_name":
              setAppName(value);
              break;
            case "app_logo_url":
              setCurrentLogoUrl(value);
              setLogoPreview(value);
              break;
            case "app_tagline":
              setAppTagline(value);
              break;
          }
        });
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

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Logo must be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.match(/^image\/(jpeg|png|webp|svg\+xml)$/)) {
      toast({
        title: "Invalid file type",
        description: "Logo must be JPG, PNG, WEBP, or SVG",
        variant: "destructive",
      });
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return currentLogoUrl || null;

    setUploading(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `system-logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('pdf-template-assets')
        .upload(fileName, logoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('pdf-template-assets')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error: any) {
      toast({
        title: "Error uploading logo",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!appName.trim()) {
      toast({
        title: "Validation error",
        description: "App name is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Upload logo if changed
      const logoUrl = await uploadLogo();
      if (logoFile && !logoUrl) {
        setSaving(false);
        return;
      }

      // Update app name
      const { error: nameError } = await supabase
        .from("system_settings")
        .update({
          setting_value: JSON.stringify(appName),
          updated_by: session?.user?.id,
        })
        .eq("setting_key", "app_name");

      if (nameError) throw nameError;

      // Update tagline
      const { error: taglineError } = await supabase
        .from("system_settings")
        .update({
          setting_value: JSON.stringify(appTagline),
          updated_by: session?.user?.id,
        })
        .eq("setting_key", "app_tagline");

      if (taglineError) throw taglineError;

      // Update logo URL if changed
      if (logoUrl && logoUrl !== currentLogoUrl) {
        const { error: logoError } = await supabase
          .from("system_settings")
          .update({
            setting_value: JSON.stringify(logoUrl),
            updated_by: session?.user?.id,
          })
          .eq("setting_key", "app_logo_url");

        if (logoError) throw logoError;
        setCurrentLogoUrl(logoUrl);
      }

      toast({
        title: "Settings saved",
        description: "System configuration updated successfully. Refresh the page to see changes.",
      });
      
      setLogoFile(null);
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

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(currentLogoUrl);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          System Configuration
        </CardTitle>
        <CardDescription>
          Configure application branding settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* App Name */}
        <div className="space-y-2">
          <Label htmlFor="appName">Application Name</Label>
          <Input
            id="appName"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="CodeXAlpha"
            className="max-w-md"
          />
          <p className="text-sm text-muted-foreground">
            This name will appear in the header, footer, splash screen, and browser title
          </p>
        </div>

        {/* App Tagline */}
        <div className="space-y-2">
          <Label htmlFor="appTagline">Application Tagline</Label>
          <Textarea
            id="appTagline"
            value={appTagline}
            onChange={(e) => setAppTagline(e.target.value)}
            placeholder="AI-Powered Coach Positioning"
            className="max-w-md resize-none"
            rows={2}
          />
          <p className="text-sm text-muted-foreground">
            This tagline appears on the splash screen below the app name
          </p>
        </div>

        {/* App Logo */}
        <div className="space-y-2">
          <Label>Application Logo</Label>
          <div className="flex flex-col gap-4">
            {logoPreview && (
              <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-background">
                <img 
                  src={logoPreview} 
                  alt="Logo preview" 
                  className="w-full h-full object-contain"
                />
                {logoFile && (
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('logo-upload')?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {logoFile ? 'Change Logo' : 'Upload Logo'}
              </Button>
              <input
                id="logo-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleLogoSelect}
                className="hidden"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Max 2MB. Formats: JPG, PNG, WEBP, SVG. Used in header, footer, and favicon.
          </p>
        </div>
        {/* Save Button */}
        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving || uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {uploading ? 'Uploading...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};