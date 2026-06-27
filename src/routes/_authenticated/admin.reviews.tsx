import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListReviews, adminSetReviewStatus } from "@/lib/admin.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  component: AdminReviews,
});

function AdminReviews() {
  const qc = useQueryClient();
  const list = useServerFn(adminListReviews);
  const setStatus = useServerFn(adminSetReviewStatus);
  const q = useQuery({ queryKey: ["admin-reviews"], queryFn: list });
  const update = async (reviewId: string, status: "approved" | "rejected" | "pending") => {
    try { await setStatus({ data: { reviewId, status } }); toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-reviews"] }); }
    catch (e: any) { toast.error(e.message); }
  };
  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6">
      <p className="font-display text-lg font-bold">Reviews</p>
      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Author</TableHead><TableHead>Rating</TableHead><TableHead>Review</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {(q.data ?? []).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.author_name || "—"}</TableCell>
                <TableCell><span className="flex items-center gap-0.5">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-amber-500 text-amber-500" />)}</span></TableCell>
                <TableCell className="max-w-md"><p className="font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{r.body}</p></TableCell>
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
    </div>
  );
}