import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "OpportunityOS", template: "%s · OpportunityOS" },
  description:
    "Stop asking AI for startup ideas. Discover problems worth solving: markets, valuable variables, pain, evidence and a deterministic verdict.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
