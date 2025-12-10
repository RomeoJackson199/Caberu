export interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    date_of_birth?: string;
    address?: string;
    medical_history?: string;
    emergency_contact?: string;
    profile_picture_url?: string;
}

export interface Appointment {
    id: string;
    appointment_date: string;
    duration_minutes: number;
    status: string;
    urgency: string;
    reason?: string;
    consultation_notes?: string;
}

export interface TreatmentPlan {
    id: string;
    title: string;
    description?: string;
    diagnosis?: string;
    status: string;
    priority: string;
    estimated_cost?: number;
    estimated_duration_weeks?: number;
    start_date?: string;
    end_date?: string;
    notes?: string;
    created_at: string;
}

export interface Prescription {
    id: string;
    medication_name: string;
    dosage: string;
    frequency: string;
    duration_days?: number;
    instructions?: string;
    status: string;
    prescribed_date: string;
    created_at: string;
}

export interface PatientNote {
    id: string;
    title: string;
    content: string;
    note_type: string;
    is_private: boolean;
    created_at: string;
}
