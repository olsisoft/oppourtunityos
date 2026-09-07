import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Gate every /app route behind a valid session. Uses the JWT only so it stays
 * cheap and database-free.
 */
export default auth((request) => {
  if (!request.auth && request.nextUrl.pathname.startsWith("/app")) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/app/:path*"],
};
