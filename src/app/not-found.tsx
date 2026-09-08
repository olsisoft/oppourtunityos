import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-muted-foreground text-xs tracking-wider uppercase">404</p>
      <h1 className="text-lg font-semibold">{t("layout.notFound.title")}</h1>
      <Button asChild size="sm" variant="outline">
        <Link href="/app">{t("layout.notFound.backToDashboard")}</Link>
      </Button>
    </div>
  );
}
