import { LogoMark } from "@/features/landing/components/logo-mark";

type InviteMessageProps = {
  title: string;
  body: string;
};

export function InviteMessage({ title, body }: InviteMessageProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center">
          <LogoMark />
        </div>
        <h1 className="mt-8 text-lg font-medium text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
