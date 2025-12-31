import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, ArrowRight, Sparkles, Loader2, Save, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const STORAGE_KEY = "questionnaire_autosave";
const STEP_STORAGE_KEY = "questionnaire_current_step";

interface Category {
  id: string;
  category_name: string;
  display_order: number;
}

interface Question {
  id: string;
  question_text: string;
  helper_text: string | null;
  is_required: boolean;
  display_order: number;
  category_id: string;
}

interface GroupedQuestion extends Question {
  category_name: string;
  category_order: number;
}

export default function Questionnaire() {
  const [user, setUser] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState(0); // Now 0-indexed to match category array
  const [categories, setCategories] = useState<Category[]>([]);
  const [questionsByCategory, setQuestionsByCategory] = useState<Map<string, GroupedQuestion[]>>(new Map());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [fetchingQuestions, setFetchingQuestions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSavedData, setHasSavedData] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const totalSteps = categories.length;
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  // Load saved data from localStorage on mount
  useEffect(() => {
    const savedAnswers = localStorage.getItem(STORAGE_KEY);
    const savedStep = localStorage.getItem(STEP_STORAGE_KEY);
    
    if (savedAnswers) {
      try {
        const parsed = JSON.parse(savedAnswers);
        setAnswers(parsed.answers || {});
        setLastSaved(parsed.timestamp ? new Date(parsed.timestamp) : null);
        setHasSavedData(true);
      } catch (e) {
        console.error("Failed to parse saved questionnaire data:", e);
      }
    }
    
    if (savedStep) {
      try {
        const step = parseInt(savedStep, 10);
        if (!isNaN(step) && step >= 0) {
          setCurrentStep(step);
        }
      } catch (e) {
        console.error("Failed to parse saved step:", e);
      }
    }
  }, []);

  // Auto-save answers to localStorage whenever they change
  const saveToLocalStorage = useCallback((newAnswers: Record<string, string>, step: number) => {
    const dataToSave = {
      answers: newAnswers,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    localStorage.setItem(STEP_STORAGE_KEY, step.toString());
    setLastSaved(new Date());
    setHasSavedData(true);
  }, []);

  // Clear saved data from localStorage
  const clearSavedData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STEP_STORAGE_KEY);
    setAnswers({});
    setCurrentStep(0);
    setHasSavedData(false);
    setLastSaved(null);
    toast({
      title: "Progress cleared",
      description: "Your saved questionnaire progress has been cleared.",
    });
  }, [toast]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    });
  }, [navigate]);

  useEffect(() => {
    fetchActiveQuestions();
  }, []);

  const fetchActiveQuestions = async () => {
    try {
      setFetchingQuestions(true);
      setError(null);

      // Fetch active categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("questionnaire_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (categoriesError) throw categoriesError;

      if (!categoriesData || categoriesData.length === 0) {
        setError("No active categories found. Please contact an administrator.");
        return;
      }

      setCategories(categoriesData);

      // Fetch active questions for these categories
      const { data: questionsData, error: questionsError } = await supabase
        .from("questionnaire_questions")
        .select("*")
        .eq("is_active", true)
        .in("category_id", categoriesData.map(c => c.id))
        .order("display_order");

      if (questionsError) throw questionsError;

      // Group questions by category
      const groupedByCategory = new Map<string, GroupedQuestion[]>();
      
      categoriesData.forEach(category => {
        const categoryQuestions = questionsData
          .filter(q => q.category_id === category.id)
          .map(q => ({
            ...q,
            category_name: category.category_name,
            category_order: category.display_order,
          }))
          .sort((a, b) => a.display_order - b.display_order);
        
        if (categoryQuestions.length > 0) {
          groupedByCategory.set(category.id, categoryQuestions);
        }
      });

      setQuestionsByCategory(groupedByCategory);
    } catch (err: any) {
      console.error("Error fetching questions:", err);
      setError(err.message || "Failed to load questions");
      toast({
        title: "Error loading questions",
        description: err.message || "Failed to load questions",
        variant: "destructive",
      });
    } finally {
      setFetchingQuestions(false);
    }
  };

  // Get questions for current category/step
  const getCurrentCategoryQuestions = (): GroupedQuestion[] => {
    if (categories.length === 0) return [];
    const currentCategory = categories[currentStep];
    if (!currentCategory) return [];
    return questionsByCategory.get(currentCategory.id) || [];
  };

  // Get all questions across all categories
  const getAllQuestions = (): GroupedQuestion[] => {
    const allQuestions: GroupedQuestion[] = [];
    questionsByCategory.forEach(questions => {
      allQuestions.push(...questions);
    });
    return allQuestions;
  };

  const handleNext = () => {
    const currentQuestions = getCurrentCategoryQuestions();
    const requiredQuestions = currentQuestions.filter(q => q.is_required);
    const unanswered = requiredQuestions.filter(q => !answers[q.id]?.trim());

    if (unanswered.length > 0) {
      toast({
        title: "Please answer all required questions",
        description: `${unanswered.length} required question${unanswered.length > 1 ? 's' : ''} remaining in this section.`,
        variant: "destructive",
      });
      return;
    }

    const newStep = currentStep + 1;
    setCurrentStep(newStep);
    saveToLocalStorage(answers, newStep);
  };

  const handleBack = () => {
    const newStep = currentStep - 1;
    setCurrentStep(newStep);
    saveToLocalStorage(answers, newStep);
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    saveToLocalStorage(newAnswers, currentStep);
  };

  const handleSubmit = async () => {
    // Validate all required questions are answered
    const allQuestions = getAllQuestions();
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

    if (!user) return;

    setLoading(true);

    try {
      // Build answers object with question text and category context
      const formattedAnswers: Record<string, { question: string; answer: string; category: string }> = {};
      
      // Group by category and build answer keys
      questionsByCategory.forEach((categoryQuestions, categoryId) => {
        const categoryName = categoryQuestions[0]?.category_name || "Unknown";
        const categoryKey = categoryName.toLowerCase().replace(/\s+/g, '_');
        
        categoryQuestions.forEach((q, idx) => {
          if (answers[q.id]) {
            const answerKey = `${categoryKey}_${idx + 1}`;
            formattedAnswers[answerKey] = {
              question: q.question_text,
              answer: answers[q.id],
              category: categoryName,
            };
          }
        });
      });

      // Call create-persona-run edge function
      const { data, error } = await supabase.functions.invoke("create-persona-run", {
        body: {
          title: "My Coach Persona",
          answers: formattedAnswers,
        },
      });

      if (error) throw error;

      // Clear saved data on successful submission
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STEP_STORAGE_KEY);
      setHasSavedData(false);

      toast({
        title: "Persona Run Created!",
        description: "Your CODEXes are being generated. This may take several minutes.",
      });

      // Navigate to persona run view
      navigate(`/persona-run/${data.personaRunId}`);
    } catch (error: any) {
      toast({
        title: "Error creating persona run",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingQuestions) {
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
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  const currentCategoryQuestions = getCurrentCategoryQuestions();
  const currentCategory = categories[currentStep];
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={!!user} />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-3xl">Coach Persona Blueprint</CardTitle>
                    <CardDescription>
                      Answer the questions to generate your complete coaching identity
                    </CardDescription>
                  </div>
                </div>
                {hasSavedData && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Save className="h-4 w-4" />
                      {lastSaved && (
                        <span>Saved {lastSaved.toLocaleTimeString()}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSavedData}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  </div>
                )}
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                Step {currentStep + 1} of {totalSteps}
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {currentCategoryQuestions.length > 0 && currentCategory && (
                <div className="space-y-6">
                  {/* Show category header */}
                  <h3 className="text-xl font-semibold border-b pb-2">
                    {currentCategory.category_name}
                  </h3>

                  {currentCategoryQuestions.map((question, idx) => (
                    <div key={question.id} className="space-y-2">
                      <Label htmlFor={question.id} className="text-base">
                        {currentStep + 1}.{idx + 1} {question.question_text}
                        {!question.is_required && (
                          <span className="text-muted-foreground text-sm ml-2">(Optional)</span>
                        )}
                        {question.is_required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </Label>
                      {question.helper_text && (
                        <p className="text-sm text-muted-foreground">{question.helper_text}</p>
                      )}
                      <Textarea
                        id={question.id}
                        value={answers[question.id] || ""}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        placeholder="Your answer..."
                        className="min-h-[120px]"
                      />
                    </div>
                  ))}


                  <div className="flex justify-between">
                    {currentStep > 0 && (
                      <Button onClick={handleBack} variant="outline" size="lg">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                    )}
                    {!isLastStep ? (
                      <Button onClick={handleNext} size="lg" className={currentStep === 0 ? "ml-auto" : ""}>
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleSubmit} 
                        size="lg" 
                        disabled={loading}
                        className="gap-2 ml-auto"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-5 w-5" />
                            Generate CODEXes
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
