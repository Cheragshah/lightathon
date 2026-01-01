import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Users, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  batch: string | null;
}

interface Category {
  id: string;
  category_name: string;
  is_active: boolean;
}

interface UserAssignment {
  user_id: string;
  category_id: string;
  is_enabled: boolean;
}

interface Batch {
  id: string;
  batch_name: string;
}

export function UserCategoryAssignments() {
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [assignments, setAssignments] = useState<UserAssignment[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [batchFilter, setBatchFilter] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users from profiles
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, email, full_name, batch")
        .order("full_name");

      if (usersError) throw usersError;

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("questionnaire_categories")
        .select("id, category_name, is_active")
        .eq("is_active", true)
        .order("display_order");

      if (categoriesError) throw categoriesError;

      // Fetch batches
      const { data: batchesData, error: batchesError } = await supabase
        .from("batches")
        .select("id, batch_name")
        .eq("is_active", true)
        .order("batch_name");

      if (batchesError) throw batchesError;

      // Fetch existing user assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("user_category_assignments")
        .select("user_id, category_id, is_enabled");

      if (assignmentsError) throw assignmentsError;

      setUsers(usersData || []);
      setCategories(categoriesData || []);
      setBatches(batchesData || []);
      setAssignments(assignmentsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (user.email?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    
    const matchesBatch = batchFilter === "all" || user.batch === batchFilter;
    
    return matchesSearch && matchesBatch;
  });

  const getUserAssignment = (userId: string, categoryId: string): boolean | null => {
    const assignment = assignments.find(
      a => a.user_id === userId && a.category_id === categoryId
    );
    return assignment ? assignment.is_enabled : null;
  };

  const handleToggleAssignment = async (userId: string, categoryId: string, enabled: boolean) => {
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        toast.error("Not authenticated");
        return;
      }

      // Upsert the assignment
      const { error } = await supabase
        .from("user_category_assignments")
        .upsert({
          user_id: userId,
          category_id: categoryId,
          is_enabled: enabled,
          enabled_by: session.session.user.id,
          enabled_at: new Date().toISOString()
        }, {
          onConflict: "user_id,category_id"
        });

      if (error) throw error;

      // Update local state
      setAssignments(prev => {
        const existing = prev.find(a => a.user_id === userId && a.category_id === categoryId);
        if (existing) {
          return prev.map(a => 
            a.user_id === userId && a.category_id === categoryId 
              ? { ...a, is_enabled: enabled }
              : a
          );
        }
        return [...prev, { user_id: userId, category_id: categoryId, is_enabled: enabled }];
      });

      toast.success(`Category ${enabled ? "enabled" : "disabled"} for user`);
    } catch (error) {
      console.error("Error toggling assignment:", error);
      toast.error("Failed to update assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkToggle = async (categoryId: string, enabled: boolean) => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user");
      return;
    }

    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        toast.error("Not authenticated");
        return;
      }

      const upsertData = selectedUsers.map(userId => ({
        user_id: userId,
        category_id: categoryId,
        is_enabled: enabled,
        enabled_by: session.session.user.id,
        enabled_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from("user_category_assignments")
        .upsert(upsertData, {
          onConflict: "user_id,category_id"
        });

      if (error) throw error;

      // Update local state
      setAssignments(prev => {
        const updated = [...prev];
        selectedUsers.forEach(userId => {
          const existing = updated.find(a => a.user_id === userId && a.category_id === categoryId);
          if (existing) {
            existing.is_enabled = enabled;
          } else {
            updated.push({ user_id: userId, category_id: categoryId, is_enabled: enabled });
          }
        });
        return updated;
      });

      toast.success(`Category ${enabled ? "enabled" : "disabled"} for ${selectedUsers.length} users`);
    } catch (error) {
      console.error("Error bulk toggling:", error);
      toast.error("Failed to update assignments");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Category Assignments
        </CardTitle>
        <CardDescription>
          Enable or disable questionnaire categories for individual users. 
          User-specific assignments override batch assignments.
        </CardDescription>
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
          <Select value={batchFilter} onValueChange={setBatchFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map(batch => (
                <SelectItem key={batch.id} value={batch.batch_name}>
                  {batch.batch_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="p-3 bg-muted rounded-lg space-y-3">
            <span className="text-sm font-medium block">
              {selectedUsers.length} user(s) selected - Bulk enable/disable categories:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {categories.map(category => (
                <div key={category.id} className="flex flex-col gap-1 p-2 bg-background rounded border">
                  <span className="text-xs font-medium truncate">{category.category_name}</span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs"
                      onClick={() => handleBulkToggle(category.id, true)}
                      disabled={saving}
                    >
                      <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                      Enable
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs"
                      onClick={() => handleBulkToggle(category.id, false)}
                      disabled={saving}
                    >
                      <XCircle className="h-3 w-3 mr-1 text-red-500" />
                      Disable
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] sticky left-0 bg-background z-10">
                  <Checkbox
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="min-w-[180px] sticky left-[50px] bg-background z-10">User</TableHead>
                <TableHead className="min-w-[100px]">Batch</TableHead>
                {categories.map(category => (
                  <TableHead key={category.id} className="text-center min-w-[120px]">
                    <span className="text-xs">{category.category_name}</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3 + categories.length} className="text-center text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="sticky left-0 bg-background z-10">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => handleSelectUser(user.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="sticky left-[50px] bg-background z-10">
                      <div className="min-w-[160px]">
                        <div className="font-medium truncate">{user.full_name || "No name"}</div>
                        <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.batch ? (
                        <Badge variant="outline">{user.batch}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No batch</span>
                      )}
                    </TableCell>
                    {categories.map(category => {
                      const assignment = getUserAssignment(user.id, category.id);
                      return (
                        <TableCell key={category.id} className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Checkbox
                              checked={assignment === true}
                              onCheckedChange={(checked) => 
                                handleToggleAssignment(user.id, category.id, !!checked)
                              }
                              disabled={saving}
                              className={assignment === null ? "opacity-50" : ""}
                            />
                            {assignment === null && (
                              <span className="text-[10px] text-muted-foreground">
                                (batch)
                              </span>
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
