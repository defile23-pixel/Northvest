import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-dashboard.jpg";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-[image:var(--gradient-hero)] opacity-30 blur-3xl" />
        <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-7xl gap-12 px-6 pt-16 pb-24 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pt-24">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Long-term investing, modernized
          </div>
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Invest smarter <br />
            <span className="gradient-text">for the future.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Build a diversified portfolio with transparent fees, clear risk disclosure, and the tools you need to
            invest responsibly over the long run.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-elevated)] hover:opacity-95">
              <Link to="/register">Create account <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-border bg-card/60 backdrop-blur">
              <a href="#plans">Explore investment plans</a>
            </Button>
          </div>
          <div className="mt-8 flex items-start gap-2 rounded-xl border border-border bg-card/40 p-3 text-xs text-muted-foreground backdrop-blur">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              All investments carry risk, including possible loss of principal. Returns are not guaranteed and past
              performance does not predict future results.
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="animate-float relative mx-auto max-w-xl">
            <img
              src={heroImg}
              alt="3D investment dashboard with portfolio charts and asset allocation"
              width={1536}
              height={1152}
              className="rounded-3xl shadow-[var(--shadow-elevated)]"
            />
            <div className="glass-card absolute -left-4 top-10 hidden rounded-2xl p-4 sm:block">
              <p className="text-xs text-muted-foreground">Portfolio</p>
              <p className="font-display text-2xl font-bold">$48,210</p>
              <p className="text-xs text-accent-foreground">Diversified · 12 assets</p>
            </div>
            <div className="glass-card absolute -bottom-4 right-0 hidden rounded-2xl p-4 sm:block">
              <p className="text-xs text-muted-foreground">Allocation</p>
              <div className="mt-2 flex gap-1">
                <span className="h-2 w-12 rounded-full bg-primary" />
                <span className="h-2 w-8 rounded-full bg-accent" />
                <span className="h-2 w-5 rounded-full bg-muted-foreground/40" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
