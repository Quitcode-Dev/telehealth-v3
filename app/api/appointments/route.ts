import {NextResponse} from "next/server";
import {z} from "zod";
import prisma from "@/src/lib/prisma";
import {HelsiAvailabilityService} from "@/src/lib/helsi/availability";
import {HelsiApiClient} from "@/src/lib/helsi/client";

const createAppointmentSchema = z.object({
  slotId: z.string().trim().min(1),
  patientId: z.string().uuid(),
  reasonForVisit: z.string().trim().min(1).max(500),
  paymentId: z.string().trim().min(1),
}).strict();

type HelsiBookingResponse = {
  id?: string;
  startsAt?: string;
  physicianId?: string;
  location?: string;
};

type AppointmentMeta = {
  slotId: string;
  paymentId: string;
  helsiAppointmentId?: string;
};

function isHelsiConfigured() {
  return Boolean(process.env.HELSI_API_BASE_URL && process.env.HELSI_API_TOKEN);
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Appointment booking is unavailable"}, {status: 503});
  }

  if (!isHelsiConfigured()) {
    return NextResponse.json({error: "Appointment booking is unavailable"}, {status: 503});
  }

  const body = await request.json().catch(() => null);
  const parsed = createAppointmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({error: "Invalid appointment payload"}, {status: 400});
  }

  const {slotId, patientId, reasonForVisit, paymentId} = parsed.data;

  const patient = await prisma.patient.findUnique({
    where: {id: patientId},
    select: {id: true},
  });

  if (!patient) {
    return NextResponse.json({error: "Patient not found"}, {status: 404});
  }

  const availabilityService = new HelsiAvailabilityService();
  const lockResult = availabilityService.lockSlot(slotId, patientId);

  if (!lockResult.locked) {
    return NextResponse.json({error: "Slot is currently unavailable", slotId}, {status: 409});
  }

  const helsiClient = new HelsiApiClient();

  try {
    const helsiBooking = await helsiClient.post<HelsiBookingResponse>("/appointments", {
      slotId,
      patientId,
      reasonForVisit,
      paymentId,
    });

    const meta: AppointmentMeta = {
      slotId,
      paymentId,
      helsiAppointmentId: helsiBooking.id,
    };

    const scheduledAt =
      typeof helsiBooking.startsAt === "string" && !Number.isNaN(new Date(helsiBooking.startsAt).getTime())
        ? new Date(helsiBooking.startsAt)
        : new Date();

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        scheduledAt,
        status: "SCHEDULED",
        reasonForVisit,
        providerName: helsiBooking.physicianId,
        location: helsiBooking.location,
        notes: JSON.stringify(meta),
      },
      select: {
        id: true,
        patientId: true,
        status: true,
        scheduledAt: true,
      },
    });

    return NextResponse.json({
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      status: appointment.status,
      scheduledAt: appointment.scheduledAt,
      confirmationReference: helsiBooking.id ?? appointment.id,
    }, {status: 201});
  } catch {
    availabilityService.releaseSlot(slotId, patientId);
    return NextResponse.json({error: "Failed to create appointment"}, {status: 502});
  }
}
