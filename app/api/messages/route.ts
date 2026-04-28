import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {z} from "zod";
import {authOptions} from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

const createThreadSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1),
  recipientId: z.string().uuid(),
}).strict();

function unauthorized() {
  return NextResponse.json({error: "Unauthorized"}, {status: 401});
}

async function getUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  return typeof userId === "string" ? userId : null;
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Messaging service is unavailable"}, {status: 503});
  }

  const userId = await getUserId();
  if (!userId) return unauthorized();

  const threads = await prisma.messageThread.findMany({
    where: {
      OR: [{creatorId: userId}, {recipientId: userId}],
    },
    include: {
      messages: {
        orderBy: {createdAt: "desc"},
        take: 1,
        select: {
          id: true,
          body: true,
          senderId: true,
          readAt: true,
          createdAt: true,
        },
      },
      creator: {
        select: {id: true, firstName: true, lastName: true},
      },
      recipient: {
        select: {id: true, firstName: true, lastName: true},
      },
      _count: {
        select: {
          messages: {
            where: {senderId: {not: userId}, readAt: null},
          },
        },
      },
    },
    orderBy: {updatedAt: "desc"},
  });

  const result = threads.map((thread) => ({
    id: thread.id,
    subject: thread.subject,
    creator: thread.creator,
    recipient: thread.recipient,
    latestMessage: thread.messages[0] ?? null,
    unreadCount: thread._count.messages,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
  }));

  return NextResponse.json({threads: result});
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Messaging service is unavailable"}, {status: 503});
  }

  const userId = await getUserId();
  if (!userId) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = createThreadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({error: "Invalid message payload"}, {status: 400});
  }

  const {subject, body: messageBody, recipientId} = parsed.data;

  if (recipientId === userId) {
    return NextResponse.json({error: "Cannot send message to yourself"}, {status: 400});
  }

  const recipient = await prisma.user.findUnique({
    where: {id: recipientId},
    select: {id: true},
  });

  if (!recipient) {
    return NextResponse.json({error: "Recipient not found"}, {status: 404});
  }

  const thread = await prisma.messageThread.create({
    data: {
      subject,
      creatorId: userId,
      recipientId,
      messages: {
        create: {
          senderId: userId,
          body: messageBody,
        },
      },
    },
    include: {
      messages: {
        select: {
          id: true,
          body: true,
          senderId: true,
          readAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      creator: {
        select: {id: true, firstName: true, lastName: true},
      },
      recipient: {
        select: {id: true, firstName: true, lastName: true},
      },
    },
  });

  return NextResponse.json(thread, {status: 201});
}
