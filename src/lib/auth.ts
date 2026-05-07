import {PrismaAdapter} from "@auth/prisma-adapter";
import type {Adapter} from "next-auth/adapters";
import type {NextAuthOptions} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {getDemoPersona, isDemoModeEnabled, isDemoRole} from "@/src/lib/demo-auth";
import prisma from "@/src/lib/prisma";
import {isValidOtpCode, verifyAndConsumeOtpCode} from "@/src/lib/otp";

const SESSION_MAX_AGE_SECONDS = 60 * 60;
export const PATIENT_ROLE = "patient";
export const ADMIN_ROLE = "admin";

async function verifyOtpCode(phoneNumber: string, code: string) {
  const result = await verifyAndConsumeOtpCode(phoneNumber, code);
  return result.ok;
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

        if (!(await verifyOtpCode(phoneNumber, otpCode))) {
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
    CredentialsProvider({
      id: "demo-login",
      name: "Demo Login",
      credentials: {
        demoRole: {label: "Demo role", type: "text"},
      },
      async authorize(credentials) {
        const demoRole = credentials?.demoRole?.trim();

        if (!demoRole || !isDemoModeEnabled() || !isDemoRole(demoRole)) {
          return null;
        }

        const persona = getDemoPersona(demoRole);

        if (!persona) {
          return null;
        }

        return {
          id: `demo-${persona.role}`,
          name: persona.displayName,
          email: persona.email,
          locale: persona.locale,
          role: persona.role,
          isDemo: true,
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
        token.isDemo = user.isDemo;
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
        session.user.isDemo = token.isDemo === true;
      }

      return session;
    },
  },
};
