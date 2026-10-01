import nodemailer from 'nodemailer';
import crypto from 'crypto';
// ─── Secure Gmail SMTP Transporter (module-level singleton) ─────────────
export const mailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 465,
  secure: process.env.EMAIL_SECURE === 'true', // Must be true for port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail 16-digit App Password
  },
  tls: {
    rejectUnauthorized: true, // Enforce SSL certificate verification
    minVersion: 'TLSv1.2',
  },
});

// Verify SMTP connection on server boot
mailTransporter.verify((error, _success) => {
  if (error) {
    console.error('❌ [Email Service] SMTP Connection Error:', error.message);
  } else {
    console.log('⚡ [Email Service] Gmail SMTP Transporter connected successfully and ready.');
  }
});


export function generateAppointmentToken(appointmentId: number): string {
  const secret = process.env.JWT_SECRET || 'medicare_appointment_secret_key';
  const hash = crypto.createHmac('sha256', secret).update(String(appointmentId)).digest('hex');
  return `${appointmentId}.${hash}`;
}

type UserEmail = {
  email: string;
  name?: string;
};

export class Email {
  private to: string;
  private firstName: string;
  private url: string;
  private from: string;

  constructor(user: UserEmail, url: string) {
    if (!user || !user.email) {
      throw new Error('Email address is required to initialize the Email service');
    }
    this.to = user.email;
    this.firstName = (user.name || '').split(' ')[0] || 'User';
    this.url = url;
    this.from = process.env.EMAIL_FROM || 'CareOS Hospital <noreply@hospital.com>';
  }


  private buildHTML(subject: string, bodyContent: string) {
    return `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;">
        <div style="background:linear-gradient(135deg,#1e40af 0%,#0ea5e9 100%);border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:22px;letter-spacing:-0.5px;">🏥 Medicare Hospital System</h1>
          <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">${subject}</p>
        </div>
        <div style="background:white;border-radius:0 0 12px 12px;padding:28px 32px;border:1px solid #e2e8f0;border-top:none;">
          <p style="color:#475569;font-size:15px;margin:0 0 16px;">Hello <strong style="color:#1e293b;">${this.firstName}</strong>,</p>
          ${bodyContent}
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
          <p style="color:#94a3b8;font-size:11px;margin:0;text-align:center;">Medicare Hospital Management System &bull; Automated notification.</p>
        </div>
      </div>
    `;
  }

  private async sendRaw(subject: string, html: string, textBody: string) {
    try {
      await mailTransporter.sendMail({ from: this.from, to: this.to, subject, text: textBody, html });
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV OTP LOG] Mailer transport failed in dev mode: ${err?.message ?? err}`);
        return;
      }
      throw err;
    }
  }

  private async send(subject: string, message: string) {
    const bodyContent = `
      <p style="color:#475569;font-size:14px;line-height:1.7;">${message}</p>
      <p><a href="${this.url}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Continue</a></p>
      <p style="color:#94a3b8;font-size:12px;">If you didn't request this, ignore this email.</p>
    `;
    const html = this.buildHTML(subject, bodyContent);
    await this.sendRaw(subject, html, `${message}\n\n${this.url}`);
  }

  async sendVerification() {
    await this.send('Verify your email', 'Please click the button below to verify your email address. This link is valid for 24 hours.');
  }

  async sendOTP(otp: string) {
    const subject = '🔑 Your Email Verification OTP – Medicare System';
    const bodyContent = `
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:24px;text-align:center;margin-bottom:20px;">
        <h3 style="color:#0369a1;margin:0 0 8px;font-size:16px;">Verify Your Email Address</h3>
        <p style="color:#334155;font-size:14px;margin:0 0 16px;">Use the following 6-digit verification code to activate your account. This code is valid for <strong>10 minutes</strong>.</p>
        <div style="display:inline-block;background:#0284c7;color:white;font-size:32px;font-weight:900;letter-spacing:8px;padding:12px 28px;border-radius:12px;box-shadow:0 4px 12px rgba(2,132,199,0.25);">
          ${otp}
        </div>
      </div>
      <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">If you did not register for an account, please ignore this message.</p>
    `;
    const html = this.buildHTML(subject, bodyContent);
    await this.sendRaw(subject, html, `Your Verification OTP is: ${otp} (Valid for 10 minutes).`);
  }

  async sendPasswordReset() {
    await this.send('Reset your password', 'Click the button below to reset your password. This link is valid for 10 minutes.');
  }

  async sendEmailChangeVerification() {
    await this.send('Confirm your new email', 'Click the button below to confirm your new email address.');
  }

  // ─── REQ 1: Instant Booking Confirmation Email ────────────────────────────────
  async sendBookingConfirmation(details: {
    appointmentId?: number;
    doctorName: string;
    department?: string | null;
    appointmentDate?: string | null;
    timeSlot?: string | null;
    reason?: string | null;
    bookingSource?: string | null;
  }) {
    if (details.bookingSource === 'walk_in') {
      console.log('[Mailer] Skipping confirmation email for walk-in appointment');
      return;
    }
    const { appointmentId, doctorName, department, appointmentDate, timeSlot, reason } = details;
    const cleanDoc = doctorName.replace(/^(dr\.|د\.)\s*/i, '').trim();
    const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:3000';
    const subject = '✅ Appointment Confirmed – Medicare Hospital System';

    let actionButtons = '';
    if (appointmentId) {
      const token = generateAppointmentToken(appointmentId);
      const confirmUrl = `${frontendUrl}/appointments/confirm?token=${token}&id=${appointmentId}`;
      const cancelUrl  = `${frontendUrl}/appointments/cancel?token=${token}&id=${appointmentId}`;
      actionButtons = `
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;">
          <p style="color:#1e293b;font-size:13px;font-weight:600;margin:0 0 12px;">Quick Appointment Actions:</p>
          <table><tr>
            <td><a href="${confirmUrl}" style="display:inline-block;padding:10px 22px;background:linear-gradient(135deg,#16a34a,#22c55e);color:white;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700;">✅ Confirm Attendance</a></td>
            <td style="padding-left:10px;"><a href="${cancelUrl}" style="display:inline-block;padding:10px 22px;background:linear-gradient(135deg,#dc2626,#ef4444);color:white;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700;">❌ Cancel Appointment</a></td>
          </tr></table>
        </div>
      `;
    }

    const bodyContent = `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin-bottom:20px;">
        <p style="color:#166534;font-weight:700;font-size:15px;margin:0 0 12px;">Your appointment has been successfully scheduled!</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td style="padding:6px 0;color:#475569;font-weight:600;width:40%;">👨‍⚕️ Doctor</td><td style="color:#1e293b;font-weight:700;">Dr. ${cleanDoc}</td></tr>
          ${department ? `<tr><td style="padding:6px 0;color:#475569;font-weight:600;">🏥 Department</td><td style="color:#1e293b;">${department}</td></tr>` : ''}
          ${appointmentDate ? `<tr><td style="padding:6px 0;color:#475569;font-weight:600;">📅 Date</td><td style="color:#1e293b;">${appointmentDate}</td></tr>` : ''}
          ${timeSlot ? `<tr><td style="padding:6px 0;color:#475569;font-weight:600;">⏰ Time Slot</td><td style="color:#1e293b;font-weight:700;">${timeSlot}</td></tr>` : ''}
          ${reason ? `<tr><td style="padding:6px 0;color:#475569;font-weight:600;">📋 Reason</td><td style="color:#1e293b;">${reason}</td></tr>` : ''}
          <tr><td style="padding:6px 0;color:#475569;font-weight:600;">📍 Location</td><td style="color:#1e293b;">Medicare Hospital – Main Clinic Counter</td></tr>
        </table>
        ${actionButtons}
      </div>
      <p style="color:#475569;font-size:13px;line-height:1.7;">Please arrive <strong>10 minutes early</strong> at the clinic reception for pre-consultation vitals assessment. Bring your ID and any previous medical reports.</p>
    `;

    const html = this.buildHTML(subject, bodyContent);
    const text = `Appointment Confirmed\nDoctor: Dr. ${cleanDoc}\nDate: ${appointmentDate || 'N/A'}\nTime: ${timeSlot || 'N/A'}\nLocation: Medicare Hospital`;
    await this.sendRaw(subject, html, text);
  }

  // ─── REQ 2: 1-Hour Appointment Reminder (Cron Worker) ────────────────────────
  async sendAppointmentReminder(doctorName: string, timeSlot?: string, bookingSource?: string) {
    if (bookingSource === 'walk_in') return;
    const timeDetail = timeSlot ? ` (${timeSlot})` : '';
    await this.send(
      'Reminder: Your Appointment is Approaching – Medicare System',
      `Your appointment with Dr. ${doctorName} is scheduled in 60 minutes${timeDetail}. Please arrive at the clinic counter for pre-consultation Vitals Assessment.`,
    );
  }

  // ─── REQ 3: Interactive Pre-Appointment Attendance Confirmation ───────────────
  async sendInteractiveAttendanceReminder(details: {
    appointmentId: number;
    doctorName: string;
    timeSlot?: string | null;
    appointmentDate?: string | null;
    bookingSource?: string | null;
  }): Promise<void> {
    if (details.bookingSource === 'walk_in') {
      console.log(`[Mailer] Skipping attendance reminder for walk-in appointment #${details.appointmentId}`);
      return;
    }
    const { appointmentId, doctorName, timeSlot, appointmentDate } = details;
    const cleanDoc = doctorName.replace(/^(dr\.|د\.)\s*/i, '').trim();
    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
    const token = generateAppointmentToken(appointmentId);
    const subject = '⏰ Your Appointment is in 1 Hour – Please Confirm Attendance';

    const confirmUrl = `${frontendUrl}/appointments/confirm?token=${token}&id=${appointmentId}`;
    const cancelUrl  = `${frontendUrl}/appointments/cancel?token=${token}&id=${appointmentId}`;

    const bodyContent = `
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px;margin-bottom:20px;">
        <p style="color:#1e40af;font-weight:700;font-size:15px;margin:0 0 8px;">⏰ Your appointment is in less than 1 hour</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td style="padding:5px 0;color:#475569;font-weight:600;width:40%;">👨‍⚕️ Doctor</td><td style="color:#1e293b;font-weight:700;">Dr. ${cleanDoc}</td></tr>
          ${appointmentDate ? `<tr><td style="padding:5px 0;color:#475569;font-weight:600;">📅 Date</td><td style="color:#1e293b;">${appointmentDate}</td></tr>` : ''}
          ${timeSlot ? `<tr><td style="padding:5px 0;color:#475569;font-weight:600;">⏰ Time</td><td style="color:#1e293b;font-weight:700;">${timeSlot}</td></tr>` : ''}
          <tr><td style="padding:5px 0;color:#475569;font-weight:600;">📍 Location</td><td style="color:#1e293b;">Medicare Hospital – Main Clinic Counter</td></tr>
        </table>
      </div>
      <p style="color:#1e293b;font-size:14px;font-weight:600;margin-bottom:20px;">Please confirm your attendance or cancel your reservation:</p>
      <table><tr>
        <td><a href="${confirmUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#16a34a,#22c55e);color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;">✅ Confirm Attendance</a></td>
        <td style="padding-left:12px;"><a href="${cancelUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#dc2626,#ef4444);color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;">❌ Cancel Appointment</a></td>
      </tr></table>
      <p style="color:#94a3b8;font-size:12px;margin-top:20px;">If you do not respond, your appointment will remain as scheduled. Please arrive 10 minutes early.</p>
    `;

    const html = this.buildHTML(subject, bodyContent);
    const text = `Your appointment with Dr. ${cleanDoc} is in less than 1 hour${timeSlot ? ` (${timeSlot})` : ''}.\n\nConfirm Attendance: ${confirmUrl}\nCancel: ${cancelUrl}`;
    await this.sendRaw(subject, html, text);
  }

  // ─── REQ: Staff Application Approval Email ──────────────────────────────────
  async sendStaffApproval(role: string, shift?: string) {
    const subject = '🎉 Staff Application Approved – Medicare Hospital System';
    const bodyContent = `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin-bottom:20px;">
        <p style="color:#166534;font-weight:700;font-size:15px;margin:0 0 8px;">Congratulations! Your staff application has been approved.</p>
        <p style="color:#334155;font-size:14px;margin:0 0 6px;"><strong>Assigned Role:</strong> ${role.toUpperCase()}</p>
        ${shift ? `<p style="color:#334155;font-size:14px;margin:0;"><strong>Assigned Shift:</strong> ${shift}</p>` : ''}
      </div>
      <p style="color:#475569;font-size:14px;line-height:1.7;">You can now log in to your account to access your new staff dashboard and management features.</p>
    `;
    const html = this.buildHTML(subject, bodyContent);
    await this.sendRaw(subject, html, `Staff Application Approved as ${role.toUpperCase()}. You can now access your staff dashboard.`);
  }

  // ─── REQ: Staff Application Rejection Email ──────────────────────────────────
  async sendStaffRejection(reason?: string) {
    const subject = 'Staff Application Update – Medicare Hospital System';
    const bodyContent = `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:20px;margin-bottom:20px;">
        <p style="color:#991b1b;font-weight:700;font-size:15px;margin:0 0 8px;">Your staff application status update</p>
        <p style="color:#334155;font-size:14px;margin:0;">Unfortunately, your staff application could not be approved at this time.</p>
        ${reason ? `<p style="color:#7f1d1d;font-size:13px;margin-top:8px;"><strong>Reason:</strong> ${reason}</p>` : ''}
      </div>
    `;
    const html = this.buildHTML(subject, bodyContent);
    await this.sendRaw(subject, html, `Your staff application was not approved. ${reason ? `Reason: ${reason}` : ''}`);
  }
}

