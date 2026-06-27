import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, Sun, Moon, Monitor } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTheme } from "@/components/theme-provider";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Northvest" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [form, setForm] = useState({ full_name: "", risk_profile: "balanced" as "starter" | "balanced" | "growth" });

  const data = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return { user, p };
    },
  });

  useEffect(() => {
    if (data.data?.p) setForm({ full_name: data.data.p.full_name ?? "", risk_profile: (data.data.p.risk_profile as never) ?? "balanced" });
  }, [data.data?.p]);

  const save = async () => {
    if (!data.data?.user) return;
    const { error } = await supabase.from("profiles").update({ full_name: form.full_name, risk_profile: form.risk_profile, updated_at: new Date().toISOString() }).eq("id", data.data.user.id);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["settings"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3"><SettingsIcon className="h-6 w-6 text-primary" /><h1 className="font-display text-3xl font-bold">Settings</h1></div>
      <p className="mt-1 text-sm text-muted-foreground">Manage your profile, appearance, and investing preferences.</p>

      <div className="glass-card mt-6 rounded-2xl p-6">
        <p className="font-display text-lg font-bold">Profile</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2"><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="space-y-2"><Label>Email</Label><Input value={data.data?.user?.email ?? ""} disabled /></div>
        </div>
      </div>

      <div className="glass-card mt-6 rounded-2xl p-6">
        <p className="font-display text-lg font-bold">Risk profile</p>
        <p className="text-sm text-muted-foreground">Your plan determines how your portfolio is allocated.</p>
        <Select value={form.risk_profile} onValueChange={(v) => setForm({ ...form, risk_profile: v as never })}>
          <SelectTrigger className="mt-3 sm:max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="starter">Starter — low risk, capital preservation</SelectItem>
            <SelectItem value="balanced">Balanced — moderate risk, mixed assets</SelectItem>
            <SelectItem value="growth">Growth — higher risk, long horizon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card mt-6 rounded-2xl p-6">
        <p className="font-display text-lg font-bold">Appearance</p>
        <p className="text-sm text-muted-foreground">Switch between daylight and night mode.</p>
        <RadioGroup value={theme} onValueChange={(v) => setTheme(v as never)} className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { v: "light", label: "Daylight", Icon: Sun },
            { v: "dark", label: "Night", Icon: Moon },
            { v: "system", label: "System", Icon: Monitor },
          ].map(({ v, label, Icon }) => (
            <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${theme === v ? "border-primary bg-primary/5" : "border-border"}`}>
              <RadioGroupItem value={v} />
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={save} className="bg-[image:var(--gradient-primary)] text-primary-foreground">Save changes</Button>
      </div>
    </div>
  );
}