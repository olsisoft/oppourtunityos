import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-full">
      <div className="flex-1 space-y-4 p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full max-w-3xl" />
        <Skeleton className="h-40 w-full max-w-3xl" />
      </div>
      <div className="hidden w-[26rem] space-y-3 border-l p-4 lg:block">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
