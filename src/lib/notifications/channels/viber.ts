import type {NotificationChannel, ReminderPayload} from "./push";

class ViberChannel implements NotificationChannel {
  async send(payload: ReminderPayload): Promise<void> {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[viber] Reminder for patient ${payload.patientId}: appointment in ${payload.hoursUntil}h` +
          ` on ${payload.scheduledAt.toISOString()}` +
          ` | reschedule: ${payload.rescheduleUrl} | cancel: ${payload.cancelUrl}`,
      );
    }
  }
}

const viberChannel: NotificationChannel = new ViberChannel();

export function getViberChannel(): NotificationChannel {
  return viberChannel;
}
