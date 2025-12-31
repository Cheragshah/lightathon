import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Category {
  id: string;
  category_name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

interface EditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  onSave: () => void;
  maxDisplayOrder: number;
}

export function EditCategoryDialog({
  open,
  onOpenChange,
  category,
  onSave,
  maxDisplayOrder,
}: EditCategoryDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    category_name: "",
    description: "",
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    if (open) {
      if (category) {
        setFormData({
          category_name: category.category_name,
          description: category.description || "",
          display_order: category.display_order,
          is_active: category.is_active,
        });
      } else {
        setFormData({
          category_name: "",
          description: "",
          display_order: maxDisplayOrder + 1,
          is_active: true,
        });
      }
    }
  }, [category, open, maxDisplayOrder]);

  const handleSave = async () => {
    if (!formData.category_name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setSaving(true);
    try {
      if (category) {
        const { error } = await supabase
          .from("questionnaire_categories")
          .update({
            category_name: formData.category_name.trim(),
            description: formData.description.trim() || null,
            display_order: formData.display_order,
            is_active: formData.is_active,
          })
          .eq("id", category.id);

        if (error) throw error;
        toast.success("Category updated successfully");
      } else {
        const { error } = await supabase
          .from("questionnaire_categories")
          .insert({
            category_name: formData.category_name.trim(),
            description: formData.description.trim() || null,
            display_order: formData.display_order,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success("Category created successfully");
      }

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {category ? "Edit Category" : "Add New Category"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category_name">Category Name *</Label>
            <Input
              id="category_name"
              value={formData.category_name}
              onChange={(e) =>
                setFormData({ ...formData, category_name: e.target.value })
              }
              placeholder="e.g., Personal Background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Brief description of what this category covers..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_order">Display Order</Label>
            <Input
              id="display_order"
              type="number"
              value={formData.display_order}
              onChange={(e) =>
                setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
              }
              min={0}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="h-4 w-4"
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Active
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {category ? "Update" : "Create"} Category
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
