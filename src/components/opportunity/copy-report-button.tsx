"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export function CopyReportButton({ markdown }: { markdown: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(markdown);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // ignore
        }
      }}
    >
      {copied ? <Check /> : <Copy />}{" "}
      {copied ? t("opportunity.report.copied") : t("opportunity.report.copy")}
    </Button>
  );
}
