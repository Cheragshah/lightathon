import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseTagMangoAuthResult {
  isLoading: boolean;
  error: string | null;
  hasToken: boolean;
}

export const useTagMangoAuth = (): UseTagMangoAuthResult => {
  const [searchParams] = useSearchParams();
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
            // For now, we'll redirect to the action link
            if (data.actionLink) {
              window.location.href = data.actionLink;
              return;
            }
            throw verifyError;
          }
        }

        toast.success('Welcome! You have been signed in successfully.');
        
        // Redirect to dashboard
        navigate('/dashboard', { replace: true });
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
  }, [refreshToken, navigate]);

  return { isLoading, error, hasToken };
};
