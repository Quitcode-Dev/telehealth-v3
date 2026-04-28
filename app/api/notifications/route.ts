import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {z} from "zod";
import {authOptions} from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 10;

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Notifications are unavailable"}, {status: 503});
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (typeof userId !== "string") {
    return NextResponse.json({error: "Unauthorized"}, {status: 401});
  }

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unread") === "true";
  const limitParam = url.searchParams.get("limit");
  const parsedLimit = limitParam === null ? DEFAULT_LIMIT : parseInt(limitParam, 10);
  const limit = Number.isNaN(parsedLimit)
    ? DEFAULT_LIMIT
    : Math.min(Math.max(parsedLimit, MIN_LIMIT), MAX_LIMIT);

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? {isRead: false} : {}),
    },
    orderBy: {createdAt: "desc"},
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      content: true,
      resourceId: true,
      isRead: true,
      createdAt: true,
      readAt: true,
    },
  });

  const unreadCount = await prisma.notification.count({
    where: {userId, isRead: false},
  });

  return NextResponse.json({notifications, unreadCount});
}

export async function PATCH(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Notifications are unavailable"}, {status: 503});
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (typeof userId !== "string") {
    return NextResponse.json({error: "Unauthorized"}, {status: 401});
  }

  const body = await request.json().catch(() => null);
  const notificationId = typeof body?.id === "string" ? body.id : null;

  if (!notificationId) {
    return NextResponse.json({error: "Notification ID is required"}, {status: 400});
  }

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
    // Either not found, not owned by this user, or already read — all fine
    const exists = await prisma.notification.count({where: {id: notificationId, userId}});
    if (exists === 0) {
      return NextResponse.json({error: "Notification not found"}, {status: 404});
    }
  }

  return NextResponse.json({success: true});
}
