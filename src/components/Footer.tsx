import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Footer = () => {
  const [appName, setAppName] = useState("CodeXAlpha");
  const [appLogo, setAppLogo] = useState("/logo.png");

  useEffect(() => {
    loadSystemSettings();
  }, []);

  const loadSystemSettings = async () => {
    try {
      const { data: nameData } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "app_name")
        .maybeSingle();

      const { data: logoData } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "app_logo_url")
        .maybeSingle();

      if (nameData) {
        setAppName(String(nameData.setting_value).replace(/^"|"$/g, ''));
      }
      
      if (logoData) {
        setAppLogo(String(logoData.setting_value).replace(/^"|"$/g, ''));
      }
    } catch (error) {
      console.error("Error loading system settings:", error);
    }
  };

  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={appLogo} alt={appName} className="h-8 w-auto" />
          </div>
          
          <div className="text-sm text-muted-foreground text-center md:text-right">
            <p>&copy; {new Date().getFullYear()} {appName}. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
