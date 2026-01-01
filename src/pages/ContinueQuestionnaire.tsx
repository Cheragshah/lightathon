import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, ArrowRight, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Question {
  id: string;
  question_text: string;
  helper_text: string | null;
  is_required: boolean;
  display_order: number;
  category_id: string;
  category_name?: string;
}

interface CodexWithQuestions {
  codexId: string;
  codexName: string;
  questions: Question[];
}

export default function ContinueQuestionnaire() {
  const { personaRunId } = useParams<{ personaRunId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codexesWithQuestions, setCodexesWithQuestions] = useState<CodexWithQuestions[]>([]);
  const [currentCodexIndex, setCurrentCodexIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [existingAnswers, setExistingAnswers] = useState<Record<string, any>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const totalCodexes = codexesWithQuestions.length;
  const progress = totalCodexes > 0 ? ((currentCodexIndex + 1) / totalCodexes) * 100 : 0;

  useEffect(() => {
    const initializeQuestionnaire = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);
      
      if (!personaRunId) {
        setError("No persona run specified");
        setFetchingData(false);
        return;
      }

      await loadCodexQuestionsData(personaRunId);
    };
    
    initializeQuestionnaire();
  }, [navigate, personaRunId]);

  const loadCodexQuestionsData = async (runId: string) => {
    try {
      setFetchingData(true);
      setError(null);

      // Fetch persona run with existing answers
      const { data: personaRun, error: runError } = await supabase
        .from("persona_runs")
        .select("answers_json, user_id")
        .eq("id", runId)
        .single();

      if (runError) throw runError;

      // Store existing answers for pre-population
      const existingAnswersJson = (personaRun?.answers_json || {}) as Record<string, any>;
      setExistingAnswers(existingAnswersJson);

      // Build a map of question_id -> answer from existing answers
      const existingAnswersByQuestionId: Record<string, string> = {};
      Object.values(existingAnswersJson).forEach((entry: any) => {
        if (entry.question_id && entry.answer) {
          existingAnswersByQuestionId[entry.question_id] = entry.answer;
        }
      });

      // Fetch codexes that are awaiting answers
      const { data: awaitingCodexes, error: codexError } = await supabase
        .from("codexes")
        .select("id, codex_name, codex_prompt_id")
        .eq("persona_run_id", runId)
        .eq("status", "awaiting_answers")
        .order("codex_order");

      if (codexError) throw codexError;

      if (!awaitingCodexes || awaitingCodexes.length === 0) {
        // No codexes awaiting answers, redirect back to dashboard
        toast({
          title: "No questions pending",
          description: "All codexes have been answered or are being generated.",
        });
        navigate("/dashboard");
        return;
      }

      // For each awaiting codex, get the mapped questions
      const codexQuestionsData: CodexWithQuestions[] = [];

      for (const codex of awaitingCodexes) {
        if (!codex.codex_prompt_id) continue;

        // Get question mappings for this codex
        const { data: mappings, error: mappingError } = await supabase
          .from("codex_question_mappings")
          .select("question_id")
          .eq("codex_prompt_id", codex.codex_prompt_id);

        if (mappingError) {
          console.error("Error fetching mappings:", mappingError);
          continue;
        }

        if (!mappings || mappings.length === 0) continue;

        const questionIds = mappings.map(m => m.question_id);

        // Fetch the actual questions
        const { data: questions, error: questionsError } = await supabase
          .from("questionnaire_questions")
          .select(`
            id,
            question_text,
            helper_text,
            is_required,
            display_order,
            category_id,
            questionnaire_categories!inner(category_name)
          `)
          .in("id", questionIds)
          .eq("is_active", true)
          .order("display_order");

        if (questionsError) {
          console.error("Error fetching questions:", questionsError);
          continue;
        }

        if (questions && questions.length > 0) {
          const formattedQuestions = questions.map((q: any) => ({
            ...q,
            category_name: q.questionnaire_categories?.category_name || "Unknown",
          }));

          codexQuestionsData.push({
            codexId: codex.id,
            codexName: codex.codex_name,
            questions: formattedQuestions,
          });

          // Pre-populate answers from existing data
          formattedQuestions.forEach((q: Question) => {
            if (existingAnswersByQuestionId[q.id]) {
              setAnswers(prev => ({ ...prev, [q.id]: existingAnswersByQuestionId[q.id] }));
            }
          });
        }
      }

      if (codexQuestionsData.length === 0) {
        setError("No questions found for the pending codexes.");
        setFetchingData(false);
        return;
      }

      setCodexesWithQuestions(codexQuestionsData);
    } catch (err: any) {
      console.error("Error loading data:", err);
      setError(err.message || "Failed to load questionnaire data");
    } finally {
      setFetchingData(false);
    }
  };

  const getCurrentCodex = (): CodexWithQuestions | null => {
    return codexesWithQuestions[currentCodexIndex] || null;
  };

  const handleNext = () => {
    const currentCodex = getCurrentCodex();
    if (!currentCodex) return;

    const requiredQuestions = currentCodex.questions.filter(q => q.is_required);
    const unanswered = requiredQuestions.filter(q => !answers[q.id]?.trim());

    if (unanswered.length > 0) {
      toast({
        title: "Please answer all required questions",
        description: `${unanswered.length} required question${unanswered.length > 1 ? 's' : ''} remaining.`,
        variant: "destructive",
      });
      return;
    }

    setCurrentCodexIndex(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentCodexIndex(prev => prev - 1);
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    // Validate all required questions are answered
    const allQuestions = codexesWithQuestions.flatMap(c => c.questions);
    const requiredQuestions = allQuestions.filter(q => q.is_required);
    const unanswered = requiredQuestions.filter(q => !answers[q.id]?.trim());

    if (unanswered.length > 0) {
      toast({
        title: "Please answer all required questions",
        description: `${unanswered.length} required question${unanswered.length > 1 ? 's' : ''} remaining.`,
        variant: "destructive",
      });
      return;
    }

    if (!user || !personaRunId) return;

    setLoading(true);

    try {
      // Build updated answers_json by merging with existing answers
      const updatedAnswers: Record<string, any> = { ...existingAnswers };
      
      codexesWithQuestions.forEach(codexData => {
        const codexKey = codexData.codexName.toLowerCase().replace(/\s+/g, '_');
        
        codexData.questions.forEach((q, idx) => {
          if (answers[q.id]) {
            const answerKey = `${codexKey}_${idx + 1}`;
            updatedAnswers[answerKey] = {
              question: q.question_text,
              answer: answers[q.id],
              category: q.category_name,
              question_id: q.id,
            };
          }
        });
      });

      // Update persona run with merged answers
      const { error: updateError } = await supabase
        .from("persona_runs")
        .update({
          answers_json: updatedAnswers,
          updated_at: new Date().toISOString(),
        })
        .eq("id", personaRunId);

      if (updateError) throw updateError;

      // Update each awaiting codex to 'pending' status
      for (const codexData of codexesWithQuestions) {
        await supabase
          .from("codexes")
          .update({ status: "pending" })
          .eq("id", codexData.codexId);
      }

      // Trigger orchestration for each codex
      for (const codexData of codexesWithQuestions) {
        try {
          await supabase.functions.invoke("orchestrate-codexes", {
            body: {
              personaRunId,
              codexId: codexData.codexId,
            },
          });
        } catch (invokeError) {
          console.error("Error triggering orchestration:", invokeError);
        }
      }

      // Update persona run status to generating if not already
      await supabase
        .from("persona_runs")
        .update({ status: "generating", started_at: new Date().toISOString() })
        .eq("id", personaRunId);

      toast({
        title: "Answers submitted!",
        description: "Your codexes are now being generated.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error saving answers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation isAuthenticated={!!user} />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading questionnaire...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation isAuthenticated={!!user} />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button className="mt-4" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentCodex = getCurrentCodex();
  const isLastCodex = currentCodexIndex === totalCodexes - 1;

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={!!user} />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle className="text-3xl">Continue Questionnaire</CardTitle>
                  <CardDescription>
                    Answer questions for: {currentCodex?.codexName}
                  </CardDescription>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Codex {currentCodexIndex + 1} of {totalCodexes}</span>
                  <span>{Math.round(progress)}% complete</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {currentCodex?.questions.map((question, idx) => (
                <div key={question.id} className="space-y-2">
                  <Label htmlFor={question.id} className="text-base font-medium">
                    {idx + 1}. {question.question_text}
                    {question.is_required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {question.helper_text && (
                    <p className="text-sm text-muted-foreground">{question.helper_text}</p>
                  )}
                  <Textarea
                    id={question.id}
                    value={answers[question.id] || ""}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    placeholder="Type your answer here..."
                    className="min-h-[120px]"
                  />
                </div>
              ))}
              
              <div className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentCodexIndex === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                
                {isLastCodex ? (
                  <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Submit & Generate
                      </>
                    )}
                  </Button>
                ) : (
                  <Button onClick={handleNext}>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
