import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

// Points at the request-config file that resolves the staff-facing UI locale from a cookie
// (no `[locale]` routing segment — see src/i18n/request.ts's doc comment).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
};

// Wraps the build to upload source maps to Sentry — silently skipped (build still succeeds)
// when SENTRY_AUTH_TOKEN/org/project aren't set, which is expected for local dev.
export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
