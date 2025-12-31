import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Users, Trash2, Loader2 } from "lucide-react";

interface Batch {
  id: string;
  batch_name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  user_count?: number;
}

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  batch: string | null;
}

export const BatchManager = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [formData, setFormData] = useState({ batch_name: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch batches
      const { data: batchesData, error: batchesError } = await supabase
        .from("batches")
        .select("*")
        .order("created_at", { ascending: false });

      if (batchesError) throw batchesError;

      // Fetch all user profiles
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, batch");

      if (usersError) throw usersError;

      // Count users per batch
      const batchesWithCounts = (batchesData || []).map(batch => ({
        ...batch,
        user_count: (usersData || []).filter(u => u.batch === batch.batch_name).length,
      }));

      setBatches(batchesWithCounts);
      setUsers(usersData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async () => {
    if (!formData.batch_name.trim()) {
      toast.error("Batch name is required");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("batches")
        .insert({
          batch_name: formData.batch_name.trim(),
          description: formData.description.trim() || null,
          created_by: user?.id,
        });

      if (error) throw error;

      toast.success("Batch created successfully");
      setIsAddDialogOpen(false);
      setFormData({ batch_name: "", description: "" });
      fetchData();
    } catch (error: any) {
      console.error("Error creating batch:", error);
      toast.error(error.message || "Failed to create batch");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBatch = async () => {
    if (!selectedBatch || !formData.batch_name.trim()) {
      toast.error("Batch name is required");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("batches")
        .update({
          batch_name: formData.batch_name.trim(),
          description: formData.description.trim() || null,
        })
        .eq("id", selectedBatch.id);

      if (error) throw error;

      // Also update users with old batch name to new batch name
      if (selectedBatch.batch_name !== formData.batch_name.trim()) {
        await supabase
          .from("profiles")
          .update({ batch: formData.batch_name.trim() })
          .eq("batch", selectedBatch.batch_name);
      }

      toast.success("Batch updated successfully");
      setIsEditDialogOpen(false);
      setSelectedBatch(null);
      setFormData({ batch_name: "", description: "" });
      fetchData();
    } catch (error: any) {
      console.error("Error updating batch:", error);
      toast.error(error.message || "Failed to update batch");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBatchActive = async (batch: Batch) => {
    try {
      const { error } = await supabase
        .from("batches")
        .update({ is_active: !batch.is_active })
        .eq("id", batch.id);

      if (error) throw error;

      toast.success(`Batch ${batch.is_active ? "deactivated" : "activated"}`);
      fetchData();
    } catch (error: any) {
      console.error("Error toggling batch:", error);
      toast.error("Failed to update batch status");
    }
  };

  const handleDeleteBatch = async (batch: Batch) => {
    if (!confirm(`Are you sure you want to delete "${batch.batch_name}"? This will remove the batch assignment from all users.`)) {
      return;
    }

    try {
      // First, remove batch from all users
      await supabase
        .from("profiles")
        .update({ batch: null })
        .eq("batch", batch.batch_name);

      // Then delete the batch
      const { error } = await supabase
        .from("batches")
        .delete()
        .eq("id", batch.id);

      if (error) throw error;

      toast.success("Batch deleted successfully");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting batch:", error);
      toast.error("Failed to delete batch");
    }
  };

  const handleAssignUserToBatch = async (userId: string, batchName: string | null) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ batch: batchName })
        .eq("id", userId);

      if (error) throw error;

      toast.success(batchName ? `User assigned to ${batchName}` : "User removed from batch");
      fetchData();
    } catch (error: any) {
      console.error("Error assigning user:", error);
      toast.error("Failed to assign user");
    }
  };

  const openEditDialog = (batch: Batch) => {
    setSelectedBatch(batch);
    setFormData({ batch_name: batch.batch_name, description: batch.description || "" });
    setIsEditDialogOpen(true);
  };

  const getBatchUsers = (batchName: string) => {
    return users.filter(u => u.batch === batchName);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Batch Management</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage user batches for workshop groups
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Batch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Batch</DialogTitle>
              <DialogDescription>
                Create a batch to group users for workshops
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="batch_name">Batch Name *</Label>
                <Input
                  id="batch_name"
                  value={formData.batch_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, batch_name: e.target.value }))}
                  placeholder="e.g., January 2025 Cohort"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateBatch} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Batch
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>Batches</CardTitle>
          <CardDescription>All workshop batches and their users</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No batches created yet
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.batch_name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {batch.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        {batch.user_count || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={batch.is_active}
                        onCheckedChange={() => handleToggleBatchActive(batch)}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(batch.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(batch)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteBatch(batch)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Assignment */}
      <Card>
        <CardHeader>
          <CardTitle>User Batch Assignments</CardTitle>
          <CardDescription>Assign users to batches</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Batch</TableHead>
                <TableHead>Assign To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.first_name || user.last_name
                        ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                        : "Unnamed User"}
                    </TableCell>
                    <TableCell>{user.email || "-"}</TableCell>
                    <TableCell>
                      {user.batch ? (
                        <Badge>{user.batch}</Badge>
                      ) : (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.batch || "none"}
                        onValueChange={(value) => 
                          handleAssignUserToBatch(user.id, value === "none" ? null : value)
                        }
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select batch" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Batch</SelectItem>
                          {batches.filter(b => b.is_active).map((batch) => (
                            <SelectItem key={batch.id} value={batch.batch_name}>
                              {batch.batch_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Batch</DialogTitle>
            <DialogDescription>
              Update batch details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_batch_name">Batch Name *</Label>
              <Input
                id="edit_batch_name"
                value={formData.batch_name}
                onChange={(e) => setFormData(prev => ({ ...prev, batch_name: e.target.value }))}
                placeholder="e.g., January 2025 Cohort"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateBatch} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Update Batch
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
