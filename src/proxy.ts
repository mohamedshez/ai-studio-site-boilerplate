import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

// Development-site gate. (Next.js 16 calls this file "proxy"; it was "middleware".)
// Unless SITE_ENV=production, every request needs the shared HTTP Basic sign-in
// and every response tells search engines not to index it.
// /api/health is left open so the deploy workflows can confirm a release.

const NOINDEX = "noindex, nofollow";

function same(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function plain(body: string, status: number, headers: Record<string, string> = {}) {
  return new NextResponse(body, {
    status,
    headers: { "X-Robots-Tag": NOINDEX, "Cache-Control": "no-store", ...headers },
  });
}

export function proxy(request: NextRequest) {
  if (process.env.SITE_ENV === "production") return NextResponse.next();

  const user = process.env.DEV_AUTH_USER;
  const password = process.env.DEV_AUTH_PASSWORD;

  // Fail closed: a development site with no sign-in configured serves nothing.
  if (!user || !password) {
    return plain("Development sign-in is not configured.", 503);
  }

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    } catch {
      decoded = "";
    }
    const split = decoded.indexOf(":");
    if (split !== -1) {
      const userOk = same(decoded.slice(0, split), user);
      const passwordOk = same(decoded.slice(split + 1), password);
      if (userOk && passwordOk) {
        const response = NextResponse.next();
        response.headers.set("X-Robots-Tag", NOINDEX);
        return response;
      }
    }
  }

  return plain("Sign-in required.", 401, {
    "WWW-Authenticate": 'Basic realm="Development site", charset="UTF-8"',
  });
}

export const config = {
  matcher: ["/((?!api/health$).*)"],
};
