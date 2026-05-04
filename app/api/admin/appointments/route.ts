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

  // Determine UTC day boundaries for the requested date.
  // Dates are always treated as UTC calendar days so the query window is stable
  // regardless of the server's local timezone. Callers should pass the date as
  // the local calendar date in their own timezone (e.g. "2025-01-15").
  let startOfDay: Date;
  let endOfDay: Date;

  if (!dateParam || dateParam === "today") {
    const now = new Date();
    startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  } else {
    // Parse "YYYY-MM-DD" directly as a UTC calendar day to avoid local-timezone shifts
    // that occur when passing an ISO date string to the `Date` constructor.
    const parts = dateParam.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!parts) {
      return NextResponse.json({error: "Invalid date parameter — expected YYYY-MM-DD"}, {status: 400});
    }
    const year = Number(parts[1]);
    const month = Number(parts[2]) - 1; // 0-indexed
    const day = Number(parts[3]);
    startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
    if (isNaN(startOfDay.getTime())) {
      return NextResponse.json({error: "Invalid date parameter — expected YYYY-MM-DD"}, {status: 400});
    }
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
    const terms = searchParam.trim().split(/\s+/);

    // Build name match conditions. Each condition targets the nested patient.user relation.
    // Single term → match firstName or lastName independently.
    // Multiple terms → also try first-term → firstName AND last-term → lastName so that
    // a query like "Jane Doe" correctly returns patients whose firstName contains "Jane"
    // and lastName contains "Doe".
    const nameOrConditions: {user: Record<string, unknown>}[] = [
      {user: {firstName: {contains: searchParam, mode: "insensitive"}}},
      {user: {lastName: {contains: searchParam, mode: "insensitive"}}},
    ];

    if (terms.length >= 2) {
      nameOrConditions.push({
        user: {
          firstName: {contains: terms[0], mode: "insensitive"},
          lastName: {contains: terms[terms.length - 1], mode: "insensitive"},
        },
      });
    }

    where.patient = {
      OR: [
        ...nameOrConditions,
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
