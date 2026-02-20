import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Clock, CalendarDays, CheckCircle, XCircle, Sparkles, Users, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from '@/lib/logger';

interface SimpleCalendarProps {
  selectedDentist: string;
  onDateTimeSelect: (date: Date, time: string) => void;
  isEmergency?: boolean;
}

export const SimpleCalendar = ({ selectedDentist, onDateTimeSelect, isEmergency = false }: SimpleCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [allSlots, setAllSlots] = useState<{time: string, available: boolean}[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [loadingTimes, setLoadingTimes] = useState(false);
  const { toast } = useToast();

  const fetchAvailability = async (date: Date) => {
    if (!selectedDentist) return;
    
    setLoadingTimes(true);
    setSelectedTime("");
    
    try {
      // Use dynamic availability - working hours minus vacations minus booked
      const { fetchDentistAvailability } = await import('@/lib/appointmentAvailability');
      const availabilitySlots = await fetchDentistAvailability(selectedDentist, date, true);

      const slotData = availabilitySlots.map(slot => ({
        time: slot.time.substring(0, 5),
        available: slot.available
      }));
      
      setAllSlots(slotData);
      
    } catch (error) {
      console.error('Failed to fetch availability:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les créneaux disponibles",
        variant: "destructive",
      });
      setAllSlots([]);
    } finally {
      setLoadingTimes(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      fetchAvailability(date);
    }
  };

  const handleTimeSelect = (time: string, available: boolean) => {
    if (!available) return; // Don't allow selection of booked slots
    setSelectedTime(time);
    if (selectedDate) {
      onDateTimeSelect(selectedDate, time);
    }
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today || date.getDay() === 0 || date.getDay() === 6;
  };

  // Get only available slots for the top section
  const availableSlots = allSlots.filter(slot => slot.available);
  const availableCount = availableSlots.length;
  const occupiedCount = allSlots.filter(slot => !slot.available).length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header Card with Clock Icon */}
      <Card className="bg-gradient-to-r from-blue-50 via-white to-indigo-50 border border-blue-200/50 shadow-lg">
        <CardHeader className="text-center pb-4">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
              <Clock className="h-6 w-6" />
            </div>
            Choisissez un créneau
            {isEmergency && (
              <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white animate-pulse">
                <Sparkles className="h-3 w-3 mr-1" />
                URGENCE
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
      </Card>

      {selectedDate && (
        <>
          {/* Available Slots Section */}
          <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Créneaux disponibles ({availableCount})</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTimes ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : availableCount > 0 ? (
                <div className="grid grid-cols-6 gap-3">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot.time}
                      variant={selectedTime === slot.time ? "default" : "outline"}
                      onClick={() => handleTimeSelect(slot.time, slot.available)}
                      className={cn(
                        "h-12 text-sm font-medium transition-all duration-200",
                        selectedTime === slot.time 
                          ? "bg-blue-600 text-white shadow-lg" 
                          : "bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300"
                      )}
                    >
                      {slot.time}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">Aucun créneau disponible pour cette date</p>
              )}
            </CardContent>
          </Card>

          {/* All Slots Status Section */}
          <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl">
            <CardHeader>
              <CardTitle>État de tous les créneaux ({allSlots.length} total)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-8 gap-2">
                {allSlots.map((slot) => (
                  <div
                    key={`status-${slot.time}`}
                    className={cn(
                      "h-16 flex flex-col items-center justify-center rounded-lg text-sm font-medium border-2",
                      slot.available 
                        ? "bg-green-50 border-green-200 text-green-700" 
                        : "bg-red-50 border-red-200 text-red-600"
                    )}
                  >
                    <CheckCircle className={cn("h-4 w-4 mb-1", slot.available ? "text-green-600" : "text-red-500")} />
                    <span className="text-xs">{slot.time}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">Disponible ({availableCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">Occupé ({occupiedCount})</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Calendar Section - Bigger */}
      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 bg-gradient-to-br from-emerald-400 to-green-500 rounded-lg text-white">
              <CalendarDays className="h-4 w-4" />
            </div>
            Choisissez une date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={isDateDisabled}
              className={cn(
                "rounded-xl border-2 border-gray-200/50 shadow-lg bg-white/90 backdrop-blur-sm p-8 pointer-events-auto",
                "[&_table]:w-full [&_td]:h-16 [&_td]:w-16 [&_th]:h-12 [&_th]:text-lg [&_button]:h-14 [&_button]:w-14 [&_button]:text-lg",
                "[&_.rdp-months]:text-xl [&_.rdp-caption]:text-xl [&_.rdp-nav_button]:h-10 [&_.rdp-nav_button]:w-10",
                selectedDate && "border-blue-300 shadow-blue-100"
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};