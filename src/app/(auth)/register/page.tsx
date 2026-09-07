import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";

export const metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/app");
  const { intent } = await searchParams;
  const callbackUrl = intent ? `/app?intent=${encodeURIComponent(intent)}` : "/app";
  return (
    <AuthLayout
      title="Create your account"
      description="Discover problems worth solving. Hypotheses stay separate from evidence."
    >
      <AuthForm mode="register" callbackUrl={callbackUrl} />
    </AuthLayout>
  );
}
