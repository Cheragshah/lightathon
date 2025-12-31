import { Link } from "react-router-dom";
import { LightBeamBackground } from "@/components/LightBeamBackground";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";

const Landing = () => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      <LightBeamBackground />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8 sm:space-y-12">
        {/* Title */}
        <div className="space-y-6">
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-wider animate-title-float animate-title-glow">
            <span className="bg-gradient-to-b from-white via-white to-primary bg-clip-text text-transparent">
              LIGHTATHON
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-heading tracking-[0.4em] uppercase">
            Journey to LightOS
          </p>
        </div>

        {/* Tagline */}
        <p className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-foreground/80 leading-relaxed">
          Transform your life with daily challenges. Build habits, earn points, and climb the leaderboard.
        </p>

        {/* CTA Button */}
        <div className="pt-4">
          <Button
            asChild
            size="lg"
            className="h-14 px-10 text-lg font-heading font-semibold tracking-wide gradient-cyan glow-cyan transition-all duration-300 hover:scale-105"
          >
            <Link to="/dashboard" className="flex items-center gap-3">
              Enter Here
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>

        {/* Logo */}
        <div className="flex justify-center pt-4">
          <img src={logo} alt="Inner Clarity HUB" className="h-24 w-24 rounded-full" />
        </div>

        {/* Footer */}
        <footer className="pt-12 sm:pt-16 border-t border-border/30">
          <div className="flex flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>© 2025 Inner Clarity HUB. All rights reserved.</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
