"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/i18n/locales";
import type { ActionResult } from "./shared";

/**
 * Record the language choice: in the cookie (every visitor) and on the
 * account (signed-in users), so it follows them to the next browser.
 */
export async function setLocaleAction(locale: string): Promise<ActionResult> {
  if (!isLocale(locale)) return { ok: false, error: "Unsupported locale" };
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: false,
  });
  const session = await auth();
  if (session?.user?.id) {
    await prisma.user.update({ where: { id: session.user.id }, data: { locale } });
  }
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
