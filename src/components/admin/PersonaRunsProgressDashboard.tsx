import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  RefreshCw, 
  Play, 
  AlertTriangle,
  User,
  Calendar,
  Zap,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CodexProgress {
  id: string;
  codex_name: string;
  status: string;
  completed_sections: number;
  total_sections: number;
}

interface PersonaRunProgress {
  id: string;
  title: string;
  status: string;
  user_email: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  codexes: CodexProgress[];
  totalSections: number;
  completedSections: number;
  errorSections: number;
}

export const PersonaRunsProgressDashboard = () => {
  const [runs, setRuns] = useState<PersonaRunProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [resyncing, setResyncing] = useState<string | null>(null);
  const [retriggering, setRetriggering] = useState<string | null>(null);
  const [retryingPending, setRetryingPending] = useState<string | null>(null);
  const [forcingComplete, setForcingComplete] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [isRecentRunsOpen, setIsRecentRunsOpen] = useState(false);

  useEffect(() => {
    loadRuns();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('persona-runs-progress')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'persona_runs' },
        () => loadRuns()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'codexes' },
        () => loadRuns()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'codex_sections' },
        () => loadRuns()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRuns = async () => {
    try {
      // Fetch all persona runs with their codexes
      const { data: personaRuns, error: runsError } = await supabase
        .from('persona_runs')
        .select(`
          id,
          title,
          status,
          created_at,
          started_at,
          completed_at,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (runsError) throw runsError;

      // Fetch user emails for all runs
      const userIds = [...new Set(personaRuns?.map(r => r.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const userMap = new Map(profiles?.map(p => [p.id, p.email || p.full_name || 'Unknown']) || []);

      // Fetch codexes for all runs
      const runIds = personaRuns?.map(r => r.id) || [];
      const { data: codexes } = await supabase
        .from('codexes')
        .select('id, persona_run_id, codex_name, status, completed_sections, total_sections')
        .in('persona_run_id', runIds)
        .order('codex_order', { ascending: true });

      // Fetch section counts per codex
      const codexIds = codexes?.map(c => c.id) || [];
      const { data: sections } = await supabase
        .from('codex_sections')
        .select('codex_id, status')
        .in('codex_id', codexIds);

      // Build section stats per codex
      const sectionStats = new Map<string, { completed: number; error: number; total: number }>();
      sections?.forEach(s => {
        const stats = sectionStats.get(s.codex_id) || { completed: 0, error: 0, total: 0 };
        stats.total++;
        if (s.status === 'completed') stats.completed++;
        if (s.status === 'error') stats.error++;
        sectionStats.set(s.codex_id, stats);
      });

      // Build runs with progress
      const runsWithProgress: PersonaRunProgress[] = personaRuns?.map(run => {
        const runCodexes = codexes?.filter(c => c.persona_run_id === run.id) || [];
        
        let totalSections = 0;
        let completedSections = 0;
        let errorSections = 0;

        runCodexes.forEach(c => {
          const stats = sectionStats.get(c.id);
          if (stats) {
            totalSections += stats.total;
            completedSections += stats.completed;
            errorSections += stats.error;
          }
        });

        return {
          id: run.id,
          title: run.title,
          status: run.status,
          user_email: userMap.get(run.user_id) || 'Unknown',
          created_at: run.created_at,
          started_at: run.started_at,
          completed_at: run.completed_at,
          codexes: runCodexes.map(c => ({
            id: c.id,
            codex_name: c.codex_name,
            status: c.status,
            completed_sections: sectionStats.get(c.id)?.completed || 0,
            total_sections: sectionStats.get(c.id)?.total || c.total_sections
          })),
          totalSections,
          completedSections,
          errorSections
        };
      }) || [];

      setRuns(runsWithProgress);
    } catch (error) {
      console.error('Error loading runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResyncCodexes = async (personaRunId: string) => {
    try {
      setResyncing(personaRunId);
      const { error } = await supabase.functions.invoke('admin-resync-codexes', {
        body: { personaRunId }
      });

      if (error) throw error;

      toast.success('Codexes re-synced successfully');
      loadRuns();
    } catch (error) {
      console.error('Error resyncing codexes:', error);
      toast.error('Failed to resync codexes');
    } finally {
      setResyncing(null);
    }
  };

  const handleRetriggerGeneration = async (personaRunId: string) => {
    try {
      setRetriggering(personaRunId);
      
      // Reset persona run status and trigger orchestration
      await supabase
        .from('persona_runs')
        .update({ 
          status: 'generating',
          is_cancelled: false,
          started_at: new Date().toISOString(),
          completed_at: null
        })
        .eq('id', personaRunId);

      const { error } = await supabase.functions.invoke('orchestrate-codexes', {
        body: { personaRunId }
      });

      if (error) throw error;

      toast.success('Generation retriggered');
      loadRuns();
    } catch (error) {
      console.error('Error retriggering generation:', error);
      toast.error('Failed to retrigger generation');
    } finally {
      setRetriggering(null);
    }
  };

  const handleRetryPendingSections = async (personaRunId: string) => {
    try {
      setRetryingPending(personaRunId);
      
      const { data, error } = await supabase.functions.invoke('retry-pending-sections', {
        body: { personaRunId }
      });

      if (error) throw error;

      toast.success(`Retry complete: ${data?.retried || 0} sections retried, ${data?.errors || 0} errors`);
      loadRuns();
    } catch (error) {
      console.error('Error retrying pending sections:', error);
      toast.error('Failed to retry pending sections');
    } finally {
      setRetryingPending(null);
    }
  };

  const handleForceComplete = async (personaRunId: string) => {
    try {
      setForcingComplete(personaRunId);
      
      // Mark all stuck sections as error
      const { data: codexes } = await supabase
        .from('codexes')
        .select('id')
        .eq('persona_run_id', personaRunId);

      if (codexes) {
        for (const codex of codexes) {
          // Mark pending/generating sections as error
          await supabase
            .from('codex_sections')
            .update({ 
              status: 'error',
              error_message: 'Force completed by admin'
            })
            .eq('codex_id', codex.id)
            .in('status', ['pending', 'generating']);

          // Get section counts to determine codex status
          const { data: sections } = await supabase
            .from('codex_sections')
            .select('status')
            .eq('codex_id', codex.id);

          const completed = sections?.filter(s => s.status === 'completed').length || 0;
          const errors = sections?.filter(s => s.status === 'error').length || 0;
          const total = sections?.length || 0;

          // Update codex status
          if (total > 0) {
            await supabase
              .from('codexes')
              .update({ 
                status: errors > 0 ? 'ready_with_errors' : 'ready',
                completed_sections: completed
              })
              .eq('id', codex.id);
          }
        }
      }

      // Mark persona run as completed
      await supabase
        .from('persona_runs')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', personaRunId);

      toast.success('Persona run force completed');
      loadRuns();
    } catch (error) {
      console.error('Error force completing:', error);
      toast.error('Failed to force complete');
    } finally {
      setForcingComplete(null);
    }
  };

  const handleCancelGeneration = async (personaRunId: string) => {
    try {
      setCancelling(personaRunId);
      
      const { error } = await supabase.functions.invoke('admin-cancel-persona-run', {
        body: { personaRunId }
      });

      if (error) throw error;

      toast.success('Generation cancelled successfully');
      loadRuns();
    } catch (error) {
      console.error('Error cancelling generation:', error);
      toast.error('Failed to cancel generation');
    } finally {
      setCancelling(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'generating': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending': return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'ready': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'ready_with_errors': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500">Completed</Badge>;
      case 'generating': return <Badge className="bg-blue-500">Generating</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      case 'ready': return <Badge className="bg-green-500">Ready</Badge>;
      case 'ready_with_errors': return <Badge className="bg-yellow-500">Partial</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const getProgressPercent = (run: PersonaRunProgress) => {
    if (run.totalSections === 0) return 0;
    return Math.round((run.completedSections / run.totalSections) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Loading progress data...</span>
      </div>
    );
  }

  const activeRuns = runs.filter(r => r.status === 'generating');
  const recentRuns = runs.filter(r => r.status !== 'generating').slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Active Generations */}
      {activeRuns.length > 0 && (
        <Card className="border-blue-500/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              <CardTitle>Active Generations ({activeRuns.length})</CardTitle>
            </div>
            <CardDescription>Real-time progress of currently generating persona runs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeRuns.map(run => (
                <Card key={run.id} className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold">{run.title}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {run.user_email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(run.started_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(run.status)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryPendingSections(run.id)}
                          disabled={retryingPending === run.id}
                        >
                          {retryingPending === run.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          <span className="ml-1 hidden md:inline">Retry Stuck</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleForceComplete(run.id)}
                          disabled={forcingComplete === run.id}
                        >
                          {forcingComplete === run.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          <span className="ml-1 hidden md:inline">Force Complete</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelGeneration(run.id)}
                          disabled={cancelling === run.id}
                          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          {cancelling === run.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          <span className="ml-1 hidden md:inline">Cancel</span>
                        </Button>
                      </div>
                    </div>

                    {/* Overall Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Overall Progress</span>
                        <span>{run.completedSections} / {run.totalSections} sections ({getProgressPercent(run)}%)</span>
                      </div>
                      <Progress value={getProgressPercent(run)} className="h-2" />
                    </div>

                    {/* Codex Progress Grid */}
                    <ScrollArea className="h-48">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {run.codexes.map(codex => {
                          const codexPercent = codex.total_sections > 0 
                            ? Math.round((codex.completed_sections / codex.total_sections) * 100) 
                            : 0;
                          return (
                            <div key={codex.id} className="p-2 bg-background rounded border">
                              <div className="flex items-center gap-1 mb-1">
                                {getStatusIcon(codex.status)}
                                <span className="text-xs font-medium truncate">{codex.codex_name}</span>
                              </div>
                              <Progress value={codexPercent} className="h-1" />
                              <div className="text-xs text-muted-foreground mt-1">
                                {codex.completed_sections}/{codex.total_sections}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Runs - Collapsible */}
      <Collapsible open={isRecentRunsOpen} onOpenChange={setIsRecentRunsOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -m-2 p-2 rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  {isRecentRunsOpen ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <CardTitle className="text-base">Recent Persona Runs ({recentRuns.length})</CardTitle>
                    <CardDescription className="text-sm">Click to expand history and quick actions</CardDescription>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    loadRuns();
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {recentRuns.map(run => (
                    <div key={run.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(run.status)}
                            <h4 className="font-medium">{run.title}</h4>
                            {getStatusBadge(run.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {run.user_email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(run.created_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {run.codexes.length} codexes
                            </span>
                          </div>

                          {/* Progress bar */}
                          {run.totalSections > 0 && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>{run.completedSections} completed</span>
                                {run.errorSections > 0 && (
                                  <span className="text-destructive">{run.errorSections} errors</span>
                                )}
                                <span>{run.totalSections} total</span>
                              </div>
                              <Progress value={getProgressPercent(run)} className="h-1.5" />
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetryPendingSections(run.id)}
                            disabled={retryingPending === run.id}
                            title="Retry any stuck sections"
                          >
                            {retryingPending === run.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                            <span className="ml-1 hidden md:inline">Retry Stuck</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResyncCodexes(run.id)}
                            disabled={resyncing === run.id}
                            title="Resync codexes with prompts"
                          >
                            {resyncing === run.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Zap className="h-4 w-4" />
                            )}
                            <span className="ml-1 hidden md:inline">Resync</span>
                          </Button>
                          {(run.status === 'failed' || run.status === 'pending') && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleRetriggerGeneration(run.id)}
                              disabled={retriggering === run.id}
                            >
                              {retriggering === run.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                              <span className="ml-1 hidden md:inline">Regenerate</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {recentRuns.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No recent persona runs found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};
