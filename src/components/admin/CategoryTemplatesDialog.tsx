import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, FileText, Briefcase, Heart, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CategoryTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: typeof FileText;
  categories: {
    name: string;
    description: string;
    questions: {
      text: string;
      helper_text?: string;
      is_required: boolean;
    }[];
  }[];
}

const TEMPLATES: Template[] = [
  {
    id: "life-coach",
    name: "Life Coach Assessment",
    description: "Comprehensive questions for life coaching clients covering goals, values, and personal growth",
    icon: Target,
    categories: [
      {
        name: "Personal Background",
        description: "Understanding the client's history and current situation",
        questions: [
          { text: "Tell us about your current life situation and what brought you here today?", is_required: true },
          { text: "What are your core values and what matters most to you?", is_required: true },
          { text: "Describe a typical day in your life.", is_required: false },
        ],
      },
      {
        name: "Goals & Vision",
        description: "Exploring what the client wants to achieve",
        questions: [
          { text: "What are your top 3 goals for the next 6-12 months?", is_required: true },
          { text: "Where do you see yourself in 5 years?", helper_text: "Think big - career, relationships, lifestyle", is_required: true },
          { text: "What does success look like to you?", is_required: false },
        ],
      },
      {
        name: "Challenges & Obstacles",
        description: "Identifying barriers to progress",
        questions: [
          { text: "What obstacles or challenges are currently holding you back?", is_required: true },
          { text: "What patterns or habits would you like to change?", is_required: false },
        ],
      },
    ],
  },
  {
    id: "business-coach",
    name: "Business Coach Assessment",
    description: "Questions focused on entrepreneurship, leadership, and business growth",
    icon: Briefcase,
    categories: [
      {
        name: "Business Overview",
        description: "Current state of the business",
        questions: [
          { text: "Describe your business and what you offer.", is_required: true },
          { text: "How long have you been in business and what's your current revenue?", is_required: true },
          { text: "What are your biggest business strengths?", is_required: false },
        ],
      },
      {
        name: "Business Goals",
        description: "Growth objectives and targets",
        questions: [
          { text: "What are your revenue goals for the next year?", is_required: true },
          { text: "What does your ideal business look like 3 years from now?", is_required: true },
        ],
      },
      {
        name: "Leadership & Team",
        description: "Management and team dynamics",
        questions: [
          { text: "Describe your leadership style and management approach.", is_required: true },
          { text: "What challenges do you face with your team or in hiring?", is_required: false },
        ],
      },
    ],
  },
  {
    id: "wellness-coach",
    name: "Wellness Coach Assessment",
    description: "Health, fitness, and wellness-focused questions for holistic coaching",
    icon: Heart,
    categories: [
      {
        name: "Current Health Status",
        description: "Understanding physical and mental health baseline",
        questions: [
          { text: "Describe your current health and energy levels.", is_required: true },
          { text: "What does your typical diet and exercise routine look like?", is_required: true },
          { text: "How would you rate your stress levels and sleep quality?", is_required: false },
        ],
      },
      {
        name: "Wellness Goals",
        description: "Health and wellness objectives",
        questions: [
          { text: "What are your top wellness goals?", helper_text: "e.g., weight loss, better sleep, stress management", is_required: true },
          { text: "What does optimal health look like to you?", is_required: true },
        ],
      },
      {
        name: "Lifestyle & Habits",
        description: "Daily habits and routines",
        questions: [
          { text: "What healthy habits would you like to develop or improve?", is_required: true },
          { text: "What unhealthy habits or patterns would you like to change?", is_required: false },
        ],
      },
    ],
  },
];

export function CategoryTemplatesDialog({
  open,
  onOpenChange,
  onImportComplete,
}: CategoryTemplatesDialogProps) {
  const [importing, setImporting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleImportTemplate = async (template: Template) => {
    if (!confirm(`Import "${template.name}" template? This will create ${template.categories.length} categories with their questions.`)) {
      return;
    }

    setImporting(true);
    setSelectedTemplate(template.id);

    try {
      // Get the highest existing display_order for categories
      const { data: existingCategories } = await supabase
        .from("questionnaire_categories")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1);

      let categoryOrder = (existingCategories?.[0]?.display_order || 0) + 1;

      // Import each category with its questions
      for (const category of template.categories) {
        // Create category
        const { data: newCategory, error: categoryError } = await supabase
          .from("questionnaire_categories")
          .insert({
            category_name: category.name,
            description: category.description,
            display_order: categoryOrder,
            is_active: true,
          })
          .select()
          .single();

        if (categoryError) throw categoryError;

        // Get highest question display_order
        const { data: existingQuestions } = await supabase
          .from("questionnaire_questions")
          .select("display_order")
          .order("display_order", { ascending: false })
          .limit(1);

        let questionOrder = (existingQuestions?.[0]?.display_order || 0) + 1;

        // Create questions for this category
        for (const question of category.questions) {
          const { error: questionError } = await supabase
            .from("questionnaire_questions")
            .insert({
              category_id: newCategory.id,
              question_text: question.text,
              helper_text: question.helper_text || null,
              is_required: question.is_required,
              display_order: questionOrder,
              is_active: true,
            });

          if (questionError) throw questionError;
          questionOrder++;
        }

        categoryOrder++;
      }

      toast.success(`Successfully imported "${template.name}" template`);
      onImportComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error importing template:", error);
      toast.error("Failed to import template");
    } finally {
      setImporting(false);
      setSelectedTemplate(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Category Templates</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choose a template to quickly import pre-built categories and questions
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {TEMPLATES.map((template) => {
            const Icon = template.icon;
            const isImporting = importing && selectedTemplate === template.id;

            return (
              <Card key={template.id} className="relative">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {template.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <span className="font-medium">Includes:</span>
                      <ul className="mt-2 space-y-1 ml-4">
                        {template.categories.map((cat, idx) => (
                          <li key={idx} className="text-muted-foreground">
                            • {cat.name} ({cat.questions.length} questions)
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button
                      onClick={() => handleImportTemplate(template)}
                      disabled={importing}
                      className="w-full"
                    >
                      {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Import Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
