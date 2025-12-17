import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { emitAnalyticsEvent } from "@/lib/analyticsEvents";

interface MissingField {
  key: string;
  question: string;
  type: "text" | "date";
  table: "profiles" | "dentists";
}

interface DentistData {
  clinic_address?: string;
  specialization?: string;
}

interface ProfileData {
  id: string;
  role: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  emergency_contact?: string;
  dentists?: DentistData[];
}

const ProfileCompletionDialog = () => {
  const [open, setOpen] = useState(false);
  const [profileId, setProfileId] = useState<string>("");
  const [missingFields, setMissingFields] = useState<MissingField[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [value, setValue] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);

  // Don't show profile completion during business creation or onboarding flows
  const isBusinessCreationFlow = window.location.pathname === '/create-business';
  const isOnboardingPage = window.location.pathname === '/onboarding';

  const checkProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        `id, role, first_name, last_name, phone, date_of_birth, address, emergency_contact, profile_completion_status, import_session_id,
         dentists(clinic_address, specialization)`
      )
      .eq("user_id", userId)
      .single();

    if (error || !data) return;

    setProfileId(data.id);

    // Only show completion dialog if profile is marked as incomplete or if critical fields are missing
    const isImportedProfile = data.import_session_id !== null;
    const isIncomplete = data.profile_completion_status === 'incomplete';

    const fields: MissingField[] = [];
    const criticalFields: MissingField[] = [
      { key: "first_name", question: "What's your first name?", type: "text", table: "profiles" },
      { key: "last_name", question: "And your last name?", type: "text", table: "profiles" },
    ];

    const optionalFields: MissingField[] = [
      { key: "phone", question: "What's your phone number?", type: "text", table: "profiles" },
      { key: "date_of_birth", question: "What is your date of birth?", type: "date", table: "profiles" },
      { key: "address", question: "Your address?", type: "text", table: "profiles" },
    ];

    // Check critical fields (always required)
    criticalFields.forEach((f) => {
      if (!data[f.key as keyof typeof data]) fields.push(f);
    });

    // For imported profiles or incomplete status, ask for optional fields too
    if (isImportedProfile || isIncomplete) {
      optionalFields.forEach((f) => {
        if (!data[f.key as keyof typeof data]) fields.push(f);
      });
    }

    if (data.role === "patient") {
      if (!data.emergency_contact && (isImportedProfile || isIncomplete)) {
        fields.push({
          key: "emergency_contact",
          question: "Emergency contact information?",
          type: "text",
          table: "profiles",
        });
      }
    } else if (data.role === "dentist") {
      // Only prompt dentist-specific fields during initial/incomplete onboarding
      if (isImportedProfile || isIncomplete) {
        const typedData = data as ProfileData;
        const dentist = typedData.dentists?.[0];
        if (!dentist?.clinic_address) {
          fields.push({
            key: "clinic_address",
            question: "Clinic address?",
            type: "text",
            table: "dentists",
          });
        }
        if (!dentist?.specialization) {
          fields.push({
            key: "specialization",
            question: "What is your specialty?",
            type: "text",
            table: "dentists",
          });
        }
      }
    }

    if (fields.length > 0) {
      setMissingFields(fields);
      setOpen(true);
    }
  };

  useEffect(() => {
    // Skip profile completion check during business creation or onboarding
    if (isBusinessCreationFlow || isOnboardingPage) return;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        checkProfile(session.user.id);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && !isBusinessCreationFlow && !isOnboardingPage) {
        checkProfile(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isBusinessCreationFlow, isOnboardingPage]);

  const handleNext = async () => {
    const field = missingFields[currentIndex];
    if (!field) return;

    let updateQuery: any;
    const updateData: any = { [field.key]: value };

    if (field.table === "profiles") {
      // If this is the last field, mark profile as complete
      if (currentIndex === missingFields.length - 1) {
        updateData.profile_completion_status = 'complete';
      }

      updateQuery = supabase
        .from("profiles")
        .update(updateData)
        .eq("id", profileId);
    } else {
      updateQuery = supabase
        .from("dentists")
        .update(updateData)
        .eq("profile_id", profileId);
    }

    const { error } = await updateQuery;
    if (error) return;

    setValue("");
    const next = currentIndex + 1;
    if (next < missingFields.length) {
      setCurrentIndex(next);
    } else {
      // Mark profile as complete if not already done
      if (field.table !== "profiles") {
        await supabase
          .from("profiles")
          .update({ profile_completion_status: 'complete' })
          .eq("id", profileId);
      }

      // Telemetry: profile completion finished
      await emitAnalyticsEvent('PROFILE_COMPLETION_FINISHED', 'unknown', { missing_fields_count: missingFields.length });

      setCompleted(true);
      setTimeout(() => {
        setOpen(false);
        setCurrentIndex(0);
        setMissingFields([]);
      }, 1500);
    }
  };

  const field = missingFields[currentIndex];

  return (
    <Dialog open={open}>
      <DialogContent>
        {!completed && field && (
          <>
            <DialogHeader>
              <DialogTitle>Complete your profile</DialogTitle>
              <DialogDescription>We’re missing a few details. Please review and fill in what’s left.</DialogDescription>
            </DialogHeader>
            <div className="mt-2 text-sm font-medium">{field.question}</div>
            {field.type === "text" && (
              <Input value={value} onChange={(e) => setValue(e.target.value)} />
            )}
            {field.type === "date" && (
              <Input type="date" value={value} onChange={(e) => setValue(e.target.value)} />
            )}
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleNext}
              >
                Next
              </Button>
            </div>
          </>
        )}
        {completed && (
          <div className="py-8 text-center">
            <DialogHeader>
              <DialogTitle>
                {missingFields.length > 3
                  ? "Welcome! Profile setup complete."
                  : "Profile updated successfully!"}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mt-2">
              {missingFields.length > 3
                ? "Thank you for completing your profile. You now have full access to the platform."
                : "Your profile information has been updated."}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProfileCompletionDialog;
