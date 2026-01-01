import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Loader2, User, Eye, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CodexPrompt {
  id: string;
  codex_name: string;
  system_prompt: string;
}

interface SectionPrompt {
  id: string;
  section_name: string;
  section_prompt: string;
  section_index: number;
}

const DEFAULT_PERSONA_PROMPT = `You are Cherag Shah, Mind Architect. You are speaking directly to the user in first-person voice.

CRITICAL VOICE REQUIREMENTS:
- Write as if YOU (Cherag Shah) are personally guiding and advising the user
- Use first-person language: "I recommend...", "Based on my analysis...", "I see in you..."
- Address the user directly: "You have...", "Your strength is...", "I suggest you..."
- Never write in third-person about the coach or the user
- The tone should be that of a wise mentor speaking directly to their student
- Every section should feel like a personal conversation, not a report about someone

Example: Instead of "The coach should focus on..." write "I recommend you focus on..."
Example: Instead of "This person has strengths in..." write "I see powerful strengths in you, particularly..."`;

interface AIProvider {
  id: string;
  name: string;
  provider_code: string;
  available_models: Array<{ id: string; name: string }>;
}

export const SystemSettings = () => {
  const [cooldownMinutes, setCooldownMinutes] = useState<string>("60");
  const [globalPersonaPrompt, setGlobalPersonaPrompt] = useState<string>(DEFAULT_PERSONA_PROMPT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPersona, setSavingPersona] = useState(false);
  
  // Global default AI model state
  const [globalDefaultProviderId, setGlobalDefaultProviderId] = useState<string>("");
  const [globalDefaultModel, setGlobalDefaultModel] = useState<string>("");
  const [aiProviders, setAIProviders] = useState<AIProvider[]>([]);
  const [savingDefaultAI, setSavingDefaultAI] = useState(false);
  
  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [codexPrompts, setCodexPrompts] = useState<CodexPrompt[]>([]);
  const [sectionPrompts, setSectionPrompts] = useState<SectionPrompt[]>([]);
  const [selectedCodex, setSelectedCodex] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  
  // Optimize state
  const [optimizingPersona, setOptimizingPersona] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
    loadAIProviders();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["regeneration_cooldown_minutes", "global_ai_persona_prompt", "global_default_ai_provider", "global_default_ai_model"]);

      if (error) throw error;
      
      if (data) {
        data.forEach((setting) => {
          if (setting.setting_key === "regeneration_cooldown_minutes") {
            setCooldownMinutes(String(setting.setting_value));
          } else if (setting.setting_key === "global_ai_persona_prompt") {
            let promptValue = setting.setting_value;
            if (typeof promptValue === 'string') {
              try {
                promptValue = JSON.parse(promptValue);
              } catch {
                // If parsing fails, use as-is
              }
            }
            setGlobalPersonaPrompt(String(promptValue) || DEFAULT_PERSONA_PROMPT);
          } else if (setting.setting_key === "global_default_ai_provider") {
            setGlobalDefaultProviderId(String(setting.setting_value || ""));
          } else if (setting.setting_key === "global_default_ai_model") {
            setGlobalDefaultModel(String(setting.setting_value || ""));
          }
        });
      }
    } catch (error: any) {
      toast({
        title: "Error loading settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAIProviders = async () => {
    try {
      const { data: providersData } = await supabase
        .from("ai_providers")
        .select("id, name, provider_code, available_models")
        .eq("is_active", true)
        .order("name");

      const { data: keysData } = await supabase
        .from("ai_provider_keys")
        .select("provider_id")
        .eq("is_active", true);

      const keysSet = new Set(keysData?.map(k => k.provider_id) || []);

      // Include Lovable AI (uses env var, no DB key needed) + providers with active API keys
      const availableProviders = (providersData || [])
        .filter(p => p.provider_code === "lovable" || keysSet.has(p.id))
        .map(p => ({
          ...p,
          available_models: (p.available_models as unknown) as Array<{ id: string; name: string }>
        }));

      setAIProviders(availableProviders);
    } catch (error: any) {
      console.error("Error loading AI providers:", error);
    }
  };

  const handleSave = async () => {
    const minutes = parseInt(cooldownMinutes);
    if (isNaN(minutes) || minutes < 0) {
      toast({
        title: "Invalid value",
        description: "Please enter a valid number of minutes (0 or greater)",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { error } = await supabase
        .from("system_settings")
        .update({
          setting_value: minutes,
          updated_by: session?.user?.id,
        })
        .eq("setting_key", "regeneration_cooldown_minutes");

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: `Regeneration cooldown set to ${minutes} minute(s)`,
      });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePersonaPrompt = async () => {
    if (!globalPersonaPrompt.trim()) {
      toast({
        title: "Invalid value",
        description: "Please enter a valid persona prompt",
        variant: "destructive",
      });
      return;
    }

    setSavingPersona(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { error } = await supabase
        .from("system_settings")
        .update({
          setting_value: globalPersonaPrompt,
          updated_by: session?.user?.id,
        })
        .eq("setting_key", "global_ai_persona_prompt");

      if (error) throw error;

      toast({
        title: "Persona prompt saved",
        description: "Global AI persona prompt has been updated",
      });
    } catch (error: any) {
      toast({
        title: "Error saving persona prompt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingPersona(false);
    }
  };

  const handleSaveDefaultAI = async () => {
    setSavingDefaultAI(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Upsert provider setting
      await supabase
        .from("system_settings")
        .upsert({
          setting_key: "global_default_ai_provider",
          setting_value: globalDefaultProviderId,
          updated_by: session?.user?.id,
        }, { onConflict: 'setting_key' });

      // Upsert model setting
      await supabase
        .from("system_settings")
        .upsert({
          setting_key: "global_default_ai_model",
          setting_value: globalDefaultModel,
          updated_by: session?.user?.id,
        }, { onConflict: 'setting_key' });

      toast({
        title: "Default AI model saved",
        description: "Codexes without specific AI config will use this model",
      });
    } catch (error: any) {
      toast({
        title: "Error saving default AI",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingDefaultAI(false);
    }
  };

  const handleResetPersonaPrompt = () => {
    setGlobalPersonaPrompt(DEFAULT_PERSONA_PROMPT);
    toast({
      title: "Prompt reset",
      description: "The prompt has been reset to default. Click Save to apply.",
    });
  };

  const handleOptimizePersonaPrompt = async () => {
    if (!globalPersonaPrompt.trim()) {
      toast({
        title: "No prompt to optimize",
        description: "Please enter a persona prompt first",
        variant: "destructive",
      });
      return;
    }

    setOptimizingPersona(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("optimize-text", {
        body: { 
          text: globalPersonaPrompt, 
          type: "prompt" 
        },
      });

      if (error) throw error;

      if (data?.optimizedText) {
        setGlobalPersonaPrompt(data.optimizedText);
        sonnerToast.success("Persona prompt optimized! Click Save to apply changes.");
      } else {
        throw new Error("No optimized text returned");
      }
    } catch (error: any) {
      console.error("Error optimizing persona prompt:", error);
      toast({
        title: "Optimization failed",
        description: error.message || "Failed to optimize persona prompt",
        variant: "destructive",
      });
    } finally {
      setOptimizingPersona(false);
    }
  };

  // Load codex prompts when preview is opened
  const loadCodexPrompts = async () => {
    setLoadingPrompts(true);
    try {
      const { data, error } = await supabase
        .from("codex_prompts")
        .select("id, codex_name, system_prompt")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      setCodexPrompts(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading codex prompts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingPrompts(false);
    }
  };

  // Load section prompts when codex is selected
  const loadSectionPrompts = async (codexPromptId: string) => {
    try {
      const { data, error } = await supabase
        .from("codex_section_prompts")
        .select("id, section_name, section_prompt, section_index")
        .eq("codex_prompt_id", codexPromptId)
        .eq("is_active", true)
        .order("section_index");

      if (error) throw error;
      setSectionPrompts(data || []);
      setSelectedSection("");
    } catch (error: any) {
      toast({
        title: "Error loading section prompts",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCodexChange = (codexId: string) => {
    setSelectedCodex(codexId);
    loadSectionPrompts(codexId);
  };

  const handlePreviewToggle = (open: boolean) => {
    setPreviewOpen(open);
    if (open && codexPrompts.length === 0) {
      loadCodexPrompts();
    }
  };

  // Generate combined preview
  const getCombinedPrompt = () => {
    const selectedCodexData = codexPrompts.find(c => c.id === selectedCodex);
    const selectedSectionData = sectionPrompts.find(s => s.id === selectedSection);

    if (!selectedCodexData) {
      return "Select a codex to see the combined prompt preview.";
    }

    let combined = "";
    
    // Global persona prompt
    combined += "═══════════════════════════════════════════════════════════════\n";
    combined += "GLOBAL PERSONA PROMPT (Applied to ALL generations)\n";
    combined += "═══════════════════════════════════════════════════════════════\n\n";
    combined += globalPersonaPrompt;
    combined += "\n\n";
    
    // Separator
    combined += "───────────────────────────────────────────────────────────────\n\n";
    
    // Codex system prompt
    combined += "═══════════════════════════════════════════════════════════════\n";
    combined += `CODEX SYSTEM PROMPT: ${selectedCodexData.codex_name}\n`;
    combined += "═══════════════════════════════════════════════════════════════\n\n";
    combined += selectedCodexData.system_prompt;
    
    // Section prompt if selected
    if (selectedSectionData) {
      combined += "\n\n";
      combined += "───────────────────────────────────────────────────────────────\n\n";
      combined += "═══════════════════════════════════════════════════════════════\n";
      combined += `SECTION PROMPT: ${selectedSectionData.section_name}\n`;
      combined += "═══════════════════════════════════════════════════════════════\n\n";
      combined += selectedSectionData.section_prompt;
    }

    return combined;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          System Settings
        </CardTitle>
        <CardDescription>
          Configure system-wide settings for persona generation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="cooldown">Regeneration Cooldown (minutes)</Label>
          <div className="flex gap-2">
            <Input
              id="cooldown"
              type="number"
              min="0"
              value={cooldownMinutes}
              onChange={(e) => setCooldownMinutes(e.target.value)}
              placeholder="60"
              className="max-w-xs"
            />
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Minimum time users must wait between persona regenerations. Set to 0 to disable rate limiting.
            Admins bypass this limit.
          </p>
        </div>
      </CardContent>

      <Separator />

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Global Default AI Model
        </CardTitle>
        <CardDescription>
          All codexes will use this AI model unless specifically overridden at the codex level
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Default AI Provider</Label>
            <Select value={globalDefaultProviderId} onValueChange={(v) => {
              setGlobalDefaultProviderId(v);
              setGlobalDefaultModel("");
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider..." />
              </SelectTrigger>
              <SelectContent>
                {aiProviders.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Default Model</Label>
            <Select 
              value={globalDefaultModel} 
              onValueChange={setGlobalDefaultModel}
              disabled={!globalDefaultProviderId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select model..." />
              </SelectTrigger>
              <SelectContent>
                {aiProviders
                  .find(p => p.id === globalDefaultProviderId)
                  ?.available_models?.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleSaveDefaultAI} disabled={savingDefaultAI}>
          {savingDefaultAI ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Default AI
            </>
          )}
        </Button>
        <p className="text-sm text-muted-foreground">
          This is the fallback model used when no specific AI configuration is set for a codex.
        </p>
      </CardContent>

      <Separator />

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Global AI Persona
        </CardTitle>
        <CardDescription>
          This prompt is prepended to ALL codex generations to ensure consistent first-person voice from "Cherag Shah, Mind Architect"
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="personaPrompt">Global Persona Prompt</Label>
          <Textarea
            id="personaPrompt"
            value={globalPersonaPrompt}
            onChange={(e) => setGlobalPersonaPrompt(e.target.value)}
            placeholder="Enter the global persona prompt..."
            className="min-h-[250px] font-mono text-sm"
          />
          <p className="text-sm text-muted-foreground">
            This prompt ensures all AI-generated content maintains a consistent first-person voice.
            The AI will speak as the persona defined here, directly addressing the user.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSavePersonaPrompt} disabled={savingPersona}>
            {savingPersona ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Persona Prompt
              </>
            )}
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleOptimizePersonaPrompt} 
            disabled={optimizingPersona || !globalPersonaPrompt.trim()}
          >
            {optimizingPersona ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Optimize with AI
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleResetPersonaPrompt}>
            Reset to Default
          </Button>
        </div>
      </CardContent>

      <Separator />

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Prompt Preview
        </CardTitle>
        <CardDescription>
          See how the combined prompt (global persona + codex + section) will appear to the AI
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Collapsible open={previewOpen} onOpenChange={handlePreviewToggle}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span>{previewOpen ? "Hide Preview" : "Show Combined Prompt Preview"}</span>
              {previewOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            {loadingPrompts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select Codex</Label>
                    <Select value={selectedCodex} onValueChange={handleCodexChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a codex..." />
                      </SelectTrigger>
                      <SelectContent>
                        {codexPrompts.map((codex) => (
                          <SelectItem key={codex.id} value={codex.id}>
                            {codex.codex_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Select Section (Optional)</Label>
                    <Select 
                      value={selectedSection} 
                      onValueChange={setSelectedSection}
                      disabled={!selectedCodex || sectionPrompts.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedCodex ? "Choose a section..." : "Select codex first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {sectionPrompts.map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.section_index + 1}. {section.section_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Combined Prompt Preview</Label>
                  <ScrollArea className="h-[400px] w-full rounded-md border bg-muted/30 p-4">
                    <pre className="text-sm font-mono whitespace-pre-wrap text-foreground/80">
                      {getCombinedPrompt()}
                    </pre>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground">
                    This is how the AI will receive the combined prompt. The global persona prompt is always prepended to ensure consistent first-person voice.
                  </p>
                </div>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
