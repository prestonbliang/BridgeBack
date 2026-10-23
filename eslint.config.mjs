import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      ".next-native/**",
      "out/**",
      "ios/**",
      "node_modules/**",
      "public/sw.js",
      "service-worker/worker.js",
      "next-env.d.ts",
    ],
  },
];

export default config;
