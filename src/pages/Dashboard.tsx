import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Calendar, Trash2, Eye, PlayCircle } from "lucide-react";
import { ProfileCompletionDialog } from "@/components/ProfileCompletionDialog";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { GenerationProgress } from "@/components/GenerationProgress";
import type { User } from "@supabase/supabase-js";

interface Codex {
  id: string;
  codex_name: string;
  status: string;
}

interface PersonaRun {
  id: string;
  title: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  codexes?: Codex[];
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [personaRuns, setPersonaRuns] = useState<PersonaRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [unansweredCategories, setUnansweredCategories] = useState<string[]>([]);
  const [allCategoriesAnswered, setAllCategoriesAnswered] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { 
    profile, 
    shouldShowPrompt, 
    isProfileComplete, 
    dismissPrompt, 
    refreshProfile 
  } = useProfileCompletion();

  // Show profile dialog when shouldShowPrompt becomes true
  useEffect(() => {
    if (shouldShowPrompt && !isProfileComplete) {
      setShowProfileDialog(true);
    }
  }, [shouldShowPrompt, isProfileComplete]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        loadPersonaRuns(session.user.id);
        loadUnansweredCategories(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        loadPersonaRuns(session.user.id);
        loadUnansweredCategories(session.user.id);
      } else {
        setUser(null);
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadUnansweredCategories = async (userId: string) => {
    try {
      // Get user's existing answers
      const { data: existingRuns } = await supabase
        .from("persona_runs")
        .select("answers_json")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      // Build answered question IDs from new format AND track old format keys
      const answeredQuestionIds = new Set<string>();
      const answeredCategoryKeys = new Set<string>();
      
      if (existingRuns?.[0]?.answers_json) {
        const answersJson = existingRuns[0].answers_json as Record<string, any>;
        Object.entries(answersJson).forEach(([key, entry]: [string, any]) => {
          // New format: has question_id
          if (entry.question_id) {
            answeredQuestionIds.add(entry.question_id);
          }
          // Track all keys for old format matching
          answeredCategoryKeys.add(key);
        });
      }

      // Get user's enabled categories with enabled_at for sorting
      const { data: userAssignments } = await supabase
        .from("user_category_assignments")
        .select("category_id, is_enabled, enabled_at")
        .eq("user_id", userId);

      // Get batch info
      const { data: profile } = await supabase
        .from("profiles")
        .select("batch")
        .eq("id", userId)
        .single();

      let enabledCategoryIds: string[] = [];

      if (profile?.batch) {
        const { data: batchData } = await supabase
          .from("batches")
          .select("id")
          .eq("batch_name", profile.batch)
          .eq("is_active", true)
          .single();

        if (batchData) {
          const { data: batchAssignments } = await supabase
            .from("questionnaire_assignments")
            .select("category_id")
            .eq("batch_id", batchData.id)
            .eq("is_enabled", true);

          enabledCategoryIds = (batchAssignments || []).map(a => a.category_id);
        }
      }

      // Apply user overrides
      const userOverrides = new Map<string, boolean>();
      (userAssignments || []).forEach(a => {
        userOverrides.set(a.category_id, a.is_enabled ?? true);
      });

      userOverrides.forEach((isEnabled, categoryId) => {
        if (isEnabled && !enabledCategoryIds.includes(categoryId)) {
          enabledCategoryIds.push(categoryId);
        } else if (!isEnabled) {
          enabledCategoryIds = enabledCategoryIds.filter(id => id !== categoryId);
        }
      });

      if (enabledCategoryIds.length === 0) {
        setUnansweredCategories([]);
        setAllCategoriesAnswered(false);
        return;
      }

      // Get questions for enabled categories
      const { data: questionsData } = await supabase
        .from("questionnaire_questions")
        .select("id, category_id")
        .eq("is_active", true)
        .in("category_id", enabledCategoryIds);

      // Get categories data
      const { data: categoriesData } = await supabase
        .from("questionnaire_categories")
        .select("id, category_name")
        .eq("is_active", true)
        .in("id", enabledCategoryIds);

      // Build a map of category_id -> enabled_at from user assignments
      const categoryEnabledAt = new Map<string, string>();
      (userAssignments || []).forEach(a => {
        if (a.enabled_at) {
          categoryEnabledAt.set(a.category_id, a.enabled_at);
        }
      });

      // Find categories with unanswered questions
      const unansweredCatsWithDate: Array<{ name: string; enabledAt: string }> = [];
      
      (categoriesData || []).forEach(category => {
        const categoryQuestions = (questionsData || []).filter(q => q.category_id === category.id);
        
        // Convert category name to key prefix for old format matching
        // e.g., "Generational Money Story" -> "generational_money_story"
        const categoryKeyPrefix = category.category_name
          .toLowerCase()
          .replace(/\s+/g, '_');
        
        // Count how many questions in this category are answered
        // Check both new format (question_id) and old format (key prefix)
        let answeredCount = 0;
        categoryQuestions.forEach(q => {
          // Check new format first
          if (answeredQuestionIds.has(q.id)) {
            answeredCount++;
          } else {
            // Check old format: look for keys matching category prefix
            const matchingKeys = Array.from(answeredCategoryKeys).filter(key => 
              key.startsWith(categoryKeyPrefix)
            );
            if (matchingKeys.length >= categoryQuestions.length) {
              // All questions in this category were answered via old format
              answeredCount = categoryQuestions.length;
            }
          }
        });
        
        // Check if category is fully answered using old format key matching
        const oldFormatAnsweredCount = Array.from(answeredCategoryKeys).filter(key => 
          key.startsWith(categoryKeyPrefix)
        ).length;
        
        const isFullyAnswered = oldFormatAnsweredCount >= categoryQuestions.length || 
                                 answeredCount >= categoryQuestions.length;
        
        if (!isFullyAnswered && categoryQuestions.length > 0) {
          const enabledAt = categoryEnabledAt.get(category.id) || '1970-01-01';
          unansweredCatsWithDate.push({ 
            name: category.category_name, 
            enabledAt 
          });
        }
      });

      // Sort by enabled_at descending (most recently enabled first)
      unansweredCatsWithDate.sort((a, b) => 
        new Date(b.enabledAt).getTime() - new Date(a.enabledAt).getTime()
      );

      setUnansweredCategories(unansweredCatsWithDate.map(c => c.name));
      
      // Check if all enabled categories have been answered (at least 1 enabled but 0 unanswered)
      const totalEnabledCategories = (categoriesData || []).length;
      const allAnswered = totalEnabledCategories > 0 && unansweredCatsWithDate.length === 0;
      setAllCategoriesAnswered(allAnswered);
    } catch (err) {
      console.error("Error loading unanswered categories:", err);
    }
  };

  const loadPersonaRuns = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("persona_runs" as any)
      .select("id, title, status, created_at, completed_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading persona runs",
        description: error.message,
        variant: "destructive",
      });
      setPersonaRuns([]);
      setLoading(false);
      return;
    }

    const runs = data as any || [];

    // Fetch codexes for each run to check for awaiting_answers status
    const runsWithCodexes = await Promise.all(
      runs.map(async (run: PersonaRun) => {
        const { data: codexes } = await supabase
          .from("codexes")
          .select("id, codex_name, status")
          .eq("persona_run_id", run.id);
        
        return {
          ...run,
          codexes: codexes || [],
        };
      })
    );

    setPersonaRuns(runsWithCodexes);
    setLoading(false);
  };

  // Check if any persona run has codexes awaiting answers
  const getAwaitingAnswersRun = (): PersonaRun | null => {
    return personaRuns.find(run => 
      run.codexes?.some(codex => codex.status === "awaiting_answers")
    ) || null;
  };

  const getAwaitingCodexNames = (run: PersonaRun): string[] => {
    return run.codexes
      ?.filter(codex => codex.status === "awaiting_answers")
      .map(codex => codex.codex_name) || [];
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("persona_runs" as any).delete().eq("id", id);
    if (error) {
      toast({
        title: "Error deleting persona run",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Persona run deleted",
        description: "Your persona run has been deleted successfully.",
      });
      if (user) {
        loadPersonaRuns(user.id);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      generating: { variant: "default", label: "Generating" },
      completed: { variant: "outline", label: "Completed" },
      failed: { variant: "destructive", label: "Failed" },
    };
    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleProfileDialogClose = (open: boolean) => {
    setShowProfileDialog(open);
    if (!open) {
      dismissPrompt();
    }
  };

  const handleProfileComplete = () => {
    refreshProfile();
    setShowProfileDialog(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={!!user} />
      
      {/* Profile Completion Dialog */}
      <ProfileCompletionDialog
        open={showProfileDialog}
        onOpenChange={handleProfileDialogClose}
        onComplete={handleProfileComplete}
        initialData={profile || undefined}
      />
      
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header - Stack on mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1 sm:mb-2 break-words-safe">
                Your Persona  
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Create and manage your Coach Persona Architect blueprints
              </p>
            </div>
            {/* Only show action buttons if not all categories are answered */}
            {!allCategoriesAnswered && (
              <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                {(() => {
                  const awaitingRun = getAwaitingAnswersRun();
                  if (awaitingRun) {
                    const codexNames = getAwaitingCodexNames(awaitingRun);
                    return (
                      <Button 
                        size="default"
                        onClick={() => navigate(`/continue-questionnaire/${awaitingRun.id}`)} 
                        className="gap-2 w-full sm:w-auto"
                      >
                        <PlayCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                        <span className="truncate">Continue Questionnaire</span>
                        {codexNames.length > 0 && (
                          <Badge variant="secondary" className="ml-1 flex-shrink-0">
                            {codexNames.length}
                          </Badge>
                        )}
                      </Button>
                    );
                  }
                  
                  // Show category-specific button if there are unanswered categories
                  if (unansweredCategories.length > 0) {
                    const categoryName = unansweredCategories[0];
                    return (
                      <Button size="default" onClick={() => navigate("/questionnaire")} className="gap-2 w-full sm:w-auto">
                        <Plus className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                        <span className="truncate">Answer {categoryName}</span>
                      </Button>
                    );
                  }
                  
                  return (
                    <Button size="default" onClick={() => navigate("/questionnaire")} className="gap-2 w-full sm:w-auto">
                      <Plus className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                      <span className="truncate">Answer Questionnaire</span>
                    </Button>
                  );
                })()}
                <Button size="default" variant="outline" onClick={() => navigate("/transcript-upload")} className="gap-2 w-full sm:w-auto">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="truncate">Upload Transcript</span>
                </Button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading your persona runs...</p>
            </div>
          ) : personaRuns.length === 0 ? (
            <Card className="text-center py-12">
              <CardHeader>
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <CardTitle>No Persona Runs Yet</CardTitle>
                <CardDescription>
                  Create your first Coach Persona Blueprint by answering 20 narrative questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/questionnaire")} size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Start Questionnaire
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Show generation progress for active generations */}
              {personaRuns.some(run => run.status === "generating") && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Generation in Progress</h2>
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
                    {personaRuns
                      .filter(run => run.status === "generating")
                      .map(run => (
                        <GenerationProgress
                          key={run.id}
                          personaRunId={run.id}
                          personaRun={run}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Show all persona runs */}
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {personaRuns.map((run) => (
                  <Card key={run.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base sm:text-lg line-clamp-2 break-words-safe">{run.title}</CardTitle>
                        {getStatusBadge(run.status)}
                      </div>
                      <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        {new Date(run.created_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs sm:text-sm"
                          onClick={() => navigate(`/persona-run/${run.id}`)}
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(run.id)}>
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
