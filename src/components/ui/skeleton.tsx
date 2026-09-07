import React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("animate-pulse rounded-lg bg-muted", className)} {...props} />
  );
}

// Full-page loading placeholder replacing the bare spinning-circle divs used
// on nearly every page while the initial data fetch is in flight.
export function PageLoader({ rows = 3 }: { rows?: number }) {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-72" />
        </div>
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
