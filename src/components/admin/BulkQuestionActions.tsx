import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Check, X, FolderOpen, Sparkles, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface Category {
  id: string;
  category_name: string;
}

interface Question {
  id: string;
  question_text: string;
}

interface BulkQuestionActionsProps {
  selectedQuestionIds: string[];
  categories: Category[];
  questions: Question[];
  onClearSelection: () => void;
  onComplete: () => void;
}

export function BulkQuestionActions({
  selectedQuestionIds,
  categories,
  questions,
  onClearSelection,
  onComplete
}: BulkQuestionActionsProps) {
  const [processing, setProcessing] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeProgress, setOptimizeProgress] = useState(0);
  const [optimizeDialogOpen, setOptimizeDialogOpen] = useState(false);

  if (selectedQuestionIds.length === 0) return null;

  const handleBulkActivate = async () => {
    if (!confirm(`Activate ${selectedQuestionIds.length} question(s)?`)) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("questionnaire_questions")
        .update({ is_active: true })
        .in("id", selectedQuestionIds);

      if (error) throw error;

      toast.success(`${selectedQuestionIds.length} question(s) activated`);
      onComplete();
      onClearSelection();
    } catch (error: any) {
      console.error("Error activating questions:", error);
      toast.error("Failed to activate questions");
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (!confirm(`Deactivate ${selectedQuestionIds.length} question(s)?`)) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("questionnaire_questions")
        .update({ is_active: false })
        .in("id", selectedQuestionIds);

      if (error) throw error;

      toast.success(`${selectedQuestionIds.length} question(s) deactivated`);
      onComplete();
      onClearSelection();
    } catch (error: any) {
      console.error("Error deactivating questions:", error);
      toast.error("Failed to deactivate questions");
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Permanently delete ${selectedQuestionIds.length} question(s)? This cannot be undone.`)) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("questionnaire_questions")
        .delete()
        .in("id", selectedQuestionIds);

      if (error) throw error;

      toast.success(`${selectedQuestionIds.length} question(s) deleted`);
      onComplete();
      onClearSelection();
    } catch (error: any) {
      console.error("Error deleting questions:", error);
      toast.error("Failed to delete questions");
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkChangeCategory = async () => {
    if (!selectedCategoryId) {
      toast.error("Please select a category");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("questionnaire_questions")
        .update({ category_id: selectedCategoryId })
        .in("id", selectedQuestionIds);

      if (error) throw error;

      toast.success(`${selectedQuestionIds.length} question(s) moved to new category`);
      onComplete();
      onClearSelection();
      setCategoryDialogOpen(false);
      setSelectedCategoryId("");
    } catch (error: any) {
      console.error("Error changing category:", error);
      toast.error("Failed to change category");
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkOptimize = async () => {
    setOptimizing(true);
    setOptimizeProgress(0);
    setOptimizeDialogOpen(true);

    const selectedQuestions = questions.filter(q => selectedQuestionIds.includes(q.id));
    let successCount = 0;
    let failCount = 0;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Please log in to use AI optimization");
        return;
      }

      for (let i = 0; i < selectedQuestions.length; i++) {
        const question = selectedQuestions[i];
        
        try {
          const response = await supabase.functions.invoke("optimize-text", {
            body: { text: question.question_text, type: "question" },
          });

          if (response.error) {
            console.error(`Error optimizing question ${question.id}:`, response.error);
            failCount++;
          } else if (response.data?.optimizedText) {
            // Update the question with optimized text
            const { error: updateError } = await supabase
              .from("questionnaire_questions")
              .update({ question_text: response.data.optimizedText })
              .eq("id", question.id);

            if (updateError) {
              console.error(`Error updating question ${question.id}:`, updateError);
              failCount++;
            } else {
              successCount++;
            }
          }
        } catch (err) {
          console.error(`Error processing question ${question.id}:`, err);
          failCount++;
        }

        setOptimizeProgress(Math.round(((i + 1) / selectedQuestions.length) * 100));
      }

      if (successCount > 0) {
        toast.success(`Successfully optimized ${successCount} question(s)`);
      }
      if (failCount > 0) {
        toast.error(`Failed to optimize ${failCount} question(s)`);
      }

      onComplete();
      onClearSelection();
    } catch (error: any) {
      console.error("Error during bulk optimization:", error);
      toast.error("Bulk optimization failed");
    } finally {
      setOptimizing(false);
      setOptimizeDialogOpen(false);
      setOptimizeProgress(0);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-card border rounded-lg shadow-lg p-4 flex items-center gap-3">
          <span className="text-sm font-medium">
            {selectedQuestionIds.length} question(s) selected
          </span>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkOptimize}
              disabled={processing || optimizing}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Optimize with AI
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkActivate}
              disabled={processing || optimizing}
            >
              <Check className="h-4 w-4 mr-1" />
              Activate
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkDeactivate}
              disabled={processing || optimizing}
            >
              <X className="h-4 w-4 mr-1" />
              Deactivate
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setCategoryDialogOpen(true)}
              disabled={processing || optimizing}
            >
              <FolderOpen className="h-4 w-4 mr-1" />
              Change Category
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={processing || optimizing}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onClearSelection}
              disabled={processing || optimizing}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Category Change Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Category</DialogTitle>
            <DialogDescription>
              Move {selectedQuestionIds.length} selected question(s) to a different category
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Target Category</Label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="">Choose a category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCategoryDialogOpen(false);
                setSelectedCategoryId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkChangeCategory}
              disabled={processing || !selectedCategoryId}
            >
              Move Questions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Optimization Progress Dialog */}
      <Dialog open={optimizeDialogOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Optimizing Questions with AI
            </DialogTitle>
            <DialogDescription>
              Please wait while we optimize {selectedQuestionIds.length} question(s)...
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Progress value={optimizeProgress} className="h-2" />
            <p className="text-sm text-center text-muted-foreground">
              {optimizeProgress}% complete
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
