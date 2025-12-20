import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Skeleton for a form with profile picture and multiple input fields
 */
export const ProfileFormSkeleton = () => (
    <Card>
        <CardHeader>
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-56" />
                </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-6">
            {/* Profile picture */}
            <div className="flex justify-center">
                <Skeleton className="h-24 w-24 rounded-full" />
            </div>
            {/* Form fields grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ))}
            </div>
            {/* Textarea */}
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-24 w-full" />
            </div>
            {/* Submit button */}
            <div className="flex justify-end">
                <Skeleton className="h-10 w-24" />
            </div>
        </CardContent>
    </Card>
);

/**
 * Skeleton for a settings card with multiple sections
 */
export const SettingsCardSkeleton = () => (
    <Card>
        <CardHeader>
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ))}
        </CardContent>
    </Card>
);

/**
 * Skeleton for branding/admin pages with tabs
 */
export const BrandingPageSkeleton = () => (
    <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
        </div>
        {/* Tabs */}
        <Skeleton className="h-10 w-full max-w-lg" />
        {/* Logo card */}
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-center">
                    <Skeleton className="h-32 w-32 rounded-lg" />
                </div>
                <Skeleton className="h-10 w-32" />
            </CardContent>
        </Card>
        {/* Info card */}
        <Card>
            <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ))}
            </CardContent>
        </Card>
        {/* Action buttons */}
        <div className="flex justify-end gap-3">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-28" />
        </div>
    </div>
);

/**
 * Skeleton for list/table views
 */
export const ListSkeleton = ({ rows = 5 }: { rows?: number }) => (
    <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-20" />
            </div>
        ))}
    </div>
);

/**
 * Skeleton for dashboard with stats cards
 */
export const DashboardSkeleton = () => (
    <div className="space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-8 w-16" />
                            </div>
                            <Skeleton className="h-10 w-10 rounded-lg" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
        {/* Content area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                    <ListSkeleton rows={4} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-28" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-48 w-full" />
                </CardContent>
            </Card>
        </div>
    </div>
);

/**
 * Skeleton for messages/chat list
 */
export const MessageListSkeleton = () => (
    <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            </div>
        ))}
    </div>
);

/**
 * Skeleton for appointment calendar view
 */
export const CalendarSkeleton = () => (
    <div className="space-y-4">
        {/* Calendar header */}
        <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-40" />
            <div className="flex gap-2">
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-9" />
            </div>
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
            {/* Day headers */}
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={`header-${i}`} className="bg-background p-2">
                    <Skeleton className="h-4 w-8 mx-auto" />
                </div>
            ))}
            {/* Calendar cells */}
            {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="bg-background p-2 min-h-[80px]">
                    <Skeleton className="h-4 w-6 mb-2" />
                    {i % 3 === 0 && <Skeleton className="h-5 w-full rounded" />}
                </div>
            ))}
        </div>
    </div>
);

/**
 * Skeleton for security settings page
 */
export const SecuritySettingsSkeleton = () => (
    <div className="space-y-6">
        {[1, 2, 3].map((i) => (
            <Card key={i}>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-36" />
                            <Skeleton className="h-4 w-52" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                        </div>
                        <Skeleton className="h-6 w-11 rounded-full" />
                    </div>
                </CardContent>
            </Card>
        ))}
    </div>
);

/**
 * Generic page skeleton with header
 */
export const PageSkeleton = ({ children }: { children?: React.ReactNode }) => (
    <div className="space-y-6">
        <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
        </div>
        {children || <SettingsCardSkeleton />}
    </div>
);
