import {
  Activity,
  Bell,
  Zap,
  CalendarCheck,
  CalendarRange,
  Cpu,
  FolderGit2,
  Globe,
  Inbox,
  LayoutGrid,
  Repeat,
  Route,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Second key of the "G then X" navigation shortcut. */
  shortcut: string;
  description: string;
};

export type NavSection = { label: string | null; items: NavItem[] };

export const NAV: NavSection[] = [
  {
    label: null,
    items: [
      { href: "/", label: "Overview", icon: LayoutGrid, shortcut: "o", description: "What needs attention" },
      { href: "/review", label: "Weekly review", icon: CalendarRange, shortcut: "v", description: "Your week at a glance" },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/inbox", label: "Inbox", icon: Inbox, shortcut: "i", description: "Captured thoughts, links and to-dos" },
      { href: "/routines", label: "Routines", icon: CalendarCheck, shortcut: "r", description: "Recurring tasks that reschedule themselves" },
      { href: "/projects", label: "Projects", icon: FolderGit2, shortcut: "p", description: "Repos, deploys and next steps" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/websites", label: "Websites", icon: Globe, shortcut: "w", description: "Vercel deployments" },
      { href: "/services", label: "Services", icon: Activity, shortcut: "u", description: "Uptime of your own services" },
      { href: "/actions", label: "Actions", icon: Zap, shortcut: "a", description: "Saved API calls and flows for your services" },
      { href: "/miner", label: "Miner", icon: Cpu, shortcut: "m", description: "Workers and hashrate" },
    ],
  },
  {
    label: "Personal",
    items: [
      { href: "/wallets", label: "Wallets", icon: Wallet, shortcut: "f", description: "Balances and portfolio" },
      { href: "/subscriptions", label: "Subscriptions", icon: Repeat, shortcut: "b", description: "Recurring costs and renewals" },
      { href: "/logbook", label: "Logbook", icon: Route, shortcut: "l", description: "Trips and distances" },
    ],
  },
];

export const NAV_FOOTER: NavItem[] = [
  { href: "/notifications", label: "Notifications", icon: Bell, shortcut: "n", description: "Alerts and events" },
  { href: "/settings", label: "Settings", icon: Settings, shortcut: "s", description: "Account and integrations" },
];

export const ALL_NAV_ITEMS = [...NAV.flatMap((s) => s.items), ...NAV_FOOTER];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function currentNavItem(pathname: string) {
  return ALL_NAV_ITEMS.find((item) => isActive(pathname, item.href));
}
