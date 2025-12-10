import { Suspense, lazy, useState } from "react";
import { format, differenceInYears } from "date-fns";
import {
    Calendar,
    CreditCard,
    User,
    Edit,
    FileText,
    Pill,
    Activity,
    History
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Patient } from "@/types/patient";
import { isValidImageUrl } from "@/utils/validation";

// Lazy load heavy components
const PatientAppointments = lazy(() => import("../PatientAppointments"));
const TreatmentPlanManager = lazy(() => import("../TreatmentPlanManager"));
const PrescriptionManager = lazy(() => import("../PrescriptionManager"));
const PatientPaymentHistory = lazy(() => import("../PatientPaymentHistory"));

interface PatientDetailsProps {
    patient: Patient;
    dentistId: string;
    patientFlags?: any; // Start with optional/any for flags
}

export function PatientDetails({ patient, dentistId, patientFlags }: PatientDetailsProps) {
    const [activeTab, setActiveTab] = useState("overview");

    const getAge = (dob?: string) => {
        if (!dob) return null;
        return differenceInYears(new Date(), new Date(dob));
    };

    return (
        <div className="space-y-6">
            {/* Patient Info Card */}
            <Card className="glass-card element-enter">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
                                <AvatarImage src={isValidImageUrl(patient.profile_picture_url || '') ? patient.profile_picture_url : undefined} />
                                <AvatarFallback className="bg-dental-primary/10 text-dental-primary text-xl">
                                    {patient.first_name?.[0]}{patient.last_name?.[0]}
                                </AvatarFallback>
                            </Avatar>

                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-bold">{patient.first_name} {patient.last_name}</h2>
                                    {patientFlags?.hasUnpaidBalance && (
                                        <CreditCard className="h-5 w-5 text-red-500" />
                                    )}
                                    {patient.medical_history && patient.medical_history.toLowerCase().includes('allerg') && (
                                        <Badge variant="destructive">Allergies</Badge>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                                    <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        Age: {getAge(patient.date_of_birth) ?? '—'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Activity className="h-3 w-3" />
                                        Status: Active
                                    </span>
                                    {patient.phone && (
                                        <span>{patient.phone}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Profile
                            </Button>
                        </div>
                    </CardTitle>
                </CardHeader>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto bg-transparent border-b rounded-none h-auto p-0 gap-6">
                    <TabsTrigger
                        value="overview"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
                    >
                        Overview
                    </TabsTrigger>
                    <TabsTrigger
                        value="appointments"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
                    >
                        Appointments
                    </TabsTrigger>
                    <TabsTrigger
                        value="treatment"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
                    >
                        Treatment Plans
                    </TabsTrigger>
                    <TabsTrigger
                        value="prescriptions"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
                    >
                        Prescriptions
                    </TabsTrigger>
                    <TabsTrigger
                        value="billing"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
                    >
                        Billing
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-xl" />}>
                        <TabsContent value="overview" className="space-y-6 element-enter">
                            {/* Overview Content - Simplified for now, could show summary stats */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader><CardTitle>Medical History</CardTitle></CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                            {patient.medical_history || "No medical history recorded."}
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader><CardTitle>Contact Info</CardTitle></CardHeader>
                                    <CardContent className="space-y-2">
                                        <p className="text-sm">Email: {patient.email}</p>
                                        <p className="text-sm">Address: {patient.address || "—"}</p>
                                        <p className="text-sm">Emergency: {patient.emergency_contact || "—"}</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="appointments" className="element-enter">
                            <PatientAppointments
                                patientId={patient.id}
                                dentistId={dentistId}
                            />
                        </TabsContent>

                        <TabsContent value="treatment" className="element-enter">
                            <TreatmentPlanManager
                                patientId={patient.id}
                                dentistId={dentistId}
                            />
                        </TabsContent>

                        <TabsContent value="prescriptions" className="element-enter">
                            <PrescriptionManager
                                patientId={patient.id}
                                dentistId={dentistId}
                            />
                        </TabsContent>

                        <TabsContent value="billing" className="element-enter">
                            <PatientPaymentHistory
                                patientId={patient.id}
                                dentistId={dentistId}
                            />
                        </TabsContent>
                    </Suspense>
                </div>
            </Tabs>
        </div>
    );
}
