import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// auth.users isn't exposed over PostgREST, so user emails are fetched via the
// GoTrue admin API (service role only) and merged into the public-table results
// the admin UI shows, instead of every list showing a bare UUID.
async function emailMap(supabaseAdmin: any): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let page = 1;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    for (const u of data?.users ?? []) if (u.email) map.set(u.id, u.email);
    if (!data?.users || data.users.length < 200) break;
    page += 1;
    if (page > 25) break; // safety cap
  }
  return map;
}

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { isAdmin: !!data };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: cErr } = await (supabaseAdmin as any).from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) > 0) throw new Error("An administrator already exists");
    const { error } = await (supabaseAdmin as any).from("user_roles").insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as any;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [users, newUsers, kycPending, txPending, revPending, wallets, completedTx] = await Promise.all([
      sa.from("profiles").select("*", { count: "exact", head: true }),
      sa.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      sa.from("kyc_verifications").select("*", { count: "exact", head: true }).eq("status", "in_review"),
      sa.from("transactions").select("*", { count: "exact", head: true }).eq("status", "pending"),
      sa.from("reviews").select("*", { count: "exact", head: true }).eq("status", "pending"),
      sa.from("wallets").select("cash_balance, invested_balance"),
      sa.from("transactions").select("type, amount").eq("status", "completed"),
    ]);
    const totalCash = (wallets.data ?? []).reduce((s: number, w: any) => s + Number(w.cash_balance), 0);
    const totalInvested = (wallets.data ?? []).reduce((s: number, w: any) => s + Number(w.invested_balance), 0);
    const depositVolume = (completedTx.data ?? []).filter((t: any) => t.type === "deposit").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const withdrawalVolume = (completedTx.data ?? []).filter((t: any) => t.type === "withdrawal").reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0);
    return {
      users: users.count ?? 0,
      newUsers7d: newUsers.count ?? 0,
      kycPending: kycPending.count ?? 0,
      txPending: txPending.count ?? 0,
      reviewsPending: revPending.count ?? 0,
      totalCash,
      totalInvested,
      depositVolume,
      withdrawalVolume,
    };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as any;
    const [{ data: profiles }, { data: wallets }, { data: roles }, { data: kyc }, emails] = await Promise.all([
      sa.from("profiles").select("id, full_name, selected_plan, risk_profile, created_at").order("created_at", { ascending: false }).limit(200),
      sa.from("wallets").select("user_id, cash_balance, invested_balance, currency"),
      sa.from("user_roles").select("user_id, role"),
      sa.from("kyc_verifications").select("user_id, status"),
      emailMap(sa),
    ]);
    const wMap = new Map((wallets ?? []).map((w: any) => [w.user_id, w]));
    const rMap = new Map<string, string[]>();
    for (const r of roles ?? []) { const arr = rMap.get(r.user_id) ?? []; arr.push(r.role); rMap.set(r.user_id, arr); }
    const kMap = new Map((kyc ?? []).map((k: any) => [k.user_id, k.status]));
    return (profiles ?? []).map((p: any) => ({
      ...p,
      email: emails.get(p.id) ?? null,
      wallet: wMap.get(p.id) ?? null,
      roles: rMap.get(p.id) ?? [],
      kyc_status: kMap.get(p.id) ?? "not_started",
    }));
  });

export const adminGetUserDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as any;
    const [{ data: profile }, { data: wallet }, { data: kyc }, { data: roles }, { data: txns }, { data: events }, { data: notifs }, emails] = await Promise.all([
      sa.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
      sa.from("wallets").select("*").eq("user_id", data.userId).maybeSingle(),
      sa.from("kyc_verifications").select("*").eq("user_id", data.userId).maybeSingle(),
      sa.from("user_roles").select("role").eq("user_id", data.userId),
      sa.from("transactions").select("*").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(50),
      sa.from("security_events").select("*").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(20),
      sa.from("notifications").select("*").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(20),
      emailMap(sa),
    ]);
    if (!profile) throw new Error("User not found");
    return {
      profile,
      email: emails.get(data.userId) ?? null,
      wallet,
      kyc,
      roles: (roles ?? []).map((r: any) => r.role),
      txns: txns ?? [],
      events: events ?? [],
      notifications: notifs ?? [],
    };
  });

export const adminAdjustBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; cash?: number; invested?: number; reason: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (!data.reason || !data.reason.trim()) throw new Error("A reason is required for manual balance adjustments");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).rpc("admin_adjust_wallet", {
      _admin_id: context.userId,
      _user_id: data.userId,
      _cash: typeof data.cash === "number" ? data.cash : null,
      _invested: typeof data.invested === "number" ? data.invested : null,
      _reason: data.reason.trim(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; admin: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as any;
    if (data.admin) {
      const { error } = await sa.from("user_roles").upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
      await sa.from("admin_actions").insert({ admin_id: context.userId, action: "admin_granted", target_user_id: data.userId, target_id: data.userId });
    } else {
      const { error } = await sa.rpc("revoke_admin_role", { _admin_id: context.userId, _target_user_id: data.userId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminListTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as any;
    const [{ data }, { data: profiles }, emails] = await Promise.all([
      sa.from("transactions").select("*").order("created_at", { ascending: false }).limit(200),
      sa.from("profiles").select("id, full_name"),
      emailMap(sa),
    ]);
    const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
    return (data ?? []).map((t: any) => ({ ...t, user_name: nameMap.get(t.user_id) ?? null, user_email: emails.get(t.user_id) ?? null }));
  });

export const adminSetTxStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { txId: string; status: "pending" | "completed" | "failed" }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).rpc("set_transaction_status", { _admin_id: context.userId, _tx_id: data.txId, _status: data.status });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListKyc = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as any;
    const [{ data }, { data: profiles }, emails] = await Promise.all([
      sa.from("kyc_verifications").select("*").order("updated_at", { ascending: false }).limit(200),
      sa.from("profiles").select("id, full_name"),
      emailMap(sa),
    ]);
    const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
    return (data ?? []).map((k: any) => ({ ...k, user_name: nameMap.get(k.user_id) ?? null, user_email: emails.get(k.user_id) ?? null }));
  });

export const adminSetKycStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; status: "not_started" | "in_review" | "approved" | "rejected" }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).rpc("set_kyc_status", { _admin_id: context.userId, _user_id: data.userId, _status: data.status });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGetKycDocumentUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await (supabaseAdmin as any).storage.from("kyc-documents").createSignedUrl(data.path, 300);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const adminListReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any).from("reviews").select("*").order("created_at", { ascending: false }).limit(200);
    return data ?? [];
  });

export const adminSetReviewStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reviewId: string; status: "pending" | "approved" | "rejected" }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).rpc("set_review_status", { _admin_id: context.userId, _review_id: data.reviewId, _status: data.status });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string; value: unknown }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).rpc("admin_update_setting", {
      _admin_id: context.userId,
      _key: data.key,
      _value: data.value,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as any;
    const [{ data }, { data: profiles }, emails] = await Promise.all([
      sa.from("admin_actions").select("*").order("created_at", { ascending: false }).limit(200),
      sa.from("profiles").select("id, full_name"),
      emailMap(sa),
    ]);
    const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
    return (data ?? []).map((a: any) => ({
      ...a,
      admin_name: nameMap.get(a.admin_id) ?? null,
      admin_email: emails.get(a.admin_id) ?? null,
      target_name: a.target_user_id ? nameMap.get(a.target_user_id) ?? null : null,
      target_email: a.target_user_id ? emails.get(a.target_user_id) ?? null : null,
    }));
  });
