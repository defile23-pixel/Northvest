import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpRight, X } from "lucide-react";

type Item = { id: string; amount: number; asset: string | null; method: string | null; created_at: string };

function relTime(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

// Shows only real completed withdrawals from public_withdrawals. No fabricated
// names, amounts, or scheduled "random" appearances — if there's no real activity
// yet, this renders nothing rather than manufacturing the appearance of activity.
export function LiveWithdrawals() {
  const [pool, setPool] = useState<Item[]>([]);
  const [current, setCurrent] = useState<Item | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("public_withdrawals" as never)
        .select("id, amount, asset, method, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled && data) setPool(data as unknown as Item[]);
    };
    load();
    const channel = supabase
      .channel("public-withdrawals-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        (payload) => {
          const row = payload.new as Record<string, unknown> | null;
          if (!row) return;
          if (row.type !== "withdrawal" || row.status !== "completed") return;
          const item: Item = {
            id: String(row.id),
            amount: Math.abs(Number(row.amount)),
            asset: row.asset as string | null,
            method: row.method as string | null,
            created_at: String(row.created_at),
          };
          setPool((prev) => [item, ...prev].slice(0, 20));
          setCurrent(item);
        }
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, []);

  // Surfaces the most recent real withdrawal once, when it actually happens or on
  // first load if recent ones exist. No randomized scheduling, no synthetic items.
  useEffect(() => {
    if (dismissed || pool.length === 0) return;
    setCurrent((c) => c ?? pool[0]);
  }, [pool, dismissed]);

  const fmt = (n: number) => Math.abs(n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  if (!current || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 max-w-[calc(100vw-2rem)] sm:max-w-sm animate-fade-up"
    >
      <div className="glass-card flex items-center gap-3 rounded-2xl border border-border/70 bg-background/95 px-4 py-3 shadow-2xl backdrop-blur">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
          <ArrowUpRight className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            Withdrawal completed · <span className="font-bold">{fmt(current.amount)}</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {(current.method ?? "Payout")}{current.asset ? ` · ${current.asset}` : ""} · {relTime(current.created_at)}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
