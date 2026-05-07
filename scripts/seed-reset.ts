import {resolve} from "node:path";
import {config as loadEnv} from "dotenv";
import {PrismaPg} from "@prisma/adapter-pg";
import {PrismaClient} from "@prisma/client";

loadEnv({path: resolve(process.cwd(), ".env.local")});
loadEnv();

// This reset is intentionally guarded for local development only.
// Set ALLOW_SEED_RESET=true when you really want to clear the seeded tables.
if (process.env.ALLOW_SEED_RESET !== "true") {
  console.error("Seed reset refused: set ALLOW_SEED_RESET=true to continue.");
  process.exit(1);
}

let prisma: PrismaClient | null = null;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set to run npm run seed:reset");
  }

  prisma = new PrismaClient({
    adapter: new PrismaPg({connectionString: databaseUrl}),
  });

  await prisma.$transaction([
    prisma.labResult.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.insurancePolicy.deleteMany(),
    prisma.proxyRelationship.deleteMany(),
    prisma.consentRecord.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.message.deleteMany(),
    prisma.messageThread.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.otpCode.deleteMany(),
    prisma.patient.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log("✓ Seed reset completed");
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Seed reset failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
