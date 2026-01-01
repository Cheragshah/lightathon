import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Play, XCircle, RefreshCw, Users, Search, RotateCcw, Trash2, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCategoryAssignments } from "./UserCategoryAssignments";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Batch {
  id: string;
  batch_name: string;
}

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  batch: string | null;
}

interface PersonaRun {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
}

interface CodexPrompt {
  id: string;
  codex_name: string;
  display_order: number;
  is_active: boolean;
}

interface AIProvider {
  id: string;
  name: string;
  is_active: boolean;
  available_models: any;
  default_model: string | null;
}

interface QueueItem {
  id: string;
  user_id: string;
  codex_prompt_id: string;
  status: string;
  ai_model: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  user_name?: string;
  codex_name?: string;
}

export const CodexGenerationControl = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [personaRuns, setPersonaRuns] = useState<PersonaRun[]>([]);
  const [codexPrompts, setCodexPrompts] = useState<CodexPrompt[]>([]);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedCodexIds, setSelectedCodexIds] = useState<string[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  
  // New filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [queueStatusFilter, setQueueStatusFilter] = useState<string>("all");
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);
  const [errorDetailsItem, setErrorDetailsItem] = useState<QueueItem | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedBatchId && selectedBatchId !== "all") {
      const batchName = batches.find(b => b.id === selectedBatchId)?.batch_name;
      const batchUsers = users.filter(u => u.batch === batchName);
      setSelectedUserIds(batchUsers.map(u => u.id));
    } else if (selectedBatchId === "all") {
      setSelectedUserIds([]);
    }
  }, [selectedBatchId, batches, users]);

  useEffect(() => {
    if (selectedProviderId) {
      const provider = providers.find(p => p.id === selectedProviderId);
      if (provider?.default_model) {
        setSelectedModel(provider.default_model);
      } else {
        setSelectedModel("");
      }
    }
  }, [selectedProviderId, providers]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [batchesRes, usersRes, codexRes, providersRes, personaRunsRes] = await Promise.all([
        supabase.from("batches").select("id, batch_name").eq("is_active", true).order("batch_name"),
        supabase.from("profiles").select("id, first_name, last_name, email, batch"),
        supabase.from("codex_prompts").select("id, codex_name, display_order, is_active").eq("is_active", true).order("display_order"),
        supabase.from("ai_providers").select("id, name, is_active, available_models, default_model").eq("is_active", true),
        supabase.from("persona_runs").select("id, user_id, status, created_at").order("created_at", { ascending: false }),
      ]);

      if (batchesRes.error) throw batchesRes.error;
      if (usersRes.error) throw usersRes.error;
      if (codexRes.error) throw codexRes.error;
      if (providersRes.error) throw providersRes.error;
      if (personaRunsRes.error) throw personaRunsRes.error;

      setBatches(batchesRes.data || []);
      setUsers(usersRes.data || []);
      setCodexPrompts(codexRes.data || []);
      setProviders(providersRes.data || []);
      setPersonaRuns(personaRunsRes.data || []);

      if (providersRes.data && providersRes.data.length > 0 && !selectedProviderId) {
        setSelectedProviderId(providersRes.data[0].id);
      }

      await fetchQueue();
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchQueue = async () => {
    try {
      const { data, error } = await supabase
        .from("codex_generation_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const enrichedQueue = (data || []).map(item => {
        const user = users.find(u => u.id === item.user_id);
        const codex = codexPrompts.find(c => c.id === item.codex_prompt_id);
        return {
          ...item,
          user_name: user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email : "Unknown",
          codex_name: codex?.codex_name || "Unknown",
        };
      });

      setQueue(enrichedQueue);
    } catch (error: any) {
      console.error("Error fetching queue:", error);
    }
  };

  const handleTriggerGeneration = async () => {
    if (selectedUserIds.length === 0) {
      toast.error("Please select at least one user");
      return;
    }
    if (selectedCodexIds.length === 0) {
      toast.error("Please select at least one codex");
      return;
    }
    if (!selectedProviderId || !selectedModel) {
      toast.error("Please select an AI provider and model");
      return;
    }

    setTriggering(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const queueItems = [];
      for (const userId of selectedUserIds) {
        for (const codexId of selectedCodexIds) {
          queueItems.push({
            user_id: userId,
            codex_prompt_id: codexId,
            batch_id: selectedBatchId && selectedBatchId !== "all" ? selectedBatchId : null,
            ai_provider_id: selectedProviderId,
            ai_model: selectedModel,
            triggered_by: user?.id,
            status: "pending",
          });
        }
      }

      const { error } = await supabase
        .from("codex_generation_queue")
        .insert(queueItems);

      if (error) throw error;

      toast.success(`Queued ${queueItems.length} codex generation(s)`);
      
      await supabase.functions.invoke("admin-trigger-codex-generation", {
        body: { queueIds: [] },
      });

      fetchQueue();
      setSelectedCodexIds([]);
    } catch (error: any) {
      console.error("Error triggering generation:", error);
      toast.error(error.message || "Failed to trigger generation");
    } finally {
      setTriggering(false);
    }
  };

  const handleCancelQueueItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("codex_generation_queue")
        .update({ status: "cancelled" })
        .eq("id", itemId)
        .in("status", ["pending", "processing"]);

      if (error) throw error;

      toast.success("Generation cancelled");
      fetchQueue();
    } catch (error: any) {
      console.error("Error cancelling:", error);
      toast.error("Failed to cancel");
    }
  };

  const handleRetryQueueItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("codex_generation_queue")
        .update({ status: "pending", error_message: null, started_at: null })
        .eq("id", itemId);

      if (error) throw error;

      toast.success("Generation queued for retry");
      
      await supabase.functions.invoke("admin-trigger-codex-generation", {
        body: { queueIds: [itemId] },
      });

      fetchQueue();
    } catch (error: any) {
      console.error("Error retrying:", error);
      toast.error("Failed to retry");
    }
  };

  const handleDeleteQueueItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("codex_generation_queue")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      toast.success("Queue item deleted");
      fetchQueue();
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete");
    }
  };

  const handleBulkCancel = async () => {
    if (selectedQueueIds.length === 0) return;
    
    try {
      const { error } = await supabase
        .from("codex_generation_queue")
        .update({ status: "cancelled" })
        .in("id", selectedQueueIds)
        .in("status", ["pending", "processing"]);

      if (error) throw error;

      toast.success(`Cancelled ${selectedQueueIds.length} items`);
      setSelectedQueueIds([]);
      fetchQueue();
    } catch (error: any) {
      toast.error("Failed to cancel items");
    }
  };

  const handleBulkRetry = async () => {
    if (selectedQueueIds.length === 0) return;
    
    try {
      const { error } = await supabase
        .from("codex_generation_queue")
        .update({ status: "pending", error_message: null, started_at: null })
        .in("id", selectedQueueIds);

      if (error) throw error;

      toast.success(`Queued ${selectedQueueIds.length} items for retry`);
      
      await supabase.functions.invoke("admin-trigger-codex-generation", {
        body: { queueIds: selectedQueueIds },
      });

      setSelectedQueueIds([]);
      fetchQueue();
    } catch (error: any) {
      toast.error("Failed to retry items");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQueueIds.length === 0) return;
    
    try {
      const { error } = await supabase
        .from("codex_generation_queue")
        .delete()
        .in("id", selectedQueueIds);

      if (error) throw error;

      toast.success(`Deleted ${selectedQueueIds.length} items`);
      setSelectedQueueIds([]);
      fetchQueue();
    } catch (error: any) {
      toast.error("Failed to delete items");
    }
  };

  const handleRetryAllFailed = async () => {
    setRetrying(true);
    try {
      const failedItems = queue.filter(q => q.status === "failed");
      if (failedItems.length === 0) {
        toast.info("No failed items to retry");
        return;
      }

      const { error } = await supabase
        .from("codex_generation_queue")
        .update({ status: "pending", error_message: null, started_at: null })
        .in("id", failedItems.map(i => i.id));

      if (error) throw error;

      toast.success(`Queued ${failedItems.length} failed items for retry`);
      
      await supabase.functions.invoke("admin-trigger-codex-generation", {
        body: { queueIds: failedItems.map(i => i.id) },
      });

      fetchQueue();
    } catch (error: any) {
      toast.error("Failed to retry items");
    } finally {
      setRetrying(false);
    }
  };

  const getAvailableModels = (): Array<{ id: string; name: string }> => {
    const provider = providers.find(p => p.id === selectedProviderId);
    if (!provider?.available_models) return [];
    
    if (Array.isArray(provider.available_models)) {
      return provider.available_models.map((m: any) => ({
        id: typeof m === 'string' ? m : m.id,
        name: typeof m === 'string' ? m : m.name,
      }));
    }
    return [];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "processing":
        return <Badge variant="default" className="bg-blue-500">Processing</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "cancelled":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get user's latest persona run status
  const getUserStatus = (userId: string): string | null => {
    const userRuns = personaRuns.filter(r => r.user_id === userId);
    if (userRuns.length === 0) return null;
    return userRuns[0].status;
  };

  // Filter users based on all filters
  const getFilteredUsers = () => {
    let filtered = users;

    // Batch filter
    if (selectedBatchId && selectedBatchId !== "all") {
      const batchName = batches.find(b => b.id === selectedBatchId)?.batch_name;
      filtered = filtered.filter(u => u.batch === batchName);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        (u.first_name?.toLowerCase() || "").includes(query) ||
        (u.last_name?.toLowerCase() || "").includes(query) ||
        (u.email?.toLowerCase() || "").includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(u => {
        const status = getUserStatus(u.id);
        if (statusFilter === "no_submission") return status === null;
        if (statusFilter === "pending") return status === "pending";
        if (statusFilter === "generating") return status === "generating";
        if (statusFilter === "completed") return status === "completed";
        if (statusFilter === "failed") return status === "failed";
        return true;
      });
    }

    return filtered;
  };

  // Filter queue items
  const getFilteredQueue = () => {
    if (queueStatusFilter === "all") return queue;
    return queue.filter(q => q.status === queueStatusFilter);
  };

  // Queue statistics
  const queueStats = {
    total: queue.length,
    pending: queue.filter(q => q.status === "pending").length,
    processing: queue.filter(q => q.status === "processing").length,
    completed: queue.filter(q => q.status === "completed").length,
    failed: queue.filter(q => q.status === "failed").length,
    cancelled: queue.filter(q => q.status === "cancelled").length,
  };

  const filteredUsers = getFilteredUsers();
  const filteredQueue = getFilteredQueue();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Codex Generation Control</h3>
        <p className="text-sm text-muted-foreground">
          Manage user category assignments, trigger codex generation, and monitor queue
        </p>
      </div>

      <Tabs defaultValue="assignments">
        <TabsList>
          <TabsTrigger value="assignments">Category Assignments</TabsTrigger>
          <TabsTrigger value="trigger">Trigger Generation</TabsTrigger>
          <TabsTrigger value="queue">
            Generation Queue
            {queueStats.pending + queueStats.processing > 0 && (
              <Badge variant="secondary" className="ml-2">
                {queueStats.pending + queueStats.processing}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Category Assignments Tab */}
        <TabsContent value="assignments">
          <UserCategoryAssignments />
        </TabsContent>

        {/* Trigger Generation Tab */}
        <TabsContent value="trigger" className="space-y-6">
          {/* Step 1: Select Users */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Step 1: Select Users</CardTitle>
              <CardDescription>Filter and select users for codex generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.batch_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="no_submission">No Questionnaire</SelectItem>
                    <SelectItem value="pending">Pending Generation</SelectItem>
                    <SelectItem value="generating">Generating</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Badge variant="outline">
                  <Users className="h-3 w-3 mr-1" />
                  {selectedUserIds.length} of {filteredUsers.length} users selected
                </Badge>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUserIds(filteredUsers.map(u => u.id))}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUserIds([])}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUserIds(filteredUsers.map(u => u.id));
                            } else {
                              setSelectedUserIds([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const status = getUserStatus(user.id);
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedUserIds.includes(user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedUserIds(prev => [...prev, user.id]);
                                } else {
                                  setSelectedUserIds(prev => prev.filter(id => id !== user.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {user.first_name || user.last_name
                                  ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                                  : "No name"}
                              </div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.batch ? (
                              <Badge variant="outline">{user.batch}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {status === null ? (
                              <Badge variant="outline" className="text-muted-foreground">No submission</Badge>
                            ) : status === "pending" ? (
                              <Badge variant="secondary">Pending</Badge>
                            ) : status === "generating" ? (
                              <Badge className="bg-blue-500">Generating</Badge>
                            ) : status === "completed" ? (
                              <Badge className="bg-green-500">Completed</Badge>
                            ) : status === "failed" ? (
                              <Badge variant="destructive">Failed</Badge>
                            ) : (
                              <Badge variant="secondary">{status}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Select Codexes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Step 2: Select Codexes</CardTitle>
              <CardDescription>Choose which codexes to generate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {codexPrompts.map((codex) => (
                  <div
                    key={codex.id}
                    className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                      selectedCodexIds.includes(codex.id)
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => {
                      if (selectedCodexIds.includes(codex.id)) {
                        setSelectedCodexIds(prev => prev.filter(id => id !== codex.id));
                      } else {
                        setSelectedCodexIds(prev => [...prev, codex.id]);
                      }
                    }}
                  >
                    <Checkbox checked={selectedCodexIds.includes(codex.id)} />
                    <span className="text-sm">{codex.codex_name}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCodexIds(codexPrompts.map(c => c.id))}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCodexIds([])}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Select AI Provider */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Step 3: Select AI Provider</CardTitle>
              <CardDescription>Choose the AI provider and model for generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Provider</label>
                  <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Model</label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableModels().map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trigger Button */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleTriggerGeneration}
            disabled={triggering || selectedUserIds.length === 0 || selectedCodexIds.length === 0}
          >
            {triggering ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Triggering...
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                Generate {selectedCodexIds.length} Codex(es) for {selectedUserIds.length} User(s)
              </>
            )}
          </Button>
        </TabsContent>

        {/* Queue Tab */}
        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Generation Queue</CardTitle>
                  <CardDescription>Monitor and manage codex generation jobs</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleRetryAllFailed} disabled={retrying || queueStats.failed === 0}>
                    {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                    Retry All Failed ({queueStats.failed})
                  </Button>
                  <Button variant="outline" size="sm" onClick={fetchQueue}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Queue Stats */}
              <div className="flex gap-4 flex-wrap">
                <Badge variant="secondary">Total: {queueStats.total}</Badge>
                <Badge variant="outline">Pending: {queueStats.pending}</Badge>
                <Badge className="bg-blue-500">Processing: {queueStats.processing}</Badge>
                <Badge className="bg-green-500">Completed: {queueStats.completed}</Badge>
                <Badge variant="destructive">Failed: {queueStats.failed}</Badge>
                <Badge variant="outline">Cancelled: {queueStats.cancelled}</Badge>
              </div>

              {/* Filter and Bulk Actions */}
              <div className="flex items-center justify-between gap-4">
                <Select value={queueStatusFilter} onValueChange={setQueueStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                {selectedQueueIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedQueueIds.length} selected
                    </span>
                    <Button variant="outline" size="sm" onClick={handleBulkCancel}>
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleBulkRetry}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {selectedQueueIds.length} items?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedQueueIds.length === filteredQueue.length && filteredQueue.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedQueueIds(filteredQueue.map(q => q.id));
                          } else {
                            setSelectedQueueIds([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Codex</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQueue.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No items in queue
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQueue.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedQueueIds.includes(item.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedQueueIds(prev => [...prev, item.id]);
                              } else {
                                setSelectedQueueIds(prev => prev.filter(id => id !== item.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.user_name}</TableCell>
                        <TableCell>{item.codex_name}</TableCell>
                        <TableCell>{item.ai_model || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(item.status)}
                            {item.error_message && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setErrorDetailsItem(item)}
                              >
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(item.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {(item.status === "pending" || item.status === "processing") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCancelQueueItem(item.id)}
                                className="text-destructive"
                                title="Cancel"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {item.status === "failed" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRetryQueueItem(item.id)}
                                title="Retry"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                            {(item.status === "completed" || item.status === "cancelled" || item.status === "failed") && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" title="Delete">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete this item?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteQueueItem(item.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Details Dialog */}
      <Dialog open={!!errorDetailsItem} onOpenChange={() => setErrorDetailsItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
            <DialogDescription>
              Error for {errorDetailsItem?.user_name} - {errorDetailsItem?.codex_name}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 p-4 rounded-lg">
            <pre className="text-sm whitespace-pre-wrap text-destructive">
              {errorDetailsItem?.error_message || "No error message"}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
