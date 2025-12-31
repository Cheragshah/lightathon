import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, TrendingUp, AlertCircle, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AnalyticsData {
  totalSections: number;
  completedSections: number;
  errorSections: number;
  pendingSections: number;
  generatingSections: number;
  successRate: number;
  averageTimeSeconds: number;
  topErrors: Array<{ error: string; count: number }>;
  recentActivity: Array<{
    id: string;
    codexId: string;
    codexName: string;
    sectionName: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export const GenerationAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAnalytics = async () => {
    try {
      // Query sections data
      const { data: sections, error } = await (supabase as any)
        .from("codex_sections")
        .select(`
          id,
          status,
          created_at,
          updated_at,
          error_message,
          section_name,
          codex_id,
          codexes!inner(codex_name)
        `)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) {
        console.error('Error loading analytics:', error);
        throw error;
      }

      if (!sections || sections.length === 0) {
        setAnalytics({
          totalSections: 0,
          completedSections: 0,
          errorSections: 0,
          pendingSections: 0,
          generatingSections: 0,
          successRate: 0,
          averageTimeSeconds: 0,
          topErrors: [],
          recentActivity: [],
        });
        return;
      }

      const totalSections = sections.length;
      const completedSections = sections.filter((s: any) => s.status === 'completed').length;
      const errorSections = sections.filter((s: any) => s.status === 'error').length;
      const pendingSections = sections.filter((s: any) => s.status === 'pending').length;
      const generatingSections = sections.filter((s: any) => s.status === 'generating').length;

      const successRate = totalSections > 0 ? (completedSections / totalSections) * 100 : 0;

      // Calculate average generation time for completed sections
      const completedWithTime = sections.filter((s: any) => 
        s.status === 'completed' && s.created_at && s.updated_at
      );
      
      const totalTime = completedWithTime.reduce((acc: number, section: any) => {
        const start = new Date(section.created_at).getTime();
        const end = new Date(section.updated_at).getTime();
        return acc + (end - start);
      }, 0);

      const averageTimeSeconds = completedWithTime.length > 0 
        ? Math.round(totalTime / completedWithTime.length / 1000) 
        : 0;

      // Get top error messages
      const errorMessages = sections
        .filter((s: any) => s.error_message)
        .map((s: any) => s.error_message);

      const errorCounts: Record<string, number> = {};
      errorMessages.forEach((msg: string) => {
        if (msg) {
          errorCounts[msg] = (errorCounts[msg] || 0) + 1;
        }
      });

      const topErrors = Object.entries(errorCounts)
        .map(([error, count]) => ({ error, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Recent activity (last 20 sections)
      const recentActivity = sections.slice(0, 20).map((s: any) => ({
        id: s.id,
        codexId: s.codex_id,
        codexName: s.codexes?.codex_name || 'Unknown',
        sectionName: s.section_name,
        status: s.status,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }));

      setAnalytics({
        totalSections,
        completedSections,
        errorSections,
        pendingSections,
        generatingSections,
        successRate,
        averageTimeSeconds,
        topErrors,
        recentActivity,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'error': return 'destructive';
      case 'generating': return 'secondary';
      default: return 'outline';
    }
  };

  const handleRetryPending = async () => {
    try {
      setRetrying('pending');
      const { data, error } = await supabase.functions.invoke('retry-pending-sections', {
        body: { autoRetry: true }
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Retried ${data.retried || 0} pending sections`,
      });
      
      setTimeout(loadAnalytics, 3000);
    } catch (error) {
      console.error('Error retrying pending sections:', error);
      toast({
        title: "Error",
        description: "Failed to retry pending sections",
        variant: "destructive",
      });
    } finally {
      setRetrying(null);
    }
  };

  const handleRetryErrors = async () => {
    try {
      setRetrying('errors');
      const { data, error } = await supabase.functions.invoke('retry-error-sections', {
        body: { autoRetry: true }
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Retried ${data.retried || 0} error sections`,
      });
      
      setTimeout(loadAnalytics, 3000);
    } catch (error) {
      console.error('Error retrying error sections:', error);
      toast({
        title: "Error",
        description: "Failed to retry error sections",
        variant: "destructive",
      });
    } finally {
      setRetrying(null);
    }
  };

  const handleRetrySingleSection = async (sectionId: string, codexId: string) => {
    try {
      setRetrying(sectionId);
      
      // Reset section to pending
      const { error: updateError } = await supabase
        .from('codex_sections')
        .update({ 
          status: 'pending',
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', sectionId);
      
      if (updateError) throw updateError;

      // Call generate-codex-section
      const { error: generateError } = await supabase.functions.invoke('generate-codex-section', {
        body: { 
          sectionId,
          codexId
        }
      });
      
      if (generateError) throw generateError;
      
      toast({
        title: "Success",
        description: "Section retry initiated",
      });
      
      setTimeout(loadAnalytics, 3000);
    } catch (error) {
      console.error('Error retrying section:', error);
      toast({
        title: "Error",
        description: "Failed to retry section",
        variant: "destructive",
      });
    } finally {
      setRetrying(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="text-center py-8">No analytics data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.successRate.toFixed(1)}%</div>
            <Progress value={analytics.successRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {analytics.completedSections} of {analytics.totalSections} sections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Generation Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(analytics.averageTimeSeconds)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Per section average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completedSections}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Successfully generated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.errorSections}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {analytics.pendingSections} pending, {analytics.generatingSections} generating
            </p>
            {analytics.errorSections > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3 w-full"
                onClick={handleRetryErrors}
                disabled={retrying === 'errors'}
              >
                {retrying === 'errors' ? (
                  <>
                    <RotateCw className="h-3 w-3 mr-1 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RotateCw className="h-3 w-3 mr-1" />
                    Retry All Errors
                  </>
                )}
              </Button>
            )}
            {analytics.pendingSections > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                onClick={handleRetryPending}
                disabled={retrying === 'pending'}
              >
                {retrying === 'pending' ? (
                  <>
                    <RotateCw className="h-3 w-3 mr-1 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RotateCw className="h-3 w-3 mr-1" />
                    Retry All Pending
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Status Distribution</CardTitle>
          <CardDescription>Current state of all sections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{analytics.completedSections}</span>
                <Progress 
                  value={(analytics.completedSections / analytics.totalSections) * 100} 
                  className="w-24" 
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Generating</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{analytics.generatingSections}</span>
                <Progress 
                  value={(analytics.generatingSections / analytics.totalSections) * 100} 
                  className="w-24" 
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{analytics.pendingSections}</span>
                <Progress 
                  value={(analytics.pendingSections / analytics.totalSections) * 100} 
                  className="w-24" 
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm">Error</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{analytics.errorSections}</span>
                <Progress 
                  value={(analytics.errorSections / analytics.totalSections) * 100} 
                  className="w-24" 
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Errors */}
      {analytics.topErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Error Messages</CardTitle>
            <CardDescription>Most common failure reasons</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topErrors.map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Badge variant="destructive" className="mt-1">{item.count}</Badge>
                  <p className="text-sm flex-1">{item.error}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Last 20 section generations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.codexName}</p>
                  <p className="text-xs text-muted-foreground">{activity.sectionName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusColor(activity.status)}>{activity.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(activity.updatedAt)}
                  </span>
                  {(activity.status === 'pending' || activity.status === 'error') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRetrySingleSection(activity.id, activity.codexId)}
                      disabled={retrying === activity.id}
                      className="h-8 w-8 p-0"
                    >
                      {retrying === activity.id ? (
                        <RotateCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCw className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                  {activity.status === 'completed' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
