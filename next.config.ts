import type { NextConfig } from "next";

const native = process.env.BRIDGEBACK_NATIVE === "1";
const config: NextConfig = {
  ...(native ? { output: "export", distDir: "out" } : {}),
  images: { unoptimized: true },
  poweredByHeader: false,
};
export default config;
