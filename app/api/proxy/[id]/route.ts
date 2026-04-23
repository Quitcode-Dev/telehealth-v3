import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {Prisma} from "@prisma/client";
import {z} from "zod";
import {authOptions} from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

const updateProxyStatusSchema = z.object({
  status: z.string().trim().toUpperCase().pipe(z.enum(["PENDING", "APPROVED", "REJECTED"])),
}).strict();

type RouteContext = {
  params: Promise<{id: string}>;
};

function unauthorized() {
  return NextResponse.json({error: "Unauthorized"}, {status: 401});
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Proxy management is unavailable"}, {status: 503});
  }

  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role;

  if (userRole !== "admin") {
    return unauthorized();
  }

  const body = await request.json().catch(() => null);
  const parsed = updateProxyStatusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({error: "Invalid proxy status payload"}, {status: 400});
  }

  const {id} = await context.params;

  if (!id) {
    return NextResponse.json({error: "Proxy relationship ID is required"}, {status: 400});
  }

  const nextStatus = parsed.data.status;

  if (nextStatus === "PENDING") {
    return NextResponse.json({error: "Pending status is only allowed during request creation"}, {status: 400});
  }
  try {
    const updatedRelationship = await prisma.proxyRelationship.update({
      where: {id},
      data: {
        status: nextStatus,
        reviewedAt: new Date(),
        isActive: nextStatus === "APPROVED",
      },
      select: {
        id: true,
        proxyUserId: true,
        patientId: true,
        relationshipType: true,
        consentDocumentUrl: true,
        status: true,
        reviewedAt: true,
        isActive: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedRelationship);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({error: "Proxy relationship not found"}, {status: 404});
    }

    return NextResponse.json({error: "Failed to update proxy relationship"}, {status: 500});
  }
}
