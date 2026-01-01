import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Sparkles, Lock, CheckCircle2, ArrowLeft, Send, Calendar, Trophy, ChevronDown, ChevronRight } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageTransition } from "@/components/PageTransition";
import { LightathonLeaderboard } from "@/components/LightathonLeaderboard";

interface DailyProgress {
  id: string;
  day_number: number;
  mission_title: string;
  mission_content: string;
  status: 'locked' | 'unlocked' | 'completed';
  user_reflection: string | null;
  unlocked_at: string | null;
  completed_at: string | null;
}

interface Enrollment {
  id: string;
  user_id: string;
  persona_run_id: string;
  started_at: string;
  is_active: boolean;
}

const Lightathon = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>([]);
  const [currentDay, setCurrentDay] = useState<DailyProgress | null>(null);
  const [reflection, setReflection] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  useEffect(() => {
    loadLightathonData();
  }, [enrollmentId]);

  const loadLightathonData = async () => {
    if (!enrollmentId) {
      navigate('/dashboard');
      return;
    }

    try {
      // Load enrollment
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('lightathon_enrollments')
        .select('*')
        .eq('id', enrollmentId)
        .single();

      if (enrollmentError || !enrollmentData) {
        toast.error('Lightathon enrollment not found');
        navigate('/dashboard');
        return;
      }

      setEnrollment(enrollmentData);

      // Load all daily progress
      const { data: progressData, error: progressError } = await supabase
        .from('lightathon_daily_progress')
        .select('*')
        .eq('enrollment_id', enrollmentId)
        .order('day_number', { ascending: true });

      if (progressError) {
        console.error('Error loading progress:', progressError);
        toast.error('Failed to load daily progress');
        return;
      }

      setDailyProgress(progressData as DailyProgress[] || []);

      // Find current unlocked day
      const unlockedDay = (progressData as DailyProgress[])?.find(p => p.status === 'unlocked');
      if (unlockedDay) {
        setCurrentDay(unlockedDay);
        setReflection(unlockedDay.user_reflection || "");
      }
    } catch (error) {
      console.error('Error loading lightathon data:', error);
      toast.error('Failed to load Lightathon');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDay = async () => {
    if (!currentDay || !reflection.trim()) {
      toast.error('Please share your reflection before completing');
      return;
    }

    setSubmitting(true);
    const completedDayNumber = currentDay.day_number;
    
    try {
      const { error } = await supabase
        .from('lightathon_daily_progress')
        .update({
          status: 'completed',
          user_reflection: reflection.trim(),
          completed_at: new Date().toISOString()
        })
        .eq('id', currentDay.id);

      if (error) throw error;

      toast.success(`Day ${completedDayNumber} completed! 🎉`);
      
      // Reload data
      await loadLightathonData();
      
      // After reload, re-select the just-completed day to show review
      const { data: freshProgress } = await supabase
        .from('lightathon_daily_progress')
        .select('*')
        .eq('enrollment_id', enrollmentId)
        .eq('day_number', completedDayNumber)
        .single();
      
      if (freshProgress) {
        setCurrentDay(freshProgress as DailyProgress);
        setReflection(freshProgress.user_reflection || "");
      }
    } catch (error) {
      console.error('Error completing day:', error);
      toast.error('Failed to complete day');
    } finally {
      setSubmitting(false);
    }
  };

  const selectDay = (day: DailyProgress) => {
    if (day.status !== 'locked') {
      setCurrentDay(day);
      setReflection(day.user_reflection || "");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const completedDays = dailyProgress.filter(p => p.status === 'completed').length;
  const progressPercentage = (completedDays / 21) * 100;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'unlocked':
        return <Sparkles className="h-4 w-4 text-primary" />;
      default:
        return <Lock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 border-green-500/40 text-green-600';
      case 'unlocked':
        return 'bg-primary/20 border-primary/40 text-primary';
      default:
        return 'bg-muted border-muted-foreground/20 text-muted-foreground';
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Navigation isAuthenticated={true} />
        <main className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="gap-2 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>

            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold">Lightathon</h1>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                21 Days Journey
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Transform your energy through daily practices
            </p>
          </div>

          {/* Progress Overview */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">{completedDays}/21 days</span>
              </div>
              <Progress value={progressPercentage} className="h-3 mb-4" />
              
              {/* Day Timeline */}
              <div className="flex flex-wrap gap-2">
                {dailyProgress.map((day) => (
                  <button
                    key={day.day_number}
                    onClick={() => selectDay(day)}
                    disabled={day.status === 'locked'}
                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center font-medium text-sm transition-all
                      ${getStatusColor(day.status)}
                      ${day.status !== 'locked' ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-60'}
                      ${currentDay?.day_number === day.day_number ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    title={`Day ${day.day_number}: ${day.status}`}
                  >
                    {day.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : day.status === 'unlocked' ? (
                      day.day_number
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Current Day Mission */}
          {currentDay ? (
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(currentDay.status)}
                    <CardTitle>{currentDay.mission_title}</CardTitle>
                  </div>
                  <Badge variant={currentDay.status === 'completed' ? 'default' : 'secondary'}>
                    {currentDay.status === 'completed' ? 'Completed' : 'In Progress'}
                  </Badge>
                </div>
                {currentDay.unlocked_at && (
                  <CardDescription className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Unlocked: {new Date(currentDay.unlocked_at).toLocaleDateString()}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Completion Success Banner */}
                {currentDay.status === 'completed' && (
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Day {currentDay.day_number} Completed!</span>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                      Review your mission and reflection below. {currentDay.day_number < 21 && "Your next mission will unlock at 4:30 AM IST."}
                    </p>
                  </div>
                )}
                {/* Mission Content */}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap">
                    {currentDay.mission_content || 'Complete your daily Lightathon exercise.'}
                  </div>
                </div>

                {/* Reflection Section */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    Share Your Reflection
                    {currentDay.status !== 'completed' && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </label>
                  <Textarea
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="Share your thoughts, insights, and experiences from today's practice..."
                    className="min-h-[120px]"
                    disabled={currentDay.status === 'completed'}
                  />
                  {currentDay.status === 'completed' && currentDay.completed_at && (
                    <p className="text-xs text-muted-foreground">
                      Completed on {new Date(currentDay.completed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Complete Button */}
                {currentDay.status === 'unlocked' && (
                  <Button
                    onClick={handleCompleteDay}
                    disabled={submitting || !reflection.trim()}
                    className="w-full gap-2"
                  >
                    {submitting ? (
                      <LoadingSpinner />
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Complete Day {currentDay.day_number}
                      </>
                    )}
                  </Button>
                )}

                {/* View Next Day Button */}
                {currentDay.status === 'completed' && currentDay.day_number < 21 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const nextDay = dailyProgress.find(d => d.day_number === currentDay.day_number + 1);
                      if (nextDay && nextDay.status === 'unlocked') {
                        selectDay(nextDay);
                      } else {
                        toast.info('Your next mission will unlock at 4:30 AM IST');
                      }
                    }}
                    className="w-full gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    View Next Mission Status
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : completedDays === 21 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Sparkles className="h-16 w-16 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Congratulations! 🎉</h2>
                <p className="text-muted-foreground">
                  You've completed all 21 days of Lightathon!
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Lock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Waiting for Next Day</h2>
                <p className="text-muted-foreground">
                  Your next mission will unlock at 4:30 AM IST
                </p>
              </CardContent>
            </Card>
          )}

          {/* Leaderboard Section */}
          <Collapsible open={isLeaderboardOpen} onOpenChange={setIsLeaderboardOpen} className="mt-6">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span>View Leaderboard</span>
                </div>
                {isLeaderboardOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <LightathonLeaderboard />
            </CollapsibleContent>
          </Collapsible>
        </main>
      </div>
    </PageTransition>
  );
};

export default Lightathon;
