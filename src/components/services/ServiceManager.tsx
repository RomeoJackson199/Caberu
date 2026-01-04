import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, Image as ImageIcon, Filter, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ServiceDialog } from './ServiceDialog';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/error-utils';
import { useServiceActionsWithUndo } from '@/hooks/useServiceActionsWithUndo';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  image_url: string | null;
  requires_upfront_payment: boolean;
  is_active: boolean;
  duration_minutes: number | null;
  category: string | null;
  business_id: string;
}

export function ServiceManager() {
  const { businessId, businessName } = useBusinessContext();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [dialogCategory, setDialogCategory] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Undo functionality
  const { deleteServiceWithUndo, toggleServiceStatusWithUndo } = useServiceActionsWithUndo();

  useEffect(() => {
    if (businessId) {
      loadServices();
    }
  }, [businessId]);

  const loadServices = async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('business_services')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error: unknown) {
      logger.error('Error loading services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    // Optimistically remove from UI immediately
    setServices(services.filter(s => s.id !== serviceId));

    // Use undo functionality - will show toast with undo button
    await deleteServiceWithUndo(service);

    // Reload services after undo window expires or action completes
    setTimeout(() => loadServices(), 5500);
  };

  const handleToggleActive = async (serviceId: string, currentStatus: boolean) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    // Optimistically toggle in UI immediately
    setServices(services.map(s =>
      s.id === serviceId ? { ...s, is_active: !currentStatus } : s
    ));

    // Use undo functionality - will show toast with undo button
    await toggleServiceStatusWithUndo(service);

    // Reload services after undo window expires or action completes
    setTimeout(() => loadServices(), 5500);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setDialogCategory(service.category ?? undefined);
    setDialogOpen(true);
  };

  const handleAddNew = (category?: string) => {
    setEditingService(null);
    setDialogCategory(category);
    setDialogOpen(true);
  };

  const handleDialogClose = (shouldRefresh: boolean) => {
    setDialogOpen(false);
    setEditingService(null);
    setDialogCategory(undefined);
    if (shouldRefresh) {
      loadServices();
    }
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(cents / 100);
  };

  const filteredServices = services.filter(service => {
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && service.is_active) ||
      (statusFilter === 'inactive' && !service.is_active);
    const term = searchTerm.trim().toLowerCase();
    if (!matchesStatus) return false;
    if (!term) return true;
    return (
      service.name.toLowerCase().includes(term) ||
      (service.category ?? '').toLowerCase().includes(term) ||
      (service.description ?? '').toLowerCase().includes(term)
    );
  });

  const activeCount = services.filter(service => service.is_active).length;
  const inactiveCount = services.length - activeCount;

  if (!businessId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Please select a business to manage services
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 p-6 rounded-2xl border-2 border-blue-100 dark:border-blue-900">
        <div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Services & Products
          </h2>
          <p className="text-muted-foreground mt-2 text-base">
            Manage your offerings for {businessName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => handleAddNew('Service')}
            className="gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg h-11 px-6"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            Add Service
          </Button>
          <Button variant="ghost" size="icon" onClick={loadServices} disabled={loading} className="h-11 w-11">
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 shadow-md">
          <CardHeader className="pb-3">
            <CardDescription className="text-blue-700 dark:text-blue-400 font-medium">Total Items</CardDescription>
            <CardTitle className="text-4xl font-bold text-blue-900 dark:text-blue-100">{services.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-2 border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 shadow-md">
          <CardHeader className="pb-3">
            <CardDescription className="text-emerald-700 dark:text-emerald-400 font-medium">Active</CardDescription>
            <CardTitle className="text-4xl font-bold text-emerald-900 dark:text-emerald-100">{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-2 border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30 shadow-md">
          <CardHeader className="pb-3">
            <CardDescription className="text-amber-700 dark:text-amber-400 font-medium">Inactive</CardDescription>
            <CardTitle className="text-4xl font-bold text-amber-900 dark:text-amber-100">{inactiveCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-2 border-purple-200 dark:border-purple-900 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 shadow-md">
          <CardHeader className="pb-3">
            <CardDescription className="text-purple-700 dark:text-purple-400 font-medium">Prepay Required</CardDescription>
            <CardTitle className="text-4xl font-bold text-purple-900 dark:text-purple-100">
              {services.filter(service => service.requires_upfront_payment).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Search name, category or description"
              className="pl-9"
            />
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'inactive'] as const).map(filter => (
              <Button
                key={filter}
                type="button"
                variant={statusFilter === filter ? 'default' : 'outline'}
                onClick={() => setStatusFilter(filter)}
              >
                {filter === 'all' ? 'All items' : filter === 'active' ? 'Active' : 'Inactive'}
              </Button>
            ))}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Prices shown in Euro (€). Update items to keep your catalogue consistent.
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-2/3 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-10 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="pt-8 text-center">
            <ImageIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No services yet</h3>
            <p className="mb-4 text-muted-foreground">
              Add your first service or product to make booking effortless for your patients.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => handleAddNew('Service')}>
                <Plus className="mr-2 h-4 w-4" />
                Add a service
              </Button>
              <Button variant="outline" onClick={() => handleAddNew('Product')}>
                <Plus className="mr-2 h-4 w-4" />
                Add a product
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filteredServices.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <h3 className="text-lg font-semibold">No items match your filters</h3>
            <p className="mt-2 text-muted-foreground">
              Try adjusting the search term or status filter to see more services.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredServices.map((service) => (
            <Card
              key={service.id}
              className={`flex h-full flex-col transition-all hover:shadow-xl ${!service.is_active
                ? 'border-dashed opacity-60 hover:opacity-80'
                : 'border-2 hover:scale-[1.02] shadow-md'
                }`}
            >
              <CardHeader className="space-y-4">

                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <CardTitle className="text-xl font-bold">{service.name}</CardTitle>
                    {service.category && (
                      <Badge
                        variant="secondary"
                        className="uppercase tracking-wide font-semibold bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 text-blue-800 dark:text-blue-200"
                      >
                        {service.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {!service.is_active && (
                      <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-400">
                        Inactive
                      </Badge>
                    )}
                    {service.requires_upfront_payment && (
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                        Prepay
                      </Badge>
                    )}
                  </div>
                </div>
                {service.description && (
                  <CardDescription className="line-clamp-3 text-sm leading-relaxed">
                    {service.description}
                  </CardDescription>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {formatPrice(service.price_cents)}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {service.duration_minutes && (
                      <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full font-medium">
                        {service.duration_minutes} min
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="mt-auto pt-4 border-t">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-2 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    onClick={() => handleEdit(service)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={service.is_active ? 'border-2 border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30' : 'border-2 border-green-400 hover:bg-green-50 dark:hover:bg-green-950/30'}
                    onClick={() => handleToggleActive(service.id, service.is_active)}
                  >
                    {service.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-2 border-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={() => handleDelete(service.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ServiceDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        service={editingService}
        businessId={businessId}
        defaultCategory={dialogCategory}
      />
    </div>
  );
}
