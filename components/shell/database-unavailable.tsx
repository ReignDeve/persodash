import { LogoMark } from "@/components/shell/logo";

/** Full-page notice when PostgreSQL can't be reached – instead of a raw stack trace. */
export function DatabaseUnavailable() {
  const isDev = process.env.NODE_ENV !== "production";
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <LogoMark className="mb-2 size-5 text-subtle" />
      <span className="label text-err">Database unreachable</span>
      <h1 className="text-lg font-medium">PersoDash can’t reach PostgreSQL</h1>
      <p className="max-w-md text-sm text-subtle">
        {isDev
          ? "Start Docker Desktop and the database container, then reload this page."
          : "Check the database container on the server, then reload this page."}
      </p>
      <pre className="mt-2 rounded-md bg-surface px-3 py-2 font-mono text-xs text-muted shadow-[inset_0_0_0_1px_var(--line)]">
        {isDev ? "docker start persodash-db" : "docker compose ps db && docker compose up -d db"}
      </pre>
      {/* Plain link = full reload, retries the connection. */}
      <a href="" className="mt-2 text-xs text-fg underline-offset-2 hover:underline">
        Reload
      </a>
    </div>
  );
}
