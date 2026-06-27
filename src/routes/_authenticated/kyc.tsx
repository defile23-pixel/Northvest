import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, FileText, ShieldCheck, UserCircle2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/kyc")({
  head: () => ({ meta: [{ title: "KYC verification — Northvest" }] }),
  component: KycPage,
});

const steps = ["Personal info", "Address", "Document", "Review"] as const;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function KycPage() {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ legal_name: "", date_of_birth: "", country: "", address: "", document_type: "passport" });
  const [documentPath, setDocumentPath] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const data = useQuery({
    queryKey: ["kyc"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: k } = await supabase.from("kyc_verifications").select("*").eq("user_id", user.id).maybeSingle();
      return { user, k };
    },
  });

  useEffect(() => {
    if (data.data?.k) {
      setForm({
        legal_name: data.data.k.legal_name ?? "",
        date_of_birth: data.data.k.date_of_birth ?? "",
        country: data.data.k.country ?? "",
        address: data.data.k.address ?? "",
        document_type: data.data.k.document_type ?? "passport",
      });
      setDocumentPath(data.data.k.document_path ?? null);
    }
  }, [data.data?.k]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !data.data?.user) return;
    if (file.size > MAX_FILE_BYTES) return toast.error("File is too large (max 10 MB)");
    setUploading(true);
    // Stored under a per-user folder; storage RLS only lets this user read/write
    // inside their own folder, and the admin can later read it via a signed URL
    // generated server-side with the service role.
    const path = `${data.data.user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: true });
    setUploading(false);
    if (error) return toast.error(error.message);
    setDocumentPath(path);
    setDocumentName(file.name);
    toast.success("Document uploaded");
  };

  const submit = async () => {
    if (!data.data?.user) return;
    if (!documentPath) return toast.error("Please upload your identity document first");
    const { error } = await supabase.from("kyc_verifications").update({
      ...form,
      document_submitted: true,
      document_path: documentPath,
      status: "in_review",
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("user_id", data.data.user.id);
    if (error) return toast.error(error.message);
    await supabase.from("security_events").insert({ user_id: data.data.user.id, event_type: "kyc_submitted", description: "KYC documents submitted for review" });
    toast.success("Submitted for review — usually completes within 1 business day.");
    qc.invalidateQueries({ queryKey: ["kyc"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const status = data.data?.k?.status ?? "not_started";
  const pct = ((step + 1) / steps.length) * 100;

  if (status === "approved" || status === "in_review") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="flex items-center gap-3"><BadgeCheck className="h-6 w-6 text-primary" /><h1 className="font-display text-3xl font-bold">Identity verification</h1></div>
        <div className="glass-card mt-8 rounded-3xl p-8 text-center">
          {status === "approved" ? (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <h2 className="mt-4 font-display text-2xl font-bold">You're verified</h2>
              <p className="mt-2 text-sm text-muted-foreground">Full access to deposits, investing, and withdrawals is unlocked.</p>
            </>
          ) : (
            <>
              <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
              <h2 className="mt-4 font-display text-2xl font-bold">Review in progress</h2>
              <p className="mt-2 text-sm text-muted-foreground">We're reviewing your documents. You'll get an email when it's done — usually within 1 business day.</p>
              <Badge variant="secondary" className="mt-3">Status: In review</Badge>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3"><BadgeCheck className="h-6 w-6 text-primary" /><h1 className="font-display text-3xl font-bold">Identity verification</h1></div>
      <p className="mt-1 text-sm text-muted-foreground">A regulatory requirement (KYC/AML). Your data is encrypted and never sold.</p>

      <div className="mt-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Step {step + 1} of {steps.length}</span><span>{steps[step]}</span></div>
        <Progress value={pct} className="mt-2" />
      </div>

      <div className="glass-card mt-6 rounded-3xl p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground"><UserCircle2 className="h-4 w-4" /> Personal information</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Legal full name</Label><Input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} placeholder="As shown on your ID" /></div>
              <div className="space-y-2"><Label>Date of birth</Label><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></div>
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium"><FileText className="h-4 w-4" /> Address</div>
            <div className="space-y-2"><Label>Country of residence</Label>
              <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {["United States","United Kingdom","Canada","Germany","France","Spain","Netherlands","Australia","Singapore","Other"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Residential address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, City, ZIP" /></div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4" /> Identity document</div>
            <div className="space-y-2"><Label>Document type</Label>
              <Select value={form.document_type} onValueChange={(v) => setForm({ ...form, document_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="drivers_license">Driver's license</SelectItem>
                  <SelectItem value="national_id">National ID card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">Upload a clear photo of your document</p>
              <p className="text-xs text-muted-foreground">PDF, PNG, or JPG · max 10 MB</p>
              <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleFileChange} />
              <Button variant="outline" size="sm" className="mt-3" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                {uploading ? "Uploading…" : documentPath ? "Replace file" : "Choose file"}
              </Button>
              {documentPath && (
                <p className="mt-2 flex items-center justify-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {documentName ?? "Document uploaded"}
                </p>
              )}
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3 text-sm">
            <p className="font-medium">Review your information</p>
            <dl className="grid gap-2 rounded-xl bg-muted/40 p-4">
              <div className="flex justify-between"><dt className="text-muted-foreground">Name</dt><dd>{form.legal_name || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Date of birth</dt><dd>{form.date_of_birth || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Country</dt><dd>{form.country || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Address</dt><dd className="max-w-[60%] truncate text-right">{form.address || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Document</dt><dd className="capitalize">{form.document_type.replace("_", " ")}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">File</dt><dd className="max-w-[60%] truncate text-right">{documentName ?? (documentPath ? "Uploaded" : "—")}</dd></div>
            </dl>
            <p className="text-xs text-muted-foreground">By submitting, you confirm the information is accurate and consent to identity verification checks.</p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
          {step < steps.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 2 && !documentPath}
              className="bg-[image:var(--gradient-primary)] text-primary-foreground"
            >
              Continue
            </Button>
          ) : (
            <Button onClick={submit} className="bg-[image:var(--gradient-primary)] text-primary-foreground">Submit for review</Button>
          )}
        </div>
      </div>
    </div>
  );
}