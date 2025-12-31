import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Zap, TrendingUp, Activity, ArrowRightLeft, Cpu, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AIUsageStatsProps {
  stats: {
    totalCost: number;
    totalTokens: number;
    requestsToday: number;
    recentUsage: Array<{
      function_name: string;
      total_tokens: number;
      estimated_cost: number;
      created_at: string;
      model?: string;
      model_name?: string;
      provider_code?: string;
      status?: string;
      error_message?: string;
      execution_mode?: string;
    }>;
  };
}

export const AIUsageStats = ({ stats }: AIUsageStatsProps) => {
  // Count fallback occurrences (when model used is different from configured or has fallback in error)
  const fallbackCount = stats.recentUsage.filter(
    u => u.error_message?.toLowerCase().includes('fallback') || 
         u.error_message?.toLowerCase().includes('unavailable')
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total API Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalCost.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">All-time AI usage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Combined input + output</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requests Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.requestsToday}</div>
            <p className="text-xs text-muted-foreground">API calls in last 24h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fallbacks</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fallbackCount}</div>
            <p className="text-xs text-muted-foreground">Model fallback used</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent API Usage
          </CardTitle>
          <CardDescription>Last 10 AI generation requests with model details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentUsage.length === 0 ? (
              <p className="text-sm text-muted-foreground">No usage data yet</p>
            ) : (
              stats.recentUsage.map((usage, index) => {
                const provider = usage.provider_code || 'openai';
                const model = usage.model_name || usage.model || 'unknown';
                const isFallback = usage.error_message?.toLowerCase().includes('fallback');
                const isError = usage.status === 'error';
                
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{usage.function_name}</p>
                        {isError && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Error
                          </Badge>
                        )}
                        {isFallback && (
                          <Badge variant="outline" className="text-orange-500 border-orange-500 text-xs">
                            <ArrowRightLeft className="h-3 w-3 mr-1" />
                            Fallback
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          <Cpu className="h-3 w-3 mr-1" />
                          {provider}/{model}
                        </Badge>
                        {usage.execution_mode && usage.execution_mode !== 'single' && (
                          <Badge variant="outline" className="text-xs">
                            {usage.execution_mode}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(usage.created_at), { addSuffix: true })}
                      </p>
                      {usage.error_message && (
                        <p className="text-xs text-destructive truncate max-w-md">
                          {usage.error_message}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">${usage.estimated_cost.toFixed(6)}</p>
                      <p className="text-xs text-muted-foreground">
                        {usage.total_tokens.toLocaleString()} tokens
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
