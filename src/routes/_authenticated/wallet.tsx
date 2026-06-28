import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Wallet as WalletIcon, Copy, Bitcoin, Banknote, Info, ShieldAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "Wallet — Northvest" }] }),
  component: WalletPage,
});

type AssetSetting = { label: string; network: string; address: string | null; min: number };

// Used only until the real settings load, so the form has something to render —
// the actual addresses/minimums now live in the database (see /admin/settings)
// and can be changed by an admin without a code change or redeploy.
const FALLBACK_ASSETS: Record<string, AssetSetting> = {
  BTC: { label: "Bitcoin (BTC)", network: "Bitcoin", address: null, min: 50 },
  ETH: { label: "Ethereum (ETH)", network: "ERC-20", address: null, min: 50 },
  USDT: { label: "Tether (USDT)", network: "TRC-20", address: null, min: 20 },
};

function WalletPage() {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState<"deposit" | "withdraw" | null>(null);
  const [depositAsset, setDepositAsset] = useState("BTC");
  const [txHash, setTxHash] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<"crypto" | "bank">("crypto");
  const [wAsset, setWAsset] = useState("USDT");
  const [wAddress, setWAddress] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [reference, setReference] = useState("");

  const settingsQ = useQuery({
    queryKey: ["deposit-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings" as never).select("value").eq("key", "deposit_addresses").maybeSingle();
      if (error) throw error;
      return ((data as any)?.value as Record<string, AssetSetting>) ?? FALLBACK_ASSETS;
    },
  });
  const assetSettings = settingsQ.data ?? FALLBACK_ASSETS;
  const CRYPTO_ASSETS = Object.entries(assetSettings).map(([id, a]) => ({ id, ...a }));

  const data = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const [{ data: w }, { data: txns }, { data: p }, { data: k }] = await Promise.all([
        supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("profiles").select("selected_plan").eq("id", user.id).maybeSingle(),
        supabase.from("kyc_verifications").select("status").eq("user_id", user.id).maybeSingle(),
      ]);
      return { user, w, txns: txns ?? [], plan: p?.selected_plan ?? "balanced", kyc: k?.status ?? "not_started" };
    },
  });

  const copy = async (txt: string) => {
    try { await navigator.clipboard.writeText(txt); toast.success("Address copied"); } catch { toast.error("Copy failed"); }
  };

  const submitDeposit = async () => {
    const n = Number(amount);
    if (!n || n <= 0) return toast.error("Enter a valid amount");
    if (!data.data?.user) return;
    const asset = CRYPTO_ASSETS.find((a) => a.id === depositAsset)!;
    if (!asset.address) return toast.error(`${asset.label} deposits aren't available yet — use Bitcoin for now`);
    if (n < asset.min) return toast.error(`Minimum deposit is $${asset.min}`);
    if (!txHash.trim()) return toast.error("Enter the transaction hash from your sent payment");
    setBusy("deposit");
    const { data: row, error } = await supabase.from("transactions").insert({
      user_id: data.data.user.id,
      type: "deposit",
      amount: n,
      status: "pending",
      method: "crypto",
      asset: asset.id,
      network: asset.network,
      destination: asset.address,
      plan: data.data.plan,
      reference: txHash.trim(),
      description: `Crypto deposit · ${asset.label}`,
    }).select("id").single();
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Deposit submitted for review — payment ID ${row.id.slice(0, 8)}. Funds credit after we confirm the transaction on-chain.`);
    setAmount(""); setTxHash("");
    qc.invalidateQueries({ queryKey: ["wallet"] });
  };

  const submitWithdraw = async () => {
    const n = Number(amount);
    if (!n || n <= 0) return toast.error("Enter a valid amount");
    if (!data.data?.user || !data.data.w) return;
    if (data.data.kyc !== "approved") return toast.error("Withdrawals require an approved KYC verification");
    const pending = (data.data.txns ?? [])
      .filter((t) => t.type === "withdrawal" && t.status === "pending")
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    const available = Number(data.data.w.cash_balance) - pending;
    if (available < n) return toast.error("Insufficient available balance (other withdrawals may still be pending review)");
    if (withdrawMethod === "crypto" && !wAddress.trim()) return toast.error("Enter destination wallet address");
    if (withdrawMethod === "bank" && (!bankName.trim() || !bankAccount.trim())) return toast.error("Enter bank details");
    setBusy("withdraw");
    const asset = CRYPTO_ASSETS.find((a) => a.id === wAsset);
    const { error: e2 } = await supabase.from("transactions").insert({
      user_id: data.data.user.id,
      type: "withdrawal",
      amount: -n,
      status: "pending",
      method: withdrawMethod,
      asset: withdrawMethod === "crypto" ? asset?.id : null,
      network: withdrawMethod === "crypto" ? asset?.network : null,
      destination: withdrawMethod === "crypto" ? wAddress.trim() : null,
      bank_name: withdrawMethod === "bank" ? bankName.trim() : null,
      bank_account: withdrawMethod === "bank" ? bankAccount.trim() : null,
      reference: reference.trim() || null,
      description: withdrawMethod === "crypto" ? `Crypto withdrawal · ${asset?.label}` : `Bank withdrawal · ${bankName.trim()}`,
    });
    setBusy(null);
    if (e2) return toast.error(e2.message);
    toast.success("Withdrawal request submitted — funds move once it's reviewed and approved");
    setAmount(""); setWAddress(""); setBankName(""); setBankAccount(""); setReference("");
    qc.invalidateQueries({ queryKey: ["wallet"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const w = data.data?.w;
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: w?.currency ?? "USD" });
  const depAsset = CRYPTO_ASSETS.find((a) => a.id === depositAsset)!;
  const kycApproved = data.data?.kyc === "approved";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <WalletIcon className="h-6 w-6 text-primary" />
        <h1 className="font-display text-3xl font-bold">Wallet</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Fund your <span className="font-medium capitalize">{data.data?.plan ?? "balanced"}</span> plan via crypto. Withdraw to crypto or bank transfer.{" "}
        <Link to="/plans" className="text-primary underline-offset-4 hover:underline">Change plan</Link>
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="glass-card rounded-2xl p-5"><p className="text-xs uppercase text-muted-foreground">Cash balance</p><p className="mt-2 font-display text-2xl font-bold">{fmt(Number(w?.cash_balance ?? 0))}</p></div>
        <div className="glass-card rounded-2xl p-5"><p className="text-xs uppercase text-muted-foreground">Invested</p><p className="mt-2 font-display text-2xl font-bold">{fmt(Number(w?.invested_balance ?? 0))}</p></div>
        <div className="glass-card rounded-2xl p-5"><p className="text-xs uppercase text-muted-foreground">Total</p><p className="mt-2 font-display text-2xl font-bold">{fmt(Number(w?.cash_balance ?? 0) + Number(w?.invested_balance ?? 0))}</p></div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <Tabs defaultValue="deposit">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="deposit"><ArrowDownLeft className="mr-1 h-4 w-4" /> Deposit</TabsTrigger>
              <TabsTrigger value="withdraw"><ArrowUpRight className="mr-1 h-4 w-4" /> Withdraw</TabsTrigger>
            </TabsList>
            <TabsContent value="deposit" className="mt-4 space-y-3">
              <Label>Crypto asset</Label>
              <Select value={depositAsset} onValueChange={(v) => setDepositAsset(v as typeof depositAsset)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CRYPTO_ASSETS.map((a) => (
                    <SelectItem key={a.id} value={a.id} disabled={!a.address}>
                      <span className="flex items-center gap-2"><Bitcoin className="h-3.5 w-3.5" />{a.label} · {a.network}{!a.address ? " · Coming soon" : ""}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Label htmlFor="amt">Amount (USD value)</Label>
              <Input id="amt" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />

              {depAsset.address ? (
                <div className="rounded-xl border border-border bg-card/50 p-3">
                  <p className="text-xs uppercase text-muted-foreground">Send {depAsset.id} on {depAsset.network} to</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <code className="break-all text-xs">{depAsset.address}</code>
                    <Button size="icon" variant="ghost" onClick={() => copy(depAsset.address!)}><Copy className="h-3.5 w-3.5" /></Button>
                  </div>
                  <p className="mt-2 flex items-start gap-1 text-[11px] text-muted-foreground">
                    <Info className="mt-0.5 h-3 w-3 shrink-0" />
                    Only send {depAsset.id} on the {depAsset.network} network. Other assets/networks may be lost.
                  </p>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">{depAsset.label} deposits aren't available yet — please use Bitcoin for now.</p>
              )}

              <Label htmlFor="txhash">Transaction hash</Label>
              <Input id="txhash" placeholder="Paste the on-chain transaction hash after sending" value={txHash} onChange={(e) => setTxHash(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">We manually verify each deposit against the blockchain before crediting it — this can take a few hours.</p>

              <Button disabled={busy !== null || !depAsset.address} onClick={submitDeposit} className="w-full bg-[image:var(--gradient-primary)] text-primary-foreground">
                {busy === "deposit" ? "Submitting…" : "I've sent the funds — submit deposit"}
              </Button>
              <p className="text-[11px] text-muted-foreground">Credited after we confirm the transaction on-chain. Network fees apply.</p>
            </TabsContent>

            <TabsContent value="withdraw" className="mt-4 space-y-3">
              {!kycApproved && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
                    <ShieldAlert className="h-4 w-4" /> KYC verification required
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    To protect your funds, withdrawals are only available to verified investors.{" "}
                    <Link to="/kyc" className="text-primary underline-offset-4 hover:underline">Complete KYC verification</Link>.
                  </p>
                </div>
              )}
              <Label>Withdrawal method</Label>
              <RadioGroup value={withdrawMethod} onValueChange={(v) => setWithdrawMethod(v as "crypto" | "bank")} className="grid grid-cols-2 gap-2">
                <label className={"flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm " + (withdrawMethod === "crypto" ? "border-primary bg-primary/5" : "border-border")}>
                  <RadioGroupItem value="crypto" /> <Bitcoin className="h-4 w-4" /> Crypto
                </label>
                <label className={"flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm " + (withdrawMethod === "bank" ? "border-primary bg-primary/5" : "border-border")}>
                  <RadioGroupItem value="bank" /> <Banknote className="h-4 w-4" /> Bank transfer
                </label>
              </RadioGroup>

              <Label htmlFor="wamt">Amount ({w?.currency ?? "USD"})</Label>
              <Input id="wamt" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />

              {withdrawMethod === "crypto" ? (
                <>
                  <Label>Asset & network</Label>
                  <Select value={wAsset} onValueChange={(v) => setWAsset(v as typeof wAsset)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CRYPTO_ASSETS.map((a) => <SelectItem key={a.id} value={a.id}>{a.label} · {a.network}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Label htmlFor="waddr">Destination wallet address</Label>
                  <Input id="waddr" placeholder="Paste your wallet address" value={wAddress} onChange={(e) => setWAddress(e.target.value)} />
                </>
              ) : (
                <>
                  <Label htmlFor="bn">Bank name</Label>
                  <Input id="bn" placeholder="e.g. Chase" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                  <Label htmlFor="ba">Account / IBAN</Label>
                  <Input id="ba" placeholder="Account number or IBAN" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
                  <Label htmlFor="ref">Reference (optional)</Label>
                  <Input id="ref" placeholder="SWIFT/routing or note" value={reference} onChange={(e) => setReference(e.target.value)} />
                </>
              )}

              <Button disabled={busy !== null} onClick={submitWithdraw} variant="outline" className="w-full">
                {busy === "withdraw" ? "Submitting…" : "Request withdrawal"}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                {withdrawMethod === "crypto" ? "Processed within 1 hour after review." : "Bank transfers typically arrive in 1–3 business days."}
              </p>
            </TabsContent>
          </Tabs>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <p className="font-display text-lg font-bold">Supported payment methods</p>
          <p className="mt-1 text-sm text-muted-foreground">Deposits are crypto only. Withdrawals support crypto and bank transfer.</p>
          <ul className="mt-4 space-y-3 text-sm">
            {CRYPTO_ASSETS.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-3">
                <span className="flex items-center gap-2"><Bitcoin className="h-4 w-4 text-primary" /><span className="font-medium">{a.label}</span></span>
                <Badge variant={a.address ? "outline" : "secondary"}>{a.address ? a.network : "Deposits coming soon"}</Badge>
              </li>
            ))}
            <li className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-3">
              <span className="flex items-center gap-2"><Banknote className="h-4 w-4 text-primary" /><span className="font-medium">Bank transfer (SWIFT / SEPA / ACH)</span></span>
              <Badge variant="outline">Withdraw only</Badge>
            </li>
          </ul>
        </div>
      </div>

      <div className="glass-card mt-6 rounded-2xl p-6">
        <p className="font-display text-lg font-bold">Activity history</p>
        <Table className="mt-3">
          <TableHeader>
            <TableRow><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {(data.data?.txns ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No transactions yet.</TableCell></TableRow>}
            {data.data?.txns?.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="capitalize">{t.type}</TableCell>
                <TableCell className="text-muted-foreground">{t.description ?? "—"}</TableCell>
                <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">{Number(t.amount) >= 0 ? "+" : ""}{fmt(Number(t.amount))}</TableCell>
                <TableCell><Badge variant={t.status === "completed" ? "secondary" : "outline"}>{t.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
