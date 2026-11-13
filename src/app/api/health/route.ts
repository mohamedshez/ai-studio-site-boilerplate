// Used by the deploy workflows to confirm which version is live.
// Not behind the development sign-in (see src/proxy.ts).
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { status: "ok", version: process.env.APP_VERSION ?? "unknown" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
