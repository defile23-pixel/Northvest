import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reviews")({
  head: () => ({ meta: [{ title: "Your review — Northvest" }] }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["my-review"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const [{ data: rev }, { data: prof }] = await Promise.all([
        supabase.from("reviews" as never).select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      ]);
      return { user, review: rev as { id: string; rating: number; title: string; body: string; author_name: string; status: string } | null, fullName: prof?.full_name ?? "" };
    },
  });

  useEffect(() => {
    if (data?.review) {
      setRating(data.review.rating);
      setTitle(data.review.title ?? "");
      setBody(data.review.body ?? "");
      setAuthorName(data.review.author_name || data.fullName || "");
    } else if (data?.fullName) {
      setAuthorName(data.fullName);
    }
  }, [data]);

  const submit = async () => {
    if (!data?.user) return;
    if (!body.trim() || body.trim().length < 20) return toast.error("Please write at least 20 characters.");
    setBusy(true);
    const payload = {
      user_id: data.user.id,
      author_name: authorName.trim() || "Verified investor",
      rating, title: title.trim(), body: body.trim(),
    };
    const { error } = await (supabase.from("reviews" as never) as any).upsert(payload, { onConflict: "user_id" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Review submitted — pending moderation");
    qc.invalidateQueries({ queryKey: ["my-review"] });
  };

  const r = data?.review;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-6 w-6 text-primary" />
        <h1 className="font-display text-3xl font-bold">Your review</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Share your experience. Approved reviews appear on the homepage.</p>

      {r && (
        <div className="glass-card mt-6 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Current status</p>
            <Badge variant={r.status === "approved" ? "secondary" : "outline"} className="capitalize">{r.status}</Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {r.status === "approved" && "Your review is live on the homepage."}
            {r.status === "pending" && "Your review is waiting for moderation."}
            {r.status === "rejected" && "Your review was not approved. You can edit and resubmit below."}
          </p>
        </div>
      )}

      <div className="glass-card mt-6 space-y-4 rounded-2xl p-6">
        <div>
          <Label>Rating</Label>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Star className={"h-7 w-7 " + (n <= rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40")} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="an">Display name</Label>
          <Input id="an" value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Shown publicly on your review" />
        </div>
        <div>
          <Label htmlFor="rt">Headline (optional)</Label>
          <Input id="rt" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A clear, transparent platform" maxLength={80} />
        </div>
        <div>
          <Label htmlFor="rb">Your review</Label>
          <Textarea id="rb" rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What worked well for you? What could improve?" maxLength={600} />
          <p className="mt-1 text-[11px] text-muted-foreground">{body.length}/600 characters · minimum 20</p>
        </div>
        <Button disabled={busy} onClick={submit} className="bg-[image:var(--gradient-primary)] text-primary-foreground">
          {busy ? "Saving…" : r ? "Update review" : "Submit review"}
        </Button>
      </div>
    </div>
  );
}