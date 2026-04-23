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
}).strict();

function unauthorized() {
  return NextResponse.json({error: "Unauthorized"}, {status: 401});
}

async function getUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  return typeof userId === "string" ? userId : null;
}

type AccessResolution = {
  patientId: string;
  isProxyView: boolean;
};

async function resolvePatientAccess(userId: string, requestedPatientId: string | null): Promise<AccessResolution | null> {
  const ownProfile = await prisma.patient.findUnique({
    where: {userId},
    select: {id: true},
  });

  if (!ownProfile) {
    return null;
  }

  if (!requestedPatientId || requestedPatientId === ownProfile.id) {
    return {patientId: ownProfile.id, isProxyView: false};
  }

  const relationship = await prisma.proxyRelationship.findFirst({
    where: {
      proxyUserId: userId,
      patientId: requestedPatientId,
      status: "APPROVED",
      isActive: true,
      startsAt: {
        lte: new Date(),
      },
      OR: [
        {endsAt: null},
        {
          endsAt: {
            gt: new Date(),
          },
        },
      ],
    },
    select: {id: true},
  });

  if (!relationship) {
    return null;
  }

  return {patientId: requestedPatientId, isProxyView: true};
}

async function getProfile(patientId: string) {
  return prisma.patient.findUnique({
    where: {id: patientId},
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
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

function mapProfile(profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>, access: AccessResolution) {
  const primaryInsurance = profile.insurancePolicies[0];

  return {
    userId: profile.user.id,
    patientId: profile.id,
    isProxyView: access.isProxyView,
    demographics: {
      firstName: profile.user.firstName,
      lastName: profile.user.lastName,
      email: profile.user.email,
      dateOfBirth: profile.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      gender: profile.gender ?? null,
      phoneNumber: profile.phoneNumber ?? null,
      emergencyContactName: profile.emergencyContactName ?? "",
      emergencyContactPhone: profile.emergencyContactPhone ?? "",
    },
    insurance: {
      providerName: primaryInsurance?.providerName ?? "",
      policyNumber: primaryInsurance?.policyNumber ?? "",
      groupNumber: primaryInsurance?.groupNumber ?? "",
    },
    medicalSummary: {
      allergies: profile.allergies ?? "",
      currentMedications: profile.currentMedications ?? "",
    },
    communicationPreferences: {
      push: profile.prefersPushNotifications ?? true,
      sms: profile.prefersSmsNotifications ?? false,
      viber: profile.prefersViberNotifications ?? false,
    },
  };
}

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Patient profile is unavailable"}, {status: 503});
  }

  const userId = await getUserId();

  if (!userId) {
    return unauthorized();
  }

  const requestedProfileIdRaw = new URL(request.url).searchParams.get("profileId");
  const requestedProfileId = requestedProfileIdRaw && z.uuid().safeParse(requestedProfileIdRaw).success
    ? requestedProfileIdRaw
    : null;
  const access = await resolvePatientAccess(userId, requestedProfileId);

  if (!access) {
    return NextResponse.json({error: "Profile not found"}, {status: 404});
  }

  const profile = await getProfile(access.patientId);

  if (!profile) {
    return NextResponse.json({error: "Profile not found"}, {status: 404});
  }

  return NextResponse.json(mapProfile(profile, access));
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

  const access = await resolvePatientAccess(userId, null);

  if (!access) {
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
        where: {id: access.patientId},
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
          patientId: access.patientId,
          isPrimary: true,
        },
        select: {id: true},
      });

      if (existingPrimary) {
        const insuranceUpdateData: {
          providerName?: string;
          policyNumber?: string;
          groupNumber?: string;
        } = {};

        if (data.insuranceProviderName !== undefined) {
          insuranceUpdateData.providerName = data.insuranceProviderName;
        }

        if (data.insurancePolicyNumber !== undefined) {
          insuranceUpdateData.policyNumber = data.insurancePolicyNumber;
        }

        if (data.insuranceGroupNumber !== undefined) {
          insuranceUpdateData.groupNumber = data.insuranceGroupNumber;
        }

        await tx.insurancePolicy.update({
          where: {id: existingPrimary.id},
          data: insuranceUpdateData,
        });
      } else if (data.insuranceProviderName && data.insurancePolicyNumber) {
        const insuranceCreateData: {
          patientId: string;
          providerName: string;
          policyNumber: string;
          isPrimary: boolean;
          groupNumber?: string;
        } = {
          patientId: access.patientId,
          providerName: data.insuranceProviderName,
          policyNumber: data.insurancePolicyNumber,
          isPrimary: true,
        };

        if (data.insuranceGroupNumber !== undefined) {
          insuranceCreateData.groupNumber = data.insuranceGroupNumber;
        }

        await tx.insurancePolicy.create({
          data: insuranceCreateData,
        });
      }
    }
  });

  const updatedProfile = await getProfile(access.patientId);

  if (!updatedProfile) {
    return NextResponse.json({error: "Profile not found"}, {status: 404});
  }

  return NextResponse.json(mapProfile(updatedProfile, access));
}
