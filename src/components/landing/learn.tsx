import { BookOpen, ShieldAlert, Newspaper, Compass } from "lucide-react";

const items = [
  { icon: BookOpen, title: "Investing basics", body: "Understand how markets, compounding, and diversification work." },
  { icon: ShieldAlert, title: "Risk management", body: "Learn to balance risk and reward across your portfolio." },
  { icon: Newspaper, title: "Market insights", body: "Plain-language updates on what's shaping markets today." },
  { icon: Compass, title: "Financial planning", body: "Set realistic goals and build a long-term plan you can stick to." },
];

export function Learn() {
  return (
    <section id="learn" className="relative py-20 sm:py-28">
      <div className="absolute inset-0 -z-10 soft-bg" />
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Educational resources</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Learn before you invest.</h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <a key={it.title} href="#" className="glass-card group block rounded-2xl p-6 transition-transform hover:-translate-y-1">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[image:var(--gradient-accent)] text-primary-foreground">
                <it.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold">{it.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{it.body}</p>
              <p className="mt-4 text-xs font-semibold text-primary group-hover:underline">Read guide →</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
