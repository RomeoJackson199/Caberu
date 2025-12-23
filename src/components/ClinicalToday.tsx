import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User as UserIcon, CheckCircle, Plus, Users, FileText, CreditCard, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { NextAppointmentWidget } from "@/components/NextAppointmentWidget";
import { useBusinessTemplate } from "@/hooks/useBusinessTemplate";
import { logger } from '@/lib/logger';
import { AnimatedBackground, EmptyState } from "@/components/ui/polished-components";
import { useLanguage } from "@/hooks/useLanguage";
import { PendingApprovalCard } from "@/components/PendingApprovalCard";
import { DashboardSkeleton } from "@/components/ui/page-skeletons";
import { TimeGreeting, QuickActions, AnimatedStatCard, AvatarWithInitials } from "@/components/ui/page-enhancements";
import { StaggeredList } from "@/components/ui/micro-interactions";
interface ClinicalTodayProps {
	user: User;
	dentistId: string;
	onOpenPatientsTab?: () => void;
	onOpenAppointmentsTab?: () => void;
}

interface TodayAppointment {
	id: string;
	appointment_date: string;
	patient_name: string | null;
	reason: string | null;
	status: string;
	urgency: string | null;
	profiles: {
		first_name: string;
		last_name: string;
	};
}

export function ClinicalToday({ user, dentistId, onOpenPatientsTab, onOpenAppointmentsTab }: ClinicalTodayProps) {
	const today = new Date();
	const { t: businessT } = useBusinessTemplate();
	const { t } = useLanguage();
	const [stats, setStats] = useState({
		todayCount: 0,
		urgentCount: 0,
		weekCompleted: 0,
		totalPatients: 0
	});
	const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchDashboardData = async () => {
			try {
				const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
				const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
				const weekStart = new Date(today);
				weekStart.setDate(today.getDate() - today.getDay());

				// Fetch all data in parallel
				const [todayApptsResult, weekCompletedResult, patientsResult] = await Promise.allSettled([
					supabase
						.from('appointments')
						.select(`
							id,
							appointment_date,
							patient_name,
							reason,
							status,
							urgency,
							profiles!appointments_patient_id_fkey (
								first_name,
								last_name
							)
						`)
						.eq('dentist_id', dentistId)
						.gte('appointment_date', startOfDay.toISOString())
						.lt('appointment_date', endOfDay.toISOString())
						.neq('status', 'cancelled')
						.order('appointment_date', { ascending: true }),
					supabase
						.from('appointments')
						.select('id')
						.eq('dentist_id', dentistId)
						.gte('appointment_date', weekStart.toISOString())
						.eq('status', 'completed'),
					supabase
						.from('appointments')
						.select('patient_id')
						.eq('dentist_id', dentistId)
				]);

				// Extract results with graceful fallbacks
				const todayAppts = todayApptsResult.status === 'fulfilled' ? todayApptsResult.value.data : null;
				const todayError = todayApptsResult.status === 'fulfilled' ? todayApptsResult.value.error : null;
				const weekCompleted = weekCompletedResult.status === 'fulfilled' ? weekCompletedResult.value.data : null;
				const patients = patientsResult.status === 'fulfilled' ? patientsResult.value.data : null;

				if (todayError) {
					logger.error('❌ Error fetching today appointments:', { code: todayError.code, message: todayError.message, details: (todayError as any)?.details });
				}

				// Filter out appointments without profile data and unwrap profiles array
				const validAppts = (todayAppts || [])
					.filter(apt => apt.profiles && (Array.isArray(apt.profiles) ? apt.profiles.length > 0 : true))
					.map(apt => ({
						...apt,
						profiles: Array.isArray(apt.profiles) ? apt.profiles[0] : apt.profiles
					})) as TodayAppointment[];

				// Count urgent cases
				const urgentCount = validAppts.filter(a => a.urgency === 'high').length || 0;
				const uniquePatients = new Set(patients?.map(p => p.patient_id) || []);

				setStats({
					todayCount: validAppts.length,
					urgentCount,
					weekCompleted: weekCompleted?.length || 0,
					totalPatients: uniquePatients.size
				});
				setTodayAppointments(validAppts);
			} catch (error) {
				logger.error('Error fetching dashboard data:', error);
			} finally {
				setLoading(false);
			}
		};

		fetchDashboardData();
	}, [dentistId]);

	const getPatientName = (appointment: TodayAppointment) => {
		if (appointment.profiles) {
			return `${appointment.profiles.first_name} ${appointment.profiles.last_name}`;
		}
		return appointment.patient_name || 'Unknown Patient';
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'completed': return 'bg-success/10 text-success border-success/20';
			case 'confirmed': return 'bg-primary/10 text-primary border-primary/20';
			case 'pending': return 'bg-warning/10 text-warning border-warning/20';
			default: return 'bg-muted text-muted-foreground border-border';
		}
	};

	if (loading) {
		return <DashboardSkeleton />;
	}

	// Quick actions for the dashboard
	const quickActions = [
		{
			icon: Plus,
			label: t.newAppointment || "New Appointment",
			onClick: () => onOpenAppointmentsTab?.(),
			color: "bg-primary"
		},
		{
			icon: Users,
			label: businessT('customerPlural') || "Patients",
			onClick: () => onOpenPatientsTab?.(),
			color: "bg-purple-500"
		},
		{
			icon: Calendar,
			label: t.schedule || "Schedule",
			onClick: () => onOpenAppointmentsTab?.(),
			color: "bg-emerald-500"
		},
		{
			icon: FileText,
			label: "Records",
			onClick: () => onOpenPatientsTab?.(),
			color: "bg-orange-500"
		},
	];

	return (
		<div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
			{/* Enhanced Welcome Header with Time Greeting */}
			<div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 rounded-2xl p-4 sm:p-6 shadow-sm">
				<AnimatedBackground />
				<div className="relative z-10">
					<TimeGreeting showDate={true} />
				</div>
			</div>

			{/* Quick Actions */}
			<QuickActions actions={quickActions} columns={4} />

			{/* Quick Stats with Animated Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" data-tour="stats-cards">
				<AnimatedStatCard
					title={t.todaysAppointments || "Today's Appointments"}
					value={stats.todayCount}
					icon={Calendar}
					gradient="from-blue-500 to-cyan-500"
				/>

				{/* Show PendingApprovalCard for dentists with require_appointment_approval */}
				<PendingApprovalCard dentistId={dentistId} />

				<AnimatedStatCard
					title={t.completedThisWeek || "Completed This Week"}
					value={stats.weekCompleted}
					icon={CheckCircle}
					gradient="from-green-500 to-emerald-500"
				/>

				<AnimatedStatCard
					title={businessT('customerPlural') || "Patients"}
					value={stats.totalPatients}
					icon={UserIcon}
					gradient="from-indigo-500 to-blue-500"
				/>
			</div>

			{/* Next Appointment Widget */}
			<NextAppointmentWidget dentistId={dentistId} />

			{/* Today's Schedule */}
			<Card className="border-none shadow-sm" data-tour="appointments-list">
				<CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
						<h2 className="text-base sm:text-lg font-semibold">{t.todaysSchedule || "Today's Schedule"}</h2>
						<Button
							onClick={() => onOpenAppointmentsTab?.()}
							className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all"
							size="sm"
						>
							<Plus className="h-4 w-4 mr-2" />
							{t.newAppointment}
						</Button>
					</div>

					{todayAppointments.length === 0 ? (
						<EmptyState
							icon={Calendar}
							title={t.noAppointmentsToday || "No appointments today"}
							description={t.noAppointmentsTodayDesc || "You don't have any appointments scheduled for today. Take this time to catch up on other tasks or schedule new appointments."}
							action={{
								label: t.viewAllAppointments || "View All Appointments",
								onClick: () => onOpenAppointmentsTab?.()
							}}
							secondaryAction={{
								label: t.scheduleNew || "Schedule New",
								onClick: () => onOpenAppointmentsTab?.()
							}}
						/>
					) : (
						<div className="space-y-2 sm:space-y-3">
							{todayAppointments.map((appointment) => (
								<div
									key={appointment.id}
									className="group flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-card hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-500/40 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
									onClick={() => onOpenAppointmentsTab?.()}
								>
									<div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 w-full min-w-0">
										<div className="flex flex-col items-center justify-center min-w-[50px] sm:min-w-[60px] flex-shrink-0">
											<Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mb-1" />
											<span className="text-xs sm:text-sm font-medium">
												{format(new Date(appointment.appointment_date), 'HH:mm')}
											</span>
										</div>

										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-1 flex-wrap">
												<p className="font-medium text-sm sm:text-base truncate">{getPatientName(appointment)}</p>
												{appointment.urgency === 'high' && (
													<Badge variant="destructive" className="text-xs flex-shrink-0">{t.urgent || "Urgent"}</Badge>
												)}
											</div>
											<p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
												{appointment.reason || t.noReasonSpecified || 'No reason specified'}
											</p>
										</div>
									</div>

									<Badge variant="outline" className={`${getStatusColor(appointment.status)} text-xs flex-shrink-0 self-start sm:self-center`}>
										{appointment.status}
									</Badge>
								</div>
							))}

							<Button
								onClick={() => onOpenAppointmentsTab?.()}
								variant="outline"
								className="w-full mt-3 sm:mt-4"
							>
								{t.viewAllAppointments || "View All Appointments"}
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}