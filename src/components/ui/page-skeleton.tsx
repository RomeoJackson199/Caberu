/**
 * Standardized Page Skeleton Components
 * Use these for consistent loading states across the application
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type SkeletonVariant = 'dashboard' | 'list' | 'form' | 'cards' | 'table';

interface PageSkeletonProps {
  variant?: SkeletonVariant;
  rows?: number;
  columns?: number;
}

/**
 * Dashboard skeleton with stats and cards
 */
const DashboardSkeleton = () => (
  <div className="space-y-6 p-6">
    {/* Stats row */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
    
    {/* Content area */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  </div>
);

/**
 * List skeleton for item lists
 */
const ListSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-4">
    {/* Search bar */}
    <div className="flex items-center gap-4">
      <Skeleton className="h-10 flex-1" />
      <Skeleton className="h-10 w-24" />
    </div>
    
    {/* List items */}
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/**
 * Form skeleton for form layouts
 */
const FormSkeleton = () => (
  <div className="space-y-6 max-w-2xl">
    <div className="space-y-2">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-64" />
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
    
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-24 w-full" />
    </div>
    
    <div className="flex justify-end gap-3">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);

/**
 * Card grid skeleton
 */
const CardGridSkeleton = ({ columns = 3, rows = 2 }: { columns?: number; rows?: number }) => (
  <div 
    className="grid gap-4" 
    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
  >
    {Array.from({ length: columns * rows }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-6">
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </CardContent>
      </Card>
    ))}
  </div>
);

/**
 * Table skeleton
 */
const TableSkeleton = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => (
  <div className="border rounded-lg overflow-hidden">
    {/* Header */}
    <div className="bg-muted/50 p-4 flex gap-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="p-4 flex gap-4 border-t">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

/**
 * Page Skeleton Component
 */
export function PageSkeleton({ variant = 'dashboard', rows, columns }: PageSkeletonProps) {
  switch (variant) {
    case 'list':
      return <ListSkeleton rows={rows} />;
    case 'form':
      return <FormSkeleton />;
    case 'cards':
      return <CardGridSkeleton columns={columns} rows={rows} />;
    case 'table':
      return <TableSkeleton rows={rows} columns={columns} />;
    case 'dashboard':
    default:
      return <DashboardSkeleton />;
  }
}

// Export individual components for direct use
export { DashboardSkeleton, ListSkeleton, FormSkeleton, CardGridSkeleton, TableSkeleton };
