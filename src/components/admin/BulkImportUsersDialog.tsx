import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Upload, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BulkImportUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface UserData {
  name: string;
  email: string;
  role?: string;
}

export const BulkImportUsersDialog = ({ open, onOpenChange, onSuccess }: BulkImportUsersDialogProps) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);

  const downloadTemplate = () => {
    const csv = "name,email,role\nJohn Doe,john@example.com,user\nJane Smith,jane@example.com,admin";
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error("CSV file is empty");
        return;
      }

      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      const nameIndex = headers.indexOf('name');
      const emailIndex = headers.indexOf('email');
      const roleIndex = headers.indexOf('role');

      if (nameIndex === -1 || emailIndex === -1) {
        toast.error("CSV must have 'name' and 'email' columns");
        return;
      }

      const parsedUsers: UserData[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= 2 && values[emailIndex]) {
          parsedUsers.push({
            name: values[nameIndex],
            email: values[emailIndex],
            role: roleIndex !== -1 ? values[roleIndex] : undefined
          });
        }
      }

      setUsers(parsedUsers);
      toast.success(`Loaded ${parsedUsers.length} users from CSV`);
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (users.length === 0) {
      toast.error("No users to import");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-bulk-import-users', {
        body: { users }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      const { results } = data;
      
      if (results.failed > 0) {
        toast.warning(`Import completed with errors`, {
          description: `Success: ${results.success}, Failed: ${results.failed}`
        });
        console.error('Import errors:', results.errors);
      } else {
        toast.success(`Successfully imported ${results.success} users`);
      }

      setUsers([]);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error importing users:', error);
      toast.error("Failed to import users", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Users</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>

            <label htmlFor="csv-upload">
              <Button
                variant="outline"
                className="gap-2"
                asChild
              >
                <span>
                  <Upload className="h-4 w-4" />
                  Upload CSV
                </span>
              </Button>
            </label>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {users.length > 0 && (
            <>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user, index) => (
                      <TableRow key={index}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role || 'None'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-muted p-3 rounded-md text-sm">
                <p className="font-medium">Default Password for all users</p>
                <p className="text-muted-foreground">codex@123</p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={loading || users.length === 0}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import {users.length > 0 && `${users.length} Users`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};