import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

interface ErrorCategory {
  category: string;
  count: number;
  errors: Array<{
    message: string;
    codex_name: string;
    section_name: string;
  }>;
  suggestedFix: string;
}

export function ErrorCategorization() {
  const [errorCategories, setErrorCategories] = useState<ErrorCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadErrorData();
  }, []);

  const loadErrorData = async () => {
    try {
      const { data } = await (supabase as any)
        .from("codex_sections")
        .select("error_message, section_name")
        .eq("status", "error")
        .not("error_message", "is", null);

      if (data) {
        const categorized = categorizeErrors(data);
        setErrorCategories(categorized);
      }
    } catch (error) {
      console.error("Error loading error data:", error);
    } finally {
      setLoading(false);
    }
  };

  const categorizeErrors = (sections: any[]): ErrorCategory[] => {
    const categories: { [key: string]: ErrorCategory } = {};

    sections.forEach((section) => {
      const errorMsg = section.error_message || "";
      const category = detectErrorCategory(errorMsg);

      if (!categories[category]) {
        categories[category] = {
          category,
          count: 0,
          errors: [],
          suggestedFix: getSuggestedFix(category),
        };
      }

      categories[category].count++;
      categories[category].errors.push({
        message: errorMsg,
        codex_name: "Codex",
        section_name: section.section_name,
      });
    });

    return Object.values(categories).sort((a, b) => b.count - a.count);
  };

  const detectErrorCategory = (errorMessage: string): string => {
    const lowerMsg = errorMessage.toLowerCase();

    if (lowerMsg.includes("timeout") || lowerMsg.includes("timed out")) {
      return "Timeout Errors";
    } else if (lowerMsg.includes("rate limit") || lowerMsg.includes("429")) {
      return "Rate Limit Errors";
    } else if (lowerMsg.includes("token") || lowerMsg.includes("context length")) {
      return "Token/Context Errors";
    } else if (lowerMsg.includes("network") || lowerMsg.includes("connection")) {
      return "Network Errors";
    } else if (lowerMsg.includes("json") || lowerMsg.includes("parse")) {
      return "JSON Parsing Errors";
    } else if (lowerMsg.includes("api key") || lowerMsg.includes("unauthorized")) {
      return "Authentication Errors";
    } else if (lowerMsg.includes("500") || lowerMsg.includes("internal server")) {
      return "Server Errors";
    } else {
      return "Other Errors";
    }
  };

  const getSuggestedFix = (category: string): string => {
    const fixes: { [key: string]: string } = {
      "Timeout Errors": "Increase timeout duration or reduce batch size for concurrent operations",
      "Rate Limit Errors": "Implement exponential backoff and reduce concurrency levels",
      "Token/Context Errors": "Reduce word count targets or split prompts into smaller sections",
      "Network Errors": "Implement retry logic with exponential backoff",
      "JSON Parsing Errors": "Improve prompt instructions for structured output or add validation",
      "Authentication Errors": "Verify API keys are correctly configured in secrets",
      "Server Errors": "Check AI provider status and implement retry logic",
      "Other Errors": "Review error logs for specific patterns and implement targeted fixes",
    };

    return fixes[category] || "Review individual error messages for specific issues";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Categorization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading error analysis...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Error Categorization & Suggested Fixes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorCategories.length === 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p>No errors detected! All sections are generating successfully.</p>
          </div>
        ) : (
          errorCategories.map((cat) => (
            <div key={cat.category} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <h3 className="font-semibold">{cat.category}</h3>
                  <Badge variant="destructive">{cat.count} errors</Badge>
                </div>
              </div>

              <div className="bg-muted p-3 rounded text-sm">
                <p className="font-medium mb-1">Suggested Fix:</p>
                <p className="text-muted-foreground">{cat.suggestedFix}</p>
              </div>

              <details className="text-sm">
                <summary className="cursor-pointer font-medium hover:text-primary">
                  View affected sections ({cat.errors.length})
                </summary>
                <div className="mt-2 space-y-2 pl-4">
                  {cat.errors.slice(0, 5).map((error, idx) => (
                    <div key={idx} className="border-l-2 border-muted pl-3">
                      <p className="font-medium">
                        {error.codex_name} - {error.section_name}
                      </p>
                      <p className="text-muted-foreground text-xs truncate">
                        {error.message}
                      </p>
                    </div>
                  ))}
                  {cat.errors.length > 5 && (
                    <p className="text-muted-foreground text-xs">
                      ... and {cat.errors.length - 5} more
                    </p>
                  )}
                </div>
              </details>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
