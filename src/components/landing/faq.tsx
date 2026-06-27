import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { q: "How much risk is involved in investing?", a: "All investments carry risk, including loss of principal. Each plan discloses its risk profile so you can choose what aligns with your goals." },
  { q: "How do withdrawals work?", a: "You can request a withdrawal anytime from your wallet. Settlement typically takes 1–3 business days depending on your funding method." },
  { q: "How are my funds secured?", a: "Funds are held with qualified custodians, segregated from operating capital, and protected by encryption and multi-factor authentication." },
  { q: "What's required for identity verification?", a: "A government-issued ID and a quick liveness check. Most users complete KYC in under five minutes." },
  { q: "Which investment strategy should I choose?", a: "Choose based on your timeline and tolerance for volatility. Starter is lower risk, Growth is higher risk. None guarantee returns." },
];

export function FAQ() {
  return (
    <section id="faq" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">FAQ</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Common questions, clear answers.</h2>
        </div>
        <Accordion type="single" collapsible className="mt-10">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="glass-card mb-3 rounded-2xl border-0 px-5">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
