/**
 * Welcome Email Template
 * Sent to new users when they create an account
 */

interface WelcomeEmailProps {
  userName: string;
  userType: 'patient' | 'dentist';
  loginLink: string;
  dashboardLink: string;
  supportLink?: string;
}

export function generateWelcomeEmail(props: WelcomeEmailProps): string {
  const {
    userName,
    userType,
    loginLink,
    dashboardLink,
    supportLink = "https://Caberu.com/support",
  } = props;

  const isDentist = userType === 'dentist';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Caberu!</title>
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
      padding: 50px 30px;
      text-align: center;
    }
    .logo {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 32px;
      font-weight: 700;
    }
    .header p {
      color: #dbeafe;
      margin: 10px 0 0 0;
      font-size: 16px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 24px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .message {
      color: #4b5563;
      margin-bottom: 20px;
      font-size: 16px;
      line-height: 1.8;
    }
    .cta-button {
      display: inline-block;
      padding: 16px 40px;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 18px;
      margin: 20px 0;
      text-align: center;
    }
    .cta-button:hover {
      background-color: #1d4ed8;
    }
    .features {
      margin: 30px 0;
    }
    .feature-item {
      display: flex;
      align-items: flex-start;
      margin: 15px 0;
      padding: 15px;
      background-color: #f9fafb;
      border-radius: 8px;
    }
    .feature-icon {
      font-size: 24px;
      margin-right: 15px;
      flex-shrink: 0;
    }
    .feature-content h3 {
      margin: 0 0 5px 0;
      color: #1f2937;
      font-size: 16px;
    }
    .feature-content p {
      margin: 0;
      color: #6b7280;
      font-size: 14px;
    }
    .help-section {
      background: linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%);
      border-left: 4px solid #2563eb;
      padding: 20px;
      margin: 30px 0;
      border-radius: 8px;
    }
    .help-section h3 {
      margin: 0 0 10px 0;
      color: #1f2937;
    }
    .help-section p {
      margin: 0;
      color: #4b5563;
    }
    .help-section a {
      color: #2563eb;
      text-decoration: none;
      font-weight: 600;
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
    .social-links {
      margin: 20px 0;
    }
    .social-links a {
      display: inline-block;
      margin: 0 10px;
      color: #2563eb;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      .greeting {
        font-size: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo">🦷</div>
      <h1>Welcome to Caberu!</h1>
      <p>${isDentist ? 'Transform Your Practice Management' : 'Your Dental Health Journey Starts Here'}</p>
    </div>

    <!-- Content -->
    <div class="content">
      <p class="greeting">Hi ${userName},</p>

      <p class="message">
        Welcome to Caberu! We're thrilled to have you join our community of ${isDentist ? 'dental professionals' : 'patients'}
        who are ${isDentist ? 'transforming their practice management' : 'taking control of their dental health'}.
      </p>

      <p class="message">
        ${isDentist
          ? 'Your account has been successfully created, and you\'re all set to streamline your practice operations, manage patients, and grow your business.'
          : 'Your account is ready, and you can now book appointments, view your dental records, and communicate with your dentist—all in one place.'}
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardLink}" class="cta-button">
          Go to Your Dashboard →
        </a>
      </div>

      <!-- Features Section -->
      <div class="features">
        <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 20px;">
          ${isDentist ? 'What You Can Do' : 'Get Started With'}
        </h2>

        ${isDentist ? `
        <div class="feature-item">
          <div class="feature-icon">📋</div>
          <div class="feature-content">
            <h3>Manage Patients</h3>
            <p>Complete patient records, treatment history, and medical information at your fingertips</p>
          </div>
        </div>

        <div class="feature-item">
          <div class="feature-icon">📅</div>
          <div class="feature-content">
            <h3>Smart Scheduling</h3>
            <p>Intelligent appointment calendar with AI-powered triage and automated reminders</p>
          </div>
        </div>

        <div class="feature-item">
          <div class="feature-icon">💳</div>
          <div class="feature-content">
            <h3>Billing & Payments</h3>
            <p>Track payments, send invoices, and manage practice revenue effortlessly</p>
          </div>
        </div>

        <div class="feature-item">
          <div class="feature-icon">📊</div>
          <div class="feature-content">
            <h3>Analytics & Insights</h3>
            <p>Comprehensive practice analytics to help you make data-driven decisions</p>
          </div>
        </div>
        ` : `
        <div class="feature-item">
          <div class="feature-icon">📅</div>
          <div class="feature-content">
            <h3>Book Appointments</h3>
            <p>Easily schedule appointments with your dentist at your convenience</p>
          </div>
        </div>

        <div class="feature-item">
          <div class="feature-icon">📋</div>
          <div class="feature-content">
            <h3>View Records</h3>
            <p>Access your dental history, prescriptions, and treatment plans anytime</p>
          </div>
        </div>

        <div class="feature-item">
          <div class="feature-icon">💬</div>
          <div class="feature-content">
            <h3>Communicate</h3>
            <p>Message your dentist and get appointment reminders automatically</p>
          </div>
        </div>

        <div class="feature-item">
          <div class="feature-icon">🤖</div>
          <div class="feature-content">
            <h3>AI Assistant</h3>
            <p>Get instant answers to your dental health questions from our AI chatbot</p>
          </div>
        </div>
        `}
      </div>

      <!-- Help Section -->
      <div class="help-section">
        <h3>Need Help Getting Started?</h3>
        <p>
          Our support team is here to help! Visit our <a href="${supportLink}">Help Center</a>
          or reply to this email with any questions.
        </p>
      </div>

      <p class="message" style="margin-top: 30px;">
        We're excited to be part of your ${isDentist ? 'practice\'s growth' : 'dental health journey'}!
      </p>

      <p style="color: #6b7280; margin-top: 30px;">
        Best regards,<br>
        <strong>The Caberu Team</strong>
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>
        <strong>Caberu</strong> - AI-Powered Dental Practice Management
      </p>
      <div class="social-links">
        <a href="https://Caberu.com">Website</a> |
        <a href="${supportLink}">Support</a> |
        <a href="https://Caberu.com/privacy">Privacy</a>
      </div>
      <p style="margin-top: 15px; font-size: 12px;">
        © ${new Date().getFullYear()} Caberu. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
