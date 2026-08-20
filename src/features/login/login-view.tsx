"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoMark } from "@/features/landing/components/logo-mark";

type LoginViewProps = {
  isConfigured: boolean;
};

export function LoginView({ isConfigured }: LoginViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const { error: message } = (await response.json()) as { error?: string };
        setError(message ?? "Something went wrong.");
        return;
      }
      router.push(searchParams.get("next") || "/dashboard");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <LogoMark />
        </div>

        {!isConfigured ? (
          <div className="mt-8 flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
            <p>You haven&apos;t set a dashboard password yet — that happens as the last step of setup.</p>
            <Button className="w-full" render={<Link href="/onboarding" />} nativeButton={false}>
              Go to setup
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
