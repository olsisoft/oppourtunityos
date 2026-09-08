import type { Metadata } from "next";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LOCALE_LABELS } from "@/i18n/locales";
import { getLocale, getT } from "@/i18n/server";
import { getEnv } from "@/lib/env";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("settings.metaTitle") };
}

export default async function SettingsPage() {
  const user = await requireUser();
  const t = await getT();
  const locale = await getLocale();
  const env = getEnv();
  const providerConfigured =
    env.AI_PROVIDER === "mock" ||
    (env.AI_PROVIDER === "anthropic" && Boolean(env.ANTHROPIC_API_KEY)) ||
    (env.AI_PROVIDER === "openai" && Boolean(env.OPENAI_API_KEY));
  const model =
    env.AI_PROVIDER === "anthropic"
      ? env.ANTHROPIC_MODEL
      : env.AI_PROVIDER === "openai"
        ? env.OPENAI_MODEL
        : t("settings.provider.modelTemplates");

  return (
    <div className="mx-auto max-w-3xl space-y-6 overflow-y-auto p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("settings.description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.account.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <Row label={t("settings.account.name")} value={user.name ?? "—"} />
          <Row label={t("settings.account.email")} value={user.email ?? "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.language.title")}</CardTitle>
          <CardDescription>{t("settings.language.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <Row
            label={t("settings.language.current")}
            value={
              <span className="inline-flex items-center gap-3">
                <span>{LOCALE_LABELS[locale]}</span>
                <LanguageSwitcher />
              </span>
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.provider.title")}</CardTitle>
          <CardDescription>
            {t("settings.provider.descriptionBefore")}
            <code>AI_PROVIDER</code>, <code>ANTHROPIC_API_KEY</code>, <code>OPENAI_API_KEY</code>
            {t("settings.provider.descriptionAfter")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <Row label={t("settings.provider.provider")} value={env.AI_PROVIDER} />
          <Row label={t("settings.provider.model")} value={model} />
          <Row
            label={t("settings.provider.status")}
            value={
              env.AI_PROVIDER === "mock" ? (
                <Badge variant="warning">{t("settings.provider.mock")}</Badge>
              ) : providerConfigured ? (
                <Badge variant="positive">{t("settings.provider.configured")}</Badge>
              ) : (
                <Badge variant="negative">{t("settings.provider.keyMissing")}</Badge>
              )
            }
          />
          <Row
            label={t("settings.provider.rateLimit")}
            value={t("settings.provider.rateLimitValue", {
              max: env.AI_RATE_LIMIT_MAX,
              minutes: Math.round(env.AI_RATE_LIMIT_WINDOW_SECONDS / 60),
            })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.research.title")}</CardTitle>
          <CardDescription>{t("settings.research.description")}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <Row
            label={t("settings.research.activeProvider")}
            value={<Badge variant="muted">{t("settings.research.mockResearch")}</Badge>}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
