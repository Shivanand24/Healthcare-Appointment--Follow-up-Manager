import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Public routes
  const publicRoutes = ["/", "/login", "/register"];
  if (publicRoutes.some((r) => pathname === r || pathname.startsWith("/api/auth"))) {
    return NextResponse.next();
  }

  // Require authentication for all other routes
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.user?.role;

  // Role-based route protection
  if (pathname.startsWith("/patient") && role !== "PATIENT") {
    return NextResponse.redirect(new URL(
      role === "DOCTOR" ? "/doctor/dashboard" : "/admin/dashboard",
      req.url
    ));
  }

  if (pathname.startsWith("/doctor") && role !== "DOCTOR") {
    return NextResponse.redirect(new URL(
      role === "PATIENT" ? "/patient/dashboard" : "/admin/dashboard",
      req.url
    ));
  }

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL(
      role === "PATIENT" ? "/patient/dashboard" : "/doctor/dashboard",
      req.url
    ));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
