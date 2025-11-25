"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Button,
} from "@heroui/react";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const from = searchParams.get("from") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Login fehlgeschlagen");
        return;
      }

      router.push(from || "/");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Netzwerkfehler beim Login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center gap-1">
          <h1 className="text-xl font-semibold">PersoDash Login</h1>
          <p className="text-xs text-default-500">
            Bitte melde dich an, um dein Dashboard zu sehen.
          </p>
        </CardHeader>
        <CardBody>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Input
              label="Benutzername"
              variant="bordered"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
            <Input
              label="Passwort"
              variant="bordered"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            {error && (
              <p className="text-xs text-danger mt-1">{error}</p>
            )}

            <Button
              type="submit"
              color="primary"
              isLoading={loading}
              className="mt-2"
            >
              Login
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
