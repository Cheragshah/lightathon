import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useComingSoonRedirect = () => {
  const [isComingSoonEnabled, setIsComingSoonEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkComingSoonStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "coming_soon_enabled")
          .single();

        if (!error && data) {
          // Parse the JSON value - it could be a boolean or string
          const rawValue = data.value;
          const value = rawValue === true || rawValue === 'true' || String(rawValue) === 'true';
          setIsComingSoonEnabled(value);
        } else {
          setIsComingSoonEnabled(false);
        }
      } catch (error) {
        console.error("Error checking coming soon status:", error);
        setIsComingSoonEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkComingSoonStatus();
  }, []);

  return { isComingSoonEnabled, isLoading };
};
