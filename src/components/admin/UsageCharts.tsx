import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DollarSign, Users, TrendingUp } from "lucide-react";

interface UsageChartsProps {
  users: any[];
  aiUsage: {
    totalCost: number;
    totalTokens: number;
    requestsToday: number;
    recentUsage: any[];
  };
}

export const UsageCharts = ({ users, aiUsage }: UsageChartsProps) => {
  // Top 5 users by AI cost
  const topUsersByAICost = users
    .filter(u => u.ai_usage)
    .sort((a, b) => (b.ai_usage?.total_cost || 0) - (a.ai_usage?.total_cost || 0))
    .slice(0, 5)
    .map(u => ({
      email: u.email.split('@')[0],
      cost: u.ai_usage?.total_cost || 0,
    }));

  // Top 5 users by persona runs
  const topUsersByRuns = users
    .sort((a, b) => b.persona_run_count - a.persona_run_count)
    .slice(0, 5)
    .map(u => ({
      email: u.email.split('@')[0],
      runs: u.persona_run_count,
    }));

  // AI usage over time (last 10 calls)
  const usageOverTime = aiUsage.recentUsage.map((usage, index) => ({
    call: `Call ${10 - index}`,
    cost: parseFloat(usage.estimated_cost),
    tokens: usage.total_tokens / 1000, // Convert to thousands
    function: usage.function_name,
  })).reverse();

  // User distribution by persona runs
  const userDistribution = [
    { name: '0 Runs', value: users.filter(u => u.persona_run_count === 0).length },
    { name: '1-2 Runs', value: users.filter(u => u.persona_run_count >= 1 && u.persona_run_count <= 2).length },
    { name: '3-5 Runs', value: users.filter(u => u.persona_run_count >= 3 && u.persona_run_count <= 5).length },
    { name: '5+ Runs', value: users.filter(u => u.persona_run_count > 5).length },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AI Spending</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${aiUsage.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {aiUsage.totalTokens.toLocaleString()} tokens used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.persona_run_count > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              of {users.length} total users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost per User</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${users.length > 0 ? (aiUsage.totalCost / users.length).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Total spending / users
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>AI Usage Over Time</CardTitle>
            <CardDescription>Cost and tokens for recent AI calls</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usageOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="call" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="cost" stroke="#8884d8" name="Cost ($)" />
                <Line yAxisId="right" type="monotone" dataKey="tokens" stroke="#82ca9d" name="Tokens (k)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
            <CardDescription>Users by persona run count</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Users by AI Cost</CardTitle>
            <CardDescription>Highest AI spending users</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topUsersByAICost}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="email" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cost" fill="#8884d8" name="Cost ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Users by Persona Runs</CardTitle>
            <CardDescription>Most active users</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topUsersByRuns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="email" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="runs" fill="#82ca9d" name="Runs" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
