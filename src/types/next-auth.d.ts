import type {DefaultSession} from "next-auth";
import type {JWT as DefaultJWT} from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      phone: string | null;
      locale: string;
      role: string;
    };
  }

  interface User {
    phone?: string | null;
    locale?: string;
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    phone?: string | null;
    locale?: string;
    role?: string;
  }
}
