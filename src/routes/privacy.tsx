import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal-layout";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — Northvest" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="[insert date before publishing]">
      <p>
        This is a draft template describing what Northvest actually collects today. Replace the bracketed
        placeholders with your real entity/contact details and have it reviewed against the privacy laws that
        apply to your users (for example GDPR if you have EU users, or CCPA for California residents) before
        publishing.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li><strong>Account information:</strong> name, email, and authentication data when you register.</li>
        <li><strong>Identity verification (KYC):</strong> legal name, date of birth, country, address, and the identity document you upload.</li>
        <li><strong>Financial activity:</strong> deposit and withdrawal requests, amounts, status, and the destination/source crypto address or bank details you provide.</li>
        <li><strong>Security data:</strong> sign-in and security events, used to protect your account.</li>
        <li><strong>Support communications:</strong> anything you send us via [insert your actual support channel(s)].</li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To operate your account, including crediting deposits and processing withdrawal requests.</li>
        <li>To verify your identity and meet [insert applicable] regulatory obligations.</li>
        <li>To detect and prevent fraud or unauthorized account access.</li>
        <li>To send you account and security notifications.</li>
      </ul>

      <h2>3. Identity documents</h2>
      <p>
        Identity documents you upload are stored in a private file store that only you and authorized
        administrators can access; administrators access them only to review your verification request.
      </p>

      <h2>4. Who we share it with</h2>
      <p>
        [Insert any actual third parties here — e.g. a KYC verification provider, hosting/infrastructure
        provider, email provider. Do not leave this section implying no sharing occurs if any does.] We do
        not sell your personal information.
      </p>

      <h2>5. Data retention</h2>
      <p>
        [Insert your actual retention periods — for example, how long KYC documents and transaction records
        are kept, and whether that's driven by a specific regulatory requirement.]
      </p>

      <h2>6. Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, export, or request deletion of
        your personal data. Contact [insert privacy contact email] to exercise these rights.
      </p>

      <h2>7. Security</h2>
      <p>
        We use industry-standard safeguards, including encryption in transit and role-based access controls
        for administrative actions, which are themselves logged. No system is perfectly secure, and we can't
        guarantee absolute security.
      </p>

      <h2>8. Contact</h2>
      <p>Questions about this policy: [insert privacy contact email].</p>
    </LegalLayout>
  );
}
