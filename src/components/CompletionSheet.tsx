import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Calendar, EllipsisVertical, Plus, Search, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { emitAnalyticsEvent } from "@/lib/analyticsEvents";
import { mapDentistPortalSelectionToKey, createRecall } from "@/lib/recalls";
import { withSchemaReloadRetry } from "@/integrations/supabase/retry";
import { SKU_DISPLAY_NAME, PROCEDURE_DEFS } from "@/lib/constants";
import { PatientPreferencesDialog } from "./PatientPreferencesDialog";
import { logger } from '@/lib/logger';

interface CompletionSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	appointment: { id: string; patient_id: string; dentist_id: string; appointment_date: string; status: string; };
	dentistId: string;
	onCompleted: () => void;
}


interface ProcedureLineForm {
	id: string;
	key: string;
	name: string;
	qty: number;
	unitPrice: number;
	tooth?: string;
	duration: number;
}

interface SupplyRow { item_id: string; name: string; quantity: number; isAuto?: boolean; }

type AdjustmentType = 'none' | 'discount_percent' | 'discount_amount' | 'surcharge_amount';

export function CompletionSheet({ open, onOpenChange, appointment, dentistId, onCompleted }: CompletionSheetProps) {
	const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
	const { toast } = useToast();
	const sb: any = supabase;
	const [loading, setLoading] = useState(false);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);

	// Header data
	const [dentistName, setDentistName] = useState<string>("");
	const [patientName, setPatientName] = useState<string>("");

	// Section A — Procedures
	const [showProcedurePicker, setShowProcedurePicker] = useState(false);
	const [procedureQuery, setProcedureQuery] = useState("");
	const [procedures, setProcedures] = useState<ProcedureLineForm[]>([]);
	const [procSupplyOverrides, setProcSupplyOverrides] = useState<Record<string, Record<string, boolean>>>({}); // per-proc-id sku -> included?

	// Section B — Supplies
	const [inventoryItems, setInventoryItems] = useState<Array<{ id: string; name: string; quantity: number; min_threshold: number }>>([]);
	const [supplies, setSupplies] = useState<SupplyRow[]>([]); // auto + manual
	const [autoDeduct, setAutoDeduct] = useState(true);

	// Section C — Notes
	const [notes, setNotes] = useState("");

	// Section D — Prescription
	interface RxItem { id: string; name: string; dose: string; frequency: string; duration: string; notes?: string }
	const [rxItems, setRxItems] = useState<RxItem[]>([]);

	// Section E — Billing
	const subtotal = useMemo(() => procedures.reduce((sum, p) => sum + p.qty * p.unitPrice, 0), [procedures]);
	const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('none');
	const [adjustmentValue, setAdjustmentValue] = useState<number>(0);
	const computedTotal = useMemo(() => {
		let total = subtotal;
		if (adjustmentType === 'discount_percent') total -= (subtotal * (adjustmentValue || 0) / 100);
		if (adjustmentType === 'discount_amount') total -= (adjustmentValue || 0);
		if (adjustmentType === 'surcharge_amount') total += (adjustmentValue || 0);
		return Math.max(0, +total.toFixed(2));
	}, [subtotal, adjustmentType, adjustmentValue]);
	const [finalTotalOverride, setFinalTotalOverride] = useState<number | undefined>(undefined);
	const finalTotal = finalTotalOverride !== undefined ? finalTotalOverride : computedTotal;
	const [createInvoiceAndLink, setCreateInvoiceAndLink] = useState(true);

	// Section F — Next Visit
	const [predictiveChoice, setPredictiveChoice] = useState<string>("");
	const [offerSlots, setOfferSlots] = useState(true);

	// Local helpers
	const canSave = procedures.length > 0 && !loading;
	const toothInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

	useEffect(() => {
		if (!open) return;

		let isMounted = true;
		const controller = new AbortController();

		(async () => {
			try {
				const user = await sb.auth.getUser();
				if (!isMounted) return;
				setCurrentUserId(user.data.user?.id || null);

				const { data: dent, error: dentErr } = await sb.from('dentists').select('id, profile_id').eq('id', dentistId).single();
				if (dentErr) {
					logger.error('Failed to fetch dentist data:', dentErr);
				} else if (dent?.profile_id && isMounted) {
					const { data: prof, error: profErr } = await sb.from('profiles').select('first_name, last_name').eq('id', dent.profile_id).single();
					if (profErr) {
						logger.error('Failed to fetch dentist profile:', profErr);
					} else if (isMounted) {
						setDentistName(prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : '');
					}
				}

				const { data: pat, error: patErr } = await sb.from('profiles').select('first_name, last_name').eq('id', appointment.patient_id).single();
				if (patErr) {
					logger.error('Failed to fetch patient data:', patErr);
				} else if (isMounted) {
					setPatientName(pat ? `${pat.first_name || ''} ${pat.last_name || ''}`.trim() : '');
				}

				const { data: inv, error: invErr } = await sb.from('inventory_items').select('id, name, quantity, min_threshold').eq('dentist_id', dentistId).order('name');
				if (invErr) {
					logger.error('Failed to fetch inventory items:', invErr);
				} else if (isMounted) {
					setInventoryItems((inv || []) as any);
				}
			} catch (error) {
				if (isMounted) {
					logger.error('Error loading completion sheet data:', error);
					toast({
						title: 'Error',
						description: 'Failed to load some data. Please try again.',
						variant: 'destructive',
					});
				}
			}
		})();

		return () => {
			isMounted = false;
			controller.abort();
		};
	}, [open, dentistId, appointment.patient_id]);

	// Build auto supplies from selected procedures + overrides
	useEffect(() => {
		const aggregated: Record<string, number> = {};
		for (const p of procedures) {
			const def = PROCEDURE_DEFS.find(d => d.key === p.key);
			if (!def) continue;
			for (const s of def.defaultSupplies) {
				const include = procSupplyOverrides[p.id]?.[s.sku] !== false;
				if (!include) continue;
				aggregated[s.sku] = (aggregated[s.sku] || 0) + (s.qty * p.qty);
			}
		}
		const auto: SupplyRow[] = [];
		Object.entries(aggregated).forEach(([sku, qty]) => {
			const displayName = SKU_DISPLAY_NAME[sku] || sku.replace(/_/g, ' ');
			const invItem = inventoryItems.find(i => i.name.toLowerCase() === displayName.toLowerCase());
			if (invItem) auto.push({ item_id: invItem.id, name: invItem.name, quantity: qty, isAuto: true });
		});
		setSupplies(prev => {
			const manual = prev.filter(s => !s.isAuto);
			return [...manual, ...auto];
		});
	}, [procedures, procSupplyOverrides, inventoryItems]);

	// Procedure actions
	const addProcedure = (key: string, customName?: string, customPrice?: number) => {
		const def = PROCEDURE_DEFS.find(d => d.key === key);
		const id = `${key}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
		if (def) {
			setProcedures(prev => ([...prev, { id, key: def.key, name: def.name, qty: 1, unitPrice: def.defaultPrice, duration: def.defaultDurationMin }]));
		} else {
			setProcedures(prev => ([...prev, { id, key: 'custom', name: customName || 'Custom item', qty: 1, unitPrice: customPrice || 0, duration: 15 }]));
		}
		setShowProcedurePicker(false);
		setProcedureQuery("");
	};
	const duplicateProcedure = (id: string) => {
		const p = procedures.find(x => x.id === id);
		if (!p) return;
		const clone: ProcedureLineForm = { ...p, id: `${p.key}-${Date.now()}-${Math.random().toString(36).slice(2,8)}` };
		setProcedures(prev => [...prev, clone]);
	};
	const deleteProcedure = (id: string) => setProcedures(prev => prev.filter(p => p.id !== id));
	const updateProcQty = (id: string, delta: number) => setProcedures(prev => prev.map(p => p.id === id ? { ...p, qty: Math.max(1, p.qty + delta) } : p));
	const updateProcUnitPrice = async (id: string, newPrice: number) => {
		setProcedures(prev => prev.map(p => p.id === id ? { ...p, unitPrice: Math.max(0, isNaN(newPrice) ? 0 : newPrice) } : p));
		try {
			// Audit: price change per line
			if (currentUserId) {
				const before = procedures.find(p => p.id === id)?.unitPrice;
				await sb.from('audit_logs').insert({
					user_id: currentUserId,
					action: 'completion_price_change',
					resource_type: 'appointment',
					resource_id: appointment.id,
					details: { procedure_id: id, before, after: newPrice }
				});
			}
		} catch {
			// ignore procedure price update activity errors
		}
	};

	// Supplies actions
	const addManualSupply = (itemId: string, quantity: number) => {
		const it = inventoryItems.find(i => i.id === itemId);
		if (!it) return;
		setSupplies(prev => [...prev, { item_id: itemId, name: it.name, quantity: Math.max(1, quantity) }]);
	};
	const updateSupplyQty = (idx: number, qty: number) => setSupplies(prev => prev.map((s, i) => i === idx ? { ...s, quantity: Math.max(1, qty || 1) } : s));
	const removeSupply = (idx: number) => setSupplies(prev => prev.filter((_, i) => i !== idx));

	// Rx actions
	const addRx = () => setRxItems(prev => [...prev, { id: `${Date.now()}`, name: '', dose: '', frequency: '', duration: '', notes: '' }]);
	const updateRx = (id: string, patch: Partial<RxItem>) => setRxItems(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
	const removeRx = (id: string) => setRxItems(prev => prev.filter(r => r.id !== id));

	// Keyboard shortcuts
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault(); setShowProcedurePicker(true);
			}
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
				e.preventDefault(); if (canSave) void handleSave(true);
			}
			if (e.key === 'Escape') onOpenChange(false);
		}
		if (open) window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, canSave]);

	// Predictive default based on first procedure
	useEffect(() => {
		const first = procedures[0]?.key;
		if (!first) return;
		if (first.includes('extraction')) setPredictiveChoice('Extraction follow-up (7–10 days)');
		else if (first.includes('cleaning')) setPredictiveChoice('Cleaning (6 months)');
		else if (first.includes('ortho')) setPredictiveChoice('Ortho adjustment (3–6 weeks)');
		else if (first.includes('root_canal')) setPredictiveChoice('Root canal check (2–4 weeks)');
		else setPredictiveChoice('General exam (12 months)');
	}, [procedures.length]);

	// Negative stock check helper
	const wouldGoNegative = useMemo(() => {
		const map: Record<string, number> = {};
		for (const s of supplies) {
			map[s.item_id] = (map[s.item_id] || 0) + s.quantity;
		}
		const offenders: Array<{ name: string; need: number; have: number; threshold: number }> = [];
		for (const [itemId, need] of Object.entries(map)) {
			const it = inventoryItems.find(i => i.id === itemId);
			if (!it) continue;
			if ((it.quantity || 0) - need < 0) offenders.push({ name: it.name, need, have: it.quantity, threshold: it.min_threshold });
		}
		return offenders;
	}, [supplies, inventoryItems]);

	// Save logic
	const handleSave = async (withInvoice: boolean) => {
		if (!canSave) return;
		setLoading(true);
		try {
			// 1) Write treatments
			const treatmentsPayload = procedures.map(p => ({
				appointment_id: appointment.id,
				code: `PROC-${p.key.toUpperCase()}`,
				description: p.name,
				quantity: p.qty,
				tooth_ref: p.tooth || null,
				tariff: p.unitPrice,
				mutuality_share: 0,
				patient_share: p.unitPrice,
				vat_amount: 0
			}));
			if (treatmentsPayload.length > 0) {
				await sb.from('appointment_treatments').insert(treatmentsPayload);
				for (const t of treatmentsPayload) {
					await emitAnalyticsEvent('TREATMENTS_PERFORMED', dentistId, { appointmentId: appointment.id, code: t.code, quantity: t.quantity });
				}
			}

			// 2) Notes
			if (notes.trim()) {
				await sb.from('appointment_outcomes').insert({ appointment_id: appointment.id, outcome: 'successful', notes, created_by: dentistId });
			}

			// 3) Prescriptions
			for (const r of rxItems) {
				if (!r.name.trim()) continue;
				await sb.from('prescriptions').insert({
					patient_id: appointment.patient_id,
					dentist_id: appointment.dentist_id,
					medication_name: r.name,
					dosage: r.dose,
					frequency: r.frequency,
					duration_days: r.duration ? parseInt(r.duration) : null,
					instructions: r.notes || null,
					status: 'active',
					appointment_id: appointment.id,
					prescribed_date: new Date().toISOString()
				});
			}

			// 4) Invoice
			let invoiceId: string | null = null;
			let atomicSuccess = false;
			if (withInvoice) {
				const totalCents = Math.round(finalTotal * 100);
				if (autoDeduct) {
					// Build arrays for RPC
					const items = procedures.map(p => ({
						code: `PROC-${p.key.toUpperCase()}`,
						description: p.name,
						quantity: p.qty,
						tariff_cents: Math.round(p.unitPrice * 100),
						mutuality_cents: 0,
						patient_cents: Math.round(p.unitPrice * 100),
						vat_cents: 0
					}));
					const deductions = supplies.map(s => ({ item_id: s.item_id, quantity: s.quantity }));
					const { data: prof } = await sb.from('profiles').select('id').eq('user_id', (await sb.auth.getUser()).data.user?.id).single();
					const { data: rpcRes, error: rpcErr } = await sb.rpc('complete_visit_atomic', {
						p_appointment_id: appointment.id,
						p_dentist_id: appointment.dentist_id,
						p_patient_id: appointment.patient_id,
						p_total_cents: totalCents,
						p_items: items as any,
						p_deductions: deductions as any,
						p_created_by: prof?.id
					});
					if (rpcErr) {
						const message = (rpcErr as any)?.message || '';
						const code = (rpcErr as any)?.code;
						const missingFunction = typeof message === 'string' && message.toLowerCase().includes('schema cache');
						const notFound = code === 'PGRST202' || code === '404';
						if (missingFunction || notFound) {
							// Fallback: create invoice and items non-atomically; inventory deduction handled later
							const invoice = await withSchemaReloadRetry(() => sb.from('invoices').insert({
								appointment_id: appointment.id,
								patient_id: appointment.patient_id,
								dentist_id: appointment.dentist_id,
								total_amount_cents: totalCents,
								patient_amount_cents: totalCents,
								mutuality_amount_cents: 0,
								vat_amount_cents: 0,
								status: 'draft',
								claim_status: 'to_be_submitted'
							}).select('*').single().then((res: any) => {
								if (res.error) throw res.error;
								return res.data;
							}).catch((err: any) => {
								console.error('Error creating invoice:', err);
								throw err;
							}), sb) as { id: string };
							invoiceId = invoice.id;
							await sb.from('invoice_items').insert(procedures.map(p => ({
								invoice_id: invoice.id,
								code: `PROC-${p.key.toUpperCase()}`,
								description: p.name,
								quantity: p.qty,
								tariff_cents: Math.round(p.unitPrice * 100),
								mutuality_cents: 0,
								patient_cents: Math.round(p.unitPrice * 100),
								vat_cents: 0
							})));
							atomicSuccess = false;
						} else {
							throw rpcErr;
						}
					} else {
						invoiceId = rpcRes as any;
						atomicSuccess = true;
					}
				} else {
					const invoice = await withSchemaReloadRetry(() => sb.from('invoices').insert({
						appointment_id: appointment.id,
						patient_id: appointment.patient_id,
						dentist_id: appointment.dentist_id,
						total_amount_cents: totalCents,
						patient_amount_cents: totalCents,
						mutuality_amount_cents: 0,
						vat_amount_cents: 0,
						status: 'draft',
						claim_status: 'to_be_submitted'
					}).select('*').single().then((res: any) => {
						if (res.error) throw res.error;
						return res.data;
					}).catch((err: any) => {
						console.error('Error creating invoice:', err);
						throw err;
					}), sb) as { id: string };
					invoiceId = invoice.id;
					await sb.from('invoice_items').insert(procedures.map(p => ({
						invoice_id: invoice.id,
						code: `PROC-${p.key.toUpperCase()}`,
						description: p.name,
						quantity: p.qty,
						tariff_cents: Math.round(p.unitPrice * 100),
						mutuality_cents: 0,
						patient_cents: Math.round(p.unitPrice * 100),
						vat_cents: 0
					})));
				}
			}
			
			// 5) Inventory deduction (+ warnings)
			if (autoDeduct && supplies.length > 0 && (!withInvoice || !atomicSuccess)) {
				// warn low-stock non-blocking
				const lowStock = supplies.filter(s => {
					const it = inventoryItems.find(i => i.id === s.item_id);
					if (!it) return false;
					return (it.quantity - s.quantity) < it.min_threshold;
				});
				if (lowStock.length > 0) {
					toast({ title: 'Low stock', description: `Low stock: ${lowStock[0].name} will fall below ${inventoryItems.find(i => i.id === lowStock[0].item_id)?.min_threshold}.`, variant: 'default' });
				}
				// insufficient stock modal alternative: if negative, show confirm
				if (wouldGoNegative.length > 0) {
					const proceed = window.confirm(`Stock insufficient for: ${wouldGoNegative.map(w => `${w.name} (need ${w.need}, have ${w.have})`).join(', ')}. Continue anyway?`);
					if (!proceed) throw new Error('Edit quantities');
					if (currentUserId) {
						await sb.from('audit_logs').insert({ user_id: currentUserId, action: 'inventory_negative_override', resource_type: 'appointment', resource_id: appointment.id, details: { offenders: wouldGoNegative } });
					}
				}
				// apply deductions (only if not using atomic path)
				const { data: prof } = await sb.from('profiles').select('id').eq('user_id', (await sb.auth.getUser()).data.user?.id).single();
				for (const s of supplies) {
					try {
						const { data: it } = await sb.from('inventory_items').select('quantity, min_threshold, name').eq('id', s.item_id).single();
						const beforeQty = it?.quantity || 0;
						const newQty = Math.max(0, beforeQty - Math.abs(s.quantity));
						await sb.from('inventory_adjustments').insert({ item_id: s.item_id, dentist_id: dentistId, appointment_id: appointment.id, change: -Math.abs(s.quantity), adjustment_type: 'usage', reason: `Appointment ${appointment.id}`, notes: JSON.stringify({ before: beforeQty, after: newQty }), created_by: prof?.id });
						await sb.from('inventory_items').update({ quantity: newQty }).eq('id', s.item_id);
						if (it && newQty < it.min_threshold) {
							const { data: dent } = await sb.from('dentists').select('profile_id').eq('id', dentistId).single();
							if (dent) {
								const { data: dprof } = await sb.from('profiles').select('user_id').eq('id', dent.profile_id).single();
								if (dprof?.user_id) {
									await sb.from('notifications').insert({ user_id: dprof.user_id, dentist_id: dentistId, type: 'inventory', title: 'Low Stock Alert', message: `${it.name} is below threshold (${newQty} remaining)`, priority: 'high', action_label: 'Open Inventory', action_url: `/dashboard#inventory?item=${s.item_id}`, metadata: { item_id: s.item_id } });
								}
							}
						}
					} catch {
						// suppress inventory update notification errors
					}
				}
			}

			// 6) Payment link (optional)
			if (withInvoice && createInvoiceAndLink && invoiceId) {
				try {
					const amountCents = Math.round(finalTotal * 100);
					const { data: payment, error: payErr } = await supabase.functions.invoke('create-payment-request', { body: { patient_id: appointment.patient_id, dentist_id: appointment.dentist_id, amount: amountCents, description: `Appointment ${appointment.id} patient share`, patient_email: (await sb.from('profiles').select('email').eq('id', appointment.patient_id).single()).data?.email } });
					if (!payErr && payment?.payment_url) {
						if (payment?.payment_request_id) {
							await sb.from('invoices').update({ payment_request_id: payment.payment_request_id }).eq('id', invoiceId);
						}
						window.open(payment.payment_url, '_blank');
					}
				} catch (e: any) {
					toast({ title: 'Invoice saved; payment link not generated.', description: 'Retry or copy draft invoice.', variant: 'destructive' });
				}
			}

			// 7) Predictive recall
			if (predictiveChoice) {
				try {
					const mapped = mapDentistPortalSelectionToKey(predictiveChoice);
					if (mapped) {
						await createRecall({ appointmentId: appointment.id, patientId: appointment.patient_id, dentistId, treatmentKey: mapped.key as any, treatmentLabel: mapped.label, baseDateISO: appointment.appointment_date });
					}
				} catch (error) {
					// Ignore recall creation errors - non-critical
				}
			}

			// 8) Final total override audit
			if (currentUserId && finalTotalOverride !== undefined) {
				await sb.from('audit_logs').insert({ user_id: currentUserId, action: 'completion_final_total_override', resource_type: 'appointment', resource_id: appointment.id, details: { final_total: finalTotalOverride, subtotal, adjustmentType, adjustmentValue } });
			}

			// 9) Mark appointment status
			await sb.from('appointments').update({ status: withInvoice ? 'completed' : 'confirmed', treatment_completed_at: withInvoice ? new Date().toISOString() : null }).eq('id', appointment.id);
			await emitAnalyticsEvent('APPOINTMENT_COMPLETED', dentistId, { appointmentId: appointment.id, totals: { subtotal, finalTotal }, outcome: 'successful' });

			toast({ title: withInvoice ? 'Saved & invoiced' : 'Saved as draft' });
			onCompleted();
			onOpenChange(false);
		} catch (e: any) {
			if (e?.message === 'Edit quantities') {
				toast({ title: 'Stock insufficient', description: 'Please adjust quantities.', variant: 'destructive' });
			} else {
				toast({ title: 'Error', description: e?.message || 'Failed to save', variant: 'destructive' });
			}
		} finally {
			setLoading(false);
		}
	};

	const HeaderBar = (
		<div className="sticky top-0 z-sticky bg-background/95 backdrop-blur border-b">
			<div className="max-w-full sm:max-w-2xl lg:max-w-5xl mx-auto px-3 py-2 flex items-center justify-between gap-3">
				<Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} aria-label="Close"><X className="h-4 w-4" /></Button>
				<div className="flex items-center gap-3 min-w-0">
					<div className="truncate font-semibold">Complete Visit — {patientName || 'Patient'}</div>
				</div>
				<div className="btn-group">
					<Button onClick={() => handleSave(true)} disabled={!canSave}>
						Save & Invoice
					</Button>
				</div>
			</div>
			<div className="max-w-full sm:max-w-2xl lg:max-w-5xl mx-auto px-3 pb-2 text-xs text-muted-foreground flex items-center gap-2">
				<Calendar className="h-3 w-3" /> {new Date(appointment.appointment_date).toLocaleString()} • Dr. {dentistName || '—'} • In room
			</div>
		</div>
	);

	const Body = (
		<div className="max-w-full sm:max-w-2xl lg:max-w-5xl mx-auto px-3 py-3 space-y-6">
			{/* Section A — Procedures */}
			<div>
				<div className="flex items-center justify-between">
					<div className="font-semibold">Procedures</div>
					<div className="text-xs text-muted-foreground">Price auto-filled — you can edit. All changes are logged.</div>
				</div>
				<div className="mt-2">
					<Button className="w-full sm:w-auto" onClick={() => setShowProcedurePicker(true)}><Plus className="h-4 w-4 mr-2" /> Add procedure</Button>
				</div>
				{procedures.length === 0 ? (
					<p className="text-sm text-muted-foreground mt-3">No procedures yet. Add at least one to finish.</p>
				) : (
					<div className="mt-3 space-y-2">
						{procedures.map(p => (
							<div key={p.id} className="grid grid-cols-12 gap-2 items-center border rounded p-2">
								<div className="col-span-4 min-w-0">
									<div className="font-medium truncate">{p.name}</div>
									<div className="text-[10px] text-muted-foreground">FDI tooth/quadrant</div>
								</div>
								<div className="col-span-2">
									<Input ref={el => { toothInputRefs.current[p.id] = el }} placeholder="e.g., 26" value={p.tooth || ''} onChange={e => setProcedures(prev => prev.map(x => x.id === p.id ? { ...x, tooth: e.target.value } : x))} />
								</div>
								<div className="col-span-2 flex items-center gap-1">
									<Button variant="outline" size="sm" onClick={() => updateProcQty(p.id, -1)}>-</Button>
									<div className="w-10 text-center text-sm">{p.qty}</div>
									<Button variant="outline" size="sm" onClick={() => updateProcQty(p.id, +1)}>+</Button>
								</div>
								<div className="col-span-2">
									<Input type="number" inputMode="decimal" value={p.unitPrice} onChange={e => updateProcUnitPrice(p.id, parseFloat(e.target.value || '0'))} />
									<div className="text-[10px] text-muted-foreground">Unit price</div>
								</div>
								<div className="col-span-1 text-right font-medium">€{(p.qty * p.unitPrice).toFixed(2)}</div>
								<div className="col-span-1 flex justify-end">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button size="icon" variant="ghost"><EllipsisVertical className="h-4 w-4" /></Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem onClick={() => duplicateProcedure(p.id)}>Duplicate</DropdownMenuItem>
											<DropdownMenuItem onClick={() => deleteProcedure(p.id)}>Delete</DropdownMenuItem>
											<DropdownMenuItem onClick={() => {
												// Toggle supply mapping for this procedure (simple cycling)
												const def = PROCEDURE_DEFS.find(d => d.key === p.key);
												if (!def) return;
												const prev = procSupplyOverrides[p.id] || {};
												const next: Record<string, boolean> = { ...prev };
												for (const s of def.defaultSupplies) {
													next[s.sku] = next[s.sku] === false ? true : false; // simple flip for quick exclude/include
												}
												setProcSupplyOverrides(o => ({ ...o, [p.id]: next }));
											}}>Supply mapping</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<Separator />

			{/* Section B — Supplies */}
			<div>
				<div className="flex items-center justify-between">
					<div className="font-semibold">Supplies</div>
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<span>Caberu estimates the tools used. Edit if different.</span>
						<div className="flex items-center gap-2"><span>Auto-deduct on save</span><Switch checked={autoDeduct} onCheckedChange={setAutoDeduct} /></div>
					</div>
				</div>
				<div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
					<div className="relative">
						<Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
						<Select onValueChange={(v: any) => addManualSupply(v, 1)}>
							<SelectTrigger className="pl-7"><SelectValue placeholder="Add supply" /></SelectTrigger>
							<SelectContent>
								{inventoryItems.map(i => (<SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<div className="mt-3 space-y-2">
					{supplies.length === 0 ? (
						<p className="text-sm text-muted-foreground">No supplies yet.</p>
					) : supplies.map((s, idx) => {
						const inv = inventoryItems.find(i => i.id === s.item_id);
						const low = inv ? inv.quantity < inv.min_threshold : false;
						return (
							<div key={`${s.item_id}-${idx}`} className="grid grid-cols-12 gap-2 items-center border rounded p-2 text-sm">
								<div className="col-span-6 truncate">{s.name}</div>
								<div className="col-span-2 flex items-center gap-1">
									<Input type="number" inputMode="numeric" value={s.quantity} onChange={e => updateSupplyQty(idx, parseInt(e.target.value || '1'))} />
								</div>
								<div className="col-span-2 text-xs text-muted-foreground">stock: {inv?.quantity ?? '-'}</div>
								<div className="col-span-1">{low ? <Badge variant="secondary" className="bg-amber-100 text-amber-700">Low</Badge> : null}</div>
								<div className="col-span-1 flex justify-end"><Button size="icon" variant="ghost" onClick={() => removeSupply(idx)}><X className="h-4 w-4" /></Button></div>
							</div>
						);
					})}
				</div>
			</div>

			<Separator />

			{/* Section C — Notes */}
			<div>
				<div className="font-semibold">Notes</div>
				<div className="mt-2 flex flex-wrap gap-2 text-xs">
					<Button size="sm" variant="outline" onClick={() => setNotes(n => (n ? n + '\n' : '') + 'No complications')}>No complications</Button>
					<Button size="sm" variant="outline" onClick={() => setNotes(n => (n ? n + '\n' : '') + 'Mild sensitivity expected')}>Mild sensitivity expected</Button>
					<Button size="sm" variant="outline" onClick={() => setNotes(n => (n ? n + '\n' : '') + 'Review in 2 weeks')}>Review in 2 weeks</Button>
				</div>
				<div className="mt-2">
					<Textarea placeholder="Clinical notes" value={notes} onChange={e => setNotes(e.target.value)} />
				</div>
			</div>

			<Separator />

			{/* Section D — Prescription */}
			<div>
				<div className="flex items-center justify-between">
					<div className="font-semibold">Prescription</div>
					<Button size="sm" variant="outline" onClick={addRx}><Plus className="h-4 w-4 mr-1" /> Add medication</Button>
				</div>
				<div className="mt-2 space-y-2">
					{rxItems.length === 0 ? <p className="text-sm text-muted-foreground">No prescriptions.</p> : rxItems.map(r => (
						<div key={r.id} className="grid grid-cols-12 gap-2 items-center">
							<div className="col-span-3"><Input placeholder="Name" value={r.name} onChange={e => updateRx(r.id, { name: e.target.value })} /></div>
							<div className="col-span-2"><Input placeholder="Dose" value={r.dose} onChange={e => updateRx(r.id, { dose: e.target.value })} /></div>
							<div className="col-span-2"><Input placeholder="Frequency" value={r.frequency} onChange={e => updateRx(r.id, { frequency: e.target.value })} /></div>
							<div className="col-span-2"><Input type="number" placeholder="Duration (days)" value={r.duration} onChange={e => updateRx(r.id, { duration: e.target.value })} /></div>
							<div className="col-span-2"><Input placeholder="Notes" value={r.notes} onChange={e => updateRx(r.id, { notes: e.target.value })} /></div>
							<div className="col-span-1 flex justify-end"><Button size="icon" variant="ghost" onClick={() => removeRx(r.id)}><X className="h-4 w-4" /></Button></div>
						</div>
					))}
				</div>
			</div>

			<Separator />

			{/* Section F — Next Visit */}
			<div>
				<div className="flex items-center justify-between">
					<div className="font-semibold">Next Visit / Predictive Scheduling</div>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 items-center">
					<Select value={predictiveChoice} onValueChange={setPredictiveChoice}>
						<SelectTrigger><SelectValue placeholder="Suggested next visit" /></SelectTrigger>
						<SelectContent>
							<SelectItem value="Extraction follow-up (7–10 days)">Extraction review (7–10d)</SelectItem>
							<SelectItem value="Cleaning (6 months)">Cleaning (6m)</SelectItem>
							<SelectItem value="Ortho adjustment (3–6 weeks)">Ortho (3–6w)</SelectItem>
							<SelectItem value="Root canal check (2–4 weeks)">Root canal (2–4w)</SelectItem>
							<SelectItem value="General exam (12 months)">General exam (12m)</SelectItem>
							<SelectItem value="Custom">Custom</SelectItem>
						</SelectContent>
					</Select>
					<div className="flex items-center gap-2 text-sm"><Switch checked={offerSlots} onCheckedChange={setOfferSlots} /> <span>Offer 3 time slots to the patient</span></div>
					<PatientPreferencesDialog>
						<a className="text-xs underline text-muted-foreground cursor-pointer hover:text-primary">
							Edit patient preferences (days, hours)
						</a>
					</PatientPreferencesDialog>
				</div>
			</div>
		</div>
	);

	const Footer = (
		<div className="sticky bottom-0 z-sticky bg-background/95 backdrop-blur border-t">
			<div className="max-w-full sm:max-w-2xl lg:max-w-5xl mx-auto px-3 py-3 space-y-3">
				{/* Billing summary */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					<div className="text-sm space-y-1">
						<div>Subtotal: €{subtotal.toFixed(2)}</div>
						<div className="flex items-center gap-2">
							<Select value={adjustmentType} onValueChange={(v: any) => setAdjustmentType(v)}>
								<SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Adjustments" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No adjustments</SelectItem>
									<SelectItem value="discount_percent">Discount %</SelectItem>
									<SelectItem value="discount_amount">Discount €</SelectItem>
									<SelectItem value="surcharge_amount">Surcharge €</SelectItem>
								</SelectContent>
							</Select>
							<Input type="number" inputMode="decimal" className="w-28" value={adjustmentValue} onChange={e => setAdjustmentValue(parseFloat(e.target.value || '0'))} />
						</div>
					</div>
					<div className="text-right space-y-1">
						<div className="text-xs text-muted-foreground">Editing totals is audited. Patient sees the final amount only.</div>
						<div className="flex items-center justify-end gap-2">
							<div className="text-sm">Final Total</div>
							<Input type="number" inputMode="decimal" className="w-32" value={finalTotalOverride ?? finalTotal} onChange={e => setFinalTotalOverride(parseFloat(e.target.value || '0'))} />
						</div>
						<div className="flex items-center justify-end gap-2 text-sm"><Switch checked={createInvoiceAndLink} onCheckedChange={setCreateInvoiceAndLink} /> <span>Create invoice & Pay link</span></div>
					</div>
					<div className="btn-group">
						<Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
						<Button variant="outline" onClick={() => handleSave(false)} disabled={!canSave}>Save as Draft</Button>
						<Button onClick={() => handleSave(true)} disabled={!canSave}>Save & Invoice</Button>
					</div>
				</div>
			</div>
		</div>
	);

	return (
		<>
			{/* Mobile: Drawer full-screen */}
			{isMobile ? (
				<Drawer open={open} onOpenChange={onOpenChange}>
					<DrawerContent className="max-h-[100vh] p-0">
						{HeaderBar}
						<div className="overflow-y-auto max-h-[calc(100vh-120px)]">{Body}</div>
						{Footer}
					</DrawerContent>
				</Drawer>
			) : (
				<Dialog open={open} onOpenChange={onOpenChange}>
					<DialogContent className="p-0 w-full max-w-full sm:max-w-2xl lg:max-w-5xl">
						{HeaderBar}
						<div className="overflow-y-auto max-h-[70vh]">{Body}</div>
						{Footer}
					</DialogContent>
				</Dialog>
			)}

			{/* Procedure Picker */}
			{showProcedurePicker && (
				<div className="fixed inset-0 z-50 bg-black/30 flex items-start sm:items-center justify-center p-3" onClick={() => setShowProcedurePicker(false)}>
					<div className="bg-background rounded-md shadow-xl w-full max-w-[680px]" onClick={e => e.stopPropagation()}>
						<div className="p-3 border-b font-semibold">Add procedure</div>
						<div className="p-3">
							<Command>
								<CommandInput placeholder="Search procedures" value={procedureQuery} onValueChange={setProcedureQuery} />
								<CommandList>
									<CommandEmpty>No results</CommandEmpty>
									{['Preventive','Restorative','Endo','Surgery','Radiology','Perio','Prostho','Ortho'].map(cat => (
										<CommandGroup key={cat} heading={cat}>
											{PROCEDURE_DEFS.filter(p => p.category === (cat as any) && (p.name.toLowerCase().includes(procedureQuery.toLowerCase()) || p.key.includes(procedureQuery.toLowerCase()))).map(p => (
												<CommandItem key={p.key} onSelect={() => addProcedure(p.key)}>
													<span className="flex-1">{p.name}</span>
													<span className="text-xs text-muted-foreground">€{p.defaultPrice}</span>
												</CommandItem>
											))}
										</CommandGroup>
									))}
								</CommandList>
							</Command>
							<div className="mt-3 grid grid-cols-12 gap-2 items-center">
								<div className="col-span-6"><Input placeholder="Custom item name" id="customName" /></div>
								<div className="col-span-4"><Input type="number" inputMode="decimal" placeholder="Price (€)" id="customPrice" /></div>
								<div className="col-span-2 text-right">
									<Button onClick={() => {
										const name = (document.getElementById('customName') as HTMLInputElement)?.value || 'Custom item';
										const price = parseFloat((document.getElementById('customPrice') as HTMLInputElement)?.value || '0');
										addProcedure('custom', name, price);
									}}>Add</Button>
								</div>
							</div>
						</div>
						<div className="p-3 border-t flex justify-end">
							<Button variant="ghost" onClick={() => setShowProcedurePicker(false)}>Close</Button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
