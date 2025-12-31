import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface BulkDependencyDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkDependencyDialog = ({ open, onClose, onSuccess }: BulkDependencyDialogProps) => {
  const [codexes, setCodexes] = useState<any[]>([]);
  const [selectedCodexes, setSelectedCodexes] = useState<string[]>([]);
  const [selectedDependencies, setSelectedDependencies] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadCodexes();
    }
  }, [open]);

  const loadCodexes = async () => {
    const { data } = await supabase
      .from('codex_prompts' as any)
      .select('id, codex_name, display_order, depends_on_codex_id')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    setCodexes((data as any[]) || []);
  };

  const handleToggleCodex = (codexId: string) => {
    setSelectedCodexes(prev => 
      prev.includes(codexId) 
        ? prev.filter(id => id !== codexId)
        : [...prev, codexId]
    );
  };

  const handleApply = async () => {
    if (selectedCodexes.length === 0) {
      toast({ title: "No codexes selected", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Update all selected codexes
      for (const codexId of selectedCodexes) {
        // Delete existing dependencies for this codex
        await supabase
          .from('codex_prompt_dependencies' as any)
          .delete()
          .eq('codex_prompt_id', codexId);
        
        // Insert new dependencies if any selected
        if (selectedDependencies.size > 0) {
          const depMappings = Array.from(selectedDependencies).map((depId, index) => ({
            codex_prompt_id: codexId,
            depends_on_codex_id: depId,
            display_order: index
          }));
          await supabase
            .from('codex_prompt_dependencies' as any)
            .insert(depMappings as any);
        }
      }

      toast({ 
        title: "Success", 
        description: `Updated ${selectedCodexes.length} codex(es) with ${selectedDependencies.size} dependencies` 
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const availableDependencies = codexes.filter(c => !selectedCodexes.includes(c.id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Apply Dependency</DialogTitle>
          <DialogDescription>
            Select multiple codexes and apply the same dependency configuration to all of them
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label>Select Dependencies (Optional)</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Select multiple codexes to apply as dependencies. Leave empty to remove all dependencies.
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-4">
              {availableDependencies.map(c => (
                <div key={c.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`bulk-dep-${c.id}`}
                    checked={selectedDependencies.has(c.id)}
                    onCheckedChange={() => {
                      const newDeps = new Set(selectedDependencies);
                      if (newDeps.has(c.id)) {
                        newDeps.delete(c.id);
                      } else {
                        newDeps.add(c.id);
                      }
                      setSelectedDependencies(newDeps);
                    }}
                  />
                  <label
                    htmlFor={`bulk-dep-${c.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                  >
                    {c.codex_name}
                  </label>
                </div>
              ))}
            </div>
            {selectedDependencies.size > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {selectedDependencies.size} dependency(ies) selected
              </p>
            )}
          </div>

          <div>
            <Label className="mb-3 block">Select Codexes to Update</Label>
            <div className="space-y-2 max-h-96 overflow-y-auto border rounded-md p-4">
              {codexes.map(codex => (
                <div key={codex.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={codex.id}
                    checked={selectedCodexes.includes(codex.id)}
                    onCheckedChange={() => handleToggleCodex(codex.id)}
                  />
                  <label
                    htmlFor={codex.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                  >
                    {codex.codex_name}
                    {codex.depends_on_codex_id && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (currently has dependency)
                      </span>
                    )}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {selectedCodexes.length} codex(es) selected
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleApply} disabled={saving || selectedCodexes.length === 0}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply to {selectedCodexes.length} Codex(es)
            </Button>
            <Button onClick={onClose} variant="outline">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
