/**
 * Loading Skeleton Components
 * Provides consistent loading states across the application
 */

import { cn } from '@/lib/utils';

/**
 * Base skeleton shimmer animation
 */
export const Skeleton = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            'animate-pulse rounded-md bg-muted',
            className
        )}
        {...props}
    />
);

/**
 * Card skeleton - for loading cards/tiles
 */
export const CardSkeleton = ({ className }: { className?: string }) => (
    <div className={cn('rounded-lg border bg-card p-6 space-y-4', className)}>
        <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-[60%]" />
                <Skeleton className="h-3 w-[40%]" />
            </div>
        </div>
        <Skeleton className="h-20 w-full" />
        <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
        </div>
    </div>
);

/**
 * Table row skeleton
 */
export const TableRowSkeleton = ({ columns = 5 }: { columns?: number }) => (
    <div className="flex items-center space-x-4 p-4 border-b">
        {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
                key={i}
                className={cn(
                    'h-4',
                    i === 0 ? 'w-[30%]' : 'w-[15%]'
                )}
            />
        ))}
    </div>
);

/**
 * Table skeleton with header and rows
 */
export const TableSkeleton = ({
    rows = 5,
    columns = 5
}: {
    rows?: number;
    columns?: number;
}) => (
    <div className="rounded-lg border">
        {/* Header */}
        <div className="flex items-center space-x-4 p-4 bg-muted/50 border-b">
            {Array.from({ length: columns }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-[100px]" />
            ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
        ))}
    </div>
);

/**
 * List item skeleton
 */
export const ListItemSkeleton = () => (
    <div className="flex items-center space-x-4 p-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-[50%]" />
            <Skeleton className="h-3 w-[30%]" />
        </div>
    </div>
);

/**
 * Form skeleton
 */
export const FormSkeleton = ({ fields = 4 }: { fields?: number }) => (
    <div className="space-y-6">
        {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-10 w-full" />
            </div>
        ))}
        <div className="flex gap-3 pt-4">
            <Skeleton className="h-10 w-[100px]" />
            <Skeleton className="h-10 w-[80px]" />
        </div>
    </div>
);

/**
 * Dashboard stats skeleton
 */
export const StatsSkeleton = ({ count = 4 }: { count?: number }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-[80px]" />
                        <Skeleton className="h-8 w-[100px]" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>
                <Skeleton className="h-3 w-[60%] mt-4" />
            </div>
        ))}
    </div>
);

/**
 * Calendar skeleton
 */
export const CalendarSkeleton = () => (
    <div className="rounded-lg border p-4 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-[120px]" />
            <div className="flex gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
            </div>
        </div>
        {/* Week days */}
        <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
            ))}
        </div>
        {/* Days */}
        <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
            ))}
        </div>
    </div>
);

/**
 * Appointment list skeleton
 */
export const AppointmentListSkeleton = ({ count = 3 }: { count?: number }) => (
    <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                <div className="text-center">
                    <Skeleton className="h-4 w-10 mb-1" />
                    <Skeleton className="h-6 w-8 mx-auto" />
                </div>
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[40%]" />
                    <Skeleton className="h-3 w-[60%]" />
                </div>
                <Skeleton className="h-6 w-[80px] rounded-full" />
            </div>
        ))}
    </div>
);

/**
 * Page loading skeleton (full page)
 */
export const PageLoadingSkeleton = () => (
    <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
            <div className="space-y-2">
                <Skeleton className="h-8 w-[200px]" />
                <Skeleton className="h-4 w-[300px]" />
            </div>
            <Skeleton className="h-10 w-[120px]" />
        </div>

        {/* Stats */}
        <StatsSkeleton />

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <TableSkeleton rows={5} columns={4} />
            </div>
            <div>
                <CardSkeleton />
            </div>
        </div>
    </div>
);

export default {
    Skeleton,
    CardSkeleton,
    TableSkeleton,
    TableRowSkeleton,
    ListItemSkeleton,
    FormSkeleton,
    StatsSkeleton,
    CalendarSkeleton,
    AppointmentListSkeleton,
    PageLoadingSkeleton,
};
