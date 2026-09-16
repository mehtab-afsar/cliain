import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// PRD §8.5 "no-branching rule": application code may ask "is capability X enabled for this
// tenant?" via the resolved template (src/features/templates), but it may never branch on
// which vertical or template version a tenant is on directly — that's exactly what the
// templates package (and only it) is allowed to read, so vertical differences stay confined to
// template content instead of leaking into `if (vertical === ...)` scattered through the app.
const NO_BRANCHING_RULE = {
  "no-restricted-syntax": [
    "error",
    {
      selector: "MemberExpression[property.name=/^(vertical|templateVersion|market)$/]",
      message:
        "Don't branch on vertical/templateVersion/market outside src/features/templates — ask the resolved template for the capability/content you need instead (see PRD §8.5).",
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { rules: NO_BRANCHING_RULE },
  {
    // The templates package is the one place allowed to read these fields — it's what turns
    // them into template/capability lookups for everyone else.
    files: ["src/features/templates/**"],
    rules: { "no-restricted-syntax": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
