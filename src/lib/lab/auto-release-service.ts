import prisma from "@/src/lib/prisma";
import {getLabResultNotificationService} from "@/src/lib/lab/notification-service";

/** Hours after ingestion before a ROUTINE result is automatically released. */
const AUTO_RELEASE_DELAY_HOURS = 4;

export class AutoReleaseService {
  /**
   * Schedules an auto-release for a routine (AUTO_RELEASE status) lab result.
   * After the configured delay, if the result has not been held or already
   * released by a physician, it is transitioned to RELEASED and the patient
   * is notified.
   */
  scheduleAutoRelease(labResultId: string): void {
    const delayMs = AUTO_RELEASE_DELAY_HOURS * 60 * 60 * 1000;

    setTimeout(() => {
      void this.executeAutoRelease(labResultId);
    }, delayMs);
  }

  private async executeAutoRelease(labResultId: string): Promise<void> {
    if (!process.env.DATABASE_URL) {
      console.warn(`[auto-release] DATABASE_URL not set; skipping auto-release for ${labResultId}`);
      return;
    }

    const labResult = await prisma.labResult.findUnique({
      where: {id: labResultId},
      select: {
        id: true,
        patientId: true,
        testName: true,
        status: true,
        contextNote: true,
      },
    });

    if (!labResult) {
      console.warn(`[auto-release] Lab result ${labResultId} not found; skipping`);
      return;
    }

    // Only auto-release results that are still in the AUTO_RELEASE state.
    // If a physician has already released, held, or modified the result, skip.
    if (labResult.status !== "AUTO_RELEASE") {
      return;
    }

    await prisma.labResult.update({
      where: {id: labResultId},
      data: {
        status: "RELEASED",
        releasedAt: new Date(),
      },
    });

    await getLabResultNotificationService().notifyPatientOfRelease({
      patientId: labResult.patientId,
      labResultId: labResult.id,
      testName: labResult.testName,
      contextNote: labResult.contextNote,
    });
  }
}

let autoReleaseService: AutoReleaseService | null = null;

export function getAutoReleaseService(): AutoReleaseService {
  if (!autoReleaseService) {
    autoReleaseService = new AutoReleaseService();
  }

  return autoReleaseService;
}
