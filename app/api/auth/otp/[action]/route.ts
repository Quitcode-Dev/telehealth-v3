import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import prisma from "@/src/lib/prisma";
import {
  generateOtpCode,
  hashOtpCode,
  isValidPhoneNumber,
  isValidOtpCode,
  OTP_RATE_LIMIT_MAX_REQUESTS,
  OTP_RATE_LIMIT_WINDOW_MS,
  OTP_TTL_MS,
  verifyAndConsumeOtpCode,
} from "@/src/lib/otp";
import { getSmsProvider } from "@/src/lib/sms-provider";

const PATIENT_ROLE = "patient";
const MIN_PHONE_NUMBER_LENGTH = 8;
const SESSION_TOKEN_MAX_AGE_SECONDS = 60 * 60;

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

  if (
    typeof rawPhoneNumber !== "string" ||
    rawPhoneNumber.trim().length < MIN_PHONE_NUMBER_LENGTH ||
    !isValidPhoneNumber(rawPhoneNumber)
  ) {
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
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

  await prisma.otpCode.create({
    data: {
      phoneNumber,
      otpHash: hashOtpCode(phoneNumber, otpCode),
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

  if (!isValidPhoneNumber(phoneNumber)) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  if (!isValidOtpCode(otpCode)) {
    return NextResponse.json({ error: "Invalid OTP format" }, { status: 400 });
  }

  const otpVerification = await verifyAndConsumeOtpCode(phoneNumber, otpCode);

  if (!otpVerification.ok && otpVerification.reason === "expired") {
    return NextResponse.json({ error: "OTP has expired" }, { status: 401 });
  }

  if (!otpVerification.ok) {
    return NextResponse.json({ error: "Incorrect OTP code" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
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
    take: 2,
  });

  if (users.length === 0) {
    return NextResponse.json({ error: "User not found for phone number" }, { status: 404 });
  }

  if (users.length > 1) {
    return NextResponse.json({ error: "Phone number matches multiple users" }, { status: 409 });
  }

  const user = users[0];

  if (!user.patientProfile) {
    return NextResponse.json({ error: "User not found for phone number" }, { status: 404 });
  }

  const patientPhone = user.phoneNumber ?? user.patientProfile.phoneNumber;

  if (!patientPhone) {
    return NextResponse.json({ error: "User phone number is unavailable" }, { status: 404 });
  }
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;

  if (!nextAuthSecret) {
    return NextResponse.json({ error: "Session token service unavailable" }, { status: 503 });
  }

  const sessionToken = await encode({
    token: {
      sub: user.id,
      phone: patientPhone,
      locale: user.localePreference,
      role: PATIENT_ROLE,
    },
    secret: nextAuthSecret,
    maxAge: SESSION_TOKEN_MAX_AGE_SECONDS,
  });

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
