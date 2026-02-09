import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Calendar,
  Phone,
  Mail,
  MapPin,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { Patient, PatientFlags, getAge } from "./index";
import { sanitizeText } from '@/utils/sanitize';

interface PatientInfoCardProps {
  patient: Patient;
  patientFlags?: PatientFlags;
  onCreatePaymentRequest: () => void;
  addMenu: React.ReactNode;
}

export function PatientInfoCard({
  patient,
  patientFlags,
  onCreatePaymentRequest,
  addMenu
}: PatientInfoCardProps) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={patient.profile_picture_url || undefined} />
              <AvatarFallback className="bg-dental-primary/10 text-dental-primary">
                {patient.first_name?.[0]}{patient.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{patient.first_name} {patient.last_name}</span>
                {patientFlags?.hasUnpaidBalance && (
                  <CreditCard className="h-4 w-4 text-red-500" />
                )}
                {patient.medical_history && patient.medical_history.toLowerCase().includes('allerg') && (
                  <Badge variant="destructive" className="text-[10px]">Allergies</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                {patient.date_of_birth && (
                  <span>Age: {getAge(patient.date_of_birth) ?? '—'}</span>
                )}
                {patientFlags?.nextAppointmentDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Next: {format(new Date(patientFlags.nextAppointmentDate), 'PPP p')}
                    {patientFlags.nextAppointmentStatus && (
                      <Badge variant="outline" className="text-[10px] ml-1">{patientFlags.nextAppointmentStatus}</Badge>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {addMenu}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{patient.email}</span>
            </div>
            {patient.phone && (
              <div className="flex items-center space-x-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{patient.phone}</span>
              </div>
            )}
            {(patient.street_address || patient.city || patient.address) && (
              <div className="flex items-center space-x-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {patient.street_address
                    ? [
                        [patient.street_address, patient.house_number].filter(Boolean).join(' '),
                        [patient.postal_code, patient.city].filter(Boolean).join(' '),
                      ].filter(Boolean).join(', ')
                    : patient.address}
                </span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {patient.date_of_birth && (
              <div className="text-sm">
                <span className="font-medium">Date of Birth:</span>
                <p>{format(new Date(patient.date_of_birth), 'PPP')}</p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {patientFlags?.hasUnpaidBalance && (
              <div className="text-sm">
                <span className="font-medium">Outstanding:</span>
                <p>€{((patientFlags.outstandingCents || 0) / 100).toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>
        {patient.medical_history && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-medium text-sm mb-2">Medical Alerts</h4>
            <p className="text-sm bg-muted p-3 rounded-md">{sanitizeText(patient.medical_history)}</p>
          </div>
        )}
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-medium text-sm mb-3">Quick Actions</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              size="lg"
              variant="outline"
              disabled
              className="h-12 rounded-xl"
              title="Staff booking temporarily disabled - needs reimplementation with slot locking"
            >
              <Calendar className="h-5 w-5 mr-2" />
              Book Appointment
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onCreatePaymentRequest}
              className="h-12 rounded-xl"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Create Payment Request
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
