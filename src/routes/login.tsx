import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TrendingUp, ShieldCheck } from "lucide-react";
import authImg from "@/assets/auth-illustration.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Northvest" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[image:var(--gradient-hero)] p-10 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold">Northvest</span>
        </Link>
        <div className="relative">
          <img src={authImg} alt="" width={520} height={520} className="animate-float mx-auto h-80 w-80 object-contain" />
          <h2 className="mt-6 max-w-md font-display text-3xl font-bold leading-tight">
            Welcome back. Your long-term plan is waiting.
          </h2>
          <p className="mt-3 max-w-md text-sm text-white/70">
            Sign in securely with bank-grade encryption and multi-factor protection.
          </p>
        </div>
        <p className="text-xs text-white/60">© Northvest · Long-term investing, modernized</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="font-display text-lg font-bold">Northvest</span>
            </Link>
          </div>
          <h1 className="font-display text-3xl font-bold">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">Access your portfolio and continue investing responsibly.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>
              </div>
              <Input id="password" name="password" type="password" required placeholder="••••••••" autoComplete="current-password" />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox id="remember" /> Remember me on this device
            </label>
            <Button type="submit" disabled={loading} className="w-full bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-soft)]">
              <ShieldCheck className="mr-1 h-4 w-4" /> {loading ? "Signing in…" : "Secure sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here? <Link to="/register" className="font-medium text-primary hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
