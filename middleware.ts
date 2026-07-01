import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/register"];
const SESSION_COOKIE = "aomeet_session";

function getSecret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    return null;
  }

  return new TextEncoder().encode(value);
}

async function hasValidSession(request: NextRequest) {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) {
    return false;
  }

  const secret = getSecret();
  if (!secret) {
    return Boolean(raw);
  }

  try {
    await jwtVerify(raw, secret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const hasSession = await hasValidSession(request);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-current-path", pathname);

  if (!hasSession && pathname.startsWith("/api/extension")) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (!hasSession && !isPublic && !pathname.startsWith("/_next") && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
