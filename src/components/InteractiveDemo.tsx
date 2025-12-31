import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Sparkles, FileText, Download, ArrowRight } from "lucide-react";
const steps = [{
  id: 1,
  title: "Answer Strategic Questions",
  description: "Share your coaching story through 20 carefully designed questions",
  icon: Sparkles,
  progress: 33,
  details: ["Tell us about your expertise", "Define your ideal client", "Share your unique approach", "Describe your transformation"]
}, {
  id: 2,
  title: "AI Generates Your Framework",
  description: "Watch as AI creates 170+ personalized sections across 11 codexes",
  icon: FileText,
  progress: 66,
  details: ["Positioning & Brand Strategy", "Audience & Market Analysis", "Offers & Pricing Framework", "Marketing & Growth Plans"]
}, {
  id: 3,
  title: "Download & Implement",
  description: "Export your complete framework as professional PDFs",
  icon: Download,
  progress: 100,
  details: ["Individual codex PDFs", "Master framework PDF", "Editable sections", "Ready to use immediately"]
}];
export const InteractiveDemo = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setActiveStep(prev => {
          if (prev < steps.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);
  const handlePlayDemo = () => {
    setActiveStep(0);
    setIsPlaying(true);
  };
  const currentStep = steps[activeStep];
  const StepIcon = currentStep.icon;
  return <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
      {/* Visual Demo Area */}
      <div className="order-2 lg:order-1">
        <Card className="glass-card border-primary/30 overflow-hidden">
          <CardContent className="p-0">
            {/* Progress Header */}
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">
                  Step {activeStep + 1} of {steps.length}
                </span>
                <span className="text-sm font-medium text-primary">
                  {currentStep.progress}% Complete
                </span>
              </div>
              <Progress value={currentStep.progress} className="h-2" />
            </div>

            {/* Step Content */}
            <div className="p-6 md:p-8 min-h-[400px] flex flex-col">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 animate-scale-in">
                  <StepIcon className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl md:text-2xl font-bold mb-2 animate-fade-in">
                    {currentStep.title}
                  </h3>
                  <p className="text-muted-foreground animate-fade-in">
                    {currentStep.description}
                  </p>
                </div>
              </div>

              {/* Step Details */}
              <div className="space-y-3 flex-1">
                {currentStep.details.map((detail, index) => <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 animate-fade-in" style={{
                animationDelay: `${index * 0.1}s`
              }}>
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm md:text-base">{detail}</span>
                  </div>)}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <div className="flex gap-2">
                  {steps.map((step, index) => <button key={step.id} onClick={() => {
                  setActiveStep(index);
                  setIsPlaying(false);
                }} className={`w-2 h-2 rounded-full transition-all ${index === activeStep ? "bg-primary w-8" : index < activeStep ? "bg-primary/50" : "bg-muted-foreground/20"}`} aria-label={`Go to step ${index + 1}`} />)}
                </div>
                {activeStep < steps.length - 1 && <Button variant="ghost" size="sm" onClick={() => setActiveStep(prev => prev + 1)} className="gap-2">
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Text Content */}
      <div className="order-1 lg:order-2 text-center lg:text-left">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
          See It In{" "}
          <span className="text-gradient-primary">Action</span>
        </h2>
        <p className="text-lg sm:text-xl text-muted-foreground mb-8 leading-relaxed">
          Watch how CodeXAlpha transforms your coaching story into a complete
          business framework. Each step is designed to extract your unique
          expertise and create actionable strategies.
        </p>

        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div className="text-left">
              <p className="font-semibold mb-1">Strategic Questions</p>
              <p className="text-sm text-muted-foreground">
                Carefully designed to capture your unique coaching approach
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div className="text-left">
              <p className="font-semibold mb-1">AI-Powered Generation</p>
              <p className="text-sm text-muted-foreground">
                Advanced AI creates personalized content in 10-15 minutes
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div className="text-left">
              <p className="font-semibold mb-1">Professional PDFs</p>
              <p className="text-sm text-muted-foreground">
                Download and implement your framework immediately
              </p>
            </div>
          </div>
        </div>

        <Button size="lg" onClick={handlePlayDemo} className="gap-2 animate-pulse-glow" disabled={isPlaying}>
          <Sparkles className="h-5 w-5" />
          {isPlaying ? "Playing Demo..." : "Play Interactive Demo"}
        </Button>
      </div>
    </div>;
};