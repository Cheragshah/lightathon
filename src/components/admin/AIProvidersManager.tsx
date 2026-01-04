import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Key,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  TestTube2,
  Save,
  Star,
  RefreshCw,
  Check
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface AIModel {
  id: string;
  name: string;
  context_window: number;
  supports_vision: boolean;
}

interface AIProvider {
  id: string;
  provider_code: string;
  name: string;
  base_url: string;
  is_active: boolean;
  is_default: boolean;
  default_model: string | null;
  available_models: AIModel[];
  hasKey?: boolean;
  testStatus?: string;
  lastTestedAt?: string;
}

export const AIProvidersManager = () => {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [savingModel, setSavingModel] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [settingDefault, setSettingDefault] = useState<Record<string, boolean>>({});
  const [fetchingModels, setFetchingModels] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    try {
      // Load providers
      const { data: providersData, error: providersError } = await supabase
        .from("ai_providers")
        .select("*")
        .order("name");

      if (providersError) throw providersError;

      // Load existing keys status
      const { data: keysData } = await supabase
        .from("ai_provider_keys")
        .select("provider_id, test_status, last_tested_at, is_active");

      const keysMap = new Map(
        keysData?.map(k => [k.provider_id, k]) || []
      );

      const enrichedProviders = (providersData || []).map(p => ({
        ...p,
        available_models: (p.available_models as unknown) as AIModel[],
        hasKey: keysMap.has(p.id),
        testStatus: keysMap.get(p.id)?.test_status,
        lastTestedAt: keysMap.get(p.id)?.last_tested_at,
      }));

      setProviders(enrichedProviders);

      // Set selected models - use saved default_model or first available
      const defaultModels: Record<string, string> = {};
      enrichedProviders.forEach(p => {
        if (p.default_model) {
          defaultModels[p.id] = p.default_model;
        } else if (p.available_models?.length > 0) {
          defaultModels[p.id] = p.available_models[0].id;
        }
      });
      setSelectedModels(defaultModels);
    } catch (error: any) {
      toast({
        title: "Error loading providers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKey = async (providerId: string) => {
    const apiKey = apiKeys[providerId];
    if (!apiKey?.trim()) {
      toast({
        title: "Validation error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    setSaving(prev => ({ ...prev, [providerId]: true }));
    try {
      // Direct DB access since Edge Functions are not deployed
      // 1. Check if key exists
      const { data: existingKey } = await supabase
        .from("ai_provider_keys")
        .select("id")
        .eq("provider_id", providerId)
        .single();

      let error;

      if (existingKey) {
        // 2. Update existing key
        const { error: updateError } = await supabase
          .from("ai_provider_keys")
          .update({
            api_key_encrypted: apiKey.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingKey.id);
        error = updateError;
      } else {
        // 3. Insert new key
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication required");

        const { error: insertError } = await supabase
          .from("ai_provider_keys")
          .insert({
            provider_id: providerId,
            api_key_encrypted: apiKey.trim(),
            created_by: user.id,
          });
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "API key saved",
        description: "The API key has been saved successfully (Direct DB)",
      });

      // Clear the input and refresh
      setApiKeys(prev => ({ ...prev, [providerId]: "" }));
      await loadProviders();
    } catch (error: any) {
      toast({
        title: "Error saving key",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const handleSaveModel = async (providerId: string) => {
    const model = selectedModels[providerId];
    if (!model) {
      toast({
        title: "No model selected",
        description: "Please select a model first",
        variant: "destructive",
      });
      return;
    }

    setSavingModel(prev => ({ ...prev, [providerId]: true }));
    try {
      const { error } = await supabase
        .from("ai_providers")
        .update({ default_model: model })
        .eq("id", providerId);

      if (error) throw error;

      toast({
        title: "Model saved",
        description: "Default model has been saved for this provider",
      });

      await loadProviders();
    } catch (error: any) {
      toast({
        title: "Error saving model",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingModel(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const handleTestKey = async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    const apiKey = apiKeys[providerId];
    if (!apiKey?.trim() && !provider.hasKey) {
      toast({
        title: "No API key",
        description: "Please enter an API key first",
        variant: "destructive",
      });
      return;
    }

    setTesting(prev => ({ ...prev, [providerId]: true }));
    try {
      // Get existing key if not provided
      let keyToTest = apiKey?.trim();
      if (!keyToTest && provider.hasKey) {
        const { data: keyData } = await supabase
          .from("ai_provider_keys")
          .select("api_key_encrypted")
          .eq("provider_id", providerId)
          .single();
        keyToTest = keyData?.api_key_encrypted;
      }

      const { data, error } = await supabase.functions.invoke("test-ai-provider", {
        body: {
          providerId,
          apiKey: keyToTest,
          model: selectedModels[providerId] || provider.available_models[0]?.id,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Test successful",
          description: `Response: "${data.message?.substring(0, 100)}..."`,
        });
      } else {
        // Provide helpful error messages for common issues
        let errorMessage = data?.error || "Unknown error";
        if (errorMessage.includes("402") || errorMessage.includes("insufficient") || errorMessage.includes("balance")) {
          errorMessage = "Billing issue: Your API account has insufficient funds. Please add credits to your API provider account.";
        } else if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("rate")) {
          errorMessage = "Rate limit or quota exceeded: Your API key has hit its usage limit. Please check your API provider's billing/quota settings.";
        } else if (errorMessage.includes("401") || errorMessage.includes("invalid") || errorMessage.includes("unauthorized")) {
          errorMessage = "Invalid API key: Please check that your API key is correct and active.";
        }

        toast({
          title: "Test failed",
          description: errorMessage,
          variant: "destructive",
        });
      }

      await loadProviders();
    } catch (error: any) {
      let errorMessage = error.message;
      if (errorMessage.includes("402")) {
        errorMessage = "Billing issue: Your API account has insufficient funds.";
      } else if (errorMessage.includes("429")) {
        errorMessage = "Rate limit exceeded: Please wait and try again.";
      } else if (errorMessage.includes("Failed to send a request") || errorMessage.includes("Edge Function")) {
        errorMessage = "Backend testing service unavailable (Edge Functions offline). Your key is saved locally.";
      }

      toast({
        title: "Test failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTesting(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const handleSetDefault = async (providerId: string) => {
    setSettingDefault(prev => ({ ...prev, [providerId]: true }));
    try {
      const { error } = await supabase
        .from("ai_providers")
        .update({ is_default: true })
        .eq("id", providerId);

      if (error) throw error;

      toast({
        title: "Default provider set",
        description: "This provider will be used for AI optimization features",
      });

      await loadProviders();
    } catch (error: any) {
      toast({
        title: "Error setting default",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSettingDefault(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const handleFetchModels = async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider?.hasKey) {
      toast({
        title: "No API key",
        description: "Please save an API key first to fetch models",
        variant: "destructive",
      });
      return;
    }

    setFetchingModels(prev => ({ ...prev, [providerId]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("fetch-provider-models", {
        body: { providerId },
      });

      if (error) throw error;

      if (data?.success && data?.models?.length > 0) {
        toast({
          title: "Models updated",
          description: `Loaded ${data.models.length} curated models`,
        });
        await loadProviders();
      } else {
        toast({
          title: "No models found",
          description: data?.error || "Could not fetch models from provider",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error fetching models",
        description: error.message.includes("Edge Function")
          ? "Model fetching unavailable (Edge Functions offline). Using default model list."
          : error.message,
        variant: "destructive",
      });
    } finally {
      setFetchingModels(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const getStatusBadge = (provider: AIProvider) => {
    if (!provider.hasKey) {
      return <Badge variant="outline" className="gap-1"><AlertCircle className="h-3 w-3" /> Not configured</Badge>;
    }
    if (provider.testStatus === "success") {
      return <Badge className="gap-1 bg-green-500 hover:bg-green-600"><CheckCircle2 className="h-3 w-3" /> Working</Badge>;
    }
    if (provider.testStatus === "failed") {
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" /> Untested</Badge>;
  };

  const isModelSaved = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    return provider?.default_model === selectedModels[providerId];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const sortedProviders = providers;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          AI Provider Configuration
        </CardTitle>
        <CardDescription>
          Configure API keys for multiple AI providers. Set one as default for optimization features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System Default Indicator */}


        <Accordion type="multiple" className="w-full">
          {sortedProviders.map((provider) => (
            <AccordionItem key={provider.id} value={provider.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex flex-1 items-center justify-between pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{provider.name}</span>
                    {provider.is_default && (
                      <Badge variant="default" className="gap-1 bg-yellow-500 hover:bg-yellow-600">
                        <Star className="h-3 w-3" /> System Default
                      </Badge>
                    )}
                  </div>
                  {getStatusBadge(provider)}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {/* Default Provider Toggle - only for non-Lovable providers */}
                  {provider.hasKey && !provider.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(provider.id)}
                      disabled={settingDefault[provider.id]}
                    >
                      {settingDefault[provider.id] ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Setting...
                        </>
                      ) : (
                        <>
                          <Star className="h-4 w-4 mr-2" />
                          Set as Default Provider
                        </>
                      )}
                    </Button>
                  )}
                  {provider.is_default && (
                    <p className="text-sm text-muted-foreground">
                      ⭐ This provider is used as the system default.
                    </p>
                  )}

                  {/* Available Models with Save Button */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Default Model ({provider.available_models?.length || 0} available)</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFetchModels(provider.id)}
                        disabled={fetchingModels[provider.id] || !provider.hasKey}
                      >
                        {fetchingModels[provider.id] ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Fetching...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh Models
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Select
                        value={selectedModels[provider.id] || ""}
                        onValueChange={(value) =>
                          setSelectedModels(prev => ({ ...prev, [provider.id]: value }))
                        }
                      >
                        <SelectTrigger className="w-full max-w-md">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {provider.available_models?.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              <div className="flex items-center gap-2">
                                <span>{model.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({(model.context_window / 1000).toFixed(0)}K)
                                </span>
                                {model.supports_vision && (
                                  <Badge variant="outline" className="text-xs">Vision</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant={isModelSaved(provider.id) ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleSaveModel(provider.id)}
                        disabled={savingModel[provider.id] || isModelSaved(provider.id)}
                      >
                        {savingModel[provider.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isModelSaved(provider.id) ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Saved
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                    {provider.default_model && (
                      <p className="text-xs text-muted-foreground">
                        Current default: {provider.available_models?.find(m => m.id === provider.default_model)?.name || provider.default_model}
                      </p>
                    )}
                  </div>

                  {/* API Key Input */}
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    {provider.hasKey && (
                      <p className="text-sm text-muted-foreground">
                        API key is configured. Enter a new key to update it.
                        {provider.lastTestedAt && (
                          <span className="ml-2">
                            Last tested: {new Date(provider.lastTestedAt).toLocaleString()}
                          </span>
                        )}
                      </p>
                    )}
                    <div className="flex gap-2 max-w-md">
                      <div className="relative flex-1">
                        <Input
                          type={showKeys[provider.id] ? "text" : "password"}
                          value={apiKeys[provider.id] || ""}
                          onChange={(e) =>
                            setApiKeys(prev => ({ ...prev, [provider.id]: e.target.value }))
                          }
                          placeholder={provider.hasKey ? "Enter new key to update" : "Enter API key"}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowKeys(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showKeys[provider.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSaveKey(provider.id)}
                      disabled={saving[provider.id] || !apiKeys[provider.id]?.trim()}
                      size="sm"
                    >
                      {saving[provider.id] ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Key
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleTestKey(provider.id)}
                      disabled={testing[provider.id] || (!apiKeys[provider.id]?.trim() && !provider.hasKey)}
                      size="sm"
                    >
                      {testing[provider.id] ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <TestTube2 className="h-4 w-4 mr-2" />
                          Test Connection
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent >
    </Card >
  );
};
