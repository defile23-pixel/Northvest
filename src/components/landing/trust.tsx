import { ShieldCheck, Landmark, Lock, FileText, AlertTriangle } from "lucide-react";
import shieldImg from "@/assets/icon-shield.png";

const items = [
  { icon: Landmark, title: "Licensed & regulated", body: "Operates under jurisdictional financial regulations with regular audits." },
  { icon: Lock, title: "Bank-grade security", body: "256-bit encryption, multi-factor authentication, and cold storage for assets." },
  { icon: ShieldCheck, title: "Fund protection", body: "Client funds are segregated from operating capital with qualified custodians." },
  { icon: FileText, title: "Transparent fees", body: "Flat management fee. No hidden costs, no performance-based surprises." },
];

export function Trust() {
  return (
    <section id="trust" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Trust & transparency</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Built on regulation, not promises.</h2>
            <p className="mt-4 text-muted-foreground">
              We believe transparency is the foundation of long-term investing. Every fee, every risk, every process
              is documented and accessible to you.
            </p>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent-foreground" />
              <p className="text-sm text-accent-foreground">
                Investing involves risk. The value of investments can go down as well as up, and you may receive
                less than you invested.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((it) => (
              <div key={it.title} className="glass-card rounded-2xl p-6">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
                  <it.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold">{it.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{it.body}</p>
              </div>
            ))}
          </div>
        </div>
        <img src={shieldImg} alt="" aria-hidden width={120} height={120} className="animate-float pointer-events-none absolute -right-4 top-10 hidden h-32 w-32 opacity-80 lg:block" />
      </div>
    </section>
  );
}
