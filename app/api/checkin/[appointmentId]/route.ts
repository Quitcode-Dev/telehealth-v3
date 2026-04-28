import {NextResponse} from "next/server";
import {z} from "zod";
import {getServerSession} from "next-auth";
import {authOptions} from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import {HelsiApiClient} from "@/src/lib/helsi/client";

const CHECK_IN_WINDOW_MS = 48 * 60 * 60 * 1000;

const checkInSchema = z.object({
  demographics: z.object({
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    phoneNumber: z.string().trim().optional(),
    emergencyContactName: z.string().trim().optional(),
    emergencyContactPhone: z.string().trim().optional(),
  }).optional(),
  insurance: z.object({
    providerName: z.string().trim().optional(),
    policyNumber: z.string().trim().optional(),
    groupNumber: z.string().trim().optional(),
  }).optional(),
  allergies: z.string().trim().optional(),
  medications: z.string().trim().optional(),
  consentConfirmed: z.boolean(),
}).strict();

type RouteContext = {
  params: Promise<{appointmentId: string}>;
};

type AppointmentMeta = {
  slotId?: string;
  paymentId?: string;
  helsiAppointmentId?: string;
};

function unauthorized() {
  return NextResponse.json({error: "Unauthorized"}, {status: 401});
}

async function getUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  return typeof userId === "string" ? userId : null;
}

function isHelsiConfigured() {
  return Boolean(process.env.HELSI_API_BASE_URL && process.env.HELSI_API_TOKEN);
}

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
      helsiAppointmentId:
        typeof candidate.helsiAppointmentId === "string" ? candidate.helsiAppointmentId : undefined,
    };
  } catch {
    return {};
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Check-in is unavailable"}, {status: 503});
  }

  const userId = await getUserId();
  if (!userId) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null);
  const parsed = checkInSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({error: "Invalid check-in payload"}, {status: 400});
  }

  if (!parsed.data.consentConfirmed) {
    return NextResponse.json({error: "Consent must be confirmed to complete check-in"}, {status: 400});
  }

  const {appointmentId} = await context.params;

  const patient = await prisma.patient.findUnique({
    where: {userId},
    select: {id: true},
  });

  if (!patient) {
    return NextResponse.json({error: "Patient profile not found"}, {status: 404});
  }

  const appointment = await prisma.appointment.findUnique({
    where: {id: appointmentId},
    select: {
      id: true,
      patientId: true,
      status: true,
      scheduledAt: true,
      notes: true,
    },
  });

  if (!appointment || appointment.patientId !== patient.id) {
    return NextResponse.json({error: "Appointment not found"}, {status: 404});
  }

  if (appointment.status !== "SCHEDULED") {
    return NextResponse.json(
      {error: "Check-in is only available for scheduled appointments"},
      {status: 400},
    );
  }

  const now = new Date();
  const msUntilAppointment = appointment.scheduledAt.getTime() - now.getTime();

  if (msUntilAppointment < 0) {
    return NextResponse.json(
      {error: "Cannot check in for a past appointment"},
      {status: 400},
    );
  }

  if (msUntilAppointment > CHECK_IN_WINDOW_MS) {
    return NextResponse.json(
      {error: "Check-in is only available within 48 hours of the appointment"},
      {status: 400},
    );
  }

  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    if (data.demographics) {
      const userUpdateData: {firstName?: string; lastName?: string} = {};
      if (data.demographics.firstName !== undefined) {
        userUpdateData.firstName = data.demographics.firstName;
      }
      if (data.demographics.lastName !== undefined) {
        userUpdateData.lastName = data.demographics.lastName;
      }
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({where: {id: userId}, data: userUpdateData});
      }
    }

    const patientUpdateData: {
      phoneNumber?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      allergies?: string;
      currentMedications?: string;
    } = {};
    if (data.demographics?.phoneNumber !== undefined) {
      patientUpdateData.phoneNumber = data.demographics.phoneNumber;
    }
    if (data.demographics?.emergencyContactName !== undefined) {
      patientUpdateData.emergencyContactName = data.demographics.emergencyContactName;
    }
    if (data.demographics?.emergencyContactPhone !== undefined) {
      patientUpdateData.emergencyContactPhone = data.demographics.emergencyContactPhone;
    }
    if (data.allergies !== undefined) {
      patientUpdateData.allergies = data.allergies;
    }
    if (data.medications !== undefined) {
      patientUpdateData.currentMedications = data.medications;
    }
    if (Object.keys(patientUpdateData).length > 0) {
      await tx.patient.update({where: {id: patient.id}, data: patientUpdateData});
    }

    if (data.insurance) {
      const {providerName, policyNumber, groupNumber} = data.insurance;
      const hasInsuranceUpdate =
        providerName !== undefined || policyNumber !== undefined || groupNumber !== undefined;

      if (hasInsuranceUpdate) {
        const existingPrimary = await tx.insurancePolicy.findFirst({
          where: {patientId: patient.id, isPrimary: true},
          select: {id: true},
        });

        if (existingPrimary) {
          const insuranceUpdateData: {
            providerName?: string;
            policyNumber?: string;
            groupNumber?: string;
          } = {};
          if (providerName !== undefined) insuranceUpdateData.providerName = providerName;
          if (policyNumber !== undefined) insuranceUpdateData.policyNumber = policyNumber;
          if (groupNumber !== undefined) insuranceUpdateData.groupNumber = groupNumber;
          await tx.insurancePolicy.update({where: {id: existingPrimary.id}, data: insuranceUpdateData});
        } else if (providerName && policyNumber) {
          const createData: {
            patientId: string;
            providerName: string;
            policyNumber: string;
            isPrimary: boolean;
            groupNumber?: string;
          } = {patientId: patient.id, providerName, policyNumber, isPrimary: true};
          if (groupNumber !== undefined) createData.groupNumber = groupNumber;
          await tx.insurancePolicy.create({data: createData});
        }
      }
    }

    await tx.appointment.update({
      where: {id: appointment.id},
      data: {status: "CHECKED_IN"},
    });
  });

  if (isHelsiConfigured()) {
    const meta = parseMeta(appointment.notes);
    const helsiClient = new HelsiApiClient();

    try {
      const helsiPayload: {
        allergies?: string;
        currentMedications?: string;
        demographics?: {
          firstName?: string;
          lastName?: string;
          phoneNumber?: string;
          emergencyContactName?: string;
          emergencyContactPhone?: string;
        };
      } = {};
      if (data.allergies !== undefined) helsiPayload.allergies = data.allergies;
      if (data.medications !== undefined) helsiPayload.currentMedications = data.medications;
      if (data.demographics) helsiPayload.demographics = data.demographics;
      await helsiClient.request(`/patients/${patient.id}`, {method: "PATCH", body: helsiPayload});
    } catch (error) {
      console.error("Failed to sync patient data to Helsi during check-in", error);
    }

    if (meta.helsiAppointmentId) {
      try {
        await helsiClient.request(`/appointments/${meta.helsiAppointmentId}`, {
          method: "PATCH",
          body: {status: "CHECKED_IN"},
        });
      } catch (error) {
        console.error("Failed to sync check-in status to Helsi", error);
      }
    }
  }

  return NextResponse.json({
    success: true,
    appointmentId: appointment.id,
    status: "CHECKED_IN",
  });
}
