import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Search, FileText, Users, Shield, Settings, Zap, Database, Code, AlertTriangle, Lightbulb, BookOpen, Target, FileCheck, Share2, Sparkles, BarChart, ArrowUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";

const Documentation = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useUserRole();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("system-overview");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() 
        ? `<mark class="bg-yellow-300 dark:bg-yellow-600 px-0.5 rounded">${part}</mark>`
        : part
    ).join('');
  };

  const HighlightedText = ({ text, query }: { text: string; query: string }) => {
    if (!query.trim()) return <>{text}</>;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-yellow-300 dark:bg-yellow-600 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
  };

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrollTop = window.scrollY;
      const progress = (scrollTop / documentHeight) * 100;
      setScrollProgress(progress);
      setShowBackToTop(scrollTop > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    const sections = document.querySelectorAll('section[id]');
    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!isAdmin) {
    toast({
      title: "Access Denied",
      description: "You must be an admin to view documentation.",
      variant: "destructive",
    });
    navigate("/");
    return null;
  }

  const sections = [
    { id: "system-overview", label: "System Overview", icon: BookOpen },
    { id: "user-features", label: "User-Facing Features", icon: Users },
    { id: "admin-features", label: "Admin Dashboard Features", icon: Settings },
    { id: "technical", label: "Technical Architecture", icon: Code },
    { id: "ai-integration", label: "AI Integration", icon: Zap },
    { id: "pdf-system", label: "PDF Generation System", icon: FileText },
    { id: "security", label: "Security & Access Control", icon: Shield },
    { id: "deployment", label: "Deployment & Maintenance", icon: Database },
    { id: "troubleshooting", label: "Troubleshooting Guide", icon: AlertTriangle },
    { id: "future", label: "Future Enhancements", icon: Lightbulb },
    { id: "appendix", label: "Appendix", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <div 
          className="h-full bg-primary transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
      
      <Navigation isAuthenticated={true} />
      
      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="fixed bottom-8 right-8 z-40 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
      
      <div className="container mx-auto px-4 py-8 max-w-7xl print:px-0">
        {/* Header */}
        <div className="mb-8 print:hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">System Documentation</h1>
              <p className="text-muted-foreground">Complete documentation of all features, technical architecture, and administration guides</p>
            </div>
            <Button onClick={handlePrint} className="gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Print header */}
        <div className="print:block hidden mb-8">
          <h1 className="text-3xl font-bold">System Documentation</h1>
          <p className="text-muted-foreground">Generated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 print:hidden">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">Contents</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <nav className="space-y-1 p-4">
                    {sections.map((section) => {
                      const Icon = section.icon;
                      return (
                        <button
                          key={section.id}
                          onClick={() => {
                            setActiveSection(section.id);
                            document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-2 ${
                            activeSection === section.id
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {section.label}
                        </button>
                      );
                    })}
                  </nav>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3 space-y-8">
            {/* System Overview */}
            <section id="system-overview">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <BookOpen className="h-6 w-6 text-primary" />
                    System Overview
                  </CardTitle>
                  <CardDescription>Comprehensive documentation for system overview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-3"><HighlightedText text="About the Platform" query={searchQuery} /></h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      <HighlightedText 
                        text="This is a comprehensive coach positioning platform that combines strategic business frameworks with modern AI technology. The platform offers personalized coaching persona generation through questionnaires and transcript uploads, generating detailed frameworks covering niche clarity, market positioning, offers, marketing strategies, and growth plans." 
                        query={searchQuery} 
                      />
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3"><HighlightedText text="Technology Stack" query={searchQuery} /></h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      <HighlightedText 
                        text="Built with React, TypeScript, Tailwind CSS, and Vite for the frontend. Backend powered by Lovable Cloud (Supabase) with PostgreSQL database, Row Level Security, Edge Functions, and Supabase Storage." 
                        query={searchQuery} 
                      />
                    </p>
                    
                    <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                      <h4 className="font-semibold text-lg"><HighlightedText text="Technical Specs" query={searchQuery} /></h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium mb-1"><HighlightedText text="Frontend" query={searchQuery} /></p>
                          <p className="text-sm text-muted-foreground"><HighlightedText text="React 18, TypeScript, Tailwind CSS" query={searchQuery} /></p>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1"><HighlightedText text="Backend" query={searchQuery} /></p>
                          <p className="text-sm text-muted-foreground"><HighlightedText text="Lovable Cloud (Supabase)" query={searchQuery} /></p>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1"><HighlightedText text="Database" query={searchQuery} /></p>
                          <p className="text-sm text-muted-foreground"><HighlightedText text="PostgreSQL with RLS" query={searchQuery} /></p>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1"><HighlightedText text="AI Integration" query={searchQuery} /></p>
                          <p className="text-sm text-muted-foreground"><HighlightedText text="Lovable AI (Gemini, GPT models)" query={searchQuery} /></p>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1"><HighlightedText text="PDF Generation" query={searchQuery} /></p>
                          <p className="text-sm text-muted-foreground"><HighlightedText text="@react-pdf/renderer" query={searchQuery} /></p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

          {/* User-Facing Features Section */}
          <section id="user-features" className="scroll-mt-20 space-y-8">
          {/* Key Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-6 w-6 text-primary" />
                Key Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Persona Generation */}
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Target className="h-5 w-5 text-accent" />
                  <HighlightedText text="1. Persona Generation" query={searchQuery} />
                </h3>
                <p className="text-muted-foreground mb-2">
                  <HighlightedText text="Create personalized coaching personas through two methods:" query={searchQuery} />
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong><HighlightedText text="Questionnaire Method:" query={searchQuery} /></strong> <HighlightedText text="Answer 20 strategic questions about your coaching business, target market, expertise, and goals" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Transcript Upload:" query={searchQuery} /></strong> <HighlightedText text="Upload audio/video transcripts of your coaching sessions or presentations for AI analysis" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="AI Processing:" query={searchQuery} /></strong> <HighlightedText text="Advanced AI analyzes your input using Google Gemini 2.5 Pro model to understand your unique positioning" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Result:" query={searchQuery} /></strong> <HighlightedText text="Generates a complete coach persona that serves as the foundation for all codexes" query={searchQuery} /></li>
                </ul>
              </div>

              {/* Codex Generation */}
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-accent" />
                  <HighlightedText text="2. Codex Generation System" query={searchQuery} />
                </h3>
                <p className="text-muted-foreground mb-2">
                  <HighlightedText text="Automatically generates multiple comprehensive codexes (frameworks):" query={searchQuery} />
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong><HighlightedText text="Market Positioning Codex:" query={searchQuery} /></strong> <HighlightedText text="Defines your unique position in the market, competitive advantages, and differentiation strategy" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Brand Strategy Codex:" query={searchQuery} /></strong> <HighlightedText text="Covers brand identity, messaging, voice, and visual positioning" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Offer Structure Codex:" query={searchQuery} /></strong> <HighlightedText text="Details your coaching programs, pricing strategies, and service tiers" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Marketing Strategy Codex:" query={searchQuery} /></strong> <HighlightedText text="Outlines content strategy, lead generation, and marketing channels" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Growth Plan Codex:" query={searchQuery} /></strong> <HighlightedText text="Provides scaling strategies, expansion plans, and long-term vision" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Operations Codex:" query={searchQuery} /></strong> <HighlightedText text="Systems, processes, and operational frameworks" query={searchQuery} /></li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  <HighlightedText text="Each codex contains multiple sections (typically 6-12 sections per codex) with detailed, actionable content totaling 170+ sections across all codexes." query={searchQuery} />
                </p>
              </div>

              {/* Section-based Generation */}
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Database className="h-5 w-5 text-accent" />
                  <HighlightedText text="3. Section-Based Content Generation" query={searchQuery} />
                </h3>
                <p className="text-muted-foreground mb-2">
                  <HighlightedText text="Each codex is broken down into sections that are generated independently:" query={searchQuery} />
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong><HighlightedText text="Parallel Processing:" query={searchQuery} /></strong> <HighlightedText text="Multiple sections generate simultaneously for faster completion" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Intelligent Prompts:" query={searchQuery} /></strong> <HighlightedText text="Each section has customized AI prompts for targeted, relevant content" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Word Count Control:" query={searchQuery} /></strong> <HighlightedText text="Sections maintain optimal length (typically 1000-2000 words) for comprehensive yet digestible content" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Error Handling:" query={searchQuery} /></strong> <HighlightedText text="Failed sections can be individually regenerated without affecting completed work" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Progress Tracking:" query={searchQuery} /></strong> <HighlightedText text="Real-time status updates showing completed vs. pending sections" query={searchQuery} /></li>
                </ul>
              </div>

              {/* PDF Export */}
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-accent" />
                  <HighlightedText text="4. PDF Export & Documentation" query={searchQuery} />
                </h3>
                <p className="text-muted-foreground mb-2">
                  <HighlightedText text="Professional PDF generation capabilities:" query={searchQuery} />
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong><HighlightedText text="Individual Codex PDFs:" query={searchQuery} /></strong> <HighlightedText text="Export any single codex as a formatted PDF document" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Master PDF:" query={searchQuery} /></strong> <HighlightedText text="Combine all codexes into one comprehensive master document" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Bulk Export:" query={searchQuery} /></strong> <HighlightedText text="Admin capability to export multiple persona runs simultaneously" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Customizable Templates:" query={searchQuery} /></strong> <HighlightedText text="Adjust fonts, colors, spacing, and layout through template settings" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Professional Formatting:" query={searchQuery} /></strong> <HighlightedText text="Automatic formatting with headers, sections, page numbers, and styling" query={searchQuery} /></li>
                </ul>
              </div>

              {/* Sharing & Collaboration */}
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-accent" />
                  <HighlightedText text="5. Sharing & Collaboration" query={searchQuery} />
                </h3>
                <p className="text-muted-foreground mb-2">
                  <HighlightedText text="Secure sharing capabilities for personas and codexes:" query={searchQuery} />
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong><HighlightedText text="Shareable Links:" query={searchQuery} /></strong> <HighlightedText text="Generate secure, token-based links to share your persona results" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Password Protection:" query={searchQuery} /></strong> <HighlightedText text="Optional password protection for sensitive content" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Expiration Dates:" query={searchQuery} /></strong> <HighlightedText text="Set link expiration dates for time-limited sharing" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="View Tracking:" query={searchQuery} /></strong> <HighlightedText text="Monitor how many times your shared link has been viewed" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Access Analytics:" query={searchQuery} /></strong> <HighlightedText text="Track access attempts and analyze sharing effectiveness" query={searchQuery} /></li>
                </ul>
              </div>

              {/* Admin Dashboard */}
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-accent" />
                  <HighlightedText text="6. Admin Dashboard & Management" query={searchQuery} />
                </h3>
                <p className="text-muted-foreground mb-2">
                  <HighlightedText text="Comprehensive admin control panel for system oversight:" query={searchQuery} />
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong><HighlightedText text="User Management:" query={searchQuery} /></strong> <HighlightedText text="View all users, manage roles (admin, moderator, user), and update permissions" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Persona Run Monitoring:" query={searchQuery} /></strong> <HighlightedText text="Track all persona generations, view status, and cancel active runs if needed" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="AI Usage Analytics:" query={searchQuery} /></strong> <HighlightedText text="Monitor AI costs, token usage, and request statistics" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Generation Analytics:" query={searchQuery} /></strong> <HighlightedText text="Analyze completion rates, error patterns, and performance metrics" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Error Categorization:" query={searchQuery} /></strong> <HighlightedText text="View and analyze failed sections with categorized error types" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Performance Optimizer:" query={searchQuery} /></strong> <HighlightedText text="Identify bottlenecks and optimize system performance" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Audit Logs:" query={searchQuery} /></strong> <HighlightedText text="Complete activity log of all admin actions with timestamps" query={searchQuery} /></li>
                  <li><strong><HighlightedText text="Share Link Analytics:" query={searchQuery} /></strong> <HighlightedText text="Monitor shared links, view counts, and access attempts" query={searchQuery} /></li>
                  <li><strong>PDF Template Management:</strong> Customize PDF export templates (fonts, colors, spacing, margins)</li>
                  <li><strong>Codex Prompt Management:</strong> Edit AI prompts for each codex type and section</li>
                  <li><strong>System Settings:</strong> Configure global system parameters and preferences</li>
                  <li><strong>Bulk Actions:</strong> Perform bulk operations like mass PDF exports</li>
                  <li><strong>Real-time Notifications:</strong> Receive alerts for completed runs, failures, and system events</li>
                </ul>
              </div>

              {/* Analytics & Insights */}
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-accent" />
                  7. Analytics & Insights
                </h3>
                <p className="text-muted-foreground mb-2">
                  Data-driven insights for users and administrators:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Usage Charts:</strong> Visual representations of AI usage, costs, and token consumption over time</li>
                  <li><strong>Cost Tracking:</strong> Detailed breakdown of AI costs per persona run, codex, and section</li>
                  <li><strong>Performance Metrics:</strong> Average generation times, success rates, and efficiency scores</li>
                  <li><strong>Error Analysis:</strong> Categorized error tracking with root cause identification</li>
                  <li><strong>User Activity:</strong> Track user engagement, persona creation patterns, and feature usage</li>
                </ul>
              </div>

              {/* Regeneration & Refinement */}
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-accent" />
                  8. Regeneration & Refinement
                </h3>
                <p className="text-muted-foreground mb-2">
                  Flexible content refinement capabilities:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Section Regeneration:</strong> Regenerate individual sections without affecting other content</li>
                  <li><strong>Full Codex Regeneration:</strong> Regenerate an entire codex while keeping others intact</li>
                  <li><strong>Retry Failed Sections:</strong> Automatically retry sections that encountered errors</li>
                  <li><strong>Retry Pending Sections:</strong> Re-attempt sections stuck in pending status</li>
                  <li><strong>Version History:</strong> Track regeneration counts and last regeneration timestamps</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Technical Architecture */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-6 w-6 text-primary" />
                Technical Architecture
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Frontend Technology</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>React:</strong> Modern UI framework with TypeScript</li>
                  <li><strong>Vite:</strong> Fast build tool and development server</li>
                  <li><strong>Tailwind CSS:</strong> Utility-first CSS framework for responsive design</li>
                  <li><strong>Shadcn/ui:</strong> High-quality component library</li>
                  <li><strong>React Router:</strong> Client-side routing and navigation</li>
                  <li><strong>TanStack Query:</strong> Data fetching and state management</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Backend Infrastructure</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Lovable Cloud:</strong> Fully managed backend infrastructure powered by Supabase</li>
                  <li><strong>PostgreSQL Database:</strong> Relational database for structured data storage</li>
                  <li><strong>Edge Functions:</strong> Serverless functions for business logic and AI integration</li>
                  <li><strong>Row Level Security (RLS):</strong> Database-level security policies</li>
                  <li><strong>Real-time Subscriptions:</strong> Live updates for admin dashboard and persona status</li>
                  <li><strong>Storage Buckets:</strong> Secure file storage for transcripts</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">AI Integration</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Lovable AI Gateway:</strong> Unified AI access point without requiring user API keys</li>
                  <li><strong>Google Gemini 2.5 Pro:</strong> Primary model for persona generation (high reasoning, multimodal)</li>
                  <li><strong>Google Gemini 2.5 Flash:</strong> Fast model for transcript processing and section generation</li>
                  <li><strong>Token Management:</strong> Automatic token counting and cost estimation</li>
                  <li><strong>Usage Logging:</strong> Comprehensive AI usage tracking for analytics and billing</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Security Features</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Authentication:</strong> Secure user authentication with email/password</li>
                  <li><strong>Role-Based Access:</strong> Admin, moderator, and user roles with different permissions</li>
                  <li><strong>RLS Policies:</strong> Database-level security ensuring users can only access their own data</li>
                  <li><strong>Secure Share Links:</strong> Token-based sharing with optional password protection</li>
                  <li><strong>Rate Limiting:</strong> Protection against abuse through share link attempt tracking</li>
                  <li><strong>Audit Logging:</strong> Complete activity tracking for compliance and security</li>
                </ul>
              </div>
            </CardContent>
          </Card>
          </section>

          {/* Admin Dashboard Features Section */}
          <section id="admin-features" className="scroll-mt-20 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Admin Dashboard Features
              </CardTitle>
              <CardDescription>Comprehensive admin tools and management capabilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-accent" />
                  Dashboard Statistics & Monitoring
                </h3>
                <p className="text-muted-foreground mb-2">
                  Real-time system metrics and health monitoring:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Total Users:</strong> View complete user count and new user registrations</li>
                  <li><strong>Active Generations:</strong> Monitor ongoing persona generation processes</li>
                  <li><strong>AI Cost Tracking:</strong> Real-time AI usage costs and daily/monthly totals</li>
                  <li><strong>Error Monitoring:</strong> Track recent errors and failed sections</li>
                  <li><strong>Performance Metrics:</strong> Average generation time and system health</li>
                  <li><strong>Auto-refresh:</strong> Dashboard updates every 30 seconds automatically</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  User Management
                </h3>
                <p className="text-muted-foreground mb-2">
                  Comprehensive user administration tools:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>User Roles:</strong> Assign and modify user roles (Admin, Moderator, User)</li>
                  <li><strong>User Blocking:</strong> Block/unblock users with reason tracking</li>
                  <li><strong>User Deletion:</strong> Permanently delete users and all associated data</li>
                  <li><strong>Bulk Actions:</strong> Perform operations on multiple users simultaneously</li>
                  <li><strong>User Search:</strong> Filter and search users by email, role, or status</li>
                  <li><strong>Activity Tracking:</strong> View user activity and persona run history</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-accent" />
                  System Configuration
                </h3>
                <p className="text-muted-foreground mb-2">
                  Configure global system settings:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Logo Upload:</strong> Upload and manage custom system logo</li>
                  <li><strong>System Name:</strong> Configure application name and branding</li>
                  <li><strong>Questionnaire Management:</strong> Create, edit, and organize questions and categories</li>
                  <li><strong>Bulk Question Actions:</strong> Activate, deactivate, or change categories for multiple questions</li>
                  <li><strong>Codex Prompts:</strong> Manage AI prompts and section templates</li>
                  <li><strong>PDF Templates:</strong> Customize PDF generation settings and styling</li>
                </ul>
              </div>

               <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-accent" />
                  Persona Run Management
                </h3>
                <p className="text-muted-foreground mb-2">
                  Advanced persona generation oversight:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>View All Runs:</strong> See all persona generation runs across all users</li>
                  <li><strong>Full Re-Run:</strong> Regenerate all codexes using updated prompt configuration</li>
                  <li><strong>Cancel Runs:</strong> Stop active generation processes</li>
                  <li><strong>Delete Runs:</strong> Remove persona runs and associated data</li>
                  <li><strong>Regenerate:</strong> Trigger regeneration of failed or incomplete runs</li>
                  <li><strong>Export Data:</strong> Bulk export persona run data</li>
                  <li><strong>Error Analysis:</strong> Categorize and analyze generation errors</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-accent" />
                  Analytics & Reporting
                </h3>
                <p className="text-muted-foreground mb-2">
                  Comprehensive system analytics:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Usage Charts:</strong> Visualize user activity and system usage over time</li>
                  <li><strong>AI Cost Analysis:</strong> Track AI spending patterns and optimize costs</li>
                  <li><strong>Generation Analytics:</strong> Success rates, completion times, and error rates</li>
                  <li><strong>Share Link Analytics:</strong> Monitor shared link views and access patterns</li>
                  <li><strong>Audit Logs:</strong> Complete activity log for admin actions</li>
                  <li><strong>Performance Optimization:</strong> Identify bottlenecks and optimization opportunities</li>
                </ul>
              </div>
            </CardContent>
          </Card>
          </section>

          {/* Technical Architecture Section */}
          <section id="technical" className="scroll-mt-20 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                User Workflows
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Standard User Journey</h3>
                <ol className="list-decimal list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>Sign Up/Login:</strong> Create account or sign in to the platform</li>
                  <li><strong>Choose Input Method:</strong> Select questionnaire or transcript upload</li>
                  <li><strong>Provide Information:</strong> Answer questions or upload transcript file</li>
                  <li><strong>AI Processing:</strong> System generates persona and initiates codex orchestration</li>
                  <li><strong>Monitor Progress:</strong> Real-time dashboard shows generation status</li>
                  <li><strong>View Persona Results:</strong> Codexes displayed first, followed by source data (transcript/answers)</li>
                  <li><strong>Review Codexes:</strong> Browse and read completed codex sections</li>
                  <li><strong>Export PDFs:</strong> Download individual codexes or master PDF</li>
                  <li><strong>Share Results:</strong> Create shareable links for collaboration</li>
                  <li><strong>Refine Content:</strong> Regenerate specific sections if needed</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Admin Workflow</h3>
                <ol className="list-decimal list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>Access Admin Dashboard:</strong> Navigate to /admin route</li>
                  <li><strong>Monitor System Health:</strong> Review stats, active generations, and costs</li>
                  <li><strong>Manage Users:</strong> Update user roles and permissions as needed</li>
                  <li><strong>Review Analytics:</strong> Analyze usage patterns, costs, and performance</li>
                  <li><strong>Handle Errors:</strong> Investigate and resolve failed generations</li>
                  <li><strong>Optimize Performance:</strong> Use performance tools to identify bottlenecks</li>
                  <li><strong>Configure System:</strong> Adjust PDF templates, prompts, and settings</li>
                  <li><strong>Bulk Operations:</strong> Export multiple persona runs or perform batch actions</li>
                  <li><strong>Monitor Sharing:</strong> Track share link usage and access patterns</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Database Schema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-6 w-6 text-primary" />
                Database Schema Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Core Tables</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>persona_runs:</strong> Stores persona generation requests with user answers, status, and timestamps</li>
                  <li><strong>codexes:</strong> Represents each codex type with status tracking, section counts, and codex_prompt_id linking to the prompt configuration used</li>
                  <li><strong>codex_sections:</strong> Individual sections within codexes with content, status, and error handling</li>
                  <li><strong>codex_prompts:</strong> AI prompt templates for each codex type with dependencies</li>
                  <li><strong>codex_section_prompts:</strong> Specific prompts for individual sections</li>
                  <li><strong>codex_question_mappings:</strong> Links questionnaire questions to specific codexes</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">User & Access Management</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>user_roles:</strong> Role assignments (admin, moderator, user)</li>
                  <li><strong>shared_links:</strong> Shareable links with tokens, passwords, and expiration</li>
                  <li><strong>share_link_attempts:</strong> Tracking of access attempts for security</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Analytics & Monitoring</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>ai_usage_logs:</strong> Detailed logging of AI requests, tokens, and costs</li>
                  <li><strong>analytics_events:</strong> User activity and event tracking</li>
                  <li><strong>admin_activity_log:</strong> Audit trail of admin actions</li>
                  <li><strong>admin_notifications:</strong> System notifications for admins</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Configuration & Templates</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>pdf_templates:</strong> Customizable PDF export templates</li>
                  <li><strong>pdf_exports:</strong> Record of generated PDF files</li>
                  <li><strong>system_settings:</strong> Global configuration parameters</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Edge Functions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-6 w-6 text-primary" />
                Edge Functions (Backend API)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Core Generation Functions</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>generate-persona:</strong> Creates initial persona from questionnaire answers</li>
                  <li><strong>process-transcript:</strong> Analyzes uploaded transcripts to generate persona</li>
                  <li><strong>orchestrate-codexes:</strong> Coordinates generation of all codexes for a persona</li>
                  <li><strong>generate-codex-section:</strong> Generates individual codex sections</li>
                  <li><strong>create-persona-run:</strong> Initializes new persona generation run</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Regeneration Functions</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>regenerate-codex:</strong> Regenerates entire codex with all sections</li>
                  <li><strong>regenerate-section:</strong> Regenerates specific section within codex</li>
                  <li><strong>retry-error-sections:</strong> Batch retry of failed sections</li>
                  <li><strong>retry-pending-sections:</strong> Batch retry of stuck pending sections</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">PDF & Export Functions</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>generate-codex-pdf:</strong> Exports single codex as PDF</li>
                  <li><strong>generate-master-pdf:</strong> Combines all codexes into master PDF</li>
                  <li><strong>generate-all-codexes-zip:</strong> Creates zip file of all codex PDFs</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Admin Functions</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>verify-admin:</strong> Verifies admin status and returns dashboard data</li>
                  <li><strong>admin-get-users:</strong> Retrieves user list with roles</li>
                  <li><strong>admin-update-user-role:</strong> Updates user role assignments</li>
                  <li><strong>admin-delete-persona:</strong> Admin deletion of persona runs</li>
                  <li><strong>admin-delete-persona-run:</strong> Admin deletion of specific runs</li>
                  <li><strong>admin-cancel-persona-run:</strong> Cancels active persona generation</li>
                  <li><strong>admin-regenerate-persona:</strong> Admin-initiated persona regeneration</li>
                  <li><strong>admin-full-rerun-persona:</strong> Complete persona regeneration using current active prompts</li>
                  <li><strong>admin-update-persona:</strong> Admin persona data updates</li>
                  <li><strong>get-analytics:</strong> Retrieves analytics data for admin dashboard</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Sharing Functions</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>create-share-link:</strong> Generates secure shareable link</li>
                  <li><strong>verify-share-link:</strong> Validates and authorizes share link access</li>
                </ul>
              </div>
            </CardContent>
          </Card>
          </section>

          {/* AI Integration Section */}
          <section id="ai-integration" className="scroll-mt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                AI Integration
              </CardTitle>
              <CardDescription>Lovable AI integration and model capabilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">AI Platform</h3>
                <p className="text-muted-foreground mb-2">
                  The platform uses Lovable AI for seamless AI capabilities without requiring user API keys:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Primary Model:</strong> Google Gemini 2.5 Pro for persona and codex generation</li>
                  <li><strong>No API Keys Required:</strong> Fully managed AI access through Lovable AI</li>
                  <li><strong>Cost Tracking:</strong> Automatic usage logging and cost estimation</li>
                  <li><strong>Error Handling:</strong> Automatic retry logic with exponential backoff</li>
                  <li><strong>Rate Limiting:</strong> Built-in rate limit handling and queue management</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">AI Models Used</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>google/gemini-2.5-pro:</strong> Main model for persona and codex generation with advanced reasoning</li>
                  <li><strong>Multimodal Capabilities:</strong> Processes text and structured data for comprehensive analysis</li>
                  <li><strong>Large Context Window:</strong> Handles extensive questionnaire answers and transcript data</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">AI Usage Tracking</h3>
                <p className="text-muted-foreground mb-2">
                  Comprehensive logging of all AI interactions:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Token Tracking:</strong> Input and output token counts for all requests</li>
                  <li><strong>Cost Estimation:</strong> Automatic cost calculation based on model pricing</li>
                  <li><strong>Status Monitoring:</strong> Track success, failure, and retry attempts</li>
                  <li><strong>Error Logging:</strong> Detailed error messages for failed AI calls</li>
                  <li><strong>Analytics Integration:</strong> AI usage data available in admin dashboard</li>
                </ul>
              </div>
            </CardContent>
          </Card>
          </section>

          {/* PDF Generation System Section */}
          <section id="pdf-system" className="scroll-mt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-6 w-6 text-primary" />
                PDF Generation System
              </CardTitle>
              <CardDescription>Advanced PDF export and customization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">PDF Export Capabilities</h3>
                <p className="text-muted-foreground mb-2">
                  Professional PDF generation for all codex content:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Single Codex PDF:</strong> Export individual codexes with all sections</li>
                  <li><strong>Master PDF:</strong> Combine all codexes into one comprehensive document</li>
                  <li><strong>Bulk ZIP Export:</strong> Download all codexes as separate PDFs in a zip file</li>
                  <li><strong>Custom Styling:</strong> Apply custom fonts, colors, and branding</li>
                  <li><strong>Logo Integration:</strong> Include custom logos in PDF headers</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">PDF Template Customization</h3>
                <p className="text-muted-foreground mb-2">
                  Extensive customization options for PDF appearance:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Font Selection:</strong> Choose from multiple professional fonts</li>
                  <li><strong>Color Schemes:</strong> Customize title, heading, and body text colors</li>
                  <li><strong>Font Sizing:</strong> Adjust font sizes for different text elements</li>
                  <li><strong>Spacing Control:</strong> Configure line spacing and section spacing</li>
                  <li><strong>Page Margins:</strong> Set custom page margins</li>
                  <li><strong>Multiple Templates:</strong> Create and manage multiple PDF templates</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">PDF Generation Process</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Server-Side Generation:</strong> PDFs generated via edge functions for reliability</li>
                  <li><strong>Template Application:</strong> Active template automatically applied</li>
                  <li><strong>Content Formatting:</strong> Proper formatting of sections, headings, and body text</li>
                  <li><strong>Error Handling:</strong> Robust error handling with detailed error messages</li>
                </ul>
              </div>
            </CardContent>
          </Card>
          </section>

          {/* Security & Access Control Section */}
          <section id="security" className="scroll-mt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Security & Access Control
              </CardTitle>
              <CardDescription>Comprehensive security measures and access policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">Row Level Security (RLS)</h3>
                <p className="text-muted-foreground mb-2">
                  Database-level security ensuring data isolation:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>User Data Isolation:</strong> Users can only access their own persona runs and codexes</li>
                  <li><strong>Admin Bypass:</strong> Admins have elevated access for management purposes</li>
                  <li><strong>Policy Enforcement:</strong> All database queries automatically filtered by RLS policies</li>
                  <li><strong>Secure Sharing:</strong> Share links validated through secure token system</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Role-Based Access Control</h3>
                <p className="text-muted-foreground mb-2">
                  Three-tier permission system:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>User Role:</strong> Standard access to personal persona runs and codexes</li>
                  <li><strong>Moderator Role:</strong> Extended permissions for content moderation</li>
                  <li><strong>Admin Role:</strong> Full system access including user management and configuration</li>
                  <li><strong>Role Verification:</strong> Server-side role checks on all admin operations</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">User Blocking System</h3>
                <p className="text-muted-foreground mb-2">
                  Protection against abuse and unauthorized access:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Block/Unblock Users:</strong> Admins can temporarily block user access</li>
                  <li><strong>Reason Tracking:</strong> Document reasons for blocking actions</li>
                  <li><strong>Audit Trail:</strong> All blocking actions logged with timestamps</li>
                  <li><strong>Immediate Effect:</strong> Blocked users cannot access the system</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Secure Sharing</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Token-Based Access:</strong> Unique tokens for each shared link</li>
                  <li><strong>Optional Password Protection:</strong> Add password requirement to shared links</li>
                  <li><strong>Expiration Dates:</strong> Set automatic expiration for shared access</li>
                  <li><strong>View Tracking:</strong> Monitor who accessed shared content and when</li>
                  <li><strong>Revocable Access:</strong> Deactivate share links at any time</li>
                </ul>
              </div>
            </CardContent>
          </Card>
          </section>

          {/* Deployment & Maintenance Section */}
          <section id="deployment" className="scroll-mt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-6 w-6 text-primary" />
                Deployment & Maintenance
              </CardTitle>
              <CardDescription>Hosting, scaling, and maintenance best practices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">Infrastructure</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Frontend:</strong> Hosted on Lovable platform with global CDN</li>
                  <li><strong>Backend:</strong> Lovable Cloud (Supabase) with automatic scaling</li>
                  <li><strong>Database:</strong> PostgreSQL with automatic backups and point-in-time recovery</li>
                  <li><strong>Storage:</strong> Supabase Storage with CDN distribution</li>
                  <li><strong>Edge Functions:</strong> Serverless compute with automatic scaling</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Environment Configuration</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Environment Variables:</strong> Securely configured via Lovable Cloud</li>
                  <li><strong>Secrets Management:</strong> Secure storage for sensitive configuration</li>
                  <li><strong>Auto-deployment:</strong> Changes automatically deployed on updates</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Monitoring & Maintenance</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>System Health Dashboard:</strong> Real-time monitoring via admin dashboard</li>
                  <li><strong>Error Tracking:</strong> Automatic logging of all system errors</li>
                  <li><strong>Performance Metrics:</strong> Generation times, API response times, and throughput</li>
                  <li><strong>Cost Monitoring:</strong> Track AI usage costs and optimize spending</li>
                  <li><strong>Database Optimization:</strong> Regular index maintenance and query optimization</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Backup & Recovery</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li><strong>Automatic Backups:</strong> Daily database backups with 7-day retention</li>
                  <li><strong>Point-in-Time Recovery:</strong> Restore to any point in the last 7 days</li>
                  <li><strong>Data Export:</strong> Admin tools for bulk data export</li>
                </ul>
              </div>
            </CardContent>
          </Card>
          </section>

          {/* Troubleshooting Guide Section */}
          <section id="troubleshooting" className="scroll-mt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-primary" />
                Troubleshooting Guide
              </CardTitle>
              <CardDescription>Common issues and solutions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">Generation Issues</h3>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-sm">Persona generation stuck in "processing" status</p>
                    <p className="text-muted-foreground text-sm ml-4">Solution: Check AI usage logs for errors. Use admin retry functions to restart generation.</p>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Sections showing "error" status</p>
                    <p className="text-muted-foreground text-sm ml-4">Solution: Review error message in section details. Use regenerate function to retry failed sections.</p>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Incomplete codexes after generation</p>
                    <p className="text-muted-foreground text-sm ml-4">Solution: Use retry-pending-sections function to complete stuck sections.</p>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Need to regenerate with updated prompts</p>
                    <p className="text-muted-foreground text-sm ml-4">Solution: Use the "Full Re-Run" action in admin panel to regenerate all codexes with the current active prompts.</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">PDF Export Issues</h3>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-sm">PDF generation fails</p>
                    <p className="text-muted-foreground text-sm ml-4">Solution: Ensure active PDF template is configured. Check edge function logs for errors.</p>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Missing logo in PDF</p>
                    <p className="text-muted-foreground text-sm ml-4">Solution: Verify logo is uploaded in System Configuration and template has logo URL configured.</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Access & Permission Issues</h3>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-sm">User cannot access admin dashboard</p>
                    <p className="text-muted-foreground text-sm ml-4">Solution: Verify user role is set to "admin" in user_roles table.</p>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Cannot view other users' persona runs</p>
                    <p className="text-muted-foreground text-sm ml-4">Solution: This is expected behavior due to RLS policies. Only admins can view all persona runs.</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Performance Issues</h3>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-sm">Slow generation times</p>
                    <p className="text-muted-foreground text-sm ml-4">Solution: Check AI usage analytics for rate limiting. Consider staggering large batch operations.</p>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Dashboard slow to load</p>
                    <p className="text-muted-foreground text-sm ml-4">Solution: Clear browser cache. Check network tab for slow API calls.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </section>

          {/* Future Enhancements Section */}
          <section id="future" className="scroll-mt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-6 w-6 text-primary" />
                Future Enhancements
              </CardTitle>
              <CardDescription>Planned features and improvements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">AI Enhancements</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Multi-model support with model selection per codex type</li>
                  <li>Fine-tuned models for specific coaching niches</li>
                  <li>AI-powered content suggestions and improvements</li>
                  <li>Automated quality scoring for generated content</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Collaboration Features</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Team workspaces for collaborative editing</li>
                  <li>Comments and annotations on codex sections</li>
                  <li>Version history and change tracking</li>
                  <li>Collaborative PDF generation with multiple contributors</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Advanced Analytics</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Predictive analytics for cost forecasting</li>
                  <li>User engagement metrics and insights</li>
                  <li>Content quality analysis and recommendations</li>
                  <li>Comparative analytics across persona runs</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Integration Capabilities</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>CRM integrations (Salesforce, HubSpot)</li>
                  <li>Email marketing platform connections</li>
                  <li>Calendar integrations for coaching sessions</li>
                  <li>Payment processor integrations</li>
                  <li>Zapier/Make.com webhook support</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">User Experience Improvements</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Mobile app for iOS and Android</li>
                  <li>Offline mode for viewing generated content</li>
                  <li>Advanced search and filtering across all codexes</li>
                  <li>Customizable dashboard layouts</li>
                  <li>Dark mode support</li>
                </ul>
              </div>
            </CardContent>
          </Card>
          </section>

          {/* Appendix Section */}
          <section id="appendix" className="scroll-mt-20">
          {/* Best Practices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Best Practices & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">For Users</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Provide detailed, thoughtful answers to questionnaire questions for best results</li>
                  <li>For transcript uploads, ensure transcripts are clear and well-formatted</li>
                  <li>Monitor persona generation progress and allow 10-30 minutes for completion</li>
                  <li>Review generated content section by section rather than all at once</li>
                  <li>Use regeneration feature for sections that need refinement</li>
                  <li>Export PDFs only after all codexes are fully completed</li>
                  <li>Set expiration dates on shared links for security</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">For Administrators</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Monitor AI usage costs regularly to track spending</li>
                  <li>Review error categorization to identify systemic issues</li>
                  <li>Use performance optimizer to identify bottlenecks</li>
                  <li>Customize PDF templates to match brand guidelines</li>
                  <li>Regularly review and optimize codex prompts for better output</li>
                  <li>Check audit logs for unusual activity</li>
                  <li>Cancel stuck generations to free up resources</li>
                  <li>Use bulk export for client deliverables</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">System Maintenance</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Share link attempts are automatically cleaned up after 24 hours</li>
                  <li>Failed sections can be retried up to 3 times before manual intervention</li>
                  <li>Real-time subscriptions keep admin dashboard updated automatically</li>
                  <li>Database RLS policies ensure data security at the row level</li>
                  <li>Edge functions automatically scale based on demand</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Recent Updates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                Recent System Updates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">AI Migration (Latest)</h3>
                <p className="text-muted-foreground mb-2">
                  The system has been migrated from OpenAI to Lovable AI:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Switched from OpenAI GPT models to Google Gemini 2.5 models</li>
                  <li>No user API keys required - fully managed AI access</li>
                  <li>Improved cost efficiency with Lovable AI Gateway</li>
                  <li>Enhanced multimodal capabilities with Gemini models</li>
                  <li>Updated cost tracking and usage analytics for new models</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Security Improvements</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Removed overly permissive RLS policies for better security</li>
                  <li>Enhanced row-level security for user data protection</li>
                  <li>Improved admin activity logging and audit trails</li>
                </ul>
              </div>
            </CardContent>
          </Card>
          </section>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground pt-8 print:mt-8">
            <p>This documentation was generated on {new Date().toLocaleDateString()}</p>
            <p>For technical support or questions, contact your system administrator.</p>
          </div>
        </div>
      </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            margin: 1.5cm;
            size: A4;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          .print\\:px-0 {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          
          h1, h2, h3 {
            page-break-after: avoid;
          }
          
          .space-y-8 > * {
            page-break-inside: avoid;
          }
          
          nav {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default Documentation;
