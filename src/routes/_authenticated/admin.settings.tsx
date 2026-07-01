import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminUpdateSetting } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

type AssetSetting = { label: string; network: string; address: string | null; min: number };
type DepositAddresses = Record<string, AssetSetting>;
type Plan = { id: string; name: string; tag: string; risk: string; min: number; highlighted: boolean; features: string[] };

function useSetting<T>(key: string, fallback: T) {
  const q = useQuery({
    queryKey: ["admin-settings", key],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings" as never).select("*").eq("key", key).maybeSingle();
      if (error) throw error;
      return data as unknown as { key: string; value: T; updated_at: string } | null;
    },
  });
  return { data: q.data?.value ?? fallback, updatedAt: q.data?.updated_at, isLoading: q.isLoading };
}

function AdminSettings() {
  return (
    <div className="space-y-8">
      <DepositSettings />
      <PlanSettings />
    </div>
  );
}

function DepositSettings() {
  const qc = useQueryClient();
  const update = useServerFn(adminUpdateSetting);
  const [busy, setBusy] = useState(false);
  const { data, updatedAt, isLoading } = useSetting<DepositAddresses>("deposit_addresses", {});
  const [form, setForm] = useState<DepositAddresses>({});

  useEffect(() => { setForm(data); }, [data]);

  const setField = (asset: string, field: keyof AssetSetting, value: string) => {
    setForm((prev) => ({
      ...prev,
      [asset]: {
        ...prev[asset],
        [field]: field === "min" ? Number(value) || 0 : field === "address" ? (value.trim() === "" ? null : value.trim()) : value,
      },
    }));
  };

  const save = async () => {
    setBusy(true);
    try {
      await update({ data: { key: "deposit_addresses", value: form } });
      toast.success("Saved — live immediately, no redeploy needed");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  if (isLoading) return <div className="glass-card rounded-2xl p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6">
      <p className="font-display text-lg font-bold">Deposit settings</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Receiving addresses and minimum deposit amounts shown to users on the Wallet page. Changes take
        effect immediately. Leave an address blank to disable deposits for that asset.
      </p>
      <div className="mt-6 space-y-6">
        {Object.entries(form).map(([assetId, asset]) => (
          <div key={assetId} className="rounded-xl border border-border p-4">
            <p className="font-display font-bold">{asset.label || assetId}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div><Label className="text-xs">Network label</Label><Input value={asset.network ?? ""} onChange={(e) => setField(assetId, "network", e.target.value)} /></div>
              <div><Label className="text-xs">Minimum deposit (USD)</Label><Input type="number" value={asset.min ?? 0} onChange={(e) => setField(assetId, "min", e.target.value)} /></div>
            </div>
            <div className="mt-3">
              <Label className="text-xs">Receiving address (blank = disabled)</Label>
              <Input value={asset.address ?? ""} onChange={(e) => setField(assetId, "address", e.target.value)} placeholder="No address configured — deposits disabled for this asset" className="font-mono text-sm" />
            </div>
          </div>
        ))}
      </div>
      <Button onClick={save} disabled={busy} className="mt-6">{busy ? "Saving…" : "Save changes"}</Button>
      {updatedAt && <p className="mt-2 text-xs text-muted-foreground">Last updated {new Date(updatedAt).toLocaleString()}</p>}
    </div>
  );
}

function emptyPlan(): Plan {
  return { id: `plan-${Date.now()}`, name: "New plan", tag: "", risk: "", min: 0, highlighted: false, features: [] };
}

function PlanSettings() {
  const qc = useQueryClient();
  const update = useServerFn(adminUpdateSetting);
  const [busy, setBusy] = useState(false);
  const { data, updatedAt, isLoading } = useSetting<Plan[]>("plans", []);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => { setPlans(data); }, [data]);

  const setField = (idx: number, field: keyof Plan, value: string | boolean) => {
    setPlans((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: field === "min" ? Number(value) || 0 : value } : p)));
  };

  const setFeatures = (idx: number, text: string) => {
    setPlans((prev) => prev.map((p, i) => (i === idx ? { ...p, features: text.split("\n").map((f) => f.trim()).filter(Boolean) } : p)));
  };

  const addPlan = () => setPlans((prev) => [...prev, emptyPlan()]);
  const removePlan = (idx: number) => setPlans((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    if (plans.some((p) => !p.id.trim() || !p.name.trim())) return toast.error("Every plan needs at least an ID and a name");
    const ids = plans.map((p) => p.id.trim());
    if (new Set(ids).size !== ids.length) return toast.error("Plan IDs must be unique — two plans currently share an ID");
    setBusy(true);
    try {
      await update({ data: { key: "plans", value: plans } });
      toast.success("Saved — live immediately, no redeploy needed");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["plans-setting"] });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  if (isLoading) return <div className="glass-card rounded-2xl p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6">
      <p className="font-display text-lg font-bold">Investment plans</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Edits here update the dashboard, the /plans page, and the public landing page everywhere. Don't change
        a plan's ID once real users have selected it — just edit the other fields.
      </p>
      <div className="mt-6 space-y-6">
        {plans.map((p, idx) => (
          <div key={idx} className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <p className="font-display font-bold">{p.name || `Plan ${idx + 1}`}</p>
              <Button size="sm" variant="ghost" onClick={() => removePlan(idx)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div><Label className="text-xs">Internal ID (no spaces)</Label><Input value={p.id} onChange={(e) => setField(idx, "id", e.target.value)} /></div>
              <div><Label className="text-xs">Display name</Label><Input value={p.name} onChange={(e) => setField(idx, "name", e.target.value)} /></div>
              <div><Label className="text-xs">Tag (e.g. "Most popular")</Label><Input value={p.tag} onChange={(e) => setField(idx, "tag", e.target.value)} /></div>
              <div><Label className="text-xs">Risk description</Label><Input value={p.risk} onChange={(e) => setField(idx, "risk", e.target.value)} /></div>
              <div><Label className="text-xs">Minimum deposit (USD)</Label><Input type="number" value={p.min} onChange={(e) => setField(idx, "min", e.target.value)} /></div>
              <div className="flex items-center gap-2 pt-5">
                <Switch checked={p.highlighted} onCheckedChange={(v) => setField(idx, "highlighted", v)} />
                <Label className="text-xs">Highlight on landing page</Label>
              </div>
            </div>
            <div className="mt-3">
              <Label className="text-xs">Features (one per line)</Label>
              <Textarea rows={4} value={p.features.join("\n")} onChange={(e) => setFeatures(idx, e.target.value)} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="outline" onClick={addPlan}><Plus className="mr-1 h-4 w-4" /> Add plan</Button>
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
      </div>
      {updatedAt && <p className="mt-2 text-xs text-muted-foreground">Last updated {new Date(updatedAt).toLocaleString()}</p>}
    </div>
  );
}
