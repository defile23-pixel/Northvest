import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListUsers, adminSetRole } from "@/lib/admin.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const qc = useQueryClient();
  const list = useServerFn(adminListUsers);
  const setRole = useServerFn(adminSetRole);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const q = useQuery({ queryKey: ["admin-users", page, search], queryFn: () => list({ data: { page, search } }) });

  const totalPages = Math.max(1, Math.ceil((q.data?.total ?? 0) / (q.data?.pageSize ?? 25)));

  const toggleAdmin = async (id: string, isAdminFlag: boolean) => {
    try {
      await setRole({ data: { userId: id, admin: !isAdminFlag } });
      toast.success(isAdminFlag ? "Admin revoked" : "Admin granted");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-lg font-bold">Users</p>
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
      </div>
      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>KYC</TableHead>
              <TableHead>Cash</TableHead>
              <TableHead>Invested</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(q.data?.rows ?? []).length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No users match that search.</TableCell></TableRow>
            )}
            {q.data?.rows.map((u: any) => {
              const isAdminFlag = (u.roles ?? []).includes("admin");
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <p className="font-medium">{u.full_name || "—"}</p>
                    <p className="text-[11px] text-muted-foreground">{u.email ?? u.id}</p>
                    {isAdminFlag && <Badge className="mt-1" variant="secondary">Admin</Badge>}
                  </TableCell>
                  <TableCell className="capitalize">{u.selected_plan}</TableCell>
                  <TableCell><Badge variant={u.kyc_status === "approved" ? "secondary" : "outline"} className="capitalize">{u.kyc_status}</Badge></TableCell>
                  <TableCell>{Number(u.wallet?.cash_balance ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}</TableCell>
                  <TableCell>{Number(u.wallet?.invested_balance ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}</TableCell>
                  <TableCell className="space-x-2 whitespace-nowrap">
                    <Button asChild size="sm"><Link to="/admin/users/$userId" params={{ userId: u.id }}>Manage</Link></Button>
                    <Button size="sm" variant="outline" onClick={() => toggleAdmin(u.id, isAdminFlag)}>{isAdminFlag ? "Revoke admin" : "Grant admin"}</Button>
                  </TableCell>
                </TableRow>
              );
            })}
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
