"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import { prisma } from "@/db/prisma";
import { loginSchema, registerSchema } from "@/domain/schemas";
import { isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/i18n/locales";
import { getLocale, getT } from "@/i18n/server";
import { logger } from "@/lib/logger";
import type { ActionResult } from "./shared";

function safeCallback(url: unknown): string {
  if (typeof url !== "string") return "/app";
  return url.startsWith("/app") ? url : "/app";
}

export async function registerAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const t = await getT();
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: t(parsed.error.issues[0]?.message ?? "common.invalidInput") };
  }
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { ok: false, error: t("auth.errors.emailTaken") };
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      locale: await getLocale(),
    },
  });
  logger.info("auth.registered", { userId: user.id });

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: safeCallback(formData.get("callbackUrl")),
  });
  return { ok: true, data: undefined };
}

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const t = await getT();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: t("auth.errors.missingCredentials") };
  }
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: t("auth.errors.invalidCredentials") };
    }
    throw error;
  }
  // The account's language follows the user to this browser.
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { locale: true },
  });
  if (isLocale(user?.locale)) {
    const store = await cookies();
    store.set(LOCALE_COOKIE, user.locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
      httpOnly: false,
    });
  }
  redirect(safeCallback(formData.get("callbackUrl")));
}

export async function logoutAction() {
  await signOut({ redirect: false });
  redirect("/login");
}
