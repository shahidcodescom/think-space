import {
  AssetIcon,
  BrainIcon,
  ClientsIcon,
  LockIcon,
  MeetingIcon,
  MemoryIcon,
  NoteIcon,
  ProfileIcon,
  ProjectIcon,
  TaskIcon,
  ThoughtIcon,
  RecurringIcon,
  FinanceIcon,
  BelongingIcon,
  CalendarIcon,
  JobsIcon,
  SkillsIcon,
  LibraryIcon,
} from "@/components/Icons";

export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: typeof BrainIcon;
  /** Sidebar section key */
  group: string;
};

/** Desktop sidebar sections (order = display order). */
export const NAV_GROUPS: { id: string; label: string }[] = [
  { id: "capture", label: "Capture" },
  { id: "vault", label: "Vault" },
  { id: "work", label: "Work" },
  { id: "life", label: "Life & money" },
  { id: "growth", label: "Growth" },
  { id: "you", label: "You" },
];

/**
 * Full app nav — every section appears in the desktop sidebar.
 * Order matches product IA; mobile bottom tabs use MOBILE_TAB_HREFS + More.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/thinking-space", label: "Thinking space", shortLabel: "Think", icon: BrainIcon, group: "capture" },
  { href: "/notes", label: "Notes", shortLabel: "Notes", icon: NoteIcon, group: "capture" },
  { href: "/tasks", label: "Tasks", shortLabel: "Tasks", icon: TaskIcon, group: "capture" },
  { href: "/meetings", label: "Meetings / MOM", shortLabel: "Meetings", icon: MeetingIcon, group: "capture" },
  { href: "/thoughts", label: "Thoughts", shortLabel: "Thoughts", icon: ThoughtIcon, group: "capture" },
  { href: "/memories", label: "Memories", shortLabel: "Memories", icon: MemoryIcon, group: "capture" },
  { href: "/secrets", label: "Secrets", shortLabel: "Secrets", icon: LockIcon, group: "vault" },
  { href: "/assets", label: "Assets", shortLabel: "Assets", icon: AssetIcon, group: "vault" },
  { href: "/projects", label: "Projects", shortLabel: "Projects", icon: ProjectIcon, group: "work" },
  { href: "/clients", label: "Clients", shortLabel: "Clients", icon: ClientsIcon, group: "work" },
  { href: "/recurrings", label: "Recurrings", shortLabel: "Recurring", icon: RecurringIcon, group: "life" },
  { href: "/finance", label: "Finance", shortLabel: "Finance", icon: FinanceIcon, group: "life" },
  { href: "/belongings", label: "Belongings", shortLabel: "Belongings", icon: BelongingIcon, group: "life" },
  { href: "/calendar", label: "Calendar", shortLabel: "Calendar", icon: CalendarIcon, group: "life" },
  { href: "/jobs", label: "Jobs", shortLabel: "Jobs", icon: JobsIcon, group: "growth" },
  { href: "/skills", label: "Skills", shortLabel: "Skills", icon: SkillsIcon, group: "growth" },
  { href: "/library", label: "Library", shortLabel: "Library", icon: LibraryIcon, group: "growth" },
  { href: "/profile", label: "Profile", shortLabel: "Profile", icon: ProfileIcon, group: "you" },
];

/** Primary tabs shown in the mobile bottom bar (max 4 + More). */
export const MOBILE_TAB_HREFS = [
  "/thinking-space",
  "/notes",
  "/tasks",
  "/projects",
] as const;

export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function navItemsInGroup(groupId: string) {
  return NAV_ITEMS.filter((n) => n.group === groupId);
}
