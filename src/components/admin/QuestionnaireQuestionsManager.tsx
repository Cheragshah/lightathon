import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Search, GripVertical, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditQuestionDialog } from "./EditQuestionDialog";
import { EditCategoryDialog } from "./EditCategoryDialog";
import { CategoryTemplatesDialog } from "./CategoryTemplatesDialog";
import { BulkQuestionActions } from "./BulkQuestionActions";
import { QuestionImportExport } from "./QuestionImportExport";
import { SortableCategoryRow } from "./SortableCategoryRow";
import { SortableQuestionRow } from "./SortableQuestionRow";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Category {
  id: string;
  category_name: string;
  display_order: number;
  description: string;
  is_active: boolean;
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

export function QuestionnaireQuestionsManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [editCategoryDialogOpen, setEditCategoryDialogOpen] = useState(false);
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("questionnaire_categories")
        .select("*")
        .order("display_order");

      if (categoriesError) throw categoriesError;

      const { data: questionsData, error: questionsError } = await supabase
        .from("questionnaire_questions")
        .select("*")
        .order("display_order");

      if (questionsError) throw questionsError;

      const questionsWithCategory = questionsData.map(q => ({
        ...q,
        category_name: categoriesData.find(c => c.id === q.category_id)?.category_name
      }));

      setCategories(categoriesData || []);
      setQuestions(questionsWithCategory || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const { error } = await supabase
        .from("questionnaire_questions")
        .delete()
        .eq("id", questionId);

      if (error) throw error;

      toast.success("Question deleted successfully");
      loadData();
    } catch (error: any) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question");
    }
  };

  const handleToggleActive = async (questionId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("questionnaire_questions")
        .update({ is_active: !currentStatus })
        .eq("id", questionId);

      if (error) throw error;

      toast.success(`Question ${!currentStatus ? "activated" : "deactivated"}`);
      loadData();
    } catch (error: any) {
      console.error("Error toggling question:", error);
      toast.error("Failed to update question");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      // Check if category has questions
      const { data: questions } = await supabase
        .from("questionnaire_questions")
        .select("id")
        .eq("category_id", categoryId);

      if (questions && questions.length > 0) {
        toast.error("Cannot delete category with existing questions");
        return;
      }

      const { error } = await supabase
        .from("questionnaire_categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;

      toast.success("Category deleted successfully");
      loadData();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    } finally {
      setDeleteCategoryId(null);
    }
  };

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = categories.findIndex((cat) => cat.id === active.id);
    const newIndex = categories.findIndex((cat) => cat.id === over.id);

    const reorderedCategories = arrayMove(categories, oldIndex, newIndex);

    // Optimistically update UI
    setCategories(reorderedCategories);

    try {
      // Update display_order for all affected categories
      const updates = reorderedCategories.map((cat, index) => ({
        id: cat.id,
        display_order: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("questionnaire_categories")
          .update({ display_order: update.display_order })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast.success("Category order updated");
    } catch (error: any) {
      console.error("Error updating category order:", error);
      toast.error("Failed to update category order");
      // Reload to revert on error
      loadData();
    }
  };

  const handleQuestionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = filteredQuestions.findIndex((q) => q.id === active.id);
    const newIndex = filteredQuestions.findIndex((q) => q.id === over.id);

    const reorderedQuestions = arrayMove(filteredQuestions, oldIndex, newIndex);

    // Optimistically update UI
    const newQuestions = questions.map(q => {
      const reordered = reorderedQuestions.find(rq => rq.id === q.id);
      return reordered || q;
    });
    setQuestions(newQuestions);

    try {
      // Update display_order for all affected questions
      const updates = reorderedQuestions.map((q, index) => ({
        id: q.id,
        display_order: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("questionnaire_questions")
          .update({ display_order: update.display_order })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast.success("Question order updated");
      loadData();
    } catch (error: any) {
      console.error("Error updating question order:", error);
      toast.error("Failed to update question order");
      // Reload to revert on error
      loadData();
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryFilter === "all" || q.category_id === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestionIds(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedQuestionIds.length === filteredQuestions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(filteredQuestions.map(q => q.id));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const maxDisplayOrder = categories.reduce((max, cat) => Math.max(max, cat.display_order), 0);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="questions" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {/* Questions Tab */}
        <TabsContent value="questions" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Questionnaire Questions</CardTitle>
                <QuestionImportExport
                  questions={questions}
                  categories={categories}
                  onImportComplete={loadData}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                  ))}
                </select>
                <Button onClick={() => {
                  setSelectedQuestion(null);
                  setEditDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>

              <div className="rounded-md border">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleQuestionDragEnd}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedQuestionIds.length === filteredQuestions.length && filteredQuestions.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Question</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SortableContext
                        items={filteredQuestions.map((q) => q.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {filteredQuestions.map((question) => (
                          <SortableQuestionRow
                            key={question.id}
                            question={question}
                            isSelected={selectedQuestionIds.includes(question.id)}
                            onToggleSelect={toggleQuestionSelection}
                            onEdit={(q) => {
                              setSelectedQuestion(q);
                              setEditDialogOpen(true);
                            }}
                            onDelete={handleDelete}
                            onToggleActive={handleToggleActive}
                          />
                        ))}
                      </SortableContext>
                    </TableBody>
                  </Table>
                </DndContext>
              </div>
            </CardContent>
          </Card>

          <BulkQuestionActions
            selectedQuestionIds={selectedQuestionIds}
            categories={categories}
            questions={questions}
            onClearSelection={() => setSelectedQuestionIds([])}
            onComplete={loadData}
          />
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Question Categories</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage categories for organizing questionnaire questions
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setTemplatesDialogOpen(true)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Import Template
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedCategory(null);
                      setEditCategoryDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleCategoryDragEnd}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Category Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SortableContext
                        items={categories.map((cat) => cat.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {categories.map((category) => (
                          <SortableCategoryRow
                            key={category.id}
                            category={category}
                            onEdit={(cat) => {
                              setSelectedCategory(cat);
                              setEditCategoryDialogOpen(true);
                            }}
                            onDelete={(id) => setDeleteCategoryId(id)}
                          />
                        ))}
                      </SortableContext>
                    </TableBody>
                  </Table>
                </DndContext>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EditQuestionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        question={selectedQuestion}
        categories={categories}
        onSave={loadData}
      />

      <EditCategoryDialog
        open={editCategoryDialogOpen}
        onOpenChange={setEditCategoryDialogOpen}
        category={selectedCategory}
        onSave={loadData}
        maxDisplayOrder={maxDisplayOrder}
      />

      <CategoryTemplatesDialog
        open={templatesDialogOpen}
        onOpenChange={setTemplatesDialogOpen}
        onImportComplete={loadData}
      />

      <AlertDialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteCategoryId && handleDeleteCategory(deleteCategoryId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
