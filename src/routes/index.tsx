import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/landing/hero";
import { Trust } from "@/components/landing/trust";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Plans } from "@/components/landing/plans";
import { Performance } from "@/components/landing/performance";
import { LivePrices } from "@/components/landing/live-prices";
import { LiveWithdrawals } from "@/components/landing/live-withdrawals";
import { Reviews } from "@/components/landing/reviews";
import { Learn } from "@/components/landing/learn";
import { FAQ } from "@/components/landing/faq";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Northvest — Invest smarter for the future" },
      { name: "description", content: "Transparent, long-term investing with diversified portfolios, clear risk disclosure, and modern tools." },
      { property: "og:title", content: "Northvest — Invest smarter for the future" },
      { property: "og:description", content: "Transparent, long-term investing with diversified portfolios, clear risk disclosure, and modern tools." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <LivePrices />
      <main>
        <Hero />
        <Trust />
        <HowItWorks />
        <Plans />
        <Performance />
        <Reviews />
        <Learn />
        <FAQ />
      </main>
      <SiteFooter />
      <LiveWithdrawals />
    </div>
  );
}
