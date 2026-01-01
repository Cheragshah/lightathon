import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Flame, Calendar, Users, Medal } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface LeaderboardEntry {
  userId: string;
  userName: string;
  photoUrl: string | null;
  batch: string;
  daysCompleted: number;
  currentStreak: number;
  longestStreak: number;
}

interface BatchLeaderboard {
  batchName: string;
  users: LeaderboardEntry[];
}

export const LightathonLeaderboard = () => {
  const [leaderboards, setLeaderboards] = useState<BatchLeaderboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<string>("all");

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const calculateStreak = (completedDays: number[]): { current: number; longest: number } => {
    if (completedDays.length === 0) return { current: 0, longest: 0 };
    
    // Sort days in ascending order
    const sortedDays = [...completedDays].sort((a, b) => a - b);
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    
    // Calculate longest streak
    for (let i = 1; i < sortedDays.length; i++) {
      if (sortedDays[i] === sortedDays[i - 1] + 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    
    // Calculate current streak (from most recent completed day going backwards)
    const maxDay = Math.max(...sortedDays);
    currentStreak = 1;
    for (let day = maxDay - 1; day >= 1; day--) {
      if (sortedDays.includes(day)) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    return { current: currentStreak, longest: longestStreak };
  };

  const loadLeaderboard = async () => {
    try {
      // Fetch all active enrollments
      const { data: enrollments, error: enrollError } = await supabase
        .from('lightathon_enrollments')
        .select('id, user_id, is_active');

      if (enrollError) throw enrollError;

      if (!enrollments || enrollments.length === 0) {
        setLeaderboards([]);
        setLoading(false);
        return;
      }

      // Fetch user profiles
      const userIds = [...new Set(enrollments.map(e => e.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, photograph_url, batch')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch all daily progress for these enrollments
      const enrollmentIds = enrollments.map(e => e.id);
      const { data: allProgress } = await supabase
        .from('lightathon_daily_progress')
        .select('enrollment_id, day_number, status')
        .in('enrollment_id', enrollmentIds);

      // Build leaderboard entries
      const entries: LeaderboardEntry[] = enrollments.map(enrollment => {
        const profile = profileMap.get(enrollment.user_id);
        const userProgress = allProgress?.filter(p => p.enrollment_id === enrollment.id) || [];
        const completedDays = userProgress
          .filter(p => p.status === 'completed')
          .map(p => p.day_number);
        
        const streaks = calculateStreak(completedDays);
        
        const displayName = profile?.full_name || 
          [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 
          'Anonymous';

        return {
          userId: enrollment.user_id,
          userName: displayName,
          photoUrl: profile?.photograph_url || null,
          batch: profile?.batch || 'Unassigned',
          daysCompleted: completedDays.length,
          currentStreak: streaks.current,
          longestStreak: streaks.longest
        };
      });

      // Group by batch
      const batchGroups = new Map<string, LeaderboardEntry[]>();
      entries.forEach(entry => {
        const batch = entry.batch;
        if (!batchGroups.has(batch)) {
          batchGroups.set(batch, []);
        }
        batchGroups.get(batch)!.push(entry);
      });

      // Sort users within each batch by days completed, then by streak
      const sortedLeaderboards: BatchLeaderboard[] = Array.from(batchGroups.entries())
        .map(([batchName, users]) => ({
          batchName,
          users: users.sort((a, b) => {
            if (b.daysCompleted !== a.daysCompleted) {
              return b.daysCompleted - a.daysCompleted;
            }
            return b.currentStreak - a.currentStreak;
          })
        }))
        .sort((a, b) => a.batchName.localeCompare(b.batchName));

      setLeaderboards(sortedLeaderboards);
      
      // Set default selected batch
      if (sortedLeaderboards.length > 0 && selectedBatch === "all") {
        setSelectedBatch("all");
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Medal className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm text-muted-foreground font-medium w-5 text-center">{rank}</span>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (leaderboards.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No Lightathon participants yet</p>
        </CardContent>
      </Card>
    );
  }

  const allUsers = leaderboards
    .flatMap(b => b.users)
    .sort((a, b) => {
      if (b.daysCompleted !== a.daysCompleted) {
        return b.daysCompleted - a.daysCompleted;
      }
      return b.currentStreak - a.currentStreak;
    });

  const renderLeaderboardList = (users: LeaderboardEntry[]) => (
    <ScrollArea className="h-[300px]">
      <div className="space-y-2">
        {users.map((user, index) => (
          <div
            key={user.userId}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
              index < 3 ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30'
            }`}
          >
            <div className="flex items-center justify-center w-6">
              {getRankBadge(index + 1)}
            </div>
            
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.photoUrl || undefined} />
              <AvatarFallback className="text-xs">{getInitials(user.userName)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user.userName}</p>
              <p className="text-xs text-muted-foreground">{user.batch}</p>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1" title="Days Completed">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-semibold">{user.daysCompleted}</span>
              </div>
              <div className="flex items-center gap-1" title="Current Streak">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="font-semibold">{user.currentStreak}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <CardTitle>Lightathon Leaderboard</CardTitle>
        </div>
        <CardDescription>Top performers by batch - Days completed & streak</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedBatch} onValueChange={setSelectedBatch}>
          <TabsList className="w-full flex-wrap h-auto gap-1 mb-4">
            <TabsTrigger value="all" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              All
            </TabsTrigger>
            {leaderboards.map(batch => (
              <TabsTrigger key={batch.batchName} value={batch.batchName}>
                {batch.batchName}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {batch.users.length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all">
            {renderLeaderboardList(allUsers)}
          </TabsContent>

          {leaderboards.map(batch => (
            <TabsContent key={batch.batchName} value={batch.batchName}>
              {renderLeaderboardList(batch.users)}
            </TabsContent>
          ))}
        </Tabs>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{allUsers.length}</p>
            <p className="text-xs text-muted-foreground">Participants</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {Math.max(...allUsers.map(u => u.daysCompleted), 0)}
            </p>
            <p className="text-xs text-muted-foreground">Max Days</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-500">
              {Math.max(...allUsers.map(u => u.longestStreak), 0)}
            </p>
            <p className="text-xs text-muted-foreground">Best Streak</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
