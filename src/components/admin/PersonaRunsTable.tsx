import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Trash2, StopCircle, RefreshCw, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PersonaRun {
  id: string;
  title: string;
  status: string;
  created_at: string;
  user_email?: string;
}

interface PersonaRunsTableProps {
  personaRuns: PersonaRun[];
  onDelete: () => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export const PersonaRunsTable = ({ personaRuns, onDelete, selectedIds, onSelectionChange }: PersonaRunsTableProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(personaRuns.map(run => run.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'generating': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const handleDelete = async (personaRunId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-delete-persona', {
        body: { personaRunId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Persona run and all related data deleted successfully",
      });

      onDelete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete persona run",
        variant: "destructive",
      });
    }
  };

  const handleRegenerate = async (personaRunId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-regenerate-persona', {
        body: { personaRunId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Persona regeneration started",
      });

      onDelete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate persona",
        variant: "destructive",
      });
    }
  };

  const handleCancel = async (personaRunId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-cancel-persona-run', {
        body: { personaRunId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Persona run cancelled successfully",
      });

      onDelete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel persona run",
        variant: "destructive",
      });
    }
  };

  const handleRetryPending = async (personaRunId: string) => {
    try {
      toast({
        title: "Retrying...",
        description: "Retrying pending sections. This may take a few minutes.",
      });

      const { data, error } = await supabase.functions.invoke('retry-pending-sections', {
        body: { personaRunId }
      });

      if (error) throw error;

      toast({
        title: "Retry Complete",
        description: `Retried ${data.retried} sections. ${data.errors || 0} failed.`,
      });

      onDelete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to retry pending sections",
        variant: "destructive",
      });
    }
  };

  const handleFullRerun = async (personaRunId: string) => {
    try {
      toast({
        title: "Starting Full Re-Run...",
        description: "Deleting old codexes and regenerating from scratch.",
      });

      const { error } = await supabase.functions.invoke('admin-full-rerun-persona', {
        body: { personaRunId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Full re-run initiated - all codexes will be regenerated",
      });

      onDelete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate full re-run",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedIds.length === personaRuns.length && personaRuns.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>Title</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {personaRuns.map((run) => (
            <TableRow key={run.id}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(run.id)}
                  onCheckedChange={(checked) => handleSelectOne(run.id, checked as boolean)}
                />
              </TableCell>
              <TableCell className="font-medium">{run.title}</TableCell>
              <TableCell>{run.user_email || 'Unknown'}</TableCell>
              <TableCell>
                <Badge variant={getStatusColor(run.status)}>{run.status}</Badge>
              </TableCell>
              <TableCell>{formatDate(run.created_at)}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/persona-run/${run.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  {run.status === 'generating' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" title="Retry pending sections">
                          <RefreshCw className="h-4 w-4 text-orange-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Retry Pending Sections?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will retry all sections that are stuck in pending status for more than 5 minutes.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRetryPending(run.id)}>
                            Retry Pending
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" title="Regenerate stuck sections">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Regenerate Stuck Sections?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will retry sections that are stuck or failed, keeping completed sections intact.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRegenerate(run.id)}>
                          Regenerate
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" title="Full re-run with current prompts">
                        <RotateCcw className="h-4 w-4 text-blue-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Full Re-Run Persona?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p className="font-semibold text-destructive">⚠️ This will DELETE all existing codexes and sections.</p>
                          <p>The persona will be regenerated from scratch using:</p>
                          <ul className="list-disc list-inside ml-2 space-y-1">
                            <li>The user's original answers and transcript</li>
                            <li>The CURRENT active codex prompt configuration</li>
                          </ul>
                          <p className="text-sm text-muted-foreground mt-2">
                            Use this when you've updated prompts and want to regenerate everything with the new configuration.
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleFullRerun(run.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Full Re-Run
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  
                  {run.status === 'generating' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <StopCircle className="h-4 w-4 text-orange-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Persona Run?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will stop the ongoing generation and save AI costs. The persona run will be marked as cancelled.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Running</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleCancel(run.id)}>
                            Cancel Run
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Persona Run?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this persona run and all associated codexes.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(run.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
