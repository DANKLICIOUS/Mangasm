// LEGACY COPY of repo-root /middleware.js. Edit the root file; this one only
// deploys if a Vercel project uses Root Directory = web/.
export default function middleware(request) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  if (host === "ios.mangasm.app") {
    return new Response(null, {
      headers: { "x-middleware-rewrite": "/ios.html" },
    });
  }
}

export const config = {
  matcher: "/:path*",
};
