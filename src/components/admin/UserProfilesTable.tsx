import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, Download, Search, UserCircle, Mail, Phone, MapPin } from "lucide-react";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_whatsapp: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
  photograph_url: string | null;
  profile_completed: boolean | null;
}

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  roles: string[];
  profile: Profile | null;
}

interface UserProfilesTableProps {
  users: User[];
}

export const UserProfilesTable = ({ users }: UserProfilesTableProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [completionFilter, setCompletionFilter] = useState<'all' | 'complete' | 'incomplete'>('all');

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.profile?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.profile?.last_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isComplete = user.profile?.profile_completed === true;
    const matchesCompletion = 
      completionFilter === 'all' ||
      (completionFilter === 'complete' && isComplete) ||
      (completionFilter === 'incomplete' && !isComplete);
    
    return matchesSearch && matchesCompletion;
  });

  const completedCount = users.filter(u => u.profile?.profile_completed === true).length;
  const incompleteCount = users.length - completedCount;

  const exportProfilesCSV = () => {
    const headers = [
      'Email',
      'First Name',
      'Last Name',
      'Profile Email',
      'Phone/WhatsApp',
      'Address',
      'City',
      'State',
      'Pin Code',
      'Profile Completed',
      'Auth Created Date',
      'Last Sign In'
    ];

    const rows = filteredUsers.map(user => [
      user.email,
      user.profile?.first_name || '',
      user.profile?.last_name || '',
      user.profile?.email || '',
      user.profile?.phone_whatsapp || '',
      user.profile?.address || '',
      user.profile?.city || '',
      user.profile?.state || '',
      user.profile?.pin_code || '',
      user.profile?.profile_completed ? 'Yes' : 'No',
      new Date(user.created_at).toLocaleDateString(),
      user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `user-profiles-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              User Profiles
            </CardTitle>
            <CardDescription>
              View all user profiles with completion status
            </CardDescription>
          </div>
          <Button variant="outline" onClick={exportProfilesCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export Profiles CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-muted rounded-lg text-center">
            <div className="text-2xl font-bold">{users.length}</div>
            <div className="text-sm text-muted-foreground">Total Users</div>
          </div>
          <div className="p-4 bg-success/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-success">{completedCount}</div>
            <div className="text-sm text-muted-foreground">Complete Profiles</div>
          </div>
          <div className="p-4 bg-destructive/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-destructive">{incompleteCount}</div>
            <div className="text-sm text-muted-foreground">Incomplete Profiles</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={completionFilter}
            onChange={(e) => setCompletionFilter(e.target.value as 'all' | 'complete' | 'incomplete')}
          >
            <option value="all">All Profiles</option>
            <option value="complete">Complete</option>
            <option value="incomplete">Incomplete</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.profile?.photograph_url || undefined} />
                        <AvatarFallback>
                          {user.profile?.first_name?.[0] || user.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {user.profile?.first_name && user.profile?.last_name 
                            ? `${user.profile.first_name} ${user.profile.last_name}`
                            : user.email}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.profile?.email || user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.profile?.phone_whatsapp ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3" />
                        {user.profile.phone_whatsapp}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not provided</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.profile?.city || user.profile?.state ? (
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3" />
                        {[user.profile?.city, user.profile?.state].filter(Boolean).join(', ')}
                        {user.profile?.pin_code && ` - ${user.profile.pin_code}`}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not provided</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.profile?.profile_completed ? (
                      <Badge variant="default" className="bg-success">
                        <Check className="h-3 w-3 mr-1" />
                        Complete
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <X className="h-3 w-3 mr-1" />
                        Incomplete
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(user.created_at)}
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found matching your criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
