"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { LogoMark, Wordmark } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { Field, fieldA11y } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { loginSchema, type LoginValues } from "@/lib/schemas/settings";

/** Only allow same-site relative redirects after login. */
function safeRedirect(from: string | null) {
  return from && from.startsWith("/") && !from.startsWith("//") ? from : "/";
}

export function LoginForm() {
  const params = useSearchParams();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });
  const { errors } = form.formState;

  const login = useMutation({
    mutationFn: (values: LoginValues) => api("/api/auth/login", { method: "POST", body: values }),
    // Full navigation so the server layout picks up the new session cookie.
    onSuccess: () => window.location.assign(safeRedirect(params.get("from"))),
    onError: () => form.setValue("password", ""),
    meta: { silent: true },
  });

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-[320px]">
        <div className="mb-10 flex flex-col items-center gap-4">
          <LogoMark className="size-6 text-fg" />
          <Wordmark className="text-xs" />
        </div>

        <form onSubmit={form.handleSubmit((v) => login.mutate(v))} className="flex flex-col gap-4" noValidate>
          <Field label="Username" htmlFor="username" error={errors.username?.message}>
            <Input
              autoComplete="username"
              autoFocus
              autoCapitalize="none"
              spellCheck={false}
              {...fieldA11y("username", errors.username?.message)}
              {...form.register("username")}
            />
          </Field>
          <Field label="Password" htmlFor="password" error={errors.password?.message}>
            <Input
              type="password"
              autoComplete="current-password"
              {...fieldA11y("password", errors.password?.message)}
              {...form.register("password")}
            />
          </Field>

          {login.error ? (
            <p role="alert" className="text-xs text-err">
              {login.error.message}
            </p>
          ) : null}

          <Button type="submit" variant="primary" className="mt-1 w-full" disabled={login.isPending}>
            {login.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-10 text-center text-2xs tracking-[0.14em] text-faint uppercase">Private instance</p>
      </div>
    </div>
  );
}
