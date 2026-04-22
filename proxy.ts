import createMiddleware from "next-intl/middleware";
import {getToken} from "next-auth/jwt";
import {NextResponse, type NextRequest} from "next/server";
import {routing} from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Paths are normalized by removing locale prefixes before public route checks.
const PUBLIC_PAGES = new Set(["/", "/login"]);

function getPathWithoutLocale(pathname: string) {
  const segments = pathname.split("/");
  const locale = segments[1];

  if (routing.locales.includes(locale as (typeof routing.locales)[number])) {
    const path = `/${segments.slice(2).join("/")}`;
    return path === "/" ? "/" : path.replace(/\/$/, "");
  }

  return pathname === "/" ? "/" : pathname.replace(/\/$/, "");
}

function getLocale(pathname: string) {
  const locale = pathname.split("/")[1];
  return routing.locales.includes(locale as (typeof routing.locales)[number])
    ? locale
    : routing.defaultLocale;
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const normalizedPath = getPathWithoutLocale(pathname);

  if (!PUBLIC_PAGES.has(normalizedPath)) {
    const token = await getToken({req: request, secret: process.env.NEXTAUTH_SECRET});

    if (!token) {
      const locale = getLocale(pathname);
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
