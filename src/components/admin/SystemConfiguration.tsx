import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Loader2, Upload, X, Clock, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

export const SystemConfiguration = () => {
  const [appName, setAppName] = useState<string>("");
  const [appTagline, setAppTagline] = useState<string>("");
  const [comingSoonEnabled, setComingSoonEnabled] = useState<boolean>(false);
  const [countdownDate, setCountdownDate] = useState<Date | undefined>(undefined);
  const [countdownTime, setCountdownTime] = useState<string>("00:00");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingComingSoon, setSavingComingSoon] = useState(false);
  const [savingCountdown, setSavingCountdown] = useState(false);
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
          // Handle both string and JSON values
          let value = setting.setting_value;
          if (typeof value === 'string') {
            value = value.replace(/^"|"$/g, '');
          }
          switch (setting.setting_key) {
            case "app_name":
              if (value) setAppName(String(value));
              break;
            case "app_logo_url":
              const logoValue = value ? String(value) : '';
              setCurrentLogoUrl(logoValue);
              setLogoPreview(logoValue);
              break;
            case "app_tagline":
              if (value) setAppTagline(String(value));
              break;
          }
        });
      }

      // Load coming soon setting from app_settings
      const { data: comingSoonData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "coming_soon_enabled")
        .maybeSingle();

      if (comingSoonData?.value !== undefined) {
        setComingSoonEnabled(comingSoonData.value === true || comingSoonData.value === "true");
      }

      // Load countdown target date
      const { data: countdownData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "countdown_target_date")
        .maybeSingle();

      if (countdownData?.value) {
        const dateString = typeof countdownData.value === 'string' 
          ? countdownData.value.replace(/"/g, '') 
          : String(countdownData.value);
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          setCountdownDate(date);
          setCountdownTime(format(date, "HH:mm"));
        }
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

      // Upsert app name (insert or update)
      const { error: nameError } = await supabase
        .from("system_settings")
        .upsert({
          setting_key: "app_name",
          setting_value: appName,
          description: "Application name displayed in header, footer, and browser title",
          updated_by: session?.user?.id,
        }, { onConflict: 'setting_key' });

      if (nameError) throw nameError;

      // Upsert tagline
      const { error: taglineError } = await supabase
        .from("system_settings")
        .upsert({
          setting_key: "app_tagline",
          setting_value: appTagline,
          description: "Application tagline displayed on splash screen",
          updated_by: session?.user?.id,
        }, { onConflict: 'setting_key' });

      if (taglineError) throw taglineError;

      // Upsert logo URL if changed
      if (logoUrl && logoUrl !== currentLogoUrl) {
        const { error: logoError } = await supabase
          .from("system_settings")
          .upsert({
            setting_key: "app_logo_url",
            setting_value: logoUrl,
            description: "Application logo URL",
            updated_by: session?.user?.id,
          }, { onConflict: 'setting_key' });

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
        {/* Coming Soon Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <Label htmlFor="comingSoon" className="text-base font-medium">Coming Soon Mode</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, non-admin users will see the coming soon page
              </p>
            </div>
          </div>
          <Switch
            id="comingSoon"
            checked={comingSoonEnabled}
            disabled={savingComingSoon}
            onCheckedChange={async (checked) => {
              setSavingComingSoon(true);
              try {
                const { error } = await supabase
                  .from("app_settings")
                  .update({ value: checked })
                  .eq("key", "coming_soon_enabled");

                if (error) throw error;

                setComingSoonEnabled(checked);
                toast({
                  title: checked ? "Coming Soon Mode Enabled" : "Coming Soon Mode Disabled",
                  description: checked 
                    ? "Non-admin users will now see the coming soon page" 
                    : "All users can now access the full site",
                });
              } catch (error: any) {
                toast({
                  title: "Error updating setting",
                  description: error.message,
                  variant: "destructive",
                });
              } finally {
                setSavingComingSoon(false);
              }
            }}
          />
        </div>

        {/* Countdown Timer Configuration - Only show when Coming Soon is enabled */}
        {comingSoonEnabled && (
          <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <Label className="text-base font-medium">Countdown Timer</Label>
                <p className="text-sm text-muted-foreground">
                  Set the target date and time for the coming soon countdown
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label>Target Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {countdownDate ? format(countdownDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={countdownDate}
                      onSelect={setCountdownDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>Target Time</Label>
                <Input
                  type="time"
                  value={countdownTime}
                  onChange={(e) => setCountdownTime(e.target.value)}
                  className="w-[140px]"
                />
              </div>
              
              <Button
                onClick={async () => {
                  if (!countdownDate) {
                    toast({
                      title: "Select a date",
                      description: "Please select a target date for the countdown",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  setSavingCountdown(true);
                  try {
                    const [hours, minutes] = countdownTime.split(':').map(Number);
                    const targetDateTime = new Date(countdownDate);
                    targetDateTime.setHours(hours, minutes, 0, 0);
                    
                    const { error } = await supabase
                      .from("app_settings")
                      .upsert({
                        key: "countdown_target_date",
                        value: targetDateTime.toISOString(),
                      }, { onConflict: 'key' });

                    if (error) throw error;

                    toast({
                      title: "Countdown Updated",
                      description: `Timer set to ${format(targetDateTime, "PPP 'at' p")}`,
                    });
                  } catch (error: any) {
                    toast({
                      title: "Error saving countdown",
                      description: error.message,
                      variant: "destructive",
                    });
                  } finally {
                    setSavingCountdown(false);
                  }
                }}
                disabled={savingCountdown || !countdownDate}
              >
                {savingCountdown ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Countdown
              </Button>
            </div>
            
            {countdownDate && (
              <p className="text-sm text-muted-foreground">
                Current target: {format(new Date(countdownDate.setHours(...countdownTime.split(':').map(Number) as [number, number])), "PPP 'at' p")}
              </p>
            )}
          </div>
        )}

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