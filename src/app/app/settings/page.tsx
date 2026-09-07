import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getEnv } from "@/lib/env";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
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
        : "templates";

  return (
    <div className="mx-auto max-w-3xl space-y-6 overflow-y-auto p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Account and runtime configuration. Secrets are never displayed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <Row label="Name" value={user.name ?? "—"} />
          <Row label="Email" value={user.email ?? "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI provider</CardTitle>
          <CardDescription>
            Configured through environment variables (<code>AI_PROVIDER</code>,{" "}
            <code>ANTHROPIC_API_KEY</code>, <code>OPENAI_API_KEY</code>). Scores and verdicts never
            depend on the provider.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <Row label="Provider" value={env.AI_PROVIDER} />
          <Row label="Model" value={model} />
          <Row
            label="Status"
            value={
              env.AI_PROVIDER === "mock" ? (
                <Badge variant="warning">Mock provider — templated responses, not analysis</Badge>
              ) : providerConfigured ? (
                <Badge variant="positive">Configured</Badge>
              ) : (
                <Badge variant="negative">API key missing</Badge>
              )
            }
          />
          <Row
            label="Rate limit"
            value={`${env.AI_RATE_LIMIT_MAX} chat turns per ${Math.round(env.AI_RATE_LIMIT_WINDOW_SECONDS / 60)} minutes per user`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Research providers</CardTitle>
          <CardDescription>
            V1 supports manual evidence capture, pasted URLs, quotes and notes, plus a clearly
            labelled mock research provider. Web, Reddit, review sites and job boards plug into the
            same interface later.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <Row
            label="Active provider"
            value={<Badge variant="muted">mock-research (labelled MOCK)</Badge>}
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
