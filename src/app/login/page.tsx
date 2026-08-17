import { LoginView } from "@/features/login";
import { isLoginConfigured } from "@/lib/session";

export default function LoginPage() {
  return <LoginView isConfigured={isLoginConfigured()} />;
}
