import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SITE_PASSWORD = process.env.SITE_PASSWORD;

export function middleware(request: NextRequest) {
  // Skip if no password set
  if (!SITE_PASSWORD) {
    return NextResponse.next();
  }

  // Skip for API routes and static files
  if (
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get("site-auth");
  if (authCookie?.value === SITE_PASSWORD) {
    return NextResponse.next();
  }

  // Check for password in URL (for initial auth)
  const passwordParam = request.nextUrl.searchParams.get("password");
  if (passwordParam === SITE_PASSWORD) {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("site-auth", SITE_PASSWORD, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
  }

  // Show password page
  const url = new URL("/password", request.url);
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!password|_next/static|_next/image|favicon.ico).*)"],
};
