import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const connectionString = process.env.DATABASE_URL;

const createPrismaClient = () => {
  if (connectionString) {
    const adapter = new PrismaPg({ connectionString });
    return new PrismaClient({ adapter });
  }

  return new Proxy({} as PrismaClient, {
    get() {
      throw new Error("DATABASE_URL must be set before using PrismaClient");
    },
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
