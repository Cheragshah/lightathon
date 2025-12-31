import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Trash2, Edit, UserPlus } from "lucide-react";

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_user_id?: string;
  target_persona_id?: string;
  details?: any;
  created_at: string;
}

export const AuditLogsTable = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminEmails, setAdminEmails] = useState<Record<string, string>>({});

  useEffect(() => {
    loadLogs();
    
    // Set up real-time subscription for audit logs
    const channel = supabase
      .channel('audit-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_activity_log'
        },
        (payload) => {
          console.log('New audit log:', payload);
          setLogs(prev => [payload.new as AuditLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setLogs(data || []);

      // Fetch admin emails using service role if available
      const adminIds = [...new Set(data?.map(log => log.admin_id) || [])];
      
      // Try to fetch from a view or use RPC if available, otherwise just show IDs
      const emailMap: Record<string, string> = {};
      
      // For now, just show truncated IDs - admin emails would need proper RLS or service role access
      adminIds.forEach(id => {
        emailMap[id] = id.substring(0, 8) + '...';
      });
      
      setAdminEmails(emailMap);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'role_granted':
      case 'role_revoked':
        return <Shield className="h-4 w-4" />;
      case 'persona_deleted':
        return <Trash2 className="h-4 w-4" />;
      case 'persona_updated':
        return <Edit className="h-4 w-4" />;
      case 'user_created':
        return <UserPlus className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, any> = {
      'role_granted': 'default',
      'role_revoked': 'destructive',
      'persona_deleted': 'destructive',
      'persona_updated': 'secondary',
    };
    return variants[action] || 'outline';
  };

  const formatAction = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading audit logs...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Logs</CardTitle>
        <CardDescription>
          Detailed history of all administrative actions (last 50 entries)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {formatDate(log.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {adminEmails[log.admin_id] || log.admin_id.substring(0, 8)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <Badge variant={getActionBadge(log.action)}>
                          {formatAction(log.action)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.details && (
                        <pre className="text-xs">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
