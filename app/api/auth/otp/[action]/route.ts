import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import prisma from "@/src/lib/prisma";
import {
  generateOtpCode,
  hashOtpCode,
  isValidOtpCode,
  OTP_RATE_LIMIT_MAX_REQUESTS,
  OTP_RATE_LIMIT_WINDOW_MS,
  OTP_TTL_MS,
} from "@/src/lib/otp";
import { getSmsProvider } from "@/src/lib/sms-provider";

const PATIENT_ROLE = "patient";

type RouteContext = {
  params: Promise<{ action: string }>;
};

function normalizePhoneNumber(phoneNumber: string) {
  return phoneNumber.trim();
}

async function sendOtp(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "OTP service unavailable" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { phoneNumber?: string } | null;
  const rawPhoneNumber = body?.phoneNumber;

  if (typeof rawPhoneNumber !== "string" || rawPhoneNumber.trim().length < 8) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const phoneNumber = normalizePhoneNumber(rawPhoneNumber);
  const now = new Date();
  const rateLimitWindowStart = new Date(now.getTime() - OTP_RATE_LIMIT_WINDOW_MS);

  const requestsInWindow = await prisma.otpCode.count({
    where: {
      phoneNumber,
      createdAt: {
        gte: rateLimitWindowStart,
      },
    },
  });

  if (requestsInWindow >= OTP_RATE_LIMIT_MAX_REQUESTS) {
    return NextResponse.json({ error: "Too many OTP requests. Please try again later." }, { status: 429 });
  }

  const otpCode = generateOtpCode();
  const otpHash = hashOtpCode(phoneNumber, otpCode);
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

  await prisma.otpCode.create({
    data: {
      phoneNumber,
      otpHash,
      expiresAt,
    },
  });

  await getSmsProvider().sendOtp({ phoneNumber, otpCode });

  return NextResponse.json({ success: true });
}

async function verifyOtp(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "OTP service unavailable" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { phoneNumber?: string; otpCode?: string } | null;
  const rawPhoneNumber = body?.phoneNumber;
  const rawOtpCode = body?.otpCode;

  if (typeof rawPhoneNumber !== "string" || typeof rawOtpCode !== "string") {
    return NextResponse.json({ error: "Phone number and OTP code are required" }, { status: 400 });
  }

  const phoneNumber = normalizePhoneNumber(rawPhoneNumber);
  const otpCode = rawOtpCode.trim();

  if (!isValidOtpCode(otpCode)) {
    return NextResponse.json({ error: "Invalid OTP format" }, { status: 400 });
  }

  const otpRecord = await prisma.otpCode.findFirst({
    where: {
      phoneNumber,
      consumedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!otpRecord) {
    return NextResponse.json({ error: "Incorrect OTP code" }, { status: 401 });
  }

  if (otpRecord.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "OTP has expired" }, { status: 401 });
  }

  const otpHash = hashOtpCode(phoneNumber, otpCode);

  if (otpRecord.otpHash !== otpHash) {
    return NextResponse.json({ error: "Incorrect OTP code" }, { status: 401 });
  }

  await prisma.otpCode.update({
    where: {
      id: otpRecord.id,
    },
    data: {
      consumedAt: new Date(),
    },
  });

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ phoneNumber }, { patientProfile: { phoneNumber } }],
    },
    include: {
      patientProfile: {
        select: {
          phoneNumber: true,
        },
      },
    },
  });

  if (!user || !user.patientProfile) {
    return NextResponse.json({ error: "User not found for phone number" }, { status: 404 });
  }

  const patientPhone = user.phoneNumber ?? user.patientProfile.phoneNumber ?? phoneNumber;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;

  const sessionToken = nextAuthSecret
    ? await encode({
        token: {
          sub: user.id,
          phone: patientPhone,
          locale: user.localePreference,
          role: PATIENT_ROLE,
        },
        secret: nextAuthSecret,
        maxAge: 60 * 60,
      })
    : randomUUID();

  return NextResponse.json({
    success: true,
    token: sessionToken,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { action } = await context.params;

  if (action === "send") {
    return sendOtp(request);
  }

  if (action === "verify") {
    return verifyOtp(request);
  }

  return NextResponse.json({ error: "Unsupported OTP action" }, { status: 404 });
}
