import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GripVertical, Pencil, Trash2 } from "lucide-react";

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

interface SortableQuestionRowProps {
  question: Question;
  isSelected: boolean;
  onToggleSelect: (questionId: string) => void;
  onEdit: (question: Question) => void;
  onDelete: (questionId: string) => void;
  onToggleActive: (questionId: string, currentStatus: boolean) => void;
}

export function SortableQuestionRow({
  question,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  onToggleActive,
}: SortableQuestionRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(question.id)}
        />
      </TableCell>
      <TableCell className="w-12">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell>{question.display_order}</TableCell>
      <TableCell>
        <Badge variant="outline">{question.category_name}</Badge>
      </TableCell>
      <TableCell className="max-w-md truncate">{question.question_text}</TableCell>
      <TableCell>
        {question.is_required ? (
          <Badge variant="default">Required</Badge>
        ) : (
          <Badge variant="secondary">Optional</Badge>
        )}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleActive(question.id, question.is_active)}
        >
          {question.is_active ? (
            <Badge variant="default">Active</Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          )}
        </Button>
      </TableCell>
      <TableCell className="text-right space-x-2">
        <Button variant="ghost" size="sm" onClick={() => onEdit(question)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(question.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
