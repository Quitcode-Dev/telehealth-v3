import type {NotificationChannel, ReminderPayload} from "./push";

class SmsChannel implements NotificationChannel {
  async send(payload: ReminderPayload): Promise<void> {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[sms] Reminder for patient ${payload.patientId}: appointment in ${payload.hoursUntil}h` +
          ` on ${payload.scheduledAt.toISOString()}` +
          ` | reschedule: ${payload.rescheduleUrl} | cancel: ${payload.cancelUrl}`,
      );
    }
  }
}

const smsChannel: NotificationChannel = new SmsChannel();

export function getSmsChannel(): NotificationChannel {
  return smsChannel;
}
