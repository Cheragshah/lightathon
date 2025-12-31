import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { InteractiveDemo } from "@/components/InteractiveDemo";
import { TestimonialsCarousel } from "@/components/TestimonialsCarousel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Hero3D } from "@/components/Hero3D";
import { Sparkles, Target, Users, TrendingUp, FileText, Cpu, Wand2, FileCheck, Download, CheckCircle2, Clock, Shield, Rocket, Edit, Brain, Layers, CheckCircle, HelpCircle, Zap, BookOpen, Calendar, Video, Image as ImageIcon, Mail, Lightbulb, BarChart } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeCodexes, setActiveCodexes] = useState<any[]>([]);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Load active codexes from database
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
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session) {
        setUser(session.user);
      }
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
  const handleGetStarted = () => {
    // Redirect to payment page
    window.open('https://learn.innerclarityhub.com/l/e8b826ef51', '_blank');
  };
    return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={!!user} />
      
      {/* Hero Section with 3D Background */}
      <section className="relative min-h-[90vh] md:min-h-screen flex items-center px-4 overflow-hidden">
        {/* 3D Canvas Background */}
        <Hero3D />
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full mb-6 animate-fade-in">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AI-Powered Coach Positioning
              </span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-tight animate-fade-in">
              Turn Your Story Into
              <span className="block text-gradient-primary mt-2">
                Complete Coaching Frameworks
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-xl mx-auto animate-fade-in leading-relaxed">
              Answer strategic questions and receive personalized sections covering market positioning, brand strategy, niche clarity, offers, marketing, and growth plans
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-fade-in">
              <Button 
                size="lg" 
                onClick={handleGetStarted} 
                className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 gap-2 animate-pulse-glow hover:scale-105 transition-transform"
              >
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                Get Started Now
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 gap-2 glass-card hover:scale-105 transition-transform border-primary/30"
              >
                <Brain className="h-4 w-4 sm:h-5 sm:w-5" />
                See How It Works
              </Button>
            </div>
            
            <div className="mt-8 sm:mt-12 flex flex-wrap items-center gap-4 sm:gap-6 justify-center text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success shrink-0" />
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success shrink-0" />
                <span>Personalized sections</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success shrink-0" />
                <span>AI-powered</span>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Pricing Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto max-w-5xl relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-gradient-primary">One Price.</span>
              <span className="text-foreground"> Everything You Need.</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform your coaching business with AI-generated frameworks worth months of strategic work
            </p>
          </div>
          
          <Card className="border-2 border-primary/30 shadow-2xl relative overflow-hidden glass-card animate-pulse-glow">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary animate-shimmer" />
            
            <CardContent className="pt-16 pb-16 relative">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary/20 to-accent/20 px-4 py-2 rounded-full mb-6 glass-card">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    ONE-TIME PAYMENT
                  </span>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                    <span className="text-2xl sm:text-3xl text-muted-foreground line-through">₹49,999</span>
                    <span className="text-5xl sm:text-7xl font-bold text-gradient-primary">₹24,999</span>
                  </div>
                  <div className="mt-2 inline-block bg-success/10 text-success px-4 py-1 rounded-full text-sm font-medium">
                    Limited Time Launch Offer - Save 50%
                  </div>
                </div>
                
                <p className="text-lg text-muted-foreground">Complete Coach Persona Blueprint</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-10 max-w-3xl mx-auto">
                {[
                  { icon: Brain, text: "Complete AI-Generated Frameworks" },
                  { icon: FileText, text: "Personalized Strategy Sections" },
                  { icon: Layers, text: "Detailed Content + Quick Summaries" },
                  { icon: Download, text: "Instant PDF Download" },
                  { icon: Zap, text: "AI Powered Personalization" },
                  { icon: Shield, text: "Lifetime Access to Your Blueprint" }
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3 glass-card p-4 rounded-lg hover:scale-105 transition-transform">
                    <feature.icon className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-foreground font-medium">{feature.text}</span>
                  </div>
                ))}
              </div>

              <div className="text-center space-y-4">
                <Button 
                  size="lg" 
                  onClick={() => window.open('https://learn.innerclarityhub.com/l/e8b826ef51', '_blank')}
                  className="text-base sm:text-lg px-8 sm:px-12 py-6 sm:py-7 gap-3 relative overflow-hidden group w-full sm:w-auto animate-pulse-glow"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary opacity-0 group-hover:opacity-20 transition-opacity" />
                  <Sparkles className="h-5 w-5" />
                  Get Your Persona Blueprint
                </Button>
                
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-success" />
                  <span className="text-muted-foreground">Complete payment to create your account</span>
                </div>
                
                <div className="pt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    <span>Secure Payment</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    <span>Instant Delivery</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                title: "Strategic Questions → Personalized Sections",
                description: "Answer carefully crafted questions about your journey. Our AI generates personalized sections across complete coaching frameworks.",
                gradient: "from-primary to-amber-500"
              },
              {
                icon: Layers,
                title: "Dual Content Formats",
                description: "Get detailed comprehensive narratives PLUS bullet-point summaries for quick scanning.",
                gradient: "from-accent to-orange-400"
              },
              {
                icon: TrendingUp,
                title: "Complete Frameworks",
                description: "From Brand Strategy to Content Calendar - every framework you need to build, market, and scale your coaching business.",
                gradient: "from-orange-500 to-rose-500"
              }
            ].map((feature, idx) => (
              <Card 
                key={idx} 
                className="group relative overflow-hidden glass-card hover:scale-105 transition-all duration-300 hover:shadow-2xl"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                
                <CardContent className="pt-8 pb-8 relative">
                  <div className={`mb-6 inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-lg`}>
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-4 text-foreground">
                    {feature.title}
                  </h3>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh-gradient opacity-50" />
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              <span className="text-gradient-primary">How It Works</span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              From questionnaire to complete coaching blueprint in 5 simple steps
            </p>
          </div>

          <div className="space-y-12">
            {[
              {
                step: 1,
                icon: Edit,
                title: "Answer All Strategic Questions",
                description: "Share your coaching journey through carefully crafted questions covering your backstory, unique experiences, and ideal clients.",
                gradient: "from-primary to-amber-500"
              },
              {
                step: 2,
                icon: Cpu,
                title: "AI Analyzes Your Story",
                description: "Our AI processes your responses to understand your unique positioning, expertise, and coaching methodology.",
                gradient: "from-accent to-orange-400"
              },
              {
                step: 3,
                icon: Wand2,
                title: "Coach Complete Frameworks Generated",
                description: "AI creates personalized sections across Brand Strategy, Marketing, Content, Curriculum Design, and more.",
                gradient: "from-orange-500 to-rose-500"
              },
              {
                step: 4,
                icon: FileCheck,
                title: "Review & Refine",
                description: "Access detailed narratives and quick summaries. Each framework is tailored to your specific coaching business.",
                gradient: "from-rose-500 to-red-500"
              },
              {
                step: 5,
                icon: Download,
                title: "Download & Implement",
                description: "Get instant PDF access to all frameworks. Use them to build, market, and scale your coaching empire.",
                gradient: "from-primary to-accent"
              }
            ].map((step, idx) => (
              <div key={idx} className="relative flex items-center">
                <div className="flex-1">
                  <Card className="glass-card hover:scale-102 transition-transform">
                    <CardContent className="p-8 flex items-start gap-6">
                      <div className={`shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg`}>
                        <step.icon className="h-8 w-8 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-3xl font-bold text-gradient-primary">0{step.step}</span>
                          <h3 className="text-2xl font-bold text-foreground">{step.title}</h3>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You Get - Active Codexes */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              <span className="text-gradient-accent">Complete Frameworks</span>
              <span className="text-foreground"> In Your Blueprint</span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground">
              Each framework contains multiple sections with detailed strategies and actionable plans
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCodexes.map((codex, idx) => {
              // Cycle through orange/amber color gradients
              const colors = [
                "from-primary to-amber-500",
                "from-accent to-orange-400",
                "from-orange-500 to-rose-500",
                "from-rose-500 to-red-500",
                "from-primary to-accent",
                "from-amber-500 to-yellow-500",
                "from-yellow-500 to-orange-500",
                "from-orange-600 to-red-500",
                "from-red-500 to-rose-500",
                "from-rose-500 to-pink-500",
                "from-pink-500 to-fuchsia-500",
                "from-fuchsia-500 to-purple-500",
                "from-purple-500 to-violet-500",
                "from-violet-500 to-indigo-500",
                "from-indigo-500 to-blue-500",
                "from-blue-500 to-cyan-500",
                "from-cyan-500 to-teal-500",
                "from-teal-500 to-emerald-500",
                "from-emerald-500 to-green-500"
              ];
              const color = colors[idx % colors.length];

              return (
                <div 
                  key={idx}
                  className="group relative overflow-hidden glass-card p-5 rounded-xl hover:scale-105 transition-all hover:shadow-xl"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  
                  <div className="flex items-start gap-3 relative">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${color} shrink-0`}>
                      <Brain className="h-5 w-5 text-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">
                        {codex.codex_name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        AI-Personalized Framework
                      </p>
                    </div>
                    
                    <CheckCircle className="h-5 w-5 text-success shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-6xl">
          <InteractiveDemo />
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 md:py-24 px-4 bg-mesh-gradient">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Success Stories from{" "}
              <span className="text-gradient-primary">Real Coaches</span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              See how coaches are transforming their businesses with CodeXAlpha
            </p>
          </div>
          <TestimonialsCarousel />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto max-w-4xl relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              <span className="text-foreground">Frequently Asked </span>
              <span className="text-gradient-primary">Questions</span>
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                question: "How long does it take to complete?",
                answer: "The questionnaire takes 15-20 minutes to complete. Your complete frameworks with personalized sections are generated within seconds after submission."
              },
              {
                question: "What makes this different from generic templates?",
                answer: "Every section is AI-personalized based on YOUR story, expertise, and ideal clients. You get specific strategies tailored to your unique coaching business, not generic advice."
              },
              {
                question: "Can I use this if I'm just starting out?",
                answer: "Absolutely! This is perfect for new coaches. You'll get complete frameworks covering everything from positioning to marketing, giving you a clear roadmap to launch and scale."
              },
              {
                question: "What if I already have some frameworks in place?",
                answer: "Perfect! Use the Persona Blueprint to refine your positioning, fill gaps, and ensure all your frameworks work together cohesively."
              },
              {
                question: "Do I get both detailed and summary versions?",
                answer: "Yes! Every section includes a comprehensive narrative AND a bullet-point summary for quick reference."
              }
            ].map((faq, idx) => (
              <Card key={idx} className="glass-card hover:scale-102 hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <HelpCircle className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2 text-foreground">
                        {faq.question}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-4 relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-background">
        <div className="absolute inset-0 bg-mesh-gradient" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <div className="mb-8">
            <Brain className="w-16 h-16 sm:w-20 sm:h-20 text-primary mx-auto mb-6 drop-shadow-2xl" />
            
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-6">
              Ready to Build Your
              <span className="block text-gradient-primary mt-2">Coaching Empire?</span>
            </h2>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Join coaches who've discovered their unique positioning with AI-powered frameworks worth months of strategic work
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button 
              size="lg" 
              onClick={() => window.open('https://learn.innerclarityhub.com/l/e8b826ef51', '_blank')}
              className="text-base sm:text-lg px-8 sm:px-12 py-6 sm:py-7 gap-3 w-full sm:w-auto animate-pulse-glow"
            >
              <Sparkles className="h-5 w-5" />
              Get Your Blueprint - ₹24,999
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-success" />
            <span>Complete payment to create your account</span>
          </div>
          
          <div className="mt-12 grid grid-cols-2 md:flex md:flex-wrap items-center gap-4 sm:gap-8 justify-center">
            {[
              { icon: Shield, text: "Secure & Private" },
              { icon: Zap, text: "Instant Generation" },
              { icon: CheckCircle, text: "Personalized Sections" },
              { icon: Download, text: "PDF Export" }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 glass-card px-3 sm:px-4 py-2 rounded-full justify-center">
                <item.icon className="h-4 w-4 sm:h-5 sm:w-5 text-accent shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;