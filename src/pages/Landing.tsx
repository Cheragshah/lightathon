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
        {/* Main Title */}
        <div className="space-y-6">
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extralight tracking-tight">
            <span className="text-gradient-primary">LIGHTATHON</span>
          </h1>
          
          <p className="text-sm sm:text-base font-medium tracking-[0.4em] uppercase text-muted-foreground">
            Journey to LightOS
          </p>
        </div>

        {/* Subtitle */}
        <p className="max-w-xl mx-auto text-lg sm:text-xl text-muted-foreground leading-relaxed font-light">
          Transform your thinking patterns. Achieve mental clarity. 
          Upgrade your mindset with guided daily practices.
        </p>

        {/* CTA Button */}
        <div className="pt-8">
          <Button
            asChild
            size="lg"
            className="btn-gradient h-14 px-12 text-base font-medium tracking-wide"
          >
            <Link to="/dashboard" className="flex items-center gap-3">
              Begin Your Journey
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Logo */}
        <div className="flex justify-center pt-10">
          <img 
            src={logo} 
            alt="Inner Clarity HUB" 
            className="h-14 w-14 rounded-full opacity-70 hover:opacity-100 transition-opacity" 
          />
        </div>

        {/* Footer */}
        <footer className="pt-16">
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} Inner Clarity HUB
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
