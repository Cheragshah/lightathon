import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, IndianRupee, Save, RotateCcw, Target } from "lucide-react";

interface PricingBracket {
  min: number;
  max: number;
}

interface PricingBrackets {
  L1: PricingBracket;
  L2: PricingBracket;
  L3: PricingBracket;
}

interface CodexPrompt {
  id: string;
  codex_name: string;
  use_pricing_brackets: boolean;
}

const DEFAULT_BRACKETS: PricingBrackets = {
  L1: { min: 4000, max: 19999 },
  L2: { min: 22500, max: 56500 },
  L3: { min: 89999, max: 325000 },
};

export function PricingBracketsManager() {
  const [brackets, setBrackets] = useState<PricingBrackets>(DEFAULT_BRACKETS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [codexes, setCodexes] = useState<CodexPrompt[]>([]);
  const [selectedCodexId, setSelectedCodexId] = useState<string>("");
  const [savingCodex, setSavingCodex] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load brackets and codexes in parallel
      const [bracketsResult, codexesResult] = await Promise.all([
        supabase
          .from("system_settings")
          .select("setting_value")
          .eq("setting_key", "pricing_brackets")
          .maybeSingle(),
        supabase
          .from("codex_prompts")
          .select("id, codex_name, use_pricing_brackets")
          .eq("is_active", true)
          .order("display_order", { ascending: true })
      ]);

      // Handle brackets
      if (bracketsResult.error) throw bracketsResult.error;
      if (bracketsResult.data?.setting_value) {
        let value = bracketsResult.data.setting_value;
        if (typeof value === "string") {
          try {
            value = JSON.parse(value);
          } catch {
            // Use as-is if parsing fails
          }
        }
        if (
          typeof value === "object" &&
          value !== null &&
          "L1" in value &&
          "L2" in value &&
          "L3" in value
        ) {
          setBrackets(value as unknown as PricingBrackets);
        }
      }

      // Handle codexes
      if (codexesResult.error) throw codexesResult.error;
      const codexList = (codexesResult.data || []) as CodexPrompt[];
      setCodexes(codexList);

      // Find the currently selected codex (one with use_pricing_brackets = true)
      const selectedCodex = codexList.find(c => c.use_pricing_brackets);
      if (selectedCodex) {
        setSelectedCodexId(selectedCodex.id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load pricing settings");
    } finally {
      setLoading(false);
    }
  };

  const handleCodexChange = async (codexId: string) => {
    setSavingCodex(true);
    try {
      // First, set all codexes to use_pricing_brackets = false
      const { error: resetError } = await supabase
        .from("codex_prompts")
        .update({ use_pricing_brackets: false })
        .eq("is_active", true);

      if (resetError) throw resetError;

      // Then, if a codex is selected, set it to true
      if (codexId && codexId !== "none") {
        const { error: updateError } = await supabase
          .from("codex_prompts")
          .update({ use_pricing_brackets: true })
          .eq("id", codexId);

        if (updateError) throw updateError;
      }

      setSelectedCodexId(codexId === "none" ? "" : codexId);
      toast.success(codexId === "none" 
        ? "Pricing brackets disabled for all codexes" 
        : "Pricing brackets codex updated"
      );

      // Reload codexes to reflect changes
      const { data: updatedCodexes } = await supabase
        .from("codex_prompts")
        .select("id, codex_name, use_pricing_brackets")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (updatedCodexes) {
        setCodexes(updatedCodexes as CodexPrompt[]);
      }
    } catch (error) {
      console.error("Error updating codex:", error);
      toast.error("Failed to update codex selection");
    } finally {
      setSavingCodex(false);
    }
  };

  const handleSave = async () => {
    // Validate brackets
    if (brackets.L1.min >= brackets.L1.max) {
      toast.error("L1 minimum must be less than maximum");
      return;
    }
    if (brackets.L2.min >= brackets.L2.max) {
      toast.error("L2 minimum must be less than maximum");
      return;
    }
    if (brackets.L3.min >= brackets.L3.max) {
      toast.error("L3 minimum must be less than maximum");
      return;
    }
    if (brackets.L1.max >= brackets.L2.min) {
      toast.error("L1 maximum should be less than L2 minimum");
      return;
    }
    if (brackets.L2.max >= brackets.L3.min) {
      toast.error("L2 maximum should be less than L3 minimum");
      return;
    }

    setSaving(true);
    try {
      // First check if the setting exists
      const { data: existing } = await supabase
        .from("system_settings")
        .select("id")
        .eq("setting_key", "pricing_brackets")
        .maybeSingle();

      const bracketsJson = JSON.parse(JSON.stringify(brackets));

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("system_settings")
          .update({
            setting_value: bracketsJson,
            description: "L1, L2, L3 pricing brackets for offer strategy",
            updated_at: new Date().toISOString(),
          })
          .eq("setting_key", "pricing_brackets");

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("system_settings")
          .insert([{
            setting_key: "pricing_brackets",
            setting_value: bracketsJson,
            description: "L1, L2, L3 pricing brackets for offer strategy",
          }]);

        if (error) throw error;
      }

      toast.success("Pricing brackets saved successfully");
    } catch (error) {
      console.error("Error saving pricing brackets:", error);
      toast.error("Failed to save pricing brackets");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setBrackets(DEFAULT_BRACKETS);
    toast.info("Reset to default values (not saved yet)");
  };

  const updateBracket = (tier: keyof PricingBrackets, field: "min" | "max", value: string) => {
    const numValue = parseInt(value.replace(/,/g, ""), 10) || 0;
    setBrackets((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]: numValue,
      },
    }));
  };

  const formatIndianPrice = (num: number) => {
    return num.toLocaleString("en-IN");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Codex Selector */}
      <div className="space-y-3 p-4 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          <span className="font-semibold text-amber-700 dark:text-amber-400">Apply to Codex</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Select which codex should use the L1, L2, L3 pricing brackets. Only the selected codex will have dynamic pricing injected.
        </p>
        <Select 
          value={selectedCodexId || "none"} 
          onValueChange={handleCodexChange}
          disabled={savingCodex}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a codex..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">None (Disabled)</span>
            </SelectItem>
            {codexes.map((codex) => (
              <SelectItem key={codex.id} value={codex.id}>
                {codex.codex_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {savingCodex && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Updating...
          </div>
        )}
      </div>

      {/* L1 Bracket */}
      <div className="space-y-3 p-4 rounded-lg border bg-green-50/50 dark:bg-green-950/20">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-green-700 dark:text-green-400">L1</span>
          <span className="text-sm text-muted-foreground">Foundation / Entry Level</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="l1-min">Minimum (₹)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="l1-min"
                type="text"
                value={formatIndianPrice(brackets.L1.min)}
                onChange={(e) => updateBracket("L1", "min", e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="l1-max">Maximum (₹)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="l1-max"
                type="text"
                value={formatIndianPrice(brackets.L1.max)}
                onChange={(e) => updateBracket("L1", "max", e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* L2 Bracket */}
      <div className="space-y-3 p-4 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-blue-700 dark:text-blue-400">L2</span>
          <span className="text-sm text-muted-foreground">Growth / Mid-tier</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="l2-min">Minimum (₹)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="l2-min"
                type="text"
                value={formatIndianPrice(brackets.L2.min)}
                onChange={(e) => updateBracket("L2", "min", e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="l2-max">Maximum (₹)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="l2-max"
                type="text"
                value={formatIndianPrice(brackets.L2.max)}
                onChange={(e) => updateBracket("L2", "max", e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* L3 Bracket */}
      <div className="space-y-3 p-4 rounded-lg border bg-purple-50/50 dark:bg-purple-950/20">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-purple-700 dark:text-purple-400">L3</span>
          <span className="text-sm text-muted-foreground">Premium / Transformation</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="l3-min">Minimum (₹)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="l3-min"
                type="text"
                value={formatIndianPrice(brackets.L3.min)}
                onChange={(e) => updateBracket("L3", "min", e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="l3-max">Maximum (₹)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="l3-max"
                type="text"
                value={formatIndianPrice(brackets.L3.max)}
                onChange={(e) => updateBracket("L3", "max", e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={handleReset} disabled={saving}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Brackets
        </Button>
      </div>

      {/* Info Box */}
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <p className="font-medium mb-1">How it works:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Select a codex above to enable pricing brackets for that codex only</li>
          <li>Each user gets unique, randomized prices within these brackets</li>
          <li>Prices are automatically rounded to appealing points (e.g., ₹9,999, ₹24,999)</li>
          <li>Other codexes run with their standard prompts without pricing injection</li>
        </ul>
      </div>
    </div>
  );
}