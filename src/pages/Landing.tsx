import { Link } from "react-router-dom";
import { LightBeamBackground } from "@/components/LightBeamBackground";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";

const Landing = () => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      <LightBeamBackground />

      <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8 animate-fade-in">
        {/* Tagline */}
        <p className="text-xs sm:text-sm font-medium tracking-[0.3em] uppercase text-muted-foreground">
          Mindset Transformation
        </p>

        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-display-lg font-extralight">
            <span className="text-foreground">Flow:</span>
            <span className="block text-gradient-primary mt-2">Dense to LightOS</span>
          </h1>
        </div>

        {/* Subtitle */}
        <p className="max-w-xl mx-auto text-lg sm:text-xl text-muted-foreground leading-relaxed font-light">
          Transform your thinking patterns. Achieve mental clarity. 
          Upgrade your mindset with guided daily practices.
        </p>

        {/* CTA Button */}
        <div className="pt-6">
          <Button
            asChild
            size="lg"
            className="btn-gradient h-14 px-10 text-base font-medium tracking-wide"
          >
            <Link to="/dashboard" className="flex items-center gap-3">
              Begin Your Journey
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Logo */}
        <div className="flex justify-center pt-8">
          <img 
            src={logo} 
            alt="Inner Clarity HUB" 
            className="h-16 w-16 rounded-full opacity-80 hover:opacity-100 transition-opacity" 
          />
        </div>

        {/* Footer */}
        <footer className="pt-12 border-t border-border/30">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Inner Clarity HUB. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
