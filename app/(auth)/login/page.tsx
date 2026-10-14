import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/app/(auth)/login/login-form";
import { DatabaseUnavailable } from "@/components/shell/database-unavailable";
import { getCurrentUser } from "@/lib/auth/session";
import { isDatabaseUnavailable } from "@/lib/db-errors";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  let signedIn = false;
  try {
    signedIn = (await getCurrentUser()) !== null;
  } catch (error) {
    if (isDatabaseUnavailable(error)) return <DatabaseUnavailable />;
    throw error;
  }
  if (signedIn) redirect("/");
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
