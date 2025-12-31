import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

interface Category {
  id: string;
  category_name: string;
}

interface Question {
  id: string;
  category_id: string;
  question_text: string;
  display_order: number;
  is_required: boolean;
  is_active: boolean;
  helper_text: string | null;
}

interface EditQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: Question | null;
  categories: Category[];
  onSave: () => void;
}

export function EditQuestionDialog({
  open,
  onOpenChange,
  question,
  categories,
  onSave
}: EditQuestionDialogProps) {
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [formData, setFormData] = useState({
    category_id: "",
    question_text: "",
    display_order: 1,
    is_required: true,
    is_active: true,
    helper_text: ""
  });

  useEffect(() => {
    if (question) {
      setFormData({
        category_id: question.category_id,
        question_text: question.question_text,
        display_order: question.display_order,
        is_required: question.is_required,
        is_active: question.is_active,
        helper_text: question.helper_text || ""
      });
    } else {
      setFormData({
        category_id: categories[0]?.id || "",
        question_text: "",
        display_order: 1,
        is_required: true,
        is_active: true,
        helper_text: ""
      });
    }
  }, [question, categories, open]);

  const handleOptimize = async () => {
    if (!formData.question_text.trim()) {
      toast.error("Please enter question text first");
      return;
    }

    setOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-text", {
        body: { text: formData.question_text, type: "question" },
      });

      if (error) throw error;

      if (data?.success && data?.optimizedText) {
        setFormData(prev => ({ ...prev, question_text: data.optimizedText }));
        toast.success("Question optimized!");
      } else {
        toast.error(data?.error || "Failed to optimize question");
      }
    } catch (error: any) {
      console.error("Error optimizing:", error);
      toast.error(error.message || "Failed to optimize question");
    } finally {
      setOptimizing(false);
    }
  };

  const handleSave = async () => {
    if (!formData.question_text.trim()) {
      toast.error("Question text is required");
      return;
    }

    if (!formData.category_id) {
      toast.error("Please select a category");
      return;
    }

    try {
      setSaving(true);

      const dataToSave = {
        category_id: formData.category_id,
        question_text: formData.question_text.trim(),
        display_order: formData.display_order,
        is_required: formData.is_required,
        is_active: formData.is_active,
        helper_text: formData.helper_text.trim() || null
      };

      if (question) {
        const { error } = await supabase
          .from("questionnaire_questions")
          .update(dataToSave)
          .eq("id", question.id);

        if (error) throw error;
        toast.success("Question updated successfully");
      } else {
        const { error } = await supabase
          .from("questionnaire_questions")
          .insert(dataToSave);

        if (error) throw error;
        toast.success("Question created successfully");
      }

      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving question:", error);
      toast.error("Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{question ? "Edit Question" : "Add New Question"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="">Select a category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.category_name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="question_text">Question Text</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleOptimize}
                disabled={optimizing || !formData.question_text.trim()}
              >
                {optimizing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1" />
                    Optimize with AI
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="question_text"
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              rows={3}
              placeholder="Enter the question text..."
            />
          </div>

          <div>
            <Label htmlFor="helper_text">Helper Text (Optional)</Label>
            <Textarea
              id="helper_text"
              value={formData.helper_text}
              onChange={(e) => setFormData({ ...formData, helper_text: e.target.value })}
              rows={2}
              placeholder="Add guidance or context for this question..."
            />
          </div>

          <div>
            <Label htmlFor="display_order">Display Order</Label>
            <Input
              id="display_order"
              type="number"
              min="1"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_required"
              checked={formData.is_required}
              onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
            />
            <Label htmlFor="is_required">Required question</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {question ? "Update" : "Create"} Question
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
