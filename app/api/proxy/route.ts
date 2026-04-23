import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {z} from "zod";
import {authOptions} from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

const createProxySchema = z.object({
  relationshipType: z.enum(["parent", "guardian", "caregiver"]),
  patientId: z.string().uuid(),
  consentDocumentUrl: z.url(),
}).strict();

function unauthorized() {
  return NextResponse.json({error: "Unauthorized"}, {status: 401});
}

async function getUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  return typeof userId === "string" ? userId : null;
}

function mapRelationshipType(relationshipType: "parent" | "guardian" | "caregiver") {
  if (relationshipType === "parent") {
    return "PARENT" as const;
  }

  if (relationshipType === "guardian") {
    return "GUARDIAN" as const;
  }

  return "CAREGIVER" as const;
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Proxy management is unavailable"}, {status: 503});
  }

  const userId = await getUserId();

  if (!userId) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null);
  const parsed = createProxySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({error: "Invalid proxy request payload"}, {status: 400});
  }

  const data = parsed.data;

  const patient = await prisma.patient.findUnique({
    where: {id: data.patientId},
    select: {id: true},
  });

  if (!patient) {
    return NextResponse.json({error: "Patient not found"}, {status: 404});
  }

  const relationship = await prisma.proxyRelationship.create({
    data: {
      proxyUserId: userId,
      patientId: data.patientId,
      relationshipType: mapRelationshipType(data.relationshipType),
      consentDocumentUrl: data.consentDocumentUrl,
      status: "PENDING",
      isActive: false,
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

  return NextResponse.json(relationship, {status: 201});
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Proxy management is unavailable"}, {status: 503});
  }

  const userId = await getUserId();

  if (!userId) {
    return unauthorized();
  }

  const relationships = await prisma.proxyRelationship.findMany({
    where: {
      OR: [
        {proxyUserId: userId},
        {
          patient: {
            userId,
          },
        },
      ],
    },
    orderBy: {
      createdAt: "desc",
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

  return NextResponse.json(relationships);
}
