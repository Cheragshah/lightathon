import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw, GitCompare, Cpu } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { VersionComparisonDialog } from "./VersionComparisonDialog";

const getExecutionModeLabel = (mode: string | null) => {
  switch (mode) {
    case 'single': return 'Single';
    case 'parallel_merge': return 'Parallel';
    case 'sequential_chain': return 'Sequential';
    default: return 'Default';
  }
};

interface CodexVersionHistoryDialogProps {
  codex: any;
  open: boolean;
  onClose: () => void;
}

export const CodexVersionHistoryDialog = ({ codex, open, onClose }: CodexVersionHistoryDialogProps) => {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [providers, setProviders] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (open && codex) {
      loadVersionHistory();
      loadProviders();
    }
  }, [open, codex]);

  const loadProviders = async () => {
    const { data } = await supabase
      .from('ai_providers')
      .select('id, name');
    
    if (data) {
      const providerMap: Record<string, string> = {};
      data.forEach(p => { providerMap[p.id] = p.name; });
      setProviders(providerMap);
    }
  };

  const loadVersionHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('codex_prompts_history' as any)
      .select('*')
      .eq('codex_prompt_id', codex.id)
      .order('version_number', { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setVersions(data || []);
    }
    setLoading(false);
  };

  const getProviderName = (providerId: string | null) => {
    if (!providerId) return null;
    return providers[providerId] || 'Unknown';
  };

  const handleRestore = async (version: any) => {
    if (!confirm(`Are you sure you want to restore version ${version.version_number}? This will create a new version with the old settings including AI configuration.`)) {
      return;
    }

    const { error } = await supabase
      .from('codex_prompts' as any)
      .update({
        codex_name: version.codex_name,
        system_prompt: version.system_prompt,
        display_order: version.display_order,
        depends_on_codex_id: version.depends_on_codex_id,
        word_count_min: version.word_count_min,
        word_count_max: version.word_count_max,
        is_active: version.is_active,
        // Restore AI configuration
        ai_execution_mode: version.ai_execution_mode,
        primary_provider_id: version.primary_provider_id,
        primary_model: version.primary_model,
        merge_provider_id: version.merge_provider_id,
        merge_model: version.merge_model,
        merge_prompt: version.merge_prompt,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', codex.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Restored", description: `Version ${version.version_number} restored successfully (including AI config)` });
      onClose();
    }
  };

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      } else if (prev.length < 2) {
        return [...prev, versionId];
      } else {
        return [prev[1], versionId];
      }
    });
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      setShowComparison(true);
    }
  };

  const getSelectedVersion = (index: number) => {
    return versions.find(v => v.id === selectedVersions[index]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version History: {codex?.codex_name}</DialogTitle>
          <DialogDescription>
            View and restore previous versions of this codex prompt
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No version history available yet. Versions are created automatically when you update this codex.
          </div>
        ) : (
          <div className="space-y-4">
            {selectedVersions.length === 2 && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="text-sm">Select two versions to compare</span>
                <Button onClick={handleCompare} variant="default">
                  <GitCompare className="h-4 w-4 mr-2" />
                  Compare Selected
                </Button>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((version) => (
                  <TableRow key={version.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedVersions.includes(version.id)}
                        onCheckedChange={() => handleVersionSelect(version.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">v{version.version_number}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(version.created_at), 'PPp')}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="space-y-1 text-sm">
                        <div><strong>Name:</strong> {version.codex_name}</div>
                        <div><strong>Order:</strong> {version.display_order}</div>
                        <div><strong>Word Count:</strong> {version.word_count_min} - {version.word_count_max}</div>
                        {/* AI Configuration */}
                        <div className="flex items-center gap-1 mt-2">
                          <Cpu className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">AI:</span>
                          <Badge variant="outline" className="text-xs">
                            {getExecutionModeLabel(version.ai_execution_mode)}
                          </Badge>
                          {version.primary_model && (
                            <span className="text-xs">
                              {getProviderName(version.primary_provider_id)}: {version.primary_model}
                            </span>
                          )}
                        </div>
                        {(version.ai_execution_mode === 'parallel_merge' || version.ai_execution_mode === 'sequential_chain') && version.merge_model && (
                          <div className="text-xs text-muted-foreground ml-4">
                            Merge: {getProviderName(version.merge_provider_id)}: {version.merge_model}
                          </div>
                        )}
                        {version.change_description && (
                          <div className="text-muted-foreground italic">{version.change_description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={version.is_active ? "default" : "secondary"}>
                        {version.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRestore(version)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {showComparison && selectedVersions.length === 2 && (
          <VersionComparisonDialog
            open={showComparison}
            onClose={() => setShowComparison(false)}
            version1={getSelectedVersion(0)}
            version2={getSelectedVersion(1)}
            type="codex"
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
