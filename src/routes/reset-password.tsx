import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Choose a new password — Northvest" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords don't match");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="grid min-h-screen place-items-center px-6 soft-bg">
      <div className="w-full max-w-md">
        <h1 className="font-display text-3xl font-bold">Set a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ready ? "Choose a strong password you don't use anywhere else." : "Verifying your reset link…"}
        </p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" name="confirm" type="password" required minLength={8} />
          </div>
          <Button type="submit" disabled={loading || !ready} className="w-full bg-[image:var(--gradient-primary)] text-primary-foreground">
            {loading ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}