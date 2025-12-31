import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/auth", "/signup", "/share", "/documentation"];

export const useAuthSession = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith("/share/")
  );

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle session expiry
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
          if (!isPublicRoute) {
            toast.error('Your session has expired. Please log in again.');
            navigate('/auth');
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Redirect to login if not authenticated and on protected route
      if (!session && !isPublicRoute) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isPublicRoute]);

  // Helper to validate session before admin actions
  const validateSession = useCallback(async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Your session has expired. Please log in again.');
      navigate('/auth');
      return false;
    }
    return true;
  }, [navigate]);

  return { session, user, loading, validateSession };
};
