import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";

const growthData = [
  { m: "Jan", v: 100 }, { m: "Feb", v: 104 }, { m: "Mar", v: 102 },
  { m: "Apr", v: 108 }, { m: "May", v: 112 }, { m: "Jun", v: 110 },
  { m: "Jul", v: 116 }, { m: "Aug", v: 121 }, { m: "Sep", v: 119 },
  { m: "Oct", v: 124 }, { m: "Nov", v: 128 }, { m: "Dec", v: 132 },
];

const alloc = [
  { name: "Equities", value: 55 },
  { name: "Bonds", value: 25 },
  { name: "Real estate", value: 12 },
  { name: "Cash", value: 8 },
];

const COLORS = ["oklch(0.55 0.18 260)", "oklch(0.78 0.14 180)", "oklch(0.7 0.14 210)", "oklch(0.85 0.06 250)"];

export function Performance() {
  return (
    <section id="performance" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Portfolio performance</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Clarity at every step.</h2>
          <p className="mt-3 text-muted-foreground">
            Interactive visualizations help you understand what you own, how it's allocated, and the risk you're taking.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <div className="glass-card rounded-3xl p-6 lg:col-span-2">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Simulated growth (illustrative)</p>
                <p className="font-display text-2xl font-bold">12-month view</p>
              </div>
              <span className="rounded-full bg-accent/30 px-3 py-1 text-xs font-medium text-accent-foreground">Demo data</span>
            </div>
            <div className="mt-6 h-64">
              <ResponsiveContainer>
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.62 0.18 255)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="oklch(0.62 0.18 255)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="m" stroke="oklch(0.55 0.02 255)" fontSize={12} />
                  <YAxis stroke="oklch(0.55 0.02 255)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Area type="monotone" dataKey="v" stroke="oklch(0.45 0.18 260)" strokeWidth={2.5} fill="url(#g)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <p className="text-sm text-muted-foreground">Asset allocation</p>
            <p className="font-display text-2xl font-bold">Balanced portfolio</p>
            <div className="mt-4 h-48">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={alloc} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {alloc.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-1.5 text-sm">
              {alloc.map((a, i) => (
                <li key={a.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />
                    {a.name}
                  </span>
                  <span className="text-muted-foreground">{a.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
