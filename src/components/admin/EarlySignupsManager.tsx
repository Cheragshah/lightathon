import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Mail, RefreshCw, Search, Users } from "lucide-react";
import { format } from "date-fns";

interface EarlySignup {
  id: string;
  email: string;
  created_at: string;
}

export function EarlySignupsManager() {
  const [signups, setSignups] = useState<EarlySignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSignups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("early_signups")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSignups(data || []);
    } catch (error: any) {
      console.error("Error fetching early signups:", error);
      toast.error("Failed to load early signups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignups();
  }, []);

  const filteredSignups = signups.filter(signup =>
    signup.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCSV = () => {
    const csvContent = [
      ["Email", "Signed Up At"],
      ...signups.map(signup => [
        signup.email,
        format(new Date(signup.created_at), "yyyy-MM-dd HH:mm:ss")
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `early-signups-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("CSV exported successfully");
  };

  const copyAllEmails = () => {
    const emails = signups.map(s => s.email).join(", ");
    navigator.clipboard.writeText(emails);
    toast.success("All emails copied to clipboard");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Early Signups
            </CardTitle>
            <CardDescription>
              Users who signed up for early access on the coming soon page
            </CardDescription>
          </div>
          <Badge variant="secondary" className="self-start sm:self-auto flex items-center gap-1">
            <Users className="h-3 w-3" />
            {signups.length} signups
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchSignups} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={copyAllEmails} disabled={signups.length === 0}>
              <Mail className="h-4 w-4 mr-2" />
              Copy All
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={signups.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredSignups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? "No signups match your search" : "No early signups yet"}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[180px]">Signed Up</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSignups.map((signup) => (
                  <TableRow key={signup.id}>
                    <TableCell className="font-medium">{signup.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(signup.created_at), "MMM d, yyyy h:mm a")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
