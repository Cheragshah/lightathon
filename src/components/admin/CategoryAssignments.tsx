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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, FolderOpen } from "lucide-react";

interface Batch {
  id: string;
  batch_name: string;
  is_active: boolean;
}

interface Category {
  id: string;
  category_name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

interface Assignment {
  id: string;
  batch_id: string;
  category_id: string;
  is_enabled: boolean;
}

export const CategoryAssignments = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      fetchAssignments(selectedBatchId);
    }
  }, [selectedBatchId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch batches
      const { data: batchesData, error: batchesError } = await supabase
        .from("batches")
        .select("id, batch_name, is_active")
        .eq("is_active", true)
        .order("batch_name");

      if (batchesError) throw batchesError;

      // Fetch all categories (including inactive for admin view)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("questionnaire_categories")
        .select("*")
        .order("display_order");

      if (categoriesError) throw categoriesError;

      setBatches(batchesData || []);
      setCategories(categoriesData || []);

      // Auto-select first batch if available
      if (batchesData && batchesData.length > 0 && !selectedBatchId) {
        setSelectedBatchId(batchesData[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async (batchId: string) => {
    try {
      const { data, error } = await supabase
        .from("questionnaire_assignments")
        .select("*")
        .eq("batch_id", batchId);

      if (error) throw error;

      setAssignments(data || []);
    } catch (error: any) {
      console.error("Error fetching assignments:", error);
      toast.error("Failed to load assignments");
    }
  };

  const isCategoryEnabled = (categoryId: string): boolean => {
    const assignment = assignments.find(a => a.category_id === categoryId);
    return assignment?.is_enabled ?? false;
  };

  const handleToggleCategory = async (categoryId: string) => {
    if (!selectedBatchId) return;

    const currentlyEnabled = isCategoryEnabled(categoryId);
    setSaving(categoryId);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (currentlyEnabled) {
        // Disable - update existing assignment
        const { error } = await supabase
          .from("questionnaire_assignments")
          .update({ is_enabled: false })
          .eq("batch_id", selectedBatchId)
          .eq("category_id", categoryId);

        if (error) throw error;
      } else {
        // Enable - upsert assignment
        const { error } = await supabase
          .from("questionnaire_assignments")
          .upsert({
            batch_id: selectedBatchId,
            category_id: categoryId,
            is_enabled: true,
            enabled_by: user?.id,
            enabled_at: new Date().toISOString(),
          }, {
            onConflict: "batch_id,category_id",
          });

        if (error) throw error;
      }

      toast.success(`Category ${currentlyEnabled ? "disabled" : "enabled"}`);
      fetchAssignments(selectedBatchId);
    } catch (error: any) {
      console.error("Error toggling category:", error);
      toast.error("Failed to update category");
    } finally {
      setSaving(null);
    }
  };

  const handleEnableAll = async () => {
    if (!selectedBatchId) return;

    setSaving("all");
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Upsert all active categories
      const upsertData = categories
        .filter(c => c.is_active)
        .map(c => ({
          batch_id: selectedBatchId,
          category_id: c.id,
          is_enabled: true,
          enabled_by: user?.id,
          enabled_at: new Date().toISOString(),
        }));

      const { error } = await supabase
        .from("questionnaire_assignments")
        .upsert(upsertData, { onConflict: "batch_id,category_id" });

      if (error) throw error;

      toast.success("All categories enabled");
      fetchAssignments(selectedBatchId);
    } catch (error: any) {
      console.error("Error enabling all:", error);
      toast.error("Failed to enable all categories");
    } finally {
      setSaving(null);
    }
  };

  const handleDisableAll = async () => {
    if (!selectedBatchId) return;

    setSaving("all");
    try {
      const { error } = await supabase
        .from("questionnaire_assignments")
        .update({ is_enabled: false })
        .eq("batch_id", selectedBatchId);

      if (error) throw error;

      toast.success("All categories disabled");
      fetchAssignments(selectedBatchId);
    } catch (error: any) {
      console.error("Error disabling all:", error);
      toast.error("Failed to disable all categories");
    } finally {
      setSaving(null);
    }
  };

  const enabledCount = categories.filter(c => isCategoryEnabled(c.id)).length;

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
        <h3 className="text-lg font-semibold">Category Assignments</h3>
        <p className="text-sm text-muted-foreground">
          Enable questionnaire categories for each batch. Only enabled categories will be shown to users in that batch.
        </p>
      </div>

      {batches.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No batches created yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create a batch first to assign questionnaire categories.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Batch Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select Batch</CardTitle>
              <CardDescription>Choose a batch to configure its questionnaire categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.batch_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBatchId && (
                  <Badge variant="outline">
                    {enabledCount} of {categories.length} categories enabled
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Categories Table */}
          {selectedBatchId && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Questionnaire Categories</CardTitle>
                    <CardDescription>
                      Toggle categories to enable/disable them for the selected batch
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisableAll}
                      disabled={saving === "all"}
                    >
                      Disable All
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleEnableAll}
                      disabled={saving === "all"}
                    >
                      Enable All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Category Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category Status</TableHead>
                      <TableHead className="text-right">Enabled for Batch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No categories found
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell>{category.display_order}</TableCell>
                          <TableCell className="font-medium">{category.category_name}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {category.description || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={category.is_active ? "default" : "secondary"}>
                              {category.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Switch
                              checked={isCategoryEnabled(category.id)}
                              onCheckedChange={() => handleToggleCategory(category.id)}
                              disabled={saving === category.id || saving === "all" || !category.is_active}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
