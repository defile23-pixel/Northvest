import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListReviews, adminSetReviewStatus } from "@/lib/admin.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  component: AdminReviews,
});

function AdminReviews() {
  const qc = useQueryClient();
  const list = useServerFn(adminListReviews);
  const setStatus = useServerFn(adminSetReviewStatus);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const q = useQuery({ queryKey: ["admin-reviews", page, search], queryFn: () => list({ data: { page, search } }) });
  const totalPages = Math.max(1, Math.ceil((q.data?.total ?? 0) / (q.data?.pageSize ?? 25)));

  const update = async (reviewId: string, status: "approved" | "rejected" | "pending") => {
    try { await setStatus({ data: { reviewId, status } }); toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-reviews"] }); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-lg font-bold">Reviews</p>
        <Input
          placeholder="Search author, title, or text…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
      </div>
      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Author</TableHead><TableHead>Rating</TableHead><TableHead>Review</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {(q.data?.rows ?? []).length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No reviews match.</TableCell></TableRow>
            )}
            {(q.data?.rows ?? []).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.author_name || "—"}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-amber-500 text-amber-500" />)}
                  </span>
                </TableCell>
                <TableCell className="max-w-md">
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.body}</p>
                </TableCell>
                <TableCell><Badge variant={r.status === "approved" ? "secondary" : r.status === "rejected" ? "destructive" : "outline"} className="capitalize">{r.status}</Badge></TableCell>
                <TableCell className="space-x-1 whitespace-nowrap">
                  <Button size="sm" onClick={() => update(r.id, "approved")}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => update(r.id, "rejected")}>Reject</Button>
                </TableCell>
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
