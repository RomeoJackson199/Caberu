import { Skeleton, SkeletonAvatar, SkeletonText, SkeletonList, SkeletonStats } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Enhanced Page Skeletons with Shimmer Effects
 * 
 * All skeletons use the new shimmer animation for a premium loading experience.
 * Staggered delays create a cascading reveal effect.
 */

/**
 * Skeleton for a form with profile picture and multiple input fields
 */
export const ProfileFormSkeleton = () => (
    <Card>
        <CardHeader>
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                    <Skeleton className="h-5 w-40" delay={50} />
                    <Skeleton className="h-4 w-56" delay={100} />
                </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-6">
            {/* Profile picture */}
            <div className="flex justify-center">
                <Skeleton variant="avatar" size="xl" className="h-24 w-24" delay={150} />
            </div>
            {/* Form fields grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-20" delay={i * 50 + 200} />
                        <Skeleton className="h-10 w-full" delay={i * 50 + 225} />
                    </div>
                ))}
            </div>
            {/* Textarea */}
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" delay={500} />
                <Skeleton className="h-24 w-full" delay={525} />
            </div>
            {/* Submit button */}
            <div className="flex justify-end">
                <Skeleton variant="button" size="md" delay={575} />
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
                    <Skeleton className="h-5 w-32" delay={50} />
                    <Skeleton className="h-4 w-48" delay={100} />
                </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" delay={i * 75 + 150} />
                    <Skeleton className="h-10 w-full" delay={i * 75 + 175} />
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
            <Skeleton className="h-4 w-64" delay={50} />
        </div>
        {/* Tabs */}
        <Skeleton className="h-10 w-full max-w-lg" delay={100} />
        {/* Logo card */}
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5" delay={150} />
                    <Skeleton className="h-5 w-32" delay={175} />
                </div>
                <Skeleton className="h-4 w-48" delay={200} />
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-center">
                    <Skeleton className="h-32 w-32 rounded-lg" delay={250} />
                </div>
                <Skeleton variant="button" size="md" delay={300} />
            </CardContent>
        </Card>
        {/* Info card */}
        <Card>
            <CardHeader>
                <Skeleton className="h-5 w-40" delay={350} />
                <Skeleton className="h-4 w-56" delay={375} />
            </CardHeader>
            <CardContent className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-24" delay={i * 50 + 400} />
                        <Skeleton className="h-10 w-full" delay={i * 50 + 425} />
                    </div>
                ))}
            </CardContent>
        </Card>
        {/* Action buttons */}
        <div className="flex justify-end gap-3">
            <Skeleton variant="button" size="sm" delay={650} />
            <Skeleton variant="button" size="md" delay={700} />
        </div>
    </div>
);

/**
 * Skeleton for list/table views (re-exports enhanced version)
 */
export const ListSkeleton = ({ rows = 5 }: { rows?: number }) => (
    <SkeletonList count={rows} />
);

/**
 * Skeleton for dashboard with stats cards
 */
export const DashboardSkeleton = () => (
    <div className="space-y-6">
        {/* Stats grid */}
        <SkeletonStats count={4} />
        {/* Content area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-32" delay={400} />
                </CardHeader>
                <CardContent>
                    <SkeletonList count={4} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-28" delay={450} />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-48 w-full" delay={500} />
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
                <Skeleton variant="avatar" size="md" delay={i * 50} />
                <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-28" delay={i * 50 + 25} />
                        <Skeleton className="h-3 w-16" delay={i * 50 + 50} />
                    </div>
                    <SkeletonText lines={2} delay={i * 50 + 75} />
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
                <Skeleton className="h-9 w-9 rounded-lg" delay={50} />
                <Skeleton className="h-9 w-9 rounded-lg" delay={75} />
            </div>
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
            {/* Day headers */}
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={`header-${i}`} className="bg-background p-2">
                    <Skeleton className="h-4 w-8 mx-auto" delay={i * 25 + 100} />
                </div>
            ))}
            {/* Calendar cells */}
            {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="bg-background p-2 min-h-[80px]">
                    <Skeleton className="h-4 w-6 mb-2" delay={i * 15 + 275} />
                    {i % 3 === 0 && (
                        <Skeleton className="h-5 w-full rounded" delay={i * 15 + 300} />
                    )}
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
                        <Skeleton className="h-10 w-10 rounded-lg" delay={i * 100} />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-36" delay={i * 100 + 25} />
                            <Skeleton className="h-4 w-52" delay={i * 100 + 50} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Skeleton className="h-4 w-32" delay={i * 100 + 75} />
                            <Skeleton className="h-3 w-48" delay={i * 100 + 100} />
                        </div>
                        <Skeleton className="h-6 w-11 rounded-full" delay={i * 100 + 125} />
                    </div>
                </CardContent>
            </Card>
        ))}
    </div>
);

/**
 * Skeleton for dentist profile cards grid
 */
export const DentistProfilesSkeleton = () => (
    <div className="min-h-screen bg-gradient-to-br from-dental-primary/5 to-dental-accent/5">
        <div className="container mx-auto px-4 py-8">
            {/* Header skeleton */}
            <div className="flex items-center gap-4 mb-8">
                <Skeleton variant="button" size="sm" className="w-28" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" delay={50} />
                    <Skeleton className="h-4 w-64" delay={100} />
                </div>
            </div>
            {/* Cards skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="overflow-hidden">
                        <CardHeader className="text-center pb-4">
                            <div className="flex flex-col items-center">
                                <Skeleton
                                    variant="avatar"
                                    className="w-24 h-24 mb-4"
                                    delay={i * 75}
                                />
                                <Skeleton className="h-6 w-40 mb-2" delay={i * 75 + 25} />
                                <Skeleton className="h-5 w-24 rounded-full" delay={i * 75 + 50} />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" delay={i * 75 + 75} />
                                <Skeleton className="h-4 w-3/4" delay={i * 75 + 100} />
                            </div>
                            <Skeleton variant="button" className="w-full h-10" delay={i * 75 + 125} />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    </div>
);

/**
 * Skeleton for pricing page
 */
export const PricingPageSkeleton = () => (
    <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
            <Skeleton className="h-20 w-64 mx-auto rounded-lg mb-4" />
            <Skeleton className="h-5 w-80 mx-auto" delay={50} />
        </div>
        <Skeleton className="h-10 w-64 mx-auto rounded-xl mb-12" delay={100} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                    <div className="space-y-6">
                        <Skeleton className="h-6 w-24" delay={i * 100 + 150} />
                        <Skeleton className="h-12 w-32" delay={i * 100 + 175} />
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map((j) => (
                                <div key={j} className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-5 rounded-full" delay={i * 100 + j * 25 + 200} />
                                    <Skeleton className="h-4 flex-1" delay={i * 100 + j * 25 + 225} />
                                </div>
                            ))}
                        </div>
                        <Skeleton variant="button" className="w-full h-10" delay={i * 100 + 350} />
                    </div>
                </Card>
            ))}
        </div>
    </div>
);

/**
 * Generic page skeleton with header
 */
export const PageSkeleton = ({ children }: { children?: React.ReactNode }) => (
    <div className="space-y-6">
        <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" delay={50} />
        </div>
        {children || <SettingsCardSkeleton />}
    </div>
);
