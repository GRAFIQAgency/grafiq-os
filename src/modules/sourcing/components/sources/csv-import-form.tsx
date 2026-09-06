"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";

import { importCsv } from "../../actions/sources";
import { COMPANY_CSV_COLUMNS, TALENT_CSV_COLUMNS } from "../../services/csv";
import type { EntityType } from "../../types";

export function CsvImportForm() {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.sourcing.sources;
  const [entityType, setEntityType] = useState<EntityType>("talent");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, start] = useTransition();

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    data.set("entityType", entityType);
    start(async () => {
      const result = await importCsv(data);
      if (result.error) setMessage({ text: result.error, error: true });
      else {
        setMessage({ text: interpolate(t.csvResult, { new: result.created ?? 0, dup: result.merged ?? 0, skipped: result.skipped ?? 0 }), error: false });
        form.reset();
        router.refresh();
      }
    });
  }

  const columns = entityType === "talent" ? TALENT_CSV_COLUMNS : COMPANY_CSV_COLUMNS;

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{t.csvTitle}</CardTitle>
        <CardDescription>{t.csvDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit(e.currentTarget);
          }}
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t.csvEntity}</Label>
              <Select value={entityType} onValueChange={(v) => setEntityType(v as EntityType)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="talent">{dict.sourcing.tabs.talent}</SelectItem>
                  <SelectItem value="company">{dict.sourcing.tabs.companies}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="csv-file" className="text-xs text-muted-foreground">{t.csvFile}</Label>
              <Input id="csv-file" name="file" type="file" accept=".csv,text/csv" required className="w-72" />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Upload data-icon="inline-start" />}
              {pending ? t.csvImporting : t.csvImport}
            </Button>
          </div>
          {message ? <p className={message.error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message.text}</p> : null}
          <div className="text-xs text-muted-foreground">
            <p className="mb-1 font-medium">{t.csvColumns}</p>
            <code className="block rounded bg-muted px-2 py-1 font-mono text-[11px] break-all">{columns.join(", ")}</code>
            <p className="mt-1">{t.csvSemicolon}</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
