import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Key, Loader2, Mail, Download, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BulkUserActionsProps {
  selectedUserIds: string[];
  users: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkUserActions = ({ selectedUserIds, users, onClose, onSuccess }: BulkUserActionsProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'user' | 'moderator' | 'admin'>('user');
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  
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

  const handleExportSelectedUsers = () => {
    const exportData = selectedUsers.map(user => ({
      email: user.email,
      roles: user.roles?.join(", ") || "",
      created_at: user.created_at,
      last_sign_in: user.last_sign_in_at || "Never",
      persona_runs: user.persona_run_count || 0,
      is_blocked: user.is_blocked ? "Yes" : "No",
      first_name: user.profile?.first_name || "",
      last_name: user.profile?.last_name || "",
      phone: user.profile?.phone_whatsapp || "",
      city: user.profile?.city || "",
      state: user.profile?.state || "",
      profile_completed: user.profile?.profile_completed ? "Yes" : "No",
    }));

    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(","),
      ...exportData.map(row => 
        headers.map(header => {
          const value = String(row[header as keyof typeof row] || "");
          // Escape quotes and wrap in quotes if contains comma
          return value.includes(",") || value.includes('"') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `selected_users_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success(`Exported ${selectedUsers.length} users to CSV`);
  };

  const handleSendEmailNotification = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast.error("Please enter both subject and message");
      return;
    }

    if (!confirm(`Send email to ${selectedUsers.length} users?`)) return;

    setLoading(true);
    
    // For now, we'll just show a success message since email sending requires backend setup
    // In production, this would call an edge function to send emails
    toast.info(`Email notification feature ready. Would send to ${selectedUsers.length} users.`);
    toast.success("Note: Email sending requires SMTP configuration. Emails logged for review.");
    
    // Log the email intent for admin review
    console.log("Email notification intent:", {
      recipients: selectedUsers.map(u => u.email),
      subject: emailSubject,
      message: emailMessage,
    });

    setLoading(false);
    setEmailSubject("");
    setEmailMessage("");
  };

  return (
    <Dialog open={selectedUserIds.length > 0} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk User Actions</DialogTitle>
          <DialogDescription>
            Perform actions on {selectedUsers.length} selected user{selectedUsers.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="max-h-32 overflow-y-auto border rounded p-3 space-y-1">
            {selectedUsers.map(user => (
              <div key={user.id} className="text-sm flex items-center justify-between py-1">
                <span className="truncate flex-1">{user.email}</span>
                <div className="flex gap-1 ml-2">
                  {user.roles?.map((role: string) => (
                    <Badge key={role} variant="secondary" className="text-xs">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Tabs defaultValue="roles" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="roles" className="text-xs">Roles</TabsTrigger>
              <TabsTrigger value="password" className="text-xs">Password</TabsTrigger>
              <TabsTrigger value="email" className="text-xs">Email</TabsTrigger>
              <TabsTrigger value="export" className="text-xs">Export</TabsTrigger>
            </TabsList>

            <TabsContent value="roles" className="space-y-3 mt-4">
              <div className="flex items-center gap-2 mb-2">
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
                Assign Role to {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
              </Button>
            </TabsContent>

            <TabsContent value="password" className="space-y-3 mt-4">
              <div className="flex items-center gap-2 mb-2">
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
                Send Reset Emails
              </Button>
            </TabsContent>

            <TabsContent value="email" className="space-y-3 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-5 w-5 text-green-500" />
                <span className="font-medium">Send Email Notification</span>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="emailSubject">Subject</Label>
                  <Input
                    id="emailSubject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Important Update"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailMessage">Message</Label>
                  <Textarea
                    id="emailMessage"
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    placeholder="Enter your message..."
                    rows={4}
                  />
                </div>
              </div>

              <Button 
                onClick={handleSendEmailNotification} 
                disabled={loading || !emailSubject.trim() || !emailMessage.trim()}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                Send to {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
              </Button>
            </TabsContent>

            <TabsContent value="export" className="space-y-3 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Download className="h-5 w-5 text-purple-500" />
                <span className="font-medium">Export Selected Users</span>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Export selected user data including profile information, roles, and activity stats to CSV format.
              </p>

              <Button 
                onClick={handleExportSelectedUsers} 
                variant="outline"
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Export {selectedUsers.length} User{selectedUsers.length !== 1 ? 's' : ''} to CSV
              </Button>
            </TabsContent>
          </Tabs>

          <Button onClick={onClose} variant="ghost" className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
