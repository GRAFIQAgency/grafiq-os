import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n/server";
import { ProposalEditor } from "@/modules/pricing/components/proposal-editor";
import { getProposal } from "@/modules/pricing/proposals/queries";

export async function generateMetadata({ params }: PageProps<"/pricing/proposals/[id]">) {
  const { id } = await params;
  const [proposal, dict] = await Promise.all([getProposal(id), getDictionary()]);
  return { title: proposal ? `${dict.pricing.proposal.title} · ${proposal.title}` : dict.pricing.proposal.title };
}

export default async function ProposalPage({ params }: PageProps<"/pricing/proposals/[id]">) {
  const { id } = await params;
  const proposal = await getProposal(id);
  if (!proposal) notFound();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const shareUrl = `${proto}://${host}/p/${proposal.shareToken}`;

  return <ProposalEditor proposal={proposal} shareUrl={shareUrl} shareAvailable={Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)} />;
}
