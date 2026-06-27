import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — Northvest" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Reset link sent");
  };

  return (
    <div className="grid min-h-screen place-items-center px-6 soft-bg">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold">Northvest</span>
        </Link>
        <h1 className="font-display text-3xl font-bold">Reset your password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and we'll send you a secure link to choose a new password.
        </p>
        {sent ? (
          <div className="glass-card mt-8 rounded-2xl p-6 text-sm text-muted-foreground">
            Check your inbox for the reset link. It expires in 1 hour.
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-[image:var(--gradient-primary)] text-primary-foreground">
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}