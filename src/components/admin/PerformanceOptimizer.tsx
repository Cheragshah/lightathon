import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Zap, Clock, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface PerformanceMetrics {
  avgGenerationTime: number;
  successRate: number;
  errorRate: number;
  totalSections: number;
  recommendedBatchSize: number;
  recommendedConcurrency: number;
  timeoutRate: number;
}

export function PerformanceOptimizer() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformanceMetrics();
  }, []);

  const loadPerformanceMetrics = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await (supabase as any)
        .from("codex_sections")
        .select("status, created_at, updated_at, error_message")
        .gte("created_at", sevenDaysAgo.toISOString());

      if (data) {
        const metrics = calculateMetrics(data);
        setMetrics(metrics);
      }
    } catch (error) {
      console.error("Error loading performance metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (sections: any[]): PerformanceMetrics => {
    const totalSections = sections.length;
    const completedSections = sections.filter((s) => s.status === "completed");
    const errorSections = sections.filter((s) => s.status === "error");
    const timeoutErrors = errorSections.filter((s) =>
      s.error_message?.toLowerCase().includes("timeout")
    );

    const generationTimes = completedSections
      .map((s) => {
        const start = new Date(s.created_at).getTime();
        const end = new Date(s.updated_at).getTime();
        return (end - start) / 1000;
      })
      .filter((time) => time > 0 && time < 600);

    const avgGenerationTime =
      generationTimes.length > 0
        ? generationTimes.reduce((a, b) => a + b, 0) / generationTimes.length
        : 0;

    const successRate = totalSections > 0 ? (completedSections.length / totalSections) * 100 : 0;
    const errorRate = totalSections > 0 ? (errorSections.length / totalSections) * 100 : 0;
    const timeoutRate = totalSections > 0 ? (timeoutErrors.length / totalSections) * 100 : 0;

    let recommendedBatchSize = 5;
    let recommendedConcurrency = 3;

    if (errorRate > 20) {
      recommendedBatchSize = 3;
      recommendedConcurrency = 2;
    } else if (errorRate > 10) {
      recommendedBatchSize = 4;
      recommendedConcurrency = 2;
    } else if (successRate > 90) {
      recommendedBatchSize = 7;
      recommendedConcurrency = 4;
    }

    if (timeoutRate > 15) {
      recommendedConcurrency = Math.max(1, recommendedConcurrency - 1);
    }

    return {
      avgGenerationTime,
      successRate,
      errorRate,
      totalSections,
      recommendedBatchSize,
      recommendedConcurrency,
      timeoutRate,
    };
  };

  const getHealthStatus = (successRate: number): { label: string; color: string } => {
    if (successRate >= 90) return { label: "Excellent", color: "text-green-500" };
    if (successRate >= 75) return { label: "Good", color: "text-blue-500" };
    if (successRate >= 60) return { label: "Fair", color: "text-yellow-500" };
    return { label: "Poor", color: "text-destructive" };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Optimizer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading performance metrics...</p>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  const healthStatus = getHealthStatus(metrics.successRate);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Performance Optimizer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">System Health</span>
            <Badge className={healthStatus.color}>{healthStatus.label}</Badge>
          </div>
          <Progress value={metrics.successRate} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.successRate.toFixed(1)}% success rate ({metrics.totalSections} sections analyzed)
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              Avg Generation Time
            </div>
            <p className="text-2xl font-bold">{metrics.avgGenerationTime.toFixed(1)}s</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4" />
              Error Rate
            </div>
            <p className="text-2xl font-bold">{metrics.errorRate.toFixed(1)}%</p>
          </div>
        </div>

        <div className="border-t pt-4 space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Optimization Recommendations
          </h4>

          <div className="space-y-2">
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium">Recommended Batch Size</p>
              <p className="text-2xl font-bold text-primary">{metrics.recommendedBatchSize}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sections to process in parallel per batch
              </p>
            </div>

            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium">Recommended Concurrency</p>
              <p className="text-2xl font-bold text-primary">{metrics.recommendedConcurrency}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Codexes to process simultaneously
              </p>
            </div>
          </div>

          {metrics.timeoutRate > 10 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-500">
                High Timeout Rate Detected
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.timeoutRate.toFixed(1)}% of sections are timing out. Consider reducing
                concurrency or increasing timeout duration.
              </p>
            </div>
          )}

          {metrics.successRate < 75 && (
            <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
              <p className="text-sm font-medium text-destructive">Action Required</p>
              <p className="text-xs text-muted-foreground mt-1">
                Success rate is below optimal. Review error categorization for specific issues.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
