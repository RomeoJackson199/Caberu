/**
 * CSV/Excel Export Utilities
 * Provides functions to export data to CSV and Excel formats
 */
import { formatClinicTime } from '@/lib/timezone';

interface ExportOptions {
  filename?: string;
  sheetName?: string;
  headers?: string[];
}

/**
 * Convert array of objects to CSV string
 */
export function convertToCSV(data: any[], headers?: string[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Use provided headers or extract from first object
  const keys = headers || Object.keys(data[0]);

  // Create header row
  const headerRow = keys.join(',');

  // Create data rows
  const dataRows = data.map(item => {
    return keys.map(key => {
      const value = item[key];

      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }

      // Handle dates
      if (value instanceof Date) {
        return value.toISOString();
      }

      // Handle strings with commas, quotes, or newlines
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(data: any[], options: ExportOptions = {}): void {
  const { filename = 'export.csv', headers } = options;

  const csv = convertToCSV(data, headers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Export patients to CSV
 */
export function exportPatientsToCSV(patients: any[]): void {
  const headers = [
    'id',
    'first_name',
    'last_name',
    'email',
    'phone',
    'date_of_birth',
    'gender',
    'address',
    'city',
    'postal_code',
    'emergency_contact_name',
    'emergency_contact_phone',
    'created_at',
  ];

  const formattedData = patients.map(patient => ({
    id: patient.id,
    first_name: patient.first_name || '',
    last_name: patient.last_name || '',
    email: patient.email || '',
    phone: patient.phone || '',
    date_of_birth: patient.date_of_birth || '',
    gender: patient.gender || '',
    address: patient.address || '',
    city: patient.city || '',
    postal_code: patient.postal_code || '',
    emergency_contact_name: patient.emergency_contact_name || '',
    emergency_contact_phone: patient.emergency_contact_phone || '',
    created_at: patient.created_at ? new Date(patient.created_at).toLocaleDateString() : '',
  }));

  const filename = `patients_export_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(formattedData, { filename, headers });
}

/**
 * Export appointments to CSV
 */
export function exportAppointmentsToCSV(appointments: any[]): void {
  const headers = [
    'id',
    'patient_name',
    'dentist_name',
    'appointment_date',
    'appointment_time',
    'duration',
    'status',
    'type',
    'notes',
    'created_at',
  ];

  const formattedData = appointments.map(apt => {
    // appointment_date is a timestamp - extract date and time separately
    const dateStr = apt.appointment_date ? formatClinicTime(apt.appointment_date, 'dd/MM/yyyy') : '';
    const timeStr = apt.appointment_date ? formatClinicTime(apt.appointment_date, 'HH:mm') : '';

    return {
      id: apt.id,
      patient_name: apt.patient_name || `${apt.patient?.first_name || ''} ${apt.patient?.last_name || ''}`.trim(),
      dentist_name: apt.dentist_name || `${apt.dentist?.first_name || ''} ${apt.dentist?.last_name || ''}`.trim(),
      appointment_date: dateStr,
      appointment_time: timeStr,
      duration: apt.duration_minutes ? `${apt.duration_minutes} minutes` : '',
      status: apt.status || '',
      type: apt.appointment_type || '',
      notes: apt.notes || '',
      created_at: apt.created_at ? new Date(apt.created_at).toLocaleDateString() : '',
    };
  });

  const filename = `appointments_export_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(formattedData, { filename, headers });
}

/**
 * Export prescriptions to CSV
 */
export function exportPrescriptionsToCSV(prescriptions: any[]): void {
  const headers = [
    'id',
    'patient_name',
    'medication_name',
    'dosage',
    'frequency',
    'duration',
    'instructions',
    'prescribed_date',
    'dentist_name',
  ];

  const formattedData = prescriptions.map(rx => ({
    id: rx.id,
    patient_name: rx.patient_name || `${rx.patient?.first_name || ''} ${rx.patient?.last_name || ''}`.trim(),
    medication_name: rx.medication_name || '',
    dosage: rx.dosage || '',
    frequency: rx.frequency || '',
    duration: rx.duration || '',
    instructions: rx.instructions || '',
    prescribed_date: rx.prescribed_date ? new Date(rx.prescribed_date).toLocaleDateString() : '',
    dentist_name: rx.dentist_name || `${rx.dentist?.first_name || ''} ${rx.dentist?.last_name || ''}`.trim(),
  }));

  const filename = `prescriptions_export_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(formattedData, { filename, headers });
}

/**
 * Export payment requests to CSV
 */
export function exportPaymentRequestsToCSV(payments: any[]): void {
  const headers = [
    'id',
    'patient_name',
    'amount',
    'status',
    'description',
    'due_date',
    'paid_date',
    'payment_method',
    'created_at',
  ];

  const formattedData = payments.map(payment => ({
    id: payment.id,
    patient_name: payment.patient_name || `${payment.patient?.first_name || ''} ${payment.patient?.last_name || ''}`.trim(),
    amount: payment.amount ? `$${payment.amount.toFixed(2)}` : '',
    status: payment.status || '',
    description: payment.description || '',
    due_date: payment.due_date ? new Date(payment.due_date).toLocaleDateString() : '',
    paid_date: payment.paid_date ? new Date(payment.paid_date).toLocaleDateString() : '',
    payment_method: payment.payment_method || '',
    created_at: payment.created_at ? new Date(payment.created_at).toLocaleDateString() : '',
  }));

  const filename = `payments_export_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(formattedData, { filename, headers });
}

/**
 * Export inventory items to CSV
 */
export function exportInventoryToCSV(items: any[]): void {
  const headers = [
    'id',
    'name',
    'category',
    'quantity',
    'unit',
    'reorder_level',
    'cost_per_unit',
    'supplier',
    'last_restocked',
  ];

  const formattedData = items.map(item => ({
    id: item.id,
    name: item.name || '',
    category: item.category || '',
    quantity: item.quantity || 0,
    unit: item.unit || '',
    reorder_level: item.reorder_level || '',
    cost_per_unit: item.cost_per_unit ? `$${item.cost_per_unit.toFixed(2)}` : '',
    supplier: item.supplier || '',
    last_restocked: item.last_restocked_date ? new Date(item.last_restocked_date).toLocaleDateString() : '',
  }));

  const filename = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(formattedData, { filename, headers });
}

/**
 * Export generic data to CSV (for custom exports)
 */
export function exportGenericDataToCSV(
  data: any[],
  filename: string = 'data_export.csv',
  customHeaders?: string[]
): void {
  downloadCSV(data, { filename, headers: customHeaders });
}
