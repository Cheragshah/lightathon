import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Calendar, Trash2, Eye } from "lucide-react";
import { ProfileCompletionDialog } from "@/components/ProfileCompletionDialog";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import type { User } from "@supabase/supabase-js";

interface PersonaRun {
  id: string;
  title: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [personaRuns, setPersonaRuns] = useState<PersonaRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { 
    profile, 
    shouldShowPrompt, 
    isProfileComplete, 
    dismissPrompt, 
    refreshProfile 
  } = useProfileCompletion();

  // Show profile dialog when shouldShowPrompt becomes true
  useEffect(() => {
    if (shouldShowPrompt && !isProfileComplete) {
      setShowProfileDialog(true);
    }
  }, [shouldShowPrompt, isProfileComplete]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        loadPersonaRuns(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        loadPersonaRuns(session.user.id);
      } else {
        setUser(null);
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadPersonaRuns = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("persona_runs" as any)
      .select("id, title, status, created_at, completed_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading persona runs",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setPersonaRuns(data as any || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("persona_runs" as any).delete().eq("id", id);
    if (error) {
      toast({
        title: "Error deleting persona run",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Persona run deleted",
        description: "Your persona run has been deleted successfully.",
      });
      if (user) {
        loadPersonaRuns(user.id);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      generating: { variant: "default", label: "Generating" },
      completed: { variant: "outline", label: "Completed" },
      failed: { variant: "destructive", label: "Failed" },
    };
    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleProfileDialogClose = (open: boolean) => {
    setShowProfileDialog(open);
    if (!open) {
      dismissPrompt();
    }
  };

  const handleProfileComplete = () => {
    refreshProfile();
    setShowProfileDialog(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={!!user} />
      
      {/* Profile Completion Dialog */}
      <ProfileCompletionDialog
        open={showProfileDialog}
        onOpenChange={handleProfileDialogClose}
        onComplete={handleProfileComplete}
        initialData={profile || undefined}
      />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                My Coach Persona  
              </h1>
              <p className="text-muted-foreground">
                Create and manage your Coach Persona Architect blueprints
              </p>
            </div>
            <div className="flex gap-3">
              <Button size="lg" onClick={() => navigate("/questionnaire")} className="gap-2">
                <Plus className="h-5 w-5" />
                Answer Questionnaire
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/transcript-upload")} className="gap-2">
                <FileText className="h-5 w-5" />
                Upload Transcript
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading your persona runs...</p>
            </div>
          ) : personaRuns.length === 0 ? (
            <Card className="text-center py-12">
              <CardHeader>
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <CardTitle>No Persona Runs Yet</CardTitle>
                <CardDescription>
                  Create your first Coach Persona Blueprint by answering 20 narrative questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/questionnaire")} size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Start Questionnaire
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {personaRuns.map((run) => (
                <Card key={run.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg line-clamp-2">{run.title}</CardTitle>
                      {getStatusBadge(run.status)}
                    </div>
                    <CardDescription className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      {new Date(run.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/persona-run/${run.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(run.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
