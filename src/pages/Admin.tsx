import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { PDFTemplateSettings } from "@/components/admin/PDFTemplateSettings";
import { SystemConfiguration } from "@/components/admin/SystemConfiguration";
import { AIProvidersManager } from "@/components/admin/AIProvidersManager";
import { EmailSettings } from "@/components/admin/EmailSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";

export default function Admin() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setLoading(false);

        // Handle session expiry
        if (event === 'SIGNED_OUT') {
          toast.error('Your session has expired. Please log in again.');
          navigate('/auth');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={true} />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground mt-2">Manage system settings, AI providers, and PDF templates</p>
        </div>
        
        <Tabs defaultValue="system" className="space-y-6">
          <TabsList>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="ai-providers">AI Providers</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="pdf-templates">PDF Templates</TabsTrigger>
          </TabsList>
          
          <TabsContent value="system">
            <SystemConfiguration />
          </TabsContent>
          
          <TabsContent value="ai-providers">
            <AIProvidersManager />
          </TabsContent>

          <TabsContent value="email">
            <EmailSettings />
          </TabsContent>
          
          <TabsContent value="pdf-templates">
            <PDFTemplateSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
