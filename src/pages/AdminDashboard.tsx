import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FileText, DollarSign, Activity, Download, BarChart3, FileText as LogIcon, X, StopCircle, Settings, Zap, AlertCircle, BookOpen, Key, Mail, UserCircle, ChevronDown, ChevronRight, IndianRupee, Layers, Play, Sparkles } from "lucide-react";
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
import { BatchManager } from "@/components/admin/BatchManager";
import { CategoryAssignments } from "@/components/admin/CategoryAssignments";
import { CodexGenerationControl } from "@/components/admin/CodexGenerationControl";
import { PersonaRunsProgressDashboard } from "@/components/admin/PersonaRunsProgressDashboard";
import { LightathonManager } from "@/components/admin/LightathonManager";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Optional Pricing Brackets wrapper component
function OptionalPricingBrackets() {
  const [enabled, setEnabled] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto hover:bg-transparent flex items-center gap-2">
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5" />
                  <CardTitle className="text-base">Pricing Brackets Manager</CardTitle>
                </div>
                {!enabled && <Badge variant="secondary" className="ml-2">Disabled</Badge>}
              </Button>
            </CollapsibleTrigger>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{enabled ? "Enabled" : "Disabled"}</span>
              <Switch
                checked={enabled}
                onCheckedChange={(checked) => {
                  setEnabled(checked);
                  if (checked) setExpanded(true);
                }}
              />
            </div>
          </div>
          <CardDescription className="ml-6">
            Configure L1, L2, L3 pricing brackets for offer strategies (optional feature)
          </CardDescription>
        </CardHeader>
        <CollapsibleContent>
          {enabled ? (
            <CardContent className="pt-0">
              <PricingBracketsManager />
            </CardContent>
          ) : (
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                Enable the toggle above to configure pricing brackets.
              </p>
            </CardContent>
          )}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

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
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navigation isAuthenticated={true} />
      
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12">
        {/* Header - Stack on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 min-w-0">
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">
                {isAdmin ? 'Admin Dashboard' : 'Moderator Dashboard'}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {isAdmin ? 'Manage all users and their persona runs' : 'View and manage users'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/documentation")}
              className="gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Docs</span>
            </Button>
            <AdminNotifications />
          </div>
        </div>

        {/* Stats Grid - 2x2 on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium truncate">Total Users</CardTitle>
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-lg sm:text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Registered accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium truncate">Persona Runs</CardTitle>
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-lg sm:text-2xl font-bold">{stats.totalPersonaRuns}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total generations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium truncate">AI Cost</CardTitle>
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-lg sm:text-2xl font-bold">${stats.totalAICost.toFixed(2)}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Across all users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium truncate">Active</CardTitle>
              <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground animate-pulse flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-lg sm:text-2xl font-bold">{stats.activeGenerations}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Processing</p>
            </CardContent>
          </Card>
        </div>

        {activeRuns.length > 0 && (
          <Card className="mb-6 sm:mb-8">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Active Generations</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Currently running persona generations - you can cancel them to save AI costs
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="space-y-2 sm:space-y-3">
                {activeRuns.map((run) => (
                  <div key={run.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-medium text-sm sm:text-base truncate">{run.title}</span>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                        <span className="truncate max-w-[150px] sm:max-w-none">{run.user_email}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="text-[10px] sm:text-xs">Started {new Date(run.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full sm:w-auto flex-shrink-0"
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
                      <StopCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="users" className="space-y-4 sm:space-y-6">
          {/* Scrollable tabs for mobile */}
          <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-max min-w-full sm:w-auto sm:min-w-0 h-auto flex-wrap sm:flex-nowrap gap-1 p-1">
              <TabsTrigger value="users" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="profiles" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
                <UserCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Profiles</span>
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="batches" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
                  <Layers className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Batches</span>
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="generation" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
                  <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Generation</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="analytics" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
                <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Health</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
                <LogIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Logs</span>
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="lightathon" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Lightathon</span>
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="configuration" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Config</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

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

          {isAdmin && (
            <TabsContent value="batches">
              <div className="space-y-6">
                <BatchManager />
                <CategoryAssignments />
              </div>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="generation">
              <div className="space-y-6">
                <PersonaRunsProgressDashboard />
                <CodexGenerationControl />
              </div>
            </TabsContent>
          )}

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
                <OptionalPricingBrackets />
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

          {isAdmin && (
            <TabsContent value="lightathon">
              <LightathonManager />
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
