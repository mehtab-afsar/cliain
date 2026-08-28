import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/google-icon";
import { LogoMark } from "@/features/landing/components/logo-mark";
import { googleSignInAction } from "./actions";

type LoginViewProps = {
  next?: string;
};

const COPY = {
  onboarding: {
    title: "Set up your clinic",
    description: "Sign in with Google to start your 5-minute setup — no credit card needed.",
  },
  default: {
    title: "Welcome back",
    description: "Sign in with your Google account to open your dashboard.",
  },
};

export function LoginView({ next }: LoginViewProps) {
  const copy = next === "/onboarding" ? COPY.onboarding : COPY.default;

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
