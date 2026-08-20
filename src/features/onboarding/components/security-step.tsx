import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SecurityStepProps = {
  password: string;
  confirmPassword: string;
  isExistingClinic: boolean;
  onChange: (patch: { password?: string; confirmPassword?: string }) => void;
};

export function SecurityStep({
  password,
  confirmPassword,
  isExistingClinic,
  onChange,
}: SecurityStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="dashboard-password">Dashboard password</Label>
        <Input
          id="dashboard-password"
          type="password"
          placeholder={isExistingClinic ? "•••••••• (leave blank to keep current)" : "At least 8 characters"}
          value={password}
          onChange={(event) => onChange({ password: event.target.value })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="dashboard-password-confirm">Confirm password</Label>
        <Input
          id="dashboard-password-confirm"
          type="password"
          placeholder={isExistingClinic ? "•••••••• (leave blank to keep current)" : undefined}
          value={confirmPassword}
          onChange={(event) => onChange({ confirmPassword: event.target.value })}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        You&apos;ll use this to sign in to your dashboard — no email or account needed.
      </p>
    </div>
  );
}
