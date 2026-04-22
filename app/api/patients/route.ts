import {NextResponse} from "next/server";
import prisma from "@/src/lib/prisma";
import {isValidPhoneNumber} from "@/src/lib/otp";

type CreatePatientPayload = {
  fullName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  email?: string;
  preferredLanguage?: string;
  coverageType?: "nhsu" | "private";
  coverageId?: string;
  consentGiven?: boolean;
};

function splitFullName(fullName: string) {
  const normalized = fullName.trim().replace(/\s+/g, " ");
  const [firstName, ...lastNameParts] = normalized.split(" ");
  const lastName = lastNameParts.join(" ");
  return {firstName, lastName};
}

function isValidDate(value: string) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Patient registration is unavailable"}, {status: 503});
  }

  const body = (await request.json().catch(() => null)) as CreatePatientPayload | null;
  const fullName = body?.fullName?.trim();
  const phoneNumber = body?.phoneNumber?.trim();
  const dateOfBirth = body?.dateOfBirth?.trim();
  const email = body?.email?.trim();
  const preferredLanguage = body?.preferredLanguage?.trim();
  const coverageType = body?.coverageType;
  const coverageId = body?.coverageId?.trim();
  const consentGiven = body?.consentGiven === true;

  if (!fullName || !phoneNumber || !dateOfBirth || !preferredLanguage || !coverageType || !coverageId || !consentGiven) {
    return NextResponse.json({error: "Missing required fields"}, {status: 400});
  }

  if (!isValidPhoneNumber(phoneNumber)) {
    return NextResponse.json({error: "Invalid phone number"}, {status: 400});
  }

  if (!isValidDate(dateOfBirth)) {
    return NextResponse.json({error: "Invalid date of birth"}, {status: 400});
  }

  if (new Date(dateOfBirth).getTime() > Date.now()) {
    return NextResponse.json({error: "Date of birth cannot be in the future"}, {status: 400});
  }

  if (!["en", "uk"].includes(preferredLanguage)) {
    return NextResponse.json({error: "Unsupported preferred language"}, {status: 400});
  }

  if (!["nhsu", "private"].includes(coverageType)) {
    return NextResponse.json({error: "Unsupported coverage type"}, {status: 400});
  }

  const {firstName, lastName} = splitFullName(fullName);

  if (!firstName || !lastName) {
    return NextResponse.json({error: "Full name must include first and last name"}, {status: 400});
  }

  const duplicateUser = await prisma.user.findFirst({
    where: {
      OR: [
        {phoneNumber},
        {
          patientProfile: {
            phoneNumber,
          },
        },
      ],
    },
    select: {id: true},
  });

  if (duplicateUser) {
    return NextResponse.json({error: "Phone number already registered"}, {status: 409});
  }

  if (email) {
    const existingEmail = await prisma.user.findUnique({
      where: {email},
      select: {id: true},
    });

    if (existingEmail) {
      return NextResponse.json({error: "Email already registered"}, {status: 409});
    }
  }

  const generatedEmail = `${phoneNumber.replace(/\D/g, "")}@patient.local`;

  const user = await prisma.user.create({
    data: {
      email: email || generatedEmail,
      firstName,
      lastName,
      phoneNumber,
      localePreference: preferredLanguage,
      patientProfile: {
        create: {
          phoneNumber,
          dateOfBirth: new Date(dateOfBirth),
          insurancePolicies: {
            create: {
              providerName: coverageType === "nhsu" ? "NHSU" : "Private Insurance",
              policyNumber: coverageId,
              isPrimary: true,
            },
          },
        },
      },
    },
    select: {
      id: true,
      patientProfile: {
        select: {id: true},
      },
    },
  });

  return NextResponse.json({success: true, userId: user.id, patientId: user.patientProfile?.id, phoneNumber}, {status: 201});
}
