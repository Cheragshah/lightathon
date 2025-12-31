import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Target, 
  Zap, 
  TrendingUp, 
  Sparkles, 
  Presentation, 
  GraduationCap, 
  Compass 
} from "lucide-react";
import { Link } from "react-router-dom";

interface CodexLibraryProps {
  personaId: string;
  codexes: {
    niche_clarity_codex?: any;
    systems_setup_codex?: any;
    life_automation_codex?: any;
    meta_ads_codex?: any;
    brand_story_codex?: any;
    webinar_selling_codex?: any;
    curriculum_design_codex?: any;
    rapid_clarity_codex?: any;
  };
  codexesGenerated: boolean;
  isRegenerating?: boolean;
}

const codexInfo = [
  {
    key: "niche_clarity_codex",
    title: "Niche Clarity & Business Strategy",
    description: "Your mission, talents, and unique positioning in the market",
    icon: Target,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    key: "systems_setup_codex",
    title: "Systems Setup",
    description: "Market analysis, funnel structure, and business systems",
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    key: "life_automation_codex",
    title: "Life Automation",
    description: "Goals, productivity focus, and income-producing activities",
    icon: Zap,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  {
    key: "meta_ads_codex",
    title: "Meta Ads Strategy",
    description: "Webinar hooks, ad angles, and conversion frameworks",
    icon: Presentation,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    key: "brand_story_codex",
    title: "Brand Story",
    description: "Your origin story, philosophy, and message to humanity",
    icon: Sparkles,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
  },
  {
    key: "webinar_selling_codex",
    title: "Webinar Selling",
    description: "Webinar structure, objection handling, and closing strategies",
    icon: Presentation,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    key: "curriculum_design_codex",
    title: "Curriculum Design",
    description: "Complete program structure from L0 to L5 with retreat concepts",
    icon: GraduationCap,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  {
    key: "rapid_clarity_codex",
    title: "Rapid Clarity",
    description: "Dharma alignment, perfect day vision, and posthumous biography",
    icon: Compass,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
  },
];

export const CodexLibrary = ({ personaId, codexes, codexesGenerated, isRegenerating }: CodexLibraryProps) => {
  if (!codexesGenerated && !isRegenerating) {
    return (
      <Card className="p-8 text-center">
        <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">CODEXes Not Yet Generated</h3>
        <p className="text-muted-foreground">
          Your CODEXes will be automatically generated when you complete the questionnaire.
        </p>
      </Card>
    );
  }

  const getWordCount = (codex: any) => {
    if (!codex) return 0;
    const text = JSON.stringify(codex);
    return text.split(/\s+/).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your CODEX Library</h2>
          <p className="text-muted-foreground">
            8 comprehensive guides for your coaching business
          </p>
        </div>
        <Button variant="outline">
          <BookOpen className="w-4 h-4 mr-2" />
          Download All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {codexInfo.map((info) => {
          const codex = codexes[info.key as keyof typeof codexes];
          const wordCount = getWordCount(codex);
          const Icon = info.icon;
          const isAvailable = !!codex && (codex.status === 'ready' || codex.status === 'ready_with_errors' || codex.completed_sections > 0);

          return (
            <Card key={info.key} className={`p-6 transition-all ${isAvailable ? 'hover:shadow-lg' : 'opacity-75'}`}>
              <div className={`w-12 h-12 rounded-lg ${info.bgColor} flex items-center justify-center mb-4`}>
                <Icon className={`w-6 h-6 ${info.color}`} />
              </div>
              
              <h3 className="font-semibold text-lg mb-2">{info.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{info.description}</p>
              
              {isAvailable ? (
                <>
                  <div className="flex gap-2 mb-4">
                    <Badge variant="secondary">
                      {wordCount.toLocaleString()} words
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Complete
                    </Badge>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button asChild className="flex-1" size="sm">
                      <Link to={`/persona/${personaId}/codex/${info.key}`}>
                        View
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm">
                      PDF
                    </Button>
                  </div>
                </>
              ) : isRegenerating ? (
                <>
                  <Badge variant="outline" className="mb-4 bg-blue-50 text-blue-700 border-blue-200">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                      Generating...
                    </div>
                  </Badge>
                  <div className="h-20 bg-muted/50 rounded animate-pulse"></div>
                </>
              ) : (
                <Badge variant="outline">Not Available</Badge>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
