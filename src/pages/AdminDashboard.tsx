import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FileText, DollarSign, Activity, Download, BarChart3, FileText as LogIcon, X, StopCircle, Settings, Zap, AlertCircle, BookOpen, Key, Mail, UserCircle } from "lucide-react";
import { UsersTable } from "@/components/admin/UsersTable";
import { UserProfilesTable } from "@/components/admin/UserProfilesTable";
import { exportToCSV } from "@/utils/exportAdminData";
import { useToast } from "@/hooks/use-toast";
import { UsageCharts } from "@/components/admin/UsageCharts";
import { AuditLogsTable } from "@/components/admin/AuditLogsTable";
import { AdminNotifications } from "@/components/admin/AdminNotifications";
import { BulkActionsToolbar } from "@/components/admin/BulkActionsToolbar";
import { EnhancedPDFTemplateSettings } from "@/components/admin/EnhancedPDFTemplateSettings";
import { ShareLinkAnalytics } from "@/components/admin/ShareLinkAnalytics";
import { CodexPromptsManager } from "@/components/admin/CodexPromptsManager";
import { GenerationAnalytics } from "@/components/admin/GenerationAnalytics";
import { ErrorCategorization } from "@/components/admin/ErrorCategorization";
import { PerformanceOptimizer } from "@/components/admin/PerformanceOptimizer";
import { QuestionnaireQuestionsManager } from "@/components/admin/QuestionnaireQuestionsManager";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { SystemConfiguration } from "@/components/admin/SystemConfiguration";
import { SystemSettings } from "@/components/admin/SystemSettings";
import { AIProvidersManager } from "@/components/admin/AIProvidersManager";
import { EmailSettings } from "@/components/admin/EmailSettings";
import { PricingBracketsManager } from "@/components/admin/PricingBracketsManager";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPersonaRuns: 0,
    activeGenerations: 0,
    totalAICost: 0,
  });
  const [aiUsage, setAiUsage] = useState({
    totalCost: 0,
    totalTokens: 0,
    requestsToday: 0,
    recentUsage: [],
  });
  const [users, setUsers] = useState<any[]>([]);
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [activeRuns, setActiveRuns] = useState<any[]>([]);

  useEffect(() => {
    checkAdminStatus();

    // Set up real-time subscriptions for admin dashboard
    const usersChannel = supabase
      .channel('admin-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'persona_runs'
        },
        () => {
          console.log('Persona runs updated, reloading stats');
          loadStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles'
        },
        () => {
          console.log('User roles updated, reloading stats');
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
    };
  }, [navigate]);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Use server-side admin/moderator verification
      const { data, error } = await supabase.functions.invoke('verify-admin');

      if (error || (!data?.isAdmin && !data?.isModerator)) {
        console.error("Admin/Moderator verification failed:", error);
        navigate("/");
        return;
      }

      // Server verified admin/moderator status - load data from response
      setIsAdmin(data.isAdmin || false);
      setIsModerator(data.isModerator || false);
      setStats(data.stats);
      setAiUsage(data.aiUsage || { totalCost: 0, totalTokens: 0, requestsToday: 0, recentUsage: [] });
      setUsers(data.users);
      setActiveRuns(data.personaRuns?.filter((run: any) => run.status === 'generating') || []);
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Reload admin/moderator data from server
      const { data, error } = await supabase.functions.invoke('verify-admin');
      
      if (error || (!data?.isAdmin && !data?.isModerator)) {
        console.error("Failed to reload admin data:", error);
        return;
      }

      setIsAdmin(data.isAdmin || false);
      setIsModerator(data.isModerator || false);
      setStats(data.stats);
      setAiUsage(data.aiUsage || { totalCost: 0, totalTokens: 0, requestsToday: 0, recentUsage: [] });
      setUsers(data.users);
      setActiveRuns(data.personaRuns?.filter((run: any) => run.status === 'generating') || []);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin && !isModerator) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={true} />
      
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">
                {isAdmin ? 'Admin Dashboard' : 'Moderator Dashboard'}
              </h1>
              <p className="text-muted-foreground">
                {isAdmin ? 'Manage all users and their persona runs' : 'View and manage users'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/documentation")}
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Documentation
            </Button>
            <AdminNotifications />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Registered accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Persona Runs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPersonaRuns}</div>
              <p className="text-xs text-muted-foreground">Total generations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total AI Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalAICost.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Across all users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Generations</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeGenerations}</div>
              <p className="text-xs text-muted-foreground">Currently processing</p>
            </CardContent>
          </Card>
        </div>

        {activeRuns.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Active Generations</CardTitle>
              <CardDescription>
                Currently running persona generations - you can cancel them to save AI costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeRuns.map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{run.title}</span>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{run.user_email}</span>
                        <span>•</span>
                        <span>Started {new Date(run.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        try {
                          const { error } = await supabase.functions.invoke('admin-cancel-persona-run', {
                            body: { personaRunId: run.id }
                          });

                          if (error) throw error;

                          toast({
                            title: "Success",
                            description: "Persona run cancelled successfully",
                          });

                          loadStats();
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: error instanceof Error ? error.message : "Failed to cancel run",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <StopCircle className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="profiles">
              <UserCircle className="h-4 w-4 mr-2" />
              Profiles
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="system">
              <Zap className="h-4 w-4 mr-2" />
              System Health
            </TabsTrigger>
            <TabsTrigger value="audit">
              <LogIcon className="h-4 w-4 mr-2" />
              Audit Logs
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="configuration">
                <Settings className="h-4 w-4 mr-2" />
                Configuration
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      View all users with their persona runs and AI usage. Click the eye icon to view persona runs, shield icon to manage roles.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      exportToCSV(users);
                      toast({
                        title: "Success",
                        description: "Admin data exported to CSV",
                      });
                    }}
                    disabled={users.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <UsersTable 
                  users={users} 
                  onRoleUpdated={loadStats}
                  selectedRunIds={selectedRunIds}
                  onSelectRun={(runId) => {
                    setSelectedRunIds(prev => 
                      prev.includes(runId) 
                        ? prev.filter(id => id !== runId)
                        : [...prev, runId]
                    );
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profiles">
            <UserProfilesTable users={users} />
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI Usage Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <UsageCharts users={users} aiUsage={aiUsage} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Generation Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <GenerationAnalytics />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Share Link Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <ShareLinkAnalytics />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="system">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Optimization</CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceOptimizer />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Error Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <ErrorCategorization />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogsTable />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="configuration">
            <Tabs defaultValue="system" className="space-y-4">
              <TabsList className="flex-wrap">
                <TabsTrigger value="system">
                  <Settings className="h-4 w-4 mr-2" />
                  System
                </TabsTrigger>
                <TabsTrigger value="ai-providers">
                  <Key className="h-4 w-4 mr-2" />
                  AI Providers
                </TabsTrigger>
                <TabsTrigger value="email">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="pdf-templates">
                  <FileText className="h-4 w-4 mr-2" />
                  PDF Templates
                </TabsTrigger>
                <TabsTrigger value="codex-prompts">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Codex Prompts
                </TabsTrigger>
                <TabsTrigger value="questions">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Questions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="system" className="space-y-6">
                <SystemConfiguration />
                <SystemSettings />
                <PricingBracketsManager />
              </TabsContent>

              <TabsContent value="ai-providers">
                <AIProvidersManager />
              </TabsContent>

              <TabsContent value="email">
                <EmailSettings />
              </TabsContent>

              <TabsContent value="pdf-templates">
                <EnhancedPDFTemplateSettings />
              </TabsContent>

              <TabsContent value="codex-prompts">
                <CodexPromptsManager />
              </TabsContent>

              <TabsContent value="questions">
                <QuestionnaireQuestionsManager />
              </TabsContent>
            </Tabs>
            </TabsContent>
          )}
        </Tabs>

        <BulkActionsToolbar
          selectedRunIds={selectedRunIds}
          onClearSelection={() => setSelectedRunIds([])}
          onExportComplete={loadStats}
        />
      </div>
    </div>
  );
}
