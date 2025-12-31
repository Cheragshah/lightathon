import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link2, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface BulkQuestionMappingDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkQuestionMappingDialog = ({ open, onClose, onSuccess }: BulkQuestionMappingDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [codexes, setCodexes] = useState<any[]>([]);
  const [selectedCodexes, setSelectedCodexes] = useState<Set<string>>(new Set());
  const [categoriesWithQuestions, setCategoriesWithQuestions] = useState<any[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);

    // Load all active codexes
    const { data: codexData } = await supabase
      .from('codex_prompts' as any)
      .select('id, codex_name, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    setCodexes(codexData || []);

    // Load questions with categories
    const { data: categories } = await supabase
      .from('questionnaire_categories' as any)
      .select(`
        id,
        category_name,
        questions:questionnaire_questions(id, question_text, display_order)
      `)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    setCategoriesWithQuestions(categories || []);
    setLoading(false);
  };

  const handleToggleCodex = (codexId: string) => {
    const newSet = new Set(selectedCodexes);
    if (newSet.has(codexId)) {
      newSet.delete(codexId);
    } else {
      newSet.add(codexId);
    }
    setSelectedCodexes(newSet);
  };

  const handleToggleQuestion = (questionId: string) => {
    const newSet = new Set(selectedQuestions);
    if (newSet.has(questionId)) {
      newSet.delete(questionId);
    } else {
      newSet.add(questionId);
    }
    setSelectedQuestions(newSet);
  };

  const handleToggleCategory = (categoryId: string) => {
    const newSet = new Set(openCategories);
    if (newSet.has(categoryId)) {
      newSet.delete(categoryId);
    } else {
      newSet.add(categoryId);
    }
    setOpenCategories(newSet);
  };

  const handleSelectAllCodexes = () => {
    if (selectedCodexes.size === codexes.length) {
      setSelectedCodexes(new Set());
    } else {
      setSelectedCodexes(new Set(codexes.map(c => c.id)));
    }
  };

  const handleSelectAllQuestions = () => {
    const allQuestions = categoriesWithQuestions.flatMap(cat => 
      cat.questions?.map((q: any) => q.id) || []
    );
    if (selectedQuestions.size === allQuestions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(allQuestions));
    }
  };

  const handleSave = async () => {
    if (selectedCodexes.size === 0 || selectedQuestions.size === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one codex and one question",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      // For each selected codex, delete existing mappings and add new ones
      for (const codexId of selectedCodexes) {
        // Delete existing mappings for this codex
        await supabase
          .from('codex_question_mappings' as any)
          .delete()
          .eq('codex_prompt_id', codexId);

        // Insert new mappings
        const mappings = Array.from(selectedQuestions).map(questionId => ({
          codex_prompt_id: codexId,
          question_id: questionId
        }));

        const { error } = await supabase
          .from('codex_question_mappings' as any)
          .insert(mappings);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Updated question mappings for ${selectedCodexes.size} codex${selectedCodexes.size !== 1 ? 'es' : ''}`
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Bulk Question Mapping
          </DialogTitle>
          <DialogDescription>
            Map the same questions to multiple codexes at once
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Codex Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Select Codexes</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleSelectAllCodexes}
                >
                  {selectedCodexes.size === codexes.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <Badge variant="secondary">
                {selectedCodexes.size} of {codexes.length} selected
              </Badge>
              <ScrollArea className="h-[400px] border rounded-lg p-3">
                <div className="space-y-2">
                  {codexes.map((codex) => (
                    <div 
                      key={codex.id}
                      className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleToggleCodex(codex.id)}
                    >
                      <Checkbox
                        checked={selectedCodexes.has(codex.id)}
                        onCheckedChange={() => handleToggleCodex(codex.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{codex.codex_name}</p>
                        <p className="text-xs text-muted-foreground">Order: {codex.display_order}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Right Column - Question Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Select Questions</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleSelectAllQuestions}
                >
                  {selectedQuestions.size === categoriesWithQuestions.flatMap(c => c.questions || []).length 
                    ? 'Deselect All' 
                    : 'Select All'}
                </Button>
              </div>
              <Badge variant="secondary">
                {selectedQuestions.size} questions selected
              </Badge>
              <ScrollArea className="h-[400px] border rounded-lg p-3">
                <div className="space-y-3">
                  {categoriesWithQuestions.map((category) => (
                    <Collapsible 
                      key={category.id}
                      open={openCategories.has(category.id)}
                      onOpenChange={() => handleToggleCategory(category.id)}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <ChevronDown 
                            className={`h-4 w-4 transition-transform ${
                              openCategories.has(category.id) ? 'rotate-180' : ''
                            }`} 
                          />
                          <span className="font-medium text-sm">{category.category_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {category.questions?.length || 0}
                          </Badge>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="ml-6 mt-2 space-y-1">
                        {category.questions?.map((question: any) => (
                          <div 
                            key={question.id}
                            className="flex items-start gap-2 p-2 rounded hover:bg-muted/30 cursor-pointer"
                            onClick={() => handleToggleQuestion(question.id)}
                          >
                            <Checkbox
                              checked={selectedQuestions.has(question.id)}
                              onCheckedChange={() => handleToggleQuestion(question.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <p className="text-sm flex-1">{question.question_text}</p>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {selectedCodexes.size > 0 && selectedQuestions.size > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will replace all existing question mappings for the selected {selectedCodexes.size} codex{selectedCodexes.size !== 1 ? 'es' : ''} with the {selectedQuestions.size} selected question{selectedQuestions.size !== 1 ? 's' : ''}.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || selectedCodexes.size === 0 || selectedQuestions.size === 0}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Mappings'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
