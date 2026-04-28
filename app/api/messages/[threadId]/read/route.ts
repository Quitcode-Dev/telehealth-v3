import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {z} from "zod";
import {authOptions} from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

function unauthorized() {
  return NextResponse.json({error: "Unauthorized"}, {status: 401});
}

async function getUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  return typeof userId === "string" ? userId : null;
}

export async function PATCH(
  _request: Request,
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

  const now = new Date();
  const {count} = await prisma.message.updateMany({
    where: {
      threadId,
      senderId: {not: userId},
      readAt: null,
    },
    data: {readAt: now},
  });

  return NextResponse.json({markedAsRead: count});
}
