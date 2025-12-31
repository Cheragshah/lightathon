import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SharedView() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [personaRun, setPersonaRun] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    verifyShareLink();
  }, [token]);

  const verifyShareLink = async (pwd?: string) => {
    if (!token) return;

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-share-link', {
        body: {
          shareToken: token,
          password: pwd || password
        }
      });

      if (error) {
        if (error.message?.includes('Password required')) {
          setRequiresPassword(true);
          setLoading(false);
          return;
        }
        throw error;
      }

      setPersonaRun(data.personaRun);
      setRequiresPassword(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Invalid or expired share link",
        variant: "destructive",
      });
      setTimeout(() => navigate('/'), 3000);
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyShareLink(password);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation isAuthenticated={false} />
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (requiresPassword && !personaRun) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation isAuthenticated={false} />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  <CardTitle>Password Required</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Enter Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={verifying}>
                    {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Access
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!personaRun) {
    return null;
  }

  const completedCodexes = personaRun.codexes?.filter((c: any) => c.status === 'ready').length || 0;
  const totalCodexes = personaRun.codexes?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={false} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{personaRun.title}</h1>
            <p className="text-muted-foreground">
              Shared persona run • {completedCodexes} of {totalCodexes} codexes completed
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {personaRun.codexes
              ?.sort((a: any, b: any) => a.codex_order - b.codex_order)
              .map((codex: any) => (
                <Card key={codex.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{codex.codex_name}</CardTitle>
                      <Badge variant={codex.status === 'ready' ? 'default' : 'secondary'}>
                        {codex.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      {codex.completed_sections} / {codex.total_sections} sections
                    </div>
                    {codex.status === 'ready' && codex.sections?.some((s: any) => s.content) && (
                      <div className="mt-4">
                        <div className="prose prose-sm max-w-none line-clamp-3">
                          {codex.sections[0]?.content?.substring(0, 150)}...
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
