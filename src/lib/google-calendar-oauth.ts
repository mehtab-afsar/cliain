import "server-only";
import { google } from "googleapis";
import { env } from "./env";

// Deliberately not next-auth's Google provider — that one signs a person in (identity only,
// no offline access) and this app has no Account table to persist a second provider's tokens
// on anyway (see auth.ts: JWT-only sessions, by design). This is a second, independent OAuth
// client using the *same* Google Cloud project/credentials, requesting calendar access instead
// of identity, with its own callback route and its own place to store the result
// (Doctor.googleCalendarRefreshToken).
const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function googleCalendarConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.APP_URL);
}

/** Short-lived cookie carrying the CSRF `state` between the connect and callback routes —
 *  same name used by both, exported once here so they can't drift out of sync. */
export const GOOGLE_CALENDAR_OAUTH_STATE_COOKIE = "gcal_oauth_state";

/** Must be registered under this Google Cloud OAuth client's "Authorized redirect URIs" — a
 *  one-time, whole-deployment setup step, not per-clinic (unlike WhatsApp's per-clinic Meta
 *  App). */
function redirectUri(): string {
  return `${env.APP_URL}/api/settings/integrations/google-calendar/callback`;
}

function createOAuthClient() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are not configured.");
  }
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirectUri());
}

/** `state` is a random value the caller generates and stores in a short-lived cookie, then
 *  compares against what Google echoes back — plain CSRF protection for the callback. */
export function buildGoogleCalendarAuthUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline", // required to get a refresh_token at all
    prompt: "consent", // required to get a refresh_token on a *repeat* connect, not just the first
    scope: CALENDAR_SCOPES,
    state,
  });
}

export type ConnectedGoogleAccount = { refreshToken: string; email: string | null };

/** Exchanges the callback's `code` for a refresh token, and looks up which Google account it
 *  belongs to (for display only — "Connected as ..." — never used for auth). */
export async function completeGoogleCalendarConnection(code: string): Promise<ConnectedGoogleAccount> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    // Google omits this on a repeat consent unless prompt=consent forced it — we always pass
    // that, so this should only happen if Google's behavior changes underneath us.
    throw new Error(
      "Google didn't return a long-lived token. Disconnect any prior access at myaccount.google.com/permissions and try again.",
    );
  }
  client.setCredentials(tokens);

  let email: string | null = null;
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data } = await oauth2.userinfo.get();
    email = data.email ?? null;
  } catch {
    // Display-only — a failure here shouldn't fail the whole connection.
  }

  return { refreshToken: tokens.refresh_token, email };
}
