import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Navigation } from "@/components/Navigation";

interface ExtractionResult {
  backstory_answers: string[];
  anchor_answers: string[];
  extraction_confidence: 'high' | 'medium' | 'low';
  missing_questions: number[];
  notes: string;
}

const TranscriptUpload = () => {
  const [user, setUser] = useState<any>(null);
  const [transcriptText, setTranscriptText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    };
    checkAuth();
  }, [navigate]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check file type
    const validTypes = ['.txt', '.doc', '.docx', '.pdf'];
    const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (!validTypes.includes(fileExt)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .txt, .doc, .docx, or .pdf file",
        variant: "destructive",
      });
      return;
    }

    // Check file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);

    // Read file content - PDFs need special handling
    if (fileExt === '.pdf') {
      toast({
        title: "PDF Processing",
        description: "PDF text extraction will be done during processing",
      });
      setTranscriptText(`[PDF File: ${selectedFile.name}]`);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setTranscriptText(content);
      };
      reader.readAsText(selectedFile);
    }

    toast({
      title: "File loaded",
      description: `${selectedFile.name} is ready to process`,
    });
  };

  const processTranscript = async () => {
    if (!transcriptText.trim()) {
      toast({
        title: "No transcript",
        description: "Please paste or upload a transcript first",
        variant: "destructive",
      });
      return;
    }

    if (transcriptText.length < 500 && !file?.name.endsWith('.pdf')) {
      toast({
        title: "Transcript too short",
        description: "Please provide a longer transcript (at least 500 characters)",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    setExtractionResult(null);

    try {
      const payload: any = {};
      
      // Handle PDF file
      if (file && file.name.endsWith('.pdf')) {
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        payload.pdf_base64 = await base64Promise;
      } else {
        payload.transcript_text = transcriptText;
      }
      
      const { data, error } = await supabase.functions.invoke('process-transcript', {
        body: payload,
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

      toast({
        title: "Success!",
        description: "Your persona and all 8 CODEXes have been generated",
      });

      // Navigate to the generated persona
      setTimeout(() => {
        navigate(`/persona/${data.persona_id}`);
      }, 1500);

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

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={true} />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Upload Transcript</CardTitle>
            <CardDescription>
              Upload or paste a conversation transcript where you've answered questions about your coaching business.
              Our AI will extract the answers and generate your complete persona with all 8 CODEXes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Upload File</label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".txt,.doc,.docx,.pdf"
                  onChange={handleFileSelect}
                  disabled={processing}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {file ? file.name : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    .TXT, .DOC, .DOCX, .PDF (max 10MB)
                  </p>
                </label>
              </div>
            </div>

            {/* Text Area */}
            <div>
              <label className="block text-sm font-medium mb-2">Or Paste Transcript</label>
              <Textarea
                placeholder="Paste your conversation transcript here (up to 100,000 characters)..."
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                className="min-h-[500px] font-mono text-sm"
                maxLength={100000}
                disabled={processing}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {transcriptText.length.toLocaleString()} / 100,000 characters
                {transcriptText.length > 90000 && (
                  <span className="text-yellow-600 ml-2 font-semibold">
                    (Approaching character limit)
                  </span>
                )}
                {transcriptText.length > 0 && transcriptText.length < 500 && (
                  <span className="text-yellow-600 ml-2">
                    (Need at least 500 characters)
                  </span>
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
                      <p className="font-medium mb-2">
                        Extraction Confidence:{" "}
                        <span className={getConfidenceColor(extractionResult.extraction_confidence)}>
                          {extractionResult.extraction_confidence.toUpperCase()}
                        </span>
                      </p>
                      {extractionResult.missing_questions.length > 0 && (
                        <p className="text-sm">
                          Missing information for {extractionResult.missing_questions.length} questions:
                          {" "}{extractionResult.missing_questions.join(", ")}
                        </p>
                      )}
                      {extractionResult.notes && (
                        <p className="text-sm mt-2">{extractionResult.notes}</p>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}

            {/* Process Button */}
            <Button
              onClick={processTranscript}
              disabled={processing || !transcriptText.trim() || transcriptText.length < 500}
              className="w-full"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing Transcript & Generating Persona...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-5 w-5" />
                  Process & Generate Persona + CODEXes
                </>
              )}
            </Button>

            {processing && (
              <Alert>
                <AlertDescription>
                  <p className="text-sm">
                    This may take 4-6 minutes. We're extracting answers, generating your persona,
                    and creating all 8 CODEXes. Please don't close this page.
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TranscriptUpload;
