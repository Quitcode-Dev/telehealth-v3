import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {authOptions} from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

export async function PATCH() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Notifications are unavailable"}, {status: 503});
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (typeof userId !== "string") {
    return NextResponse.json({error: "Unauthorized"}, {status: 401});
  }

  const now = new Date();

  const result = await prisma.notification.updateMany({
    where: {userId, isRead: false},
    data: {isRead: true, readAt: now},
  });

  return NextResponse.json({success: true, count: result.count});
}
