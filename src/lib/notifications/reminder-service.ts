import prisma from "@/src/lib/prisma";
import {getPushChannel} from "@/src/lib/notifications/channels/push";
import {getSmsChannel} from "@/src/lib/notifications/channels/sms";
import {getViberChannel} from "@/src/lib/notifications/channels/viber";
import type {ReminderPayload} from "@/src/lib/notifications/channels/push";

const REMINDER_INTERVALS_HOURS = [48, 2] as const;

function buildReminderUrls(appointmentId: string): {rescheduleUrl: string; cancelUrl: string} {
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (!base) {
    console.warn("[reminder-service] NEXT_PUBLIC_BASE_URL is not set; reminder links will be relative paths");
  }
  const prefix = base ?? "";
  return {
    rescheduleUrl: `${prefix}/appointments/${appointmentId}/reschedule`,
    cancelUrl: `${prefix}/appointments/${appointmentId}/cancel`,
  };
}

export class ReminderService {
  async scheduleReminders(appointmentId: string): Promise<void> {
    const appointment = await prisma.appointment.findUnique({
      where: {id: appointmentId},
      select: {
        id: true,
        patientId: true,
        scheduledAt: true,
        status: true,
        providerName: true,
        location: true,
        patient: {
          select: {
            prefersPushNotifications: true,
            prefersSmsNotifications: true,
            prefersViberNotifications: true,
          },
        },
      },
    });

    if (!appointment) {
      console.warn(`[reminder-service] Appointment ${appointmentId} not found; skipping reminders`);
      return;
    }

    if (appointment.status === "CANCELLED") {
      return;
    }

    const now = Date.now();

    for (const hoursUntil of REMINDER_INTERVALS_HOURS) {
      const fireAt = appointment.scheduledAt.getTime() - hoursUntil * 60 * 60 * 1000;
      const delayMs = fireAt - now;

      if (delayMs <= 0) {
        continue;
      }

      setTimeout(() => {
        void this.dispatchReminder(appointmentId, hoursUntil);
      }, delayMs);
    }
  }

  private async dispatchReminder(appointmentId: string, hoursUntil: number): Promise<void> {
    const appointment = await prisma.appointment.findUnique({
      where: {id: appointmentId},
      select: {
        id: true,
        patientId: true,
        scheduledAt: true,
        status: true,
        providerName: true,
        location: true,
        patient: {
          select: {
            prefersPushNotifications: true,
            prefersSmsNotifications: true,
            prefersViberNotifications: true,
          },
        },
      },
    });

    if (!appointment || appointment.status === "CANCELLED") {
      return;
    }

    const {rescheduleUrl, cancelUrl} = buildReminderUrls(appointment.id);

    const payload: ReminderPayload = {
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      scheduledAt: appointment.scheduledAt,
      providerName: appointment.providerName,
      location: appointment.location,
      rescheduleUrl,
      cancelUrl,
      hoursUntil,
    };

    const {prefersPushNotifications, prefersSmsNotifications, prefersViberNotifications} = appointment.patient;

    const dispatches: Promise<void>[] = [];

    if (prefersPushNotifications) {
      dispatches.push(getPushChannel().send(payload));
    }

    if (prefersSmsNotifications) {
      dispatches.push(getSmsChannel().send(payload));
    }

    if (prefersViberNotifications) {
      dispatches.push(getViberChannel().send(payload));
    }

    const results = await Promise.allSettled(dispatches);
    for (const result of results) {
      if (result.status === "rejected") {
        console.error("[reminder-service] Channel dispatch failed:", result.reason);
      }
    }
  }
}

let reminderService: ReminderService | null = null;

export function getReminderService(): ReminderService {
  if (!reminderService) {
    reminderService = new ReminderService();
  }

  return reminderService;
}
