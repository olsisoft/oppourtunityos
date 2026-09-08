import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("auth.login.metaTitle") };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/app");
  const { callbackUrl } = await searchParams;
  const t = await getT();
  return (
    <AuthLayout title={t("auth.login.title")} description={t("auth.login.description")}>
      <AuthForm mode="login" callbackUrl={callbackUrl ?? "/app"} />
      <p className="text-muted-foreground mt-6 border-t pt-4 text-xs leading-relaxed">
        {t("auth.login.demoAccountBefore")} <code>npm run db:seed</code>
        {t("auth.login.demoAccountAfter")} <code>demo@opportunityos.dev</code> /{" "}
        <code>demo1234</code>
      </p>
    </AuthLayout>
  );
}
