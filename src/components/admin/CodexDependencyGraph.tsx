import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Circle } from "lucide-react";

interface CodexNode {
  id: string;
  name: string;
  dependsOn: string[];
  order: number;
}

export const CodexDependencyGraph = ({ refreshKey }: { refreshKey?: number }) => {
  const [nodes, setNodes] = useState<CodexNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGraph();
  }, [refreshKey]);

  const loadGraph = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('codex_prompts' as any)
      .select('id, codex_name, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (data) {
      // Fetch all dependencies from the junction table
      const { data: dependencyData } = await supabase
        .from('codex_prompt_dependencies' as any)
        .select('codex_prompt_id, depends_on_codex_id');

      // Create a map of codex IDs to names for dependency resolution
      const codexMap = new Map((data as any[]).map(d => [d.id, d.codex_name]));
      
      // Create a map of codex IDs to array of dependency names
      const dependencyMap = new Map<string, string[]>();
      (dependencyData || []).forEach((dep: any) => {
        const depName = codexMap.get(dep.depends_on_codex_id);
        if (depName) {
          const existing = dependencyMap.get(dep.codex_prompt_id) || [];
          dependencyMap.set(dep.codex_prompt_id, [...existing, depName]);
        }
      });
      
      const mapped = (data as any[]).map(d => ({
        id: d.id,
        name: d.codex_name,
        dependsOn: dependencyMap.get(d.id) || [],
        order: d.display_order
      }));
      setNodes(mapped);
    }
    setLoading(false);
  };

  // Group nodes by dependency levels
  const buildLevels = () => {
    const levels: CodexNode[][] = [];
    const processed = new Set<string>();
    const remaining = [...nodes];

    // Level 0: No dependencies
    const level0 = remaining.filter(n => n.dependsOn.length === 0);
    if (level0.length > 0) {
      levels.push(level0);
      level0.forEach(n => processed.add(n.name));
    }

    // Build subsequent levels
    while (remaining.length > processed.size) {
      const currentLevel = remaining.filter(
        n => !processed.has(n.name) && 
        n.dependsOn.every(dep => processed.has(dep))
      );
      
      if (currentLevel.length === 0) break; // Circular dependency or error
      
      levels.push(currentLevel);
      currentLevel.forEach(n => processed.add(n.name));
    }

    return levels;
  };

  const levels = buildLevels();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dependency Graph</CardTitle>
          <CardDescription>Loading dependency relationships...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (nodes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dependency Graph</CardTitle>
          <CardDescription>No active codexes found</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dependency Graph</CardTitle>
        <CardDescription>
          Visual representation of codex processing order and dependencies
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {levels.map((level, levelIndex) => (
            <div key={levelIndex} className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Level {levelIndex} {levelIndex === 0 && "(Independent)"}
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {level.map(node => (
                  <div
                    key={node.id}
                    className="relative border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Circle className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{node.name}</div>
                        {node.dependsOn.length > 0 && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <ArrowRight className="h-3 w-3" />
                            <span>Depends on: {node.dependsOn.join(', ')}</span>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          Order: {node.order}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {levels.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No codexes to display
          </div>
        )}

        <div className="mt-6 pt-6 border-t">
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Codexes at the same level can run in parallel</p>
            <p>• Codexes with dependencies wait for their parent to complete</p>
            <p>• Processing flows from Level 0 downwards</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
