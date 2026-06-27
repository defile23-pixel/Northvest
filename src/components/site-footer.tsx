import { TrendingUp } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-[image:var(--gradient-soft)]">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold">Northvest</span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            A modern, transparent platform for long-term investors. Built on clarity, not promises.
          </p>
        </div>
        <FooterCol title="Product" items={["Investment plans", "Portfolio tools", "Wallet", "Mobile app"]} />
        <FooterCol
          title="Company"
          items={[
            { label: "About", href: "/about" },
            { label: "Security", href: "/#trust" },
            { label: "Regulation", href: "/risk-disclosure#regulatory-status" },
            { label: "Careers", href: "/careers" },
          ]}
        />
        <FooterCol
          title="Resources"
          items={[
            { label: "Learning center", href: "/#learn" },
            { label: "Risk disclosure", href: "/risk-disclosure" },
            { label: "Help center", href: "/#faq" },
            { label: "Contact", href: "https://www.facebook.com/share/18qKmUTiau/?mibextid=wwXIfr" },
          ]}
        />
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-6 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Risk disclosure</p>
          <p className="mt-1 max-w-4xl">
            All investments carry risk, including the possible loss of principal. Returns are not guaranteed and past
            performance does not predict future results. Nothing on this site constitutes financial advice.
          </p>
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} Northvest. All rights reserved.</span>
            <a href="/terms" className="hover:text-foreground">Terms</a>
            <a href="/privacy" className="hover:text-foreground">Privacy</a>
            <a href="/risk-disclosure" className="hover:text-foreground">Risk disclosure</a>
          </p>
        </div>
      </div>
    </footer>
  );
}

type FooterItem = string | { label: string; href: string };

function FooterCol({ title, items }: { title: string; items: FooterItem[] }) {
  return (
    <div>
      <h4 className="font-display text-sm font-semibold">{title}</h4>
      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        {items.map((item) => {
          const label = typeof item === "string" ? item : item.label;
          const href = typeof item === "string" ? "#" : item.href;
          const external = href.startsWith("http");
          return (
            <li key={label}>
              <a href={href} className="hover:text-foreground" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
