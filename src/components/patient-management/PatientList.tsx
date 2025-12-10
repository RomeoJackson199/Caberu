import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Search } from "lucide-react";
import { format } from "date-fns";
import { Patient } from "@/types/patient";
import { isValidImageUrl } from "@/utils/validation";

interface PatientListProps {
    patients: Patient[];
    filteredPatients: Patient[];
    searchTerm: string;
    onSearchChange: (value: string) => void;
    selectedPatientId?: string;
    onSelectPatient: (patient: Patient) => void;
    patientFlags: Record<string, any>; // Using any for flags as it's complex derived state
}

export function PatientList({
    patients,
    filteredPatients,
    searchTerm,
    onSearchChange,
    selectedPatientId,
    onSelectPatient,
    patientFlags
}: PatientListProps) {
    return (
        <Card className="glass-card lg:col-span-1 h-full flex flex-col">
            <CardHeader className="space-y-4 flex-shrink-0">
                <CardTitle className="flex items-center space-x-2">
                    <Users className="h-6 w-6 text-dental-primary" />
                    <span>My Patients</span>
                    <Badge variant="outline" className="ml-auto">{patients.length} total</Badge>
                </CardTitle>
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, ID, or phone"
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pl-10 h-12 text-base"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto">
                    {filteredPatients.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            No patients found.
                        </div>
                    ) : (
                        filteredPatients.map((patient) => (
                            <div
                                key={patient.id}
                                className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${selectedPatientId === patient.id ? 'bg-dental-primary/10 border-dental-primary' : ''
                                    }`}
                                onClick={() => onSelectPatient(patient)}
                            >
                                <div className="flex items-center space-x-3">
                                    <Avatar className="h-12 w-12 flex-shrink-0">
                                        <AvatarImage src={isValidImageUrl(patient.profile_picture_url || '') ? patient.profile_picture_url : undefined} />
                                        <AvatarFallback className="bg-dental-primary/10 text-dental-primary">
                                            {patient.first_name?.[0]}{patient.last_name?.[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-medium truncate">
                                                {patient.first_name} {patient.last_name}
                                            </p>
                                            {/* Medical alerts */}
                                            {patient.medical_history && patient.medical_history.toLowerCase().includes('allerg') && (
                                                <Badge variant="destructive" className="text-[10px] px-2 py-0.5">Allergies</Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate mt-1">
                                            <span>{patient.phone || 'No phone'}</span>
                                            {patientFlags[patient.id]?.lastVisitDate && (
                                                <span>• Last: {format(new Date(patientFlags[patient.id]!.lastVisitDate), 'PP')}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap mt-2">
                                            {patientFlags[patient.id]?.hasUpcomingAppointment && (
                                                <Badge variant="outline" className="text-[10px] px-2 py-0.5">Upcoming</Badge>
                                            )}
                                            {patientFlags[patient.id]?.hasActiveTreatmentPlan && (
                                                <Badge variant="outline" className="text-[10px] px-2 py-0.5">Active Plan</Badge>
                                            )}
                                            {patientFlags[patient.id]?.hasUnpaidBalance && (
                                                <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                                                    Unpaid {patientFlags[patient.id]?.outstandingCents ? `€${(patientFlags[patient.id]!.outstandingCents! / 100).toFixed(2)}` : ''}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
