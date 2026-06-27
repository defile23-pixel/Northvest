import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal-layout";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About — Northvest" }] }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <LegalLayout title="About Northvest">
      <p>
        Northvest is built around one idea: investing tools should be clear about what they are, what they
        cost, and what they can't promise. [Replace this paragraph with your real founding story, mission,
        and team — this is placeholder copy.]
      </p>
      <h2>What we're building</h2>
      <p>
        A straightforward dashboard for tracking deposits, withdrawals, and a chosen investment plan, with
        plain-language risk disclosure instead of hype. See our <a href="/risk-disclosure" className="text-primary underline-offset-4 hover:underline">Risk Disclosure</a> for the details that matter most.
      </p>
      <h2>Get in touch</h2>
      <p>Questions, feedback, or partnership inquiries — reach us via the Contact link in the footer.</p>
    </LegalLayout>
  );
}
