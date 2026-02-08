import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, changeLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User as UserIcon, 
  MapPin, 
  Phone, 
  CheckCircle, 
  Star,
  Camera,
  Upload,
  Edit,
  Heart,
  Shield,
  Moon,
  Sun,
  Globe,
  Bell,
  HelpCircle,
  X,
  Camera as CameraIcon,
  FileImage,
  AlertTriangle,
  Info,
  Loader2
} from "lucide-react";
import { format, startOfDay, isSameDay } from "date-fns";
import { formatClinicTime } from "@/lib/timezone";
import { logger } from '@/lib/logger';

type Dentist = any;
type Appointment = any;

interface InteractiveChatWidgetsProps {
  user: User | null;
  onWidgetAction: (action: string, data?: any) => void;
  onClose?: () => void;
}

// Privacy Consent Widget
const PrivacyConsentWidget = ({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) => {
  return (
    <Card className="max-w-md mx-auto my-4 border-primary/20 shadow-lg">
      <CardHeader className="text-center">
        <Shield className="h-8 w-8 mx-auto text-primary mb-2" />
        <CardTitle className="text-lg">Welcome to First Smile AI</CardTitle>
        <p className="text-sm text-muted-foreground">Your digital dental assistant</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted/30 rounded-lg">
          <p className="text-sm leading-relaxed">
            <strong>Privacy & Data Policy:</strong> We collect your name, contact details, and appointment information to manage your bookings and assist your dentist. You can withdraw consent at any time.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onDecline} className="flex-1">
            I Do Not Accept
          </Button>
          <Button onClick={onAccept} className="flex-1">
            I Accept
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Inline Calendar Widget with Vacation Detection
const InlineCalendarWidget = ({ 
  selectedDate, 
  onDateSelect, 
  dentistName,
  dentistId
}: { 
  selectedDate?: Date; 
  onDateSelect: (date: Date) => void;
  dentistName?: string;
  dentistId?: string;
}) => {
  const [vacationDates, setVacationDates] = useState<Date[]>([]);
  const [unavailableDays, setUnavailableDays] = useState<number[]>([]);

  useEffect(() => {
    if (dentistId) {
      loadDentistAvailability();
    }
  }, [dentistId]);

  const loadDentistAvailability = async () => {
    if (!dentistId) return;

    try {
      // Fetch vacation days
      const { data: vacations } = await supabase
        .from('dentist_vacation_days')
        .select('start_date, end_date')
        .eq('dentist_id', dentistId)
        .eq('is_approved', true)
        .gte('end_date', format(new Date(), 'yyyy-MM-dd'));

      if (vacations) {
        const dates: Date[] = [];
        vacations.forEach(vacation => {
          const start = new Date(vacation.start_date);
          const end = new Date(vacation.end_date);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(new Date(d));
          }
        });
        setVacationDates(dates);
      }

      // Fetch unavailable days of week
      const { data: availability } = await supabase
        .from('dentist_availability')
        .select('day_of_week, is_available')
        .eq('dentist_id', dentistId);

      if (availability) {
        const unavailable = availability
          .filter(a => !a.is_available)
          .map(a => a.day_of_week);
        setUnavailableDays(unavailable);
      }
    } catch (error) {
      console.error('Error loading dentist availability:', error);
    }
  };

  const isDateDisabled = (date: Date) => {
    const today = startOfDay(new Date());
    // Can't book in the past
    return date < today;
  };

  const getDateModifiers = (date: Date) => {
    const isVacation = vacationDates.some(vDate => isSameDay(vDate, date));
    if (isVacation) {
      return { className: 'bg-red-100 text-red-500 line-through dark:bg-red-950 dark:text-red-400' };
    }
    return {};
  };

  return (
    <Card className="max-w-md mx-auto my-4 border-primary/20 shadow-lg">
      <CardHeader className="text-center">
        <CalendarIcon className="h-8 w-8 mx-auto text-primary mb-2" />
        <CardTitle className="text-lg">Select Date</CardTitle>
        {dentistName && (
          <p className="text-sm text-muted-foreground">{dentistName}</p>
        )}
        <div className="flex items-center justify-center gap-3 mt-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Vacation</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && onDateSelect(date)}
          disabled={isDateDisabled}
          modifiers={{
            vacation: vacationDates
          }}
          modifiersClassNames={{
            vacation: 'bg-red-100 text-red-600 line-through hover:bg-red-100 dark:bg-red-950 dark:text-red-400'
          }}
          className="rounded-lg border mx-auto"
        />
      </CardContent>
    </Card>
  );
};

// Time Slots Widget with Visual Indicators
const TimeSlotsWidget = ({ 
  slots, 
  selectedTime, 
  onTimeSelect, 
  loading = false 
}: { 
  slots: Array<{ time: string; available: boolean; reason?: string }>; 
  selectedTime?: string;
  onTimeSelect: (time: string) => void;
  loading?: boolean;
}) => {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getSlotStyle = (slot: { available: boolean; reason?: string }) => {
    if (slot.available) {
      return "bg-green-50 border-green-500 hover:bg-green-100 text-green-700 dark:bg-green-950 dark:border-green-700 dark:text-green-300";
    }
    
    switch (slot.reason) {
      case 'vacation':
        return "bg-red-50 border-red-300 text-red-400 cursor-not-allowed dark:bg-red-950 dark:border-red-800";
      case 'booked':
        return "bg-gray-50 border-gray-300 text-gray-400 cursor-not-allowed dark:bg-gray-900 dark:border-gray-700";
      case 'emergency_only':
        return "bg-orange-50 border-orange-300 text-orange-400 cursor-not-allowed dark:bg-orange-950 dark:border-orange-800";
      default:
        return "bg-gray-50 border-gray-300 text-gray-400 cursor-not-allowed dark:bg-gray-900 dark:border-gray-700";
    }
  };

  const getReasonLabel = (reason?: string) => {
    switch (reason) {
      case 'vacation':
        return 'On Vacation';
      case 'booked':
        return 'Booked';
      case 'emergency_only':
        return 'Emergency Only';
      case 'outside_hours':
        return 'Closed';
      default:
        return 'Unavailable';
    }
  };

  return (
    <Card className="max-w-md mx-auto my-4 border-primary/20 shadow-xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-4">
        <Clock className="h-10 w-10 mx-auto text-primary mb-3 drop-shadow-md" />
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Available Times</CardTitle>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 bg-green-500 rounded-full shadow-sm"></div>
            <span className="text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 bg-gray-400 rounded-full shadow-sm"></div>
            <span className="text-muted-foreground">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 bg-red-500 rounded-full shadow-sm"></div>
            <span className="text-muted-foreground">Vacation</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="animate-spin h-10 w-10 mx-auto text-primary drop-shadow-md" />
            <p className="text-sm text-muted-foreground mt-3">Loading availability...</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-10 w-10 mx-auto text-orange-500 mb-3 drop-shadow-md" />
            <p className="text-sm text-muted-foreground">No available time slots</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {slots.map((slot) => (
                <Button
                  key={slot.time}
                  variant="outline"
                  size="sm"
                  disabled={!slot.available}
                  onClick={() => slot.available && onTimeSelect(slot.time)}
                  className={`text-sm font-medium relative transition-all duration-200 ${
                    selectedTime === slot.time 
                      ? "ring-2 ring-primary shadow-lg scale-105" 
                      : getSlotStyle(slot)
                  }`}
                  title={!slot.available ? getReasonLabel(slot.reason) : undefined}
                >
                  {formatTime(slot.time)}
                  {!slot.available && (
                    <X className="absolute top-1 right-1 h-3 w-3 text-red-500" />
                  )}
                </Button>
              ))}
            </div>
            
            {slots.filter(s => s.available).length === 0 && (
              <div className="text-center py-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <Info className="h-5 w-5 mx-auto text-orange-600 dark:text-orange-400 mb-1" />
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  No available slots for this date. Try another day.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Dentist Selection Widget
const DentistSelectionWidget = ({
  dentists,
  onSelect,
  recommendedDentists
}: {
  dentists: Dentist[];
  onSelect: (dentist: Dentist) => void;
  recommendedDentists?: string[];
}) => {
  const isRecommended = (dentist: Dentist) => {
    if (!recommendedDentists) return false;
    const fullName = `${dentist.profiles?.first_name} ${dentist.profiles?.last_name}`;
    return recommendedDentists.includes(fullName);
  };
  return (
    <Card className="max-w-md mx-auto my-4 border-primary/20 shadow-lg">
      <CardHeader className="text-center">
        <UserIcon className="h-8 w-8 mx-auto text-primary mb-2" />
        <CardTitle className="text-lg">Choose Your Dentist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dentists.map((dentist) => (
          <Card key={dentist.id} className={`cursor-pointer hover:border-primary/50 transition-colors ${isRecommended(dentist) ? 'ring-2 ring-green-500' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="relative w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-primary" />
                  {isRecommended(dentist) && (
                    <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-green-500" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">
                    Dr. {dentist.profiles?.first_name} {dentist.profiles?.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{dentist.specialization}</p>
                  <Badge variant="secondary" className="text-xs mt-1">Available</Badge>
                </div>
                <Button size="sm" onClick={() => onSelect(dentist)}>
                  Select
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};

// Appointment Confirmation Widget
const AppointmentConfirmationWidget = ({
  appointment,
  onConfirm,
  onCancel,
  loading = false,
  summary
}: {
  appointment: Appointment;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  summary?: string;
}) => {
  return (
    <Card className="max-w-md mx-auto my-4 border-primary/20 shadow-lg">
      <CardHeader className="text-center">
        <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
        <CardTitle className="text-lg">Confirm Appointment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            <span>Dr. {appointment.dentist?.profiles?.first_name} {appointment.dentist?.profiles?.last_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>{format(appointment.date, "EEEE, MMMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{appointment.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <span>{appointment.reason || "General consultation"}</span>
          </div>
        </div>
        {summary && (
          <p className="text-sm whitespace-pre-wrap border-t pt-2">{summary}</p>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="flex-1">
            {loading ? "Booking..." : "Confirm"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Personal Info Form Widget
const PersonalInfoFormWidget = ({ 
  user, 
  onSave, 
  onCancel 
}: { 
  user: User; 
  onSave: (data: unknown) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    emergency_contact: '',
    medical_history: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          address: data.address || '',
          emergency_contact: data.emergency_contact || '',
          medical_history: data.medical_history || ''
        });
      }
    };
    loadProfile();
  }, [user.id]);

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name) {
      alert('First name and last name are required');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: formData.phone?.trim() || null,
          address: formData.address?.trim() || null,
          emergency_contact: formData.emergency_contact?.trim() || null,
          medical_history: formData.medical_history?.trim() || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;
      onSave(formData);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto my-4 border-primary/20 shadow-lg">
      <CardHeader className="text-center">
        <Edit className="h-8 w-8 mx-auto text-primary mb-2" />
        <CardTitle className="text-lg">Update Personal Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="firstName" className="text-sm">First Name</Label>
            <Input
              id="firstName"
              value={formData.first_name}
              onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              className="text-sm"
            />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-sm">Last Name</Label>
            <Input
              id="lastName"
              value={formData.last_name}
              onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              className="text-sm"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="phone" className="text-sm">Phone Number</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="text-sm"
          />
        </div>

        <div>
          <Label htmlFor="address" className="text-sm">Address</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            className="text-sm"
          />
        </div>

        <div>
          <Label htmlFor="emergency" className="text-sm">Emergency Contact</Label>
          <Input
            id="emergency"
            value={formData.emergency_contact}
            onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
            placeholder="Name and phone number"
            className="text-sm"
          />
        </div>

        <div>
          <Label htmlFor="medical" className="text-sm">Medical History</Label>
          <Textarea
            id="medical"
            value={formData.medical_history}
            onChange={(e) => setFormData(prev => ({ ...prev, medical_history: e.target.value }))}
            placeholder="Allergies, medications, conditions..."
            className="text-sm min-h-[80px]"
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="flex-1">
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Quick Settings Widget
const QuickSettingsWidget = ({ 
  onLanguageChange, 
  onThemeChange 
}: { 
  onLanguageChange: (lang: string) => void;
  onThemeChange: (theme: string) => void;
}) => {
  const { currentLanguage } = useLanguage();
  const { theme } = useTheme();

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' }
  ];

  return (
    <Card className="max-w-md mx-auto my-4 border-primary/20 shadow-lg">
      <CardHeader className="text-center">
        <Globe className="h-8 w-8 mx-auto text-primary mb-2" />
        <CardTitle className="text-lg">Quick Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Language</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {languages.map((lang) => (
              <Button
                key={lang.code}
                variant={currentLanguage === lang.code ? "default" : "outline"}
                size="sm"
                onClick={() => onLanguageChange(lang.code)}
                className="flex items-center gap-1"
              >
                <span>{lang.flag}</span>
                <span className="text-xs">{lang.name}</span>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-sm font-medium">Theme</Label>
          <div className="flex gap-2 mt-2">
            <Button
              variant={theme === 'light' ? "default" : "outline"}
              size="sm"
              onClick={() => onThemeChange('light')}
              className="flex-1 flex items-center gap-2"
            >
              <Sun className="h-4 w-4" />
              Light
            </Button>
            <Button
              variant={theme === 'dark' ? "default" : "outline"}
              size="sm"
              onClick={() => onThemeChange('dark')}
              className="flex-1 flex items-center gap-2"
            >
              <Moon className="h-4 w-4" />
              Dark
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Image Upload Widget
const ImageUploadWidget = ({ 
  onUpload, 
  onCancel 
}: { 
  onUpload: (file: File) => void;
  onCancel: () => void;
}) => {
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  return (
    <Card className="max-w-md mx-auto my-4 border-primary/20 shadow-lg">
      <CardHeader className="text-center">
        <Camera className="h-8 w-8 mx-auto text-primary mb-2" />
        <CardTitle className="text-lg">Upload Image</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-gray-300'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <FileImage className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop your image here, or click to select
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            Select Image
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Urgency Slider Widget
const UrgencySliderWidget = ({ 
  value, 
  onChange 
}: { 
  value: number;
  onChange: (value: number) => void;
}) => {
  const [sliderValue, setSliderValue] = useState([value]);

  const handleSliderChange = (newValue: number[]) => {
    setSliderValue(newValue);
  };

  const handleConfirm = () => {
    onChange(sliderValue[0]);
  };

  const getUrgencyLabel = (val: number) => {
    switch (val) {
      case 1: return 'Low - General check-up';
      case 2: return 'Routine - Mild discomfort';
      case 3: return 'Medium - Noticeable pain';
      case 4: return 'High - Significant pain';
      case 5: return 'Emergency - Severe pain';
      default: return 'Medium';
    }
  };

  const getUrgencyColor = (val: number) => {
    if (val <= 2) return 'text-green-600';
    if (val <= 3) return 'text-yellow-600';
    if (val <= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <Card className="max-w-md mx-auto my-4 border-primary/20 shadow-lg">
      <CardHeader className="text-center">
        <AlertTriangle className="h-8 w-8 mx-auto text-orange-500 mb-2" />
        <CardTitle className="text-lg">How urgent is your appointment?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="text-center">
            <div className={`text-lg font-semibold ${getUrgencyColor(sliderValue[0])}`}>
              Level {sliderValue[0]}: {getUrgencyLabel(sliderValue[0])}
            </div>
          </div>
          
          <div className="px-4">
            <Slider
              value={sliderValue}
              onValueChange={handleSliderChange}
              max={5}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Low</span>
              <span>Medium</span>
              <span>Emergency</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleConfirm} className="flex-1">
            Continue with Level {sliderValue[0]}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Pay Now Widget
const PayNowWidget = ({ 
  outstandingAmount, 
  onPay, 
  onCancel 
}: { 
  outstandingAmount: number; 
  onPay: () => void;
  onCancel: () => void;
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = async () => {
    setIsProcessing(true);
    try {
      await onPay();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto my-4 border-primary/20 shadow-lg">
      <CardHeader className="text-center">
        <div className="h-8 w-8 mx-auto text-red-500 mb-2 rounded-full bg-red-50 flex items-center justify-center">
          €
        </div>
        <CardTitle className="text-lg">Outstanding Balance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">
            €{(outstandingAmount / 100).toFixed(2)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Total amount due
          </p>
        </div>
        
        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
          <p className="text-sm text-orange-800">
            Pay your outstanding balance securely with Stripe. You'll be redirected to a secure payment page.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onCancel} 
            className="flex-1"
            disabled={isProcessing}
          >
            Not Now
          </Button>
          <Button 
            onClick={handlePay} 
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-70"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Pay Now'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Reschedule Widget
const RescheduleWidget = ({ 
  appointment, 
  onReschedule, 
  onCancel 
}: { 
  appointment: any; 
  onReschedule: () => void;
  onCancel: () => void;
}) => {
  return (
    <Card className="max-w-md mx-auto my-4 border-primary/20 shadow-lg">
      <CardHeader className="text-center">
        <CalendarIcon className="h-8 w-8 mx-auto text-blue-500 mb-2" />
        <CardTitle className="text-lg">Reschedule Appointment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Current Appointment</h4>
          <div className="space-y-1 text-sm text-blue-800">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span>{formatClinicTime(appointment.appointment_date, "EEEE, MMMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{formatClinicTime(appointment.appointment_date, "h:mm a")}</span>
            </div>
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              <span>Dr. {appointment.dentist_name || 'Your dentist'}</span>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground text-center">
          I'll help you find a new date and time that works for you.
        </p>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Keep Current
          </Button>
          <Button onClick={onReschedule} className="flex-1">
            Reschedule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Cancel Appointment Widget
const CancelAppointmentWidget = ({ 
  appointment, 
  onConfirm, 
  onCancel 
}: { 
  appointment: any; 
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  return (
    <Card className="max-w-md mx-auto my-4 border-red-200 shadow-lg">
      <CardHeader className="text-center">
        <AlertTriangle className="h-8 w-8 mx-auto text-red-500 mb-2" />
        <CardTitle className="text-lg text-red-700">Cancel Appointment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <h4 className="font-medium text-red-900 mb-2">Appointment to Cancel</h4>
          <div className="space-y-1 text-sm text-red-800">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span>{formatClinicTime(appointment.appointment_date, "EEEE, MMMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{formatClinicTime(appointment.appointment_date, "h:mm a")}</span>
            </div>
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              <span>Dr. {appointment.dentist_name || 'Your dentist'}</span>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>Please note:</strong> Cancelling less than 24 hours before your appointment may incur a cancellation fee.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Keep Appointment
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="flex-1">
            Cancel Appointment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Prescription Refill Widget
const PrescriptionRefillWidget = ({ 
  prescriptions, 
  onRequestRefill, 
  onCancel 
}: { 
  prescriptions: any[]; 
  onRequestRefill: (prescriptionId: string) => void;
  onCancel: () => void;
}) => {
  return (
    <Card className="max-w-md mx-auto my-4 border-primary/20 shadow-lg">
      <CardHeader className="text-center">
        <div className="h-8 w-8 mx-auto text-green-600 mb-2 rounded-full bg-green-50 flex items-center justify-center">
          💊
        </div>
        <CardTitle className="text-lg">Request Prescription Refill</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {prescriptions.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              No recent prescriptions found. Please contact your dentist directly.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground text-center">
              Select a prescription to request a refill:
            </p>
            
            <div className="space-y-2">
              {prescriptions.map((prescription) => (
                <Card key={prescription.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{prescription.medication_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {prescription.dosage} - {prescription.frequency}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Prescribed: {format(new Date(prescription.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => onRequestRefill(prescription.id)}
                        className="ml-2"
                      >
                        Request Refill
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          {prescriptions.length === 0 && (
            <Button variant="outline" className="flex-1">
              Contact Dentist
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export { 
  PrivacyConsentWidget,
  InlineCalendarWidget,
  TimeSlotsWidget,
  DentistSelectionWidget,
  AppointmentConfirmationWidget,
  PersonalInfoFormWidget,
  QuickSettingsWidget,
  ImageUploadWidget,
  UrgencySliderWidget,
  PayNowWidget,
  RescheduleWidget,
  CancelAppointmentWidget,
  PrescriptionRefillWidget
};