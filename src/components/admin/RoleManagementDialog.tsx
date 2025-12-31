import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldCheck, User as UserIcon } from "lucide-react";

interface RoleManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    roles: string[];
  };
  onRoleUpdated: () => void;
}

export const RoleManagementDialog = ({ open, onOpenChange, user, onRoleUpdated }: RoleManagementDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const availableRoles = [
    { value: 'user', label: 'User', icon: UserIcon, description: 'Basic access - can generate codexes based on questionnaire answers' },
    { value: 'moderator', label: 'Moderator', icon: Shield, description: 'Can view and manage all users, but cannot modify questionnaires or codex prompts' },
    { value: 'admin', label: 'Admin', icon: ShieldCheck, description: 'Full system access - users, analytics, questionnaires, codex configuration' },
  ];

  const hasRole = (role: string) => user.roles.includes(role);

  const updateRole = async (role: string, action: 'add' | 'remove') => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-update-user-role', {
        body: { userId: user.id, role, action }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Role ${action === 'add' ? 'granted' : 'revoked'} successfully`,
      });

      onRoleUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Roles</DialogTitle>
          <DialogDescription>
            Update roles for {user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {availableRoles.map((role) => {
            const Icon = role.icon;
            const hasThisRole = hasRole(role.value);

            return (
              <div key={role.value} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{role.label}</div>
                    <div className="text-xs text-muted-foreground">{role.description}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {hasThisRole && (
                    <Badge variant="secondary">Active</Badge>
                  )}
                  <Button
                    size="sm"
                    variant={hasThisRole ? "destructive" : "default"}
                    onClick={() => updateRole(role.value, hasThisRole ? 'remove' : 'add')}
                    disabled={loading}
                  >
                    {hasThisRole ? 'Remove' : 'Grant'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
