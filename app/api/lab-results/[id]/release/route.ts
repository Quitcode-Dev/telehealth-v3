import {NextResponse} from "next/server";
import {z} from "zod";
import prisma from "@/src/lib/prisma";
import {getLabResultNotificationService} from "@/src/lib/lab/notification-service";

const MAX_CONTEXT_NOTE_LENGTH = 2000;

const releaseBodySchema = z.object({
  contextNote: z.string().max(MAX_CONTEXT_NOTE_LENGTH).optional(),
});

/**
 * PATCH /api/lab-results/[id]/release
 *
 * Physician-initiated release of a lab result.  Works for both SENSITIVE
 * results (PENDING_REVIEW) and ROUTINE results still in the AUTO_RELEASE
 * window.  An optional plain-language `contextNote` may be attached before
 * the result becomes visible to the patient.
 *
 * On success the result transitions to RELEASED and the patient is notified.
 */
export async function PATCH(
  request: Request,
  {params}: {params: Promise<{id: string}>},
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Lab result service is unavailable"}, {status: 503});
  }

  const {id} = await params;

  const body = await request.json().catch(() => null);
  const parsed = releaseBodySchema.safeParse(body ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      {error: "Invalid request body", details: parsed.error.flatten()},
      {status: 400},
    );
  }

  const {contextNote} = parsed.data;

  const labResult = await prisma.labResult.findUnique({
    where: {id},
    select: {
      id: true,
      patientId: true,
      testName: true,
      status: true,
    },
  });

  if (!labResult) {
    return NextResponse.json({error: "Lab result not found"}, {status: 404});
  }

  // Only results awaiting physician review or scheduled for auto-release can
  // be explicitly released via this endpoint.
  if (labResult.status !== "PENDING_REVIEW" && labResult.status !== "AUTO_RELEASE") {
    return NextResponse.json(
      {error: "Lab result cannot be released from its current status", currentStatus: labResult.status},
      {status: 409},
    );
  }

  const releasedAt = new Date();

  const updated = await prisma.labResult.update({
    where: {id},
    data: {
      status: "RELEASED",
      releasedAt,
      ...(contextNote !== undefined ? {contextNote} : {}),
    },
    select: {
      id: true,
      patientId: true,
      testName: true,
      status: true,
      category: true,
      contextNote: true,
      releasedAt: true,
    },
  });

  // Notify the patient asynchronously; do not let notification failures
  // affect the release response.
  void getLabResultNotificationService()
    .notifyPatientOfRelease({
      patientId: updated.patientId,
      labResultId: updated.id,
      testName: updated.testName,
      contextNote: updated.contextNote,
    })
    .catch((err) => {
      console.error("[release-route] Failed to notify patient:", err);
    });

  return NextResponse.json({labResult: updated});
}
