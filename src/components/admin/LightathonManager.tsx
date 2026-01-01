import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Sparkles, Play, Users, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface EligibleUser {
  id: string;
  email: string;
  full_name: string;
  persona_run_id: string;
  persona_run_title: string;
  has_lightathon_codex: boolean;
  already_enrolled: boolean;
}

interface ActiveEnrollment {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  started_at: string;
  completed_days: number;
  current_day: number;
  is_active: boolean;
}

export const LightathonManager = () => {
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [activeEnrollments, setActiveEnrollments] = useState<ActiveEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingLightathon, setStartingLightathon] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get all persona runs
      const { data: personaRuns, error: runsError } = await supabase
        .from('persona_runs')
        .select('id, title, user_id, status');

      if (runsError) throw runsError;

      // Get all codexes that are "21 Days Lightathon" and ready
      const { data: lightathonCodexes, error: codexError } = await supabase
        .from('codexes')
        .select('id, persona_run_id')
        .ilike('codex_name', '%21 Days Lightathon%')
        .eq('status', 'ready');

      if (codexError) throw codexError;

      // Get all existing enrollments
      const { data: existingEnrollments, error: enrollError } = await supabase
        .from('lightathon_enrollments')
        .select('id, user_id, persona_run_id, started_at, is_active');

      if (enrollError) throw enrollError;

      // Get all user profiles
      const userIds = [...new Set((personaRuns || []).map(r => r.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);

      if (profilesError) throw profilesError;

      // Create lookup maps
      const codexRunIds = new Set((lightathonCodexes || []).map(c => c.persona_run_id));
      const enrollmentMap = new Map((existingEnrollments || []).map(e => [`${e.user_id}-${e.persona_run_id}`, e]));
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Build eligible users list
      const eligibleList: EligibleUser[] = [];
      
      for (const run of personaRuns || []) {
        const profile = profileMap.get(run.user_id);
        const hasLightathonCodex = codexRunIds.has(run.id);
        const enrollment = enrollmentMap.get(`${run.user_id}-${run.id}`);

        eligibleList.push({
          id: run.user_id,
          email: profile?.email || 'N/A',
          full_name: profile?.full_name || 'Unknown',
          persona_run_id: run.id,
          persona_run_title: run.title,
          has_lightathon_codex: hasLightathonCodex,
          already_enrolled: !!enrollment
        });
      }

      setEligibleUsers(eligibleList);

      // Build active enrollments list
      const enrollmentsList: ActiveEnrollment[] = [];
      
      for (const enrollment of existingEnrollments || []) {
        const profile = profileMap.get(enrollment.user_id);
        
        // Get progress for this enrollment
        const { data: progress } = await supabase
          .from('lightathon_daily_progress')
          .select('day_number, status')
          .eq('enrollment_id', enrollment.id);

        const completedDays = progress?.filter(p => p.status === 'completed').length || 0;
        const currentDay = progress?.find(p => p.status === 'unlocked')?.day_number || completedDays + 1;

        enrollmentsList.push({
          id: enrollment.id,
          user_id: enrollment.user_id,
          user_email: profile?.email || 'N/A',
          user_name: profile?.full_name || 'Unknown',
          started_at: enrollment.started_at,
          completed_days: completedDays,
          current_day: currentDay,
          is_active: enrollment.is_active
        });
      }

      setActiveEnrollments(enrollmentsList);
    } catch (error) {
      console.error('Error loading lightathon data:', error);
      toast.error('Failed to load Lightathon data');
    } finally {
      setLoading(false);
    }
  };

  const startLightathon = async (userId: string, personaRunId: string) => {
    setStartingLightathon(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await supabase.functions.invoke('admin-start-lightathon', {
        body: { userId, personaRunId }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to start Lightathon');
      }

      toast.success('Lightathon started successfully!');
      await loadData();
    } catch (error: any) {
      console.error('Error starting lightathon:', error);
      toast.error(error.message || 'Failed to start Lightathon');
    } finally {
      setStartingLightathon(null);
    }
  };

  const triggerDailyUnlock = async () => {
    try {
      const response = await supabase.functions.invoke('lightathon-daily-unlock');
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success(`Daily unlock completed: ${response.data.unlockedCount} users unlocked`);
      await loadData();
    } catch (error: any) {
      console.error('Error triggering daily unlock:', error);
      toast.error(error.message || 'Failed to trigger daily unlock');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const activeCount = activeEnrollments.filter(e => e.is_active).length;
  const completedCount = activeEnrollments.filter(e => e.completed_days === 21).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Eligible Users</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              {eligibleUsers.filter(u => u.has_lightathon_codex && !u.already_enrolled).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Lightathons</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {activeCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {completedCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Manual Daily Unlock */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Daily Unlock Control</CardTitle>
              <CardDescription>
                Manually trigger the daily unlock process (normally runs at 4:30 AM IST)
              </CardDescription>
            </div>
            <Button onClick={triggerDailyUnlock} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Trigger Daily Unlock
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Eligible Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Start Lightathon for Users
          </CardTitle>
          <CardDescription>
            Users with completed persona runs and 21 Days Lightathon codex
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Persona Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eligibleUsers.filter(u => u.has_lightathon_codex).map((user) => (
                <TableRow key={`${user.id}-${user.persona_run_id}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {user.persona_run_title}
                  </TableCell>
                  <TableCell>
                    {user.already_enrolled ? (
                      <Badge variant="secondary">Already Enrolled</Badge>
                    ) : (
                      <Badge variant="outline">Ready</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!user.already_enrolled && (
                      <Button
                        size="sm"
                        onClick={() => startLightathon(user.id, user.persona_run_id)}
                        disabled={startingLightathon === user.id}
                        className="gap-2"
                      >
                        {startingLightathon === user.id ? (
                          <LoadingSpinner />
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Start
                          </>
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {eligibleUsers.filter(u => u.has_lightathon_codex).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No eligible users found. Users need a completed persona run with the 21 Days Lightathon codex.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Active Enrollments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Active Lightathon Enrollments
          </CardTitle>
          <CardDescription>
            Monitor user progress through the 21-day journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeEnrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{enrollment.user_name}</p>
                      <p className="text-sm text-muted-foreground">{enrollment.user_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(enrollment.started_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-[150px]">
                      <Progress 
                        value={(enrollment.completed_days / 21) * 100} 
                        className="h-2 flex-1" 
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {enrollment.completed_days}/21
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {enrollment.completed_days === 21 ? (
                      <Badge className="bg-green-500">Completed</Badge>
                    ) : enrollment.is_active ? (
                      <Badge variant="secondary">Day {enrollment.current_day}</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {activeEnrollments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No Lightathon enrollments yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
