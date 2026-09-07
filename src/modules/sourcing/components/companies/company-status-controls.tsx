"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Handshake, Loader2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { getModule } from "@/config/modules";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";

import { saveCompaniesToCrm, updateCompanyStatus } from "../../actions/companies";
import { COMPANY_STATUSES } from "../../constants";
import type { CompanyLead, CompanyStatus } from "../../types";

export function CompanyStatusControls({ lead }: { lead: CompanyLead }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.sourcing.companies;
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={lead.status} onValueChange={(v) => start(async () => { await updateCompanyStatus([lead.id], v as CompanyStatus); router.refresh(); })}>
        <SelectTrigger className="w-44" aria-label={dict.sourcing.common.status}><SelectValue /></SelectTrigger>
        <SelectContent>{COMPANY_STATUSES.map((s) => <SelectItem key={s} value={s}>{t.statuses[s]}</SelectItem>)}</SelectContent>
      </Select>
      {lead.crmStatus ? (
        <Link href={`${getModule("sales").href}/${lead.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
          <Handshake data-icon="inline-start" />
          {dict.sourcing.review.openCrm} · {t.crmStatuses[lead.crmStatus]}
        </Link>
      ) : (
        <Button size="sm" disabled={pending} onClick={() => start(async () => { await saveCompaniesToCrm([lead.id]); router.refresh(); })}>
          {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Building2 data-icon="inline-start" />}
          {dict.sourcing.review.saveToCrm}
        </Button>
      )}
    </div>
  );
}
