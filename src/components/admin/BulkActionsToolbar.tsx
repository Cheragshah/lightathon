import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface BulkActionsToolbarProps {
  selectedRunIds: string[];
  onClearSelection: () => void;
  onExportComplete: () => void;
}

export const BulkActionsToolbar = ({ 
  selectedRunIds, 
  onClearSelection,
  onExportComplete 
}: BulkActionsToolbarProps) => {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const handleBulkExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-bulk-export-pdfs', {
        body: { personaRunIds: selectedRunIds }
      });

      if (error) throw error;

      // Download each successful PDF
      if (data.results) {
        data.results.forEach((result: any) => {
          if (result.success && result.pdf) {
            const byteCharacters = atob(result.pdf.content);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = result.pdf.name || `persona-run-${result.runId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }
        });
      }

      toast({
        title: "Export Complete",
        description: `Successfully exported ${data.summary.successful} of ${data.summary.total} PDFs`,
      });

      onExportComplete();
      onClearSelection();
    } catch (error) {
      console.error('Bulk export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export PDFs",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  if (selectedRunIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4 flex items-center gap-4">
        <Badge variant="secondary" className="bg-primary-foreground text-primary">
          {selectedRunIds.length} selected
        </Badge>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={handleBulkExport}
          disabled={exporting}
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export PDFs
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={exporting}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
