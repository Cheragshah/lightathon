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
import { Loader2, RotateCcw, GitCompare } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { VersionComparisonDialog } from "./VersionComparisonDialog";

interface SectionVersionHistoryDialogProps {
  section: any;
  open: boolean;
  onClose: () => void;
}

export const SectionVersionHistoryDialog = ({ section, open, onClose }: SectionVersionHistoryDialogProps) => {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && section) {
      loadVersionHistory();
    }
  }, [open, section]);

  const loadVersionHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('codex_section_prompts_history' as any)
      .select('*')
      .eq('section_prompt_id', section.id)
      .order('version_number', { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setVersions(data || []);
    }
    setLoading(false);
  };

  const handleRestore = async (version: any) => {
    if (!confirm(`Are you sure you want to restore version ${version.version_number}? This will create a new version with the old settings.`)) {
      return;
    }

    const { error } = await supabase
      .from('codex_section_prompts' as any)
      .update({
        section_name: version.section_name,
        section_prompt: version.section_prompt,
        section_index: version.section_index,
        word_count_target: version.word_count_target,
        is_active: version.is_active,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', section.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Restored", description: `Version ${version.version_number} restored successfully` });
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
          <DialogTitle>Section Version History: {section?.section_name}</DialogTitle>
          <DialogDescription>
            View and restore previous versions of this section
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No version history available yet. Versions are created automatically when you update this section.
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
                        <div><strong>Name:</strong> {version.section_name}</div>
                        <div><strong>Index:</strong> {version.section_index}</div>
                        <div><strong>Target Words:</strong> {version.word_count_target}</div>
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
            type="section"
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
