import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SystemBranding {
  appName: string;
  appLogo: string | null;
  appTagline: string;
  isLoading: boolean;
}

export const useSystemBranding = (): SystemBranding => {
  const [appName, setAppName] = useState("CodeXAlpha");
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [appTagline, setAppTagline] = useState("AI-Powered Coach Positioning");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const { data } = await supabase
          .from("system_settings")
          .select("setting_key, setting_value")
          .in("setting_key", ["app_name", "app_logo_url", "app_tagline"]);

        if (data) {
          data.forEach((setting) => {
            // Handle both string and JSON values
            let value = setting.setting_value;
            if (typeof value === 'string') {
              value = value.replace(/^"|"$/g, "");
            }
            switch (setting.setting_key) {
              case "app_name":
                if (value) setAppName(String(value));
                break;
              case "app_logo_url":
                setAppLogo(value ? String(value) : null);
                break;
              case "app_tagline":
                if (value) setAppTagline(String(value));
                break;
            }
          });
        }
      } catch (error) {
        console.error("Error loading system branding:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBranding();
  }, []);

  // Update document title when app name changes
  useEffect(() => {
    if (!isLoading) {
      document.title = appName;
    }
  }, [appName, isLoading]);

  return { appName, appLogo, appTagline, isLoading };
};
