import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, ListTree } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface CodexDependencyDetailsDialogProps {
  codex: any;
  open: boolean;
  onClose: () => void;
}

export const CodexDependencyDetailsDialog = ({ codex, open, onClose }: CodexDependencyDetailsDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);
  const [categorizedQuestions, setCategorizedQuestions] = useState<Map<string, any[]>>(new Map());

  useEffect(() => {
    if (open && codex) {
      loadQuestions();
    }
  }, [open, codex]);

  const loadQuestions = async () => {
    setLoading(true);
    
    // Fetch question mappings with full question details
    const { data: mappings } = await supabase
      .from('codex_question_mappings' as any)
      .select(`
        question_id,
        question:questionnaire_questions(
          id,
          question_text,
          helper_text,
          display_order,
          category:questionnaire_categories(
            id,
            category_name
          )
        )
      `)
      .eq('codex_prompt_id', codex.id);

    const questionsData = (mappings || []).map((m: any) => m.question).filter(Boolean);
    setQuestions(questionsData);

    // Group by category
    const grouped = new Map<string, any[]>();
    questionsData.forEach((q: any) => {
      const categoryName = q.category?.category_name || 'Uncategorized';
      if (!grouped.has(categoryName)) {
        grouped.set(categoryName, []);
      }
      grouped.get(categoryName)!.push(q);
    });

    // Sort questions within each category by display_order
    grouped.forEach((questions, category) => {
      questions.sort((a, b) => a.display_order - b.display_order);
    });

    setCategorizedQuestions(grouped);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTree className="h-5 w-5" />
            Dependencies for "{codex?.codex_name}"
          </DialogTitle>
          <DialogDescription>
            {questions.length === 0 
              ? "No questions mapped to this codex"
              : `${questions.length} question${questions.length !== 1 ? 's' : ''} mapped from ${categorizedQuestions.size} categor${categorizedQuestions.size !== 1 ? 'ies' : 'y'}`
            }
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListTree className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No questions are currently mapped to this codex.</p>
            <p className="text-sm mt-1">Edit the codex to add question mappings.</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              {/* Show dependency codex if exists */}
              {codex.dependency_name && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm">
                      Depends on Codex
                    </Badge>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="font-medium">→ {codex.dependency_name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This codex uses content from another codex
                    </p>
                  </div>
                  <Separator className="my-4" />
                </div>
              )}

              {/* Show questions grouped by category */}
              <div className="space-y-2">
                <Badge variant="outline" className="text-sm">
                  Mapped Questions
                </Badge>
              </div>

              {Array.from(categorizedQuestions.entries()).map(([categoryName, categoryQuestions]) => (
                <div key={categoryName} className="space-y-3">
                  <h4 className="font-semibold text-sm text-primary flex items-center gap-2">
                    {categoryName}
                    <Badge variant="secondary" className="text-xs">
                      {categoryQuestions.length}
                    </Badge>
                  </h4>
                  <div className="space-y-2">
                    {categoryQuestions.map((question: any, index: number) => (
                      <div 
                        key={question.id} 
                        className="bg-muted/30 p-3 rounded-lg border border-border/50"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-muted-foreground font-mono mt-1">
                            #{index + 1}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{question.question_text}</p>
                            {question.helper_text && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {question.helper_text}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
