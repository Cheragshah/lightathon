import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, Play, XCircle, RefreshCw, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [codexPrompts, setCodexPrompts] = useState<CodexPrompt[]>([]);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedCodexIds, setSelectedCodexIds] = useState<string[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchQueue, 10000); // Refresh queue every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      const batchName = batches.find(b => b.id === selectedBatchId)?.batch_name;
      const batchUsers = users.filter(u => u.batch === batchName);
      setSelectedUserIds(batchUsers.map(u => u.id));
    } else {
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

      const [batchesRes, usersRes, codexRes, providersRes] = await Promise.all([
        supabase.from("batches").select("id, batch_name").eq("is_active", true).order("batch_name"),
        supabase.from("profiles").select("id, first_name, last_name, email, batch"),
        supabase.from("codex_prompts").select("id, codex_name, display_order, is_active").eq("is_active", true).order("display_order"),
        supabase.from("ai_providers").select("id, name, is_active, available_models, default_model").eq("is_active", true),
      ]);

      if (batchesRes.error) throw batchesRes.error;
      if (usersRes.error) throw usersRes.error;
      if (codexRes.error) throw codexRes.error;
      if (providersRes.error) throw providersRes.error;

      setBatches(batchesRes.data || []);
      setUsers(usersRes.data || []);
      setCodexPrompts(codexRes.data || []);
      setProviders(providersRes.data || []);

      // Auto-select first provider
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

      // Enrich with user and codex names
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

      // Create queue items for each user and codex combination
      const queueItems = [];
      for (const userId of selectedUserIds) {
        for (const codexId of selectedCodexIds) {
          queueItems.push({
            user_id: userId,
            codex_prompt_id: codexId,
            batch_id: selectedBatchId || null,
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
      
      // Trigger the edge function to process queue
      await supabase.functions.invoke("admin-trigger-codex-generation", {
        body: { queueIds: [] }, // Process all pending
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
        .eq("status", "pending");

      if (error) throw error;

      toast.success("Generation cancelled");
      fetchQueue();
    } catch (error: any) {
      console.error("Error cancelling:", error);
      toast.error("Failed to cancel");
    }
  };

  const getAvailableModels = (): Array<{ id: string; name: string }> => {
    const provider = providers.find(p => p.id === selectedProviderId);
    if (!provider?.available_models) return [];
    
    if (Array.isArray(provider.available_models)) {
      // Models are objects with id, name, context_window, supports_vision
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

  const filteredUsers = selectedBatchId
    ? users.filter(u => u.batch === batches.find(b => b.id === selectedBatchId)?.batch_name)
    : users;

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
          Manually trigger codex generation for selected users and batches
        </p>
      </div>

      <Tabs defaultValue="trigger">
        <TabsList>
          <TabsTrigger value="trigger">Trigger Generation</TabsTrigger>
          <TabsTrigger value="queue">Generation Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="trigger" className="space-y-6">
          {/* Step 1: Select Users */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Step 1: Select Users</CardTitle>
              <CardDescription>Choose a batch or select individual users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a batch (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users (No Batch Filter)</SelectItem>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.batch_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline">
                  <Users className="h-3 w-3 mr-1" />
                  {selectedUserIds.length} users selected
                </Badge>
              </div>

              <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded">
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
                    <span className="text-sm">
                      {user.first_name || user.last_name
                        ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                        : user.email || "Unnamed User"}
                    </span>
                    {user.batch && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {user.batch}
                      </Badge>
                    )}
                  </div>
                ))}
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

        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Generation Queue</CardTitle>
                  <CardDescription>Monitor and manage codex generation jobs</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchQueue}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Codex</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No items in queue
                      </TableCell>
                    </TableRow>
                  ) : (
                    queue.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.user_name}</TableCell>
                        <TableCell>{item.codex_name}</TableCell>
                        <TableCell>{item.ai_model || "-"}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          {new Date(item.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancelQueueItem(item.id)}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
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
    </div>
  );
};
