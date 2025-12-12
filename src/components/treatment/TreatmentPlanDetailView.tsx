import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
    Calendar,
    ClipboardList,
    Image,
    FileText,
    DollarSign,
    Clock,
    ChevronRight,
    Edit2,
    Save,
    X,
    Folder,
    CheckCircle2,
    AlertCircle,
    ImageIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useImaging, ImagingFile } from '@/hooks/useImaging';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TreatmentPlanDetailViewProps {
    isOpen: boolean;
    onClose: () => void;
    treatmentPlanId: string;
    patientId: string;
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

const statusConfig: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    active: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        icon: <CheckCircle2 className="h-3 w-3" />
    },
    completed: {
        bg: 'bg-sky-50',
        text: 'text-sky-700',
        border: 'border-sky-200',
        icon: <CheckCircle2 className="h-3 w-3" />
    },
    confirmed: {
        bg: 'bg-sky-50',
        text: 'text-sky-700',
        border: 'border-sky-200',
        icon: <CheckCircle2 className="h-3 w-3" />
    },
    pending: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        icon: <Clock className="h-3 w-3" />
    },
    draft: {
        bg: 'bg-slate-50',
        text: 'text-slate-700',
        border: 'border-slate-200',
        icon: <FileText className="h-3 w-3" />
    },
    cancelled: {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        icon: <X className="h-3 w-3" />
    },
};

export function TreatmentPlanDetailView({
    isOpen,
    onClose,
    treatmentPlanId,
    patientId
}: TreatmentPlanDetailViewProps) {
    const { toast } = useToast();
    const { fetchImagingSets, getSignedUrl } = useImaging();

    const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);
    const [linkedAppointments, setLinkedAppointments] = useState<LinkedAppointment[]>([]);
    const [selectedAppointment, setSelectedAppointment] = useState<LinkedAppointment | null>(null);
    const [appointmentImages, setAppointmentImages] = useState<Record<string, { files: ImagingFile[]; urls: Record<string, string> }>>({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Editing state
    const [editingNotes, setEditingNotes] = useState(false);
    const [notesValue, setNotesValue] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);

    // Calculate progress
    const completedAppointments = linkedAppointments.filter(a => a.status === 'completed').length;
    const progressPercent = linkedAppointments.length > 0 ? Math.round((completedAppointments / linkedAppointments.length) * 100) : 0;

    const fetchDetails = useCallback(async () => {
        if (!treatmentPlanId) return;
        setLoading(true);

        try {
            // Fetch treatment plan
            const { data: plan, error: planError } = await supabase
                .from('treatment_plans')
                .select('*')
                .eq('id', treatmentPlanId)
                .single();

            if (planError) throw planError;
            setTreatmentPlan(plan);

            // Fetch appointments for this patient
            const { data: appointments, error: apptError } = await supabase
                .from('appointments')
                .select('id, appointment_date, status, reason, notes, consultation_notes')
                .eq('patient_id', patientId)
                .in('status', ['completed', 'confirmed', 'scheduled'])
                .order('appointment_date', { ascending: true })
                .limit(20);

            if (!apptError && appointments) {
                setLinkedAppointments(appointments);
                if (appointments.length > 0 && !selectedAppointment) {
                    setSelectedAppointment(appointments[0]);
                }

                // Load images for each appointment
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
    }, [treatmentPlanId, patientId, fetchImagingSets, getSignedUrl, selectedAppointment]);

    useEffect(() => {
        if (isOpen) {
            fetchDetails();
        }
    }, [isOpen, fetchDetails]);

    // Save notes handler
    const handleSaveNotes = async () => {
        if (!selectedAppointment) return;
        setSavingNotes(true);

        try {
            const { error } = await supabase
                .from('appointments')
                .update({ consultation_notes: notesValue })
                .eq('id', selectedAppointment.id);

            if (error) throw error;

            // Update local state
            setLinkedAppointments(prev => prev.map(a =>
                a.id === selectedAppointment.id
                    ? { ...a, consultation_notes: notesValue }
                    : a
            ));
            setSelectedAppointment(prev => prev ? { ...prev, consultation_notes: notesValue } : null);
            setEditingNotes(false);

            toast({
                title: 'Notes saved',
                description: 'Clinical notes have been updated.',
            });
        } catch (error) {
            console.error('Error saving notes:', error);
            toast({
                title: 'Error',
                description: 'Failed to save notes.',
                variant: 'destructive',
            });
        } finally {
            setSavingNotes(false);
        }
    };

    const startEditingNotes = () => {
        setNotesValue(selectedAppointment?.consultation_notes || selectedAppointment?.notes || '');
        setEditingNotes(true);
    };

    if (loading || !treatmentPlan) {
        return (
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>Loading...</DialogTitle>
                        <DialogDescription>Loading treatment plan details</DialogDescription>
                    </DialogHeader>
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-muted rounded w-1/2" />
                        <div className="h-32 bg-muted rounded" />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    const statusStyle = statusConfig[treatmentPlan.status] || statusConfig.pending;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-b">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                                <Folder className="h-6 w-6 text-teal-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-semibold text-slate-800">
                                    {treatmentPlan.title}
                                </DialogTitle>
                                <DialogDescription className="text-slate-600 mt-1">
                                    {treatmentPlan.description || 'No description provided'}
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="text-right">
                            <Badge className={cn("px-3 py-1", statusStyle.bg, statusStyle.text, statusStyle.border, "border")}>
                                {statusStyle.icon}
                                <span className="ml-1 uppercase text-xs font-semibold">{treatmentPlan.status}</span>
                            </Badge>
                            <p className="text-xs text-slate-500 mt-2">
                                Started {format(new Date(treatmentPlan.start_date || treatmentPlan.created_at), 'MMM d, yyyy')}
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-slate-600">Treatment Progress</span>
                            <span className="font-semibold text-teal-600">{progressPercent}% Complete</span>
                        </div>
                        <Progress value={progressPercent} className="h-2 bg-teal-100" />
                    </div>
                </DialogHeader>

                <div className="flex h-[calc(90vh-200px)]">
                    {/* Left Sidebar - Timeline */}
                    <div className="w-80 border-r bg-slate-50/50 p-4 overflow-y-auto">
                        <h3 className="text-sm font-medium text-slate-500 mb-4 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Visits ({linkedAppointments.length})
                        </h3>

                        <div className="space-y-1">
                            {linkedAppointments.map((appt, index) => {
                                const apptStatus = statusConfig[appt.status] || statusConfig.pending;
                                const imgCount = appointmentImages[appt.id]?.files.length || 0;
                                const isSelected = selectedAppointment?.id === appt.id;

                                return (
                                    <button
                                        key={appt.id}
                                        onClick={() => setSelectedAppointment(appt)}
                                        className={cn(
                                            "w-full text-left p-3 rounded-lg transition-all",
                                            "hover:bg-white hover:shadow-sm",
                                            isSelected
                                                ? "bg-white shadow-sm border-l-4 border-l-teal-500"
                                                : "border-l-4 border-l-transparent"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold",
                                                appt.status === 'completed' ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500"
                                            )}>
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-800 text-sm truncate">
                                                    {appt.reason || 'Appointment'}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {format(new Date(appt.appointment_date), 'MMM d, yyyy')}
                                                </p>
                                                {imgCount > 0 && (
                                                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                                                        <ImageIcon className="h-3 w-3" />
                                                        {imgCount}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}

                            {linkedAppointments.length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No visits yet</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content - Appointment Details */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {selectedAppointment ? (
                            <div className="space-y-6">
                                {/* Appointment Header */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 text-sm text-teal-600 mb-1">
                                            <span className="font-medium">
                                                STEP {linkedAppointments.findIndex(a => a.id === selectedAppointment.id) + 1}
                                            </span>
                                            <span>•</span>
                                            <span>{format(new Date(selectedAppointment.appointment_date), 'MMM d, yyyy')}</span>
                                        </div>
                                        <h2 className="text-xl font-semibold text-slate-800">
                                            {selectedAppointment.reason || 'Appointment'}
                                        </h2>
                                    </div>
                                    <Badge className={cn(
                                        "px-3 py-1",
                                        statusConfig[selectedAppointment.status]?.bg || statusConfig.pending.bg,
                                        statusConfig[selectedAppointment.status]?.text || statusConfig.pending.text,
                                        "border",
                                        statusConfig[selectedAppointment.status]?.border || statusConfig.pending.border
                                    )}>
                                        {selectedAppointment.status}
                                    </Badge>
                                </div>

                                {/* Two Column Layout */}
                                <div className="grid grid-cols-2 gap-6">
                                    {/* Clinical Notes */}
                                    <Card className="border-slate-200">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-base font-medium text-slate-700">
                                                    Clinical Notes
                                                </CardTitle>
                                                {!editingNotes ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={startEditingNotes}
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
                                                            onClick={() => setEditingNotes(false)}
                                                            className="h-8"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={handleSaveNotes}
                                                            disabled={savingNotes}
                                                            className="h-8 bg-teal-600 hover:bg-teal-700"
                                                        >
                                                            <Save className="h-4 w-4 mr-1" />
                                                            Save
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            {editingNotes ? (
                                                <Textarea
                                                    value={notesValue}
                                                    onChange={(e) => setNotesValue(e.target.value)}
                                                    placeholder="Enter clinical notes..."
                                                    className="min-h-[150px] resize-none"
                                                    autoFocus
                                                />
                                            ) : (
                                                <div className="text-sm text-slate-600 whitespace-pre-wrap">
                                                    {selectedAppointment.consultation_notes || selectedAppointment.notes || (
                                                        <span className="text-slate-400 italic">No clinical notes recorded</span>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Images */}
                                    <Card className="border-slate-200">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base font-medium text-slate-700 flex items-center gap-2">
                                                <ImageIcon className="h-4 w-4" />
                                                Images
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {appointmentImages[selectedAppointment.id]?.files.length > 0 ? (
                                                <div className="grid grid-cols-2 gap-3">
                                                    {appointmentImages[selectedAppointment.id].files.map((file) => (
                                                        <div
                                                            key={file.id}
                                                            className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 border-2 border-teal-200 hover:border-teal-400 transition-colors cursor-pointer"
                                                        >
                                                            {appointmentImages[selectedAppointment.id].urls[file.id] ? (
                                                                <img
                                                                    src={appointmentImages[selectedAppointment.id].urls[file.id]}
                                                                    alt={file.filename}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full">
                                                                    <ImageIcon className="h-8 w-8 text-slate-300" />
                                                                </div>
                                                            )}
                                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                                                <p className="text-white text-xs font-medium truncate">{file.filename}</p>
                                                                <p className="text-white/70 text-xs">
                                                                    {format(new Date(file.created_at), 'MMM d')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-slate-400">
                                                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                    <p className="text-sm">No images for this visit</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-400">
                                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p className="font-medium">Select a visit to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
