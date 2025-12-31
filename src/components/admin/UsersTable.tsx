import { useState, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Eye, Shield, Ban, Trash2, Key, Users as UsersIcon, X, UserPlus, Upload, RefreshCw, RotateCcw, StopCircle, Infinity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RoleManagementDialog } from "./RoleManagementDialog";
import { BulkUserActions } from "./BulkUserActions";
import { AddUserDialog } from "./AddUserDialog";
import { BulkImportUsersDialog } from "./BulkImportUsersDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PersonaRun {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  roles: string[];
  persona_run_count: number;
  persona_runs: PersonaRun[];
  is_blocked?: boolean;
  has_unlimited_runs?: boolean;
  ai_usage?: {
    total_cost: number;
    total_tokens: number;
    request_count: number;
  };
}

interface UsersTableProps {
  users: User[];
  onRoleUpdated: () => void;
  selectedRunIds: string[];
  onSelectRun: (runId: string) => void;
}

type StatusFilter = 'all' | 'active' | 'blocked';
type RoleFilter = 'all' | 'admin' | 'moderator' | 'user';

export const UsersTable = ({ users, onRoleUpdated, selectedRunIds, onSelectRun }: UsersTableProps) => {
  const navigate = useNavigate();
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [roleDialogUser, setRoleDialogUser] = useState<User | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; runId: string; title: string } | null>(null);

  // Helper to validate session before admin actions
  const validateSession = useCallback(async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Your session has expired. Please log in again.');
      navigate('/auth');
      return false;
    }
    return true;
  }, [navigate]);

  const handleBlockUser = async (userId: string, isBlocked: boolean) => {
    if (!confirm(`Are you sure you want to ${isBlocked ? 'unblock' : 'block'} this user?`)) return;

    if (!await validateSession()) return;

    setProcessingAction(userId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-block-user', {
        body: {
          targetUserId: userId,
          action: isBlocked ? 'unblock' : 'block',
          reason: isBlocked ? undefined : 'Blocked by admin'
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`User ${isBlocked ? 'unblocked' : 'blocked'} successfully`);
      onRoleUpdated();
    } catch (error: any) {
      console.error('Error blocking/unblocking user:', error);
      toast.error(error.message || 'Failed to update user status');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to DELETE user ${userEmail}? This action cannot be undone and will remove all their data.`)) return;

    if (!await validateSession()) return;

    setProcessingAction(userId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { targetUserId: userId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('User deleted successfully');
      onRoleUpdated();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleResetPassword = async (userId: string, userEmail: string) => {
    if (!confirm(`Send password reset email to ${userEmail}?`)) return;

    if (!await validateSession()) return;

    setProcessingAction(userId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-user-password', {
        body: { targetUserId: userId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Password reset email sent to ${userEmail}`);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Failed to send password reset email');
    } finally {
    setProcessingAction(null);
    }
  };

  const handleToggleUnlimitedRuns = async (userId: string, currentlyHasUnlimited: boolean) => {
    if (!await validateSession()) return;

    setProcessingAction(userId);
    try {
      if (currentlyHasUnlimited) {
        // Remove unlimited runs permission
        const { error } = await supabase
          .from("user_unlimited_runs")
          .delete()
          .eq("user_id", userId);
        
        if (error) throw error;
        toast.success("Unlimited runs permission removed");
      } else {
        // Grant unlimited runs permission
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("user_unlimited_runs")
          .insert({
            user_id: userId,
            granted_by: user?.id,
            reason: "Granted by admin"
          });
        
        if (error) throw error;
        toast.success("User can now create unlimited persona runs");
      }
      onRoleUpdated();
    } catch (error: any) {
      console.error("Error toggling unlimited runs:", error);
      toast.error(error.message || "Failed to update permission");
    } finally {
      setProcessingAction(null);
    }
  };

  const handleFullRerun = async (personaRunId: string) => {
    if (!await validateSession()) return;

    setProcessingAction(personaRunId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-full-rerun-persona', {
        body: { personaRunId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Full re-run initiated - all codexes will be regenerated with current prompts');
      onRoleUpdated();
    } catch (error: any) {
      console.error('Error initiating full re-run:', error);
      toast.error(error.message || 'Failed to initiate full re-run');
    } finally {
      setProcessingAction(null);
      setConfirmAction(null);
    }
  };

  const handleRegenerate = async (personaRunId: string) => {
    if (!await validateSession()) return;

    setProcessingAction(personaRunId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-regenerate-persona', {
        body: { personaRunId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Regeneration started - retrying stuck sections');
      onRoleUpdated();
    } catch (error: any) {
      console.error('Error regenerating persona:', error);
      toast.error(error.message || 'Failed to regenerate persona');
    } finally {
      setProcessingAction(null);
      setConfirmAction(null);
    }
  };

  const handleDeletePersonaRun = async (personaRunId: string) => {
    if (!await validateSession()) return;

    setProcessingAction(personaRunId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-persona', {
        body: { personaRunId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Persona run deleted successfully');
      onRoleUpdated();
    } catch (error: any) {
      console.error('Error deleting persona run:', error);
      toast.error(error.message || 'Failed to delete persona run');
    } finally {
      setProcessingAction(null);
      setConfirmAction(null);
    }
  };

  const handleCancelRun = async (personaRunId: string) => {
    if (!await validateSession()) return;

    setProcessingAction(personaRunId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-cancel-persona-run', {
        body: { personaRunId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Persona run cancelled');
      onRoleUpdated();
    } catch (error: any) {
      console.error('Error cancelling persona run:', error);
      toast.error(error.message || 'Failed to cancel persona run');
    } finally {
      setProcessingAction(null);
      setConfirmAction(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'generating': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const filteredUsers = users.filter(user => {
    // Search filter
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'blocked' && user.is_blocked) ||
      (statusFilter === 'active' && !user.is_blocked);
    
    // Role filter
    const matchesRole = roleFilter === 'all' || user.roles.includes(roleFilter);
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllFiltered = () => {
    setSelectedUserIds(filteredUsers.map(u => u.id));
  };

  const clearSelection = () => {
    setSelectedUserIds([]);
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setShowAddUser(true)}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowBulkImport(true)}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Bulk Import
        </Button>
      </div>

      {/* Filter Controls */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>

          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="user">User</option>
          </select>
        </div>

        {/* Bulk Selection Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllFiltered}
          >
            Select All ({filteredUsers.length})
          </Button>
          {selectedUserIds.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
              >
                <X className="h-4 w-4 mr-1" />
                Clear ({selectedUserIds.length})
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowBulkActions(true)}
              >
                <UsersIcon className="h-4 w-4 mr-1" />
                Bulk Actions ({selectedUserIds.length})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Users Table */}
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) selectAllFiltered();
                  else clearSelection();
                }}
              />
            </TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead>Persona Runs</TableHead>
            <TableHead>AI Usage</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Sign In</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map((user) => (
            <>
              <TableRow key={user.id} className={user.is_blocked ? "bg-destructive/10" : ""}>
                <TableCell>
                  <Checkbox
                    checked={selectedUserIds.includes(user.id)}
                    onCheckedChange={() => toggleUserSelection(user.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {user.email}
                    {user.is_blocked && (
                      <Badge variant="destructive" className="text-xs">Blocked</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {user.is_blocked ? (
                    <Badge variant="destructive">Blocked</Badge>
                  ) : (
                    <Badge variant="default">Active</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {user.roles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{user.persona_run_count}</TableCell>
                <TableCell>
                  {user.ai_usage ? (
                    <div className="text-sm">
                      <div className="font-bold text-base">${user.ai_usage.total_cost.toFixed(4)}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.ai_usage.total_tokens.toLocaleString()} tokens • {user.ai_usage.request_count} requests
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">$0.00</span>
                  )}
                </TableCell>
                <TableCell>{formatDate(user.created_at)}</TableCell>
                <TableCell>
                  {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                      title="View persona runs"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResetPassword(user.id, user.email)}
                      disabled={processingAction === user.id}
                      title="Reset password"
                    >
                      <Key className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRoleDialogUser(user)}
                      title="Manage roles"
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleUnlimitedRuns(user.id, user.has_unlimited_runs || false)}
                      disabled={processingAction === user.id}
                      title={user.has_unlimited_runs ? "Revoke unlimited runs" : "Allow unlimited runs"}
                    >
                      <Infinity className={`h-4 w-4 ${user.has_unlimited_runs ? 'text-green-500' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBlockUser(user.id, user.is_blocked || false)}
                      disabled={processingAction === user.id}
                      title={user.is_blocked ? "Unblock user" : "Block user"}
                    >
                      <Ban className={`h-4 w-4 ${user.is_blocked ? 'text-green-500' : 'text-orange-500'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id, user.email)}
                      disabled={processingAction === user.id}
                      title="Delete user"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              {expandedUser === user.id && user.persona_runs.length > 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="bg-muted/50">
                    <div className="py-4">
                      <h4 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">
                        User's Persona Runs
                      </h4>
                      <div className="space-y-2">
                        {user.persona_runs.map((run) => (
                          <div key={run.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                            <div className="flex items-center gap-3 flex-1">
                              <Checkbox
                                checked={selectedRunIds.includes(run.id)}
                                onCheckedChange={() => onSelectRun(run.id)}
                              />
                              <div className="flex flex-col gap-1">
                                <span className="font-medium">{run.title}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant={getStatusColor(run.status)}>
                                    {run.status}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(run.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/persona-run/${run.id}`)}
                                title="View persona details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmAction({ type: 'fullRerun', runId: run.id, title: run.title })}
                                disabled={processingAction === run.id}
                                title="Delete all codexes and regenerate with current prompts"
                              >
                                <RotateCcw className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmAction({ type: 'regenerate', runId: run.id, title: run.title })}
                                disabled={processingAction === run.id}
                                title="Retry stuck/failed sections"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              {run.status === 'generating' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setConfirmAction({ type: 'cancel', runId: run.id, title: run.title })}
                                  disabled={processingAction === run.id}
                                  title="Cancel ongoing generation"
                                >
                                  <StopCircle className="h-4 w-4 text-orange-500" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmAction({ type: 'delete', runId: run.id, title: run.title })}
                                disabled={processingAction === run.id}
                                title="Delete persona run"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
      </div>

      {showBulkActions && (
        <BulkUserActions
          selectedUserIds={selectedUserIds}
          users={users}
          onClose={() => {
            setShowBulkActions(false);
            clearSelection();
          }}
          onSuccess={() => {
            onRoleUpdated();
            clearSelection();
          }}
        />
      )}

      {roleDialogUser && (
        <RoleManagementDialog
          open={!!roleDialogUser}
          onOpenChange={(open) => !open && setRoleDialogUser(null)}
          user={roleDialogUser}
          onRoleUpdated={() => {
            setRoleDialogUser(null);
            onRoleUpdated();
          }}
        />
      )}

      <AddUserDialog
        open={showAddUser}
        onOpenChange={setShowAddUser}
        onSuccess={onRoleUpdated}
      />

      <BulkImportUsersDialog
        open={showBulkImport}
        onOpenChange={setShowBulkImport}
        onSuccess={onRoleUpdated}
      />

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'fullRerun' && 'Full Re-Run Persona'}
              {confirmAction?.type === 'regenerate' && 'Regenerate Persona'}
              {confirmAction?.type === 'cancel' && 'Cancel Persona Run'}
              {confirmAction?.type === 'delete' && 'Delete Persona Run'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'fullRerun' && (
                <>
                  This will <strong>DELETE all existing codexes</strong> for "{confirmAction.title}" and regenerate them from scratch using:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>The user's original answers and transcript</li>
                    <li>The CURRENT active prompt configuration</li>
                  </ul>
                  <p className="mt-2 font-semibold">This action cannot be undone.</p>
                </>
              )}
              {confirmAction?.type === 'regenerate' && (
                <>
                  This will retry all stuck or failed sections for "{confirmAction.title}".
                </>
              )}
              {confirmAction?.type === 'cancel' && (
                <>
                  This will cancel the ongoing generation for "{confirmAction.title}".
                </>
              )}
              {confirmAction?.type === 'delete' && (
                <>
                  This will permanently delete the persona run "{confirmAction.title}" and all its data. This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmAction) return;
                switch (confirmAction.type) {
                  case 'fullRerun':
                    handleFullRerun(confirmAction.runId);
                    break;
                  case 'regenerate':
                    handleRegenerate(confirmAction.runId);
                    break;
                  case 'cancel':
                    handleCancelRun(confirmAction.runId);
                    break;
                  case 'delete':
                    handleDeletePersonaRun(confirmAction.runId);
                    break;
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
