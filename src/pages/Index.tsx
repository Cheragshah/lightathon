import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LightBeamBackground } from "@/components/LightBeamBackground";
import { Sparkles, Target, TrendingUp, FileText, Download, CheckCircle, Shield, Brain, Layers, Zap, ArrowRight } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeCodexes, setActiveCodexes] = useState<any[]>([]);
  const navigate = useNavigate();
  
  useEffect(() => {
    const loadActiveCodexes = async () => {
      const { data } = await supabase
        .from('codex_prompts' as any)
        .select('codex_name, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (data) {
        setActiveCodexes(data as any[]);
      }
    };
    
    loadActiveCodexes();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleGetStarted = () => {
    window.open('https://learn.innerclarityhub.com/l/e8b826ef51', '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={!!user} />
      
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center px-4 overflow-hidden">
        <LightBeamBackground />
        
        <div className="container mx-auto max-w-5xl relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs sm:text-sm font-medium tracking-[0.3em] uppercase text-muted-foreground mb-6 animate-fade-in">
              AI-Powered Coach Positioning
            </p>
            
            <h1 className="text-display font-light mb-6 animate-fade-in animation-delay-100">
              Turn Your Story Into
              <span className="block text-gradient-primary mt-2">
                Complete Coaching Frameworks
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed font-light animate-fade-in animation-delay-200">
              Answer strategic questions and receive personalized sections covering market positioning, brand strategy, and growth plans.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in animation-delay-300">
              <Button 
                size="lg" 
                onClick={handleGetStarted} 
                className="btn-gradient h-14 px-8 text-base font-medium"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Get Started Now
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="h-14 px-8 text-base font-medium"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See How It Works
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            
            <div className="mt-12 flex flex-wrap items-center gap-6 justify-center text-sm text-muted-foreground animate-fade-in animation-delay-400">
              {[
                "No credit card required",
                "Personalized sections",
                "AI-powered"
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-responsive-3xl font-light mb-4">
              <span className="text-gradient-primary">One Price.</span>
              <span className="text-foreground"> Everything You Need.</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light">
              Transform your coaching business with AI-generated frameworks
            </p>
          </div>
          
          <Card className="border shadow-elevated overflow-hidden">
            <CardContent className="p-8 sm:p-12">
              <div className="text-center mb-10">
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-primary mb-4">
                  One-time Payment
                </p>
                
                <div className="flex items-center justify-center gap-4 mb-4">
                  <span className="text-2xl text-muted-foreground line-through">₹49,999</span>
                  <span className="text-5xl sm:text-6xl font-light text-gradient-primary">₹24,999</span>
                </div>
                
                <p className="inline-block bg-success/10 text-success px-4 py-1.5 rounded-full text-sm font-medium">
                  Limited Time - Save 50%
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-10 max-w-2xl mx-auto">
                {[
                  { icon: Brain, text: "Complete AI-Generated Frameworks" },
                  { icon: FileText, text: "Personalized Strategy Sections" },
                  { icon: Layers, text: "Detailed Content + Quick Summaries" },
                  { icon: Download, text: "Instant PDF Download" },
                  { icon: Zap, text: "AI Powered Personalization" },
                  { icon: Shield, text: "Lifetime Access to Your Blueprint" }
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <feature.icon className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm text-foreground">{feature.text}</span>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Button 
                  size="lg" 
                  onClick={handleGetStarted}
                  className="btn-gradient h-14 px-12 text-base font-medium w-full sm:w-auto"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get Your Persona Blueprint
                </Button>
                
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Secure payment · Instant delivery</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                title: "Strategic Questions → Personalized Sections",
                description: "Answer carefully crafted questions about your journey. Our AI generates personalized sections across complete coaching frameworks."
              },
              {
                icon: Layers,
                title: "Dual Content Formats",
                description: "Get detailed comprehensive narratives PLUS bullet-point summaries for quick scanning."
              },
              {
                icon: TrendingUp,
                title: "Complete Frameworks",
                description: "From Brand Strategy to Content Calendar - every framework you need to build, market, and scale your coaching business."
              }
            ].map((feature, idx) => (
              <Card key={idx} className="border-0 shadow-subtle hover-lift">
                <CardContent className="p-8">
                  <div className="mb-6 inline-flex p-3 rounded-xl bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  
                  <h3 className="text-xl font-medium mb-3 text-foreground">
                    {feature.title}
                  </h3>
                  
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-responsive-3xl font-light mb-4">
              <span className="text-gradient-primary">How It Works</span>
            </h2>
            <p className="text-lg text-muted-foreground font-light">
              From questionnaire to complete coaching blueprint in 5 simple steps
            </p>
          </div>

          <div className="space-y-6">
            {[
              { step: 1, title: "Answer Strategic Questions", description: "Share your coaching journey through carefully crafted questions." },
              { step: 2, title: "AI Analyzes Your Story", description: "Our AI processes your responses to understand your unique positioning." },
              { step: 3, title: "Frameworks Generated", description: "AI creates personalized sections across Brand Strategy, Marketing, and more." },
              { step: 4, title: "Review & Refine", description: "Access detailed narratives and quick summaries tailored to you." },
              { step: 5, title: "Download & Implement", description: "Get instant PDF access to all frameworks. Start building your empire." }
            ].map((item, idx) => (
              <div key={idx} className="flex gap-6 items-start">
                <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">{item.step}</span>
                </div>
                <div className="flex-1 pb-6 border-b border-border/50 last:border-0">
                  <h3 className="text-lg font-medium text-foreground mb-1">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Active Codexes */}
      {activeCodexes.length > 0 && (
        <section className="py-24 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-responsive-3xl font-light mb-4">
                <span className="text-gradient-accent">Complete Frameworks</span>
                <span className="text-foreground"> In Your Blueprint</span>
              </h2>
              <p className="text-lg text-muted-foreground font-light">
                Each framework contains multiple sections with detailed strategies
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeCodexes.map((codex, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Target className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground text-sm">{codex.codex_name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-responsive-3xl font-light mb-6">
            Ready to Transform Your Coaching Business?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 font-light">
            Join coaches who have already discovered their unique positioning.
          </p>
          <Button 
            size="lg" 
            onClick={handleGetStarted}
            className="btn-gradient h-14 px-12 text-base font-medium"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Get Started Now
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
