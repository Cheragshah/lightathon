import { 
  Users, 
  UserCircle, 
  Layers, 
  Play, 
  BarChart3, 
  Zap, 
  FileText, 
  Sparkles, 
  Settings,
  BookOpen,
  Home
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAdmin: boolean;
}

const mainNavItems = [
  { id: "users", title: "Users", icon: Users },
  { id: "profiles", title: "Profiles", icon: UserCircle },
];

const adminNavItems = [
  { id: "batches", title: "Batches", icon: Layers, adminOnly: true },
  { id: "generation", title: "Generation", icon: Play, adminOnly: true },
  { id: "lightathon", title: "Lightathon", icon: Sparkles, adminOnly: true },
];

const analyticsNavItems = [
  { id: "analytics", title: "Analytics", icon: BarChart3 },
  { id: "system", title: "Health", icon: Zap },
  { id: "audit", title: "Logs", icon: FileText },
];

const configNavItems = [
  { id: "configuration", title: "Configuration", icon: Settings, adminOnly: true },
];

export function AdminSidebar({ activeTab, onTabChange, isAdmin }: AdminSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const navigate = useNavigate();

  const renderMenuItem = (item: { id: string; title: string; icon: any; adminOnly?: boolean }) => {
    if (item.adminOnly && !isAdmin) return null;
    
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton
          onClick={() => onTabChange(item.id)}
          isActive={isActive}
          tooltip={item.title}
          className={isActive ? "bg-primary/10 text-primary" : ""}
        >
          <Icon className="h-4 w-4" />
          <span>{item.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Users className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Admin Panel</span>
              <span className="text-xs text-muted-foreground">Management</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Only */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin Tools</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map(renderMenuItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Analytics */}
        <SidebarGroup>
          <SidebarGroupLabel>Analytics</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsNavItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Configuration */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {configNavItems.map(renderMenuItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => navigate("/dashboard")} tooltip="Back to Dashboard">
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => navigate("/documentation")} tooltip="Documentation">
              <BookOpen className="h-4 w-4" />
              <span>Docs</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
