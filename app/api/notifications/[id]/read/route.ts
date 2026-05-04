import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {z} from "zod";
import {authOptions} from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

type RouteContext = {
  params: Promise<{id: string}>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Notifications are unavailable"}, {status: 503});
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (typeof userId !== "string") {
    return NextResponse.json({error: "Unauthorized"}, {status: 401});
  }

  const {id: notificationId} = await context.params;

  if (!z.string().uuid().safeParse(notificationId).success) {
    return NextResponse.json({error: "Invalid notification ID"}, {status: 400});
  }

  const result = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
      isRead: false,
      readAt: null,
    },
    data: {isRead: true, readAt: new Date()},
  });

  if (result.count === 0) {
    const exists = await prisma.notification.count({where: {id: notificationId, userId}});
    if (exists === 0) {
      return NextResponse.json({error: "Notification not found"}, {status: 404});
    }
  }

  return NextResponse.json({success: true});
}
