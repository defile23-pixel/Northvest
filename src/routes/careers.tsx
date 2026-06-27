import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal-layout";

export const Route = createFileRoute("/careers")({
  head: () => ({ meta: [{ title: "Careers — Northvest" }] }),
  component: CareersPage,
});

function CareersPage() {
  return (
    <LegalLayout title="Careers">
      <p>We're not actively hiring right now.</p>
      <p>
        If that changes, open roles will be listed here. In the meantime, feel free to reach out via the
        Contact link in the footer if you'd like to introduce yourself.
      </p>
    </LegalLayout>
  );
}
