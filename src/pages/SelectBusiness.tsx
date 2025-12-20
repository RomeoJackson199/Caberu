import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Check, Loader2, AlertTriangle, Search, Crown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function SelectBusiness() {
    const navigate = useNavigate();
    const { memberships, switchBusiness, loading: contextLoading, businessId, allBusinesses } = useBusinessContext();
    const [allBusinessesList, setAllBusinessesList] = useState<any[]>([]);
    const [selecting, setSelecting] = useState<string | null>(null);
    const [loadingBusinesses, setLoadingBusinesses] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);

    // Check authentication and get profile ID
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login', { replace: true });
            } else {
                setIsAuthenticated(true);
                // Get profile ID to determine ownership
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('user_id', user.id)
                    .maybeSingle();
                if (profile) {
                    setCurrentUserProfileId(profile.id);
                }
            }
        };
        checkAuth();
    }, [navigate]);

    // Filter and sort businesses - owners first, then search
    const sortedFilteredBusinesses = useMemo(() => {
        let filtered = allBusinessesList;
        
        // Apply search filter
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = allBusinessesList.filter(b => 
                b.name?.toLowerCase().includes(term) || 
                b.tagline?.toLowerCase().includes(term) ||
                b.slug?.toLowerCase().includes(term)
            );
        }
        
        // Sort: owned businesses first, then alphabetically
        return filtered.sort((a, b) => {
            const aIsOwned = a.owner_profile_id === currentUserProfileId;
            const bIsOwned = b.owner_profile_id === currentUserProfileId;
            
            if (aIsOwned && !bIsOwned) return -1;
            if (!aIsOwned && bIsOwned) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });
    }, [allBusinessesList, searchTerm, currentUserProfileId]);

    // Fetch all available businesses
    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchBusinesses = async () => {
            setLoadingBusinesses(true);

            // Try view first, fallback to businesses table
            let { data, error } = await supabase
                .from('public_businesses_view')
                .select('*')
                .order('name');

            if (error || !data || data.length === 0) {
                const fallback = await supabase
                    .from('businesses')
                    .select('id, name, slug, logo_url, tagline, template_type, owner_profile_id')
                    .order('name');
                data = fallback.data;
            }

            setAllBusinessesList(data || []);
            setLoadingBusinesses(false);
        };

        fetchBusinesses();
    }, [isAuthenticated]);

    // Check subscription status for a dentist
    const checkDentistSubscription = async (dentistId: string): Promise<boolean> => {
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('id, status, current_period_end')
                .eq('dentist_id', dentistId)
                .maybeSingle();

            if (error) {
                console.error('Error checking subscription:', error);
                return false;
            }

            if (!data) {
                return false; // No subscription found
            }

            // Check if subscription is active and not expired
            const periodEnd = data.current_period_end ? new Date(data.current_period_end) : null;
            const now = new Date();

            return data.status === 'active' && (!periodEnd || periodEnd > now);
        } catch (err) {
            console.error('Subscription check error:', err);
            return false;
        }
    };

    // Get dentist ID from profile for a SPECIFIC business
    const getDentistId = async (userId: string, businessId: string): Promise<string | null> => {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', userId)
                .single();

            if (!profile) return null;

            // Find dentist record for THIS specific business
            const { data: dentist } = await supabase
                .from('dentists')
                .select('id')
                .eq('profile_id', profile.id)
                .eq('business_id', businessId)
                .maybeSingle();

            return dentist?.id || null;
        } catch (err) {
            console.error('Error getting dentist ID:', err);
            return null;
        }
    };

    const handleSelectBusiness = async (targetBusinessId: string) => {
        setSelecting(targetBusinessId);
        try {
            await switchBusiness(targetBusinessId);

            // Check if user is a dentist
            const membership = memberships.find(m => m.business_id === targetBusinessId);
            const isDentist = membership?.role === 'dentist' || membership?.role === 'admin' || membership?.role === 'owner';

            if (isDentist) {
                // Get current user
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const dentistId = await getDentistId(user.id, targetBusinessId);

                    if (dentistId) {
                        const hasActiveSubscription = await checkDentistSubscription(dentistId);

                        if (!hasActiveSubscription) {
                            // No active subscription - redirect to billing settings to resolve
                            toast.warning('Subscription Issue', {
                                description: 'Please check your subscription status to continue.',
                            });
                            navigate('/dentist/settings?tab=billing', { replace: true });
                            return;
                        }
                    }
                }

                // Has subscription - go to dentist dashboard
                navigate('/dentist/dashboard', { replace: true });
            } else {
                // Patient - go to patient dashboard
                navigate('/dashboard', { replace: true });
            }
        } catch (error) {
            console.error('Error selecting business:', error);
            toast.error('Failed to select business');
        } finally {
            setSelecting(null);
        }
    };

    if (isAuthenticated === null || contextLoading || loadingBusinesses) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl">
                    {/* Header skeleton */}
                    <div className="text-center mb-8">
                        <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
                        <Skeleton className="h-8 w-64 mx-auto mb-2" />
                        <Skeleton className="h-4 w-80 mx-auto" />
                    </div>
                    {/* Search skeleton */}
                    <Skeleton className="h-10 w-full mb-6 rounded-md" />
                    {/* Business cards skeleton */}
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i} className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="w-12 h-12 rounded-lg" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-5 w-40" />
                                            <Skeleton className="h-4 w-24" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-6 w-16 rounded-full" />
                                        <Skeleton className="h-9 w-20 rounded-md" />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
                        <Building2 className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Select Your Business
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Choose which business you want to work with today
                    </p>
                </div>

                {/* Search Input */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search businesses..."
                        className="pl-10"
                    />
                </div>

                <div className="space-y-4">
                    {sortedFilteredBusinesses.length === 0 ? (
                        <Card className="text-center py-12">
                            <CardContent>
                                <p className="text-muted-foreground">
                                    {searchTerm ? 'No businesses match your search' : 'No businesses available'}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        sortedFilteredBusinesses.map((business) => {
                            const isOwner = business.owner_profile_id === currentUserProfileId;
                            const membership = memberships.find(m => m.business_id === business.id);
                            const role = membership?.role || 'Patient';
                            const isSelected = businessId === business.id;
                            const isSelecting = selecting === business.id;

                            return (
                                <Card
                                    key={business.id}
                                    className={`cursor-pointer transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${isSelected
                                        ? 'ring-2 ring-primary bg-primary/5'
                                        : 'hover:bg-muted/50'
                                        }`}
                                    onClick={() => !isSelecting && handleSelectBusiness(business.id)}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                {business.logo_url ? (
                                                    <img
                                                        src={business.logo_url}
                                                        alt={business.name}
                                                        className="w-12 h-12 rounded-lg object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                                        <Building2 className="h-6 w-6 text-white" />
                                                    </div>
                                                )}
                                                <div>
                                                    <CardTitle className="text-lg flex items-center gap-2">
                                                        {business.name}
                                                        {isSelected && (
                                                            <Check className="h-5 w-5 text-primary" />
                                                        )}
                                                    </CardTitle>
                                                    <CardDescription className="mt-1">
                                                        {business.tagline || business.template_type || 'Healthcare'}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {isOwner && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                        <Crown className="h-3 w-3" />
                                                        Owner
                                                    </span>
                                                )}
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${role !== 'Patient'
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {role}
                                                </span>
                                                <Button
                                                    size="sm"
                                                    variant={isSelected ? 'default' : 'outline'}
                                                    disabled={isSelecting}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSelectBusiness(business.id);
                                                    }}
                                                >
                                                    {isSelecting ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : isSelected ? (
                                                        'Continue'
                                                    ) : (
                                                        'Select'
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                </Card>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
