import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, ClipboardList, Image, FileText, DollarSign, Clock, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ImagingTimeline } from '@/components/imaging/ImagingTimeline';
import { ImagingGallery } from '@/components/imaging/ImagingGallery';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
    estimated_duration_weeks: number;
    created_at: string;
    updated_at: string;
}

interface LinkedAppointment {
    id: string;
    appointment_date: string;
    status: string;
    reason: string;
    notes: string;
}

const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 border-green-200',
    completed: 'bg-blue-100 text-blue-800 border-blue-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
};

export function TreatmentPlanDetailView({
    isOpen,
    onClose,
    treatmentPlanId,
    patientId
}: TreatmentPlanDetailViewProps) {
    const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);
    const [linkedAppointments, setLinkedAppointments] = useState<LinkedAppointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchDetails = async () => {
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

                // Fetch linked appointments
                const { data: appointments, error: apptError } = await supabase
                    .from('appointments')
                    .select('id, appointment_date, status, reason, notes')
                    .eq('treatment_plan_id', treatmentPlanId)
                    .order('appointment_date', { ascending: false });

                if (!apptError && appointments) {
                    setLinkedAppointments(appointments);
                }
            } catch (error) {
                console.error('Error fetching treatment plan details:', error);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            fetchDetails();
        }
    }, [isOpen, treatmentPlanId]);

    if (loading || !treatmentPlan) {
        return (
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-3xl">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-muted rounded w-1/2" />
                        <div className="h-32 bg-muted rounded" />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <ClipboardList className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl">{treatmentPlan.title}</DialogTitle>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Created {format(new Date(treatmentPlan.created_at), 'MMM d, yyyy')}
                                </p>
                            </div>
                        </div>
                        <Badge className={cn("ml-4", statusColors[treatmentPlan.status] || statusColors.pending)}>
                            {treatmentPlan.status}
                        </Badge>
                    </div>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                    <div className="px-6 border-b">
                        <TabsList className="h-12 p-0 bg-transparent border-0">
                            <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                                <FileText className="h-4 w-4 mr-2" />
                                Overview
                            </TabsTrigger>
                            <TabsTrigger value="appointments" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                                <Calendar className="h-4 w-4 mr-2" />
                                Appointments ({linkedAppointments.length})
                            </TabsTrigger>
                            <TabsTrigger value="imaging" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                                <Image className="h-4 w-4 mr-2" />
                                Imaging
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="h-[60vh]">
                        <div className="p-6">
                            <TabsContent value="overview" className="m-0 space-y-6">
                                {/* Diagnosis */}
                                {treatmentPlan.diagnosis && (
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground">Diagnosis</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm">{treatmentPlan.diagnosis}</p>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Description */}
                                {treatmentPlan.description && (
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground">Treatment Plan Description</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm whitespace-pre-wrap">{treatmentPlan.description}</p>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Quick Stats */}
                                <div className="grid grid-cols-3 gap-4">
                                    <Card>
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <DollarSign className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Estimated Cost</p>
                                                <p className="font-semibold">€{(treatmentPlan.estimated_cost / 100).toFixed(2)}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <Clock className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Duration</p>
                                                <p className="font-semibold">{treatmentPlan.estimated_duration_weeks || '-'} weeks</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <Calendar className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Appointments</p>
                                                <p className="font-semibold">{linkedAppointments.length}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            <TabsContent value="appointments" className="m-0 space-y-4">
                                {linkedAppointments.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p className="font-medium">No linked appointments</p>
                                        <p className="text-sm">Appointments linked to this treatment plan will appear here</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {linkedAppointments.map((appt) => (
                                            <Card key={appt.id}>
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                                            <span className="font-medium">
                                                                {format(new Date(appt.appointment_date), 'EEEE, MMM d, yyyy')}
                                                            </span>
                                                            <span className="text-muted-foreground">
                                                                at {format(new Date(appt.appointment_date), 'h:mm a')}
                                                            </span>
                                                        </div>
                                                        <Badge className={cn(statusColors[appt.status] || statusColors.pending)}>
                                                            {appt.status}
                                                        </Badge>
                                                    </div>
                                                    {appt.reason && (
                                                        <p className="text-sm text-muted-foreground mb-2">{appt.reason}</p>
                                                    )}
                                                    {appt.notes && (
                                                        <div className="bg-muted/50 rounded p-3 text-sm">
                                                            <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                                                            <p>{appt.notes}</p>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="imaging" className="m-0 space-y-6">
                                {/* Image Timeline with comparison */}
                                <ImagingTimeline
                                    patientId={patientId}
                                    treatmentPlanId={treatmentPlanId}
                                />

                                <Separator />

                                {/* Full Gallery */}
                                <div>
                                    <h4 className="font-medium mb-4">All Images</h4>
                                    <ImagingGallery
                                        patientId={patientId}
                                        showHeader={false}
                                    />
                                </div>
                            </TabsContent>
                        </div>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
