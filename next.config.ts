import type { NextConfig } from "next";

const native = process.env.BRIDGEBACK_NATIVE === "1";
const deploymentId = process.env.VERCEL_DEPLOYMENT_ID;
const config: NextConfig = {
  ...(!native && deploymentId && /^[a-zA-Z0-9_-]{1,160}$/.test(deploymentId)
    ? { deploymentId }
    : {}),
  ...(native ? { output: "export", distDir: "out" } : {}),
  images: { unoptimized: true },
  poweredByHeader: false,
  ...(!native
    ? {
        async headers() {
          return [
            {
              source: "/sw.js",
              headers: [
                {
                  key: "Cache-Control",
                  value: "no-cache, max-age=0, must-revalidate",
                },
                { key: "Service-Worker-Allowed", value: "/" },
              ],
            },
            {
              source: "/:path*",
              headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "X-Frame-Options", value: "DENY" },
                { key: "Referrer-Policy", value: "no-referrer" },
                {
                  key: "Permissions-Policy",
                  value: "camera=(), microphone=(), geolocation=(), payment=()",
                },
                ...(process.env.NODE_ENV === "production"
                  ? [
                      {
                        key: "Content-Security-Policy",
                        value:
                          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
                      },
                    ]
                  : []),
              ],
            },
          ];
        },
      }
    : {}),
};
export default config;
