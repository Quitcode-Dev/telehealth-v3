import {PrismaAdapter} from "@auth/prisma-adapter";
import type {Adapter} from "next-auth/adapters";
import type {NextAuthOptions} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/src/lib/prisma";

const OTP_CODE_LENGTH = 6;

function isValidOtpCode(code: string) {
  return /^\d{6}$/.test(code);
}

function verifyOtpCode(code: string) {
  const expectedCode = process.env.SMS_OTP_CODE;

  if (!expectedCode) {
    return false;
  }

  return code === expectedCode;
}

export const authOptions: NextAuthOptions = {
  adapter: process.env.DATABASE_URL
    ? (PrismaAdapter(prisma as never) as Adapter)
    : undefined,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60,
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

        if (!phoneNumber || !otpCode || otpCode.length !== OTP_CODE_LENGTH || !isValidOtpCode(otpCode)) {
          return null;
        }

        if (!verifyOtpCode(otpCode)) {
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

        const patientPhone = user.phoneNumber ?? user.patientProfile.phoneNumber ?? phoneNumber;

        return {
          id: user.id,
          email: user.email,
          phone: patientPhone,
          locale: user.localePreference,
          role: "patient",
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
        session.user.id = (token.id as string | undefined) ?? token.sub ?? "";
        session.user.phone = token.phone as string | null;
        session.user.locale = token.locale as string;
        session.user.role = token.role as string;
      }

      return session;
    },
  },
};
