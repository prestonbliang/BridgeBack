import type { NextConfig } from "next";

const native = process.env.BRIDGEBACK_NATIVE === "1";
const config: NextConfig = {
  ...(native ? { output: "export", distDir: "out" } : {}),
  images: { unoptimized: true },
  poweredByHeader: false,
  ...(!native
    ? {
        async headers() {
          return [
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
