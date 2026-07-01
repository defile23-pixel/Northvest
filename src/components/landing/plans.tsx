import { Check, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Plan = { id: string; name: string; tag: string; risk: string; min: number; features: string[]; highlighted?: boolean };

const FALLBACK_PLANS: Plan[] = [
  { id: "balanced", name: "Balanced Portfolio", tag: "Most popular", risk: "Moderate risk profile", min: 500, features: [], highlighted: true },
];

export function Plans() {
  const plansQ = useQuery({
    queryKey: ["plans-setting"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings" as never).select("value").eq("key", "plans").maybeSingle();
      if (error) throw error;
      return ((data as any)?.value as Plan[]) ?? FALLBACK_PLANS;
    },
  });
  const plans = plansQ.data ?? FALLBACK_PLANS;

  return (
    <section id="plans" className="relative py-20 sm:py-28">
      <div className="absolute inset-0 -z-10 soft-bg" />
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Investment plans</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Three portfolios. One clear strategy.</h2>
          <p className="mt-3 text-muted-foreground">
            We don't advertise fixed profits. Each portfolio carries its own risk profile — choose the one that aligns
            with your goals and timeline.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className={
                "glass-card relative flex flex-col rounded-3xl p-7 transition-transform hover:-translate-y-1 " +
                (p.highlighted ? "ring-2 ring-primary shadow-[var(--shadow-elevated)]" : "")
              }
            >
              {p.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[image:var(--gradient-primary)] px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {p.tag}
                </span>
              )}
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{p.tag}</p>
              <h3 className="mt-2 font-display text-2xl font-bold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.risk}</p>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={
                  "mt-8 " +
                  (p.highlighted ? "bg-[image:var(--gradient-primary)] text-primary-foreground" : "")
                }
                variant={p.highlighted ? "default" : "outline"}
              >
                <Link to="/register">Get started <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-3xl text-center text-xs text-muted-foreground">
          All investments carry risk. Returns are not guaranteed and past performance does not predict future results.
        </p>
      </div>
    </section>
  );
}
