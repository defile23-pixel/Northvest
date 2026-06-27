import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal-layout";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Service — Northvest" }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="[insert date before publishing]">
      <p>
        These Terms of Service ("Terms") are a draft template, not a finished legal document. Replace every
        bracketed placeholder and have a qualified lawyer in your jurisdiction review this before it governs
        real accounts or real money.
      </p>

      <h2>1. Who we are</h2>
      <p>
        Northvest is operated by [insert legal entity name], a [insert entity type] registered in
        [insert jurisdiction] ("Northvest," "we," "us"). These Terms govern your access to and use of the
        Northvest website and account dashboard (the "Service").
      </p>

      <h2>2. Eligibility</h2>
      <ul>
        <li>You must be at least [insert minimum age, e.g. 18] years old.</li>
        <li>You must complete identity verification (KYC) before depositing or withdrawing funds.</li>
        <li>You must not be a resident of, or accessing the Service from, a jurisdiction where it's prohibited.</li>
      </ul>

      <h2>3. Your account</h2>
      <p>
        You're responsible for keeping your login credentials and any 2FA method secure, and for all activity
        that happens under your account. Tell us immediately at [insert support contact] if you suspect
        unauthorized access.
      </p>

      <h2>4. Deposits and withdrawals</h2>
      <p>
        Deposits are reviewed manually before being credited to your balance, and withdrawal requests are
        reviewed before funds are released. Processing times are not instant. Cryptocurrency transactions are
        irreversible once confirmed on-chain — sending the wrong asset, network, or amount may result in
        permanent loss of funds, and Northvest is not able to reverse or recover such transactions.
      </p>

      <h2>5. No investment advice, no guaranteed returns</h2>
      <p>
        Nothing on the Service constitutes financial, legal, or tax advice. Any portfolios, plans, or
        allocations shown are illustrative. Returns are not guaranteed, and you can lose some or all of the
        money you deposit. See our <a href="/risk-disclosure" className="text-primary underline-offset-4 hover:underline">Risk Disclosure</a> for more detail.
      </p>

      <h2>6. Prohibited use</h2>
      <ul>
        <li>Providing false information during registration or identity verification.</li>
        <li>Using the Service for money laundering, fraud, or any unlawful purpose.</li>
        <li>Attempting to interfere with, reverse-engineer, or gain unauthorized access to the Service.</li>
      </ul>

      <h2>7. Suspension and termination</h2>
      <p>
        We may suspend or close an account that violates these Terms, fails verification, or is required by
        applicable law or a competent authority. [Insert your actual policy for return of remaining balances
        on closure.]
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        [This section needs jurisdiction-specific legal drafting. A generic placeholder limitation of liability
        clause is not safe to publish as-is for a service handling real funds.]
      </p>

      <h2>9. Changes to these Terms</h2>
      <p>We may update these Terms from time to time. Material changes will be notified via [insert method, e.g. in-app notification or email] before they take effect.</p>

      <h2>10. Contact</h2>
      <p>Questions about these Terms: [insert support email or contact method].</p>
    </LegalLayout>
  );
}
