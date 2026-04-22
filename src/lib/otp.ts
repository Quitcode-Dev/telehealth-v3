import { createHmac, randomInt } from "node:crypto";
import prisma from "@/src/lib/prisma";

export const OTP_CODE_LENGTH = 6;
const OTP_CODE_MIN_VALUE = 10 ** (OTP_CODE_LENGTH - 1);
const OTP_CODE_MAX_EXCLUSIVE = 10 ** OTP_CODE_LENGTH;
export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_RATE_LIMIT_MAX_REQUESTS = 3;
export const OTP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const PHONE_NUMBER_PATTERN = /^\+?[0-9()\-\s]{8,20}$/;

function getOtpHashSecret() {
  const secret = process.env.OTP_HASH_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "dev-otp-hash-secret";
  }

  throw new Error("OTP hashing secret is not configured");
}

export function isValidOtpCode(code: string) {
  return new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`).test(code);
}

export function generateOtpCode() {
  return randomInt(OTP_CODE_MIN_VALUE, OTP_CODE_MAX_EXCLUSIVE).toString();
}

export function hashOtpCode(phoneNumber: string, otpCode: string) {
  return createHmac("sha256", getOtpHashSecret()).update(`${phoneNumber}:${otpCode}`).digest("hex");
}

export function isValidPhoneNumber(phoneNumber: string) {
  return PHONE_NUMBER_PATTERN.test(phoneNumber.trim());
}

export type OtpVerificationResult =
  | { ok: true }
  | { ok: false; reason: "expired" | "incorrect" };

type VerifyOtpOptions = {
  consume?: boolean;
};

export async function verifyAndConsumeOtpCode(
  phoneNumber: string,
  otpCode: string,
  options?: VerifyOtpOptions,
): Promise<OtpVerificationResult> {
  const consume = options?.consume ?? true;
  const record = await prisma.otpCode.findFirst({
    where: {
      phoneNumber,
      consumedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!record) {
    return { ok: false, reason: "incorrect" };
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: "expired" };
  }

  const codeHash = hashOtpCode(phoneNumber, otpCode);

  if (record.otpHash !== codeHash) {
    return { ok: false, reason: "incorrect" };
  }

  if (consume) {
    await prisma.otpCode.update({
      where: {
        id: record.id,
      },
      data: {
        consumedAt: new Date(),
      },
    });
  }

  return { ok: true };
}
