import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LightBeamBackground } from "@/components/LightBeamBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
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
      <div className="bg-card/60 backdrop-blur-xl border border-border rounded-xl px-4 py-3 sm:px-6 sm:py-4 min-w-[70px] sm:min-w-[90px]">
        <span className="text-3xl sm:text-4xl md:text-5xl font-light text-foreground">
          {value.toString().padStart(2, "0")}
        </span>
      </div>
      <span className="text-xs text-muted-foreground mt-2 uppercase tracking-widest">
        {label}
      </span>
    </div>
  );

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      <LightBeamBackground />

      <div className="relative z-10 max-w-3xl mx-auto text-center space-y-10 animate-fade-in">
        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extralight tracking-tight">
            <span className="text-gradient-primary">LIGHTATHON</span>
          </h1>
          <p className="text-sm sm:text-base font-medium tracking-[0.4em] uppercase text-muted-foreground">
            Coming Soon
          </p>
        </div>

        {/* Countdown Timer */}
        <div className="flex justify-center gap-3 sm:gap-4 md:gap-6">
          <CountdownCard value={timeLeft.days} label="Days" />
          <CountdownCard value={timeLeft.hours} label="Hours" />
          <CountdownCard value={timeLeft.minutes} label="Mins" />
          <CountdownCard value={timeLeft.seconds} label="Secs" />
        </div>

        {/* Email Signup */}
        <div className="max-w-md mx-auto">
          {isSubscribed ? (
            <div className="flex items-center justify-center gap-3 bg-primary/10 border border-primary/30 rounded-xl px-6 py-4">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="text-foreground text-sm">
                You're on the list! We'll notify you when we launch.
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Be the first to experience Lightathon. Sign up for early access.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-12 bg-card/60 border-border backdrop-blur-xl"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 px-8 btn-gradient font-medium"
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
        <div className="flex justify-center pt-4">
          <img 
            src={logo} 
            alt="Inner Clarity HUB" 
            className="h-14 w-14 rounded-full opacity-70 cursor-pointer transition-all hover:opacity-100 hover:scale-105" 
            onClick={handleLogoClick}
          />
        </div>

        {/* Footer */}
        <footer className="pt-8">
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} Inner Clarity HUB
          </p>
        </footer>
      </div>
    </div>
  );
};

export default ComingSoon;
