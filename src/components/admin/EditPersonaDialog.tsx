import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Persona {
  id: string;
  title_or_label: string;
  generated_persona_text: string | null;
  coach_readiness_score: number | null;
  coach_readiness_summary: string | null;
}

interface EditPersonaDialogProps {
  persona: Persona | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditPersonaDialog = ({ persona, open, onOpenChange, onSuccess }: EditPersonaDialogProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title_or_label: "",
    generated_persona_text: "",
    coach_readiness_score: "",
    coach_readiness_summary: "",
  });

  useEffect(() => {
    if (persona) {
      setFormData({
        title_or_label: persona.title_or_label || "",
        generated_persona_text: persona.generated_persona_text || "",
        coach_readiness_score: persona.coach_readiness_score?.toString() || "",
        coach_readiness_summary: persona.coach_readiness_summary || "",
      });
    }
  }, [persona]);

  const handleSave = async () => {
    if (!persona) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const updates: any = {
        title_or_label: formData.title_or_label,
        generated_persona_text: formData.generated_persona_text,
        coach_readiness_summary: formData.coach_readiness_summary,
      };

      if (formData.coach_readiness_score) {
        const score = parseInt(formData.coach_readiness_score);
        if (score >= 0 && score <= 100) {
          updates.coach_readiness_score = score;
        }
      }

      const { error } = await supabase.functions.invoke('admin-update-persona', {
        body: { personaId: persona.id, updates },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Persona updated successfully",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Persona</DialogTitle>
          <DialogDescription>
            Update the persona details below. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title_or_label}
              onChange={(e) =>
                setFormData({ ...formData, title_or_label: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="score">Readiness Score (0-100)</Label>
            <Input
              id="score"
              type="number"
              min="0"
              max="100"
              value={formData.coach_readiness_score}
              onChange={(e) =>
                setFormData({ ...formData, coach_readiness_score: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="summary">Readiness Summary</Label>
            <Textarea
              id="summary"
              value={formData.coach_readiness_summary}
              onChange={(e) =>
                setFormData({ ...formData, coach_readiness_summary: e.target.value })
              }
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="persona">Persona Text</Label>
            <Textarea
              id="persona"
              value={formData.generated_persona_text}
              onChange={(e) =>
                setFormData({ ...formData, generated_persona_text: e.target.value })
              }
              rows={10}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};