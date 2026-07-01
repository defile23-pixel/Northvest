import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({ meta: [{ title: "Investment plans — Northvest" }] }),
  component: PlansPage,
});

type Plan = {
  id: string;
  name: string;
  tag: string;
  risk: string;
  min: number;
  features: string[];
  highlighted?: boolean;
};

const FALLBACK_PLANS: Plan[] = [
  { id: "balanced", name: "Balanced Portfolio", tag: "Most popular", risk: "Moderate risk profile", min: 500, features: [], highlighted: true },
];

function PlansPage() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const plansQ = useQuery({
    queryKey: ["plans-setting"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings" as never).select("value").eq("key", "plans").maybeSingle();
      if (error) throw error;
      return ((data as any)?.value as Plan[]) ?? FALLBACK_PLANS;
    },
  });
  const PLANS = plansQ.data ?? FALLBACK_PLANS;

  const profile = useQuery({
    queryKey: ["profile-plan"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("selected_plan, risk_profile").eq("id", user.id).maybeSingle();
      return { user, ...data };
    },
  });

  const choose = async (id: string) => {
    if (!profile.data?.user) return;
    setBusy(id);
    const { error } = await supabase
      .from("profiles")
      .update({ selected_plan: id, risk_profile: id, updated_at: new Date().toISOString() })
      .eq("id", profile.data.user.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Plan selected");
    qc.invalidateQueries({ queryKey: ["profile-plan"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const current = profile.data?.selected_plan ?? "balanced";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Investment plans</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pick the portfolio that matches your goals. You can change at any time.</p>
        </div>
        <Badge variant="outline" className="capitalize">Current: {current}</Badge>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {PLANS.map((p) => {
          const active = current === p.id;
          return (
            <div
              key={p.id}
              className={
                "glass-card relative flex flex-col rounded-3xl p-7 transition-transform hover:-translate-y-1 " +
                (active ? "ring-2 ring-primary shadow-[var(--shadow-elevated)]" : "")
              }
            >
              {p.highlighted && !active && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[image:var(--gradient-primary)] px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {p.tag}
                </span>
              )}
              {active && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                  Active plan
                </span>
              )}
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{p.tag}</p>
              <h3 className="mt-2 font-display text-2xl font-bold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.risk}</p>
              <p className="mt-3 text-sm">Minimum deposit: <span className="font-semibold">${p.min.toLocaleString()}</span></p>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{f}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-2">
                <Button
                  disabled={busy !== null || active}
                  onClick={() => choose(p.id)}
                  className={p.highlighted && !active ? "bg-[image:var(--gradient-primary)] text-primary-foreground" : ""}
                  variant={active ? "outline" : p.highlighted ? "default" : "outline"}
                >
                  {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : active ? "Selected" : "Choose plan"}
                </Button>
                {active && (
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/wallet">Fund this plan <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mx-auto mt-10 max-w-3xl text-center text-xs text-muted-foreground">
        All investments carry risk. Returns are not guaranteed and past performance does not predict future results.
      </p>
    </div>
  );
}
