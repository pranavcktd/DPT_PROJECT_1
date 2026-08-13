import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PUBLIC_ROUTES = ["/login"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (!req.auth && !isPublicRoute) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (req.auth && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

// Optimistic check only (session read from the cookie) - real per-module,
// per-role authorization happens server-side in the DAL (see src/lib/session.ts)
// on every page/action, never trust this alone.
//
// Public static assets (uploads, and anything under public/ with a file
// extension) are excluded too: Next's /_next/image optimizer fetches them
// server-side with no cookies, so gating them here would always redirect
// that internal fetch to /login and break the image (this broke the
// department logo before this exclusion was added).
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|uploads|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"],
};
