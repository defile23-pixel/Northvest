import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TrendingUp, Sparkles } from "lucide-react";
import authImg from "@/assets/auth-illustration.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account — Northvest" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get("name") ?? "");
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords don't match");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — check your email to confirm.");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold">Northvest</span>
          </Link>
          <h1 className="mt-8 font-display text-3xl font-bold">Open your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Get started in a few minutes — no commitment required.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" required placeholder="Jane Cooper" autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" name="phone" type="tel" placeholder="+1 (555) 000-0000" autoComplete="tel" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm</Label>
                <Input id="confirm" name="confirm" type="password" required placeholder="••••••••" />
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <Checkbox id="tos" required className="mt-0.5" />
              <span>I agree to the Terms of Service, Privacy Policy, and acknowledge the Risk Disclosure.</span>
            </label>
            <Button type="submit" disabled={loading} className="w-full bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-soft)]">
              <Sparkles className="mr-1 h-4 w-4" /> {loading ? "Creating…" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>

      <div className="relative hidden flex-col justify-between overflow-hidden bg-[image:var(--gradient-hero)] p-10 text-primary-foreground lg:flex">
        <div />
        <div className="relative">
          <img src={authImg} alt="" width={520} height={520} className="animate-float mx-auto h-80 w-80 object-contain" />
          <h2 className="mt-6 max-w-md font-display text-3xl font-bold leading-tight">
            A modern home for your long-term plan.
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            <li>✓ Transparent fees with no surprises</li>
            <li>✓ Diversified portfolios for every risk profile</li>
            <li>✓ Bank-grade security and segregated funds</li>
          </ul>
        </div>
        <p className="text-xs text-white/60">All investments carry risk. Returns are not guaranteed.</p>
      </div>
    </div>
  );
}
