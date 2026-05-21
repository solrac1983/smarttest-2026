import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="grid grid-cols-1 2xl:grid-cols-12 gap-6">
        <div className="2xl:col-span-8 space-y-4">
          <Skeleton className="h-[320px] rounded-[2rem]" />
        </div>
        <div className="2xl:col-span-4 space-y-4">
          <Skeleton className="h-[260px] rounded-[2rem]" />
          <Skeleton className="h-[220px] rounded-[2rem]" />
        </div>
      </div>

      <div className="space-y-4">
        <Skeleton className="h-16 w-80 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Skeleton className="md:col-span-2 xl:col-span-2 h-[240px] rounded-[1.75rem]" />
          <Skeleton className="h-[180px] rounded-[1.75rem]" />
          <Skeleton className="h-[180px] rounded-[1.75rem]" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          <Skeleton className="h-[440px] rounded-[2rem]" />
          <div className="space-y-3">
            <Skeleton className="h-16 w-96 rounded-2xl" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[96px] rounded-[1.5rem]" />
            ))}
          </div>
        </div>
        <div className="xl:col-span-4 space-y-6">
          <Skeleton className="h-[360px] rounded-[2rem]" />
          <Skeleton className="h-[340px] rounded-[2rem]" />
        </div>
      </div>
    </div>
  );
}
