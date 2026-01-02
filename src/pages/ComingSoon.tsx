import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LightBeamBackground } from "@/components/LightBeamBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const ComingSoon = () => {
  const navigate = useNavigate();
  const [logoClickCount, setLogoClickCount] = useState(0);

  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);
    
    if (newCount >= 3) {
      navigate('/auth');
      setLogoClickCount(0);
    }
    
    setTimeout(() => setLogoClickCount(0), 2000);
  };

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [targetDate, setTargetDate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchTargetDate = async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "countdown_target_date")
        .single();

      if (!error && data) {
        const dateString = typeof data.value === 'string' ? data.value : JSON.stringify(data.value);
        setTargetDate(new Date(dateString.replace(/"/g, '')));
      } else {
        setTargetDate(new Date("2025-02-01T00:00:00Z"));
      }
    };

    fetchTargetDate();
  }, []);

  useEffect(() => {
    if (!targetDate) return;

    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("early_signups")
        .insert([{ email }]);

      if (error) {
        if (error.code === "23505") {
          toast.info("You're already on the list!");
          setIsSubscribed(true);
        } else {
          throw error;
        }
      } else {
        setIsSubscribed(true);
        toast.success("Welcome! You'll be the first to know when we launch.");
      }
    } catch (error) {
      console.error("Error signing up:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const CountdownCard = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div 
        className="px-3 py-2 sm:px-5 sm:py-4 min-w-[60px] sm:min-w-[80px] md:min-w-[100px] text-center"
        style={{
          background: "linear-gradient(180deg, hsl(225 50% 10% / 0.8) 0%, hsl(225 50% 8% / 0.9) 100%)",
          backdropFilter: "blur(16px)",
          border: "1px solid hsl(210 100% 55% / 0.25)",
          borderRadius: "0.75rem",
          boxShadow: "inset 0 1px 0 hsl(210 100% 70% / 0.1), 0 8px 20px -5px hsl(210 100% 50% / 0.25)",
        }}
      >
        <span className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white">
          {value.toString().padStart(2, "0")}
        </span>
      </div>
      <span className="text-[10px] sm:text-xs text-muted-foreground mt-2 uppercase tracking-widest font-medium">
        {label}
      </span>
    </div>
  );

  return (
    <div className="relative min-h-screen min-h-[100dvh] flex flex-col items-center justify-center px-4 sm:px-6 overflow-hidden">
      <LightBeamBackground />

      <div className="relative z-10 w-full max-w-4xl mx-auto text-center space-y-6 sm:space-y-8 animate-fade-in py-6 sm:py-0">
        {/* Title */}
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
            Coming Soon
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
          </p>
        </div>

        {/* Countdown Timer */}
        <div className="flex justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6">
          <CountdownCard value={timeLeft.days} label="Days" />
          <CountdownCard value={timeLeft.hours} label="Hours" />
          <CountdownCard value={timeLeft.minutes} label="Mins" />
          <CountdownCard value={timeLeft.seconds} label="Secs" />
        </div>

        {/* Email Signup */}
        <div className="max-w-sm sm:max-w-md mx-auto px-2">
          {isSubscribed ? (
            <div 
              className="flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4"
              style={{
                background: "hsl(142 76% 36% / 0.15)",
                border: "1px solid hsl(142 76% 36% / 0.35)",
                borderRadius: "0.75rem",
              }}
            >
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
              <span className="text-success text-xs sm:text-sm">
                You're on the list! We'll notify you when we launch.
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <p className="text-muted-foreground text-xs sm:text-sm">
                Be the first to experience Lightathon. Sign up for early access.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 sm:pl-11 h-11 sm:h-12 bg-secondary/60 border-primary/25 backdrop-blur-xl text-sm"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 sm:h-12 px-6 sm:px-8 btn-gradient font-semibold glow-blue text-sm"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Notify Me"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Logo */}
        <div className="flex justify-center pt-2 sm:pt-4">
          <div className="relative">
            <img 
              src={logo} 
              alt="Inner Clarity HUB" 
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-full opacity-80 cursor-pointer transition-all hover:opacity-100 hover:scale-105" 
              onClick={handleLogoClick}
            />
            <div 
              className="absolute inset-0 rounded-full animate-pulse"
              style={{
                background: "radial-gradient(circle, hsl(210 100% 55% / 0.25) 0%, transparent 70%)",
                filter: "blur(8px)",
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-6 sm:pt-8 border-t border-border/20">
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

export default ComingSoon;
