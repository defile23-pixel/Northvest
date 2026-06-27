import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { isAdmin } from "@/lib/admin.functions";
import {
  LayoutDashboard,
  Wallet,
  ShieldCheck,
  Bell,
  Settings,
  BadgeCheck,
  LogOut,
  TrendingUp,
  LineChart,
  Globe,
  MessageSquare,
  Crown,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const items: { title: string; url: string; icon: typeof LayoutDashboard }[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Investment plans", url: "/plans", icon: LineChart },
  { title: "Wallet", url: "/wallet", icon: Wallet },
  { title: "KYC verification", url: "/kyc", icon: BadgeCheck },
  { title: "Security", url: "/security", icon: ShieldCheck },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Write a review", url: "/reviews", icon: MessageSquare },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const check = useServerFn(isAdmin);
  const adminQ = useQuery({ queryKey: ["is-admin"], queryFn: check });

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-soft)]">
            <TrendingUp className="h-4 w-4" />
          </div>
          {!collapsed && <span className="font-display text-base font-bold">Northvest</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link to={item.url as any} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {adminQ.data?.isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/admin")}>
                    <Link to="/admin" className="flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      {!collapsed && <span>Admin panel</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Button asChild variant="ghost" size="sm" className="justify-start">
          <Link to="/">
            <Globe className="mr-2 h-4 w-4" />
            {!collapsed && "Back to website"}
          </Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={signOut} className="justify-start">
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && "Sign out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
