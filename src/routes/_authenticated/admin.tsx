import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { isAdmin, claimFirstAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Users, ArrowLeftRight, BadgeCheck, MessageSquare, LayoutDashboard, ScrollText, Settings } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Northvest" }] }),
  component: AdminLayout,
});

type Tab = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const tabs: Tab[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/admin/kyc", label: "KYC", icon: BadgeCheck },
  { to: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { to: "/admin/audit", label: "Audit log", icon: ScrollText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminLayout() {
  const check = useServerFn(isAdmin);
  const claim = useServerFn(claimFirstAdmin);
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const q = useQuery({ queryKey: ["is-admin"], queryFn: check });

  if (q.isLoading) return <div className="p-8 text-sm text-muted-foreground">Checking access…</div>;

  if (!q.data?.isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="glass-card rounded-3xl p-8 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-3 font-display text-2xl font-bold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your account doesn't have administrator privileges.</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
            <Button
              onClick={async () => {
                try { await claim(); toast.success("You're now the administrator. Refreshing…"); setTimeout(() => location.reload(), 600); }
                catch (e: any) { toast.error(e.message ?? "Could not claim admin"); }
              }}
              className="bg-[image:var(--gradient-primary)] text-primary-foreground"
            >
              Claim first-admin
            </Button>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">Claim only works if no administrator has been set up yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Admin panel</h1>
          <p className="text-xs text-muted-foreground">Manage users, transactions, KYC and reviews.</p>
        </div>
      </div>
      <div className="glass-card mb-6 flex flex-wrap gap-1 rounded-2xl p-1">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <Link key={t.to} to={t.to as any}
              className={"flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors " + (active ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              <t.icon className="h-4 w-4" /> {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
