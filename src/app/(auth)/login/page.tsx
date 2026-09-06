import type { Metadata } from "next";

import { getDictionary } from "@/lib/i18n/server";
import { LoginForm } from "@/modules/auth/components/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.auth.signIn };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [params, dict] = await Promise.all([searchParams, getDictionary()]);
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.auth.signIn}</h1>
        <p className="text-sm text-muted-foreground">{dict.auth.intro}</p>
      </div>
      <LoginForm nextPath={next} />
    </div>
  );
}
