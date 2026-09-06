import type { Metadata } from "next";

import { LoginForm } from "@/modules/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Internal access only. Use the account provided by your administrator.
        </p>
      </div>
      <LoginForm nextPath={next} />
    </div>
  );
}
