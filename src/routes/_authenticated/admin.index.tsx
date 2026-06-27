import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminOverview } from "@/lib/admin.functions";
import { Users, BadgeCheck, ArrowLeftRight, MessageSquare, Wallet, TrendingUp, TrendingDown, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function AdminOverview() {
  const fn = useServerFn(adminOverview);
  const q = useQuery({ queryKey: ["admin-overview"], queryFn: fn });

  const queueStats = [
    { label: "Total users", v: q.data?.users ?? 0, icon: Users },
    { label: "New users (7d)", v: q.data?.newUsers7d ?? 0, icon: UserPlus },
    { label: "Pending KYC", v: q.data?.kycPending ?? 0, icon: BadgeCheck },
    { label: "Pending transactions", v: q.data?.txPending ?? 0, icon: ArrowLeftRight },
    { label: "Pending reviews", v: q.data?.reviewsPending ?? 0, icon: MessageSquare },
  ];
  const moneyStats = [
    { label: "Total cash on platform", v: money(q.data?.totalCash ?? 0), icon: Wallet },
    { label: "Total invested on platform", v: money(q.data?.totalInvested ?? 0), icon: Wallet },
    { label: "Lifetime completed deposits", v: money(q.data?.depositVolume ?? 0), icon: TrendingUp },
    { label: "Lifetime completed withdrawals", v: money(q.data?.withdrawalVolume ?? 0), icon: TrendingDown },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Queues</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {queueStats.map((s) => (
            <div key={s.label} className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase text-muted-foreground">{s.label}</p>
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 font-display text-3xl font-bold">{s.v}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Platform balances</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {moneyStats.map((s) => (
            <div key={s.label} className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase text-muted-foreground">{s.label}</p>
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 font-display text-2xl font-bold">{s.v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
