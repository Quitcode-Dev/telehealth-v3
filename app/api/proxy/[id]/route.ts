import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {z} from "zod";
import {authOptions} from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

const updateProxyStatusSchema = z.object({
  status: z.enum(["approved", "rejected"]),
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

  const nextStatus = parsed.data.status === "approved" ? "APPROVED" : "REJECTED";
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
  }).catch(() => null);

  if (!updatedRelationship) {
    return NextResponse.json({error: "Proxy relationship not found"}, {status: 404});
  }

  return NextResponse.json(updatedRelationship);
}
