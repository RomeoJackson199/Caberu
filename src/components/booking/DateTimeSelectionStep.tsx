import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Clock, CheckCircle, ChevronLeft, ChevronRight, Sun, Sunset, Moon } from "lucide-react";
import { format, addDays, isSameDay, isToday as isDateToday } from "date-fns";
import { isPublicHoliday, getHolidayName } from "@/lib/belgianHolidays";
import { formatTimeSlot } from "@/lib/timezone";
import { DentistInfoHeader } from "./DentistInfoHeader";
import type { Dentist, TimeSlot } from "./types";

interface DateTimeSelectionStepProps {
  dentist: Dentist;
  selectedDate: Date | undefined;
  currentWeekStart: Date;
  selectedTime: string | undefined;
  availableSlots: TimeSlot[];
  loadingSlots: boolean;
  isDateDisabled: (date: Date) => boolean;
  onDateSelect: (date: Date | undefined) => void;
  onTimeSelect: (time: string) => void;
  onNavigateWeek: (direction: "prev" | "next") => void;
  onBack: () => void;
}

function groupSlotsByPeriod(slots: TimeSlot[]) {
  const morning: TimeSlot[] = [];
  const afternoon: TimeSlot[] = [];
  const evening: TimeSlot[] = [];

  slots.filter(s => s.available).forEach(slot => {
    const hour = parseInt(slot.time.split(':')[0], 10);
    if (hour < 12) morning.push(slot);
    else if (hour < 17) afternoon.push(slot);
    else evening.push(slot);
  });

  return { morning, afternoon, evening };
}

export function DateTimeSelectionStep({
  dentist,
  selectedDate,
  currentWeekStart,
  selectedTime,
  availableSlots,
  loadingSlots,
  isDateDisabled,
  onDateSelect,
  onTimeSelect,
  onNavigateWeek,
  onBack,
}: DateTimeSelectionStepProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const { morning, afternoon, evening } = groupSlotsByPeriod(availableSlots);
  const totalAvailable = morning.length + afternoon.length + evening.length;

  const renderSlotGroup = (
    label: string,
    icon: React.ReactNode,
    slots: TimeSlot[],
    colorClass: string
  ) => {
    if (slots.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">({slots.length})</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {slots.map((slot) => {
            const isSelected = selectedTime === slot.time;
            return (
              <button
                key={slot.time}
                role="option"
                aria-selected={isSelected}
                aria-label={`Select time ${formatTimeSlot(slot.time)}${selectedDate ? ` on ${format(selectedDate, "MMMM d")}` : ""}`}
                onClick={() => onTimeSelect(slot.time)}
                className={`relative p-3 rounded-xl text-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-lg scale-105"
                    : `border border-border hover:border-primary/40 hover:bg-accent/50 ${colorClass}`
                }`}
              >
                <Clock className={`h-3.5 w-3.5 mx-auto mb-1 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} aria-hidden="true" />
                <span className="text-sm">{formatTimeSlot(slot.time)}</span>
                {isSelected && (
                  <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-primary-foreground bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-3 py-4 sm:p-4 sm:py-8">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to dentists
      </Button>

      <div className="space-y-6">
        {/* Dentist Info Card */}
        <Card>
          <CardContent className="p-4">
            <DentistInfoHeader dentist={dentist} />
          </CardContent>
        </Card>

        {/* Date Selection Card */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Choose a Date</h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onNavigateWeek("prev")}
                  aria-label="Previous week"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-muted-foreground px-2 min-w-[120px] text-center">
                  {format(currentWeekStart, "MMM d")} – {format(addDays(currentWeekStart, 6), "MMM d")}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onNavigateWeek("next")}
                  aria-label="Next week"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div
              className="grid grid-cols-7 gap-1.5 sm:gap-2"
              role="listbox"
              aria-label="Select a date"
            >
              {weekDays.map((date, index) => {
                const isSelected = selectedDate && isSameDay(selectedDate, date);
                const disabled = isDateDisabled(date);
                const today = isDateToday(date);
                const holidayName = isPublicHoliday(date) ? getHolidayName(date) : null;

                return (
                  <button
                    key={index}
                    role="option"
                    aria-selected={!!isSelected}
                    aria-disabled={disabled}
                    aria-label={`${format(date, "EEEE, MMMM d")}${disabled ? `, Not available` : ""}${holidayName ? `, Holiday: ${holidayName}` : ""}`}
                    title={holidayName || undefined}
                    onClick={() => !disabled && onDateSelect(date)}
                    disabled={disabled}
                    className={`flex flex-col items-center py-3 px-1 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[72px] ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-lg scale-105"
                        : disabled
                          ? "opacity-30 cursor-not-allowed"
                          : today
                            ? "bg-accent/70 hover:bg-accent border border-primary/20"
                            : "hover:bg-accent/50 border border-transparent hover:border-border"
                    }`}
                  >
                    <span className={`text-[11px] uppercase tracking-wider mb-1 ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {format(date, "EEE")}
                    </span>
                    <span className={`text-xl font-semibold ${isSelected ? '' : ''}`}>
                      {date.getDate()}
                    </span>
                    {today && !isSelected && (
                      <span className="text-[9px] font-medium text-primary mt-0.5">Today</span>
                    )}
                    {holidayName && (
                      <span className="text-[9px] mt-0.5">🎌</span>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Time Selection Card */}
        {selectedDate && (
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">
                  Pick a Time
                </h3>
                <span className="text-sm text-muted-foreground bg-accent px-3 py-1 rounded-full">
                  {format(selectedDate, "EEE, MMM d")}
                </span>
              </div>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Finding available times...</p>
                  </div>
                </div>
              ) : totalAvailable === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No available slots</p>
                  <p className="text-sm text-muted-foreground mt-1">Try selecting a different date</p>
                </div>
              ) : (
                <div className="space-y-5" role="listbox" aria-label="Available time slots">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span>{totalAvailable} time{totalAvailable !== 1 ? 's' : ''} available</span>
                  </div>

                  {renderSlotGroup(
                    "Morning",
                    <Sun className="h-4 w-4 text-amber-500" />,
                    morning,
                    "hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
                  )}
                  {renderSlotGroup(
                    "Afternoon",
                    <Sunset className="h-4 w-4 text-orange-500" />,
                    afternoon,
                    "hover:bg-orange-50/50 dark:hover:bg-orange-950/20"
                  )}
                  {renderSlotGroup(
                    "Evening",
                    <Moon className="h-4 w-4 text-indigo-500" />,
                    evening,
                    "hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20"
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}