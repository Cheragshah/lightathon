import { useState, useEffect } from "react";
import { History } from "lucide-react";
import { SectionVersionHistoryDialog } from "./SectionVersionHistoryDialog";
import { SectionAIConfig } from "./SectionAIConfig";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, GripVertical, Eye, AlertCircle, ChevronDown, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";

interface EditCodexDialogProps {
  codex: any;
  open: boolean;
  onClose: () => void;
}

export const EditCodexDialog = ({ codex, open, onClose }: EditCodexDialogProps) => {
  const [formData, setFormData] = useState<any>({
    codex_name: '',
    system_prompt: '',
    word_count_min: 1000,
    word_count_max: 2000,
    is_active: true,
    display_order: 0,
    depends_on_transcript: true,
    // Codex-level AI config
    ai_execution_mode: 'single',
    primary_provider_id: null,
    primary_model: null,
    merge_provider_id: null,
    merge_model: null,
    merge_prompt: ''
  });
  const [codexAISteps, setCodexAISteps] = useState<any[]>([]);
  const [selectedDependencies, setSelectedDependencies] = useState<Set<string>>(new Set());
  const [sections, setSections] = useState<any[]>([]);
  const [availableCodexes, setAvailableCodexes] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [circularError, setCircularError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [categoriesWithQuestions, setCategoriesWithQuestions] = useState<any[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showSectionHistory, setShowSectionHistory] = useState(false);
  const [selectedSectionForHistory, setSelectedSectionForHistory] = useState<any>(null);
  const [optimizingSystemPrompt, setOptimizingSystemPrompt] = useState(false);
  const [optimizingSectionIndex, setOptimizingSectionIndex] = useState<number | null>(null);
  const { toast } = useToast();

  // Validate whenever selectedQuestions or dependency changes
  useEffect(() => {
    if (selectedQuestions.size === 0 && selectedDependencies.size === 0 && !formData.depends_on_transcript) {
      setValidationError("Either select questions OR choose a dependency (codex or transcript)");
    } else {
      setValidationError(null);
    }
  }, [selectedQuestions, selectedDependencies, formData.depends_on_transcript]);

  useEffect(() => {
    loadAvailableCodexes();
    loadQuestionsWithCategories();
    if (codex) {
      setFormData({
        codex_name: codex.codex_name || '',
        system_prompt: codex.system_prompt || '',
        word_count_min: codex.word_count_min || 1000,
        word_count_max: codex.word_count_max || 2000,
        is_active: codex.is_active ?? true,
        display_order: codex.display_order || 0,
        depends_on_transcript: codex.depends_on_transcript || false,
        ai_execution_mode: codex.ai_execution_mode || 'single',
        primary_provider_id: codex.primary_provider_id || null,
        primary_model: codex.primary_model || null,
        merge_provider_id: codex.merge_provider_id || null,
        merge_model: codex.merge_model || null,
        merge_prompt: codex.merge_prompt || ''
      });
      loadSections();
      loadSelectedQuestions();
      loadSelectedDependencies();
      loadCodexAISteps();
    } else {
      // New codex - get max display order
      loadMaxDisplayOrder();
    }
  }, [codex]);

  const loadCodexAISteps = async () => {
    if (!codex?.id) return;
    const { data } = await supabase
      .from('codex_ai_steps' as any)
      .select('*')
      .eq('codex_prompt_id', codex.id)
      .order('step_order', { ascending: true });
    if (data) setCodexAISteps(data);
  };

  const loadAvailableCodexes = async () => {
    const { data } = await supabase
      .from('codex_prompts' as any)
      .select('id, codex_name, display_order, depends_on_codex_id')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    // Exclude current codex from options
    const filtered = (data as any[])?.filter((c: any) => c.id !== codex?.id) || [];
    setAvailableCodexes(filtered);
  };

  const loadQuestionsWithCategories = async () => {
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
  };

  const loadSelectedQuestions = async () => {
    if (!codex?.id) return;
    
    const { data } = await supabase
      .from('codex_question_mappings' as any)
      .select('question_id')
      .eq('codex_prompt_id', codex.id);
    
    if (data) {
      setSelectedQuestions(new Set((data as any[]).map(d => d.question_id)));
    }
  };

  const loadSelectedDependencies = async () => {
    if (!codex?.id) return;
    
    const { data } = await supabase
      .from('codex_prompt_dependencies' as any)
      .select('depends_on_codex_id')
      .eq('codex_prompt_id', codex.id);
    
    if (data) {
      setSelectedDependencies(new Set((data as any[]).map(d => d.depends_on_codex_id)));
    }
  };

  const validateForm = () => {
    if (selectedQuestions.size === 0 && selectedDependencies.size === 0) {
      setValidationError("Either select questions OR choose at least one dependency codex");
      return false;
    }
    setValidationError(null);
    return true;
  };

  // Check for circular dependencies
  const checkCircularDependency = async (dependencyIds: Set<string>): Promise<boolean> => {
    if (dependencyIds.size === 0) {
      setCircularError(null);
      return false;
    }

    // For each selected dependency, check if it would create a cycle
    for (const depId of dependencyIds) {
      const visited = new Set<string>();
      let currentId: string | null = depId;
      
      while (currentId) {
        if (currentId === codex?.id) {
          setCircularError("This would create a circular dependency!");
          return true;
        }
        
        if (visited.has(currentId)) break;
        visited.add(currentId);

        // Get all dependencies of current codex (from new table)
        const { data: deps } = await supabase
          .from('codex_prompt_dependencies' as any)
          .select('depends_on_codex_id')
          .eq('codex_prompt_id', currentId);
        
        // Check first dependency in chain
        currentId = deps && deps.length > 0 ? (deps[0] as any).depends_on_codex_id : null;
      }
    }

    setCircularError(null);
    return false;
  };

  // Handle dependency toggle
  const handleDependencyToggle = async (depId: string) => {
    const newDeps = new Set(selectedDependencies);
    if (newDeps.has(depId)) {
      newDeps.delete(depId);
    } else {
      newDeps.add(depId);
    }
    setSelectedDependencies(newDeps);
    await checkCircularDependency(newDeps);
  };

  // Generate preview of how dependent content would be included
  const handleGeneratePreview = async () => {
    if (selectedDependencies.size === 0) {
      toast({ title: "No dependencies selected", variant: "destructive" });
      return;
    }

    let mockContent = "";
    for (const depId of selectedDependencies) {
      const depCodex = availableCodexes.find(c => c.id === depId);
      if (!depCodex) continue;

      mockContent += `=== CONTENT FROM: ${depCodex.codex_name.toUpperCase()} ===

=== Introduction Section ===
This is example content from the ${depCodex.codex_name}. It would contain the actual generated sections and content that was created based on the user's answers.

=== Key Points Section ===
• Main point 1 from the dependent codex
• Main point 2 from the dependent codex
• Main point 3 from the dependent codex

`;
    }

    mockContent += `\nThis preview shows how the dependent codex content would be formatted and included in the prompt when generating ${formData.codex_name || 'this codex'}.`;

    setPreviewContent(mockContent);
    setShowPreview(true);
  };

  const loadMaxDisplayOrder = async () => {
    const { data } = await supabase
      .from('codex_prompts' as any)
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single();
    
    setFormData(prev => ({ ...prev, display_order: ((data as any)?.display_order || 0) + 1 }));
  };

  const loadSections = async () => {
    if (!codex) return;
    
    const { data, error } = await supabase
      .from('codex_section_prompts' as any)
      .select('*')
      .eq('codex_prompt_id', codex.id)
      .order('section_index', { ascending: true });

    if (!error && data) {
      setSections(data);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    
    try {
      let codexId = codex?.id;
      
      if (codex) {
        // Update existing codex
        const { error: codexError } = await supabase
          .from('codex_prompts' as any)
          .update(formData as any)
          .eq('id', codex.id);

        if (codexError) throw codexError;

        // Update sections
        for (let i = 0; i < sections.length; i++) {
          const section = sections[i];
          if (section.id) {
            // Update existing section
            const { error: updateError } = await supabase
              .from('codex_section_prompts' as any)
              .update({
                section_name: section.section_name,
                section_prompt: section.section_prompt,
                section_index: i,
                word_count_target: section.word_count_target || 500,
                is_active: section.is_active ?? true,
                ai_execution_mode: section.ai_execution_mode || 'single',
                primary_provider_id: section.primary_provider_id,
                primary_model: section.primary_model,
                merge_provider_id: section.merge_provider_id,
                merge_model: section.merge_model,
                merge_prompt: section.merge_prompt
              } as any)
              .eq('id', section.id);
            
            if (updateError) {
              console.error('Error updating section:', updateError);
              throw updateError;
            }
          } else {
            // Insert new section with all required fields
            const newSection = {
              codex_prompt_id: codex.id,
              section_name: section.section_name,
              section_prompt: section.section_prompt,
              section_index: i,
              word_count_target: section.word_count_target || 500,
              is_active: section.is_active ?? true
            };
            
            const { error: insertError } = await supabase
              .from('codex_section_prompts' as any)
              .insert(newSection as any);
            
            if (insertError) {
              console.error('Error inserting section:', insertError);
              throw insertError;
            }
          }
        }
      } else {
        // Create new codex
        const { data: newCodex, error: codexError } = await supabase
          .from('codex_prompts' as any)
          .insert(formData as any)
          .select()
          .single();

        if (codexError) throw codexError;
        codexId = (newCodex as any).id;

        // Insert sections
        if (sections.length > 0) {
          const newSections = sections.map((section, index) => ({
            codex_prompt_id: codexId,
            section_name: section.section_name,
            section_prompt: section.section_prompt,
            section_index: index,
            word_count_target: section.word_count_target || 500,
            is_active: section.is_active ?? true
          }));

          await supabase.from('codex_section_prompts' as any).insert(newSections as any);
        }
      }

      // Update question mappings
      await supabase
        .from('codex_question_mappings' as any)
        .delete()
        .eq('codex_prompt_id', codexId);
      
      if (selectedQuestions.size > 0) {
        const mappings = Array.from(selectedQuestions).map(qId => ({
          codex_prompt_id: codexId,
          question_id: qId
        }));
        await supabase.from('codex_question_mappings' as any).insert(mappings as any);
      }

      // Update dependency mappings
      await supabase
        .from('codex_prompt_dependencies' as any)
        .delete()
        .eq('codex_prompt_id', codexId);
      
      if (selectedDependencies.size > 0) {
        const depMappings = Array.from(selectedDependencies).map((depId, index) => ({
          codex_prompt_id: codexId,
          depends_on_codex_id: depId,
          display_order: index
        }));
        await supabase.from('codex_prompt_dependencies' as any).insert(depMappings as any);
      }

      // Update codex-level AI steps
      await supabase
        .from('codex_ai_steps' as any)
        .delete()
        .eq('codex_prompt_id', codexId);
      
      if (codexAISteps.length > 0) {
        const stepMappings = codexAISteps.map((step, index) => ({
          codex_prompt_id: codexId,
          step_order: index,
          provider_id: step.provider_id,
          model_name: step.model_name,
          step_type: step.step_type || 'generate',
          custom_prompt: step.custom_prompt
        }));
        await supabase.from('codex_ai_steps' as any).insert(stepMappings as any);
      }

      toast({ 
        title: codex ? "Updated" : "Created", 
        description: `Codex ${codex ? 'updated' : 'created'} successfully` 
      });

      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addSection = () => {
    setSections([...sections, {
      section_name: '',
      section_prompt: '',
      section_index: sections.length,
      word_count_target: 500,
      is_active: true
    }]);
  };

  const removeSection = async (index: number) => {
    const section = sections[index];
    if (section.id) {
      await supabase.from('codex_section_prompts' as any).delete().eq('id', section.id);
    }
    setSections(sections.filter((_, i) => i !== index));
  };

  const updateSection = (index: number, field: string, value: any) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setSections(newSections);
  };

  const handleOptimizeSystemPrompt = async () => {
    if (!formData.system_prompt.trim()) {
      toast({ title: "Error", description: "Please enter a system prompt first", variant: "destructive" });
      return;
    }

    setOptimizingSystemPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-text", {
        body: { text: formData.system_prompt, type: "system_prompt" },
      });

      if (error) throw error;

      if (data?.success && data?.optimizedText) {
        setFormData(prev => ({ ...prev, system_prompt: data.optimizedText }));
        toast({ title: "Optimized!", description: "System prompt has been optimized" });
      } else {
        toast({ title: "Error", description: data?.error || "Failed to optimize", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Error optimizing system prompt:", error);
      toast({ title: "Error", description: error.message || "Failed to optimize", variant: "destructive" });
    } finally {
      setOptimizingSystemPrompt(false);
    }
  };

  const handleOptimizeSectionPrompt = async (index: number) => {
    const section = sections[index];
    if (!section.section_prompt?.trim()) {
      toast({ title: "Error", description: "Please enter a section prompt first", variant: "destructive" });
      return;
    }

    setOptimizingSectionIndex(index);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-text", {
        body: { text: section.section_prompt, type: "section_prompt" },
      });

      if (error) throw error;

      if (data?.success && data?.optimizedText) {
        updateSection(index, 'section_prompt', data.optimizedText);
        toast({ title: "Optimized!", description: "Section prompt has been optimized" });
      } else {
        toast({ title: "Error", description: data?.error || "Failed to optimize", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Error optimizing section prompt:", error);
      toast({ title: "Error", description: error.message || "Failed to optimize", variant: "destructive" });
    } finally {
      setOptimizingSectionIndex(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{codex ? 'Edit Codex' : 'Create New Codex'}</DialogTitle>
          <DialogDescription>
            Configure codex metadata, system prompt, and all sections
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4">
            <div>
              <Label>Codex Name</Label>
              <Input
                value={formData.codex_name}
                onChange={(e) => setFormData({ ...formData, codex_name: e.target.value })}
                placeholder="e.g., Coach Persona Blueprint"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>System Prompt</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleOptimizeSystemPrompt}
                  disabled={optimizingSystemPrompt || !formData.system_prompt.trim()}
                >
                  {optimizingSystemPrompt ? (
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
                value={formData.system_prompt}
                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                rows={6}
                placeholder="Define the AI's role and writing style..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Min Word Count</Label>
                <Input
                  type="number"
                  value={formData.word_count_min}
                  onChange={(e) => setFormData({ ...formData, word_count_min: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Max Word Count</Label>
                <Input
                  type="number"
                  value={formData.word_count_max}
                  onChange={(e) => setFormData({ ...formData, word_count_max: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Use Content From Codex(es) (Optional)</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select multiple codexes to use their content as context
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-4">
                  {availableCodexes.map(c => (
                    <div key={c.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dep-${c.id}`}
                        checked={selectedDependencies.has(c.id)}
                        onCheckedChange={() => handleDependencyToggle(c.id)}
                        disabled={formData.depends_on_transcript}
                      />
                      <label
                        htmlFor={`dep-${c.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                      >
                        {c.codex_name}
                      </label>
                    </div>
                  ))}
                </div>
                {selectedDependencies.size > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedDependencies.size} codex(es) selected
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="depends_on_transcript"
                  checked={formData.depends_on_transcript}
                  onCheckedChange={(checked) => {
                    setFormData({ 
                      ...formData, 
                      depends_on_transcript: checked
                    });
                    if (checked) {
                      setSelectedDependencies(new Set());
                    }
                  }}
                />
                <Label htmlFor="depends_on_transcript" className="cursor-pointer">
                  Use Original Transcript as Context
                </Label>
              </div>
              {formData.depends_on_transcript && (
                <p className="text-sm text-muted-foreground">
                  ℹ️ This codex will use the uploaded transcript as context when available. If no transcript exists, this will be ignored.
                </p>
              )}
              
              {circularError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{circularError}</AlertDescription>
                </Alert>
              )}
              
              {!circularError && selectedDependencies.size > 0 && (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    ℹ️ This codex will receive the generated content from {selectedDependencies.size} selected codex(es) as additional context
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePreview}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview Dependency Context
                  </Button>
                </div>
              )}
              
              {showPreview && previewContent && (
                <Collapsible open={showPreview} onOpenChange={setShowPreview} className="mt-3">
                  <CollapsibleContent>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-xs font-mono bg-muted p-3 rounded-md whitespace-pre-wrap max-h-60 overflow-y-auto">
                          {previewContent}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          This shows how the dependent content will be formatted in the prompt
                        </p>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>

            {/* Question Selection Section */}
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div>
                    <Label className="text-base">Questions Context (Optional)</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select specific questions to include. If none selected, a dependency codex is required.
                    </p>
                  </div>

                  {validationError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{validationError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    {categoriesWithQuestions.map(category => {
                      const questions = (category.questions as any[]) || [];
                      const selectedInCategory = questions.filter(q => selectedQuestions.has(q.id)).length;
                      const isOpen = openCategories.has(category.id);

                      return (
                        <Collapsible
                          key={category.id}
                          open={isOpen}
                          onOpenChange={() => {
                            const newOpen = new Set(openCategories);
                            if (isOpen) newOpen.delete(category.id);
                            else newOpen.add(category.id);
                            setOpenCategories(newOpen);
                          }}
                        >
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                              <span className="font-medium">
                                {category.category_name} ({selectedInCategory}/{questions.length} selected)
                              </span>
                              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-3 pb-2">
                            <div className="space-y-2 pl-4">
                              {questions
                                .sort((a, b) => a.display_order - b.display_order)
                                .map(question => (
                                  <div key={question.id} className="flex items-start gap-2 py-1">
                                    <Checkbox
                                      id={question.id}
                                      checked={selectedQuestions.has(question.id)}
                                      onCheckedChange={(checked) => {
                                        const newSelected = new Set(selectedQuestions);
                                        if (checked) newSelected.add(question.id);
                                        else newSelected.delete(question.id);
                                        setSelectedQuestions(newSelected);
                                      }}
                                    />
                                    <label
                                      htmlFor={question.id}
                                      className="text-sm cursor-pointer leading-tight"
                                    >
                                      {question.question_text}
                                    </label>
                                  </div>
                                ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allQuestionIds = new Set(
                          categoriesWithQuestions.flatMap(c => 
                            ((c.questions as any[]) || []).map(q => q.id)
                          )
                        );
                        setSelectedQuestions(allQuestionIds);
                      }}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedQuestions(new Set());
                      }}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active (available for generation)</Label>
            </div>
          </div>

          {/* Codex-level AI Configuration */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <Label className="text-lg font-semibold">AI Model Configuration</Label>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                This AI configuration applies to <strong>all sections</strong> in this codex.
              </p>
              <SectionAIConfig
                executionMode={formData.ai_execution_mode || 'single'}
                primaryProviderId={formData.primary_provider_id}
                primaryModel={formData.primary_model}
                mergeProviderId={formData.merge_provider_id}
                mergeModel={formData.merge_model}
                mergePrompt={formData.merge_prompt}
                aiSteps={codexAISteps}
                onExecutionModeChange={(mode) => setFormData({ ...formData, ai_execution_mode: mode })}
                onPrimaryProviderChange={(id) => setFormData({ ...formData, primary_provider_id: id })}
                onPrimaryModelChange={(model) => setFormData({ ...formData, primary_model: model })}
                onMergeProviderChange={(id) => setFormData({ ...formData, merge_provider_id: id })}
                onMergeModelChange={(model) => setFormData({ ...formData, merge_model: model })}
                onMergePromptChange={(prompt) => setFormData({ ...formData, merge_prompt: prompt })}
                onAIStepsChange={(steps) => setCodexAISteps(steps)}
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Label className="text-lg">Sections ({sections.length})</Label>

            {sections.map((section, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Label>Section {index + 1}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        {section.id && (
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => {
                              setSelectedSectionForHistory(section);
                              setShowSectionHistory(true);
                            }}
                            title="View version history"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        )}
                        <Switch
                          checked={section.is_active ?? true}
                          onCheckedChange={(checked) => updateSection(index, 'is_active', checked)}
                        />
                        <Button size="icon" variant="ghost" onClick={() => removeSection(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <Input
                      value={section.section_name}
                      onChange={(e) => updateSection(index, 'section_name', e.target.value)}
                      placeholder="Section name..."
                    />

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label>Section Prompt</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOptimizeSectionPrompt(index)}
                          disabled={optimizingSectionIndex === index || !section.section_prompt?.trim()}
                        >
                          {optimizingSectionIndex === index ? (
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
                        value={section.section_prompt}
                        onChange={(e) => updateSection(index, 'section_prompt', e.target.value)}
                        rows={4}
                        placeholder="Section prompt instructions..."
                      />
                    </div>

                    <div>
                      <Label>Target Word Count</Label>
                      <Input
                        type="number"
                        value={section.word_count_target || 500}
                        onChange={(e) => updateSection(index, 'word_count_target', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button onClick={addSection} size="sm" variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Section
            </Button>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving || !!circularError || !!validationError}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {codex ? 'Update' : 'Create'} Codex
            </Button>
            <Button onClick={onClose} variant="outline">Cancel</Button>
          </div>
        </div>

        {showSectionHistory && selectedSectionForHistory && (
          <SectionVersionHistoryDialog
            section={selectedSectionForHistory}
            open={showSectionHistory}
            onClose={() => {
              setShowSectionHistory(false);
              setSelectedSectionForHistory(null);
              loadSections();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
