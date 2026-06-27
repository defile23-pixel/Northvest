import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Northvest" }] }),
  component: NotificationsPage,
});

const fields = [
  { key: "email_account", label: "Account & security emails", desc: "Sign-ins from new devices, password changes, KYC updates." },
  { key: "email_performance", label: "Monthly performance summary", desc: "A clear breakdown of your portfolio at month end." },
  { key: "email_marketing", label: "Product updates", desc: "Occasional news about features and educational content." },
  { key: "push_security", label: "Push: security alerts", desc: "Critical alerts you should never miss." },
  { key: "push_transactions", label: "Push: transactions", desc: "Deposits, withdrawals, and investment confirmations." },
] as const;

function NotificationsPage() {
  const qc = useQueryClient();

  const data = useQuery({
    queryKey: ["prefs"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: p } = await supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle();
      return { user, p };
    },
  });

  const feed = useQuery({
    queryKey: ["notifications-feed"],
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  type PrefKey = (typeof fields)[number]["key"];
  const update = async (key: PrefKey, value: boolean) => {
    if (!data.data?.user) return;
    const patch = { [key]: value, updated_at: new Date().toISOString() } as Record<string, unknown>;
    const { error } = await supabase.from("notification_preferences").update(patch as never).eq("user_id", data.data.user.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["prefs"] });
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications-feed"] });
    qc.invalidateQueries({ queryKey: ["notifications-preview"] });
  };

  const markAllRead = async () => {
    const unread = (feed.data ?? []).filter((n) => !n.read);
    if (unread.length === 0) return;
    await Promise.all(unread.map((n) => supabase.from("notifications").update({ read: true }).eq("id", n.id)));
    qc.invalidateQueries({ queryKey: ["notifications-feed"] });
    qc.invalidateQueries({ queryKey: ["notifications-preview"] });
  };

  const unreadCount = (feed.data ?? []).filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3"><Bell className="h-6 w-6 text-primary" /><h1 className="font-display text-3xl font-bold">Notifications</h1></div>
      <p className="mt-1 text-sm text-muted-foreground">Updates about your account, plus how we keep you informed.</p>

      <div className="glass-card mt-6 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-bold">Inbox</p>
          {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={markAllRead}>Mark all read</Button>}
        </div>
        <ul className="mt-2 divide-y divide-border">
          {(feed.data ?? []).length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">Nothing yet — updates about deposits, withdrawals, and KYC will show up here.</li>
          )}
          {feed.data?.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-3 py-3 text-sm">
              <div>
                <p className={"font-medium " + (n.read ? "text-muted-foreground" : "")}>{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                {!n.read && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark read</Button>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-8 text-sm font-medium text-muted-foreground">Delivery preferences</p>
      <div className="glass-card mt-3 divide-y divide-border rounded-2xl">
        {fields.map((f) => (
          <div key={f.key} className="flex items-start justify-between gap-4 p-5">
            <div>
              <p className="font-medium">{f.label}</p>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
            <Switch
              checked={Boolean((data.data?.p as Record<string, unknown> | null | undefined)?.[f.key] ?? true)}
              onCheckedChange={(v) => update(f.key, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
