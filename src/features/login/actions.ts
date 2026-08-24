"use server";

import { signIn, signOut } from "@/lib/auth";

export async function googleSignInAction(formData: FormData): Promise<void> {
  const next = formData.get("next");
  await signIn("google", { redirectTo: typeof next === "string" && next ? next : "/dashboard" });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
