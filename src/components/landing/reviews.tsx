import { useEffect, useState } from "react";
import { Star, BadgeCheck, MessageSquare } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type R = { id: string; author_name: string; rating: number; title: string; body: string; created_at: string };

export function Reviews() {
  const [reviews, setReviews] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("reviews" as never)
        .select("id, author_name, rating, title, body, created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(9);
      if (!cancelled) {
        setReviews((data as unknown as R[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section id="reviews" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Investor stories</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">From real Northvest investors.</h2>
          <p className="mt-3 text-muted-foreground">Verified reviews from people using the platform today.</p>
        </div>

        {!loading && reviews.length === 0 ? (
          <div className="glass-card mx-auto mt-10 max-w-xl rounded-3xl p-8 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 font-display text-lg font-bold">Be the first to share your experience.</p>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to leave a review — approved reviews appear here.</p>
            <Button asChild className="mt-5 bg-[image:var(--gradient-primary)] text-primary-foreground">
              <Link to="/reviews">Write a review</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <article key={r.id} className="glass-card rounded-3xl p-6">
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={"h-4 w-4 " + (i < r.rating ? "fill-current" : "opacity-30")} />
                  ))}
                </div>
                {r.title && <p className="mt-3 font-display text-base font-bold">{r.title}</p>}
                <p className="mt-2 text-sm leading-relaxed">"{r.body}"</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                    {(r.author_name || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-semibold">
                      {r.author_name || "Verified investor"}
                      <BadgeCheck className="h-4 w-4 text-primary" />
                    </p>
                    <p className="text-xs text-muted-foreground">Verified investor</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {reviews.length > 0 && (
          <div className="mt-10 text-center">
            <Button asChild variant="outline">
              <Link to="/reviews">Share your review</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
