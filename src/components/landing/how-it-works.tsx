import { UserPlus, BadgeCheck, Wallet, LineChart, Target } from "lucide-react";

const steps = [
  { icon: UserPlus, title: "Create account", body: "Sign up in minutes with email or single sign-on." },
  { icon: BadgeCheck, title: "Verify identity", body: "Complete KYC securely with government-issued ID." },
  { icon: Wallet, title: "Fund wallet", body: "Deposit via bank transfer, card, or recurring contribution." },
  { icon: Target, title: "Choose plan", body: "Pick the portfolio that matches your goals and risk profile." },
  { icon: LineChart, title: "Track performance", body: "Monitor your portfolio with clear, real-time analytics." },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">How it works</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">From signup to portfolio in five steps.</h2>
        </div>
        <div className="relative mt-14 grid gap-4 md:grid-cols-5">
          <div className="pointer-events-none absolute left-0 right-0 top-7 hidden h-px bg-[linear-gradient(90deg,transparent,var(--border)_20%,var(--border)_80%,transparent)] md:block" />
          {steps.map((s, i) => (
            <div key={s.title} className="glass-card relative rounded-2xl p-5 text-center transition-transform hover:-translate-y-1">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
                <s.icon className="h-6 w-6" />
              </div>
              <p className="mt-3 text-xs font-semibold text-primary">Step {i + 1}</p>
              <h3 className="mt-1 font-display text-base font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
