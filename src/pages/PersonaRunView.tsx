import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ShareDialog } from "@/components/ShareDialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  ArrowLeft, 
  Download, 
  Loader2, 
  BookOpen,
  FileText,
  MessageSquare,
  type LucideIcon
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Codex {
  id: string;
  codex_name: string;
  codex_order: number;
  status: string;
  total_sections: number;
  completed_sections: number;
}

interface PersonaRun {
  id: string;
  title: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  source_type: string;
  original_transcript: string | null;
  answers_json: Record<string, string | { question: string; answer: string; category: string }>;
}

// Dynamic icon and color mapping based on codex name
const getCodexIcon = (codexName: string): LucideIcon => {
  const lowerName = codexName.toLowerCase();
  
  // Import icons dynamically based on common keywords
  if (lowerName.includes('blueprint') || lowerName.includes('persona')) {
    return BookOpen;
  }
  
  // Default icon
  return FileText;
};

const getCodexColor = (index: number): string => {
  const colors = [
    "bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-green-500",
    "bg-yellow-500", "bg-orange-500", "bg-pink-500", "bg-red-500",
    "bg-cyan-500", "bg-violet-500", "bg-teal-500", "bg-rose-500",
    "bg-amber-500", "bg-lime-500", "bg-emerald-500", "bg-sky-500",
    "bg-fuchsia-500", "bg-slate-500", "bg-zinc-500"
  ];
  return colors[index % colors.length];
};

// Helper function to parse and group answers by category
const parseAnswersByCategory = (answersJson: Record<string, string | { question: string; answer: string; category: string }>) => {
  const grouped: Record<string, Array<{ key: string; question: string; answer: string }>> = {};
  
  Object.entries(answersJson || {}).forEach(([key, value]) => {
    if (typeof value === 'object' && value.question && value.answer && value.category) {
      if (!grouped[value.category]) {
        grouped[value.category] = [];
      }
      grouped[value.category].push({
        key,
        question: value.question,
        answer: value.answer
      });
    }
  });
  
  // Sort questions within each category by key
  Object.keys(grouped).forEach(category => {
    grouped[category].sort((a, b) => a.key.localeCompare(b.key));
  });
  
  return grouped;
};

// Helper function to parse legacy transcript answers
const parseLegacyTranscriptAnswers = (answersJson: Record<string, string | { question: string; answer: string; category: string }>) => {
  const backstoryAnswers: Array<{ key: string; answer: string }> = [];
  const anchorAnswers: Array<{ key: string; answer: string }> = [];
  
  Object.entries(answersJson || {}).forEach(([key, value]) => {
    if (typeof value === 'string') {
      if (key.startsWith('backstory_')) {
        backstoryAnswers.push({ key, answer: value });
      } else if (key.startsWith('anchor_')) {
        anchorAnswers.push({ key, answer: value });
      }
    }
  });
  
  return { backstoryAnswers, anchorAnswers };
};

export default function PersonaRunView() {
  const { id } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [personaRun, setPersonaRun] = useState<PersonaRun | null>(null);
  const [codexes, setCodexes] = useState<Codex[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDownloadAllPDFs = async () => {
    setDownloadingZip(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-all-codexes-zip', {
        body: { personaRunId: id }
      });

      if (error) throw error;

      // Download each PDF
      data.pdfs.forEach((pdf: any) => {
        const byteCharacters = atob(pdf.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = pdf.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      });

      toast({
        title: "Success",
        description: `Downloaded ${data.pdfs.length} PDFs`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate PDFs",
        variant: "destructive",
      });
    } finally {
      setDownloadingZip(false);
    }
  };

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    };

    initSession();
  }, [navigate]);

  useEffect(() => {
    if (!user || !id) return;
    
    loadPersonaRun();

    // Set up real-time subscription for codex updates
    const channel = supabase
      .channel(`persona-run-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "codexes",
          filter: `persona_run_id=eq.${id}`,
        },
        (payload) => {
          console.log("Codex update:", payload);
          loadPersonaRun(); // Reload when codexes change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  const loadPersonaRun = async () => {
    if (!id || !user) return;

    setLoading(true);

    // Check if user is admin
    const { data: isAdminData } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    // Load persona run - admins can view any persona run
    let runData, runError;
    
    if (isAdminData) {
      // Admin can view any persona run - use a direct query
      const response = await supabase
        .from("persona_runs" as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      runData = response.data;
      runError = response.error;
    } else {
      // Regular user can only view their own
      const response = await supabase
        .from("persona_runs" as any)
        .select("*")
        .eq("id", id)
        .eq("user_id", user?.id)
        .maybeSingle();
      runData = response.data;
      runError = response.error;
    }

    if (runError || !runData) {
      toast({
        title: "Error loading persona run",
        description: runError?.message || "Persona run not found",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    setPersonaRun(runData as any);

    // Load codexes - admins can view any codexes
    const { data: codexData, error: codexError } = await supabase
      .from("codexes" as any)
      .select("*")
      .eq("persona_run_id", id)
      .order("codex_order", { ascending: true });

    if (codexError) {
      toast({
        title: "Error loading codexes",
        description: codexError.message,
        variant: "destructive",
      });
    } else {
      setCodexes((codexData as any) || []);
    }

    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "not_started": return "bg-gray-400";
      case "generating": return "bg-blue-500 animate-pulse";
      case "ready": return "bg-green-500";
      case "ready_with_errors": return "bg-orange-500";
      case "failed": return "bg-red-500";
      default: return "bg-gray-400";
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      not_started: { variant: "secondary", label: "Not Started" },
      generating: { variant: "default", label: "Generating" },
      ready: { variant: "outline", label: "Ready" },
      ready_with_errors: { variant: "outline", label: "Ready with Errors" },
      failed: { variant: "destructive", label: "Failed" },
    };

    const item = config[status] || { variant: "outline", label: status };
    return <Badge variant={item.variant}>{item.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation isAuthenticated={!!user} />
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!personaRun) {
    return null;
  }

  const totalCodexes = codexes.length;
  const completedCodexes = codexes.filter(c => c.completed_sections === c.total_sections && c.total_sections > 0).length;
  const progressPercentage = totalCodexes > 0 ? (completedCodexes / totalCodexes) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={!!user} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">{personaRun.title}</h1>
                <p className="text-muted-foreground">
                  Created {new Date(personaRun.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-3">
                {personaRun.status === 'completed' && (
                  <>
                    <Button onClick={handleDownloadAllPDFs} disabled={downloadingZip}>
                      {downloadingZip ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download All
                    </Button>
                    <ShareDialog personaRunId={id!} />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Progress Card */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Generation Progress</CardTitle>
                {personaRun.status === 'generating' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Live Updates
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span>{completedCodexes} of {totalCodexes} Codexes Complete</span>
                  <span className="font-semibold">{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
                
                {personaRun.status === 'generating' && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Generation in progress... This page updates automatically as sections complete.
                  </p>
                )}
              </div>
          </CardContent>
          </Card>

          {/* Codex Grid */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Your Codexes</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {codexes.map((codex, index) => {
                const Icon = getCodexIcon(codex.codex_name);
                const color = getCodexColor(index);
                const status = codex.status;
                const isFullyComplete = codex.completed_sections === codex.total_sections && codex.total_sections > 0;
                const isPartiallyComplete = codex.completed_sections > 0 && codex.completed_sections < codex.total_sections;
                const sectionProgress = `${codex.completed_sections}/${codex.total_sections}`;
                const canView = codex.completed_sections > 0;

                return (
                  <Card 
                    key={codex.id}
                    className={`relative overflow-hidden transition-all hover:shadow-lg ${
                      canView ? "cursor-pointer hover:scale-105" : ""
                    }`}
                    onClick={() => {
                      if (canView) {
                        navigate(`/codex/${codex.id}`);
                      }
                    }}
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1 ${color}`} />
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                          <Icon className="h-5 w-5 text-foreground" />
                        </div>
                        <Badge 
                          variant={
                            isFullyComplete
                              ? "default" 
                              : isPartiallyComplete || status === "generating"
                              ? "secondary" 
                              : "outline"
                          }
                        >
                          {status === "generating" && (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          )}
                          {isFullyComplete 
                            ? (status === "ready_with_errors" ? "Complete*" : "Complete")
                            : status === "generating" 
                            ? "Generating" 
                            : isPartiallyComplete
                            ? "In Progress"
                            : "Not Started"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h3 className="font-semibold text-sm mb-3 line-clamp-2">{codex.codex_name}</h3>
                      
                      {/* Real-time section progress */}
                      {codex.total_sections > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Sections: {sectionProgress}</span>
                            <span>{Math.round((codex.completed_sections / codex.total_sections) * 100)}%</span>
                          </div>
                          <Progress 
                            value={(codex.completed_sections / codex.total_sections) * 100} 
                            className="h-1.5"
                          />
                          {status === "generating" && codex.completed_sections > 0 && (
                            <p className="text-xs text-primary">Click to view completed sections</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Source Data Section */}
          <div className="mt-8 pt-8 border-t">
            <h2 className="text-xl font-semibold mb-6 text-muted-foreground">Source Data</h2>
            
            {/* Original Transcript Section - for transcript-based runs */}
          {personaRun.source_type === 'transcript' && personaRun.original_transcript && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Original Transcript
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Generated from transcript
                  </Badge>
                  <span>The transcript used to generate this persona</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-6 max-h-96 overflow-y-auto">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {personaRun.original_transcript}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Questions & Answers Section - for questionnaire-based runs */}
          {personaRun.source_type === 'questionnaire' && personaRun.answers_json && 
           Object.keys(personaRun.answers_json).length > 0 && 
           Object.keys(parseAnswersByCategory(personaRun.answers_json)).length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Questions & Answers
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Generated from questionnaire
                  </Badge>
                  <span>Review the questions and answers provided</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {Object.entries(parseAnswersByCategory(personaRun.answers_json)).map(([category, questions]) => (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger className="text-left hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <span className="font-semibold capitalize text-foreground">
                            {category.replace(/_/g, ' ')}
                          </span>
                          <Badge variant="secondary" className="ml-2">
                            {questions.length} {questions.length === 1 ? 'question' : 'questions'}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {questions.map((qa, index) => (
                            <div key={qa.key} className="border-l-2 border-primary/20 pl-4 py-2">
                              <p className="font-medium text-foreground mb-2">
                                {index + 1}. {qa.question}
                              </p>
                              <p className="text-muted-foreground whitespace-pre-wrap">
                                {qa.answer}
                              </p>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Legacy Transcript Answers - for old transcript runs without source_type */}
          {(!personaRun.source_type || personaRun.source_type === 'transcript') && 
           !personaRun.original_transcript && 
           personaRun.answers_json &&
           (() => {
             const { backstoryAnswers, anchorAnswers } = parseLegacyTranscriptAnswers(personaRun.answers_json);
             return backstoryAnswers.length > 0 || anchorAnswers.length > 0;
           })() && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Extracted Answers from Transcript
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Generated from transcript (legacy)
                  </Badge>
                  <span>Answers extracted from the original transcript</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {(() => {
                    const { backstoryAnswers, anchorAnswers } = parseLegacyTranscriptAnswers(personaRun.answers_json);
                    return (
                      <>
                        {backstoryAnswers.length > 0 && (
                          <AccordionItem value="backstory">
                            <AccordionTrigger className="text-left hover:no-underline">
                              <div className="flex items-center justify-between w-full pr-4">
                                <span className="font-semibold text-foreground">Backstory</span>
                                <Badge variant="secondary" className="ml-2">
                                  {backstoryAnswers.length} {backstoryAnswers.length === 1 ? 'answer' : 'answers'}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 pt-2">
                                {backstoryAnswers.map((item, index) => (
                                  <div key={item.key} className="border-l-2 border-primary/20 pl-4 py-2">
                                    <p className="font-medium text-foreground mb-2">
                                      Backstory {index + 1}
                                    </p>
                                    <p className="text-muted-foreground whitespace-pre-wrap">
                                      {item.answer}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}
                        {anchorAnswers.length > 0 && (
                          <AccordionItem value="anchor">
                            <AccordionTrigger className="text-left hover:no-underline">
                              <div className="flex items-center justify-between w-full pr-4">
                                <span className="font-semibold text-foreground">Anchor</span>
                                <Badge variant="secondary" className="ml-2">
                                  {anchorAnswers.length} {anchorAnswers.length === 1 ? 'answer' : 'answers'}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 pt-2">
                                {anchorAnswers.map((item, index) => (
                                  <div key={item.key} className="border-l-2 border-primary/20 pl-4 py-2">
                                    <p className="font-medium text-foreground mb-2">
                                      Anchor {index + 1}
                                    </p>
                                    <p className="text-muted-foreground whitespace-pre-wrap">
                                      {item.answer}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}
                      </>
                    );
                  })()}
                </Accordion>
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
