import type { Dictionary, Locale } from "@/lib/i18n/config";
import { INTL_LOCALES } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";

import { formatMoney } from "../format";
import { itemAmount, proposalTotals } from "../proposals/calculations";
import type { Proposal } from "../proposals/types";

/** The client-facing pricing plan (public page). Calm, print-friendly, no app chrome. */
export function ProposalDocument({ proposal, companyName, dict, locale }: { proposal: Proposal; companyName: string; dict: Dictionary; locale: Locale }) {
  const t = dict.pricing.proposal.public;
  const money = (v: number) => formatMoney(v, proposal.currency, locale);
  const totals = proposalTotals(proposal.items, proposal.vatRate);
  const date = (iso: string) => new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: "long" }).format(new Date(iso));

  return (
    <article className="space-y-8 py-6 print:py-0">
      <header className="space-y-3">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{interpolate(t.preparedBy, { company: companyName })}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{proposal.title}</h1>
        <p className="text-sm text-muted-foreground">
          {proposal.clientName ? `${interpolate(t.preparedFor, { client: proposal.clientName })} · ` : ""}{date(proposal.sharedAt ?? proposal.updatedAt)}
          {proposal.validUntil ? ` · ${interpolate(t.validUntil, { date: date(proposal.validUntil) })}` : ""}
        </p>
        {proposal.intro ? <p className="max-w-prose text-sm leading-relaxed">{proposal.intro}</p> : null}
      </header>

      <section className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium">
              <th>{t.item}</th><th className="text-right!">{t.scope}</th><th className="text-right!">{t.price}</th>
            </tr>
          </thead>
          <tbody>
            {proposal.items.map((it, i) => (
              <tr key={it.id} className="border-t align-top [&>td]:px-4 [&>td]:py-3">
                <td>
                  <p className="font-medium"><span className="mr-2 text-muted-foreground tabular-nums">{i + 1}.</span>{it.title}</p>
                  {it.description ? <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted-foreground">{it.description}</p> : null}
                </td>
                <td className="text-right text-xs whitespace-nowrap text-muted-foreground tabular-nums">{it.kind === "hourly" ? `${it.hours} h × ${money(it.rate)}` : it.kind === "unit" ? `${it.quantity} ${it.unitLabel ?? t.unit} × ${money(it.unitPrice)}` : t.fixed}</td>
                <td className="text-right font-medium whitespace-nowrap tabular-nums">{money(itemAmount(it))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-muted/20 text-sm">
            <tr className="[&>td]:px-4 [&>td]:py-2"><td colSpan={2} className="text-muted-foreground">{t.subtotal}</td><td className="text-right tabular-nums">{money(totals.subtotal)}</td></tr>
            {proposal.vatRate > 0 ? <tr className="[&>td]:px-4 [&>td]:py-2"><td colSpan={2} className="text-muted-foreground">{interpolate(t.vat, { rate: proposal.vatRate })}</td><td className="text-right tabular-nums">{money(totals.vat)}</td></tr> : null}
            <tr className="border-t font-semibold [&>td]:px-4 [&>td]:py-3"><td colSpan={2}>{proposal.vatRate > 0 ? t.totalIncludingVat : t.totalExcludingVat}</td><td className="text-right text-base tabular-nums">{money(totals.total)}</td></tr>
          </tfoot>
        </table>
      </section>

      {proposal.notes ? (
        <section className="space-y-1">
          <h2 className="text-sm font-medium">{t.notes}</h2>
          <p className="max-w-prose text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{proposal.notes}</p>
        </section>
      ) : null}

      <footer className="border-t pt-4 text-xs text-muted-foreground print:hidden">{t.footer}</footer>
    </article>
  );
}
