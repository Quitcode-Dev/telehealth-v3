import {AuditAction, Prisma} from "@prisma/client";
import {after} from "next/server";
import {getServerSession} from "next-auth";
import {NextResponse} from "next/server";
import {authOptions} from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

export {AuditAction};

export type AuditMetadata = Prisma.JsonObject;

export class AuditLogger {
  /**
   * Records an audit log entry for a data access or modification event.
   * Writes are append-only; the AuditLog table has no update or delete paths.
   */
  async log(
    userId: string,
    action: AuditAction,
    resource: string,
    resourceId?: string | null,
    metadata?: AuditMetadata | null,
    ipAddress?: string | null,
  ): Promise<void> {
    if (!process.env.DATABASE_URL) {
      console.error("[audit] DATABASE_URL not set; audit log entry not persisted — compliance gap");
      return;
    }

    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId: resourceId ?? null,
          ipAddress: ipAddress ?? null,
          metadata: metadata ?? undefined,
        },
      });
    } catch (err) {
      console.error("[audit] Failed to write audit log entry:", err);
    }
  }
}

let auditLogger: AuditLogger | null = null;

export function getAuditLogger(): AuditLogger {
  if (!auditLogger) {
    auditLogger = new AuditLogger();
  }
  return auditLogger;
}

/**
 * Extracts the client IP address from a Next.js Request, checking the
 * standard forwarding headers before falling back to a null value.
 */
export function extractIpAddress(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? null;
}

type RouteHandler = (request: Request, context: unknown) => Promise<NextResponse>;

export type AuditOptions = {
  action: AuditAction;
  resource: string;
  /** Derive the resourceId from the parsed request at call time. */
  getResourceId?: (request: Request, context: unknown) => string | null | undefined;
  /** Derive extra metadata from the parsed request at call time. */
  getMetadata?: (request: Request, context: unknown) => AuditMetadata | null | undefined;
};

/**
 * Next.js API route wrapper that automatically logs access to patient data
 * endpoints.  The audit entry is written after the handler resolves using
 * Next.js `after()`, which guarantees the callback runs even in serverless
 * runtimes after the response has been streamed to the client.
 *
 * Only authenticated requests (those with a resolved session user ID) are
 * logged.  The response status code is included in the metadata so reviewers
 * can distinguish successful accesses from rejected ones.
 *
 * Usage:
 * ```ts
 * export const GET = withAuditLog(
 *   async (request) => { ... },
 *   { action: AuditAction.profile_view, resource: "patient" },
 * );
 * ```
 */
export function withAuditLog(handler: RouteHandler, options: AuditOptions): RouteHandler {
  return async (request: Request, context: unknown): Promise<NextResponse> => {
    const response = await handler(request, context);

    const statusCode = response.status;
    const ipAddress = extractIpAddress(request);
    const resourceId = options.getResourceId?.(request, context) ?? null;
    const callerMetadata = options.getMetadata?.(request, context) ?? null;
    const metadata: AuditMetadata = {statusCode, ...callerMetadata};

    after(async () => {
      try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;
        if (typeof userId !== "string") return;

        await getAuditLogger().log(userId, options.action, options.resource, resourceId, metadata, ipAddress);
      } catch (err) {
        console.error("[audit] withAuditLog post-handler logging failed:", err);
      }
    });

    return response;
  };
}
