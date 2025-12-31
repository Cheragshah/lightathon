interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  roles: string[];
  persona_run_count: number;
  ai_usage?: {
    total_cost: number;
    total_tokens: number;
    request_count: number;
  };
}

export const exportToCSV = (users: User[]) => {
  const headers = [
    'Email',
    'Roles',
    'Persona Runs',
    'AI Cost ($)',
    'AI Tokens',
    'AI Requests',
    'Created Date',
    'Last Sign In'
  ];

  const rows = users.map(user => [
    user.email,
    user.roles.join('; '),
    user.persona_run_count.toString(),
    user.ai_usage?.total_cost.toFixed(4) || '0.00',
    user.ai_usage?.total_tokens.toString() || '0',
    user.ai_usage?.request_count.toString() || '0',
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
  link.setAttribute('download', `admin-users-export-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
