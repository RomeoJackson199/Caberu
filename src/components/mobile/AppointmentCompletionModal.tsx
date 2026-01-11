import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, CheckCircle, CreditCard } from "lucide-react";
import { QuickPhotoUpload } from "@/components/QuickPhotoUpload";
import { emitAnalyticsEvent } from "@/lib/analyticsEvents";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { withSchemaReloadRetry } from "@/integrations/supabase/retry";
import { SKU_DISPLAY_NAME, PROCEDURE_DEFS, type ProcedureDef } from "@/lib/constants";
import { logger } from '@/lib/logger';

interface AppointmentCompletionModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	appointment: {
		id: string;
		patient_id: string;
		dentist_id: string;
		appointment_date: string;
		status: string;
	};
	dentistId: string;
	onCompleted: () => void;
}


interface TreatmentItemForm {
	code: string;
	description: string;
	quantity: number;
	tooth_ref?: string;
	tariff: number;
	mutuality_share: number;
	patient_share: number;
	vat_amount: number;
}

export function AppointmentCompletionModal({ open, onOpenChange, appointment, dentistId, onCompleted }: AppointmentCompletionModalProps) {
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);
	const [locking, setLocking] = useState(false);
	const sb: any = supabase;
	const steps = [
		{ id: 'treatments', label: 'Treatments' },
		{ id: 'notes', label: 'Notes' },
		{ id: 'plan', label: 'Plan/Rx' },
		{ id: 'payment', label: 'Payment' },
		{ id: 'followup', label: 'Follow-up' },
		{ id: 'files', label: 'Files' },
		{ id: 'review', label: 'Review' },
	] as const;
	const [step, setStep] = useState<(typeof steps)[number]['id']>('treatments');
	const currentStepIndex = steps.findIndex(s => s.id === step);
	const goNext = () => setStep(steps[Math.min(steps.length - 1, currentStepIndex + 1)].id);
	const goPrev = () => setStep(steps[Math.max(0, currentStepIndex - 1)].id);

	// A. Performed Treatments
	const [treatmentQuery, setTreatmentQuery] = useState("");
	const [availableTariffs, setAvailableTariffs] = useState<Array<{ code: string; description: string; base_tariff: number; vat_rate: number; mutuality_share_pct: number; patient_share_pct: number }>>([]);
	const [treatments, setTreatments] = useState<TreatmentItemForm[]>([]);

	// NEW: Select Procedures list and final price override
	const [selectedProcedures, setSelectedProcedures] = useState<Array<{ id: string; key: string; name: string; price: number; duration: number }>>([]);
	const [finalTotalOverride, setFinalTotalOverride] = useState<number | undefined>(undefined);

	// B. Outcome & Notes
	const [outcome, setOutcome] = useState<'successful' | 'partial' | 'cancelled' | 'complication'>('successful');
	const [notes, setNotes] = useState("");
	const [painScore, setPainScore] = useState<number | undefined>(undefined);
	const [anesthesiaUsed, setAnesthesiaUsed] = useState(false);
	const [anesthesiaDose, setAnesthesiaDose] = useState("");

	// C. Add to Treatment Plan
	const [createPlan, setCreatePlan] = useState(false);
	const [planTitle, setPlanTitle] = useState("");
	const [planStage, setPlanStage] = useState("");
	const [planEstimatedCost, setPlanEstimatedCost] = useState<number | undefined>(undefined);
	const [planEstimatedDuration, setPlanEstimatedDuration] = useState("");
	const [planDiscussed, setPlanDiscussed] = useState(false);

	// D. Prescriptions
	const [rxMedName, setRxMedName] = useState("");
	const [rxDosage, setRxDosage] = useState("");
	const [rxFrequency, setRxFrequency] = useState("");
	const [rxDuration, setRxDuration] = useState("");
	const [rxSubstitution, setRxSubstitution] = useState(false);
	const [rxRepeats, setRxRepeats] = useState(0);
	const [rxRoute, setRxRoute] = useState("");

	// E. Payment & Invoice
	const totals = useMemo(() => {
		const tariff = treatments.reduce((sum, t) => sum + t.tariff * t.quantity, 0);
		const mutuality = treatments.reduce((sum, t) => sum + t.mutuality_share * t.quantity, 0);
		const patient = treatments.reduce((sum, t) => sum + t.patient_share * t.quantity, 0);
		const vat = treatments.reduce((sum, t) => sum + t.vat_amount * t.quantity, 0);
		return { tariff, mutuality, patient, vat };
	}, [treatments]);

	const [startPayment, setStartPayment] = useState(false);

	const sendPaymentLink = async () => {
		try {
			const { data: appt } = await sb.from('appointments').select('patient_id, dentist_id').eq('id', appointment.id).single();
			const patientCents = Math.round((finalTotalOverride !== undefined ? finalTotalOverride : (totals.patient + totals.vat)) * 100);
			const { data: pr, error } = await supabase.functions.invoke('create-payment-request', {
				body: {
					patient_id: appt.patient_id,
					dentist_id: appt.dentist_id,
					amount: patientCents,
					description: `Appointment ${appointment.id} patient share`,
					patient_email: (await sb.from('secure_profiles_view').select('email').eq('id', appt.patient_id).single()).data?.email
				}
			});
			if (error) throw error;
			// Create notification to patient if possible
			const { data: profile } = await sb.from('secure_profiles_view').select('user_id, first_name, last_name').eq('id', appt.patient_id).single();
			if (profile?.user_id && pr?.payment_url) {
				await sb.from('notifications').insert({
					user_id: profile.user_id,
					patient_id: appt.patient_id,
					dentist_id: appt.dentist_id,
					type: 'payment',
					title: 'Payment Request',
					message: `Payment request for €${(patientCents / 100).toFixed(2)} - Appointment ${new Date(appointment.appointment_date).toLocaleDateString()}`,
					priority: 'high',
					action_url: pr.payment_url,
					action_label: 'Pay Now',
					metadata: { payment_url: pr.payment_url, amount: patientCents }
				});
			}
			await emitAnalyticsEvent('INVOICE_CREATED', dentistId, { appointmentId: appointment.id, amount_cents: patientCents, status: 'unpaid' });
			toast({ title: 'Payment link sent', description: 'The patient was notified.' });
		} catch (e: any) {
			toast({ title: 'Error', description: e.message || 'Failed to send link', variant: 'destructive' });
		}
	};

	const markAsPaid = async () => {
		try {
			const { data: appt } = await sb.from('appointments').select('patient_id, dentist_id').eq('id', appointment.id).single();
			const totalCents = Math.round((finalTotalOverride !== undefined ? finalTotalOverride : (totals.tariff + totals.vat)) * 100);
			const patientCents = Math.round((finalTotalOverride !== undefined ? finalTotalOverride : (totals.patient + totals.vat)) * 100);
			const mutualityCents = Math.round(totals.mutuality * 100);
			const vatCents = Math.round(totals.vat * 100);
			// Upsert-like: try get existing invoice
			const { data: existing } = await sb.from('invoices').select('id').eq('appointment_id', appointment.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
			let invoiceId = existing?.id;
			if (!invoiceId) {
				const invoice = await withSchemaReloadRetry(() => sb.from('invoices').insert({
					appointment_id: appointment.id,
					patient_id: appt.patient_id,
					dentist_id: appt.dentist_id,
					total_amount_cents: totalCents,
					patient_amount_cents: patientCents,
					mutuality_amount_cents: mutualityCents,
					vat_amount_cents: vatCents,
					status: 'issued',
					claim_status: 'to_be_submitted'
				}).select('*').single().then((res: { error: Error | null; data: { id: string } | null }) => {
					if (res.error) throw res.error;
					return res.data;
				}).catch((err: Error) => {
					console.error('Error creating invoice:', err);
					throw err;
				}), sb) as { id: string };
				invoiceId = invoice.id;
				await sb.from('invoice_items').insert(
					treatments.map(t => ({
						invoice_id: invoice.id,
						code: t.code,
						description: t.description,
						quantity: t.quantity,
						tariff_cents: Math.round(t.tariff * 100),
						mutuality_cents: Math.round(t.mutuality_share * 100),
						patient_cents: Math.round(t.patient_share * 100),
						vat_cents: Math.round(t.vat_amount * 100)
					}))
				);
			}
			await sb.from('invoices').update({ status: 'paid' }).eq('id', invoiceId as string);
			await sb.from('appointments').update({ status: 'completed', treatment_completed_at: new Date().toISOString() }).eq('id', appointment.id);
			await emitAnalyticsEvent('INVOICE_CREATED', dentistId, { appointmentId: appointment.id, amount_cents: patientCents, status: 'paid' });
			await emitAnalyticsEvent('APPOINTMENT_COMPLETED', dentistId, { appointmentId: appointment.id, totals: { ...totals, total_due_cents: patientCents }, outcome });
			toast({ title: 'Marked as paid' });
			onCompleted();
			onOpenChange(false);
		} catch (e: any) {
			toast({ title: 'Error', description: e.message || 'Failed to mark as paid', variant: 'destructive' });
		}
	};

	// F. Follow-Up & Predictive Scheduling
	const [followUpNeeded, setFollowUpNeeded] = useState(false);
	const [followUpDate, setFollowUpDate] = useState<string | undefined>(undefined);
	const [followUpReason, setFollowUpReason] = useState("");
	const [predictiveChoice, setPredictiveChoice] = useState<string>("");

	// G. Files (we will store references in medical_records with appointment_id)
	const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

	// H. Inventory Deduction
	const [treatmentTypes, setTreatmentTypes] = useState<Array<{ id: string; name: string }>>([]);
	const [selectedTreatmentTypeId, setSelectedTreatmentTypeId] = useState<string | null>(null);
	const [manualSupplies, setManualSupplies] = useState<Array<{ item_id: string; name: string; quantity: number; isAuto?: boolean }>>([]);
	const [inventoryItems, setInventoryItems] = useState<Array<{ id: string; name: string; quantity?: number; min_threshold?: number }>>([]);
	const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		// Load tariffs subset for quick search
		(async () => {
			const { data, error } = await sb
				.from('tariffs')
				.select('code, description, base_tariff, vat_rate, mutuality_share_pct, patient_share_pct')
				.eq('is_active', true)
				.limit(200);
			if (!error && data) setAvailableTariffs(data as any);
		})();
	}, [open]);

	useEffect(() => {
		(async () => {
			const { data: types } = await sb.from('treatment_types').select('id, name').eq('is_active', true).order('name');
			setTreatmentTypes((types || []) as any);
			const { data: inv } = await sb.from('inventory_items').select('id, name, quantity, min_threshold').eq('dentist_id', dentistId).order('name');
			setInventoryItems((inv || []) as any);
			const { data: prof } = await sb.from('profiles').select('id').eq('user_id', (await sb.auth.getUser()).data.user?.id).single();
			if (prof) setCurrentProfileId(prof.id);
		})();
	}, [dentistId]);

	// Insurance profile
	const [insuranceProfile, setInsuranceProfile] = useState<any | null>(null);
	const [insuranceWarning, setInsuranceWarning] = useState<string | null>(null);
	useEffect(() => {
		if (!open) return;
		(async () => {
			const dateIso = appointment.appointment_date;
			// active at service date: valid_from <= date AND (valid_to IS NULL OR valid_to >= date) AND is_active = true
			const { data, error } = await sb
				.from('patient_insurance_profiles')
				.select('*')
				.eq('patient_id', appointment.patient_id)
				.eq('is_active', true);
			if (!error && data) {
				const active = (data as any[]).find(p => new Date(p.valid_from) <= new Date(dateIso) && (!p.valid_to || new Date(p.valid_to) >= new Date(dateIso))) || null;
				setInsuranceProfile(active || null);
				setInsuranceWarning(active ? null : 'No active mutuality profile for service date');
			}
		})();
	}, [open, appointment.patient_id, appointment.appointment_date]);

	const applyInsuranceAdjustments = (base: number, tariff: any) => {
		let mutualityPct = Number(tariff.mutuality_share_pct || 0);
		let patientPct = Number(tariff.patient_share_pct || 100 - mutualityPct);
		if (insuranceProfile?.is_omnio || insuranceProfile?.is_vip) {
			mutualityPct = 100;
			patientPct = 0;
		}
		const mutualityShare = +(base * (mutualityPct / 100)).toFixed(2);
		const patientShare = +(base * (patientPct / 100)).toFixed(2);
		return { mutualityShare, patientShare };
	};

	const addTreatmentFromCode = (code: string) => {
		const tariff = availableTariffs.find(t => t.code === code);
		if (!tariff) return;
		const base = Number(tariff.base_tariff || 0);
		const vatAmount = +(base * (Number(tariff.vat_rate || 0) / 100)).toFixed(2);
		const shares = applyInsuranceAdjustments(base, tariff);
		setTreatments(prev => ([...prev, {
			code: tariff.code,
			description: tariff.description,
			quantity: 1,
			tooth_ref: '',
			tariff: base,
			mutuality_share: shares.mutualityShare,
			patient_share: shares.patientShare,
			vat_amount: vatAmount
		}]))
		// Emit treatment-performed analytics when adding a line
		emitAnalyticsEvent('TREATMENTS_PERFORMED', dentistId, { appointmentId: appointment.id, code: tariff.code, description: tariff.description, quantity: 1 });
	};

	const removeTreatment = (index: number) => {
		setTreatments(prev => prev.filter((_, i) => i !== index));
	};

	// NEW: Procedures add/remove and auto-supplies handling
	const addProcedureByKey = (key: string) => {
		const def = PROCEDURE_DEFS.find(d => d.key === key);
		if (!def) return;
		const id = `${key}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		setSelectedProcedures(prev => ([...prev, { id, key: def.key, name: def.name, price: def.defaultPrice, duration: def.defaultDurationMin }]));
		setTreatments(prev => ([...prev, {
			code: `PROC-${def.key.toUpperCase()}`,
			description: def.name,
			quantity: 1,
			tooth_ref: '',
			tariff: def.defaultPrice,
			mutuality_share: 0,
			patient_share: def.defaultPrice,
			vat_amount: 0
		} as any]));
	};

	const removeProcedureById = (selId: string) => {
		const removed = selectedProcedures.find(p => p.id === selId);
		setSelectedProcedures(prev => prev.filter(p => p.id !== selId));
		if (removed) {
			setTreatments(prev => {
				const idx = prev.findIndex(t => (t as any).code?.startsWith('PROC-') && t.description === removed.name);
				if (idx >= 0) {
					const clone = [...prev];
					clone.splice(idx, 1);
					return clone;
				}
				return prev;
			});
		}
	};

	const updateProcedurePrice = (selId: string, newPrice: number) => {
		const proc = selectedProcedures.find(p => p.id === selId);
		if (!proc) return;
		setSelectedProcedures(prev => prev.map(p => p.id === selId ? { ...p, price: newPrice } : p));
		setTreatments(prev => {
			const idx = prev.findIndex(t => (t as any).code?.startsWith('PROC-') && t.description === proc.name);
			if (idx >= 0) {
				const clone = [...prev];
				clone[idx] = { ...clone[idx], tariff: newPrice, patient_share: newPrice } as any;
				return clone;
			}
			return prev;
		});
	};

	const rebuildAutoSuppliesFromProcedures = () => {
		setManualSupplies(prev => {
			const manualOnly = prev.filter(s => !s.isAuto);
			const aggregated: Record<string, number> = {};
			selectedProcedures.forEach(proc => {
				const def = PROCEDURE_DEFS.find(d => d.key === proc.key);
				if (def) {
					def.defaultSupplies.forEach(s => {
						aggregated[s.sku] = (aggregated[s.sku] || 0) + s.qty;
					});
				}
			});
			const autoSupplies: Array<{ item_id: string; name: string; quantity: number; isAuto: boolean }> = [];
			Object.entries(aggregated).forEach(([sku, qty]) => {
				const displayName = SKU_DISPLAY_NAME[sku] || sku.replace(/_/g, ' ');
				const invItem = inventoryItems.find(i => i.name.toLowerCase() === displayName.toLowerCase());
				if (invItem) {
					autoSupplies.push({ item_id: invItem.id, name: invItem.name, quantity: qty, isAuto: true });
				}
			});
			return manualOnly.concat(autoSupplies);
		});
	};

	useEffect(() => {
		rebuildAutoSuppliesFromProcedures();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedProcedures, inventoryItems]);

	const addManualSupply = (itemId: string, quantity: number) => {
		const item = inventoryItems.find(i => i.id === itemId);
		if (!item) return;
		setManualSupplies(prev => [...prev, { item_id: itemId, name: item.name, quantity: Math.max(1, quantity) }]);
	};

	const removeManualSupply = (idx: number) => {
		setManualSupplies(prev => prev.filter((_, i) => i !== idx));
	};

	const deductInventoryForAppointment = async () => {
		if (!currentProfileId) return;
		// 1) Build deduction list from mapping
		let deductions: Array<{ item_id: string; quantity: number }> = [];
		if (selectedTreatmentTypeId) {
			const { data: mapped } = await sb
				.from('treatment_supply_mappings')
				.select('item_id, quantity')
				.eq('dentist_id', dentistId)
				.eq('treatment_type_id', selectedTreatmentTypeId);
			(mapped || []).forEach((m: any) => {
				deductions.push({ item_id: m.item_id, quantity: m.quantity });
			});
		}
		// 2) Add manual + auto supplies
		deductions = deductions.concat(manualSupplies.map(s => ({ item_id: s.item_id, quantity: s.quantity })));
		if (anesthesiaUsed) {
			// If anesthesia used and there is an item named 'Anesthesia' in inventory, deduct 1 or parse dose units; keep simple as 1
			const anesthesia = inventoryItems.find(i => i.name.toLowerCase().includes('anesthesia'));
			if (anesthesia) deductions.push({ item_id: anesthesia.id, quantity: 1 });
		}
		// 3) Apply deductions
		for (const d of deductions) {
			try {
				// Fetch before qty, then log with before/after and update
				const { data: item } = await sb
					.from('inventory_items')
					.select('quantity, min_threshold, name')
					.eq('id', d.item_id)
					.single();
				const beforeQty = item?.quantity || 0;
				const newQty = Math.max(0, beforeQty - Math.abs(d.quantity));
				await sb.from('inventory_adjustments').insert({
					item_id: d.item_id,
					dentist_id: dentistId,
					appointment_id: appointment.id,
					change: -Math.abs(d.quantity),
					adjustment_type: 'usage',
					reason: `Appointment ${appointment.id}`,
					notes: JSON.stringify({ before: beforeQty, after: newQty }),
					created_by: currentProfileId
				});
				await sb
					.from('inventory_items')
					.update({ quantity: newQty })
					.eq('id', d.item_id);
				// Low stock notify
				if (item && newQty < item.min_threshold) {
					const { data: dent } = await sb
						.from('dentists')
						.select('profile_id')
						.eq('id', dentistId)
						.single();
					if (dent) {
						const { data: prof } = await sb
							.from('profiles')
							.select('user_id')
							.eq('id', dent.profile_id)
							.single();
						if (prof?.user_id) {
							await sb.from('notifications').insert({
								user_id: prof.user_id,
								dentist_id: dentistId,
								type: 'inventory',
								title: 'Low Stock Alert',
								message: `${item.name} is below threshold (${newQty} remaining)`,
								priority: 'high',
								action_label: 'Open Inventory',
								action_url: `/dashboard#inventory?item=${d.item_id}`,
								metadata: { item_id: d.item_id }
							});
						}
					}
				}
			} catch {
				// suppress inventory update notification errors
			}
		}
	};

	const saveAll = async (startStripe: boolean) => {
		if (locking) return;
		setLoading(true);
		try {
			// Prevent double-completion
			setLocking(true);
			const { data: current, error: fetchErr } = await sb.from('appointments').select('status, patient_id, dentist_id').eq('id', appointment.id).single();
			if (fetchErr) throw fetchErr;
			if (current?.status === 'completed') {
				toast({ title: 'Already completed', description: 'This appointment is already marked as completed.', variant: 'destructive' });
				onOpenChange(false);
				setLocking(false);
				return;
			}

			// Outcome
			if (outcome) {
				await sb.from('appointment_outcomes').insert({
					appointment_id: appointment.id,
					outcome,
					notes,
					pain_score: typeof painScore === 'number' ? painScore : null,
					anesthesia_used: anesthesiaUsed,
					anesthesia_dose: anesthesiaUsed ? anesthesiaDose : null,
					created_by: dentistId
				});
			}

			// Treatments
			if (treatments.length > 0) {
				await sb.from('appointment_treatments').insert(
					treatments.map(t => ({
						appointment_id: appointment.id,
						code: t.code,
						description: t.description,
						quantity: t.quantity,
						tooth_ref: t.tooth_ref || null,
						tariff: t.tariff,
						mutuality_share: t.mutuality_share,
						patient_share: t.patient_share,
						vat_amount: t.vat_amount
					}))
				);
			}

			// Treatment plan (optional)
			if (createPlan && planTitle.trim()) {
				await sb.from('treatment_plans').insert({
					patient_id: current.patient_id,
					dentist_id: current.dentist_id,
					title: planTitle,
					description: planStage,
					estimated_cost: planEstimatedCost || null,
					estimated_duration: planEstimatedDuration || null,
					status: 'draft',
					notes: planDiscussed ? 'Discussed with patient' : null,
					start_date: new Date().toISOString()
				});
			}

			// Prescription (optional quick add)
			let createdRx = false;
			if (rxMedName.trim()) {
				await sb.from('prescriptions').insert({
					patient_id: current.patient_id,
					dentist_id: current.dentist_id,
					medication_name: rxMedName,
					dosage: rxDosage || '',
					frequency: rxFrequency || '',
					duration_days: rxDuration ? parseInt(rxDuration) : null,
					instructions: `${rxRoute}${rxRoute && ' '}${rxSubstitution ? '(no substitution)' : ''}`.trim(),
					status: 'active',
					appointment_id: appointment.id,
					prescribed_date: new Date().toISOString()
				});
				createdRx = true;
			}

			// Files -> create medical_records entries linked to appointment
			for (const url of uploadedFiles) {
				await sb.from('medical_records').insert({
					patient_id: current.patient_id,
					dentist_id: current.dentist_id,
					record_type: 'xray',
					title: 'Uploaded file',
					description: 'Appointment file',
					file_url: url,
					record_date: new Date().toISOString(),
					appointment_id: appointment.id
				});
			}

			// Build invoice items and inventory deductions
			let invoiceId: string | null = null;
			let atomicSuccess = false;
			if (treatments.length > 0) {
				const totalCents = Math.round(((finalTotalOverride !== undefined ? finalTotalOverride : (totals.tariff + totals.vat))) * 100);
				const patientCents = Math.round(((finalTotalOverride !== undefined ? finalTotalOverride : (totals.patient + totals.vat))) * 100);
				const items = treatments.map(t => ({
					code: t.code,
					description: t.description,
					quantity: t.quantity,
					tariff_cents: Math.round(t.tariff * 100),
					mutuality_cents: Math.round(t.mutuality_share * 100),
					patient_cents: Math.round(t.patient_share * 100),
					vat_cents: Math.round(t.vat_amount * 100)
				}));

				let deductions: Array<{ item_id: string; quantity: number }> = [];
				if (selectedTreatmentTypeId) {
					const { data: mapped } = await sb
						.from('treatment_supply_mappings')
						.select('item_id, quantity')
						.eq('dentist_id', dentistId)
						.eq('treatment_type_id', selectedTreatmentTypeId);
					(mapped || []).forEach((m: any) => {
						deductions.push({ item_id: m.item_id, quantity: m.quantity });
					});
				}
				// manual + auto supplies
				deductions = deductions.concat(manualSupplies.map(s => ({ item_id: s.item_id, quantity: s.quantity })));
				if (anesthesiaUsed) {
					const anesthesia = inventoryItems.find(i => i.name.toLowerCase().includes('anesthesia'));
					if (anesthesia) deductions.push({ item_id: anesthesia.id, quantity: 1 });
				}

				// Ensure we have created_by profile id
				let createdBy = currentProfileId;
				if (!createdBy) {
					const userRes = await sb.auth.getUser();
					const { data: prof } = await sb.from('profiles').select('id').eq('user_id', userRes.data.user?.id).single();
					createdBy = prof?.id || null;
				}

				// Try atomic completion (invoice + items + inventory + appointment status)
				const { data: rpcRes, error: rpcErr } = await sb.rpc('complete_visit_atomic', {
					p_appointment_id: appointment.id,
					p_dentist_id: current.dentist_id,
					p_patient_id: current.patient_id,
					p_total_cents: patientCents,
					p_items: items as any,
					p_deductions: deductions as any,
					p_created_by: createdBy
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
							patient_id: current.patient_id,
							dentist_id: current.dentist_id,
							total_amount_cents: totalCents,
							patient_amount_cents: patientCents,
							mutuality_amount_cents: Math.round(totals.mutuality * 100),
							vat_amount_cents: Math.round(totals.vat * 100),
							status: 'draft',
							claim_status: 'to_be_submitted'
						}).select('*').single().then((res: { error: Error | null; data: { id: string } | null }) => {
							if (res.error) throw res.error;
							return res.data;
						}).catch((err: Error) => {
							console.error('Error creating invoice:', err);
							throw err;
						}), sb) as { id: string };
						invoiceId = invoice.id;
						await sb.from('invoice_items').insert(items.map(it => ({
							invoice_id: invoice.id,
							code: it.code,
							description: it.description,
							quantity: it.quantity,
							tariff_cents: it.tariff_cents,
							mutuality_cents: it.mutuality_cents,
							patient_cents: it.patient_cents,
							vat_cents: it.vat_cents
						})));
						// Mark appointment as completed in fallback path
						await sb.from('appointments').update({
							status: 'completed',
							treatment_completed_at: new Date().toISOString()
						}).eq('id', appointment.id);
						atomicSuccess = false;
					} else {
						throw rpcErr;
					}
				} else {
					invoiceId = rpcRes as any;
					atomicSuccess = true;
				}

				await emitAnalyticsEvent('INVOICE_CREATED', dentistId, { appointmentId: appointment.id, amount_cents: patientCents, status: 'unpaid' });

				// Optional: create payment request if starting payment
				if ((startStripe || startPayment) && invoiceId) {
					const { data: payment, error: payErr } = await supabase.functions.invoke('create-payment-request', {
						body: {
							patient_id: current.patient_id,
							dentist_id: current.dentist_id,
							amount: patientCents,
							description: `Appointment ${appointment.id} patient share`,
							patient_email: (await supabase.from('profiles').select('email').eq('id', current.patient_id).single()).data?.email
						}
					});
					if (!payErr && payment?.payment_url) {
						if (payment?.payment_request_id) {
							await sb.from('invoices').update({ payment_request_id: payment.payment_request_id }).eq('id', invoiceId);
						}
						window.open(payment.payment_url, '_blank');
					}
				}
			}

			await emitAnalyticsEvent('APPOINTMENT_COMPLETED', dentistId, { appointmentId: appointment.id, totals: { ...totals, total_due_cents: Math.round((finalTotalOverride !== undefined ? finalTotalOverride : (totals.patient + totals.vat)) * 100) }, outcome });
			if (rxMedName.trim()) {
				await emitAnalyticsEvent('PRESCRIPTION_CREATED', dentistId, { appointmentId: appointment.id, medication_name: rxMedName });
			}

			// Predictive Scheduling: create recall if dentist selects a due visit
			try {
				if (predictiveChoice) {
					const { mapDentistPortalSelectionToKey, createRecall } = await import('@/lib/recalls');
					const mapped = mapDentistPortalSelectionToKey(predictiveChoice);
					if (mapped) {
						const { data: apptRow } = await sb.from('appointments').select('patient_id, dentist_id, appointment_date').eq('id', appointment.id).single();
						// Handle implant special-case (2 weeks then 3 months)
						if (predictiveChoice === 'Implant review (2 weeks, then 3 months)') {
							await createRecall({
								appointmentId: appointment.id,
								patientId: apptRow.patient_id,
								dentistId: apptRow.dentist_id,
								treatmentKey: 'implant_review_2w' as any,
								treatmentLabel: 'implant review',
								baseDateISO: apptRow.appointment_date
							});
							await createRecall({
								appointmentId: appointment.id,
								patientId: apptRow.patient_id,
								dentistId: apptRow.dentist_id,
								treatmentKey: 'implant_review_3m' as any,
								treatmentLabel: 'implant review',
								baseDateISO: apptRow.appointment_date
							});
						} else {
							await createRecall({
								appointmentId: appointment.id,
								patientId: apptRow.patient_id,
								dentistId: apptRow.dentist_id,
								treatmentKey: mapped.key,
								treatmentLabel: mapped.label,
								baseDateISO: apptRow.appointment_date
							});
						}
					}
				}
			} catch (e) {
				console.warn('Recall creation failed', e);
			}

			// If atomic failed and we created invoice non-atomically, apply inventory deductions now
			// to keep stock in sync
			if (!atomicSuccess) {
				await deductInventoryForAppointment();
			}

			toast({ title: 'Saved', description: 'Appointment completion saved.' });
			onCompleted();
			onOpenChange(false);
		} catch (e: any) {
			toast({ title: 'Error', description: e.message || 'Failed to complete appointment', variant: 'destructive' });
		} finally {
			setLoading(false);
			setLocking(false);
		}
	};

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent className="h-[90vh] flex flex-col p-0">
				<div className="flex-none p-4 border-b">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="font-semibold">Complete appointment</h3>
							<div className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(appointment.appointment_date).toLocaleString()}</div>
						</div>
						<div className="w-40">
							<Progress value={((currentStepIndex + 1) / steps.length) * 100} />
							<div className="text-[10px] text-muted-foreground mt-1 text-right">Step {currentStepIndex + 1} of {steps.length}</div>
						</div>
					</div>

				</div>

				<div className="flex-1 overflow-y-auto p-4">
					<Tabs value={step} onValueChange={(v) => setStep(v as any)} className="h-full flex flex-col">
						<TabsList className="w-full grid grid-cols-3 sm:grid-cols-7">
							{steps.map(s => (
								<TabsTrigger key={s.id} value={s.id} className="text-xs px-2 py-1">{s.label}</TabsTrigger>
							))}
						</TabsList>

						<TabsContent value="treatments" className="space-y-4">
							{/* A. Select Procedures */}
							<Card className="min-h-[400px] shadow-sm">
								<CardContent className="space-y-3 p-4">
									<h3 className="font-semibold">A. Select Procedures</h3>
									<Select onValueChange={(v: any) => { addProcedureByKey(v); }}>
										<SelectTrigger className="w-full"><SelectValue placeholder="Add procedure" /></SelectTrigger>
										<SelectContent>
											{PROCEDURE_DEFS.map(p => (
												<SelectItem key={p.key} value={p.key}>{p.name} — €{p.defaultPrice}</SelectItem>
											))}
										</SelectContent>
									</Select>
									{selectedProcedures.length > 0 && (
										<div className="space-y-2">
											{selectedProcedures.map(p => (
												<div key={p.id} className="flex items-center justify-between border rounded p-2 text-sm">
													<div>
														<div className="font-medium">{p.name}</div>
														<div className="text-muted-foreground text-xs">Default duration ~ {p.duration} min</div>
													</div>
													<div className="flex items-center gap-2">
														<Input type="number" className="w-28" value={p.price} onChange={e => updateProcedurePrice(p.id, Math.max(0, parseFloat(e.target.value || '0')))} />
														<Button variant="ghost" size="sm" onClick={() => removeProcedureById(p.id)}>Remove</Button>
													</div>
												</div>
											))}
										</div>
									)}
								</CardContent>
							</Card>

							{/* B. Performed Treatments */}
							<Card className="min-h-[400px] shadow-sm">
								<CardContent className="space-y-3 p-4">
									<div className="flex items-center justify-between">
										<h3 className="font-semibold">B. Performed Treatments</h3>
										<Badge variant="secondary">Search NIHDI</Badge>
									</div>
									{insuranceWarning && (
										<div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 p-2 rounded">
											{insuranceWarning}
											<Button variant="link" className="px-1" onClick={async () => {
												try {
													await sb.from('patient_insurance_profiles').insert({
														patient_id: appointment.patient_id,
														valid_from: new Date().toISOString().slice(0, 10),
														is_active: true
													});
													setInsuranceWarning(null);
													toast({ title: 'Mutuality added', description: 'A basic mutuality profile was created. Please update details later.' });
												} catch {
													// ignore mutuality creation errors
												}
											}}>Add Mutuality</Button>
										</div>
									)}
									<Input placeholder="Search by name or NIHDI code" value={treatmentQuery} onChange={(e) => setTreatmentQuery(e.target.value)} />
									<div className="space-y-2">
										{availableTariffs.filter(t => t.code.toLowerCase().includes(treatmentQuery.toLowerCase()) || t.description.toLowerCase().includes(treatmentQuery.toLowerCase())).slice(0, 5).map(t => (
											<div key={t.code} className="flex items-center justify-between text-sm">
												<div>
													<div className="font-medium">{t.code} - {t.description}</div>
													<div className="text-muted-foreground">€{t.base_tariff.toFixed(2)}</div>
												</div>
												<Button size="sm" onClick={() => addTreatmentFromCode(t.code)}>Add</Button>
											</div>
										))}
									</div>
									<div className="space-y-2">
										{treatments.map((t, idx) => (
											<div key={`${t.code}-${idx}`} className="border rounded p-2">
												<div className="flex items-center justify-between">
													<div className="font-medium">{t.code} - {t.description}</div>
													<Button variant="ghost" size="sm" onClick={() => removeTreatment(idx)}>Remove</Button>
												</div>
												<div className="grid grid-cols-4 gap-2 mt-2">
													<Input type="number" value={t.quantity} onChange={e => setTreatments(prev => prev.map((x, i) => i === idx ? { ...x, quantity: Math.max(1, parseInt(e.target.value || '1')) } : x))} />
													<Input placeholder="Tooth/quadrant" value={t.tooth_ref || ''} onChange={e => setTreatments(prev => prev.map((x, i) => i === idx ? { ...x, tooth_ref: e.target.value } : x))} />
													<Input value={`€${t.tariff.toFixed(2)}`} onChange={e => {
														const raw = e.target.value.replace('€', '');
														const val = Math.max(0, parseFloat(raw || '0'));
														setTreatments(prev => prev.map((x, i) => i === idx ? { ...x, tariff: val, patient_share: val } : x));
													}} />
													<Input value={`Patient €${t.patient_share.toFixed(2)}`} onChange={e => {
														const raw = e.target.value.replace('Patient €', '');
														const val = Math.max(0, parseFloat(raw || '0'));
														setTreatments(prev => prev.map((x, i) => i === idx ? { ...x, patient_share: val } : x));
													}} />
												</div>
											</div>
										))}
									</div>
									<div className="flex justify-between items-center text-sm">
										<div className="flex gap-4">
											<div>Tariff: €{totals.tariff.toFixed(2)}</div>
											<div>Mutuality: €{totals.mutuality.toFixed(2)}</div>
											<div>Patient: €{totals.patient.toFixed(2)}</div>
										</div>
										<div className="text-xs text-muted-foreground">Service date: {new Date(appointment.appointment_date).toLocaleDateString()}</div>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="notes" className="space-y-4">
							{/* Outcome & Notes */}
							<Card className="min-h-[400px] shadow-sm">
								<CardContent className="space-y-3 p-4">
									<h3 className="font-semibold">C. Outcome & Notes</h3>
									<Select value={outcome} onValueChange={(v: any) => setOutcome(v)}>
										<SelectTrigger className="w-full"><SelectValue placeholder="Outcome" /></SelectTrigger>
										<SelectContent>
											<SelectItem value="successful">Successful</SelectItem>
											<SelectItem value="partial">Partial</SelectItem>
											<SelectItem value="cancelled">Cancelled</SelectItem>
											<SelectItem value="complication">Complication</SelectItem>
										</SelectContent>
									</Select>
									<Textarea placeholder="Clinical notes" value={notes} onChange={e => setNotes(e.target.value)} />
									<div className="grid grid-cols-3 gap-2">
										<Input type="number" min={0} max={10} placeholder="Pain 0-10" value={painScore ?? ''} onChange={e => setPainScore(e.target.value ? parseInt(e.target.value) : undefined)} />
										<Select value={anesthesiaUsed ? 'yes' : 'no'} onValueChange={v => setAnesthesiaUsed(v === 'yes')}>
											<SelectTrigger><SelectValue placeholder="Anesthesia" /></SelectTrigger>
											<SelectContent>
												<SelectItem value="no">No anesthesia</SelectItem>
												<SelectItem value="yes">Anesthesia used</SelectItem>
											</SelectContent>
										</Select>
										<Input placeholder="Dose" disabled={!anesthesiaUsed} value={anesthesiaDose} onChange={e => setAnesthesiaDose(e.target.value)} />
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="plan" className="space-y-4">
							{/* Add to Treatment Plan */}
							<Card className="min-h-[400px] shadow-sm">
								<CardContent className="space-y-3 p-4">
									<h3 className="font-semibold">D. Add to Treatment Plan</h3>
									<Select value={createPlan ? 'new' : 'none'} onValueChange={v => setCreatePlan(v === 'new')}>
										<SelectTrigger><SelectValue placeholder="Plan action" /></SelectTrigger>
										<SelectContent>
											<SelectItem value="none">No new plan items</SelectItem>
											<SelectItem value="new">Create new plan item</SelectItem>
										</SelectContent>
									</Select>
									{createPlan && (
										<div className="grid grid-cols-2 gap-2">
											<Input placeholder="Title" value={planTitle} onChange={e => setPlanTitle(e.target.value)} />
											<Input placeholder="Stage" value={planStage} onChange={e => setPlanStage(e.target.value)} />
											<Input type="number" placeholder="Est. cost" value={planEstimatedCost ?? ''} onChange={e => setPlanEstimatedCost(e.target.value ? parseFloat(e.target.value) : undefined)} />
											<Input placeholder="Est. duration" value={planEstimatedDuration} onChange={e => setPlanEstimatedDuration(e.target.value)} />
											<Select value={planDiscussed ? 'yes' : 'no'} onValueChange={v => setPlanDiscussed(v === 'yes')}>
												<SelectTrigger><SelectValue placeholder="Discussed" /></SelectTrigger>
												<SelectContent>
													<SelectItem value="no">Not discussed</SelectItem>
													<SelectItem value="yes">Discussed with patient</SelectItem>
												</SelectContent>
											</Select>
										</div>
									)}
								</CardContent>
							</Card>

							{/* Prescriptions */}
							<Card className="min-h-[400px] shadow-sm">
								<CardContent className="space-y-3 p-4">
									<h3 className="font-semibold">E. Prescriptions</h3>
									<Input placeholder="Medicine" value={rxMedName} onChange={e => setRxMedName(e.target.value)} />
									<div className="grid grid-cols-2 gap-2">
										<Input placeholder="Dose" value={rxDosage} onChange={e => setRxDosage(e.target.value)} />
										<Input placeholder="Route" value={rxRoute} onChange={e => setRxRoute(e.target.value)} />
										<Input placeholder="Frequency" value={rxFrequency} onChange={e => setRxFrequency(e.target.value)} />
										<Input placeholder="Duration (days)" type="number" value={rxDuration} onChange={e => setRxDuration(e.target.value)} />
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="payment" className="space-y-4">
							{/* Payment & Invoice */}
							<Card className="min-h-[400px] shadow-sm">
								<CardContent className="space-y-3 p-4">
									<h3 className="font-semibold">F. Payment & Invoice</h3>
									<div className="text-sm space-y-1">
										<div>Total due now (patient): €{(finalTotalOverride !== undefined ? finalTotalOverride : totals.patient).toFixed(2)}</div>
										<div>Mutuality share: €{totals.mutuality.toFixed(2)}</div>
										<div>VAT: €{totals.vat.toFixed(2)}</div>
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
										<Input type="number" placeholder="Final total override (EUR)" value={finalTotalOverride ?? ''} onChange={e => setFinalTotalOverride(e.target.value ? parseFloat(e.target.value) : undefined)} />
										<div className="text-xs text-muted-foreground">Optional: set a final total to override calculated patient due.</div>
									</div>
									<div className="text-xs border rounded p-2">
										<div className="font-medium mb-1">Invoice preview</div>
										{treatments.length === 0 ? (
											<div className="text-muted-foreground">No line items</div>
										) : (
											<div className="space-y-1">
												{treatments.map((t, i) => (
													<div key={i} className="flex justify-between text-xs">
														<span>{t.code} x{t.quantity}</span>
														<span>Tariff €{(t.tariff * t.quantity).toFixed(2)} | Mutuality €{(t.mutuality_share * t.quantity).toFixed(2)} | Patient €{(t.patient_share * t.quantity).toFixed(2)}</span>
													</div>
												))}
											</div>
										)}
									</div>
									<div className="flex gap-2">
										<Button variant="secondary" onClick={sendPaymentLink} disabled={loading}>Send payment link</Button>
										<Button variant="ghost" onClick={markAsPaid} disabled={loading}>Mark as paid</Button>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="followup" className="space-y-4">
							{/* Follow-Up & Predictive Scheduling */}
							<Card className="min-h-[400px] shadow-sm">
								<CardContent className="space-y-3 p-4">
									<h3 className="font-semibold">G. Follow-Up & Predictive Scheduling</h3>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div className="space-y-2">
											<Label>Follow-up</Label>
											<Select value={followUpNeeded ? 'yes' : 'no'} onValueChange={v => setFollowUpNeeded(v === 'yes')}>
												<SelectTrigger><SelectValue placeholder="Follow-up needed" /></SelectTrigger>
												<SelectContent>
													<SelectItem value="no">No</SelectItem>
													<SelectItem value="yes">Yes</SelectItem>
												</SelectContent>
											</Select>
											{followUpNeeded && (
												<div className="grid grid-cols-3 gap-2 items-end">
													<Input type="date" value={followUpDate || ''} onChange={e => setFollowUpDate(e.target.value)} />
													<Button variant="outline" onClick={() => setFollowUpDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))}>1w</Button>
													<Button variant="outline" onClick={() => setFollowUpDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))}>2w</Button>
													<Button variant="outline" onClick={() => setFollowUpDate(new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))}>6w</Button>
													<Input placeholder="Reason" value={followUpReason} onChange={e => setFollowUpReason(e.target.value)} />
												</div>
											)}
											{followUpNeeded && followUpDate && (
												<Button onClick={async () => {
													await sb.from('appointment_follow_ups').insert({ appointment_id: appointment.id, follow_up_type: 'in_person', status: 'pending', scheduled_date: new Date(followUpDate).toISOString(), notes: followUpReason });
													toast({ title: 'Follow-up created' });
												}}>Create Follow-Up</Button>
											)}
										</div>
										<div className="space-y-2">
											<Label>Predictive next visit</Label>
											<Select value={predictiveChoice} onValueChange={setPredictiveChoice}>
												<SelectTrigger><SelectValue placeholder="Select due visit type" /></SelectTrigger>
												<SelectContent>
													<SelectItem value="Cleaning (6 months)">Cleaning (6 months)</SelectItem>
													<SelectItem value="Filling follow-up (2 weeks)">Filling follow-up (2 weeks)</SelectItem>
													<SelectItem value="Root canal check (2–4 weeks)">Root canal check (2–4 weeks)</SelectItem>
													<SelectItem value="Implant review (2 weeks, then 3 months)">Implant review (2 weeks, then 3 months)</SelectItem>
													<SelectItem value="Ortho adjustment (3–6 weeks)">Ortho adjustment (3–6 weeks)</SelectItem>
													<SelectItem value="Extraction follow-up (7–10 days)">Extraction follow-up (7–10 days)</SelectItem>
													<SelectItem value="General exam (12 months)">General exam (12 months)</SelectItem>
												</SelectContent>
											</Select>
											<p className="text-xs text-muted-foreground">Auto-generates 3 valid slots and notifies the patient.</p>
										</div>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="files" className="space-y-4">
							{/* Files / X-rays */}
							<Card className="min-h-[400px] shadow-sm">
								<CardContent className="space-y-3 p-4">
									<h3 className="font-semibold">H. Files / X-rays</h3>
									<QuickPhotoUpload onPhotoUploaded={(url) => setUploadedFiles(prev => [...prev, url])} onCancel={() => { }} />
									<Input placeholder="Paste secure file URL" onKeyDown={e => {
										if (e.key === 'Enter') {
											const target = e.target as HTMLInputElement;
											if (target.value) {
												setUploadedFiles(prev => [...prev, target.value]);
												target.value = '';
											}
										}
									}} />
									<div className="grid grid-cols-3 gap-2">
										{uploadedFiles.map((u, i) => (
											<a key={i} href={u} target="_blank" rel="noreferrer" className="text-xs underline break-all">{u}</a>
										))}
									</div>
								</CardContent>
							</Card>

							{/* Treatment Type & Supplies */}
							<Card className="min-h-[400px] shadow-sm">
								<CardContent className="space-y-3 p-4">
									<h3 className="font-semibold">I. Treatment Type & Supplies</h3>
									<Select value={selectedTreatmentTypeId || ''} onValueChange={(v: any) => setSelectedTreatmentTypeId(v)}>
										<SelectTrigger className="w-full"><SelectValue placeholder="Select treatment type" /></SelectTrigger>
										<SelectContent>
											{treatmentTypes.map(tt => (<SelectItem key={tt.id} value={tt.id}>{tt.name}</SelectItem>))}
										</SelectContent>
									</Select>
									<div className="space-y-2">
										<div className="text-sm font-medium">Supplies used</div>
										<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 items-center">
											<Select onValueChange={(v: any) => addManualSupply(v, 1)}>
												<SelectTrigger><SelectValue placeholder="Add item" /></SelectTrigger>
												<SelectContent>
													{inventoryItems.map(i => (<SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>))}
												</SelectContent>
											</Select>
										</div>
										{manualSupplies.length > 0 && (
											<div className="space-y-1">
												{manualSupplies.map((s, idx) => (
													<div key={`${s.item_id}-${idx}`} className="flex items-center justify-between text-sm">
														<div className="flex items-center gap-2">
															<span>{s.name}</span>
															<span className="text-xs text-muted-foreground">stock: {inventoryItems.find(i => i.id === s.item_id)?.quantity ?? '-'}</span>
															<Input type="number" className="w-24" value={s.quantity} onChange={e => {
																const q = Math.max(1, parseInt(e.target.value || '1'));
																setManualSupplies(prev => prev.map((x, i) => i === idx ? { ...x, quantity: q } : x));
															}} />
														</div>
														<Button variant="ghost" size="sm" onClick={() => removeManualSupply(idx)}>Remove</Button>
													</div>
												))}
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="review" className="space-y-4">
							<Card className="min-h-[400px] shadow-sm">
								<CardContent className="space-y-3 p-4">
									<h3 className="font-semibold">Review & Confirm</h3>
									<div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div>
											<div className="font-medium">Treatments</div>
											<div className="text-muted-foreground text-xs">{treatments.length} items{treatments.length ? ` — ${treatments.slice(0, 3).map(t => t.code).join(', ')}${treatments.length > 3 ? '…' : ''}` : ''}</div>
										</div>
										<div>
											<div className="font-medium">Outcome</div>
											<div className="text-muted-foreground text-xs">{outcome}{notes ? ' — notes added' : ''}</div>
										</div>
										<div>
											<div className="font-medium">Payment</div>
											<div className="text-muted-foreground text-xs">Patient due: €{(finalTotalOverride !== undefined ? finalTotalOverride : (totals.patient + totals.vat)).toFixed(2)}</div>
										</div>
										<div>
											<div className="font-medium">Follow-up</div>
											<div className="text-muted-foreground text-xs">{followUpNeeded ? (followUpDate || 'Scheduled') : 'None'}</div>
										</div>
										<div>
											<div className="font-medium">Files</div>
											<div className="text-muted-foreground text-xs">{uploadedFiles.length} attached</div>
										</div>
									</div>
									<p className="text-xs text-muted-foreground">When you click Complete, this appointment will be marked as completed and an invoice will be created from the treatments. You can also charge the patient immediately.</p>
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>

				</div>
				<div className="flex-none p-4 border-t bg-background mt-auto">
					<div className="flex gap-3">
						<Button className="flex-1" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Discard</Button>
						{currentStepIndex > 0 && (
							<Button className="flex-1" variant="outline" onClick={goPrev} disabled={loading}>Back</Button>
						)}
						{step !== 'review' ? (
							<Button className="flex-1" onClick={goNext} disabled={loading}>Next</Button>
						) : (
							<>
								<Button className="flex-1" onClick={() => saveAll(false)} disabled={loading}>Save & Complete</Button>
								<Button className="flex-1" variant="secondary" onClick={() => { setStartPayment(true); saveAll(true); }} disabled={loading}>Complete & Charge</Button>
							</>
						)}
					</div>
				</div>
			</DrawerContent>
		</Drawer >
	);
}
