import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Lock, CheckCircle2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface LightathonEnrollment {
  id: string;
  persona_run_id: string;
  started_at: string;
  is_active: boolean;
}

interface DailyProgress {
  day_number: number;
  status: 'locked' | 'unlocked' | 'completed';
}

interface LightathonCardProps {
  userId: string;
  personaRunId: string;
}

export const LightathonCard = ({ userId, personaRunId }: LightathonCardProps) => {
  const [enrollment, setEnrollment] = useState<LightathonEnrollment | null>(null);
  const [progress, setProgress] = useState<DailyProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadEnrollment();
  }, [userId, personaRunId]);

  const loadEnrollment = async () => {
    try {
      // Check for active enrollment
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('lightathon_enrollments')
        .select('*')
        .eq('user_id', userId)
        .eq('persona_run_id', personaRunId)
        .eq('is_active', true)
        .maybeSingle();

      if (enrollmentError) {
        console.error('Error loading enrollment:', enrollmentError);
        setLoading(false);
        return;
      }

      if (!enrollmentData) {
        setLoading(false);
        return;
      }

      setEnrollment(enrollmentData);

      // Load daily progress
      const { data: progressData, error: progressError } = await supabase
        .from('lightathon_daily_progress')
        .select('day_number, status')
        .eq('enrollment_id', enrollmentData.id)
        .order('day_number', { ascending: true });

      if (progressError) {
        console.error('Error loading progress:', progressError);
      } else {
        setProgress(progressData as DailyProgress[] || []);
      }
    } catch (error) {
      console.error('Error in loadEnrollment:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!enrollment) {
    return null;
  }

  const completedDays = progress.filter(p => p.status === 'completed').length;
  const currentDay = progress.find(p => p.status === 'unlocked')?.day_number || completedDays + 1;
  const progressPercentage = (completedDays / 21) * 100;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'unlocked':
        return <Sparkles className="h-3 w-3 text-primary animate-pulse" />;
      default:
        return <Lock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base sm:text-lg">Lightathon</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Day {currentDay} of 21
          </Badge>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          21 Days to Transform Your Energy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{completedDays}/21 days</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Mini progress dots */}
        <div className="flex flex-wrap gap-1">
          {progress.slice(0, 21).map((day) => (
            <div
              key={day.day_number}
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium
                ${day.status === 'completed' ? 'bg-green-500/20 text-green-600' : 
                  day.status === 'unlocked' ? 'bg-primary/20 text-primary' : 
                  'bg-muted text-muted-foreground'}`}
              title={`Day ${day.day_number}: ${day.status}`}
            >
              {getStatusIcon(day.status)}
            </div>
          ))}
        </div>

        <Button 
          onClick={() => navigate(`/lightathon/${enrollment.id}`)}
          className="w-full gap-2"
          variant={progress.some(p => p.status === 'unlocked') ? 'default' : 'outline'}
        >
          {progress.some(p => p.status === 'unlocked') ? (
            <>
              Continue Day {currentDay}
              <ArrowRight className="h-4 w-4" />
            </>
          ) : completedDays === 21 ? (
            'Lightathon Complete! 🎉'
          ) : (
            'View Progress'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
