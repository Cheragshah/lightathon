import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Key, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BulkUserActionsProps {
  selectedUserIds: string[];
  users: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkUserActions = ({ selectedUserIds, users, onClose, onSuccess }: BulkUserActionsProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'user' | 'moderator' | 'admin'>('user');
  
  const selectedUsers = users.filter(u => selectedUserIds.includes(u.id));

  const handleBulkRoleAssignment = async () => {
    if (!confirm(`Assign "${selectedRole}" role to ${selectedUsers.length} users?`)) return;

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const user of selectedUsers) {
      try {
        const { error } = await supabase.functions.invoke('admin-update-user-role', {
          body: { 
            userId: user.id, 
            role: selectedRole, 
            action: 'add' 
          }
        });

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error(`Error updating role for ${user.email}:`, error);
        errorCount++;
      }
    }

    setLoading(false);
    
    toast.success(`Roles updated: ${successCount} successful, ${errorCount} failed`);
    
    if (successCount > 0) {
      onSuccess();
      onClose();
    }
  };

  const handleBulkPasswordReset = async () => {
    if (!confirm(`Send password reset emails to ${selectedUsers.length} users?`)) return;

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const user of selectedUsers) {
      try {
        const { error } = await supabase.functions.invoke('admin-reset-user-password', {
          body: { targetUserId: user.id }
        });

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error(`Error resetting password for ${user.email}:`, error);
        errorCount++;
      }
    }

    setLoading(false);
    
    toast.success(`Password resets sent: ${successCount} successful, ${errorCount} failed`);
    
    if (successCount > 0) {
      onClose();
    }
  };

  return (
    <Dialog open={selectedUserIds.length > 0} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk User Actions</DialogTitle>
          <DialogDescription>
            Perform actions on {selectedUsers.length} selected user{selectedUsers.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="max-h-40 overflow-y-auto border rounded p-3 space-y-1">
            {selectedUsers.map(user => (
              <div key={user.id} className="text-sm flex items-center justify-between py-1">
                <span>{user.email}</span>
                <div className="flex gap-1">
                  {user.roles.map((role: string) => (
                    <Badge key={role} variant="secondary" className="text-xs">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-medium">Bulk Role Assignment</span>
              </div>
              
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
              >
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>

              <Button 
                onClick={handleBulkRoleAssignment} 
                disabled={loading}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Shield className="mr-2 h-4 w-4" />
                Assign "{selectedRole}" to {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
              </Button>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Bulk Password Reset</span>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Send password reset emails to all selected users
              </p>

              <Button 
                onClick={handleBulkPasswordReset} 
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Key className="mr-2 h-4 w-4" />
                Send Reset Emails to {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>

          <Button onClick={onClose} variant="ghost" className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};