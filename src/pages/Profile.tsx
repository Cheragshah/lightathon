import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { User } from "@supabase/supabase-js";

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [websiteSocial, setWebsiteSocial] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);
      setEmail(session.user.email || "");
      
      // Load profile data from profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, title, location, website_social")
        .eq("id", session.user.id)
        .single();
      
      if (profile) {
        setFullName(profile.full_name || "");
        setTitle(profile.title || "");
        setLocation(profile.location || "");
        setWebsiteSocial(profile.website_social || "");
      }
    };
    
    loadProfile();
  }, [navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!user) return;

    // Update profile in profiles table
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        title: title.trim(),
        location: location.trim(),
        website_social: websiteSocial.trim(),
      })
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Profile updated successfully!",
        description: "Your information will be included in future codex generations.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      <Navigation isAuthenticated={!!user} />
      
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
            <CardDescription>Update your account information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title / Role</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Leadership Coach, CEO, etc."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={loading}
                  maxLength={100}
                />
                <p className="text-sm text-muted-foreground">
                  Your professional title or role
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  type="text"
                  placeholder="San Francisco, USA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={loading}
                  maxLength={100}
                />
                <p className="text-sm text-muted-foreground">
                  Your city and country
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="websiteSocial">Website / Social</Label>
                <Input
                  id="websiteSocial"
                  type="text"
                  placeholder="yourwebsite.com or @yourhandle"
                  value={websiteSocial}
                  onChange={(e) => setWebsiteSocial(e.target.value)}
                  disabled={loading}
                  maxLength={200}
                />
                <p className="text-sm text-muted-foreground">
                  Your website or social media handle
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p className="font-medium mb-1">📝 Note:</p>
                <p>This information will be automatically included in all future codex generations to personalize your content.</p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
