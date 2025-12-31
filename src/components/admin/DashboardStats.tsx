import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, DollarSign, AlertCircle, TrendingUp, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function DashboardStats() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeGenerations: 0,
    todayAICost: 0,
    recentErrors: 0,
    newUsersToday: 0,
    avgGenerationTime: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Get total users
      const { count: totalUsers } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true });

      // Get new users today
      const { count: newUsersToday } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayISO);

      // Get active generations
      const { count: activeGenerations } = await supabase
        .from("persona_runs")
        .select("*", { count: "exact", head: true })
        .eq("status", "generating");

      // Get today's AI cost
      const { data: aiUsage } = await supabase
        .from("ai_usage_logs")
        .select("estimated_cost")
        .gte("created_at", todayISO);

      const todayAICost = aiUsage?.reduce((sum, log) => sum + Number(log.estimated_cost || 0), 0) || 0;

      // Get recent errors (last 24 hours)
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      const { count: recentErrors } = await supabase
        .from("ai_usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "error")
        .gte("created_at", yesterday.toISOString());

      // Get average generation time for completed runs today
      const { data: completedRuns } = await supabase
        .from("persona_runs")
        .select("started_at, completed_at")
        .eq("status", "completed")
        .gte("completed_at", todayISO)
        .not("started_at", "is", null)
        .not("completed_at", "is", null);

      let avgGenerationTime = 0;
      if (completedRuns && completedRuns.length > 0) {
        const totalTime = completedRuns.reduce((sum, run) => {
          const start = new Date(run.started_at!).getTime();
          const end = new Date(run.completed_at!).getTime();
          return sum + (end - start);
        }, 0);
        avgGenerationTime = Math.round(totalTime / completedRuns.length / 1000 / 60); // in minutes
      }

      setStats({
        totalUsers: totalUsers || 0,
        activeGenerations: activeGenerations || 0,
        todayAICost,
        recentErrors: recentErrors || 0,
        newUsersToday: newUsersToday || 0,
        avgGenerationTime
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      trend: stats.newUsersToday > 0 ? `+${stats.newUsersToday} today` : "No new users",
      trendPositive: stats.newUsersToday > 0,
      color: "text-blue-500"
    },
    {
      title: "Active Generations",
      value: stats.activeGenerations,
      icon: Activity,
      trend: stats.activeGenerations > 0 ? "In progress" : "All complete",
      trendPositive: stats.activeGenerations === 0,
      color: "text-green-500"
    },
    {
      title: "Today's AI Cost",
      value: `$${stats.todayAICost.toFixed(2)}`,
      icon: DollarSign,
      trend: stats.avgGenerationTime > 0 ? `~${stats.avgGenerationTime}min avg` : "No data",
      trendPositive: true,
      color: "text-purple-500"
    },
    {
      title: "Recent Errors",
      value: stats.recentErrors,
      icon: AlertCircle,
      trend: "Last 24 hours",
      trendPositive: stats.recentErrors === 0,
      color: "text-red-500"
    }
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-4 w-4 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-2" />
              <div className="h-3 bg-muted rounded w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center gap-2 mt-1">
                {stat.trendPositive ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <Clock className="h-3 w-3 text-muted-foreground" />
                )}
                <p className="text-xs text-muted-foreground">{stat.trend}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
