import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
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
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || DEFAULT_LIMIT, MIN_LIMIT), MAX_LIMIT) : DEFAULT_LIMIT;

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

  const notification = await prisma.notification.findFirst({
    where: {id: notificationId, userId},
    select: {id: true},
  });

  if (!notification) {
    return NextResponse.json({error: "Notification not found"}, {status: 404});
  }

  await prisma.notification.update({
    where: {id: notificationId},
    data: {isRead: true, readAt: new Date()},
  });

  return NextResponse.json({success: true});
}
