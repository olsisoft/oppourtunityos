import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/app");
  const { callbackUrl } = await searchParams;
  return (
    <AuthLayout title="Sign in" description="Continue your opportunity discovery.">
      <AuthForm mode="login" callbackUrl={callbackUrl ?? "/app"} />
      <p className="text-muted-foreground mt-6 border-t pt-4 text-xs leading-relaxed">
        Demo account (after <code>npm run db:seed</code>): <code>demo@opportunityos.dev</code> /{" "}
        <code>demo1234</code>
      </p>
    </AuthLayout>
  );
}
