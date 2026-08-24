import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/google-icon";
import { LogoMark } from "@/features/landing/components/logo-mark";
import { googleSignInAction } from "@/features/login/actions";

type SignInToJoinProps = {
  token: string;
  clinicName: string | null;
};

export function SignInToJoin({ token, clinicName }: SignInToJoinProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center">
          <LogoMark />
        </div>
        <h1 className="mt-8 text-lg font-medium text-foreground">
          Join {clinicName || "the clinic"} on Cliain
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with Google to accept the invite.
        </p>

        <form action={googleSignInAction} className="mt-6">
          <input type="hidden" name="next" value={`/invite/${token}`} />
          <Button type="submit" variant="outline" className="w-full gap-2.5">
            <GoogleIcon />
            Continue with Google
          </Button>
        </form>
      </div>
    </div>
  );
}
