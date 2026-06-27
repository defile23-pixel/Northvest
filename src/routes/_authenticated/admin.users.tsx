import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListUsers, adminSetRole } from "@/lib/admin.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const qc = useQueryClient();
  const list = useServerFn(adminListUsers);
  const setRole = useServerFn(adminSetRole);
  const q = useQuery({ queryKey: ["admin-users"], queryFn: list });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return q.data ?? [];
    return (q.data ?? []).filter((u: any) =>
      (u.full_name ?? "").toLowerCase().includes(s) ||
      (u.email ?? "").toLowerCase().includes(s) ||
      u.id.toLowerCase().includes(s)
    );
  }, [q.data, search]);

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
          placeholder="Search by name, email, or user ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No users match that search.</TableCell></TableRow>
            )}
            {filtered.map((u: any) => {
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
    </div>
  );
}
