import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2, X, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface CodexPrompt {
  id: string;
  codex_name: string;
  system_prompt: string;
  merge_prompt?: string | null;
}

interface BulkCodexActionsProps {
  selectedCodexIds: string[];
  codexes: CodexPrompt[];
  onClearSelection: () => void;
  onComplete: () => void;
}

export function BulkCodexActions({
  selectedCodexIds,
  codexes,
  onClearSelection,
  onComplete
}: BulkCodexActionsProps) {
  const [processing, setProcessing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeProgress, setOptimizeProgress] = useState(0);
  const [optimizeDialogOpen, setOptimizeDialogOpen] = useState(false);
  const [optimizeType, setOptimizeType] = useState<"system_prompt" | "merge_prompt" | "both">("system_prompt");

  if (selectedCodexIds.length === 0) return null;

  const handleBulkActivate = async () => {
    if (!confirm(`Activate ${selectedCodexIds.length} codex prompt(s)?`)) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("codex_prompts" as any)
        .update({ is_active: true } as any)
        .in("id", selectedCodexIds);

      if (error) throw error;

      toast.success(`${selectedCodexIds.length} codex prompt(s) activated`);
      onComplete();
      onClearSelection();
    } catch (error: any) {
      console.error("Error activating codexes:", error);
      toast.error("Failed to activate codex prompts");
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (!confirm(`Deactivate ${selectedCodexIds.length} codex prompt(s)?`)) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("codex_prompts" as any)
        .update({ is_active: false } as any)
        .in("id", selectedCodexIds);

      if (error) throw error;

      toast.success(`${selectedCodexIds.length} codex prompt(s) deactivated`);
      onComplete();
      onClearSelection();
    } catch (error: any) {
      console.error("Error deactivating codexes:", error);
      toast.error("Failed to deactivate codex prompts");
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkOptimize = async () => {
    setOptimizing(true);
    setOptimizeProgress(0);
    setOptimizeDialogOpen(true);

    const selectedCodexes = codexes.filter(c => selectedCodexIds.includes(c.id));
    let successCount = 0;
    let failCount = 0;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Please log in to use AI optimization");
        setOptimizing(false);
        setOptimizeDialogOpen(false);
        return;
      }

      const totalSteps = optimizeType === "both" 
        ? selectedCodexes.length * 2 
        : selectedCodexes.length;
      let currentStep = 0;

      for (const codex of selectedCodexes) {
        // Optimize system prompt
        if (optimizeType === "system_prompt" || optimizeType === "both") {
          try {
            const response = await supabase.functions.invoke("optimize-text", {
              body: { text: codex.system_prompt, type: "prompt" },
            });

            if (response.error) {
              console.error(`Error optimizing system prompt for ${codex.codex_name}:`, response.error);
              failCount++;
            } else if (response.data?.optimizedText) {
              const { error: updateError } = await supabase
                .from("codex_prompts" as any)
                .update({ system_prompt: response.data.optimizedText } as any)
                .eq("id", codex.id);

              if (updateError) {
                console.error(`Error updating system prompt for ${codex.codex_name}:`, updateError);
                failCount++;
              } else {
                successCount++;
              }
            }
          } catch (err) {
            console.error(`Error processing system prompt for ${codex.codex_name}:`, err);
            failCount++;
          }
          currentStep++;
          setOptimizeProgress(Math.round((currentStep / totalSteps) * 100));
        }

        // Optimize merge prompt if it exists
        if ((optimizeType === "merge_prompt" || optimizeType === "both") && codex.merge_prompt) {
          try {
            const response = await supabase.functions.invoke("optimize-text", {
              body: { text: codex.merge_prompt, type: "merge_prompt" },
            });

            if (response.error) {
              console.error(`Error optimizing merge prompt for ${codex.codex_name}:`, response.error);
              failCount++;
            } else if (response.data?.optimizedText) {
              const { error: updateError } = await supabase
                .from("codex_prompts" as any)
                .update({ merge_prompt: response.data.optimizedText } as any)
                .eq("id", codex.id);

              if (updateError) {
                console.error(`Error updating merge prompt for ${codex.codex_name}:`, updateError);
                failCount++;
              } else {
                successCount++;
              }
            }
          } catch (err) {
            console.error(`Error processing merge prompt for ${codex.codex_name}:`, err);
            failCount++;
          }
          currentStep++;
          setOptimizeProgress(Math.round((currentStep / totalSteps) * 100));
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully optimized ${successCount} prompt(s)`);
      }
      if (failCount > 0) {
        toast.error(`Failed to optimize ${failCount} prompt(s)`);
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
            {selectedCodexIds.length} codex prompt(s) selected
          </span>
          
          <div className="flex gap-2">
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setOptimizeType("system_prompt");
                  handleBulkOptimize();
                }}
                disabled={processing || optimizing}
                title="Optimize system prompts"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Optimize System
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setOptimizeType("merge_prompt");
                  handleBulkOptimize();
                }}
                disabled={processing || optimizing}
                title="Optimize merge prompts"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Optimize Merge
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setOptimizeType("both");
                  handleBulkOptimize();
                }}
                disabled={processing || optimizing}
                title="Optimize both system and merge prompts"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Optimize All
              </Button>
            </div>

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
              variant="ghost"
              onClick={onClearSelection}
              disabled={processing || optimizing}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Optimization Progress Dialog */}
      <Dialog open={optimizeDialogOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Optimizing Codex Prompts with AI
            </DialogTitle>
            <DialogDescription>
              Please wait while we optimize {selectedCodexIds.length} codex prompt(s)...
              <br />
              <span className="text-xs">
                Optimizing: {optimizeType === "both" ? "System & Merge Prompts" : 
                  optimizeType === "system_prompt" ? "System Prompts" : "Merge Prompts"}
              </span>
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
