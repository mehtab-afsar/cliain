import { LoginView } from "@/features/login";
import { isLoginConfigured } from "@/lib/session";

export default async function LoginPage() {
  const isConfigured = await isLoginConfigured();
  return <LoginView isConfigured={isConfigured} />;
}
