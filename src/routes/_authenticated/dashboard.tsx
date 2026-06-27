import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { ArrowDownLeft, Plus, ShieldCheck, BadgeCheck, Bell, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Northvest" }] }),
  component: DashboardPage,
});

const alloc = [
  { name: "Equities", value: 55 },
  { name: "Bonds", value: 25 },
  { name: "Real estate", value: 12 },
  { name: "Cash", value: 8 },
];
const COLORS = ["oklch(0.55 0.18 260)", "oklch(0.78 0.14 180)", "oklch(0.7 0.14 210)", "oklch(0.85 0.06 250)"];

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter Portfolio",
  balanced: "Balanced Portfolio",
  growth: "Growth Portfolio",
};

function StatCard({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{delta}</p>
    </div>
  );
}

function DashboardPage() {
  const qc = useQueryClient();

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const [{ data: p }, { data: w }, { data: txns }, { data: kyc }, { data: allTxns }] = await Promise.all([
        supabase.from("profiles").select("full_name, risk_profile, selected_plan, two_factor_enabled").eq("id", user.id).maybeSingle(),
        supabase.from("wallets").select("cash_balance, invested_balance, currency").eq("user_id", user.id).maybeSingle(),
        supabase.from("transactions").select("id, type, amount, description, created_at, status").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("kyc_verifications").select("status").eq("user_id", user.id).maybeSingle(),
        // Full history of completed money-moving transactions, oldest first, to build a real balance-history chart.
        supabase.from("transactions").select("amount, created_at").eq("user_id", user.id).eq("status", "completed").order("created_at", { ascending: true }),
      ]);
      return { user, p, w, txns: txns ?? [], kyc, allTxns: allTxns ?? [] };
    },
  });

  const notifs = useQuery({
    queryKey: ["notifications-preview"],
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications-preview"] });
  };

  const w = profile.data?.w;
  const total = (Number(w?.cash_balance ?? 0) + Number(w?.invested_balance ?? 0)).toLocaleString("en-US", { style: "currency", currency: w?.currency ?? "USD" });
  const cash = Number(w?.cash_balance ?? 0).toLocaleString("en-US", { style: "currency", currency: w?.currency ?? "USD" });
  const invested = Number(w?.invested_balance ?? 0).toLocaleString("en-US", { style: "currency", currency: w?.currency ?? "USD" });

  // Real running cash balance over time, built from the user's own completed transactions —
  // not simulated. Deposits/withdrawals only, since there's no live market feed behind
  // invested_balance yet (it only changes when an admin sets it).
  const allTxns = profile.data?.allTxns ?? [];
  let running = 0;
  const balanceHistory = allTxns.map((t) => {
    running += Number(t.amount);
    return { d: new Date(t.created_at).getTime(), v: running };
  });
  const hasHistory = balanceHistory.length >= 2;

  const planId = profile.data?.p?.selected_plan ?? "balanced";
  const emailVerified = Boolean(profile.data?.user?.email_confirmed_at);
  const unreadCount = (notifs.data ?? []).filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back{profile.data?.p?.full_name ? `, ${profile.data.p.full_name.split(" ")[0]}` : ""}</p>
          <h1 className="mt-1 font-display text-3xl font-bold">Dashboard overview</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/wallet"><ArrowDownLeft className="mr-1 h-4 w-4" /> Withdraw</Link></Button>
          <Button asChild className="bg-[image:var(--gradient-primary)] text-primary-foreground"><Link to="/wallet"><Plus className="mr-1 h-4 w-4" /> Deposit</Link></Button>
        </div>
      </div>

      {profile.data?.kyc?.status !== "approved" && (
        <div className="glass-card mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Complete identity verification to unlock investing</p>
              <p className="text-xs text-muted-foreground">Required by financial regulations. Takes ~3 minutes.</p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline"><Link to="/kyc">Verify identity</Link></Button>
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Portfolio value" value={total} delta="Cash + invested" />
        <StatCard label="Available cash" value={cash} delta="Ready to invest" />
        <StatCard label="Invested" value={invested} delta={`${profile.data?.p?.risk_profile ?? "balanced"} risk profile`} />
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current plan</p>
          <p className="mt-2 font-display text-2xl font-bold">{PLAN_LABELS[planId] ?? planId}</p>
          <Link to="/plans" className="mt-1 inline-block text-xs text-primary underline-offset-4 hover:underline">Change plan</Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="glass-card rounded-3xl p-6 lg:col-span-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Balance history</p>
              <p className="font-display text-2xl font-bold">Deposits & withdrawals</p>
            </div>
            <Badge variant="outline">From your real account activity</Badge>
          </div>
          <div className="mt-4 h-64">
            {hasHistory ? (
              <ResponsiveContainer>
                <AreaChart data={balanceHistory}>
                  <defs>
                    <linearGradient id="d" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.62 0.18 255)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="oklch(0.62 0.18 255)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="d" hide />
                  <YAxis hide domain={["dataMin - 100", "dataMax + 100"]} />
                  <Tooltip
                    formatter={(v: number) => v.toLocaleString("en-US", { style: "currency", currency: w?.currency ?? "USD" })}
                    labelFormatter={(d: number) => new Date(d).toLocaleDateString()}
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
                  />
                  <Area type="monotone" dataKey="v" stroke="oklch(0.55 0.18 260)" strokeWidth={2.5} fill="url(#d)" baseValue="dataMin" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <LineChart className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">Your balance history will show up here</p>
                  <p className="mt-1 text-xs text-muted-foreground">Make a deposit to start building a real activity history.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <p className="text-sm text-muted-foreground">Target allocation</p>
          <p className="font-display text-2xl font-bold capitalize">{profile.data?.p?.risk_profile ?? "Balanced"}</p>
          <p className="mt-1 text-xs text-muted-foreground">Illustrative mix for this plan — not a live snapshot of your holdings.</p>
          <div className="mt-2 h-44">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={alloc} dataKey="value" innerRadius={48} outerRadius={75} paddingAngle={2}>
                  {alloc.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-2 text-sm">
            {alloc.map((a, i) => (
              <li key={a.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />
                  {a.name}
                </span>
                <span className="font-medium">{a.value}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="glass-card rounded-3xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-bold">Recent activity</p>
            <Button asChild variant="ghost" size="sm"><Link to="/wallet">View all</Link></Button>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {(profile.data?.txns ?? []).length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">No transactions yet. Make your first deposit to get started.</li>
            )}
            {profile.data?.txns?.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium capitalize">{t.type}</p>
                  <p className="text-xs text-muted-foreground">{t.description ?? "—"} · {new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className={Number(t.amount) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}>
                    {Number(t.amount) >= 0 ? "+" : ""}{Number(t.amount).toLocaleString("en-US", { style: "currency", currency: "USD" })}
                  </span>
                  <p className="text-[11px] capitalize text-muted-foreground">{t.status}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <p className="font-display text-lg font-bold">Security</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Strengthen your account with multi-factor authentication.</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between"><span>Email verified</span><Badge variant={emailVerified ? "secondary" : "outline"}>{emailVerified ? "Yes" : "No"}</Badge></div>
            <div className="flex items-center justify-between"><span>2-factor authentication</span><Badge variant={profile.data?.p?.two_factor_enabled ? "default" : "outline"}>{profile.data?.p?.two_factor_enabled ? "On" : "Off"}</Badge></div>
            <div className="flex items-center justify-between"><span>Identity verified</span><Badge variant={profile.data?.kyc?.status === "approved" ? "default" : "outline"}>{profile.data?.kyc?.status ?? "Pending"}</Badge></div>
          </div>
          <Progress value={(emailVerified ? 34 : 0) + (profile.data?.p?.two_factor_enabled ? 33 : 0) + (profile.data?.kyc?.status === "approved" ? 33 : 0)} className="mt-4" />
          <Button asChild variant="outline" size="sm" className="mt-4 w-full"><Link to="/security">Open security center</Link></Button>
        </div>
      </div>

      <div className="glass-card mt-6 rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <p className="font-display text-lg font-bold">Notifications</p>
            {unreadCount > 0 && <Badge>{unreadCount} new</Badge>}
          </div>
          <Button asChild variant="ghost" size="sm"><Link to="/notifications">View all</Link></Button>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {(notifs.data ?? []).length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">Nothing yet — updates about deposits, withdrawals, and KYC will show up here.</li>
          )}
          {notifs.data?.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-3 py-3 text-sm">
              <div>
                <p className={"font-medium " + (n.read ? "text-muted-foreground" : "")}>{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</span>
                {!n.read && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark read</Button>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
