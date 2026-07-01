import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListAuditLog } from "@/lib/admin.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AdminAudit,
});

const ACTION_LABELS: Record<string, string> = {
  wallet_adjust: "Balance adjusted",
  transaction_status: "Transaction decision",
  kyc_status: "KYC decision",
  review_status: "Review decision",
  admin_granted: "Admin granted",
  admin_revoked: "Admin revoked",
  setting_update: "Setting changed",
  note_added: "Note added",
  message_sent: "Message sent",
};

function AdminAudit() {
  const list = useServerFn(adminListAuditLog);
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ["admin-audit", page], queryFn: () => list({ data: { page } }) });
  const totalPages = Math.max(1, Math.ceil((q.data?.total ?? 0) / (q.data?.pageSize ?? 25)));

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6">
      <p className="font-display text-lg font-bold">Audit log</p>
      <p className="mt-1 text-sm text-muted-foreground">Every admin-initiated change — balance adjustments, approvals, KYC and review decisions, role changes, notes, and messages — with who did it, on whom, and why.</p>
      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Admin</TableHead><TableHead>Action</TableHead><TableHead>Target user</TableHead><TableHead>Change</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
          <TableBody>
            {(q.data?.rows ?? []).length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No admin actions recorded yet.</TableCell></TableRow>
            )}
            {q.data?.rows.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell className="text-xs">{new Date(a.created_at).toLocaleString()}</TableCell>
                <TableCell>
                  <p className="text-sm">{a.admin_name || "—"}</p>
                  <p className="text-[11px] text-muted-foreground">{a.admin_email ?? a.admin_id}</p>
                </TableCell>
                <TableCell><Badge variant="outline">{ACTION_LABELS[a.action] ?? a.action}</Badge></TableCell>
                <TableCell>
                  {a.target_user_id ? (
                    <>
                      <p className="text-sm">{a.target_name || "—"}</p>
                      <p className="text-[11px] text-muted-foreground">{a.target_email ?? a.target_user_id}</p>
                    </>
                  ) : "—"}
                </TableCell>
                <TableCell className="max-w-xs text-xs">
                  {a.before || a.after ? (
                    <>
                      {a.before && <p className="text-muted-foreground">Before: {JSON.stringify(a.before)}</p>}
                      {a.after && <p>After: {JSON.stringify(a.after)}</p>}
                    </>
                  ) : "—"}
                </TableCell>
                <TableCell className="max-w-xs text-xs">{a.reason ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>Page {page} of {totalPages} · {q.data?.total ?? 0} total</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /> Prev</Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
