import { Link } from "react-router-dom";
import { LightBeamBackground } from "@/components/LightBeamBackground";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";

const Landing = () => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      <LightBeamBackground />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
        {/* Main Title with glass effect */}
        <div className="space-y-6">
          <div className="inline-block">
            <h1 
              className="text-display-lg text-foreground px-8 py-4 animate-title-glow"
              style={{
                background: "hsl(220 20% 15% / 0.7)",
                backdropFilter: "blur(12px)",
                border: "1px solid hsl(185 85% 55% / 0.2)",
                borderRadius: "0.5rem",
              }}
            >
              LIGHTATHON
            </h1>
          </div>
          
          <p 
            className="inline-block text-sm sm:text-base font-medium tracking-[0.4em] uppercase text-primary/90 px-6 py-2"
            style={{
              background: "hsl(220 20% 15% / 0.5)",
              backdropFilter: "blur(8px)",
              border: "1px solid hsl(185 85% 55% / 0.15)",
              borderRadius: "0.375rem",
            }}
          >
            Journey to LightOS
          </p>
        </div>

        {/* Subtitle */}
        <p className="max-w-xl mx-auto text-lg sm:text-xl text-muted-foreground leading-relaxed">
          Transform your life with daily challenges. Build habits, earn points, 
          and climb the leaderboard.
        </p>

        {/* CTA Button */}
        <div className="pt-6">
          <Button
            asChild
            size="lg"
            className="btn-gradient h-14 px-12 text-base font-semibold tracking-wide glow-cyan"
          >
            <Link to="/dashboard" className="flex items-center gap-3">
              Enter Here
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Logo */}
        <div className="flex justify-center pt-12">
          <img 
            src={logo} 
            alt="Inner Clarity HUB" 
            className="h-14 w-14 rounded-full opacity-80 hover:opacity-100 transition-opacity" 
          />
        </div>

        {/* Footer */}
        <footer className="pt-8 border-t border-border/30">
          <p className="text-xs text-muted-foreground mb-4">
            © {new Date().getFullYear()} Inner Clarity Hub™. All rights reserved.
          </p>
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground/70">
            <span className="hover:text-muted-foreground transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-muted-foreground transition-colors cursor-pointer">Terms of Service</span>
            <span className="hover:text-muted-foreground transition-colors cursor-pointer">Contact</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
