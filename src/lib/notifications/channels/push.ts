export type ReminderPayload = {
  patientId: string;
  appointmentId: string;
  scheduledAt: Date;
  providerName: string | null;
  location: string | null;
  rescheduleUrl: string;
  cancelUrl: string;
  hoursUntil: number;
};

export interface NotificationChannel {
  send(payload: ReminderPayload): Promise<void>;
}

class PushChannel implements NotificationChannel {
  async send(payload: ReminderPayload): Promise<void> {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[push] Reminder for patient ${payload.patientId}: appointment in ${payload.hoursUntil}h` +
          ` on ${payload.scheduledAt.toISOString()}` +
          ` | reschedule: ${payload.rescheduleUrl} | cancel: ${payload.cancelUrl}`,
      );
    }
  }
}

const pushChannel: NotificationChannel = new PushChannel();

export function getPushChannel(): NotificationChannel {
  return pushChannel;
}
