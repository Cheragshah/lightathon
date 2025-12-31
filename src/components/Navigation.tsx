import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { LogOut, User, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { ThemeToggle } from "./ThemeToggle";

interface NavigationProps {
  isAuthenticated: boolean;
}

export const Navigation = ({ isAuthenticated }: NavigationProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
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

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/");
      toast({
        title: "Signed out successfully",
      });
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <button 
          onClick={() => navigate("/")}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img src={appLogo} alt={appName} className="h-9 w-auto" />
          <span className="text-xl font-bold text-gradient-primary">
            {appName}
          </span>
        </button>
        
        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          {isAuthenticated ? (
            <>
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                className="gap-2 hidden sm:flex"
              >
                <User className="h-4 w-4" />
                Dashboard
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => navigate("/profile")}
                className="gap-2 hidden sm:flex"
              >
                <User className="h-4 w-4" />
                Profile
              </Button>
              
              {isAdmin && (
                <Button
                  variant="ghost"
                  onClick={() => navigate("/admin")}
                  className="gap-2"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                  <Badge variant="secondary" className="ml-1 hidden sm:inline-flex">
                    Admin
                  </Badge>
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => navigate("/auth")}
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate("/auth")}
                className="bg-primary hover:bg-primary/90"
              >
                Get Started
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
