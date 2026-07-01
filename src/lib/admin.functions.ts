import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PAGE_SIZE = 25;

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

async function emailMap(supabaseAdmin: any): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let page = 1;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    for (const u of data?.users ?? []) if (u.email) map.set(u.id, u.email);
    if (!data?.users || data.users.length < 200) break;
    page += 1;
    if (page > 25) break;
  }
  return map;
}

function range(page: number) {
  const p = Math.max(1, page || 1);
  return { from: (p - 1) * PAGE_SIZE, to: p * PAGE_SIZE - 1 };
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
    return { users: users.count ?? 0, newUsers7d: newUsers.count ?? 0, kycPending: kycPending.count ?? 0, txPending: txPending.count ?? 0, reviewsPending: revPending.count ?? 0, totalCash, totalInvested, depositVolume, withdrawalVolume };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { page?: number; search?: string }) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as any;
    const { from, to } = range(data.page ?? 1);
    let q = sa.from("profiles").select("id, full_name, selected_plan, risk_profile, created_at", { count: "exact" }).order("created_at", { ascending: false });
    if (data.search && data.search.trim()) q = q.ilike("full_name", `%${data.search.trim()}%`);
    const [{ data: profiles, count }, { data: wallets }, { data: roles }, { data: kyc }, emails] = await Promise.all([
      q.range(from, to),
      sa.from("wallets").select("user_id, cash_balance, invested_balance, currency"),
      sa.from("user_roles").select("user_id, role"),
      sa.from("kyc_verifications").select("user_id, status"),
      emailMap(sa),
    ]);
    const wMap = new Map((wallets ?? []).map((w: any) => [w.user_id, w]));
    const rMap = new Map<string, string[]>();
    for (const r of roles ?? []) { const arr = rMap.get(r.user_id) ?? []; arr.push(r.role); rMap.set(r.user_id, arr); }
    const kMap = new Map((kyc ?? []).map((k: any) => [k.user_id, k.status]));
    const rows = (profiles ?? []).map((p: any) => ({ ...p, email: emails.get(p.id) ?? null, wallet: wMap.get(p.id) ?? null, roles: rMap.get(p.id) ?? [], kyc_status: kMap.get(p.id) ?? "not_started" }));
    const filtered = data.search && data.search.trim()
      ? rows.filter((r: any) => (r.full_name ?? "").toLowerCase().includes(data.search!.toLowerCase()) || (r.email ?? "").toLowerCase().includes(data.search!.toLowerCase()))
      : rows;
    return { rows: filtered, total: count ?? 0, pageSize: PAGE_SIZE };
  });

export const adminGetUserDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as any;
    const [{ data: profile }, { data: wallet }, { data: kyc }, { data: roles }, { data: txns }, { data: events }, { data: notifs }, { data: notes }, emails, names] = await Promise.all([
      sa.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
      sa.from("wallets").select("*").eq("user_id", data.userId).maybeSingle(),
      sa.from("kyc_verifications").select("*").eq("user_id", data.userId).maybeSingle(),
      sa.from("user_roles").select("role").eq("user_id", data.userId),
      sa.from("transactions").select("*").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(50),
      sa.from("security_events").select("*").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(20),
      sa.from("notifications").select("*").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(20),
      sa.from("user_notes").select("*").eq("target_user_id", data.userId).order("created_at", { ascending: false }),
      emailMap(sa),
      sa.from("profiles").select("id, full_name"),
    ]);
    if (!profile) throw new Error("User not found");
    const nameMap = new Map((names ?? []).map((p: any) => [p.id, p.full_name]));
    return { profile, email: emails.get(data.userId) ?? null, wallet, kyc, roles: (roles ?? []).map((r: any) => r.role), txns: txns ?? [], events: events ?? [], notifications: notifs ?? [], notes: (notes ?? []).map((n: any) => ({ ...n, admin_name: nameMap.get(n.admin_id) ?? null, admin_email: emails.get(n.admin_id) ?? null })) };
  });

export const adminAddUserNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; note: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (!data.note || !data.note.trim()) throw new Error("Note can't be empty");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as any;
    const { error } = await sa.from("user_notes").insert({ admin_id: context.userId, target_user_id: data.userId, note: data.note.trim() });
    if (error) throw new Error(error.message);
    await sa.from("admin_actions").insert({ admin_id: context.userId, action: "note_added", target_user_id: data.userId, target_id: data.userId });
    return { ok: true };
  });

export const adminSendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; title: string; body: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (!data.title.trim() || !data.body.trim()) throw new Error("Title and message are required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as any;
    const { error } = await sa.from("notifications").insert({ user_id: data.userId, type: "message", title: data.title.trim(), body: data.body.trim() });
    if (error) throw new Error(error.message);
    await sa.from("admin_actions").insert({ admin_id: context.userId, action: "message_sent", target_user_id: data.userId, target_id: data.userId, after: { title: data.title.trim() } });
    return { ok: true };
  });

export const adminAdjustBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; cash?: number; invested?: number; reason: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (!data.reason || !data.reason.trim()) throw new Error("A reason is required for manual balance adjustments");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).rpc("admin_adjust_wallet", { _admin_id: context.userId, _user_id: data.userId, _cash: typeof data.cash === "number" ? data.cash : null, _invested: typeof data.invested === "number" ? data.invested : null, _reason: data.reason.trim() });
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
  .inputValidator((d: { page?: number } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as any;
    const { from, to } = range(data.page ?? 1);
    const [{ data: rows, count }, { data: profiles }, emails] = await Promise.all([
      sa.from("transactions").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to),
      sa.from("profiles").select("id, full_name"),
      emailMap(sa),
    ]);
    const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
    return { rows: (rows ?? []).map((t: any) => ({ ...t, user_name: nameMap.get(t.user_id) ?? null, user_email: emails.get(t.user_id) ?? null })), total: count ?? 0, pageSize: PAGE_SIZE };
  });

export const adminExportTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as any;
    const [{ data: rows }, { data: profiles }, emails] = await Promise.all([
      sa.from("transactions").select("*").order("created_at", { ascending: false }).limit(5000),
      sa.from("profiles").select("id, full_name"),
      emailMap(sa),
    ]);
    const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
    return (rows ?? []).map((t: any) => ({ ...t, user_name: nameMap.get(t.user_id) ?? null, user_email: emails.get(t.user_id) ?? null }));
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
  .inputValidator((d: { page?: number; search?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as any;
    const { from, to } = range(data.page ?? 1);
    const [{ data: rows, count }, { data: profiles }, emails] = await Promise.all([
      sa.from("kyc_verifications").select("*", { count: "exact" }).order("updated_at", { ascending: false }).range(from, to),
      sa.from("profiles").select("id, full_name"),
      emailMap(sa),
    ]);
    const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
    let mapped = (rows ?? []).map((k: any) => ({ ...k, user_name: nameMap.get(k.user_id) ?? null, user_email: emails.get(k.user_id) ?? null }));
    if (data.search && data.search.trim()) {
      const s = data.search.trim().toLowerCase();
      mapped = mapped.filter((k: any) => (k.user_name ?? "").toLowerCase().includes(s) || (k.user_email ?? "").toLowerCase().includes(s) || (k.legal_name ?? "").toLowerCase().includes(s));
    }
    return { rows: mapped, total: count ?? 0, pageSize: PAGE_SIZE };
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
  .inputValidator((d: { page?: number; search?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as any;
    const { from, to } = range(data.page ?? 1);
    const { data: rows, count } = await sa.from("reviews").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
    let mapped = rows ?? [];
    if (data.search && data.search.trim()) {
      const s = data.search.trim().toLowerCase();
      mapped = mapped.filter((r: any) => (r.title ?? "").toLowerCase().includes(s) || (r.body ?? "").toLowerCase().includes(s) || (r.author_name ?? "").toLowerCase().includes(s));
    }
    return { rows: mapped, total: count ?? 0, pageSize: PAGE_SIZE };
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
    const { error } = await (supabaseAdmin as any).rpc("admin_update_setting", { _admin_id: context.userId, _key: data.key, _value: data.value });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { page?: number } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as any;
    const { from, to } = range(data.page ?? 1);
    const [{ data: rows, count }, { data: profiles }, emails] = await Promise.all([
      sa.from("admin_actions").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to),
      sa.from("profiles").select("id, full_name"),
      emailMap(sa),
    ]);
    const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
    return { rows: (rows ?? []).map((a: any) => ({ ...a, admin_name: nameMap.get(a.admin_id) ?? null, admin_email: emails.get(a.admin_id) ?? null, target_name: a.target_user_id ? nameMap.get(a.target_user_id) ?? null : null, target_email: a.target_user_id ? emails.get(a.target_user_id) ?? null : null })), total: count ?? 0, pageSize: PAGE_SIZE };
  });
