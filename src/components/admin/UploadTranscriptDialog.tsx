import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UploadTranscriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  onSuccess: () => void;
}

interface ExtractionResult {
  extraction_confidence: 'high' | 'medium' | 'low';
  missing_questions: number[];
  notes: string;
}

export const UploadTranscriptDialog = ({
  open,
  onOpenChange,
  userId,
  userEmail,
  onSuccess,
}: UploadTranscriptDialogProps) => {
  const [transcriptText, setTranscriptText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ['.txt', '.doc', '.docx'];
    const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (!validTypes.includes(fileExt)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .txt, .doc, or .docx file",
        variant: "destructive",
      });
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setTranscriptText(content);
    };
    reader.readAsText(selectedFile);
  };

  const processTranscript = async () => {
    if (!transcriptText.trim() || transcriptText.length < 500) {
      toast({
        title: "Transcript too short",
        description: "Please provide a transcript with at least 500 characters",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    setExtractionResult(null);
    setPersonaId(null);

    try {
      const { data, error } = await supabase.functions.invoke('process-transcript', {
        body: {
          transcript_text: transcriptText,
          target_user_id: userId,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Processing failed",
          description: data.message || data.error,
          variant: "destructive",
        });
        if (data.extraction_result) {
          setExtractionResult(data.extraction_result);
        }
        setProcessing(false);
        return;
      }

      setExtractionResult(data.extraction_result);
      setPersonaId(data.persona_id);

      toast({
        title: "Success!",
        description: `Persona and all 8 CODEXes generated for ${userEmail}`,
      });

      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        setTranscriptText("");
        setFile(null);
        setExtractionResult(null);
        setPersonaId(null);
      }, 2000);

    } catch (error: any) {
      console.error('Error processing transcript:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process transcript",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'medium': return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'low': return <AlertCircle className="h-5 w-5 text-red-600" />;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Transcript for {userEmail}</DialogTitle>
          <DialogDescription>
            Upload or paste a conversation transcript. The AI will extract answers and generate
            a complete persona with all 8 CODEXes for this user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Upload File</label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer">
              <input
                type="file"
                id="admin-file-upload"
                className="hidden"
                accept=".txt,.doc,.docx"
                onChange={handleFileSelect}
                disabled={processing}
              />
              <label htmlFor="admin-file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {file ? file.name : "Click to upload"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  .TXT, .DOC, .DOCX (max 10MB)
                </p>
              </label>
            </div>
          </div>

          {/* Text Area */}
          <div>
            <label className="block text-sm font-medium mb-2">Or Paste Transcript</label>
            <Textarea
              placeholder="Paste conversation transcript here..."
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              className="min-h-[250px] font-mono text-sm"
              disabled={processing}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {transcriptText.length} characters
              {transcriptText.length > 0 && transcriptText.length < 500 && (
                <span className="text-yellow-600 ml-2">(Need at least 500)</span>
              )}
            </p>
          </div>

          {/* Extraction Result */}
          {extractionResult && (
            <Alert>
              <div className="flex items-start gap-3">
                {getConfidenceIcon(extractionResult.extraction_confidence)}
                <div className="flex-1">
                  <AlertDescription>
                    <p className="font-medium mb-1">
                      Extraction:{" "}
                      <span className={getConfidenceColor(extractionResult.extraction_confidence)}>
                        {extractionResult.extraction_confidence.toUpperCase()}
                      </span>
                    </p>
                    {extractionResult.missing_questions.length > 0 && (
                      <p className="text-sm">
                        Missing: {extractionResult.missing_questions.join(", ")}
                      </p>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          {/* Success Message */}
          {personaId && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Persona created successfully! View it in the user's dashboard.
              </AlertDescription>
            </Alert>
          )}

          {/* Process Button */}
          <Button
            onClick={processTranscript}
            disabled={processing || !transcriptText.trim() || transcriptText.length < 500}
            className="w-full"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing... (4-6 minutes)
              </>
            ) : (
              "Process & Generate Persona + CODEXes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
