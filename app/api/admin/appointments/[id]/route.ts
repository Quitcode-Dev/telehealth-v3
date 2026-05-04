import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {Prisma} from "@prisma/client";
import {z} from "zod";
import {authOptions, ADMIN_ROLE} from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

// CANCELLED is intentionally excluded: the patient-facing PATCH /api/appointments/[id]
// also syncs the Helsi integration and releases the reserved slot. Admins must use that
// flow (or handle it out-of-band) to avoid leaving external records out of sync.
const updateStatusSchema = z.object({
  status: z.string().trim().toUpperCase().pipe(
    z.enum(["SCHEDULED", "CHECKED_IN", "COMPLETED", "NO_SHOW"])
  ),
}).strict();

type AdminWritableStatus = "SCHEDULED" | "CHECKED_IN" | "COMPLETED" | "NO_SHOW";

// Allowed status transitions to enforce the booking workflow state machine.
// Any transition not listed here is rejected with 422.
const VALID_TRANSITIONS: Record<string, AdminWritableStatus[]> = {
  SCHEDULED: ["CHECKED_IN", "NO_SHOW"],
  CHECKED_IN: ["COMPLETED", "NO_SHOW"],
  NO_SHOW: ["SCHEDULED"],
  COMPLETED: [],
  CANCELLED: [],
};

type RouteContext = {
  params: Promise<{id: string}>;
};

function unauthorized() {
  return NextResponse.json({error: "Unauthorized"}, {status: 401});
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Appointment updates are unavailable"}, {status: 503});
  }

  const session = await getServerSession(authOptions);

  if (session?.user?.role !== ADMIN_ROLE) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null);
  const parsed = updateStatusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({error: "Invalid status value"}, {status: 400});
  }

  const {id} = await context.params;

  const appointment = await prisma.appointment.findUnique({
    where: {id},
    select: {id: true, status: true},
  });

  if (!appointment) {
    return NextResponse.json({error: "Appointment not found"}, {status: 404});
  }

  const nextStatus = parsed.data.status as AdminWritableStatus;
  const allowedNext = VALID_TRANSITIONS[appointment.status] ?? [];

  if (!allowedNext.includes(nextStatus)) {
    return NextResponse.json(
      {error: `Cannot transition from ${appointment.status} to ${nextStatus}`},
      {status: 422},
    );
  }

  try {
    const updated = await prisma.appointment.update({
      where: {id},
      data: {status: nextStatus},
      select: {
        id: true,
        status: true,
        scheduledAt: true,
        providerName: true,
        location: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({error: "Appointment not found"}, {status: 404});
    }

    return NextResponse.json({error: "Failed to update appointment status"}, {status: 500});
  }
}
