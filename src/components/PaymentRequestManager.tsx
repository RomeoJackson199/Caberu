import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, DollarSign, Clock, CheckCircle, XCircle, Search, Filter, MoreHorizontal, Send, FileDown, Check, Edit } from 'lucide-react';
import { PaymentRequestForm } from '@/components/PaymentRequestForm';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import PaymentWizard from '@/components/payments/PaymentWizard';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useLocation, useNavigate } from 'react-router-dom';

interface PaymentRequest {
  id: string;
  patient_id: string;
  dentist_id: string;
  amount: number;
  description: string;
  status: string;
  patient_email: string;
  created_at: string;
}

interface PaymentRequestManagerProps {
  dentistId: string;
  patientId?: string; // Optional: filter by specific patient
  onPaymentCreated?: () => void | Promise<void>; // Optional callback when payment is created
}

export const PaymentRequestManager: React.FC<PaymentRequestManagerProps> = ({ dentistId, patientId, onPaymentCreated }) => {
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const { toast } = useToast();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [amountMin, setAmountMin] = useState<string>('');
  const [amountMax, setAmountMax] = useState<string>('');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [patientTerm, setPatientTerm] = useState<string>('');
  const [creatorScope, setCreatorScope] = useState<'any' | 'me'>('any');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [itemsById, setItemsById] = useState<Record<string, any[]>>({});
  const [remindersById, setRemindersById] = useState<Record<string, any[]>>({});
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState<PaymentRequest | null>(null);
  const [editForm, setEditForm] = useState({ amount: '', description: '' });
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize filters from query params
    const params = new URLSearchParams(location.search);
    setStatusFilter(params.get('status') || '');
    setQuery(params.get('q') || '');
    setAmountMin(params.get('min') || '');
    setAmountMax(params.get('max') || '');
    setDateStart(params.get('start') || '');
    setDateEnd(params.get('end') || '');
    setPatientTerm(params.get('patient') || '');
    setCreatorScope((params.get('creator') as 'any' | 'me') || 'any');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchCurrentProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (profile?.id) setMyProfileId(profile.id);
      } catch (e) { /* noop */ }
    };
    fetchCurrentProfile();
  }, []);

  useEffect(() => {
    fetchPaymentRequests();
    // Update query params without reload
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (query) params.set('q', query);
    if (amountMin) params.set('min', amountMin);
    if (amountMax) params.set('max', amountMax);
    if (dateStart) params.set('start', dateStart);
    if (dateEnd) params.set('end', dateEnd);
    if (patientTerm) params.set('patient', patientTerm);
    if (creatorScope && creatorScope !== 'any') params.set('creator', creatorScope);
    navigate({ search: params.toString() }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dentistId, patientId, statusFilter, query, amountMin, amountMax, dateStart, dateEnd, patientTerm, creatorScope, myProfileId]);

  const fetchPaymentRequests = async () => {
    try {
      setLoading(true);
      let q: any = (supabase as any)
        .from('payment_requests')
        .select('*')
        .eq('dentist_id', dentistId);
      // Filter by patient if provided
      if (patientId) q = q.eq('patient_id', patientId);
      if (statusFilter) q = q.eq('status', statusFilter);
      if (query) q = q.ilike('description', `%${query}%`);
      if (patientTerm) q = q.ilike('patient_email', `%${patientTerm}%`);
      if (amountMin) q = q.gte('amount', Math.round(Number(amountMin) * 100));
      if (amountMax) q = q.lte('amount', Math.round(Number(amountMax) * 100));
      if (dateStart) q = q.gte('created_at', new Date(dateStart).toISOString());
      if (dateEnd) {
        const end = new Date(dateEnd);
        end.setHours(23, 59, 59, 999);
        q = q.lte('created_at', end.toISOString());
      }
      if (creatorScope === 'me' && myProfileId) q = q.eq('created_by', myProfileId);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      setPaymentRequests(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to load payment requests', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'overdue':
        return <Clock className="h-4 w-4 text-red-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = { pending: 'default', paid: 'secondary', cancelled: 'destructive', overdue: 'destructive', failed: 'destructive', sent: 'default', draft: 'outline' } as const;
    const colors = { pending: 'bg-yellow-100 text-yellow-800 border-yellow-200', paid: 'bg-green-100 text-green-800 border-green-200', cancelled: 'bg-red-100 text-red-800 border-red-200', overdue: 'bg-red-100 text-red-800 border-red-200', failed: 'bg-red-100 text-red-800 border-red-200', sent: 'bg-blue-100 text-blue-800 border-blue-200', draft: 'bg-gray-100 text-gray-800 border-gray-200' } as const;

    return (
      <Badge
        variant={variants[status as keyof typeof variants] || 'default'}
        className={`${colors[status as keyof typeof colors] || colors.pending} font-medium px-3 py-1`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatAmount = (amount: number) => {
    return `€${(amount / 100).toFixed(2)}`;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id); else copy.add(id);
      return copy;
    });
  };

  const sendReminders = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      const { data, error } = await supabase.functions.invoke('send-payment-reminder', {
        body: { payment_request_ids: ids, template_key: 'friendly' }
      });
      if (error) throw error;
      toast({ title: 'Reminders queued', description: 'Emails are being sent.' });
      setSelectedIds(new Set());
      // Refresh
      fetchPaymentRequests();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to send reminders', variant: 'destructive' });
    }
  };

  const markPaid = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      const { error } = await supabase
        .from('payment_requests')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
      toast({ title: 'Marked as paid' });
      setSelectedIds(new Set());
      fetchPaymentRequests();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to mark paid', variant: 'destructive' });
    }
  };

  const exportCsv = () => {
    const rows = paymentRequests.map((r) => ({ id: r.id, patient_email: r.patient_email, amount: (r.amount / 100).toFixed(2), status: r.status, created_at: r.created_at }));
    const header = Object.keys(rows[0] || { id: '', patient_email: '', amount: '', status: '', created_at: '' });
    const csv = [header.join(','), ...rows.map((r) => header.map((k) => (r as any)[k]).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'payments.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleEditPayment = async () => {
    if (!editingRequest) return;
    try {
      const { error } = await supabase
        .from('payment_requests')
        .update({
          amount: Math.round(Number(editForm.amount) * 100),
          description: editForm.description
        })
        .eq('id', editingRequest.id);

      if (error) throw error;
      toast({ title: 'Payment request updated' });
      setEditingRequest(null);
      fetchPaymentRequests();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to update payment request', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">{t.loadingPaymentRequests || 'Loading payment requests...'}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-dental-primary mb-2">{t.paymentRequests || 'Payment Requests'}</h2>
          <p className="text-sm sm:text-base text-dental-text/70">{t.manageTrackPayments || 'Manage and track patient payment requests'}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowWizard(true)} size="lg" className="h-12 px-6 rounded-xl bg-gradient-to-r from-dental-accent to-dental-accent/80 hover:from-dental-accent/90 hover:to-dental-accent/70 text-white font-semibold shadow-lg hover:shadow-xl transition-all">
            <Plus className="h-5 w-5 mr-2" />{t.newPayment || 'New Payment'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="lg" className="h-12"><MoreHorizontal className="h-5 w-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={sendReminders}><Send className="h-4 w-4 mr-2" />{t.sendReminders || 'Send reminders'}</DropdownMenuItem>
              <DropdownMenuItem onClick={markPaid}><Check className="h-4 w-4 mr-2" />{t.markPaid || 'Mark paid'}</DropdownMenuItem>
              <DropdownMenuItem onClick={exportCsv}><FileDown className="h-4 w-4 mr-2" />{t.exportCSV || 'Export CSV'}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative w-full sm:w-64">
            <Input placeholder={t.searchDescription || 'Search description'} value={query} onChange={(e) => setQuery(e.target.value)} />
            <Search className="h-4 w-4 absolute right-2 top-3 text-muted-foreground" />
          </div>
          <select className="border rounded-md p-2" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{t.allStatuses || 'All statuses'}</option>
            {['draft', 'sent', 'pending', 'paid', 'overdue', 'failed', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="relative w-full sm:w-64">
            <Input placeholder={t.patientEmail || 'Patient email'} value={patientTerm} onChange={(e) => setPatientTerm(e.target.value)} />
          </div>
          <select className="border rounded-md p-2" value={creatorScope} onChange={(e) => setCreatorScope(e.target.value as any)}>
            <option value="any">{t.anyCreator || 'Any creator'}</option>
            <option value="me">{t.createdByMe || 'Created by me'}</option>
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <Input className="w-full sm:w-40" placeholder={t.minAmount || 'Min €'} type="number" min={0} step="0.01" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} />
          <Input className="w-full sm:w-40" placeholder={t.maxAmount || 'Max €'} type="number" min={0} step="0.01" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} />
          <Input className="w-full sm:w-48" type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
          <Input className="w-full sm:w-48" type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
        </div>
      </div>

      {showForm && (
        <div className="bg-gradient-to-br from-dental-primary/5 to-dental-accent/5 rounded-xl p-1 shadow-lg">
          <PaymentRequestForm
            dentistId={dentistId}
            onClose={() => {
              setShowForm(false);
              fetchPaymentRequests();
            }}
          />
        </div>
      )}

      {showWizard && (
        <PaymentWizard dentistId={dentistId} isOpen={showWizard} onClose={() => { setShowWizard(false); fetchPaymentRequests(); }} />
      )}

      <div className="grid gap-6">
        {paymentRequests.length === 0 ? (
          <Card className="bg-gradient-to-br from-dental-primary/5 to-dental-accent/5 border-dental-primary/20">
            <CardContent className="p-8 sm:p-12 text-center">
              <DollarSign className="h-12 sm:h-16 w-12 sm:w-16 mx-auto text-dental-primary/30 mb-6" />
              <h3 className="text-lg sm:text-xl font-semibold text-dental-primary mb-2">{t.noPaymentRequestsYet || 'No payment requests yet'}</h3>
              <p className="text-sm sm:text-base text-dental-text/60 mb-6">{t.createFirstPaymentRequest || 'Create your first payment request to get started'}</p>
              <Button
                onClick={() => setShowForm(true)}
                size="lg"
                className="h-12 px-6 rounded-xl bg-gradient-to-r from-dental-accent to-dental-accent/80 hover:from-dental-accent/90 hover:to-dental-accent/70 text-white font-semibold"
              >
                {t.createPaymentRequest || 'Create Payment Request'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          paymentRequests.map((request) => (
            <Card key={request.id} className="bg-gradient-to-br from-white to-dental-primary/5 border-dental-primary/10 shadow-md hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-full bg-dental-primary/10">
                      {getStatusIcon(request.status)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-dental-primary text-lg mb-1">
                        {request.patient_email}
                      </h3>
                      <p className="text-dental-text/80 mb-1">
                        {request.description}
                      </p>
                      <p className="text-xs text-dental-text/50 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {t.created || 'Created'} {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <input type="checkbox" checked={selectedIds.has(request.id)} onChange={() => toggleSelect(request.id)} />
                    <div className="text-right">
                      <p className="font-bold text-2xl text-dental-primary mb-3">{formatAmount(request.amount)}</p>
                      {getStatusBadge(request.status)}
                      <div className="mt-2 flex gap-2 opacity-80">
                        <Button variant="outline" size="sm" onClick={async () => {
                          const willExpand = !expanded[request.id];
                          setExpanded((prev) => ({ ...prev, [request.id]: willExpand }));
                          if (willExpand) {
                            const [itemsRes, remRes] = await Promise.all([
                              (supabase as any).from('payment_items').select('*').eq('payment_request_id', request.id),
                              (supabase as any).from('payment_reminders').select('*').eq('payment_request_id', request.id).order('created_at', { ascending: false })
                            ]);
                            if (!itemsRes.error) setItemsById((m) => ({ ...m, [request.id]: itemsRes.data || [] }));
                            if (!remRes.error) setRemindersById((m) => ({ ...m, [request.id]: remRes.data || [] }));
                          }
                        }}>View</Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          setEditingRequest(request);
                          setEditForm({ amount: (request.amount / 100).toFixed(2), description: request.description });
                        }}><Edit className="h-4 w-4 mr-1" />Edit</Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          supabase.functions.invoke('send-payment-reminder', { body: { payment_request_ids: [request.id], template_key: 'friendly' } }).then(() => toast({ title: t.reminderSent || 'Reminder sent to patient' })).catch(() => toast({ title: t.error || 'Error', description: t.failedToSendReminder || 'Failed to send reminder', variant: 'destructive' }));
                        }}><Send className="h-4 w-4 mr-1" />{t.remindPatient || 'Remind Patient'}</Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          (async () => {
                            try {
                              const { error } = await supabase.from('payment_requests').update({ status: 'cancelled' }).eq('id', request.id);
                              if (error) throw error;
                              toast({ title: 'Cancelled' });
                              fetchPaymentRequests();
                            } catch {
                              toast({ title: 'Error', description: 'Failed to cancel', variant: 'destructive' });
                            }
                          })();
                        }}>{t.cancel || 'Cancel'}</Button>
                      </div>
                    </div>
                  </div>
                </div>
                {expanded[request.id] && (
                  <div className="mt-4 border-t pt-4 text-sm">
                    <div className="mb-2 font-medium">{t.items || 'Items'}</div>
                    <div className="space-y-1">
                      {(itemsById[request.id] || []).map((it) => (
                        <div key={it.id} className="flex justify-between">
                          <div>{it.code ? `[${it.code}] ` : ''}{it.description} × {it.quantity}</div>
                          <div>€{((it.quantity * it.unit_price_cents + it.tax_cents) / 100).toFixed(2)}</div>
                        </div>
                      ))}
                      {(!itemsById[request.id] || itemsById[request.id].length === 0) && (
                        <div className="text-muted-foreground">{t.noItemsAdded || 'No items added'}</div>
                      )}
                    </div>
                    <div className="mt-4 mb-2 font-medium">{t.reminderLog || 'Reminder log'}</div>
                    <div className="space-y-1">
                      {(remindersById[request.id] || []).map((r) => (
                        <div key={r.id} className="flex justify-between">
                          <div>{r.template_key} via {r.channel}</div>
                          <div>{r.status} · {new Date(r.created_at).toLocaleString()}</div>
                        </div>
                      ))}
                      {(!remindersById[request.id] || remindersById[request.id].length === 0) && (
                        <div className="text-muted-foreground">{t.noRemindersYet || 'No reminders yet'}</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Payment Request Dialog */}
      <Dialog open={!!editingRequest} onOpenChange={(open) => !open && setEditingRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.editPaymentRequest || 'Edit Payment Request'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.amountEuro || 'Amount (€)'}</Label>
              <Input
                type="number"
                step="0.01"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <Button onClick={handleEditPayment} className="w-full">{t.saveChanges || 'Save Changes'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};