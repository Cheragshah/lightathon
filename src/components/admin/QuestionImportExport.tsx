import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Download, Upload, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Category {
  id: string;
  category_name: string;
  display_order: number;
}

interface Question {
  id: string;
  category_id: string;
  question_text: string;
  display_order: number;
  is_required: boolean;
  is_active: boolean;
  helper_text: string | null;
  category_name?: string;
}

interface QuestionImportExportProps {
  questions: Question[];
  categories: Category[];
  onImportComplete: () => void;
}

interface ImportQuestion {
  category_name: string;
  question_text: string;
  helper_text?: string;
  display_order: number;
  is_required: boolean;
  is_active: boolean;
}

export function QuestionImportExport({ questions, categories, onImportComplete }: QuestionImportExportProps) {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportQuestion[]>([]);

  const exportToCSV = () => {
    try {
      // CSV header
      let csv = "category_name,question_text,helper_text,display_order,is_required,is_active\n";

      // Add data rows
      questions.forEach(q => {
        const row = [
          q.category_name || "",
          `"${(q.question_text || "").replace(/"/g, '""')}"`,
          `"${(q.helper_text || "").replace(/"/g, '""')}"`,
          q.display_order,
          q.is_required,
          q.is_active
        ].join(",");
        csv += row + "\n";
      });

      // Download file
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `questions_export_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Questions exported to CSV");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export questions");
    }
  };

  const exportToJSON = () => {
    try {
      const exportData = questions.map(q => ({
        category_name: q.category_name || "",
        question_text: q.question_text,
        helper_text: q.helper_text || "",
        display_order: q.display_order,
        is_required: q.is_required,
        is_active: q.is_active,
      }));

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `questions_export_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Questions exported to JSON");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export questions");
    }
  };

  const parseCSV = (text: string): ImportQuestion[] => {
    const lines = text.split("\n").filter(line => line.trim());
    if (lines.length < 2) throw new Error("CSV file is empty or invalid");

    const headers = lines[0].split(",").map(h => h.trim());
    const questions: ImportQuestion[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values: string[] = [];
      let currentValue = "";
      let insideQuotes = false;

      // Parse CSV with quoted values
      for (let char of lines[i]) {
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === "," && !insideQuotes) {
          values.push(currentValue.trim());
          currentValue = "";
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());

      if (values.length >= 6) {
        questions.push({
          category_name: values[0].replace(/^"|"$/g, ""),
          question_text: values[1].replace(/^"|"$/g, "").replace(/""/g, '"'),
          helper_text: values[2].replace(/^"|"$/g, "").replace(/""/g, '"'),
          display_order: parseInt(values[3]) || 0,
          is_required: values[4].toLowerCase() === "true",
          is_active: values[5].toLowerCase() === "true",
        });
      }
    }

    return questions;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let parsedQuestions: ImportQuestion[];

      if (file.name.endsWith(".json")) {
        parsedQuestions = JSON.parse(text);
      } else if (file.name.endsWith(".csv")) {
        parsedQuestions = parseCSV(text);
      } else {
        throw new Error("Unsupported file format. Please use CSV or JSON.");
      }

      // Validate questions
      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        throw new Error("No valid questions found in file");
      }

      setImportPreview(parsedQuestions);
      toast.success(`Loaded ${parsedQuestions.length} questions for preview`);
    } catch (error: any) {
      console.error("Parse error:", error);
      toast.error(error.message || "Failed to parse file");
      setImportPreview([]);
    }

    // Reset input
    event.target.value = "";
  };

  const handleImport = async () => {
    if (importPreview.length === 0) {
      toast.error("No questions to import");
      return;
    }

    try {
      setImporting(true);

      // Map category names to IDs
      const categoryMap = new Map(categories.map(c => [c.category_name.toLowerCase(), c.id]));

      // Prepare questions for insert
      const questionsToInsert = importPreview.map(q => {
        const categoryId = categoryMap.get(q.category_name.toLowerCase());
        if (!categoryId) {
          throw new Error(`Category not found: ${q.category_name}`);
        }

        return {
          category_id: categoryId,
          question_text: q.question_text,
          helper_text: q.helper_text || null,
          display_order: q.display_order,
          is_required: q.is_required,
          is_active: q.is_active,
        };
      });

      // Insert questions
      const { error } = await supabase
        .from("questionnaire_questions")
        .insert(questionsToInsert);

      if (error) throw error;

      toast.success(`Successfully imported ${questionsToInsert.length} questions`);
      setImportPreview([]);
      setImportDialogOpen(false);
      onImportComplete();
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.message || "Failed to import questions");
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        <Button variant="outline" onClick={exportToJSON}>
          <FileJson className="h-4 w-4 mr-2" />
          Export JSON
        </Button>
        <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
      </div>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Questions</DialogTitle>
            <DialogDescription>
              Upload a CSV or JSON file with questions. Make sure category names match existing categories.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Select File (CSV or JSON)</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.json"
                onChange={handleFileUpload}
                className="mt-2"
              />
            </div>

            {importPreview.length > 0 && (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Preview: {importPreview.length} questions ready to import
                  </AlertDescription>
                </Alert>

                <div className="max-h-64 overflow-y-auto border rounded-md p-4 space-y-2">
                  {importPreview.slice(0, 10).map((q, idx) => (
                    <div key={idx} className="text-sm border-b pb-2">
                      <div className="font-medium">{q.category_name}</div>
                      <div className="text-muted-foreground truncate">{q.question_text}</div>
                    </div>
                  ))}
                  {importPreview.length > 10 && (
                    <div className="text-sm text-muted-foreground">
                      ... and {importPreview.length - 10} more
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setImportPreview([])}
                    disabled={importing}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleImport} disabled={importing}>
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Import {importPreview.length} Questions
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {importPreview.length === 0 && (
              <Alert>
                <AlertDescription>
                  <strong>CSV Format:</strong> category_name, question_text, helper_text, display_order, is_required, is_active
                  <br />
                  <strong>JSON Format:</strong> Array of objects with the same fields
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
