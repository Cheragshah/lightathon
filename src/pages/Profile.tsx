import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { User } from "@supabase/supabase-js";
import { Camera, Loader2, User as UserIcon } from "lucide-react";

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  phone_whatsapp: string;
  address: string;
  city: string;
  state: string;
  pin_code: string;
  photograph_url: string;
  batch: string | null;
}

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    first_name: "",
    last_name: "",
    email: "",
    phone_whatsapp: "",
    address: "",
    city: "",
    state: "",
    pin_code: "",
    photograph_url: "",
    batch: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      const authEmail = session.user.email || "";
      
      // Load profile data from profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, email, phone_whatsapp, address, city, state, pin_code, photograph_url, batch")
        .eq("id", session.user.id)
        .single();
      
      if (profile) {
        setFormData({
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          // Use profile email if set, otherwise use auth email (but don't let user override auth email)
          email: profile.email || authEmail,
          phone_whatsapp: profile.phone_whatsapp || "",
          address: profile.address || "",
          city: profile.city || "",
          state: profile.state || "",
          pin_code: profile.pin_code || "",
          photograph_url: profile.photograph_url || "",
          batch: profile.batch,
        });
      } else {
        // No profile yet, use auth email
        setFormData(prev => ({
          ...prev,
          email: authEmail,
        }));
      }
    };
    
    loadProfile();
  }, [navigate]);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/profile.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, photograph_url: publicUrl }));
      toast({
        title: "Photo uploaded",
        description: "Your profile photo has been uploaded successfully",
      });
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!user) return;

    // Validate required fields
    const requiredFields: (keyof ProfileData)[] = ["first_name", "last_name", "email", "phone_whatsapp", "address", "city", "state", "pin_code"];
    const missingFields = requiredFields.filter(field => !formData[field]?.trim());
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Update profile in profiles table (excluding batch which is admin-only)
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone_whatsapp: formData.phone_whatsapp.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pin_code: formData.pin_code.trim(),
        photograph_url: formData.photograph_url || null,
        profile_completed: !!formData.photograph_url,
        updated_at: new Date().toISOString(),
      });

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
        description: "Redirecting to dashboard...",
      });
      // Redirect to dashboard after successful update
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
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
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Photo Upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-2 border-primary/20">
                    <AvatarImage src={formData.photograph_url} />
                    <AvatarFallback className="bg-muted">
                      <UserIcon className="h-10 w-10 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <p className="text-sm text-muted-foreground">Click to upload your photo</p>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    type="text"
                    placeholder="John"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange("first_name", e.target.value)}
                    disabled={loading}
                    required
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    type="text"
                    placeholder="Doe"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange("last_name", e.target.value)}
                    disabled={loading}
                    required
                    maxLength={50}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  disabled={loading}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  This can be the same as your login email
                </p>
              </div>

              {/* WhatsApp */}
              <div className="space-y-2">
                <Label htmlFor="phone_whatsapp">WhatsApp Number *</Label>
                <Input
                  id="phone_whatsapp"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone_whatsapp}
                  onChange={(e) => handleInputChange("phone_whatsapp", e.target.value)}
                  disabled={loading}
                  required
                  maxLength={20}
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  placeholder="Enter your full address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  disabled={loading}
                  required
                  rows={2}
                />
              </div>

              {/* City and State */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="Mumbai"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    disabled={loading}
                    required
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    type="text"
                    placeholder="Maharashtra"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    disabled={loading}
                    required
                    maxLength={50}
                  />
                </div>
              </div>

              {/* PIN Code */}
              <div className="space-y-2">
                <Label htmlFor="pin_code">PIN Code *</Label>
                <Input
                  id="pin_code"
                  type="text"
                  placeholder="400001"
                  value={formData.pin_code}
                  onChange={(e) => handleInputChange("pin_code", e.target.value)}
                  disabled={loading}
                  required
                  maxLength={10}
                />
              </div>

              {/* Batch (Read-only) */}
              {formData.batch && (
                <div className="space-y-2">
                  <Label htmlFor="batch">Batch</Label>
                  <Input
                    id="batch"
                    type="text"
                    value={formData.batch}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    Your batch is assigned by the administrator
                  </p>
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p className="font-medium mb-1">📝 Note:</p>
                <p>This information will be automatically included in all future codex generations to personalize your content.</p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Profile"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
