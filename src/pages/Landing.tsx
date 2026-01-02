import { Link } from "react-router-dom";
import { LightBeamBackground } from "@/components/LightBeamBackground";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";

const Landing = () => {
  return (
    <div className="relative min-h-screen min-h-[100dvh] flex flex-col items-center justify-center px-4 sm:px-6 overflow-hidden">
      <LightBeamBackground />

      <div className="relative z-10 w-full max-w-4xl mx-auto text-center space-y-6 sm:space-y-8 animate-fade-in py-8 sm:py-0">
        {/* Logo at top */}
        <div className="flex justify-center mb-4 sm:mb-8">
          <div className="relative">
            <img 
              src={logo} 
              alt="Inner Clarity HUB" 
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-full opacity-90 hover:opacity-100 transition-all duration-300 hover:scale-105" 
            />
            <div 
              className="absolute inset-0 rounded-full animate-pulse"
              style={{
                background: "radial-gradient(circle, hsl(210 100% 55% / 0.3) 0%, transparent 70%)",
                filter: "blur(10px)",
              }}
            />
          </div>
        </div>

        {/* Main Title with enhanced glass effect */}
        <div className="space-y-4 sm:space-y-6">
          <div className="inline-block relative">
            <div 
              className="absolute inset-0 rounded-xl animate-title-glow"
              style={{
                background: "linear-gradient(135deg, hsl(210 100% 55% / 0.2) 0%, hsl(220 100% 50% / 0.1) 100%)",
                filter: "blur(20px)",
              }}
            />
            <h1 
              className="relative font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white px-6 sm:px-10 py-4 sm:py-6 animate-title-glow tracking-wider"
              style={{
                background: "linear-gradient(180deg, hsl(225 50% 8% / 0.85) 0%, hsl(225 50% 12% / 0.75) 100%)",
                backdropFilter: "blur(20px)",
                border: "1px solid hsl(210 100% 55% / 0.3)",
                borderRadius: "1rem",
                boxShadow: "inset 0 1px 0 hsl(210 100% 70% / 0.1), 0 20px 40px -10px hsl(210 100% 50% / 0.3)",
              }}
            >
              LIGHTATHON
            </h1>
          </div>
          
          <p 
            className="inline-flex items-center gap-2 text-xs sm:text-sm md:text-base font-medium tracking-[0.3em] sm:tracking-[0.4em] uppercase text-primary px-4 sm:px-6 py-2"
            style={{
              background: "hsl(225 50% 10% / 0.6)",
              backdropFilter: "blur(12px)",
              border: "1px solid hsl(210 100% 55% / 0.2)",
              borderRadius: "0.5rem",
            }}
          >
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            Journey to LightOS
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
          </p>
        </div>

        {/* Subtitle */}
        <p className="max-w-md sm:max-w-xl mx-auto text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed px-2">
          Transform your life with daily challenges. Build habits, earn points, 
          and climb the leaderboard.
        </p>

        {/* CTA Button */}
        <div className="pt-4 sm:pt-6">
          <Button
            asChild
            size="lg"
            className="btn-gradient h-12 sm:h-14 px-8 sm:px-12 text-sm sm:text-base font-semibold tracking-wide glow-blue"
          >
            <Link to="/dashboard" className="flex items-center gap-2 sm:gap-3">
              Enter Here
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Footer */}
        <footer className="pt-8 sm:pt-12 border-t border-border/20 mt-8">
          <p className="text-xs text-muted-foreground mb-3 sm:mb-4">
            © {new Date().getFullYear()} Inner Clarity Hub™. All rights reserved.
          </p>
          <div className="flex items-center justify-center gap-4 sm:gap-6 text-xs text-muted-foreground/70">
            <span className="hover:text-primary transition-colors cursor-pointer">Privacy</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Terms</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Contact</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
