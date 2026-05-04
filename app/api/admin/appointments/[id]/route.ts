import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {Prisma} from "@prisma/client";
import {z} from "zod";
import {authOptions, ADMIN_ROLE} from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

const updateStatusSchema = z.object({
  status: z.string().trim().toUpperCase().pipe(
    z.enum(["SCHEDULED", "CHECKED_IN", "COMPLETED", "NO_SHOW", "CANCELLED"])
  ),
}).strict();

type RouteContext = {
  params: Promise<{id: string}>;
};

function unauthorized() {
  return NextResponse.json({error: "Unauthorized"}, {status: 401});
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Appointment updates are unavailable"}, {status: 503});
  }

  const session = await getServerSession(authOptions);

  if (session?.user?.role !== ADMIN_ROLE) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null);
  const parsed = updateStatusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({error: "Invalid status value"}, {status: 400});
  }

  const {id} = await context.params;

  try {
    const updated = await prisma.appointment.update({
      where: {id},
      data: {status: parsed.data.status},
      select: {
        id: true,
        status: true,
        scheduledAt: true,
        providerName: true,
        location: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({error: "Appointment not found"}, {status: 404});
    }

    return NextResponse.json({error: "Failed to update appointment status"}, {status: 500});
  }
}
