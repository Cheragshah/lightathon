import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  available_models: AIModel[];
  hasKey?: boolean;
}

interface AIModelSelectorProps {
  providerId?: string;
  modelName?: string;
  onProviderChange: (providerId: string) => void;
  onModelChange: (modelName: string) => void;
  label?: string;
  disabled?: boolean;
}

export const AIModelSelector = ({
  providerId,
  modelName,
  onProviderChange,
  onModelChange,
  label = "AI Model",
  disabled = false,
}: AIModelSelectorProps) => {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    try {
      // Load providers with keys
      const { data: providersData } = await supabase
        .from("ai_providers")
        .select("id, provider_code, name, available_models")
        .eq("is_active", true)
        .order("name");

      const { data: keysData } = await supabase
        .from("ai_provider_keys")
        .select("provider_id")
        .eq("is_active", true);

      const keysSet = new Set(keysData?.map(k => k.provider_id) || []);

      setProviders(
        (providersData || []).map(p => ({
          ...p,
          available_models: (p.available_models as unknown) as AIModel[],
          hasKey: keysSet.has(p.id),
        }))
      );
    } catch (error) {
      console.error("Error loading providers:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedProvider = providers.find(p => p.id === providerId);

  // Build options grouped by provider
  const options = providers.flatMap(provider => 
    (provider.available_models || []).map(model => ({
      providerId: provider.id,
      providerName: provider.name,
      modelId: model.id,
      modelName: model.name,
      contextWindow: model.context_window,
      supportsVision: model.supports_vision,
      hasKey: provider.hasKey,
    }))
  );

  const currentValue = providerId && modelName ? `${providerId}:${modelName}` : "";

  const handleChange = (value: string) => {
    const [newProviderId, newModelName] = value.split(":");
    onProviderChange(newProviderId);
    onModelChange(newModelName);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="h-10 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={currentValue}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select an AI model">
            {selectedProvider && modelName && (
              <span>
                {selectedProvider.name} / {options.find(o => o.modelId === modelName)?.modelName || modelName}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {providers.map(provider => (
            <div key={provider.id}>
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground flex items-center gap-2">
                {provider.name}
                {!provider.hasKey && (
                  <Badge variant="outline" className="text-xs">No API key</Badge>
                )}
              </div>
              {(provider.available_models || []).map(model => (
                <SelectItem 
                  key={`${provider.id}:${model.id}`} 
                  value={`${provider.id}:${model.id}`}
                  disabled={!provider.hasKey}
                >
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
            </div>
          ))}
        </SelectContent>
      </Select>
      {!providerId && (
        <p className="text-sm text-muted-foreground">
          Uses default (OpenAI GPT-4o-mini) if not selected
        </p>
      )}
    </div>
  );
};
