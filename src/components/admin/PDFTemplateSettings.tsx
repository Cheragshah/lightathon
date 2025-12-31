import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export const PDFTemplateSettings = () => {
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    const { data } = await supabase
      .from('pdf_templates' as any)
      .select('*')
      .eq('is_active', true)
      .single();
    
    setTemplate(data);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('pdf_templates' as any)
      .update(template)
      .eq('id', template.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "PDF template updated successfully" });
    }
    setSaving(false);
  };

  if (loading) return <Loader2 className="animate-spin" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>PDF Export Template</CardTitle>
        <CardDescription>Customize how codex PDFs are generated</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Title Font Size</Label>
            <Input type="number" value={template?.title_font_size} onChange={(e) => setTemplate({...template, title_font_size: parseInt(e.target.value)})} />
          </div>
          <div>
            <Label>Body Font Size</Label>
            <Input type="number" value={template?.body_font_size} onChange={(e) => setTemplate({...template, body_font_size: parseInt(e.target.value)})} />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Template
        </Button>
      </CardContent>
    </Card>
  );
};
