import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {z} from "zod";
import {authOptions} from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import {isValidPhoneNumber} from "@/src/lib/otp";

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  email: z.email().optional(),
  phoneNumber: z.string().trim().optional(),
  emergencyContactName: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),
  insuranceProviderName: z.string().trim().optional(),
  insurancePolicyNumber: z.string().trim().optional(),
  insuranceGroupNumber: z.string().trim().optional(),
  allergies: z.string().trim().optional(),
  currentMedications: z.string().trim().optional(),
  prefersPushNotifications: z.boolean().optional(),
  prefersSmsNotifications: z.boolean().optional(),
  prefersViberNotifications: z.boolean().optional(),
});

function unauthorized() {
  return NextResponse.json({error: "Unauthorized"}, {status: 401});
}

async function getUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  return typeof userId === "string" ? userId : null;
}

async function getProfile(userId: string) {
  return prisma.user.findUnique({
    where: {id: userId},
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      patientProfile: {
        select: {
          id: true,
          dateOfBirth: true,
          gender: true,
          phoneNumber: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          allergies: true,
          currentMedications: true,
          prefersPushNotifications: true,
          prefersSmsNotifications: true,
          prefersViberNotifications: true,
          insurancePolicies: {
            where: {isPrimary: true},
            select: {
              providerName: true,
              policyNumber: true,
              groupNumber: true,
            },
            take: 1,
          },
        },
      },
    },
  });
}

function mapProfile(profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>) {
  const patientProfile = profile.patientProfile;
  const primaryInsurance = patientProfile?.insurancePolicies[0];

  return {
    userId: profile.id,
    demographics: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      dateOfBirth: patientProfile?.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      gender: patientProfile?.gender ?? null,
      phoneNumber: patientProfile?.phoneNumber ?? null,
      emergencyContactName: patientProfile?.emergencyContactName ?? "",
      emergencyContactPhone: patientProfile?.emergencyContactPhone ?? "",
    },
    insurance: {
      providerName: primaryInsurance?.providerName ?? "",
      policyNumber: primaryInsurance?.policyNumber ?? "",
      groupNumber: primaryInsurance?.groupNumber ?? "",
    },
    medicalSummary: {
      allergies: patientProfile?.allergies ?? "",
      currentMedications: patientProfile?.currentMedications ?? "",
    },
    communicationPreferences: {
      push: patientProfile?.prefersPushNotifications ?? true,
      sms: patientProfile?.prefersSmsNotifications ?? false,
      viber: patientProfile?.prefersViberNotifications ?? false,
    },
  };
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Patient profile is unavailable"}, {status: 503});
  }

  const userId = await getUserId();

  if (!userId) {
    return unauthorized();
  }

  const profile = await getProfile(userId);

  if (!profile || !profile.patientProfile) {
    return NextResponse.json({error: "Profile not found"}, {status: 404});
  }

  return NextResponse.json(mapProfile(profile));
}

export async function PATCH(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Patient profile is unavailable"}, {status: 503});
  }

  const userId = await getUserId();

  if (!userId) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({error: "Invalid profile payload"}, {status: 400});
  }

  const profile = await prisma.patient.findUnique({
    where: {userId},
    select: {id: true},
  });

  if (!profile) {
    return NextResponse.json({error: "Profile not found"}, {status: 404});
  }

  const data = parsed.data;

  if (data.phoneNumber && !isValidPhoneNumber(data.phoneNumber)) {
    return NextResponse.json({error: "Invalid phone number"}, {status: 400});
  }

  if (data.emergencyContactPhone && !isValidPhoneNumber(data.emergencyContactPhone)) {
    return NextResponse.json({error: "Invalid emergency contact phone number"}, {status: 400});
  }

  await prisma.$transaction(async (tx) => {
    const userUpdateData: {firstName?: string; lastName?: string; email?: string} = {};

    if (data.firstName !== undefined) {
      userUpdateData.firstName = data.firstName;
    }

    if (data.lastName !== undefined) {
      userUpdateData.lastName = data.lastName;
    }

    if (data.email !== undefined) {
      userUpdateData.email = data.email;
    }

    if (Object.keys(userUpdateData).length > 0) {
      await tx.user.update({
        where: {id: userId},
        data: userUpdateData,
      });
    }

    const patientUpdateData: {
      phoneNumber?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      allergies?: string;
      currentMedications?: string;
      prefersPushNotifications?: boolean;
      prefersSmsNotifications?: boolean;
      prefersViberNotifications?: boolean;
    } = {};

    if (data.phoneNumber !== undefined) {
      patientUpdateData.phoneNumber = data.phoneNumber;
    }

    if (data.emergencyContactName !== undefined) {
      patientUpdateData.emergencyContactName = data.emergencyContactName;
    }

    if (data.emergencyContactPhone !== undefined) {
      patientUpdateData.emergencyContactPhone = data.emergencyContactPhone;
    }

    if (data.allergies !== undefined) {
      patientUpdateData.allergies = data.allergies;
    }

    if (data.currentMedications !== undefined) {
      patientUpdateData.currentMedications = data.currentMedications;
    }

    if (data.prefersPushNotifications !== undefined) {
      patientUpdateData.prefersPushNotifications = data.prefersPushNotifications;
    }

    if (data.prefersSmsNotifications !== undefined) {
      patientUpdateData.prefersSmsNotifications = data.prefersSmsNotifications;
    }

    if (data.prefersViberNotifications !== undefined) {
      patientUpdateData.prefersViberNotifications = data.prefersViberNotifications;
    }

    if (Object.keys(patientUpdateData).length > 0) {
      await tx.patient.update({
        where: {id: profile.id},
        data: patientUpdateData,
      });
    }

    const hasInsuranceUpdate =
      data.insuranceProviderName !== undefined ||
      data.insurancePolicyNumber !== undefined ||
      data.insuranceGroupNumber !== undefined;

    if (hasInsuranceUpdate) {
      const existingPrimary = await tx.insurancePolicy.findFirst({
        where: {
          patientId: profile.id,
          isPrimary: true,
        },
        select: {id: true},
      });

      if (existingPrimary) {
        await tx.insurancePolicy.update({
          where: {id: existingPrimary.id},
          data: {
            providerName: data.insuranceProviderName ?? undefined,
            policyNumber: data.insurancePolicyNumber ?? undefined,
            groupNumber: data.insuranceGroupNumber ?? undefined,
          },
        });
      } else if (data.insuranceProviderName && data.insurancePolicyNumber) {
        await tx.insurancePolicy.create({
          data: {
            patientId: profile.id,
            providerName: data.insuranceProviderName,
            policyNumber: data.insurancePolicyNumber,
            groupNumber: data.insuranceGroupNumber,
            isPrimary: true,
          },
        });
      }
    }
  });

  const updatedProfile = await getProfile(userId);

  if (!updatedProfile || !updatedProfile.patientProfile) {
    return NextResponse.json({error: "Profile not found"}, {status: 404});
  }

  return NextResponse.json(mapProfile(updatedProfile));
}
