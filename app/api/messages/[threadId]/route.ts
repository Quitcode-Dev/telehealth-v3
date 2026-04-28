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

export async function GET(
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
    include: {
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          patientProfile: {select: {id: true}},
        },
      },
      recipient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          patientProfile: {select: {id: true}},
        },
      },
      messages: {
        orderBy: {createdAt: "asc"},
        select: {
          id: true,
          body: true,
          senderId: true,
          readAt: true,
          createdAt: true,
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              patientProfile: {select: {id: true}},
            },
          },
        },
      },
    },
  });

  if (!thread) {
    return NextResponse.json({error: "Thread not found"}, {status: 404});
  }

  return NextResponse.json({
    thread: {
      id: thread.id,
      subject: thread.subject,
      creator: {
        id: thread.creator.id,
        firstName: thread.creator.firstName,
        lastName: thread.creator.lastName,
        isPatient: !!thread.creator.patientProfile,
      },
      recipient: {
        id: thread.recipient.id,
        firstName: thread.recipient.firstName,
        lastName: thread.recipient.lastName,
        isPatient: !!thread.recipient.patientProfile,
      },
      messages: thread.messages.map((m) => ({
        id: m.id,
        body: m.body,
        senderId: m.senderId,
        senderName: `${m.sender.firstName} ${m.sender.lastName}`,
        isPatientSender: !!m.sender.patientProfile,
        readAt: m.readAt,
        createdAt: m.createdAt,
      })),
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
    },
    currentUserId: userId,
  });
}
