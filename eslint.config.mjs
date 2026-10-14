import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Full reloads are intentional for auth transitions (sign-in/out, expired
      // session) so no client cache survives, and for file downloads.
      "@next/next/no-location-assign-relative-destination": "off",
    },
  },
  globalIgnores([".next/**", ".legacy/**", "app/generated/**", "next-env.d.ts"]),
]);
