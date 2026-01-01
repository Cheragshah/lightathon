import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { LogOut, User, Shield, Menu, X, LayoutDashboard } from "lucide-react";
import { useState, useEffect } from "react";
import { ThemeToggle } from "./ThemeToggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface NavigationProps {
  isAuthenticated: boolean;
}

export const Navigation = ({ isAuthenticated }: NavigationProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const [appName, setAppName] = useState("CodeXAlpha");
  const [appLogo, setAppLogo] = useState("/logo.png");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      setMobileMenuOpen(false);
      navigate("/");
      toast({
        title: "Signed out successfully",
      });
    }
  };

  const handleNavigate = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const NavItems = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {isAuthenticated ? (
        <>
          <Button
            variant="ghost"
            onClick={() => handleNavigate("/dashboard")}
            className={`gap-2 justify-start ${isMobile ? "w-full" : ""}`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => handleNavigate("/profile")}
            className={`gap-2 justify-start ${isMobile ? "w-full" : ""}`}
          >
            <User className="h-4 w-4" />
            Profile
          </Button>
          
          {isAdmin && (
            <Button
              variant="ghost"
              onClick={() => handleNavigate("/admin")}
              className={`gap-2 justify-start ${isMobile ? "w-full" : ""}`}
            >
              <Shield className="h-4 w-4" />
              Admin
              {!isMobile && (
                <Badge variant="secondary" className="ml-1">
                  Admin
                </Badge>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className={`gap-2 justify-start ${isMobile ? "w-full" : ""}`}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="ghost"
            onClick={() => handleNavigate("/auth")}
            className={isMobile ? "w-full justify-start" : ""}
          >
            Sign In
          </Button>
          <Button
            onClick={() => handleNavigate("/auth")}
            className={`bg-primary hover:bg-primary/90 ${isMobile ? "w-full" : ""}`}
          >
            Get Started
          </Button>
        </>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 safe-area-top">
      <div className="container mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <button 
          onClick={() => navigate("/")}
          className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity min-w-0"
        >
          <img src={appLogo} alt={appName} className="h-8 sm:h-9 w-auto flex-shrink-0" />
          <span className="text-lg sm:text-xl font-bold text-gradient-primary truncate">
            {appName}
          </span>
        </button>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <NavItems />
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <img src={appLogo} alt={appName} className="h-8 w-auto" />
                  {appName}
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2 mt-6">
                <NavItems isMobile />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};
