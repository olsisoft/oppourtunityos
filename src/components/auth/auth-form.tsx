"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { loginAction, registerAction } from "@/actions/auth";
import type { ActionResult } from "@/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n/client";

export function AuthForm({
  mode,
  callbackUrl,
}: {
  mode: "login" | "register";
  callbackUrl: string;
}) {
  const t = useT();
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {mode === "register" && (
        <div className="space-y-1.5">
          <Label htmlFor="name">{t("auth.form.name")}</Label>
          <Input id="name" name="name" autoComplete="name" required maxLength={80} />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("auth.form.email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">{t("auth.form.password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={mode === "register" ? 8 : 1}
        />
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {t(state.error)}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {mode === "login" ? t("auth.form.signIn") : t("auth.form.createAccount")}
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        {mode === "login" ? (
          <>
            {t("auth.form.noAccount")}{" "}
            <Link href="/register" className="text-foreground underline underline-offset-4">
              {t("auth.form.createOne")}
            </Link>
          </>
        ) : (
          <>
            {t("auth.form.alreadyRegistered")}{" "}
            <Link href="/login" className="text-foreground underline underline-offset-4">
              {t("auth.form.signIn")}
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
