import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FileText, Download, BarChart3, FileText as LogIcon, StopCircle, Settings, Zap, BookOpen, Key, Mail, ChevronDown, ChevronRight, IndianRupee } from "lucide-react";
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
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";

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
                onCheckedChange={setEnabled}
              />
            </div>
          </div>
          <CardDescription>
            Configure pricing tiers based on word count ranges
          </CardDescription>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            {enabled ? (
              <PricingBracketsManager />
            ) : (
              <p className="text-muted-foreground text-sm">
                Enable pricing brackets to configure word count-based pricing tiers.
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPersonaRuns: 0,
    completedRuns: 0,
    activeRuns: 0,
    aiUsage: 0,
    failedRuns: 0
  });
  const [aiUsage, setAiUsage] = useState({
    totalTokens: 0,
    totalCost: 0,
    modelBreakdown: {} as Record<string, number>,
    requestsToday: 0,
    recentUsage: [] as any[]
  });
  const [activeRuns, setActiveRuns] = useState<any[]>([]);
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("users");

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const response = await supabase.functions.invoke('verify-admin');
      
      if (response.error) {
        console.error("Error verifying admin:", response.error);
        navigate("/dashboard");
        return;
      }

      const data = response.data;
      
      if (!data.isAdmin && !data.isModerator) {
        navigate("/dashboard");
        return;
      }

      setIsAdmin(data.isAdmin);
      setIsModerator(data.isModerator);
      setUsers(data.users || []);
      setStats({
        totalUsers: data.stats?.totalUsers || 0,
        totalPersonaRuns: data.stats?.totalPersonaRuns || 0,
        completedRuns: data.stats?.completedRuns || 0,
        activeRuns: data.stats?.activeRuns || 0,
        aiUsage: data.stats?.aiUsage || 0,
        failedRuns: data.stats?.failedRuns || 0
      });
      setAiUsage({
        totalTokens: data.stats?.totalTokens || 0,
        totalCost: data.stats?.totalCost || 0,
        modelBreakdown: data.stats?.modelBreakdown || {},
        requestsToday: data.stats?.requestsToday || 0,
        recentUsage: data.stats?.recentUsage || []
      });
      setActiveRuns(data.activeRuns || []);
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await supabase.functions.invoke('verify-admin');
      if (response.data) {
        setUsers(response.data.users || []);
        setStats({
          totalUsers: response.data.stats?.totalUsers || 0,
          totalPersonaRuns: response.data.stats?.totalPersonaRuns || 0,
          completedRuns: response.data.stats?.completedRuns || 0,
          activeRuns: response.data.stats?.activeRuns || 0,
          aiUsage: response.data.stats?.aiUsage || 0,
          failedRuns: response.data.stats?.failedRuns || 0
        });
        setAiUsage({
          totalTokens: response.data.stats?.totalTokens || 0,
          totalCost: response.data.stats?.totalCost || 0,
          modelBreakdown: response.data.stats?.modelBreakdown || {},
          requestsToday: response.data.stats?.requestsToday || 0,
          recentUsage: response.data.stats?.recentUsage || []
        });
        setActiveRuns(response.data.activeRuns || []);
      }
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

  const renderContent = () => {
    switch (activeTab) {
      case "users":
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    View all users with their persona runs and AI usage.
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
        );

      case "profiles":
        return <UserProfilesTable users={users} />;

      case "batches":
        return isAdmin ? (
          <div className="space-y-6">
            <BatchManager />
            <CategoryAssignments />
          </div>
        ) : null;

      case "generation":
        return isAdmin ? (
          <div className="space-y-6">
            <PersonaRunsProgressDashboard />
            <CodexGenerationControl />
          </div>
        ) : null;

      case "lightathon":
        return isAdmin ? <LightathonManager /> : null;

      case "analytics":
        return (
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
        );

      case "system":
        return (
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
        );

      case "audit":
        return <AuditLogsTable />;

      case "configuration":
        return isAdmin ? (
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
        ) : null;

      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          isAdmin={isAdmin} 
        />
        
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">
                {isAdmin ? 'Admin Dashboard' : 'Moderator Dashboard'}
              </h1>
            </div>
            <AdminNotifications />
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 py-6 max-w-7xl">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                    <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold">{stats.totalPersonaRuns}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                    <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold">{stats.completedRuns}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                    <CardTitle className="text-sm font-medium">Active</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold">{stats.activeRuns}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Active Runs Alert */}
              {activeRuns.length > 0 && (
                <Card className="mb-6 border-yellow-500/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      Active Generation Runs ({activeRuns.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {activeRuns.map((run) => (
                        <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <span className="font-medium">{run.title}</span>
                            <span className="text-sm text-muted-foreground ml-2">{run.user_email}</span>
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
                                toast({ title: "Success", description: "Persona run cancelled" });
                                loadStats();
                              } catch (error) {
                                toast({ title: "Error", description: "Failed to cancel run", variant: "destructive" });
                              }
                            }}
                          >
                            <StopCircle className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tab Content */}
              {renderContent()}

              <BulkActionsToolbar
                selectedRunIds={selectedRunIds}
                onClearSelection={() => setSelectedRunIds([])}
                onExportComplete={loadStats}
              />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
