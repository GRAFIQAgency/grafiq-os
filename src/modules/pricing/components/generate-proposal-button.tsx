"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Sparkles } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { getModule } from "@/config/modules";
import { useI18n } from "@/lib/i18n/client";

import { createProposalFromEstimate } from "../proposals/actions";

/**
 * "Generate pricing plan" for a saved estimate. Drafts a client-facing plan
 * (AI or template) and opens it in the editor. When a plan already exists the
 * button opens it instead of creating a second one.
 */
export function GenerateProposalButton({ estimateId, proposalId, size = "sm", variant = "outline" }: { estimateId: string | null; proposalId?: string | null; size?: "xs" | "sm"; variant?: "outline" | "default" | "ghost" }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.pricing.proposal;
  const [pending, start] = useTransition();
  const base = getModule("pricing").href;

  if (proposalId) {
    return (
      <Link href={`${base}/proposals/${proposalId}`} className={buttonVariants({ size, variant })} data-guide="pricing-proposal">
        <FileText data-icon="inline-start" />
        {t.open}
      </Link>
    );
  }
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={pending || !estimateId}
      title={!estimateId ? t.saveFirst : undefined}
      data-guide="pricing-proposal"
      onClick={() => {
        if (!estimateId) return;
        start(async () => {
          const r = await createProposalFromEstimate(estimateId);
          if (r.id) router.push(`${base}/proposals/${r.id}`);
          else if (r.error) window.alert(r.error);
        });
      }}
    >
      {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Sparkles data-icon="inline-start" />}
      {pending ? t.generating : t.generate}
    </Button>
  );
}
