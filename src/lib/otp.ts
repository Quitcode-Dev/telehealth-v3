import { createHmac, randomInt } from "node:crypto";

export const OTP_CODE_LENGTH = 6;
export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_RATE_LIMIT_MAX_REQUESTS = 3;
export const OTP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function getOtpHashSecret() {
  const secret = process.env.OTP_HASH_SECRET ?? process.env.NEXTAUTH_SECRET;

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
  return randomInt(0, 10 ** OTP_CODE_LENGTH).toString().padStart(OTP_CODE_LENGTH, "0");
}

export function hashOtpCode(phoneNumber: string, otpCode: string) {
  return createHmac("sha256", getOtpHashSecret()).update(`${phoneNumber}:${otpCode}`).digest("hex");
}
