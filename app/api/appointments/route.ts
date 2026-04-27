import {NextResponse} from "next/server";
import {z} from "zod";
import {getServerSession} from "next-auth";
import {authOptions} from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import {getHelsiAvailabilityService} from "@/src/lib/helsi/availability-service";
import {HelsiApiClient} from "@/src/lib/helsi/client";
import {parseHelsiDateTime} from "@/src/lib/helsi/appointment-utils";
import {getReminderService} from "@/src/lib/notifications/reminder-service";

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
  helsiAppointmentId: string;
};

function isHelsiConfigured() {
  return Boolean(process.env.HELSI_API_BASE_URL && process.env.HELSI_API_TOKEN);
}

const UPCOMING_STATUSES = ["SCHEDULED"] as const;
const PAST_STATUSES = ["COMPLETED", "NO_SHOW"] as const;

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Appointments are unavailable"}, {status: 503});
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (typeof userId !== "string") {
    return NextResponse.json({error: "Unauthorized"}, {status: 401});
  }

  const patient = await prisma.patient.findUnique({
    where: {userId},
    select: {id: true},
  });

  if (!patient) {
    return NextResponse.json({error: "Patient profile not found"}, {status: 404});
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const now = new Date();

  const upcomingWhere = {patientId: patient.id, status: {in: UPCOMING_STATUSES}, scheduledAt: {gte: now}};
  const pastWhere = {
    patientId: patient.id,
    OR: [
      {status: {in: PAST_STATUSES}},
      {status: {in: UPCOMING_STATUSES}, scheduledAt: {lt: now}},
    ],
  };
  const cancelledWhere = {patientId: patient.id, status: "CANCELLED" as const};
  const allWhere = {patientId: patient.id};

  const where =
    statusParam === "upcoming" ? upcomingWhere :
    statusParam === "past" ? pastWhere :
    statusParam === "cancelled" ? cancelledWhere :
    allWhere;

  const appointments = await prisma.appointment.findMany({
    where,
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      reasonForVisit: true,
      providerName: true,
      location: true,
      notes: true,
    },
    orderBy: {scheduledAt: statusParam === "past" || statusParam === "cancelled" ? "desc" : "asc"},
  });

  return NextResponse.json({appointments});
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

  const availabilityService = getHelsiAvailabilityService();
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

    if (typeof helsiBooking.id !== "string" || helsiBooking.id.length === 0) {
      throw new Error("Missing appointment ID returned from Helsi API");
    }

    const meta: AppointmentMeta = {
      slotId,
      paymentId,
      helsiAppointmentId: helsiBooking.id,
    };

    const scheduledAt = parseHelsiDateTime(helsiBooking.startsAt);
    if (!scheduledAt) {
      throw new Error("Invalid slot time returned from Helsi API");
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        scheduledAt,
        status: "SCHEDULED",
        reasonForVisit,
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

    void getReminderService().scheduleReminders(appointment.id);

    return NextResponse.json({
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      status: appointment.status,
      scheduledAt: appointment.scheduledAt,
      confirmationReference: helsiBooking.id,
    }, {status: 201});
  } catch (error) {
    console.error("Failed to create appointment", error);
    availabilityService.releaseSlot(slotId, patientId);
    return NextResponse.json({error: "Failed to create appointment"}, {status: 502});
  }
}
