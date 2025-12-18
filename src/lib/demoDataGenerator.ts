import { supabase } from "@/integrations/supabase/client";
import { addDays, subDays, startOfDay, setHours, setMinutes } from "date-fns";
import { logger } from '@/lib/logger';

/**
 * Demo Data Generator for New Dentists
 * Creates realistic sample data to help dentists explore the platform
 */

interface DemoDataOptions {
  businessId: string;
  userId: string;
  numberOfPatients?: number;
  numberOfAppointments?: number;
}

interface DemoDataResult {
  success: boolean;
  message: string;
  data?: {
    patientsCreated: number;
    appointmentsCreated: number;
    medicalRecordsCreated: number;
  };
  error?: string;
}

// Sample patient data
const firstNames = [
  "Sarah", "John", "Emily", "Michael", "Jessica", "David", "Amanda", "Robert",
  "Lisa", "James", "Jennifer", "William", "Maria", "Richard", "Patricia", "Thomas",
  "Linda", "Christopher", "Susan", "Daniel", "Margaret", "Matthew", "Nancy", "Anthony"
];

const lastNames = [
  "Johnson", "Smith", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas", "Taylor",
  "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris", "Clark"
];

const reasons = [
  "Routine Checkup",
  "Teeth Cleaning",
  "Tooth Pain",
  "Follow-up Visit",
  "Root Canal Consultation",
  "Dental Crown Fitting",
  "Teeth Whitening",
  "Cavity Filling",
  "Dental Emergency",
  "Orthodontic Consultation",
  "Wisdom Teeth Removal",
  "Gum Treatment",
];

const urgencyLevels = ["low", "medium", "high", "emergency"] as const;
const statusOptions = ["scheduled", "confirmed", "completed", "cancelled"] as const;

/**
 * Generates a random email address
 */
function generateEmail(firstName: string, lastName: string): string {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com"];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
}

/**
 * Generates a random phone number in format (XXX) XXX-XXXX
 */
function generatePhoneNumber(): string {
  const area = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const line = Math.floor(Math.random() * 9000) + 1000;
  return `(${area}) ${prefix}-${line}`;
}

/**
 * Generates a random date of birth (ages 18-80)
 */
function generateDateOfBirth(): string {
  const yearsAgo = Math.floor(Math.random() * 62) + 18; // 18-80 years old
  const date = subDays(new Date(), yearsAgo * 365);
  return date.toISOString().split('T')[0];
}

/**
 * Generates realistic appointment times (9 AM - 5 PM)
 */
function generateAppointmentTime(daysOffset: number): Date {
  const baseDate = addDays(startOfDay(new Date()), daysOffset);
  const hour = Math.floor(Math.random() * 8) + 9; // 9 AM - 5 PM
  const minute = Math.random() < 0.5 ? 0 : 30; // 00 or 30 minutes
  return setMinutes(setHours(baseDate, hour), minute);
}

/**
 * Creates demo patients for a dentist
 */
async function createDemoPatients(
  businessId: string,
  userId: string,
  count: number
): Promise<any[]> {
  const patients: any[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    const patient = {
      business_id: businessId,
      first_name: firstName,
      last_name: lastName,
      email: generateEmail(firstName, lastName),
      phone: generatePhoneNumber(),
      date_of_birth: generateDateOfBirth(),
      address: `${Math.floor(Math.random() * 9999) + 100} Main Street`,
      city: "Demo City",
      state: "CA",
      zip_code: `${Math.floor(Math.random() * 90000) + 10000}`,
      emergency_contact_name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
      emergency_contact_phone: generatePhoneNumber(),
      insurance_provider: Math.random() > 0.3 ? "Blue Cross" : null,
      insurance_policy_number: Math.random() > 0.3 ? `POL${Math.floor(Math.random() * 1000000)}` : null,
      medical_notes: "Demo patient - No actual medical history",
      created_by: userId,
    };

    patients.push(patient);
  }

  // Insert all patients
  const { data, error } = await supabase
    .from("patients")
    .insert(patients)
    .select();

  if (error) {
    logger.error("Error creating demo patients:", error);
    throw error;
  }

  return data || [];
}

/**
 * Creates demo appointments for patients
 */
async function createDemoAppointments(
  businessId: string,
  userId: string,
  patients: any[],
  count: number
): Promise<any[]> {
  const appointments: any[] = [];

  // Create past appointments (completed)
  const pastCount = Math.floor(count * 0.4);
  for (let i = 0; i < pastCount; i++) {
    const patient = patients[Math.floor(Math.random() * patients.length)];
    const daysAgo = Math.floor(Math.random() * 60) + 1; // 1-60 days ago

    appointments.push({
      business_id: businessId,
      patient_id: patient.id,
      dentist_id: userId,
      appointment_date: generateAppointmentTime(-daysAgo).toISOString(),
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      urgency: urgencyLevels[Math.floor(Math.random() * 2)], // low or medium for past
      status: "completed",
      notes: "Demo appointment - completed",
      duration_minutes: 30 + Math.floor(Math.random() * 4) * 15, // 30, 45, 60, 75 minutes
    });
  }

  // Create today's appointments
  const todayCount = Math.floor(count * 0.3);
  for (let i = 0; i < todayCount; i++) {
    const patient = patients[Math.floor(Math.random() * patients.length)];

    appointments.push({
      business_id: businessId,
      patient_id: patient.id,
      dentist_id: userId,
      appointment_date: generateAppointmentTime(0).toISOString(),
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      urgency: urgencyLevels[Math.floor(Math.random() * urgencyLevels.length)],
      status: Math.random() > 0.2 ? "confirmed" : "scheduled",
      notes: "Demo appointment - scheduled for today",
      duration_minutes: 30 + Math.floor(Math.random() * 4) * 15,
    });
  }

  // Create future appointments
  const futureCount = count - pastCount - todayCount;
  for (let i = 0; i < futureCount; i++) {
    const patient = patients[Math.floor(Math.random() * patients.length)];
    const daysAhead = Math.floor(Math.random() * 30) + 1; // 1-30 days ahead

    appointments.push({
      business_id: businessId,
      patient_id: patient.id,
      dentist_id: userId,
      appointment_date: generateAppointmentTime(daysAhead).toISOString(),
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      urgency: urgencyLevels[Math.floor(Math.random() * 3)], // low, medium, or high
      status: Math.random() > 0.3 ? "confirmed" : "scheduled",
      notes: "Demo appointment - upcoming",
      duration_minutes: 30 + Math.floor(Math.random() * 4) * 15,
    });
  }

  // Insert all appointments
  const { data, error } = await supabase
    .from("appointments")
    .insert(appointments)
    .select();

  if (error) {
    logger.error("Error creating demo appointments:", error);
    throw error;
  }

  return data || [];
}

/**
 * Creates demo medical records for patients
 */
async function createDemoMedicalRecords(
  businessId: string,
  userId: string,
  patients: any[]
): Promise<any[]> {
  const records: any[] = [];

  // Create 2-3 medical records per patient
  for (const patient of patients) {
    const recordCount = Math.floor(Math.random() * 2) + 2; // 2-3 records

    for (let i = 0; i < recordCount; i++) {
      const daysAgo = Math.floor(Math.random() * 90) + 1; // 1-90 days ago

      records.push({
        business_id: businessId,
        patient_id: patient.id,
        record_date: subDays(new Date(), daysAgo).toISOString(),
        diagnosis: reasons[Math.floor(Math.random() * reasons.length)],
        treatment: "Demo treatment - standard procedure",
        prescriptions: Math.random() > 0.5 ? "Amoxicillin 500mg, 3x daily for 7 days" : null,
        notes: "Demo medical record - no actual patient data",
        created_by: userId,
      });
    }
  }

  // Insert all medical records
  const { data, error } = await supabase
    .from("medical_records")
    .insert(records)
    .select();

  if (error) {
    logger.error("Error creating demo medical records:", error);
    // Don't throw - medical records are optional
    return [];
  }

  return data || [];
}

/**
 * Main function to generate all demo data
 */
export async function generateDemoData(
  options: DemoDataOptions
): Promise<DemoDataResult> {
  const {
    businessId,
    userId,
    numberOfPatients = 15,
    numberOfAppointments = 25,
  } = options;

  try {
    logger.debug("🎭 Generating demo data...");

    // Step 1: Create demo patients
    logger.debug(`📋 Creating ${numberOfPatients} demo patients...`);
    const patients = await createDemoPatients(businessId, userId, numberOfPatients);
    logger.debug(`✅ Created ${patients.length} demo patients`);

    // Step 2: Create demo appointments
    logger.debug(`📅 Creating ${numberOfAppointments} demo appointments...`);
    const appointments = await createDemoAppointments(
      businessId,
      userId,
      patients,
      numberOfAppointments
    );
    logger.debug(`✅ Created ${appointments.length} demo appointments`);

    // Step 3: Create demo medical records
    logger.debug(`📄 Creating demo medical records...`);
    const medicalRecords = await createDemoMedicalRecords(businessId, userId, patients);
    logger.debug(`✅ Created ${medicalRecords.length} demo medical records`);

    // Mark demo data as created in localStorage (column doesn't exist in database)
    localStorage.setItem("demo-data-generated", "true");

    return {
      success: true,
      message: `Successfully created ${patients.length} patients, ${appointments.length} appointments, and ${medicalRecords.length} medical records!`,
      data: {
        patientsCreated: patients.length,
        appointmentsCreated: appointments.length,
        medicalRecordsCreated: medicalRecords.length,
      },
    };
  } catch (error: any) {
    logger.error("❌ Error generating demo data:", error);
    return {
      success: false,
      message: "Failed to generate demo data",
      error: error.message,
    };
  }
}

/**
 * Clears all demo data for a user
 */
export async function clearDemoData(
  businessId: string,
  userId: string
): Promise<DemoDataResult> {
  try {
    logger.debug("🗑️ Clearing demo data...");

    // Delete in correct order (appointments first, then medical records, then patients)
    await supabase
      .from("appointments")
      .delete()
      .eq("business_id", businessId)
      .contains("notes", "Demo appointment");

    await supabase
      .from("medical_records")
      .delete()
      .eq("business_id", businessId)
      .contains("notes", "Demo medical record");

    await supabase
      .from("patients")
      .delete()
      .eq("business_id", businessId)
      .contains("medical_notes", "Demo patient");

    // Clear demo data flag (using localStorage since column doesn't exist)
    localStorage.removeItem("demo-data-generated");

    return {
      success: true,
      message: "Demo data cleared successfully",
    };
  } catch (error: any) {
    logger.error("❌ Error clearing demo data:", error);
    return {
      success: false,
      message: "Failed to clear demo data",
      error: error.message,
    };
  }
}
