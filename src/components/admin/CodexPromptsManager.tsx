import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash2, Copy, Network, GitBranch, Download, History } from "lucide-react";
import { exportCodexConfigurations } from "@/utils/exportCodexData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { EditCodexDialog } from "./EditCodexDialog";
import { BulkDependencyDialog } from "./BulkDependencyDialog";
import { CodexDependencyGraph } from "./CodexDependencyGraph";
import { CodexDependencyDetailsDialog } from "./CodexDependencyDetailsDialog";
import { BulkQuestionMappingDialog } from "./BulkQuestionMappingDialog";
import { CodexVersionHistoryDialog } from "./CodexVersionHistoryDialog";
import { BulkCodexActions } from "./BulkCodexActions";

export const CodexPromptsManager = () => {
  const [codexes, setCodexes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCodex, setEditingCodex] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showDependencyGraph, setShowDependencyGraph] = useState(false);
  const [graphRefreshKey, setGraphRefreshKey] = useState(0);
  const [showDependencyDetails, setShowDependencyDetails] = useState(false);
  const [selectedCodexForDetails, setSelectedCodexForDetails] = useState<any>(null);
  const [showBulkQuestionMapping, setShowBulkQuestionMapping] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedCodexForHistory, setSelectedCodexForHistory] = useState<any>(null);
  const [selectedCodexIds, setSelectedCodexIds] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadCodexes();
  }, []);

  const loadCodexes = async () => {
    const { data: codexData, error } = await supabase
      .from('codex_prompts' as any)
      .select(`
        *,
        sections:codex_section_prompts(count)
      `)
      .order('display_order', { ascending: true });
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch question counts for all codexes
    const { data: questionMappings } = await supabase
      .from('codex_question_mappings' as any)
      .select('codex_prompt_id');

    // Create a map of codex IDs to question counts
    const questionCountMap = new Map<string, number>();
    (questionMappings || []).forEach((mapping: any) => {
      const count = questionCountMap.get(mapping.codex_prompt_id) || 0;
      questionCountMap.set(mapping.codex_prompt_id, count + 1);
    });

    // Fetch all dependencies from the junction table
    const { data: dependencyData } = await supabase
      .from('codex_prompt_dependencies' as any)
      .select('codex_prompt_id, depends_on_codex_id');

    // Create a map of codex IDs to names for dependency resolution
    const codexMap = new Map((codexData || []).map((c: any) => [c.id, c.codex_name]));
    
    // Create a map of codex IDs to array of dependency names
    const dependencyMap = new Map<string, string[]>();
    (dependencyData || []).forEach((dep: any) => {
      const depName = codexMap.get(dep.depends_on_codex_id);
      if (depName) {
        const existing = dependencyMap.get(dep.codex_prompt_id) || [];
        dependencyMap.set(dep.codex_prompt_id, [...existing, depName]);
      }
    });
    
    // Add dependency names AND question counts to each codex
    const enrichedData = (codexData || []).map((codex: any) => ({
      ...codex,
      dependency_names: dependencyMap.get(codex.id) || [],
      question_count: questionCountMap.get(codex.id) || 0
    }));
    
    setCodexes(enrichedData);
    setLoading(false);
  };

  const handleToggleActive = async (codexId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('codex_prompts' as any)
      .update({ is_active: !currentStatus } as any)
      .eq('id', codexId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: `Codex ${!currentStatus ? 'activated' : 'deactivated'}` });
      loadCodexes();
    }
  };

  const handleDuplicate = async (codex: any) => {
    const { id, created_at, updated_at, ...codexData } = codex;
    
    const { data: newCodex, error } = await supabase
      .from('codex_prompts' as any)
      .insert({
        ...codexData,
        codex_name: `${codexData.codex_name} (Copy)`,
        is_active: false,
        display_order: (codexes.length || 0) + 1
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // Duplicate sections
    const { data: sections } = await supabase
      .from('codex_section_prompts' as any)
      .select('*')
      .eq('codex_prompt_id', codex.id);

    if (sections && sections.length > 0) {
      const newSections = sections.map(({ id, created_at, updated_at, ...section }: any) => ({
        ...section,
        codex_prompt_id: (newCodex as any).id
      }));

      await supabase.from('codex_section_prompts' as any).insert(newSections as any);
    }

    toast({ title: "Duplicated", description: "Codex and all sections duplicated successfully" });
    loadCodexes();
  };

  const handleDelete = async (codexId: string, codexName: string) => {
    if (!confirm(`Are you sure you want to delete "${codexName}"? This will also delete all its sections.`)) {
      return;
    }

    const { error } = await supabase
      .from('codex_prompts' as any)
      .delete()
      .eq('id', codexId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Codex deleted successfully" });
      loadCodexes();
    }
  };

  const handleExport = async () => {
    const result = await exportCodexConfigurations();
    if (result.success) {
      toast({ title: "Exported", description: "Codex configurations exported successfully" });
    } else {
      toast({ title: "Error", description: "Failed to export configurations", variant: "destructive" });
    }
  };

  const filteredCodexes = codexes.filter(codex =>
    codex.codex_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCodexSelection = (codexId: string) => {
    setSelectedCodexIds(prev =>
      prev.includes(codexId)
        ? prev.filter(id => id !== codexId)
        : [...prev, codexId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCodexIds.length === filteredCodexes.length) {
      setSelectedCodexIds([]);
    } else {
      setSelectedCodexIds(filteredCodexes.map(c => c.id));
    }
  };

  if (loading) return <Loader2 className="animate-spin" />;

  return (
    <div className="space-y-6">
      {showDependencyGraph && <CodexDependencyGraph refreshKey={graphRefreshKey} />}
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Codex Prompts Management</CardTitle>
              <CardDescription>Manage all 19 codex prompts, sections, and word counts</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDependencyGraph(!showDependencyGraph)}>
                <Network className="mr-2 h-4 w-4" />
                {showDependencyGraph ? 'Hide' : 'Show'} Graph
              </Button>
              <Button variant="outline" onClick={() => setShowBulkDialog(true)}>
                <GitBranch className="mr-2 h-4 w-4" />
                Bulk Dependencies
              </Button>
              <Button variant="outline" onClick={() => setShowBulkQuestionMapping(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Bulk Question Mapping
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create New Codex
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search codexes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedCodexIds.length === filteredCodexes.length && filteredCodexes.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Codex Name</TableHead>
                <TableHead>Sections</TableHead>
                <TableHead>Dependencies</TableHead>
                <TableHead>Word Count Range</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCodexes.map((codex) => (
                <TableRow key={codex.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedCodexIds.includes(codex.id)}
                      onCheckedChange={() => toggleCodexSelection(codex.id)}
                    />
                  </TableCell>
                  <TableCell>{codex.display_order}</TableCell>
                  <TableCell className="font-medium">{codex.codex_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{codex.sections?.[0]?.count || 0} sections</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge 
                        variant="outline" 
                        className="text-xs cursor-pointer hover:bg-muted"
                        onClick={() => {
                          setSelectedCodexForDetails(codex);
                          setShowDependencyDetails(true);
                        }}
                      >
                        {codex.question_count || 0} questions
                      </Badge>
                      
                      {codex.depends_on_transcript && (
                        <Badge variant="secondary" className="text-xs block">
                          📄 Uses Transcript
                        </Badge>
                      )}
                      
                      {codex.dependency_names && codex.dependency_names.length > 0 && (
                        <Badge variant="secondary" className="text-xs block">
                          → Depends on: {codex.dependency_names.join(', ')}
                        </Badge>
                      )}
                      
                      {!codex.question_count && (!codex.dependency_names || codex.dependency_names.length === 0) && !codex.depends_on_transcript && (
                        <span className="text-xs text-muted-foreground">No dependencies</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{codex.word_count_min} - {codex.word_count_max}</TableCell>
                  <TableCell>
                    <Switch
                      checked={codex.is_active}
                      onCheckedChange={() => handleToggleActive(codex.id, codex.is_active)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => {
                          setSelectedCodexForHistory(codex);
                          setShowVersionHistory(true);
                        }}
                        title="View version history"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingCodex(codex)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDuplicate(codex)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleDelete(codex.id, codex.codex_name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <BulkCodexActions
        selectedCodexIds={selectedCodexIds}
        codexes={codexes}
        onClearSelection={() => setSelectedCodexIds([])}
        onComplete={() => {
          loadCodexes();
          setGraphRefreshKey(prev => prev + 1);
        }}
      />

      {editingCodex && (
        <EditCodexDialog
          codex={editingCodex}
          open={!!editingCodex}
          onClose={() => {
            setEditingCodex(null);
            loadCodexes();
            setGraphRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {showCreateDialog && (
        <EditCodexDialog
          codex={null}
          open={showCreateDialog}
          onClose={() => {
            setShowCreateDialog(false);
            loadCodexes();
            setGraphRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {showBulkDialog && (
        <BulkDependencyDialog
          open={showBulkDialog}
          onClose={() => setShowBulkDialog(false)}
          onSuccess={() => {
            loadCodexes();
            setGraphRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {showDependencyDetails && selectedCodexForDetails && (
        <CodexDependencyDetailsDialog
          codex={selectedCodexForDetails}
          open={showDependencyDetails}
          onClose={() => {
            setShowDependencyDetails(false);
            setSelectedCodexForDetails(null);
          }}
        />
      )}

      {showBulkQuestionMapping && (
        <BulkQuestionMappingDialog
          open={showBulkQuestionMapping}
          onClose={() => setShowBulkQuestionMapping(false)}
          onSuccess={() => {
            loadCodexes();
            setGraphRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {showVersionHistory && selectedCodexForHistory && (
        <CodexVersionHistoryDialog
          codex={selectedCodexForHistory}
          open={showVersionHistory}
          onClose={() => {
            setShowVersionHistory(false);
            setSelectedCodexForHistory(null);
            loadCodexes();
          }}
        />
      )}
    </div>
  );
};
