import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminUpdateSetting } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

type AssetSetting = { label: string; network: string; address: string | null; min: number };
type DepositAddresses = Record<string, AssetSetting>;

function AdminSettings() {
  const qc = useQueryClient();
  const update = useServerFn(adminUpdateSetting);
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["admin-settings", "deposit_addresses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings" as never).select("*").eq("key", "deposit_addresses").maybeSingle();
      if (error) throw error;
      return data as unknown as { key: string; value: DepositAddresses; updated_at: string } | null;
    },
  });

  const [form, setForm] = useState<DepositAddresses>({});

  useEffect(() => {
    if (q.data?.value) setForm(q.data.value);
  }, [q.data]);

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
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (q.isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6">
      <p className="font-display text-lg font-bold">Deposit settings</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Receiving addresses and minimum deposit amounts shown to users on the Wallet page. Changes here take
        effect immediately — no code change or redeploy required. Leave an address blank to disable deposits
        for that asset (shown to users as "coming soon").
      </p>

      <div className="mt-6 space-y-6">
        {Object.entries(form).map(([assetId, asset]) => (
          <div key={assetId} className="rounded-xl border border-border p-4">
            <p className="font-display font-bold">{asset.label || assetId}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Network label</Label>
                <Input value={asset.network ?? ""} onChange={(e) => setField(assetId, "network", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Minimum deposit (USD)</Label>
                <Input type="number" value={asset.min ?? 0} onChange={(e) => setField(assetId, "min", e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <Label className="text-xs">Receiving address (blank = disabled)</Label>
              <Input
                value={asset.address ?? ""}
                onChange={(e) => setField(assetId, "address", e.target.value)}
                placeholder="No address configured — deposits disabled for this asset"
                className="font-mono text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      <Button onClick={save} disabled={busy} className="mt-6">
        {busy ? "Saving…" : "Save changes"}
      </Button>
      {q.data?.updated_at && (
        <p className="mt-2 text-xs text-muted-foreground">Last updated {new Date(q.data.updated_at).toLocaleString()}</p>
      )}
    </div>
  );
}
