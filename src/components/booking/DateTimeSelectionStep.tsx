import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Clock, CheckCircle } from "lucide-react";
import { format, addDays } from "date-fns";
import { isPublicHoliday, getHolidayName } from "@/lib/belgianHolidays";
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
  return (
    <div className="max-w-4xl mx-auto p-4 py-8">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to services
      </Button>

      <Card>
        <CardContent className="p-6 space-y-6">
          <DentistInfoHeader dentist={dentist} />

          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigateWeek("prev")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-semibold">
              {selectedDate
                ? format(selectedDate, "EEE, dd MMMM")
                : "Select a date"}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigateWeek("next")}
            >
              <ArrowLeft className="h-4 w-4 rotate-180" />
            </Button>
          </div>

          {/* Week Days */}
          <div
            className="grid grid-cols-7 gap-2"
            role="listbox"
            aria-label="Select a date"
          >
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
              (day, index) => {
                const date = addDays(currentWeekStart, index);
                const isSelected =
                  selectedDate &&
                  format(selectedDate, "yyyy-MM-dd") ===
                    format(date, "yyyy-MM-dd");
                const isDisabled = isDateDisabled(date);
                const holidayName = isPublicHoliday(date)
                  ? getHolidayName(date)
                  : null;
                const disabledReason = holidayName
                  ? `Holiday: ${holidayName}`
                  : isDisabled
                    ? "Not available"
                    : "";

                return (
                  <button
                    key={day}
                    role="option"
                    aria-selected={!!isSelected}
                    aria-disabled={isDisabled}
                    aria-label={`${format(date, "EEEE, MMMM d")}${isDisabled ? `, ${disabledReason}` : ""}`}
                    title={holidayName || undefined}
                    onClick={() => !isDisabled && onDateSelect(date)}
                    disabled={isDisabled}
                    className={`flex flex-col items-center p-3 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isDisabled
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-muted"
                    }`}
                  >
                    <span className="text-xs mb-1">{day}</span>
                    <span className="text-lg font-medium">
                      {date.getDate()}
                    </span>
                    {holidayName && (
                      <span className="text-[8px] text-red-500">🎌</span>
                    )}
                  </button>
                );
              }
            )}
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">
                  Available Time Slots (
                  {availableSlots.filter((slot) => slot.available).length})
                </span>
              </div>

              <div
                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2"
                role="listbox"
                aria-label="Available time slots"
                aria-busy={loadingSlots}
              >
                {loadingSlots ? (
                  <p
                    className="col-span-full text-center text-muted-foreground py-8"
                    role="status"
                    aria-live="polite"
                  >
                    Loading time slots...
                  </p>
                ) : availableSlots.length === 0 ? (
                  <p
                    className="col-span-full text-center text-muted-foreground py-8"
                    role="status"
                  >
                    No available slots for this date
                  </p>
                ) : (
                  availableSlots
                    .filter((slot) => slot.available)
                    .map((slot) => (
                      <button
                        key={slot.time}
                        role="option"
                        aria-selected={selectedTime === slot.time}
                        aria-label={`Select time slot ${slot.time}${selectedDate ? ` on ${format(selectedDate, "MMMM d")}` : ""}`}
                        tabIndex={0}
                        onClick={() => onTimeSelect(slot.time)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onTimeSelect(slot.time);
                          }
                        }}
                        className={`p-3 rounded-lg border-2 text-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                          selectedTime === slot.time
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-muted hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <Clock
                          className="h-4 w-4 mx-auto mb-1"
                          aria-hidden="true"
                        />
                        {slot.time}
                      </button>
                    ))
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
