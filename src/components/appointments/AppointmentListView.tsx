import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentCard } from "./AppointmentCard";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DentistAppointmentDetail } from "./DentistAppointmentDetail";
import { useLanguage } from "@/hooks/useLanguage";

interface AppointmentListViewProps {
  dentistId: string;
  filters: any;
}

export function AppointmentListView({ dentistId, filters }: AppointmentListViewProps) {
  const { t } = useLanguage();
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  const { data: appointments, isLoading, refetch } = useQuery({
    queryKey: ["appointments-list", dentistId, filters],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select(`
          *,
          patient:patient_id(id, first_name, last_name, email, phone, date_of_birth)
        `)
        .eq("dentist_id", dentistId)
        .order("appointment_date", { ascending: false });

      if (filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.type !== "all") {
        query = query.eq("reason", filters.type);
      }

      if (filters.patient) {
        query = query.ilike("patient_name", `%${filters.patient}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const [showAll, setShowAll] = useState(false);
  const displayed = useMemo(() => {
    const list = appointments || [];
    return showAll ? list : list.slice(0, 10);
  }, [appointments, showAll]);

  const handleAppointmentClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowDetail(true);
  };

  const handleStatusChange = async (id: string, status: string) => {
    await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id);
    
    refetch();
    
    if (status === 'cancelled' || status === 'completed') {
      setShowDetail(false);
      setSelectedAppointment(null);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <>
      <div className="space-y-4">
        {displayed?.map((apt) => (
          <AppointmentCard 
            key={apt.id} 
            appointment={apt} 
            onClick={() => handleAppointmentClick(apt)}
          />
        ))}
        {(!appointments || appointments.length === 0) && (
          <p className="text-center text-muted-foreground py-8">
            {t.noAppointmentsFound}
          </p>
        )}
        {appointments && appointments.length > 10 && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" onClick={() => setShowAll(!showAll)}>
              {showAll ? t.showLess : `${t.viewMore} (${appointments.length - 10} ${t.more})`}
            </Button>
          </div>
        )}
      </div>

      {/* Appointment Detail Sheet */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto" side="right">
          {selectedAppointment && (
            <DentistAppointmentDetail
              appointment={selectedAppointment}
              onClose={() => {
                setShowDetail(false);
                setSelectedAppointment(null);
              }}
              onStatusChange={handleStatusChange}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
