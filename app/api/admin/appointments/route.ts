import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {authOptions, ADMIN_ROLE} from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

function unauthorized() {
  return NextResponse.json({error: "Unauthorized"}, {status: 401});
}

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Appointments are unavailable"}, {status: 503});
  }

  const session = await getServerSession(authOptions);

  if (session?.user?.role !== ADMIN_ROLE) {
    return unauthorized();
  }

  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const locationParam = url.searchParams.get("location");
  const searchParam = url.searchParams.get("search")?.trim() ?? "";

  // Determine the date range to query
  let startOfDay: Date;
  let endOfDay: Date;

  if (!dateParam || dateParam === "today") {
    startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
  } else {
    // Accept ISO date string like "2025-01-15"
    const parsed = new Date(dateParam);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json({error: "Invalid date parameter"}, {status: 400});
    }
    startOfDay = new Date(parsed);
    startOfDay.setHours(0, 0, 0, 0);
    endOfDay = new Date(parsed);
    endOfDay.setHours(23, 59, 59, 999);
  }

  // Build the base where clause
  type WhereClause = NonNullable<Parameters<typeof prisma.appointment.findMany>[0]>["where"];

  const where: WhereClause = {
    scheduledAt: {gte: startOfDay, lte: endOfDay},
  };

  if (locationParam) {
    where.location = locationParam;
  }

  if (searchParam) {
    where.patient = {
      OR: [
        {
          user: {
            OR: [
              {firstName: {contains: searchParam, mode: "insensitive"}},
              {lastName: {contains: searchParam, mode: "insensitive"}},
            ],
          },
        },
        {phoneNumber: {contains: searchParam}},
      ],
    };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      reasonForVisit: true,
      providerName: true,
      location: true,
      patient: {
        select: {
          id: true,
          phoneNumber: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          insurancePolicies: {
            where: {isPrimary: true},
            select: {
              id: true,
              providerName: true,
              policyNumber: true,
              effectiveDate: true,
              expirationDate: true,
            },
            take: 1,
          },
        },
      },
    },
    orderBy: {scheduledAt: "asc"},
  });

  // Collect distinct locations for the clinic filter dropdown
  const allLocations = await prisma.appointment.findMany({
    where: {
      scheduledAt: {gte: startOfDay, lte: endOfDay},
      location: {not: null},
    },
    select: {location: true},
    distinct: ["location"],
    orderBy: {location: "asc"},
  });

  const clinics = allLocations
    .map((a) => a.location)
    .filter((loc): loc is string => loc !== null);

  return NextResponse.json({appointments, clinics});
}
