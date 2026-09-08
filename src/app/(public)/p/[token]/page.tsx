import type { Metadata } from "next";

import { getDictionary, getLocale } from "@/lib/i18n/server";
import { ProposalDocument } from "@/modules/pricing/components/proposal-document";
import { getSharedProposal } from "@/modules/pricing/proposals/queries";
import { getBusinessSettings } from "@/modules/settings/queries";

export async function generateMetadata({ params }: PageProps<"/p/[token]">): Promise<Metadata> {
  const { token } = await params;
  const [proposal, dict] = await Promise.all([getSharedProposal(token), getDictionary()]);
  return { title: proposal ? proposal.title : dict.pricing.proposal.title, robots: { index: false, follow: false } };
}

/** Public, read-only pricing plan. Reached only through the unguessable share link. */
export default async function SharedProposalPage({ params }: PageProps<"/p/[token]">) {
  const { token } = await params;
  const [proposal, dict, locale, settings] = await Promise.all([getSharedProposal(token), getDictionary(), getLocale(), getBusinessSettings()]);

  if (!proposal) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-semibold tracking-tight">{dict.pricing.proposal.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{dict.pricing.proposal.public.notFound}</p>
      </div>
    );
  }
  return <ProposalDocument proposal={proposal} companyName={settings.companyName} dict={dict} locale={locale} />;
}
