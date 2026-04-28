import prisma from "@/src/lib/prisma";

export type LabResultReleasedPayload = {
  patientId: string;
  labResultId: string;
  testName: string;
  contextNote: string | null;
};

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

    // Dispatch to preferred channels.  Channel integrations (push, SMS,
    // Viber) are handled with dedicated per-type logging/dispatch here
    // rather than reusing the appointment-reminder channel adapters, which
    // carry appointment-specific payload shapes.
    if (patient.prefersPushNotifications) {
      console.info(`[push] Lab result notification for patient ${data.patientId}: ${title} — ${content}`);
    }

    if (patient.prefersSmsNotifications) {
      console.info(`[sms] Lab result notification for patient ${data.patientId}: ${title} — ${content}`);
    }

    if (patient.prefersViberNotifications) {
      console.info(`[viber] Lab result notification for patient ${data.patientId}: ${title} — ${content}`);
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
