import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("auth.register.metaTitle") };
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/app");
  const { intent } = await searchParams;
  const callbackUrl = intent ? `/app?intent=${encodeURIComponent(intent)}` : "/app";
  const t = await getT();
  return (
    <AuthLayout title={t("auth.register.title")} description={t("auth.register.description")}>
      <AuthForm mode="register" callbackUrl={callbackUrl} />
    </AuthLayout>
  );
}
