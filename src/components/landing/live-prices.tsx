import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

type Row = { id: string; symbol: string; name: string; price: number; change: number };
const COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "tether", symbol: "USDT", name: "Tether" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
];

export function LivePrices() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    let cancelled = false;
    const ids = COINS.map((c) => c.id).join(",");
    const fetchPrices = async () => {
      try {
        const r = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        );
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;
        setRows(
          COINS.map((c) => ({
            id: c.id,
            symbol: c.symbol,
            name: c.name,
            price: j[c.id]?.usd ?? 0,
            change: j[c.id]?.usd_24h_change ?? 0,
          }))
        );
      } catch {}
    };
    fetchPrices();
    const t = setInterval(fetchPrices, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const fmt = (n: number) =>
    n >= 1 ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
           : `$${n.toFixed(4)}`;

  const display = rows.length ? rows : COINS.map((c) => ({ ...c, price: 0, change: 0 }));
  // Duplicate for seamless marquee loop
  const loop = [...display, ...display];

  return (
    <section
      id="prices"
      aria-label="Live crypto prices"
      className="relative border-y border-border/60 bg-background/80 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="flex items-center gap-4 overflow-hidden">
        <span className="ml-4 hidden shrink-0 items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary sm:inline-flex">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          Live
        </span>
        <div className="ticker-track flex min-w-max gap-8 whitespace-nowrap">
          {loop.map((r, i) => {
            const up = r.change >= 0;
            return (
              <div key={`${r.id}-${i}`} className="flex items-center gap-2 text-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{r.symbol}</span>
                <span className="font-display font-semibold tabular-nums">
                  {r.price ? fmt(r.price) : "—"}
                </span>
                <span className={"flex items-center gap-0.5 text-xs font-medium " + (up ? "text-emerald-500" : "text-rose-500")}>
                  {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {r.price ? `${up ? "+" : ""}${r.change.toFixed(2)}%` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}