import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Cpu, Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AIModel {
  id: string;
  name: string;
  context_window: number;
  supports_vision: boolean;
}

interface AIProvider {
  id: string;
  provider_code: string;
  name: string;
  available_models: AIModel[];
  hasKey?: boolean;
}

interface AIStep {
  provider_id: string;
  model_name: string;
  step_type: "generate" | "merge";
  custom_prompt?: string;
}

interface SectionAIConfigProps {
  executionMode: "single" | "parallel_merge" | "sequential_chain";
  primaryProviderId?: string;
  primaryModel?: string;
  mergeProviderId?: string;
  mergeModel?: string;
  mergePrompt?: string;
  aiSteps?: AIStep[];
  onExecutionModeChange: (mode: "single" | "parallel_merge" | "sequential_chain") => void;
  onPrimaryProviderChange: (providerId: string) => void;
  onPrimaryModelChange: (model: string) => void;
  onMergeProviderChange: (providerId: string) => void;
  onMergeModelChange: (model: string) => void;
  onMergePromptChange: (prompt: string) => void;
  onAIStepsChange: (steps: AIStep[]) => void;
}

export const SectionAIConfig = ({
  executionMode,
  primaryProviderId,
  primaryModel,
  mergeProviderId,
  mergeModel,
  mergePrompt,
  aiSteps = [],
  onExecutionModeChange,
  onPrimaryProviderChange,
  onPrimaryModelChange,
  onMergeProviderChange,
  onMergeModelChange,
  onMergePromptChange,
  onAIStepsChange,
}: SectionAIConfigProps) => {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadProviders();
  }, []);

  // Initialize steps when switching to parallel or chain mode
  useEffect(() => {
    if (!loading && providers.length > 0) {
      const defaultProvider = providers.find(p => p.hasKey) || providers[0];
      
      if (executionMode === "parallel_merge" && aiSteps.length === 0 && defaultProvider) {
        // Add 2 initial generation models for parallel mode
        onAIStepsChange([
          {
            provider_id: defaultProvider.id,
            model_name: defaultProvider.available_models[0]?.id || "",
            step_type: "generate",
          },
          {
            provider_id: defaultProvider.id,
            model_name: defaultProvider.available_models[0]?.id || "",
            step_type: "generate",
          },
        ]);
        setIsOpen(true); // Auto-expand to show config
      } else if (executionMode === "sequential_chain" && aiSteps.length === 0 && defaultProvider) {
        // Add 2 initial steps for chain mode
        onAIStepsChange([
          {
            provider_id: defaultProvider.id,
            model_name: defaultProvider.available_models[0]?.id || "",
            step_type: "generate",
          },
          {
            provider_id: defaultProvider.id,
            model_name: defaultProvider.available_models[0]?.id || "",
            step_type: "generate",
          },
        ]);
        setIsOpen(true); // Auto-expand to show config
      }
    }
  }, [executionMode, loading, providers.length]);

  const loadProviders = async () => {
    try {
      const { data: providersData } = await supabase
        .from("ai_providers")
        .select("id, provider_code, name, available_models")
        .eq("is_active", true)
        .order("name");

      const { data: keysData } = await supabase
        .from("ai_provider_keys")
        .select("provider_id")
        .eq("is_active", true);

      const keysSet = new Set(keysData?.map(k => k.provider_id) || []);

      // Only include providers that have an active API key configured
      const providersWithKeys = (providersData || [])
        .filter(p => keysSet.has(p.id))
        .map(p => ({
          ...p,
          available_models: (p.available_models as unknown) as AIModel[],
          hasKey: true,
        }));

      setProviders(providersWithKeys);
    } catch (error) {
      console.error("Error loading providers:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProviderModels = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    return provider?.available_models || [];
  };

  const getProviderName = (providerId: string) => {
    return providers.find(p => p.id === providerId)?.name || "Unknown";
  };

  const addAIStep = () => {
    const defaultProvider = providers.find(p => p.hasKey);
    if (!defaultProvider) return;

    onAIStepsChange([
      ...aiSteps,
      {
        provider_id: defaultProvider.id,
        model_name: defaultProvider.available_models[0]?.id || "",
        step_type: "generate",
      },
    ]);
  };

  const removeAIStep = (index: number) => {
    onAIStepsChange(aiSteps.filter((_, i) => i !== index));
  };

  const updateAIStep = (index: number, field: keyof AIStep, value: string) => {
    const newSteps = [...aiSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    onAIStepsChange(newSteps);
  };

  const renderModelSelector = (
    label: string,
    providerId: string | undefined,
    modelName: string | undefined,
    onProviderChange: (id: string) => void,
    onModelChange: (model: string) => void
  ) => (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <Select value={providerId || ""} onValueChange={onProviderChange}>
          <SelectTrigger>
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map(provider => (
              <SelectItem 
                key={provider.id} 
                value={provider.id}
                disabled={!provider.hasKey}
              >
                <div className="flex items-center gap-2">
                  <span>{provider.name}</span>
                  {!provider.hasKey && (
                    <Badge variant="outline" className="text-xs">No key</Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={modelName || ""} 
          onValueChange={onModelChange}
          disabled={!providerId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            {getProviderModels(providerId || "").map(model => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (loading) {
    return <div className="h-10 bg-muted animate-pulse rounded-md" />;
  }

  const hasConfiguredProvider = providers.some(p => p.hasKey);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-2 h-auto" type="button">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">AI Model Configuration</span>
            {executionMode !== "single" && (
              <Badge variant="secondary" className="text-xs">
                {executionMode === "parallel_merge" ? "Parallel" : "Chain"}
              </Badge>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 space-y-4">
        {!hasConfiguredProvider && (
          <p className="text-sm text-muted-foreground">
            No AI providers configured. Using default OpenAI. Configure providers in System Settings.
          </p>
        )}

        {/* Execution Mode */}
        <div className="space-y-2">
          <Label className="text-sm">Execution Mode</Label>
          <Select value={executionMode} onValueChange={(v) => onExecutionModeChange(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">
                <div className="flex flex-col items-start">
                  <span>Single Model</span>
                  <span className="text-xs text-muted-foreground">One AI generates content</span>
                </div>
              </SelectItem>
              <SelectItem value="parallel_merge">
                <div className="flex flex-col items-start">
                  <span>Parallel Merge</span>
                  <span className="text-xs text-muted-foreground">Multiple AIs → Merge results</span>
                </div>
              </SelectItem>
              <SelectItem value="sequential_chain">
                <div className="flex flex-col items-start">
                  <span>Sequential Chain</span>
                  <span className="text-xs text-muted-foreground">AI 1 → AI 2 → AI 3 (refinement)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Single Mode Config */}
        {executionMode === "single" && (
          renderModelSelector(
            "AI Model",
            primaryProviderId,
            primaryModel,
            onPrimaryProviderChange,
            onPrimaryModelChange
          )
        )}

        {/* Parallel Merge Config */}
        {executionMode === "parallel_merge" && (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm">Generation Models (run in parallel)</Label>
              {aiSteps.filter(s => s.step_type === "generate").map((step, index) => (
                <Card key={index} className="border-dashed">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <Select 
                          value={step.provider_id} 
                          onValueChange={(v) => updateAIStep(index, "provider_id", v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {providers.filter(p => p.hasKey).map(provider => (
                              <SelectItem key={provider.id} value={provider.id}>
                                {provider.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select 
                          value={step.model_name} 
                          onValueChange={(v) => updateAIStep(index, "model_name", v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Model" />
                          </SelectTrigger>
                          <SelectContent>
                            {getProviderModels(step.provider_id).map(model => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-9 w-9"
                        onClick={() => removeAIStep(index)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={addAIStep}
                type="button"
                disabled={!hasConfiguredProvider}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Model
              </Button>
            </div>

            {renderModelSelector(
              "Merge Model (synthesizes results)",
              mergeProviderId,
              mergeModel,
              onMergeProviderChange,
              onMergeModelChange
            )}

            <div className="space-y-2">
              <Label className="text-sm">Merge Prompt</Label>
              <Textarea
                value={mergePrompt || ""}
                onChange={(e) => onMergePromptChange(e.target.value)}
                placeholder="Instructions for synthesizing the parallel results..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Tell the merge model how to combine the outputs from all generation models.
              </p>
            </div>
          </div>
        )}

        {/* Sequential Chain Config */}
        {executionMode === "sequential_chain" && (
          <div className="space-y-3">
            <Label className="text-sm">Chain Steps (executed in order)</Label>
            {aiSteps.map((step, index) => (
              <Card key={index} className="border-dashed">
                <CardContent className="pt-3 pb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Step {index + 1}</Badge>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7"
                      onClick={() => removeAIStep(index)}
                      type="button"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select 
                      value={step.provider_id} 
                      onValueChange={(v) => updateAIStep(index, "provider_id", v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.filter(p => p.hasKey).map(provider => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      value={step.model_name} 
                      onValueChange={(v) => updateAIStep(index, "model_name", v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Model" />
                      </SelectTrigger>
                      <SelectContent>
                        {getProviderModels(step.provider_id).map(model => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {index > 0 && (
                    <Textarea
                      value={step.custom_prompt || ""}
                      onChange={(e) => updateAIStep(index, "custom_prompt", e.target.value)}
                      placeholder="Custom instructions for this step (optional)..."
                      rows={2}
                      className="text-sm"
                    />
                  )}
                </CardContent>
              </Card>
            ))}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={addAIStep}
              type="button"
              disabled={!hasConfiguredProvider}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Step
            </Button>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
