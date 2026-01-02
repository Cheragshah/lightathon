import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { LogOut, User, Settings, Menu, LayoutDashboard } from "lucide-react";
import { useState, useEffect } from "react";
import { ThemeToggle } from "./ThemeToggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import logo from "@/assets/logo.png";

interface NavigationProps {
  isAuthenticated: boolean;
}

export const Navigation = ({ isAuthenticated }: NavigationProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const [appName, setAppName] = useState("LightOS");
  const [appLogo, setAppLogo] = useState(logo);
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

  const NavItems = ({ isMobile = false }: { isMobile?: boolean }) => {
    const baseClasses = isMobile
      ? "flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted rounded-lg transition-colors w-full justify-start"
      : "text-sm text-muted-foreground hover:text-foreground transition-colors";

    if (isAuthenticated) {
      return (
        <>
          <button
            onClick={() => handleNavigate("/dashboard")}
            className={isMobile ? baseClasses : `flex items-center gap-2 ${baseClasses}`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </button>
          
          <button
            onClick={() => handleNavigate("/profile")}
            className={isMobile ? baseClasses : `flex items-center gap-2 ${baseClasses}`}
          >
            <User className="h-4 w-4" />
            <span>Profile</span>
          </button>
          
          {isAdmin && (
            <button
              onClick={() => handleNavigate("/admin")}
              className={isMobile ? baseClasses : `flex items-center gap-2 ${baseClasses}`}
            >
              <Settings className="h-4 w-4" />
              <span>Admin</span>
            </button>
          )}
          
          <button
            onClick={handleSignOut}
            className={isMobile ? baseClasses : `flex items-center gap-2 ${baseClasses}`}
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </>
      );
    }

    return (
      <>
        <Button
          variant="ghost"
          onClick={() => handleNavigate("/auth")}
          className={isMobile ? "w-full justify-start" : "text-sm"}
        >
          Sign In
        </Button>
        <Button
          onClick={() => handleNavigate("/auth")}
          size="sm"
          className={`btn-gradient ${isMobile ? "w-full" : ""}`}
        >
          Get Started
        </Button>
      </>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/50">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <button 
          onClick={() => navigate("/")}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img src={appLogo} alt={appName} className="h-8 w-8 rounded-full" />
          <span className="font-semibold text-foreground hidden sm:block">
            {appName}
          </span>
        </button>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <NavItems />
          <ThemeToggle />
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetHeader className="p-4 border-b border-border">
                <SheetTitle className="flex items-center gap-3">
                  <img src={appLogo} alt={appName} className="h-8 w-8 rounded-full" />
                  {appName}
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col p-4 space-y-1">
                <NavItems isMobile />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
};
