import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Clock, TrendingUp, RefreshCw, Share2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Analytics() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    checkAdminAndLoadAnalytics();
  }, []);

  const checkAdminAndLoadAnalytics = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (roleData?.role !== "admin") {
        navigate("/");
        return;
      }

      loadAnalytics();
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/");
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-analytics');
      
      if (error) throw error;
      
      setAnalytics(data);
    } catch (error: any) {
      toast({
        title: "Error loading analytics",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation isAuthenticated={true} />
        <div className="container mx-auto px-4 py-12">
          <p className="text-muted-foreground text-center">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const topCodexes = Object.entries(analytics.codexStats || {})
    .sort(([, a]: any, [, b]: any) => b.completed - a.completed)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={true} />
      
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            System-wide metrics and insights
          </p>
        </div>

        {/* Generation Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.generationMetrics.totalRuns}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.generationMetrics.completedRuns} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.generationMetrics.averageCompletionTimeMinutes} min
              </div>
              <p className="text-xs text-muted-foreground">
                Per persona run
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Regenerations</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.regenerationStats.totalRegenerations}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.regenerationStats.sectionsWithRegenerations} sections regenerated
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Most Popular Codexes */}
          <Card>
            <CardHeader>
              <CardTitle>Most Popular Codexes</CardTitle>
              <CardDescription>By completion count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCodexes.map(([name, stats]: any, index) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{name}</p>
                        <p className="text-sm text-muted-foreground">
                          {stats.completed} completed
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{stats.total} total</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Share Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Share Statistics</CardTitle>
              <CardDescription>Public sharing metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-5 w-5 text-primary" />
                    <span>Total Links</span>
                  </div>
                  <span className="text-2xl font-bold">{analytics.shareStats.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-green-500" />
                    <span>Active Links</span>
                  </div>
                  <span className="text-2xl font-bold">{analytics.shareStats.active}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <span>Total Views</span>
                  </div>
                  <span className="text-2xl font-bold">{analytics.shareStats.totalViews}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Event Counts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Event breakdown (last 100 events)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(analytics.eventCounts || {}).map(([event, count]: any) => (
                <div key={event} className="space-y-1">
                  <p className="text-sm text-muted-foreground capitalize">
                    {event.replace(/_/g, ' ')}
                  </p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
