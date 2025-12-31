import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Eye, Link as LinkIcon, TrendingUp } from "lucide-react";

interface ShareLink {
  id: string;
  share_token: string;
  created_at: string;
  expires_at: string | null;
  view_count: number;
  is_active: boolean;
  persona_run_id: string;
}

interface ShareAttempt {
  id: string;
  share_token: string;
  ip_address: string;
  created_at: string;
  attempt_type: string;
  success: boolean;
}

export const ShareLinkAnalytics = () => {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [attempts, setAttempts] = useState<ShareAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const response1: any = await (supabase as any)
        .from('shared_links')
        .select('*')
        .order('created_at', { ascending: false });

      const response2: any = await (supabase as any)
        .from('share_link_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (response1.data) setShareLinks(response1.data);
      if (response2.data) setAttempts(response2.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const totalViews = shareLinks.reduce((sum, link) => sum + link.view_count, 0);
  const activeLinks = shareLinks.filter(link => link.is_active).length;
  const successfulAttempts = attempts.filter(a => a.success).length;

  // Prepare chart data
  const viewsByLink = shareLinks.slice(0, 5).map(link => ({
    name: link.share_token.substring(0, 8) + '...',
    views: link.view_count
  }));

  const attemptsByType = attempts.reduce((acc: any, attempt) => {
    acc[attempt.attempt_type] = (acc[attempt.attempt_type] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(attemptsByType).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  // Geographic data (IP-based approximation)
  const ipCounts = attempts.reduce((acc: any, attempt) => {
    const ipPrefix = attempt.ip_address.split('.').slice(0, 2).join('.');
    acc[ipPrefix] = (acc[ipPrefix] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews}</div>
            <p className="text-xs text-muted-foreground">
              Across {shareLinks.length} share links
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Links</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLinks}</div>
            <p className="text-xs text-muted-foreground">
              Out of {shareLinks.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attempts.length > 0 ? Math.round((successfulAttempts / attempts.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {successfulAttempts} of {attempts.length} attempts
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Share Links by Views</CardTitle>
            <CardDescription>Most viewed share links</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={viewsByLink}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="views" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access Patterns</CardTitle>
            <CardDescription>Types of access attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Access Attempts</CardTitle>
          <CardDescription>Latest 20 share link access attempts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.slice(0, 20).map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="text-sm">{formatDate(attempt.created_at)}</TableCell>
                    <TableCell className="font-mono text-sm">{attempt.ip_address}</TableCell>
                    <TableCell>{attempt.attempt_type}</TableCell>
                    <TableCell>
                      <Badge variant={attempt.success ? "default" : "destructive"}>
                        {attempt.success ? "Success" : "Failed"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Geographic Distribution</CardTitle>
          <CardDescription>Access by IP range (approximate location)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP Range</TableHead>
                  <TableHead>Access Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(ipCounts).slice(0, 10).map(([ipRange, count]) => (
                  <TableRow key={ipRange}>
                    <TableCell className="font-mono">{ipRange}.x.x</TableCell>
                    <TableCell>{count as number}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
