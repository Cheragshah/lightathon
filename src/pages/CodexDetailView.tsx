import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { ArrowLeft, Download, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface CodexSection {
  id: string;
  section_name: string;
  section_index: number;
  content: string | null;
  content_summary: string | null;
  status: string;
}

interface Codex {
  id: string;
  codex_name: string;
  status: string;
  total_sections: number;
  completed_sections: number;
  persona_run_id: string;
}

export default function CodexDetailView() {
  const { id } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [codex, setCodex] = useState<Codex | null>(null);
  const [sections, setSections] = useState<CodexSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [regeneratingCodex, setRegeneratingCodex] = useState(false);
  const [viewMode, setViewMode] = useState<'full' | 'summary'>('full');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useUserRole();

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
    if (user) {
      loadCodex();
    }
  }, [id, user]);

  const loadCodex = async () => {
    if (!id || !user) return;

    setLoading(true);

    // Check if user is admin
    const { data: isAdminData } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    const { data: codexData, error: codexError } = await supabase
      .from("codexes" as any)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (codexError || !codexData) {
      toast({
        title: "Error loading codex",
        description: codexError?.message || "Codex not found",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    // If not admin, verify ownership
    if (!isAdminData && codexData) {
      const { data: personaRun, error: personaError } = await supabase
        .from("persona_runs" as any)
        .select("user_id")
        .eq("id", (codexData as any).persona_run_id)
        .maybeSingle();

      if (!personaError && personaRun && (personaRun as any).user_id !== user?.id) {
        toast({
          title: "Access denied",
          description: "You don't have permission to view this codex",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }
    }

    setCodex(codexData as any);

    const { data: sectionsData, error: sectionsError } = await supabase
      .from("codex_sections" as any)
      .select("*")
      .eq("codex_id", id)
      .order("section_index", { ascending: true });

    if (sectionsError) {
      toast({
        title: "Error loading sections",
        description: sectionsError.message,
        variant: "destructive",
      });
    } else {
      setSections((sectionsData as any) || []);
    }

    setLoading(false);
  };

  const handleRegenerate = async (sectionId: string) => {
    setRegenerating(sectionId);
    try {
      const { error } = await supabase.functions.invoke('regenerate-section', {
        body: { sectionId }
      });

      if (error) throw error;

      toast({
        title: "Regenerating",
        description: "This section is being regenerated. It may take a few minutes.",
      });

      // Reload to show updated status
      setTimeout(() => loadCodex(), 1000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate section",
        variant: "destructive",
      });
    } finally {
      setRegenerating(null);
    }
  };

  const handleRegenerateCodex = async () => {
    if (!isAdmin) return;
    
    setRegeneratingCodex(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-regenerate-codex', {
        body: { codexId: id }
      });

      if (error) throw error;

      toast({
        title: "Regenerating Codex",
        description: data.message || "The entire codex is being regenerated. This may take several minutes.",
      });

      // Reload to show updated status
      setTimeout(() => loadCodex(), 1000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate codex",
        variant: "destructive",
      });
    } finally {
      setRegeneratingCodex(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-codex-pdf', {
        body: { codexId: id }
      });

      if (error) throw error;

      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Create filename: codex_name_email.pdf
      const codexName = (codex?.codex_name || 'codex').replace(/[^a-zA-Z0-9]/g, '_');
      const userEmail = (user?.email || 'user').replace(/[^a-zA-Z0-9@.]/g, '_');
      link.download = `${codexName}_${userEmail}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "PDF downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const calculateWordCount = () => {
    const allContent = sections.map(s => s.content || "").join(" ");
    return allContent.split(/\s+/).filter(w => w.length > 0).length;
  };

  if (loading || !codex) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation isAuthenticated={!!user} />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center py-20">
            <p className="text-muted-foreground">Loading codex...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={!!user} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={() => navigate(`/persona-run/${codex.persona_run_id}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {/* Toggle between Full and Summary views */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                <Button
                  size="sm"
                  variant={viewMode === 'full' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('full')}
                >
                  Deep Dive
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'summary' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('summary')}
                >
                  Summary
                </Button>
              </div>

              {/* Admin only: Regenerate entire codex */}
              {isAdmin && (
                <Button 
                  variant="outline" 
                  onClick={handleRegenerateCodex} 
                  disabled={regeneratingCodex || codex.status === 'generating'}
                >
                  {regeneratingCodex ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  )}
                  Regenerate Codex
                </Button>
              )}

              <Button onClick={handleDownloadPDF} disabled={downloading}>
                {downloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download PDF
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-3xl mb-2">{codex.codex_name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {codex.completed_sections} of {codex.total_sections} sections • {calculateWordCount()} words
              </p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-8">
                  {sections.map((section) => (
                    <div key={section.id} className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-semibold">{section.section_name}</h3>
                            <Badge variant={section.status === 'completed' ? 'default' : 'secondary'}>
                              {section.status}
                            </Badge>
                            {(section as any).regeneration_count > 0 && (
                              <Badge variant="outline">
                                Regenerated {(section as any).regeneration_count}x
                              </Badge>
                            )}
                          </div>
                          <div className="prose max-w-none">
                            {section.status === "completed" ? (
                              viewMode === 'full' ? (
                                section.content && (
                                  <div className="whitespace-pre-wrap">{section.content}</div>
                                )
                              ) : (
                                section.content_summary ? (
                                  <div className="whitespace-pre-wrap">{section.content_summary}</div>
                                ) : (
                                  <div className="text-muted-foreground italic p-4 bg-muted/30 rounded">
                                    Summary version not yet available. This section was generated before the summary feature was added. You can regenerate it to get both versions.
                                  </div>
                                )
                              )
                            ) : (
                              <p className="text-muted-foreground italic">
                                {section.status === 'generating' ? 'Generating...' : 'Pending'}
                              </p>
                            )}
                          </div>
                        </div>
                        {/* Admins can regenerate completed sections or retry failed ones */}
                        {isAdmin && (section.content || section.status === 'error') && (
                          <Button
                            variant={section.status === 'error' ? 'destructive' : 'outline'}
                            size="sm"
                            onClick={() => handleRegenerate(section.id)}
                            disabled={regenerating === section.id || section.status === 'generating'}
                            title={section.status === 'error' ? 'Retry failed section' : 'Regenerate section (Admin only)'}
                          >
                            {regenerating === section.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                            {section.status === 'error' && <span className="ml-1">Retry</span>}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
