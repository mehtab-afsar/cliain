import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/google-icon";
import { LogoMark } from "@/features/landing/components/logo-mark";
import { googleSignInAction } from "./actions";

type LoginViewProps = {
  /** "signin" for returning users (/login), "signup" for new ones (/signup). Only changes
   *  copy and the cross-link at the bottom — both post through the same Google OAuth flow,
   *  since sign-in and sign-up are the same action here (see auth.ts's signIn callback,
   *  which creates the User row on first login regardless of which page sent them). */
  mode: "signin" | "signup";
  next?: string;
};

const COPY = {
  signin: {
    title: "Welcome back",
    description: "Sign in with your Google account to open your dashboard.",
    crossLinkLabel: "New to Cliain?",
    crossLinkHref: "/signup",
    crossLinkCta: "Create an account",
  },
  signup: {
    title: "Create your free account",
    description: "Sign up with Google to start your 5-minute clinic setup — no credit card needed.",
    crossLinkLabel: "Already have an account?",
    crossLinkHref: "/login",
    crossLinkCta: "Sign in",
  },
};

export function LoginView({ mode, next }: LoginViewProps) {
  const copy = COPY[mode];

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-elevation-sm">
        <div className="flex justify-center">
          <LogoMark />
        </div>

        <h1 className="mt-6 text-center font-heading text-xl text-foreground">
          {copy.title}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {copy.description}
        </p>

        <form action={googleSignInAction} className="mt-6">
          <input type="hidden" name="next" value={next ?? ""} />
          <Button type="submit" variant="outline" className="h-11 w-full gap-2.5">
            <GoogleIcon />
            Continue with Google
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {copy.crossLinkLabel}{" "}
          <Link
            href={copy.crossLinkHref}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {copy.crossLinkCta}
          </Link>
        </p>
      </div>

      <Link
        href="/"
        className="mt-6 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to home
      </Link>
    </div>
  );
}
