/**
 * Appointment Reminder Email Template
 * HTML email template for appointment reminders
 */

interface AppointmentReminderEmailProps {
  patientName: string;
  dentistName: string;
  clinicName: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  cancelLink?: string;
  rescheduleLink?: string;
}

export function generateAppointmentReminderEmail(props: AppointmentReminderEmailProps): string {
  const {
    patientName,
    dentistName,
    clinicName,
    appointmentDate,
    appointmentTime,
    appointmentType = "Dental Appointment",
    clinicAddress,
    clinicPhone,
    cancelLink,
    rescheduleLink,
  } = props;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Reminder</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f7f9fc;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .message {
      color: #4b5563;
      margin-bottom: 30px;
      font-size: 16px;
    }
    .appointment-card {
      background: linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%);
      border-left: 4px solid #2563eb;
      padding: 25px;
      margin: 30px 0;
      border-radius: 8px;
    }
    .appointment-detail {
      display: flex;
      margin: 12px 0;
      align-items: flex-start;
    }
    .detail-label {
      font-weight: 600;
      color: #1f2937;
      min-width: 140px;
      font-size: 14px;
    }
    .detail-value {
      color: #4b5563;
      font-size: 14px;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 8px;
      transition: background-color 0.3s;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .button-secondary {
      background-color: #ffffff;
      color: #2563eb !important;
      border: 2px solid #2563eb;
    }
    .button-secondary:hover {
      background-color: #eff6ff;
    }
    .info-box {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box p {
      margin: 0;
      color: #92400e;
      font-size: 14px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      border-top: 1px solid #e5e7eb;
    }
    .footer a {
      color: #2563eb;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 30px 0;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      .button {
        display: block;
        margin: 10px 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🦷 Appointment Reminder</h1>
    </div>

    <!-- Content -->
    <div class="content">
      <p class="greeting">Hi ${patientName},</p>

      <p class="message">
        This is a friendly reminder about your upcoming appointment with <strong>${dentistName}</strong>
        at <strong>${clinicName}</strong>.
      </p>

      <!-- Appointment Details Card -->
      <div class="appointment-card">
        <div class="appointment-detail">
          <span class="detail-label">📅 Date:</span>
          <span class="detail-value"><strong>${appointmentDate}</strong></span>
        </div>
        <div class="appointment-detail">
          <span class="detail-label">🕐 Time:</span>
          <span class="detail-value"><strong>${appointmentTime}</strong></span>
        </div>
        <div class="appointment-detail">
          <span class="detail-label">👨‍⚕️ Dentist:</span>
          <span class="detail-value">${dentistName}</span>
        </div>
        <div class="appointment-detail">
          <span class="detail-label">🏥 Clinic:</span>
          <span class="detail-value">${clinicName}</span>
        </div>
        ${appointmentType ? `
        <div class="appointment-detail">
          <span class="detail-label">📋 Type:</span>
          <span class="detail-value">${appointmentType}</span>
        </div>
        ` : ''}
        ${clinicAddress ? `
        <div class="appointment-detail">
          <span class="detail-label">📍 Location:</span>
          <span class="detail-value">${clinicAddress}</span>
        </div>
        ` : ''}
        ${clinicPhone ? `
        <div class="appointment-detail">
          <span class="detail-label">📞 Phone:</span>
          <span class="detail-value">${clinicPhone}</span>
        </div>
        ` : ''}
      </div>

      <!-- Important Notice -->
      <div class="info-box">
        <p>
          <strong>⏰ Please arrive 10 minutes early</strong> to complete any necessary paperwork.
        </p>
      </div>

      <!-- Action Buttons -->
      ${rescheduleLink || cancelLink ? `
      <div class="button-container">
        ${rescheduleLink ? `
        <a href="${rescheduleLink}" class="button button-secondary">
          Reschedule Appointment
        </a>
        ` : ''}
        ${cancelLink ? `
        <a href="${cancelLink}" class="button button-secondary">
          Cancel Appointment
        </a>
        ` : ''}
      </div>
      ` : ''}

      <div class="divider"></div>

      <p class="message">
        If you have any questions or need to make changes to your appointment,
        please don't hesitate to contact us${clinicPhone ? ` at ${clinicPhone}` : ''}.
      </p>

      <p class="message">
        We look forward to seeing you!
      </p>

      <p style="color: #6b7280; margin-top: 30px;">
        Best regards,<br>
        <strong>${clinicName}</strong>
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>
        Powered by <strong>Caberu</strong><br>
        <a href="https://Caberu.com">www.Caberu.com</a>
      </p>
      <p style="margin-top: 15px; font-size: 12px;">
        This is an automated reminder. Please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Example usage function
export function sendAppointmentReminder(props: AppointmentReminderEmailProps) {
  const htmlContent = generateAppointmentReminderEmail(props);

  // This would be called from your backend/Supabase Edge Function
  return {
    to: props.patientName, // Replace with actual email
    subject: `Reminder: Your appointment on ${props.appointmentDate}`,
    html: htmlContent,
  };
}
