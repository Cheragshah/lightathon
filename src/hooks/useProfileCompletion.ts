import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_whatsapp: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
  photograph_url: string | null;
  profile_completed: boolean | null;
  last_profile_prompt_at: string | null;
}

export const useProfileCompletion = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);

  const checkProfileCompletion = (profile: UserProfile | null): boolean => {
    if (!profile) return false;
    
    return !!(
      profile.first_name &&
      profile.last_name &&
      profile.email &&
      profile.phone_whatsapp &&
      profile.address &&
      profile.city &&
      profile.state &&
      profile.pin_code &&
      profile.photograph_url
    );
  };

  const shouldPromptUser = (profile: UserProfile | null): boolean => {
    if (!profile) return false;
    if (checkProfileCompletion(profile)) return false;

    const lastPrompt = profile.last_profile_prompt_at;
    if (!lastPrompt) return true;

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const lastPromptDate = new Date(lastPrompt);
    
    return lastPromptDate < fifteenMinutesAgo;
  };

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone_whatsapp, address, city, state, pin_code, photograph_url, profile_completed, last_profile_prompt_at")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
      }

      const profileData = data as UserProfile | null;
      setProfile(profileData);
      setShouldShowPrompt(shouldPromptUser(profileData));
    } catch (error) {
      console.error("Error in fetchProfile:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateLastPromptTime = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("profiles")
        .update({ last_profile_prompt_at: new Date().toISOString() })
        .eq("id", user.id);

      setShouldShowPrompt(false);
    } catch (error) {
      console.error("Error updating last prompt time:", error);
    }
  };

  const refreshProfile = () => {
    fetchProfile();
  };

  useEffect(() => {
    fetchProfile();

    // Check every minute if we should show the prompt again
    const interval = setInterval(() => {
      if (profile && !checkProfileCompletion(profile)) {
        setShouldShowPrompt(shouldPromptUser(profile));
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return {
    profile,
    loading,
    shouldShowPrompt,
    isProfileComplete: checkProfileCompletion(profile),
    dismissPrompt: updateLastPromptTime,
    refreshProfile,
  };
};
