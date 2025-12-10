import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Check, Loader2 } from 'lucide-react';
import { ModernLoadingSpinner } from '@/components/enhanced/ModernLoadingSpinner';

export default function SelectBusiness() {
    const navigate = useNavigate();
    const { memberships, switchBusiness, loading: contextLoading, businessId, allBusinesses } = useBusinessContext();
    const [allBusinessesList, setAllBusinessesList] = useState<any[]>([]);
    const [selecting, setSelecting] = useState<string | null>(null);
    const [loadingBusinesses, setLoadingBusinesses] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    // Check authentication
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login', { replace: true });
            } else {
                setIsAuthenticated(true);
            }
        };
        checkAuth();
    }, [navigate]);

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
                    .select('id, name, slug, logo_url, tagline, template_type')
                    .order('name');
                data = fallback.data;
            }

            setAllBusinessesList(data || []);
            setLoadingBusinesses(false);
        };

        fetchBusinesses();
    }, [isAuthenticated]);

    const handleSelectBusiness = async (targetBusinessId: string) => {
        setSelecting(targetBusinessId);
        try {
            await switchBusiness(targetBusinessId);
            // Redirect based on user role
            const membership = memberships.find(m => m.business_id === targetBusinessId);
            if (membership?.role === 'dentist' || membership?.role === 'admin' || membership?.role === 'owner') {
                navigate('/dentist/dashboard', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        } catch (error) {
            console.error('Error selecting business:', error);
        } finally {
            setSelecting(null);
        }
    };

    if (isAuthenticated === null || contextLoading || loadingBusinesses) {
        return <ModernLoadingSpinner variant="overlay" message="Loading..." />;
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

                <div className="space-y-4">
                    {allBusinessesList.length === 0 ? (
                        <Card className="text-center py-12">
                            <CardContent>
                                <p className="text-muted-foreground">No businesses available</p>
                            </CardContent>
                        </Card>
                    ) : (
                        allBusinessesList.map((business) => {
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
