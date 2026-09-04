import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored legacy static assets copied verbatim into the Next.js public/
    // dir (the old client bundle app.js, popular-routes.js, canonical-fix.js,
    // consent.js, …). These are shipped as-is, are not part of the Next source
    // graph, and must not be linted as app source.
    "public/**",
  ]),
]);

export default eslintConfig;
