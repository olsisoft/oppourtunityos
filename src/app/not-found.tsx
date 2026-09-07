import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-muted-foreground text-xs tracking-wider uppercase">404</p>
      <h1 className="text-lg font-semibold">This page does not exist or you do not have access.</h1>
      <Button asChild size="sm" variant="outline">
        <Link href="/app">Back to dashboard</Link>
      </Button>
    </div>
  );
}
