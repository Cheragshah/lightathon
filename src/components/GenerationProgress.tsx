import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle, Clock, FileText } from "lucide-react";

interface Codex {
  id: string;
  codex_name: string;
  status: string;
  completed_sections: number;
  total_sections: number;
}

interface PersonaRun {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface GenerationProgressProps {
  personaRunId: string;
  personaRun?: PersonaRun;
}

export function GenerationProgress({ personaRunId, personaRun }: GenerationProgressProps) {
  const [codexes, setCodexes] = useState<Codex[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCodexes();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`codexes-${personaRunId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'codexes',
          filter: `persona_run_id=eq.${personaRunId}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setCodexes(prev => prev.map(c => 
              c.id === payload.new.id ? { ...c, ...payload.new } : c
            ));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'codex_sections'
        },
        () => {
          // Refetch codexes when sections change
          fetchCodexes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [personaRunId]);

  const fetchCodexes = async () => {
    try {
      const { data, error } = await supabase
        .from("codexes")
        .select("id, codex_name, status, completed_sections, total_sections")
        .eq("persona_run_id", personaRunId)
        .order("codex_order");

      if (error) throw error;
      setCodexes(data || []);
    } catch (error) {
      console.error("Error fetching codexes:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ready":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "generating":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "ready_with_errors":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <Badge className="bg-green-100 text-green-800">Complete</Badge>;
      case "generating":
        return <Badge className="bg-blue-100 text-blue-800">Generating</Badge>;
      case "ready_with_errors":
        return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "pending":
        return <Badge variant="outline">Waiting</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalCompleted = codexes.reduce((sum, c) => sum + c.completed_sections, 0);
  const totalSections = codexes.reduce((sum, c) => sum + c.total_sections, 0);
  const overallProgress = totalSections > 0 ? (totalCompleted / totalSections) * 100 : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{personaRun?.title || "Codex Generation"}</CardTitle>
          </div>
          {personaRun && getStatusBadge(personaRun.status)}
        </div>
        <CardDescription>
          {totalCompleted} of {totalSections} sections completed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Individual Codex Progress */}
        <div className="space-y-3 pt-2">
          {codexes.map(codex => {
            const progress = codex.total_sections > 0 
              ? (codex.completed_sections / codex.total_sections) * 100 
              : 0;
            
            return (
              <div key={codex.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(codex.status)}
                    <span className="text-sm font-medium">{codex.codex_name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {codex.completed_sections}/{codex.total_sections}
                  </span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
