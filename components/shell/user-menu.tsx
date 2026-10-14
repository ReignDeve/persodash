"use client";

import { LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export async function signOut() {
  await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  window.location.assign("/login");
}

export function UserMenu({ username, expanded }: { username: string; expanded: boolean }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const initial = username.slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="mt-1 flex h-9 w-full items-center gap-2.5 rounded-md px-1.5 text-left transition-colors hover:bg-hover data-[state=open]:bg-hover"
        aria-label="Account menu"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-selected font-mono text-2xs text-fg">
          {initial}
        </span>
        <span className={cn("hidden min-w-0 flex-1 truncate text-sm text-muted", expanded && "lg:block")}>
          {username}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-52">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        {(
          [
            ["dark", "Dark", Moon],
            ["light", "Light", Sun],
            ["system", "System", Monitor],
          ] as const
        ).map(([value, label, Icon]) => (
          <DropdownMenuItem
            key={value}
            icon={<Icon />}
            onSelect={() => setTheme(value)}
            shortcut={theme === value ? "●" : undefined}
          >
            {label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem icon={<Settings />} onSelect={() => router.push("/settings")} shortcut="G S">
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem icon={<LogOut />} onSelect={signOut}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
