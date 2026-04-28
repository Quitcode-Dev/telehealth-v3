import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {authOptions} from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

export async function GET(
  _request: Request,
  {params}: {params: Promise<{id: string}>},
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Lab result service is unavailable"}, {status: 503});
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

  const {id} = await params;

  const labResult = await prisma.labResult.findUnique({
    where: {id},
    select: {
      id: true,
      patientId: true,
      testName: true,
      resultValue: true,
      contextNote: true,
      status: true,
      category: true,
      loincCode: true,
      sourceSystem: true,
      observedAt: true,
      releasedAt: true,
      appointment: {
        select: {
          providerName: true,
        },
      },
    },
  });

  if (!labResult) {
    return NextResponse.json({error: "Lab result not found"}, {status: 404});
  }

  if (labResult.patientId !== patient.id) {
    return NextResponse.json({error: "Forbidden"}, {status: 403});
  }

  return NextResponse.json({labResult});
}
