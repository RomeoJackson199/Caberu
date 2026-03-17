import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/lib/logger';
import { useLanguage } from "@/hooks/useLanguage";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { DashboardSkeleton } from "@/components/ui/page-skeletons";
import { AnimatedBackground } from "@/components/ui/polished-components";
import { TimeGreeting } from "@/components/ui/page-enhancements";
import {
	HeroAppointmentCard,
	DashboardStats,
	TodayTimeline,
	FloatingQuickAction
} from "@/components/dashboard";
import { PendingApprovalCard } from "@/components/PendingApprovalCard";

interface ClinicalTodayProps {
	user: User;
	dentistId: string;
	onOpenPatientsTab?: () => void;
	onOpenAppointmentsTab?: () => void;
}

interface TodayAppointment {
	id: string;
	appointment_date: string;
	patient_id: string | null;
	patient_name: string | null;
	reason: string | null;
	status: string;
	urgency: string | null;
	duration_minutes?: number | null;
	profiles: {
		first_name: string;
		last_name: string;
		email?: string;
		phone?: string | null;
		allergies?: string | null;
		medical_conditions?: string | null;
		profile_picture_url?: string | null;
	};
}

export function ClinicalToday({ user, dentistId, onOpenPatientsTab, onOpenAppointmentsTab }: ClinicalTodayProps) {
	const today = new Date();
	const { t } = useLanguage();
	const { businessId } = useBusinessContext();
	const [stats, setStats] = useState({
		todayCount: 0,
		pendingCount: 0,
		weekCompleted: 0,
		totalPatients: 0
	});
	const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
	const [nextAppointment, setNextAppointment] = useState<TodayAppointment | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchDashboardData = async () => {
			try {
				const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
				const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
				const weekStart = new Date(today);
				weekStart.setDate(today.getDate() - today.getDay());

				// Build queries scoped to current business (no joins on decrypted views)
				let todayQuery = supabase
					.from('appointments_decrypted')
					.select('id, appointment_date, patient_id, patient_name, reason, status, urgency, duration_minutes')
					.eq('dentist_id', dentistId)
					.gte('appointment_date', startOfDay.toISOString())
					.lt('appointment_date', endOfDay.toISOString())
					.neq('status', 'cancelled')
					.order('appointment_date', { ascending: true });

				let weekQuery = supabase
					.from('appointments_decrypted')
					.select('id')
					.eq('dentist_id', dentistId)
					.gte('appointment_date', weekStart.toISOString())
					.eq('status', 'completed');

				let patientsQuery = supabase
					.from('appointments_decrypted')
					.select('patient_id')
					.eq('dentist_id', dentistId);

				let pendingQuery = supabase
					.from('appointments_decrypted')
					.select('id')
					.eq('dentist_id', dentistId)
					.eq('status', 'pending')
					.gte('appointment_date', new Date().toISOString());

				let nextQuery = supabase
					.from('appointments_decrypted')
					.select('id, appointment_date, patient_id, patient_name, reason, status, urgency, duration_minutes')
					.eq('dentist_id', dentistId)
					.gte('appointment_date', new Date().toISOString())
					.neq('status', 'cancelled')
					.order('appointment_date', { ascending: true })
					.limit(1);

				// Apply business_id filter to all queries
				if (businessId) {
					todayQuery = todayQuery.eq('business_id', businessId);
					weekQuery = weekQuery.eq('business_id', businessId);
					patientsQuery = patientsQuery.eq('business_id', businessId);
					pendingQuery = pendingQuery.eq('business_id', businessId);
					nextQuery = nextQuery.eq('business_id', businessId);
				}

				// Fetch all data in parallel
				const [todayApptsResult, weekCompletedResult, patientsResult, pendingResult, nextAptResult] = await Promise.allSettled([
					todayQuery,
					weekQuery,
					patientsQuery,
					pendingQuery,
					nextQuery
				]);

				// Extract results with graceful fallbacks
				const todayAppts = todayApptsResult.status === 'fulfilled' ? todayApptsResult.value.data : null;
				const todayError = todayApptsResult.status === 'fulfilled' ? todayApptsResult.value.error : null;
				const weekCompleted = weekCompletedResult.status === 'fulfilled' ? weekCompletedResult.value.data : null;
				const patients = patientsResult.status === 'fulfilled' ? patientsResult.value.data : null;
				const pending = pendingResult.status === 'fulfilled' ? pendingResult.value.data : null;
				const nextApt = nextAptResult.status === 'fulfilled' ? nextAptResult.value.data : null;

				if (todayError) {
					logger.error('Error fetching today appointments:', { code: todayError.code, message: todayError.message, details: (todayError as any)?.details });
				}

				// Fetch patient profiles separately (views don't support PostgREST joins)
				const allPatientIds = [...new Set([
					...(todayAppts || []).map(a => a.patient_id),
					...(nextApt || []).map(a => a.patient_id),
				].filter(Boolean))];

			const { data: profilesData } = allPatientIds.length > 0
				? await supabase.from('profiles').select('id, first_name, last_name, email, phone, profile_picture_url').in('id', allPatientIds.filter((id): id is string => id !== null))
				: { data: [] };
				const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

				// Attach profiles to appointments
				const validAppts = (todayAppts || [])
					.map(apt => ({
						...apt,
						profiles: profilesMap.get(apt.patient_id!) || null,
					}))
					.filter(apt => apt.profiles) as TodayAppointment[];

				// Get next appointment
				const nextAppointmentData = nextApt && nextApt.length > 0
					? {
						...nextApt[0],
						profiles: profilesMap.get(nextApt[0].patient_id) || null,
					} as TodayAppointment
					: null;

				const uniquePatients = new Set(patients?.map(p => p.patient_id) || []);

				setStats({
					todayCount: validAppts.length,
					pendingCount: pending?.length || 0,
					weekCompleted: weekCompleted?.length || 0,
					totalPatients: uniquePatients.size
				});
				setTodayAppointments(validAppts);
				setNextAppointment(nextAppointmentData);
			} catch (error) {
				logger.error('Error fetching dashboard data:', error);
			} finally {
				setLoading(false);
			}
		};

		fetchDashboardData();
	}, [dentistId, businessId]);

	const handleStatClick = (stat: 'today' | 'pending' | 'week' | 'patients') => {
		switch (stat) {
			case 'today':
			case 'pending':
			case 'week':
				onOpenAppointmentsTab?.();
				break;
			case 'patients':
				onOpenPatientsTab?.();
				break;
		}
	};

	if (loading) {
		return <DashboardSkeleton />;
	}

	return (
		<div className="space-y-4 sm:space-y-6 p-3 sm:p-6 pb-24 sm:pb-6">
			{/* Welcome Header with Stats */}
			<div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 rounded-2xl p-4 sm:p-6 shadow-sm">
				<AnimatedBackground />
				<div className="relative z-10 space-y-4">
					<TimeGreeting showDate={true} />
					<div data-tour="stats-cards">
						<DashboardStats
							todayCount={stats.todayCount}
							pendingCount={stats.pendingCount}
							weekCompleted={stats.weekCompleted}
							totalPatients={stats.totalPatients}
							onStatClick={handleStatClick}
						/>
					</div>
				</div>
			</div>

			{/* Hero Next Appointment */}
			<HeroAppointmentCard 
				appointment={nextAppointment}
				loading={loading}
			/>

			{/* Pending Approvals (if dentist requires approval) */}
			<PendingApprovalCard dentistId={dentistId} />

			{/* Today's Timeline */}
			<div data-tour="appointments-list">
				<TodayTimeline
					appointments={todayAppointments}
					loading={loading}
					onNewAppointment={onOpenAppointmentsTab}
					onViewAll={onOpenAppointmentsTab}
				/>
			</div>

			{/* Mobile Floating Action Button */}
			<FloatingQuickAction
				onNewAppointment={onOpenAppointmentsTab}
				onViewPatients={onOpenPatientsTab}
			/>
		</div>
	);
}
