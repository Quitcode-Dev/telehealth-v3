import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {z} from "zod";
import {authOptions} from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

const createReplySchema = z.object({
  body: z.string().trim().min(1),
}).strict();

function unauthorized() {
  return NextResponse.json({error: "Unauthorized"}, {status: 401});
}

async function getUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  return typeof userId === "string" ? userId : null;
}

export async function POST(
  request: Request,
  {params}: {params: Promise<{threadId: string}>},
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Messaging service is unavailable"}, {status: 503});
  }

  const userId = await getUserId();
  if (!userId) return unauthorized();

  const {threadId} = await params;

  if (!z.string().uuid().safeParse(threadId).success) {
    return NextResponse.json({error: "Invalid thread ID"}, {status: 400});
  }

  const thread = await prisma.messageThread.findFirst({
    where: {
      id: threadId,
      OR: [{creatorId: userId}, {recipientId: userId}],
    },
    select: {id: true},
  });

  if (!thread) {
    return NextResponse.json({error: "Thread not found"}, {status: 404});
  }

  const body = await request.json().catch(() => null);
  const parsed = createReplySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({error: "Invalid reply payload"}, {status: 400});
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        threadId,
        senderId: userId,
        body: parsed.data.body,
      },
      select: {
        id: true,
        threadId: true,
        senderId: true,
        body: true,
        readAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.messageThread.update({
      where: {id: threadId},
      data: {},
    }),
  ]);

  return NextResponse.json(message, {status: 201});
}
