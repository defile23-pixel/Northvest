import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TrendingUp, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";

const sections = [
  { id: "plans", label: "Plans" },
  { id: "how", label: "How it works" },
  { id: "performance", label: "Performance" },
  { id: "trust", label: "Trust & security" },
  { id: "prices", label: "Live prices" },
  { id: "withdrawals", label: "Live withdrawals" },
  { id: "reviews", label: "Reviews" },
  { id: "learn", label: "Learn" },
  { id: "faq", label: "FAQ" },
];

export function SiteHeader() {
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glass-card mx-auto mt-4 flex max-w-7xl items-center justify-between rounded-2xl px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">Northvest</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#plans" className="transition-colors hover:text-foreground">Plans</a>
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#trust" className="transition-colors hover:text-foreground">Trust</a>
          <a href="#learn" className="transition-colors hover:text-foreground">Learn</a>
          <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {signedIn ? (
            <Button asChild size="sm" className="bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-soft)] hover:opacity-95">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-soft)] hover:opacity-95">
                <Link to="/register">Open account</Link>
              </Button>
            </>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88%] max-w-sm">
              <SheetHeader><SheetTitle className="text-left font-display">Northvest</SheetTitle></SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {sections.map((s) => (
                  <a key={s.id} href={`#${s.id}`} onClick={() => setOpen(false)}
                     className="rounded-xl px-3 py-3 text-base font-medium hover:bg-muted">{s.label}</a>
                ))}
              </nav>
              <div className="mt-6 grid gap-2 border-t pt-6">
                {signedIn ? (
                  <Button asChild className="bg-[image:var(--gradient-primary)] text-primary-foreground">
                    <Link to="/dashboard" onClick={() => setOpen(false)}>Go to dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="outline"><Link to="/login" onClick={() => setOpen(false)}>Sign in</Link></Button>
                    <Button asChild className="bg-[image:var(--gradient-primary)] text-primary-foreground">
                      <Link to="/register" onClick={() => setOpen(false)}>Open account</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
