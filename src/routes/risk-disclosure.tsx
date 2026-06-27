import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal-layout";

export const Route = createFileRoute("/risk-disclosure")({
  head: () => ({ meta: [{ title: "Risk Disclosure — Northvest" }] }),
  component: RiskDisclosurePage,
});

function RiskDisclosurePage() {
  return (
    <LegalLayout title="Risk Disclosure" updated="[insert date before publishing]">
      <p>
        Investing involves risk, including the possible loss of some or all of the money you deposit. Read
        this page before depositing funds.
      </p>

      <h2>No guaranteed returns</h2>
      <p>
        Any plans, portfolios, or performance figures shown on Northvest are illustrative, not a promise or
        projection of future results. Past performance — yours or anyone else's — does not predict future
        performance. Markets move in both directions.
      </p>

      <h2>Cryptocurrency-specific risks</h2>
      <ul>
        <li>Crypto asset prices are volatile and can change significantly in short periods.</li>
        <li>Blockchain transactions are irreversible once confirmed — sending to the wrong address, asset, or network can result in permanent, unrecoverable loss.</li>
        <li>Deposits are reviewed manually before being credited, which can take longer than an instant on-chain confirmation.</li>
      </ul>

      <h2>Liquidity and withdrawal timing</h2>
      <p>
        Withdrawal requests are reviewed before funds are released and are not instant. Don't deposit money
        you may need on short notice.
      </p>

      <h2 id="regulatory-status">Regulatory status</h2>
      <p>
        [This section must accurately state your actual regulatory status and must not be left as marketing
        copy. If Northvest is not currently registered or licensed as an investment adviser, broker-dealer,
        or money services business in any jurisdiction, that should be stated plainly here — not implied
        otherwise anywhere on the site. If you do hold a specific license or registration, name the regulator
        and registration/license number here.]
      </p>

      <h2>Not financial advice</h2>
      <p>
        Nothing on this site is personalized financial, legal, or tax advice. Consider speaking with a
        licensed, independent financial advisor before making investment decisions.
      </p>
    </LegalLayout>
  );
}
