import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
    Calendar,
    ClipboardList,
    Image as ImageIcon,
    FileText,
    DollarSign,
    Clock,
    Edit2,
    Save,
    X,
    Folder,
    CheckCircle2,
    ArrowLeft,
    LayoutGrid,
    History,
    CreditCard
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useImaging, ImagingFile } from '@/hooks/useImaging';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TreatmentPlanDetailViewProps {
    treatmentPlanId: string;
    patientId: string;
    onBack?: () => void;
}

interface TreatmentPlan {
    id: string;
    title: string;
    description: string;
    diagnosis: string;
    status: string;
    priority: string;
    estimated_cost: number;
    estimated_duration: string;
    created_at: string;
    updated_at: string;
    start_date: string;
}

interface LinkedAppointment {
    id: string;
    appointment_date: string;
    status: string;
    reason: string;
    notes: string;
    consultation_notes: string;
}

const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
    active: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    completed: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    confirmed: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    draft: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
    cancelled: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

type TabType = 'overview' | 'clinical' | 'schedule' | 'financial';

export function TreatmentPlanDetailView({
    treatmentPlanId,
    patientId,
    onBack
}: TreatmentPlanDetailViewProps) {
    const { toast } = useToast();
    const { fetchImagingSets, getSignedUrl } = useImaging();

    const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);
    const [linkedAppointments, setLinkedAppointments] = useState<LinkedAppointment[]>([]);
    const [appointmentImages, setAppointmentImages] = useState<Record<string, { files: ImagingFile[]; urls: Record<string, string> }>>({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    // Editing state
    const [editingNotes, setEditingNotes] = useState<string | null>(null);
    const [notesValue, setNotesValue] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);

    // Calculate progress
    const completedAppointments = linkedAppointments.filter(a => a.status === 'completed').length;
    const progressPercent = linkedAppointments.length > 0 ? Math.round((completedAppointments / linkedAppointments.length) * 100) : 0;

    const fetchDetails = useCallback(async () => {
        if (!treatmentPlanId) return;
        setLoading(true);

        try {
            const { data: plan, error: planError } = await supabase
                .from('treatment_plans')
                .select('*')
                .eq('id', treatmentPlanId)
                .single();

            if (planError) throw planError;
            setTreatmentPlan(plan);

            const { data: appointments, error: apptError } = await supabase
                .from('appointments')
                .select('id, appointment_date, status, reason, notes, consultation_notes')
                .eq('patient_id', patientId)
                .in('status', ['completed', 'confirmed', 'scheduled'])
                .order('appointment_date', { ascending: false })
                .limit(20);

            if (!apptError && appointments) {
                setLinkedAppointments(appointments);

                for (const appt of appointments) {
                    const sets = await fetchImagingSets({ appointmentId: appt.id });
                    const allFiles: ImagingFile[] = [];
                    const urls: Record<string, string> = {};

                    for (const set of sets) {
                        if (set.files) {
                            allFiles.push(...set.files);
                            for (const file of set.files) {
                                const url = await getSignedUrl(file.id);
                                if (url) urls[file.id] = url;
                            }
                        }
                    }

                    if (allFiles.length > 0) {
                        setAppointmentImages(prev => ({
                            ...prev,
                            [appt.id]: { files: allFiles, urls }
                        }));
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching treatment plan details:', error);
        } finally {
            setLoading(false);
        }
    }, [treatmentPlanId, patientId, fetchImagingSets, getSignedUrl]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    const handleSaveNotes = async (appointmentId: string) => {
        setSavingNotes(true);
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ consultation_notes: notesValue })
                .eq('id', appointmentId);

            if (error) throw error;

            setLinkedAppointments(prev => prev.map(a =>
                a.id === appointmentId ? { ...a, consultation_notes: notesValue } : a
            ));
            setEditingNotes(null);
            toast({ title: 'Notes saved' });
        } catch (error) {
            toast({ title: 'Error saving notes', variant: 'destructive' });
        } finally {
            setSavingNotes(false);
        }
    };

    const tabs = [
        { id: 'overview' as TabType, label: 'Overview', icon: LayoutGrid },
        { id: 'clinical' as TabType, label: 'Clinical', icon: ClipboardList },
        { id: 'schedule' as TabType, label: 'Schedule', icon: Calendar },
        { id: 'financial' as TabType, label: 'Financial', icon: CreditCard },
    ];

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-pulse space-y-4 w-full max-w-4xl">
                    <div className="h-8 bg-muted rounded w-1/3" />
                    <div className="h-32 bg-muted rounded" />
                </div>
            </div>
        );
    }

    if (!treatmentPlan) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                Treatment plan not found
            </div>
        );
    }

    const statusStyle = statusConfig[treatmentPlan.status] || statusConfig.pending;

    return (
        <div className="flex h-full bg-slate-50">
            {/* Left Sidebar - Vertical Tabs */}
            <div className="w-20 bg-slate-900 flex flex-col items-center py-6 gap-2">
                {onBack && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="w-14 h-14 mb-4 text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                )}

                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all",
                                isActive
                                    ? "bg-teal-500 text-white"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            <span className="text-[10px] font-medium">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Header */}
                <div className="bg-white border-b px-8 py-6">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                                <Folder className="h-6 w-6 text-teal-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-semibold text-slate-800">
                                    {treatmentPlan.title}
                                </h1>
                                <p className="text-slate-500 mt-1">
                                    {treatmentPlan.description || 'No description'}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <Badge className={cn("px-3 py-1", statusStyle.bg, statusStyle.text, statusStyle.border, "border uppercase text-xs font-semibold")}>
                                {treatmentPlan.status}
                            </Badge>
                            <p className="text-xs text-slate-500 mt-2">
                                Started {format(new Date(treatmentPlan.start_date || treatmentPlan.created_at), 'MMM d, yyyy')}
                            </p>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="mt-6">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-slate-600">Treatment Progress</span>
                            <span className="font-semibold text-teal-600">{progressPercent}% Complete</span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-8">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Quick Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <Card>
                                    <CardContent className="p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                                            <DollarSign className="h-5 w-5 text-teal-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Estimated Cost</p>
                                            <p className="font-semibold text-lg">€{((treatmentPlan.estimated_cost || 0) / 100).toFixed(2)}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center">
                                            <Clock className="h-5 w-5 text-sky-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Duration</p>
                                            <p className="font-semibold text-lg">{treatmentPlan.estimated_duration || '-'}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                                            <Calendar className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Appointments</p>
                                            <p className="font-semibold text-lg">{linkedAppointments.length}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Diagnosis */}
                            {treatmentPlan.diagnosis && (
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-slate-500">Diagnosis</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-slate-700">{treatmentPlan.diagnosis}</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {activeTab === 'clinical' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                <ClipboardList className="h-5 w-5 text-teal-600" />
                                Clinical Records
                            </h2>

                            {linkedAppointments.map((appt) => {
                                const images = appointmentImages[appt.id];
                                const isEditing = editingNotes === appt.id;

                                return (
                                    <Card key={appt.id} className="overflow-hidden">
                                        <div className="bg-gradient-to-r from-teal-50 to-transparent px-6 py-3 border-b flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center",
                                                    appt.status === 'completed' ? "bg-teal-100" : "bg-slate-100"
                                                )}>
                                                    {appt.status === 'completed' ? (
                                                        <CheckCircle2 className="h-5 w-5 text-teal-600" />
                                                    ) : (
                                                        <Clock className="h-5 w-5 text-slate-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">{appt.reason || 'Appointment'}</p>
                                                    <p className="text-sm text-slate-500">{format(new Date(appt.appointment_date), 'MMMM d, yyyy')}</p>
                                                </div>
                                            </div>
                                            <Badge className={cn(
                                                statusConfig[appt.status]?.bg || statusConfig.pending.bg,
                                                statusConfig[appt.status]?.text || statusConfig.pending.text,
                                                "border",
                                                statusConfig[appt.status]?.border || statusConfig.pending.border
                                            )}>
                                                {appt.status}
                                            </Badge>
                                        </div>

                                        <CardContent className="p-6">
                                            <div className="grid grid-cols-2 gap-6">
                                                {/* Clinical Notes */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="font-medium text-slate-700">Clinical Notes</h4>
                                                        {!isEditing ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setNotesValue(appt.consultation_notes || appt.notes || '');
                                                                    setEditingNotes(appt.id);
                                                                }}
                                                                className="h-8 text-slate-500 hover:text-teal-600"
                                                            >
                                                                <Edit2 className="h-4 w-4 mr-1" />
                                                                Edit
                                                            </Button>
                                                        ) : (
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setEditingNotes(null)}
                                                                    className="h-8"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleSaveNotes(appt.id)}
                                                                    disabled={savingNotes}
                                                                    className="h-8 bg-teal-600 hover:bg-teal-700"
                                                                >
                                                                    <Save className="h-4 w-4 mr-1" />
                                                                    Save
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {isEditing ? (
                                                        <Textarea
                                                            value={notesValue}
                                                            onChange={(e) => setNotesValue(e.target.value)}
                                                            placeholder="Enter clinical notes..."
                                                            className="min-h-[120px] resize-none"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-4 min-h-[120px]">
                                                            {appt.consultation_notes || appt.notes || (
                                                                <span className="text-slate-400 italic">No clinical notes recorded</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Images */}
                                                <div>
                                                    <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                                                        <ImageIcon className="h-4 w-4" />
                                                        Images
                                                    </h4>
                                                    {images?.files.length > 0 ? (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {images.files.slice(0, 4).map((file) => (
                                                                <div
                                                                    key={file.id}
                                                                    className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 border-2 border-teal-100 hover:border-teal-300 transition-colors cursor-pointer"
                                                                >
                                                                    {images.urls[file.id] ? (
                                                                        <img
                                                                            src={images.urls[file.id]}
                                                                            alt={file.filename}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="flex items-center justify-center h-full">
                                                                            <ImageIcon className="h-8 w-8 text-slate-300" />
                                                                        </div>
                                                                    )}
                                                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                                                        <p className="text-white text-xs truncate">{file.filename}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="bg-slate-50 rounded-lg p-4 text-center min-h-[120px] flex items-center justify-center">
                                                            <div className="text-slate-400">
                                                                <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                                <p className="text-sm">No images</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}

                            {linkedAppointments.length === 0 && (
                                <Card className="p-12 text-center text-slate-400">
                                    <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p className="font-medium">No clinical records yet</p>
                                </Card>
                            )}
                        </div>
                    )}

                    {activeTab === 'schedule' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-800">Appointments</h2>

                            {/* Upcoming */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-2 h-2 rounded-full bg-teal-500" />
                                    <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Upcoming</span>
                                </div>
                                {linkedAppointments.filter(a => a.status !== 'completed').map((appt) => (
                                    <Card key={appt.id} className="mb-3">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="text-center">
                                                    <p className="text-xs text-teal-600 font-medium uppercase">{format(new Date(appt.appointment_date), 'MMM')}</p>
                                                    <p className="text-2xl font-bold text-slate-800">{format(new Date(appt.appointment_date), 'd')}</p>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">{appt.reason || 'Appointment'}</p>
                                                    <p className="text-sm text-slate-500">{format(new Date(appt.appointment_date), 'h:mm a')}</p>
                                                </div>
                                            </div>
                                            <Badge className={cn(
                                                statusConfig[appt.status]?.bg || statusConfig.pending.bg,
                                                statusConfig[appt.status]?.text || statusConfig.pending.text
                                            )}>
                                                {appt.status}
                                            </Badge>
                                        </CardContent>
                                    </Card>
                                ))}
                                {linkedAppointments.filter(a => a.status !== 'completed').length === 0 && (
                                    <p className="text-slate-400 text-sm ml-4">No upcoming appointments</p>
                                )}
                            </div>

                            {/* History */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                                    <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">History</span>
                                </div>
                                {linkedAppointments.filter(a => a.status === 'completed').map((appt) => (
                                    <div key={appt.id} className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
                                        <p className="text-sm text-slate-500 w-16">{format(new Date(appt.appointment_date), 'MMM d')}</p>
                                        <p className="flex-1 font-medium text-slate-700">{appt.reason || 'Appointment'}</p>
                                        <Badge className="bg-teal-50 text-teal-700">Attended</Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-800">Financial Ledger</h2>

                            <Card>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b bg-slate-50">
                                                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Date</th>
                                                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Description</th>
                                                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Fee</th>
                                                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Patient</th>
                                                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {linkedAppointments.map((appt) => (
                                                <tr key={appt.id} className="border-b last:border-0 hover:bg-slate-50">
                                                    <td className="py-3 px-4 text-sm text-slate-600">
                                                        {format(new Date(appt.appointment_date), 'MMM d')}
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-slate-800 font-medium">
                                                        {appt.reason || 'Appointment'}
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-right text-slate-600">-</td>
                                                    <td className="py-3 px-4 text-sm text-right text-slate-600">-</td>
                                                    <td className="py-3 px-4 text-center">
                                                        <Badge className={cn(
                                                            "text-xs",
                                                            appt.status === 'completed' ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700"
                                                        )}>
                                                            {appt.status === 'completed' ? 'Paid' : 'Pending'}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="border-t px-4 py-3 flex items-center justify-end gap-4 bg-slate-50">
                                    <span className="text-sm text-slate-500">Balance:</span>
                                    <span className="text-lg font-semibold text-slate-800">€0.00</span>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
