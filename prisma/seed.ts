import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set to run database seeding");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({adapter});

async function main() {
  await prisma.$transaction([
    prisma.labResult.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.insurancePolicy.deleteMany(),
    prisma.proxyRelationship.deleteMany(),
    prisma.message.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.patient.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const olena = await prisma.user.create({
    data: {
      email: "olena.koval@example.com",
      firstName: "Olena",
      lastName: "Koval",
      localePreference: "uk",
      patientProfile: {
        create: {
          gender: "female",
          phoneNumber: "+380501112233",
          emergencyContactName: "Ivan Koval",
          emergencyContactPhone: "+380507778899",
          appointments: {
            create: {
              scheduledAt: new Date("2026-05-01T09:00:00.000Z"),
              reasonForVisit: "Профілактичний огляд",
              providerName: "Dr. Andriy Melnyk",
              location: "Lviv Central Clinic",
              status: "SCHEDULED",
            },
          },
          labResults: {
            create: {
              testName: "Загальний аналіз крові",
              resultValue: "У межах норми",
              status: "COMPLETED",
              observedAt: new Date("2026-04-15T08:30:00.000Z"),
              releasedAt: new Date("2026-04-15T12:00:00.000Z"),
            },
          },
        },
      },
    },
  });

  const james = await prisma.user.create({
    data: {
      email: "james.smith@example.com",
      firstName: "James",
      lastName: "Smith",
      localePreference: "en",
      patientProfile: {
        create: {
          gender: "male",
          phoneNumber: "+447700900123",
          emergencyContactName: "Sarah Smith",
          emergencyContactPhone: "+447700900456",
          appointments: {
            create: {
              scheduledAt: new Date("2026-05-03T14:30:00.000Z"),
              reasonForVisit: "Follow-up consultation",
              providerName: "Dr. Emily Carter",
              location: "Kyiv Riverside Clinic",
              status: "SCHEDULED",
            },
          },
          labResults: {
            create: {
              testName: "Lipid panel",
              resultValue: "Mildly elevated LDL",
              status: "REVIEWED",
              observedAt: new Date("2026-04-10T10:00:00.000Z"),
              releasedAt: new Date("2026-04-10T15:00:00.000Z"),
            },
          },
        },
      },
    },
  });

  console.log("Seeded patients:", [olena.email, james.email]);
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
