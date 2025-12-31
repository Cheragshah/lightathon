import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Share2, Copy, Check, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ShareDialogProps {
  personaRunId: string;
}

export const ShareDialog = ({ personaRunId }: ShareDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(7);
  const [existingLinks, setExistingLinks] = useState<any[]>([]);
  const [showExisting, setShowExisting] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadExistingLinks();
    }
  }, [open]);

  const loadExistingLinks = async () => {
    try {
      const response = await (supabase as any)
        .from('shared_links')
        .select('*')
        .eq('persona_run_id', personaRunId)
        .order('created_at', { ascending: false });

      if (response.error) throw response.error;
      setExistingLinks(response.data || []);
    } catch (error: any) {
      console.error('Error loading share links:', error);
    }
  };

  const handleCreateShare = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-share-link', {
        body: {
          personaRunId,
          password: usePassword && password ? password : undefined,
          expiresInDays: expiresInDays || undefined
        }
      });

      if (error) throw error;

      const fullUrl = `${window.location.origin}/share/${data.shareToken}`;
      setShareUrl(fullUrl);

      toast({
        title: "Share link created",
        description: "Your persona run can now be shared publicly",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create share link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Share link copied to clipboard",
    });
  };

  const handleDelete = async (linkId: string) => {
    try {
      const response = await (supabase as any)
        .from('shared_links')
        .delete()
        .eq('id', linkId);

      if (response.error) throw response.error;

      toast({
        title: "Link deleted",
        description: "Share link has been removed",
      });
      
      loadExistingLinks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete share link",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (linkId: string, isActive: boolean) => {
    try {
      const response = await (supabase as any)
        .from('shared_links')
        .update({ is_active: !isActive })
        .eq('id', linkId);

      if (response.error) throw response.error;

      toast({
        title: isActive ? "Link disabled" : "Link enabled",
        description: isActive ? "Share link has been disabled" : "Share link has been enabled",
      });
      
      loadExistingLinks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update share link",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Persona Run</DialogTitle>
          <DialogDescription>
            Create and manage public links to share your persona run with others
          </DialogDescription>
        </DialogHeader>
        
        {showExisting && existingLinks.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Existing Share Links</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowExisting(false)}>
                Create New
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {existingLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell>
                        <Badge variant={link.is_active ? "default" : "secondary"}>
                          {link.is_active ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(link.created_at)}</TableCell>
                      <TableCell className="text-sm">
                        {link.expires_at ? formatDate(link.expires_at) : "Never"}
                      </TableCell>
                      <TableCell>{link.view_count}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopy(`${window.location.origin}/share/${link.share_token}`)}
                          >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`${window.location.origin}/share/${link.share_token}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleActive(link.id, link.is_active)}
                          >
                            {link.is_active ? "Disable" : "Enable"}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Share Link</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure? This will permanently delete the share link.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(link.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {(!showExisting || existingLinks.length === 0) && !shareUrl && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="password-toggle">Password protect</Label>
              <Switch
                id="password-toggle"
                checked={usePassword}
                onCheckedChange={setUsePassword}
              />
            </div>

            {usePassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="expires">Expires in (days)</Label>
              <Input
                id="expires"
                type="number"
                value={expiresInDays || ""}
                onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Never expires"
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for no expiration
              </p>
            </div>

            <Button onClick={handleCreateShare} disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Share Link"}
            </Button>
            {existingLinks.length > 0 && (
              <Button variant="outline" onClick={() => setShowExisting(true)} className="w-full">
                View Existing Links
              </Button>
            )}
          </div>
        )}
        
        {shareUrl && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly />
                <Button size="icon" onClick={() => handleCopy(shareUrl)}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {usePassword && (
                <p className="text-xs text-muted-foreground">
                  Share the password separately: <strong>{password}</strong>
                </p>
              )}
            </div>
            <Button variant="outline" onClick={() => {
              setShareUrl("");
              loadExistingLinks();
              setShowExisting(true);
            }} className="w-full">
              Back to All Links
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
