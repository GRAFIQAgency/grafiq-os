"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCIES } from "@/config/currencies";
import { useI18n } from "@/lib/i18n/client";

import { TALENT_ROLES } from "../../constants";

interface TalentFormFieldsProps {
  fieldErrors?: Record<string, string>;
  /** Shown on the internal add form only. */
  showSourceUrl?: boolean;
  /** Shown on the public application form only. */
  showConsent?: boolean;
}

/**
 * Uncontrolled fields shared by the internal "Add talent" panel and the public
 * application form. Submit the surrounding <form> as FormData.
 */
export function TalentFormFields({ fieldErrors = {}, showSourceUrl, showConsent }: TalentFormFieldsProps) {
  const { dict } = useI18n();
  const t = dict.sourcing.talentInput;
  const tt = dict.sourcing.talent;
  const err = (k: string) => (fieldErrors[k] ? <p className="mt-1 text-xs text-destructive">{fieldErrors[k]}</p> : null);
  const field = (name: string, label: string, input: React.ReactNode, hint?: string, span = false) => (
    <div className={span ? "sm:col-span-2" : undefined}>
      <Label htmlFor={name} className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {input}
      {hint && !fieldErrors[name] ? <p className="mt-1 text-xs text-muted-foreground/70">{hint}</p> : null}
      {err(name)}
    </div>
  );
  const select = (name: string, options: { value: string; label: string }[]) => (
    <select id={name} name={name} defaultValue="" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30">
      <option value="">{t.none}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {showSourceUrl ? field("sourceUrl", t.sourceUrl, <Input id="sourceUrl" name="sourceUrl" placeholder="https://…" aria-invalid={Boolean(fieldErrors.sourceUrl)} />, t.sourceUrlHint, true) : null}
      {field("fullName", t.fullName, <Input id="fullName" name="fullName" required aria-invalid={Boolean(fieldErrors.fullName)} />)}
      {field("email", t.email, <Input id="email" name="email" type="email" aria-invalid={Boolean(fieldErrors.email)} />)}
      {field("role", t.role, <><Input id="role" name="role" list="talent-roles" /><datalist id="talent-roles">{TALENT_ROLES.map((r) => <option key={r} value={r} />)}</datalist></>)}
      {field("headline", t.headline, <Input id="headline" name="headline" />)}
      {field("country", t.country, <Input id="country" name="country" />)}
      {field("city", t.city, <Input id="city" name="city" />)}
      {field("seniority", t.seniority, select("seniority", (["junior", "mid", "senior", "lead"] as const).map((v) => ({ value: v, label: tt.seniorities[v] }))))}
      {field("employmentType", t.employmentType, select("employmentType", (["freelancer", "contractor", "employee"] as const).map((v) => ({ value: v, label: tt.employments[v] }))))}
      {field("availability", t.availability, select("availability", (["available", "limited", "unavailable"] as const).map((v) => ({ value: v, label: tt.availabilities[v] }))))}
      {field("yearsExperience", t.yearsExperience, <Input id="yearsExperience" name="yearsExperience" type="number" min={0} step="any" aria-invalid={Boolean(fieldErrors.yearsExperience)} />)}
      <div className="grid grid-cols-3 gap-2 sm:col-span-2">
        {field("hourlyRateMin", `${t.rate} ${tt.rateMin}`, <Input id="hourlyRateMin" name="hourlyRateMin" type="number" min={0} step="any" aria-invalid={Boolean(fieldErrors.hourlyRateMin)} />)}
        {field("hourlyRateMax", `${t.rate} ${tt.rateMax}`, <Input id="hourlyRateMax" name="hourlyRateMax" type="number" min={0} step="any" aria-invalid={Boolean(fieldErrors.hourlyRateMax)} />)}
        {field("rateCurrency", t.currency, select("rateCurrency", CURRENCIES.map((c) => ({ value: c, label: c }))))}
      </div>
      {field("skills", t.skills, <Input id="skills" name="skills" placeholder="Webflow, GSAP, Figma" />, t.listHint)}
      {field("technologies", t.technologies, <Input id="technologies" name="technologies" placeholder="React, Next.js" />, t.listHint)}
      {field("languages", t.languages, <Input id="languages" name="languages" placeholder="Czech, English" />, t.listHint)}
      {field("profileUrl", t.profileUrl, <Input id="profileUrl" name="profileUrl" placeholder="https://…" aria-invalid={Boolean(fieldErrors.profileUrl)} />)}
      {field("portfolioUrl", t.portfolioUrl, <Input id="portfolioUrl" name="portfolioUrl" placeholder="https://…" aria-invalid={Boolean(fieldErrors.portfolioUrl)} />, undefined, true)}
      {field("summary", t.summary, <Textarea id="summary" name="summary" rows={3} aria-invalid={Boolean(fieldErrors.summary)} />, undefined, true)}
      <div className="flex flex-wrap gap-6 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm"><Checkbox name="remote" /> {t.remote}</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox name="agencyExperience" /> {t.agencyExperience}</label>
      </div>
      {showConsent ? (
        <div className="sm:col-span-2">
          <label className="flex items-start gap-2 text-sm">
            <Checkbox name="consent" className="mt-0.5" />
            <span>{dict.sourcing.apply.consent}</span>
          </label>
          {err("consent")}
        </div>
      ) : null}
    </div>
  );
}
