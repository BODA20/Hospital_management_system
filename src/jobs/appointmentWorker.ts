import db from '../config/db';
import { Email } from '../common/utils/email';
import logger from '../common/utils/logger';
import { autoExpireMissedAppointments } from '../modules/appointments/services/appo.service';

export interface ProcessedAppointmentResult {
  appointmentId: number;
  patientName: string;
  doctorName: string;
  emailSent: boolean;
  error?: string;
}

export const processUpcomingAppointments = async (): Promise<ProcessedAppointmentResult[]> => {
  const results: ProcessedAppointmentResult[] = [];
  console.log('[CronWorker] Automated appointment queue worker triggered');

  // ── Step 0: Auto-expire any past pending appointments globally ────────────
  await autoExpireMissedAppointments();

  try {
    await db.transaction(async (trx) => {
      // 1. Query matching appointments strictly within the next 60 minutes window relative to server time or scheduled for today.
      const appointmentsToProcess = await trx('appointments as a')
        .leftJoin('patients as p', 'a.patient_id', 'p.id')
        .leftJoin('users as pu', 'p.user_id', 'pu.id')
        .leftJoin('doctors as d', 'a.doctor_id', 'd.id')
        .leftJoin('users as du', 'd.user_id', 'du.id')
        .whereIn('a.status', ['confirmed', 'scheduled', 'pending'])
        .andWhere(function () {
          this.where('a.nurse_notified', false)
            .orWhereNull('a.queue_status')
            .orWhereNot('a.queue_status', 'ready_for_vitals');
        })
        .andWhere(function () {
          this.whereRaw("a.starts_at::date = CURRENT_DATE OR a.appointment_date::date = CURRENT_DATE")
            .orWhereRaw("a.starts_at <= NOW() + INTERVAL '60 minutes'")
            .orWhereRaw("a.starts_at IS NULL AND (a.appointment_date::text || ' ' || COALESCE(SPLIT_PART(a.time_slot, '-', 1), '00:00'))::timestamp <= NOW() + INTERVAL '60 minutes'");
        })
        .select(
          'a.id as appointment_id',
          'a.doctor_id',
          'a.patient_id',
          'a.department_id',
          'a.starts_at',
          'a.time_slot',
          'a.reason',
          'a.queue_status',
          'a.nurse_notified',
          'a.reminder_email_sent',
          'a.booking_source',
          'pu.email as patient_email',
          'pu.full_name as patient_name',
          'du.full_name as doctor_name'
        )
        .forUpdate('a');

      if (appointmentsToProcess.length === 0) {
        return;
      }

      console.log(
        `[CronWorker] Found ${appointmentsToProcess.length} appointment(s) approaching/scheduled for today`
      );

      for (const appt of appointmentsToProcess) {
        try {
          // Atomic State Mutation inside transaction
          await trx('appointments')
            .where({ id: appt.appointment_id })
            .update({
              queue_status: 'ready_for_vitals',
              nurse_notified: true,
              updated_at: db.fn.now(),
            });

          // Ensure a visit record exists and is set to awaiting_vitals
          const existingVisit = await trx('visits')
            .where({ appointment_id: appt.appointment_id })
            .first();

          if (!existingVisit) {
            await trx('visits').insert({
              patient_id: appt.patient_id,
              doctor_id: appt.doctor_id,
              appointment_id: appt.appointment_id,
              department_id: appt.department_id ?? null,
              status: 'awaiting_vitals',
              chief_complaint: appt.reason || 'Upcoming Scheduled Appointment',
              check_in_at: db.fn.now(),
              created_at: db.fn.now(),
              updated_at: db.fn.now(),
            });
          } else if (existingVisit.status === 'in_progress' || existingVisit.status === 'scheduled') {
            await trx('visits')
              .where({ id: existingVisit.id })
              .update({
                status: 'awaiting_vitals',
                updated_at: db.fn.now(),
              });
          }

          // Asynchronous Email Dispatch with Retry Guard (REQ 3: Interactive Attendance Confirmation)
          // Skip email sending for walk-in appointments
          let emailSent = false;
          const recipientEmail = appt.patient_email || 'patient@example.com';
          const recipientName = appt.patient_name || 'Patient';
          const docName = appt.doctor_name || 'Doctor';

          if (!appt.reminder_email_sent && appt.booking_source !== 'walk_in') {
            try {
              const mailer: Email = new Email(
                { email: recipientEmail, name: recipientName },
                process.env.APP_URL || 'http://localhost:5173'
              );
              // REQ 3: Send interactive attendance confirmation email with Confirm/Cancel buttons
              await mailer.sendInteractiveAttendanceReminder({
                appointmentId: appt.appointment_id,
                doctorName: docName,
                timeSlot: appt.time_slot || null,
                appointmentDate: appt.starts_at
                  ? String(appt.starts_at).split('T')[0]
                  : null,
                bookingSource: appt.booking_source,
              });

              // Mark email as sent in atomic transaction
              await trx('appointments')
                .where({ id: appt.appointment_id })
                .update({ reminder_email_sent: true });

              emailSent = true;
              const msg = `[CronWorker] Interactive attendance reminder sent to ${recipientEmail} for appointment #${appt.appointment_id}`;
              console.log(msg);
              logger.info(msg);
            } catch (mailErr: any) {
              const errStr = `[CronWorker] Failed to send email to ${recipientEmail} for appointment #${appt.appointment_id}: ${mailErr.message}`;
              console.error(errStr);
              logger.error(errStr);
            }
          }

          results.push({
            appointmentId: appt.appointment_id,
            patientName: recipientName,
            doctorName: docName,
            emailSent,
          });
        } catch (itemErr: any) {
          const errStr = `[CronWorker] Error updating appointment ID ${appt.appointment_id}: ${itemErr.message}`;
          console.error(errStr);
          logger.error(errStr);
          results.push({
            appointmentId: appt.appointment_id,
            patientName: appt.patient_name || 'Patient',
            doctorName: appt.doctor_name || 'Doctor',
            emailSent: false,
            error: itemErr.message,
          });
        }
      }
    });
  } catch (err: any) {
    const errStr = `[CronWorker] Cron execution error: ${err.message}`;
    console.error(errStr);
    logger.error(errStr);
  }

  return results;
};

let workerTimer: NodeJS.Timeout | null = null;

export const startAppointmentWorker = (intervalMs = 60 * 1000) => {
  const msg = `[CronWorker] Starting automated worker engine (Interval: ${intervalMs / 1000}s)`;
  console.log(msg);
  logger.info(msg);

  // Run immediately on boot
  processUpcomingAppointments().catch((err) => {
    console.error(`[CronWorker] Initial execution error: ${err.message}`);
  });

  // Schedule isolated setInterval timer
  if (workerTimer) {
    clearInterval(workerTimer);
  }
  workerTimer = setInterval(() => {
    processUpcomingAppointments().catch((err) => {
      console.error(`[CronWorker] Scheduled execution error: ${err.message}`);
    });
  }, intervalMs);
};

export const stopAppointmentWorker = () => {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
    console.log('[CronWorker] Stopped worker engine timer');
  }
};
