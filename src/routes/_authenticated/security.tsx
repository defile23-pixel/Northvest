import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ShieldCheck, KeyRound, History, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({ meta: [{ title: "Security center — Northvest" }] }),
  component: SecurityPage,
});

function SecurityPage() {
  const qc = useQueryClient();
  const [twoFAOpen, setTwoFAOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ next: "", confirm: "" });

  const data = useQuery({
    queryKey: ["security"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const [{ data: p }, { data: events }] = await Promise.all([
        supabase.from("profiles").select("two_factor_enabled").eq("id", user.id).maybeSingle(),
        supabase.from("security_events").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);
      return { user, p, events: events ?? [] };
    },
  });

  const toggle2FA = async (enabled: boolean) => {
    if (enabled) { setTwoFAOpen(true); return; }
    if (!data.data?.user) return;
    await supabase.from("profiles").update({ two_factor_enabled: false }).eq("id", data.data.user.id);
    await supabase.from("security_events").insert({ user_id: data.data.user.id, event_type: "2fa_disabled", description: "Two-factor authentication disabled" });
    toast.success("2FA disabled");
    qc.invalidateQueries({ queryKey: ["security"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const confirm2FA = async () => {
    if (otp.length !== 6) return toast.error("Enter the 6-digit code");
    if (!data.data?.user) return;
    await supabase.from("profiles").update({ two_factor_enabled: true }).eq("id", data.data.user.id);
    await supabase.from("security_events").insert({ user_id: data.data.user.id, event_type: "2fa_enabled", description: "Two-factor authentication enabled" });
    setTwoFAOpen(false);
    setOtp("");
    toast.success("2FA enabled");
    qc.invalidateQueries({ queryKey: ["security"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const changePw = async () => {
    if (pw.next.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw.next !== pw.confirm) return toast.error("Passwords don't match");
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    if (error) return toast.error(error.message);
    if (data.data?.user) await supabase.from("security_events").insert({ user_id: data.data.user.id, event_type: "password_changed", description: "Password updated" });
    setPwOpen(false);
    setPw({ next: "", confirm: "" });
    toast.success("Password updated");
    qc.invalidateQueries({ queryKey: ["security"] });
  };

  const enabled = data.data?.p?.two_factor_enabled ?? false;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-primary" /><h1 className="font-display text-3xl font-bold">Security center</h1></div>
      <p className="mt-1 text-sm text-muted-foreground">Manage how you sign in and review recent account activity.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Smartphone className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-display text-lg font-bold">Two-factor authentication</p>
                <p className="text-sm text-muted-foreground">Require a one-time code from your authenticator app at sign-in.</p>
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={toggle2FA} />
          </div>
          <Badge variant={enabled ? "default" : "outline"} className="mt-3">{enabled ? "Enabled" : "Disabled"}</Badge>

          <Dialog open={twoFAOpen} onOpenChange={setTwoFAOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set up authenticator</DialogTitle>
                <DialogDescription>Scan this QR code with Google Authenticator, 1Password, or Authy, then enter the 6-digit code below.</DialogDescription>
              </DialogHeader>
              <div className="grid place-items-center py-2">
                <div className="grid h-40 w-40 place-items-center rounded-xl bg-foreground/90 text-background text-xs">QR code (demo)</div>
              </div>
              <div className="grid place-items-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, i) => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setTwoFAOpen(false)}>Cancel</Button>
                <Button onClick={confirm2FA} className="bg-[image:var(--gradient-primary)] text-primary-foreground">Confirm & enable</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="font-display text-lg font-bold">Password</p>
              <p className="text-sm text-muted-foreground">Use a long, unique password you don't reuse anywhere else.</p>
            </div>
          </div>
          <Dialog open={pwOpen} onOpenChange={setPwOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="mt-4">Change password</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Change password</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2"><Label>New password</Label><Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
                <div className="space-y-2"><Label>Confirm password</Label><Input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setPwOpen(false)}>Cancel</Button>
                <Button onClick={changePw} className="bg-[image:var(--gradient-primary)] text-primary-foreground">Update</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="glass-card mt-6 rounded-2xl p-6">
        <div className="flex items-center gap-2"><History className="h-5 w-5 text-primary" /><p className="font-display text-lg font-bold">Recent activity</p></div>
        <ul className="mt-4 divide-y divide-border">
          {(data.data?.events ?? []).length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No security events yet.</li>}
          {data.data?.events?.map((e) => (
            <li key={e.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium capitalize">{e.event_type.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground">{e.description}</p>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}