import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/google-icon";
import { LogoMark } from "@/features/landing/components/logo-mark";
import { googleSignInAction } from "./actions";

type LoginViewProps = {
  next?: string;
};

export function LoginView({ next }: LoginViewProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <LogoMark />
        </div>

        <form action={googleSignInAction} className="mt-8">
          <input type="hidden" name="next" value={next ?? ""} />
          <Button type="submit" variant="outline" className="w-full gap-2.5">
            <GoogleIcon />
            Continue with Google
          </Button>
        </form>
      </div>
    </div>
  );
}
