import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListKyc, adminSetKycStatus, adminGetKycDocumentUrl } from "@/lib/admin.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/kyc")({
  component: AdminKyc,
});

function AdminKyc() {
  const qc = useQueryClient();
  const list = useServerFn(adminListKyc);
  const setStatus = useServerFn(adminSetKycStatus);
  const getDocUrl = useServerFn(adminGetKycDocumentUrl);
  const q = useQuery({ queryKey: ["admin-kyc"], queryFn: list });

  const update = async (userId: string, status: "approved" | "rejected" | "not_started") => {
    try { await setStatus({ data: { userId, status } }); toast.success("Updated, user notified"); qc.invalidateQueries({ queryKey: ["admin-kyc"] }); }
    catch (e: any) { toast.error(e.message); }
  };

  const viewDocument = async (path: string) => {
    try {
      const { url } = await getDocUrl({ data: { path } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6">
      <p className="font-display text-lg font-bold">KYC submissions</p>
      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Legal name</TableHead><TableHead>Country</TableHead><TableHead>Document</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {(q.data ?? []).length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No KYC submissions yet.</TableCell></TableRow>
            )}
            {(q.data ?? []).map((k: any) => (
              <TableRow key={k.user_id}>
                <TableCell>
                  <p className="text-sm">{k.user_name || "—"}</p>
                  <p className="text-[11px] text-muted-foreground">{k.user_email ?? k.user_id}</p>
                </TableCell>
                <TableCell>{k.legal_name ?? "—"}</TableCell>
                <TableCell>{k.country ?? "—"}</TableCell>
                <TableCell>
                  {k.document_path ? (
                    <Button size="sm" variant="outline" onClick={() => viewDocument(k.document_path)}>View document</Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">{k.document_type ?? "Not uploaded"}</span>
                  )}
                </TableCell>
                <TableCell><Badge variant={k.status === "approved" ? "secondary" : k.status === "rejected" ? "destructive" : "outline"} className="capitalize">{k.status}</Badge></TableCell>
                <TableCell className="space-x-1 whitespace-nowrap">
                  <Button size="sm" onClick={() => update(k.user_id, "approved")}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => update(k.user_id, "rejected")}>Reject</Button>
                  <Button size="sm" variant="ghost" onClick={() => update(k.user_id, "not_started")}>Reset</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
