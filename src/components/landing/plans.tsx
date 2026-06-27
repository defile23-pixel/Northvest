import { Check, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Starter Portfolio",
    tag: "For beginners",
    risk: "Lower risk exposure",
    features: [
      "Diversified low-volatility assets",
      "Flexible investment amount",
      "Automated rebalancing",
      "Educational onboarding",
    ],
    highlighted: false,
  },
  {
    name: "Balanced Portfolio",
    tag: "Most popular",
    risk: "Moderate risk profile",
    features: [
      "Diversified equity & bond mix",
      "Long-term growth focus",
      "Quarterly portfolio review",
      "Tax-efficient strategy",
    ],
    highlighted: true,
  },
  {
    name: "Growth Portfolio",
    tag: "For experienced investors",
    risk: "Higher risk exposure",
    features: [
      "Higher market exposure",
      "Higher potential returns",
      "Active risk monitoring",
      "Custom allocation tools",
    ],
    highlighted: false,
  },
];

export function Plans() {
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
              key={p.name}
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
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={
                  "mt-8 " +
                  (p.highlighted
                    ? "bg-[image:var(--gradient-primary)] text-primary-foreground"
                    : "")
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
