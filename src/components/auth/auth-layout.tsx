import { Brand } from "@/components/layout/brand";

export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/40 flex min-h-screen flex-col">
      <header className="flex h-14 items-center px-6">
        <Brand />
      </header>
      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="bg-background w-full max-w-sm rounded-lg border p-6 shadow-xs">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1 mb-6 text-sm">{description}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
