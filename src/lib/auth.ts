import {PrismaAdapter} from "@auth/prisma-adapter";
import type {Adapter} from "next-auth/adapters";
import type {NextAuthOptions} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/src/lib/prisma";

function isValidOtpCode(code: string) {
  return /^\d{6}$/.test(code);
}

const SESSION_MAX_AGE_SECONDS = 60 * 60;
const PATIENT_ROLE = "patient";

function verifyOtpCode(phoneNumber: string, code: string) {
  const rawOtpStore = process.env.SMS_OTP_CODES_JSON;

  if (!rawOtpStore) {
    return false;
  }

  try {
    const otpStore = JSON.parse(rawOtpStore) as Record<string, {code: string; expiresAt: string}>;
    const record = otpStore[phoneNumber];

    if (!record || record.code !== code) {
      return false;
    }

    return new Date(record.expiresAt).getTime() > Date.now();
  } catch {
    return false;
  }
}

export const authOptions: NextAuthOptions = {
  // `@auth/prisma-adapter` and `next-auth` adapter types currently differ, so a cast is required.
  adapter: process.env.DATABASE_URL
    ? (PrismaAdapter(prisma as never) as Adapter)
    : undefined,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "SMS OTP",
      credentials: {
        phoneNumber: {label: "Phone number", type: "text"},
        otpCode: {label: "OTP code", type: "text"},
      },
      async authorize(credentials) {
        if (!process.env.DATABASE_URL) {
          return null;
        }

        const phoneNumber = credentials?.phoneNumber?.trim();
        const otpCode = credentials?.otpCode?.trim();

        if (!phoneNumber || !otpCode || !isValidOtpCode(otpCode)) {
          return null;
        }

        if (!verifyOtpCode(phoneNumber, otpCode)) {
          return null;
        }

        const user = await prisma.user.findFirst({
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
          include: {
            patientProfile: {
              select: {
                id: true,
                phoneNumber: true,
              },
            },
          },
        });

        if (!user || !user.patientProfile) {
          return null;
        }

        const patientPhone = user.phoneNumber ?? user.patientProfile.phoneNumber;

        if (!patientPhone) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          phone: patientPhone,
          locale: user.localePreference,
          role: PATIENT_ROLE,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({token, user}) {
      if (user) {
        token.id = user.id;
        token.phone = user.phone;
        token.locale = user.locale;
        token.role = user.role;
      }

      return token;
    },
    async session({session, token}) {
      if (session.user) {
        const userId = typeof token.id === "string" ? token.id : token.sub;

        if (!userId) {
          console.warn("Session token missing user ID; returning session without user metadata", {
            tokenSub: token.sub,
          });
          return session;
        }

        session.user.id = userId;
        session.user.phone = typeof token.phone === "string" ? token.phone : null;
        session.user.locale = typeof token.locale === "string" ? token.locale : "en";
        session.user.role = typeof token.role === "string" ? token.role : PATIENT_ROLE;
      }

      return session;
    },
  },
};
