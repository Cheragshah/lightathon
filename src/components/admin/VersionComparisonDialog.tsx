import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VersionComparisonDialogProps {
  open: boolean;
  onClose: () => void;
  version1: any;
  version2: any;
  type: 'codex' | 'section';
}

export const VersionComparisonDialog = ({ 
  open, 
  onClose, 
  version1, 
  version2,
  type 
}: VersionComparisonDialogProps) => {
  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      codex_name: 'Codex Name',
      section_name: 'Section Name',
      system_prompt: 'System Prompt',
      section_prompt: 'Section Prompt',
      display_order: 'Display Order',
      section_index: 'Section Index',
      word_count_min: 'Min Word Count',
      word_count_max: 'Max Word Count',
      word_count_target: 'Target Word Count',
      is_active: 'Status',
      depends_on_codex_id: 'Depends On',
      ai_execution_mode: 'AI Execution Mode',
      primary_model: 'Primary Model',
      primary_provider_id: 'Primary Provider',
      merge_model: 'Merge Model',
      merge_provider_id: 'Merge Provider',
      merge_prompt: 'Merge Prompt'
    };
    return labels[field] || field;
  };

  const getExecutionModeLabel = (mode: string | null) => {
    switch (mode) {
      case 'single': return 'Single';
      case 'parallel_merge': return 'Parallel Merge';
      case 'sequential_chain': return 'Sequential Chain';
      default: return 'Default';
    }
  };

  const getFieldValue = (version: any, field: string) => {
    if (field === 'is_active') {
      return version[field] ? 'Active' : 'Inactive';
    }
    if (field === 'ai_execution_mode') {
      return getExecutionModeLabel(version[field]);
    }
    if (field === 'primary_provider_id' || field === 'merge_provider_id') {
      return version[field] ? version[field].substring(0, 8) + '...' : 'Default';
    }
    return version[field]?.toString() || 'N/A';
  };

  const fieldsToCompare = type === 'codex' 
    ? ['codex_name', 'system_prompt', 'display_order', 'word_count_min', 'word_count_max', 'is_active', 'depends_on_codex_id', 'ai_execution_mode', 'primary_model', 'merge_model']
    : ['section_name', 'section_prompt', 'section_index', 'word_count_target', 'is_active'];

  const hasChanged = (field: string) => {
    return getFieldValue(version1, field) !== getFieldValue(version2, field);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Version Comparison</DialogTitle>
          <DialogDescription>
            Comparing changes between two versions
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Version 1 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">v{version1.version_number}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(version1.created_at), 'PPp')}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh]">
                <div className="space-y-4">
                  {fieldsToCompare.map(field => (
                    <div 
                      key={field}
                      className={`p-3 rounded-md ${
                        hasChanged(field) ? 'bg-destructive/10 border border-destructive/20' : 'bg-muted/30'
                      }`}
                    >
                      <div className="font-medium text-sm mb-1">{getFieldLabel(field)}</div>
                      <div className={`text-sm ${field.includes('prompt') ? 'whitespace-pre-wrap' : ''}`}>
                        {getFieldValue(version1, field)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Version 2 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">v{version2.version_number}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(version2.created_at), 'PPp')}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh]">
                <div className="space-y-4">
                  {fieldsToCompare.map(field => (
                    <div 
                      key={field}
                      className={`p-3 rounded-md ${
                        hasChanged(field) ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30'
                      }`}
                    >
                      <div className="font-medium text-sm mb-1">{getFieldLabel(field)}</div>
                      <div className={`text-sm ${field.includes('prompt') ? 'whitespace-pre-wrap' : ''}`}>
                        {getFieldValue(version2, field)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-destructive/10 border border-destructive/20 rounded"></div>
            <span>Older value</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/10 border border-primary/20 rounded"></div>
            <span>Newer value</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
