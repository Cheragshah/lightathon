import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { LightBeamBackground } from "@/components/LightBeamBackground";
import { ArrowRight } from "lucide-react";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        handlePostLoginRedirect(session.user.id);
      }
    };
    
    checkUser();
  }, [navigate]);

  const handlePostLoginRedirect = async (userId: string) => {
    const intendedRoute = sessionStorage.getItem('intendedRoute');
    if (intendedRoute) {
      sessionStorage.removeItem('intendedRoute');
      navigate(intendedRoute);
      return;
    }

    try {
      const { data: role } = await supabase.rpc('get_user_role', { _user_id: userId });
      if (role === 'admin' || role === 'moderator') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      navigate('/dashboard');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      authSchema.parse({ email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } else if (data.user) {
      handlePostLoginRedirect(data.user.id);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <LightBeamBackground />
      
      <div className="w-full max-w-md relative z-10 page-transition">
        <Card className="border shadow-elevated">
          <CardHeader className="text-center space-y-2 pb-6">
            <CardTitle className="text-2xl font-medium">Welcome Back</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to continue your journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 btn-gradient font-medium" 
                disabled={loading}
              >
                {loading ? "Signing in..." : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-xs text-muted-foreground mt-6">
          Secure authentication powered by Supabase
        </p>
      </div>
    </div>
  );
}
