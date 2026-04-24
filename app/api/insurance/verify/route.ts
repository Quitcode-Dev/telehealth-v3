import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {z} from "zod";
import {authOptions} from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import {verifyInsurance} from "@/src/lib/insurance/verification";

export type InsuranceVerificationStatus = "covered" | "not_covered" | "pending";

export type InsuranceVerificationResult = {
  status: InsuranceVerificationStatus;
  insuranceProvider: string | null;
  policyNumber: string | null;
  totalPrice: number;
  coverageAmount: number;
  coPay: number;
};

const STANDARD_CONSULTATION_PRICE_UAH = 500;
const NHSU_COVERAGE_AMOUNT_UAH = 400;

function unauthorized() {
  return NextResponse.json({error: "Unauthorized"}, {status: 401});
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    // Database unavailable — return pending status with full price as co-pay
    const result: InsuranceVerificationResult = {
      status: "pending",
      insuranceProvider: null,
      policyNumber: null,
      totalPrice: STANDARD_CONSULTATION_PRICE_UAH,
      coverageAmount: 0,
      coPay: STANDARD_CONSULTATION_PRICE_UAH,
    };
    return NextResponse.json(result);
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return unauthorized();
  }

  const patient = await prisma.patient.findUnique({
    where: {userId},
    select: {
      id: true,
      insurancePolicies: {
        where: {isPrimary: true},
        select: {
          providerName: true,
          policyNumber: true,
          expirationDate: true,
        },
        take: 1,
      },
    },
  });

  if (!patient) {
    return NextResponse.json({error: "Patient not found"}, {status: 404});
  }

  const primaryPolicy = patient.insurancePolicies[0] ?? null;

  // Check if the policy is expired
  const isExpired = primaryPolicy?.expirationDate
    ? primaryPolicy.expirationDate < new Date()
    : false;

  if (!primaryPolicy || isExpired) {
    const result: InsuranceVerificationResult = {
      status: "not_covered",
      insuranceProvider: null,
      policyNumber: null,
      totalPrice: STANDARD_CONSULTATION_PRICE_UAH,
      coverageAmount: 0,
      coPay: STANDARD_CONSULTATION_PRICE_UAH,
    };
    return NextResponse.json(result);
  }

  const coverageAmount = NHSU_COVERAGE_AMOUNT_UAH;
  const coPay = Math.max(0, STANDARD_CONSULTATION_PRICE_UAH - coverageAmount);

  const result: InsuranceVerificationResult = {
    status: "covered",
    insuranceProvider: primaryPolicy.providerName,
    policyNumber: primaryPolicy.policyNumber,
    totalPrice: STANDARD_CONSULTATION_PRICE_UAH,
    coverageAmount,
    coPay,
  };

  return NextResponse.json(result);
}

const verifyInsuranceSchema = z.object({
  patientId: z.string().uuid(),
  appointmentTypeId: z.string().trim().min(1),
}).strict();

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Insurance verification is unavailable"}, {status: 503});
  }

  const body = await request.json().catch(() => null);
  const parsed = verifyInsuranceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({error: "Invalid request payload"}, {status: 400});
  }

  const {patientId, appointmentTypeId} = parsed.data;

  try {
    const result = await verifyInsurance(patientId, appointmentTypeId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Patient not found")) {
      return NextResponse.json({error: "Patient not found"}, {status: 404});
    }
    console.error("Insurance verification failed", error);
    return NextResponse.json({error: "Insurance verification failed"}, {status: 502});
  }
}
