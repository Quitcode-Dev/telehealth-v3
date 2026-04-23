import {NextResponse} from "next/server";
import {z} from "zod";
import prisma from "@/src/lib/prisma";
import {getHelsiAvailabilityService} from "@/src/lib/helsi/availability-service";
import {HelsiApiClient} from "@/src/lib/helsi/client";
import {parseHelsiDateTime} from "@/src/lib/helsi/appointment-utils";

const updateAppointmentSchema = z.object({
  slotId: z.string().trim().min(1).optional(),
  status: z.string().trim().toUpperCase().pipe(z.enum(["CANCELLED"])).optional(),
}).strict().refine((payload) => Boolean(payload.slotId) !== Boolean(payload.status), {
  message: "Provide either slotId for reschedule or status=CANCELLED for cancellation",
});

type RouteContext = {
  params: Promise<{id: string}>;
};

type HelsiUpdateResponse = {
  startsAt?: string;
};

type AppointmentMeta = {
  slotId?: string;
  paymentId?: string;
  helsiAppointmentId?: string;
};

function isHelsiConfigured() {
  return Boolean(process.env.HELSI_API_BASE_URL && process.env.HELSI_API_TOKEN);
}

/**
 * Safely parses appointment metadata stored in the notes field.
 * Returns an empty object when notes are absent or malformed JSON.
 */
function parseMeta(notes: string | null): AppointmentMeta {
  if (!notes) {
    return {};
  }

  try {
    const parsed = JSON.parse(notes) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const candidate = parsed as Record<string, unknown>;
    return {
      slotId: typeof candidate.slotId === "string" ? candidate.slotId : undefined,
      paymentId: typeof candidate.paymentId === "string" ? candidate.paymentId : undefined,
      helsiAppointmentId: typeof candidate.helsiAppointmentId === "string" ? candidate.helsiAppointmentId : undefined,
    };
  } catch {
    return {};
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Appointment updates are unavailable"}, {status: 503});
  }

  if (!isHelsiConfigured()) {
    return NextResponse.json({error: "Appointment updates are unavailable"}, {status: 503});
  }

  const body = await request.json().catch(() => null);
  const parsed = updateAppointmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({error: "Invalid appointment update payload"}, {status: 400});
  }

  const {id} = await context.params;

  const appointment = await prisma.appointment.findUnique({
    where: {id},
    select: {
      id: true,
      patientId: true,
      status: true,
      scheduledAt: true,
      notes: true,
    },
  });

  if (!appointment) {
    return NextResponse.json({error: "Appointment not found"}, {status: 404});
  }

  const meta = parseMeta(appointment.notes);
  const helsiClient = new HelsiApiClient();
  const availabilityService = getHelsiAvailabilityService();
  const helsiAppointmentId = meta.helsiAppointmentId;

  if (!helsiAppointmentId) {
    return NextResponse.json({error: "Appointment is missing Helsi integration reference"}, {status: 409});
  }

  if (parsed.data.status === "CANCELLED") {
    try {
      await helsiClient.request(`/appointments/${helsiAppointmentId}`, {
        method: "PATCH",
        body: {status: "CANCELLED"},
      });

      if (meta.slotId) {
        availabilityService.releaseSlot(meta.slotId, appointment.patientId);
      }

      const cancelled = await prisma.appointment.update({
        where: {id: appointment.id},
        data: {
          status: "CANCELLED",
        },
        select: {
          id: true,
          status: true,
          scheduledAt: true,
        },
      });

      return NextResponse.json(cancelled);
    } catch (error) {
      console.error("Failed to cancel appointment", error);
      return NextResponse.json({error: "Failed to cancel appointment"}, {status: 502});
    }
  }

  const newSlotId = parsed.data.slotId as string;
  const lockResult = availabilityService.lockSlot(newSlotId, appointment.patientId);

  if (!lockResult.locked) {
    return NextResponse.json({error: "Requested slot is unavailable", slotId: newSlotId}, {status: 409});
  }

  try {
    const helsiUpdate = await helsiClient.request<HelsiUpdateResponse>(`/appointments/${helsiAppointmentId}`, {
      method: "PATCH",
      body: {slotId: newSlotId},
    });

    if (meta.slotId && meta.slotId !== newSlotId) {
      availabilityService.releaseSlot(meta.slotId, appointment.patientId);
    }

    const scheduledAt = parseHelsiDateTime(helsiUpdate.startsAt);
    if (!scheduledAt) {
      throw new Error("Invalid slot time returned from Helsi API");
    }

    const updated = await prisma.appointment.update({
      where: {id: appointment.id},
      data: {
        status: "SCHEDULED",
        scheduledAt,
        notes: JSON.stringify({...meta, slotId: newSlotId}),
      },
      select: {
        id: true,
        status: true,
        scheduledAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to reschedule appointment", error);
    availabilityService.releaseSlot(newSlotId, appointment.patientId);
    return NextResponse.json({error: "Failed to reschedule appointment"}, {status: 502});
  }
}
