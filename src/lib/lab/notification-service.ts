import prisma from "@/src/lib/prisma";
import {getPushChannel} from "@/src/lib/notifications/channels/push";
import {getSmsChannel} from "@/src/lib/notifications/channels/sms";
import {getViberChannel} from "@/src/lib/notifications/channels/viber";
import type {NotificationChannel} from "@/src/lib/notifications/channels/push";

export type LabResultReleasedPayload = {
  patientId: string;
  labResultId: string;
  testName: string;
  contextNote: string | null;
};

/**
 * Minimal channel adapter that forwards a lab-result notification to the
 * generic push/SMS/Viber channel implementations.  The channel interfaces
 * currently expect a ReminderPayload shape, so we wrap the lab-result data
 * into a compatible object for logging/dispatch purposes.
 */
function buildChannelPayload(data: LabResultReleasedPayload) {
  return {
    patientId: data.patientId,
    appointmentId: "",
    scheduledAt: new Date(),
    providerName: null,
    location: null,
    rescheduleUrl: "",
    cancelUrl: "",
    hoursUntil: 0,
  };
}

export class LabResultNotificationService {
  /**
   * Persists a LAB_RESULT notification record for the patient's user account
   * and dispatches it through the patient's preferred channels.
   */
  async notifyPatientOfRelease(data: LabResultReleasedPayload): Promise<void> {
    const patient = await prisma.patient.findUnique({
      where: {id: data.patientId},
      select: {
        userId: true,
        prefersPushNotifications: true,
        prefersSmsNotifications: true,
        prefersViberNotifications: true,
      },
    });

    if (!patient) {
      console.warn(`[lab-notification] Patient ${data.patientId} not found; skipping notification`);
      return;
    }

    const title = "Lab result available";
    const content = data.contextNote
      ? `Your result for "${data.testName}" is now available. Physician note: ${data.contextNote}`
      : `Your result for "${data.testName}" is now available.`;

    // Persist the notification record.
    await prisma.notification.create({
      data: {
        userId: patient.userId,
        type: "LAB_RESULT",
        title,
        content,
      },
    });

    // Dispatch to preferred channels.
    const channelPayload = buildChannelPayload(data);
    const dispatches: Promise<void>[] = [];
    const channels: NotificationChannel[] = [];

    if (patient.prefersPushNotifications) {
      channels.push(getPushChannel());
    }

    if (patient.prefersSmsNotifications) {
      channels.push(getSmsChannel());
    }

    if (patient.prefersViberNotifications) {
      channels.push(getViberChannel());
    }

    for (const channel of channels) {
      dispatches.push(channel.send(channelPayload));
    }

    const results = await Promise.allSettled(dispatches);
    for (const result of results) {
      if (result.status === "rejected") {
        console.error("[lab-notification] Channel dispatch failed:", result.reason);
      }
    }
  }
}

let labResultNotificationService: LabResultNotificationService | null = null;

export function getLabResultNotificationService(): LabResultNotificationService {
  if (!labResultNotificationService) {
    labResultNotificationService = new LabResultNotificationService();
  }

  return labResultNotificationService;
}
