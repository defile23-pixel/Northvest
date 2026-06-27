import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListTransactions, adminSetTxStatus } from "@/lib/admin.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/transactions")({
  component: AdminTx,
});

// Lets an admin verify a deposit against a public block explorer before approving
// it — checking the actual on-chain transaction rather than trusting the amount
// the user typed in.
function explorerUrl(assetId: string | null, hash: string) {
  switch (assetId) {
    case "BTC": return `https://mempool.space/tx/${hash}`;
    case "ETH": return `https://etherscan.io/tx/${hash}`;
    case "USDT": return `https://tronscan.org/#/transaction/${hash}`;
    default: return null;
  }
}

function AdminTx() {
  const qc = useQueryClient();
  const list = useServerFn(adminListTransactions);
  const setStatus = useServerFn(adminSetTxStatus);
  const q = useQuery({ queryKey: ["admin-tx"], queryFn: list });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return (q.data ?? []).filter((t: any) =>
      (statusFilter === "all" || t.status === statusFilter) &&
      (typeFilter === "all" || t.type === typeFilter)
    );
  }, [q.data, statusFilter, typeFilter]);

  const update = async (id: string, status: "completed" | "failed") => {
    try { await setStatus({ data: { txId: id, status } }); toast.success("Updated, user notified"); qc.invalidateQueries({ queryKey: ["admin-tx"] }); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-lg font-bold">Transactions</p>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="deposit">Deposit</SelectItem>
              <SelectItem value="withdrawal">Withdrawal</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>User</TableHead><TableHead>Type</TableHead><TableHead>Method</TableHead><TableHead>Verify</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">No transactions match these filters.</TableCell></TableRow>
            )}
            {filtered.map((t: any) => {
              const url = t.type === "deposit" && t.reference ? explorerUrl(t.asset, t.reference) : null;
              return (
              <TableRow key={t.id}>
                <TableCell className="text-xs">{new Date(t.created_at).toLocaleString()}</TableCell>
                <TableCell>
                  <p className="text-sm">{t.user_name || "—"}</p>
                  <p className="text-[11px] text-muted-foreground">{t.user_email ?? t.user_id}</p>
                </TableCell>
                <TableCell className="capitalize">{t.type}</TableCell>
                <TableCell className="capitalize">{t.method ?? "—"} {t.asset ? `· ${t.asset}` : ""}</TableCell>
                <TableCell>
                  <p className="text-[11px] text-muted-foreground">ID {t.id.slice(0, 8)}</p>
                  {t.type === "deposit" && t.reference ? (
                    url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-primary underline-offset-4 hover:underline">
                        {t.reference.slice(0, 10)}… <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="break-all text-[11px] text-muted-foreground">{t.reference}</p>
                    )
                  ) : t.type === "deposit" ? (
                    <p className="text-[11px] text-muted-foreground">No hash submitted</p>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">{Number(t.amount).toLocaleString("en-US", { style: "currency", currency: "USD" })}</TableCell>
                <TableCell><Badge variant={t.status === "completed" ? "secondary" : t.status === "failed" ? "destructive" : "outline"}>{t.status}</Badge></TableCell>
                <TableCell className="space-x-1 whitespace-nowrap">
                  {t.status !== "completed" && <Button size="sm" onClick={() => update(t.id, "completed")}>Approve</Button>}
                  {t.status !== "failed" && <Button size="sm" variant="outline" onClick={() => update(t.id, "failed")}>Reject</Button>}
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
