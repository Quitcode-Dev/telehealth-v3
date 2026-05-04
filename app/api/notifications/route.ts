import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {z} from "zod";
import {NotificationType} from "@prisma/client";
import {authOptions} from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

const VALID_NOTIFICATION_TYPES = Object.values(NotificationType) as [NotificationType, ...NotificationType[]];

const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(VALID_NOTIFICATION_TYPES),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(1000),
  link: z.string().trim().max(2048).optional(),
  resourceId: z.string().uuid().optional(),
}).strict();

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
  const typeParam = url.searchParams.get("type");
  const cursorParam = url.searchParams.get("cursor");
  const limitParam = url.searchParams.get("limit");

  const parsedLimit = limitParam === null ? DEFAULT_LIMIT : parseInt(limitParam, 10);
  const limit = Number.isNaN(parsedLimit)
    ? DEFAULT_LIMIT
    : Math.min(Math.max(parsedLimit, MIN_LIMIT), MAX_LIMIT);

  const typeFilter: NotificationType | undefined =
    typeParam !== null && (VALID_NOTIFICATION_TYPES as readonly string[]).includes(typeParam)
      ? (typeParam as NotificationType)
      : undefined;

  const cursorId =
    cursorParam !== null && z.string().uuid().safeParse(cursorParam).success
      ? cursorParam
      : undefined;

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? {isRead: false} : {}),
      ...(typeFilter ? {type: typeFilter} : {}),
    },
    orderBy: {createdAt: "desc"},
    take: limit + 1,
    ...(cursorId ? {cursor: {id: cursorId}, skip: 1} : {}),
    select: {
      id: true,
      type: true,
      title: true,
      content: true,
      link: true,
      resourceId: true,
      isRead: true,
      createdAt: true,
      readAt: true,
    },
  });

  const hasNextPage = notifications.length > limit;
  const page = hasNextPage ? notifications.slice(0, limit) : notifications;
  const nextCursor = hasNextPage ? page[page.length - 1]?.id : null;

  const unreadCount = await prisma.notification.count({
    where: {userId, isRead: false},
  });

  return NextResponse.json({notifications: page, unreadCount, nextCursor});
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Notifications are unavailable"}, {status: 503});
  }

  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (internalSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${internalSecret}`) {
      return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }
  }

  const body = await request.json().catch(() => null);
  const parsed = createNotificationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({error: "Invalid notification payload"}, {status: 400});
  }

  const {userId, type, title, content, link, resourceId} = parsed.data;

  const userExists = await prisma.user.findUnique({where: {id: userId}, select: {id: true}});
  if (!userExists) {
    return NextResponse.json({error: "User not found"}, {status: 404});
  }

  const notification = await prisma.notification.create({
    data: {userId, type, title, content, link, resourceId},
    select: {
      id: true,
      userId: true,
      type: true,
      title: true,
      content: true,
      link: true,
      resourceId: true,
      isRead: true,
      createdAt: true,
    },
  });

  return NextResponse.json({notification}, {status: 201});
}
