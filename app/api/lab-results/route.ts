import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {authOptions} from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Lab result service is unavailable"}, {status: 503});
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (typeof userId !== "string") {
    return NextResponse.json({error: "Unauthorized"}, {status: 401});
  }

  const patient = await prisma.patient.findUnique({
    where: {userId},
    select: {id: true},
  });

  if (!patient) {
    return NextResponse.json({error: "Patient profile not found"}, {status: 404});
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const categoryParam = url.searchParams.get("category");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const pageParam = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limitParam = Math.min(
    parseInt(url.searchParams.get("limit") ?? String(DEFAULT_PAGE_SIZE), 10),
    MAX_PAGE_SIZE,
  );

  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const limit = isNaN(limitParam) || limitParam < 1 ? DEFAULT_PAGE_SIZE : limitParam;

  // Build the where clause.
  const where = {
    patientId: patient.id,
    ...(statusParam === "released" ? {status: "RELEASED" as const} : {}),
    ...(categoryParam === "ROUTINE" || categoryParam === "SENSITIVE"
      ? {category: categoryParam as "ROUTINE" | "SENSITIVE"}
      : {}),
    ...(dateFrom || dateTo
      ? {
          releasedAt: {
            ...(dateFrom ? {gte: new Date(dateFrom)} : {}),
            ...(dateTo ? {lte: new Date(dateTo)} : {}),
          },
        }
      : {}),
  };

  const [total, labResults] = await Promise.all([
    prisma.labResult.count({where}),
    prisma.labResult.findMany({
      where,
      select: {
        id: true,
        testName: true,
        resultValue: true,
        contextNote: true,
        status: true,
        category: true,
        sourceSystem: true,
        observedAt: true,
        releasedAt: true,
        appointment: {
          select: {
            providerName: true,
          },
        },
      },
      orderBy: {releasedAt: "desc"},
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    labResults,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
