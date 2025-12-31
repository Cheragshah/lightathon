import { ReactNode } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { LightBeamBackground } from "@/components/LightBeamBackground";
import { Button } from "@/components/ui/button";

interface TagMangoAuthProviderProps {
  children: ReactNode;
}

export const TagMangoAuthProvider = ({ children }: TagMangoAuthProviderProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const refreshToken = searchParams.get('refreshToken');
  const hasToken = !!refreshToken;

  useEffect(() => {
    const verifyAndSignIn = async () => {
      if (!refreshToken) return;

      setIsLoading(true);
      setError(null);

      try {
        console.log('Verifying TagMango token...');
        
        // Call the edge function to verify the token
        const { data, error: fnError } = await supabase.functions.invoke('verify-tagmango-token', {
          body: { refreshToken },
        });

        if (fnError) {
          console.error('Edge function error:', fnError);
          throw new Error(fnError.message || 'Failed to verify token');
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Verification failed');
        }

        console.log('Token verified, signing in...');

        // Use the magic link token to sign in
        if (data.token && data.type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: data.token,
            type: 'magiclink',
          });

          if (verifyError) {
            console.error('OTP verification error:', verifyError);
            // Try alternative sign-in method using the action link
            if (data.actionLink) {
              window.location.href = data.actionLink;
              return;
            }
            throw verifyError;
          }
        }

        toast.success('Welcome! You have been signed in successfully.');
        
        // Remove the refreshToken from URL and stay on current path
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('refreshToken');
        
        // Determine redirect path - stay on current path unless it's coming-soon
        const currentPath = location.pathname;
        const redirectPath = currentPath === '/coming-soon' ? '/dashboard' : currentPath;
        
        // Update URL without the token
        navigate(redirectPath + (newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''), { replace: true });
        
      } catch (err) {
        console.error('TagMango auth error:', err);
        const message = err instanceof Error ? err.message : 'Authentication failed';
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    verifyAndSignIn();
  }, [refreshToken, navigate, searchParams, location.pathname]);

  // Show loading state when TagMango token is being verified
  if (hasToken && isLoading) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden bg-background">
        <LightBeamBackground />
        <div className="relative z-10 text-center space-y-6">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-xl text-muted-foreground">Signing you in...</p>
        </div>
      </div>
    );
  }

  // Show error state if TagMango authentication failed
  if (hasToken && error) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden bg-background">
        <LightBeamBackground />
        <div className="relative z-10 max-w-md mx-auto text-center space-y-6">
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-6 py-8">
            <h2 className="text-2xl font-bold text-destructive mb-4">Authentication Failed</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button 
              onClick={() => {
                // Remove token and reload
                const newSearchParams = new URLSearchParams(searchParams);
                newSearchParams.delete('refreshToken');
                navigate(location.pathname + (newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''), { replace: true });
                setError(null);
              }}
              variant="outline"
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
