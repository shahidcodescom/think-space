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
} from "@/components/Icons";

export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: typeof BrainIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/thinking-space", label: "Thinking space", shortLabel: "Think", icon: BrainIcon },
  { href: "/notes", label: "Notes", shortLabel: "Notes", icon: NoteIcon },
  { href: "/tasks", label: "Tasks", shortLabel: "Tasks", icon: TaskIcon },
  { href: "/meetings", label: "Meetings / MOM", shortLabel: "Meetings", icon: MeetingIcon },
  { href: "/thoughts", label: "Thoughts", shortLabel: "Thoughts", icon: ThoughtIcon },
  { href: "/memories", label: "Memories", shortLabel: "Memories", icon: MemoryIcon },
  { href: "/projects", label: "Projects", shortLabel: "Projects", icon: ProjectIcon },
  { href: "/clients", label: "Clients", shortLabel: "Clients", icon: ClientsIcon },
  { href: "/recurrings", label: "Recurrings", shortLabel: "Recurring", icon: RecurringIcon },
  { href: "/finance", label: "Finance", shortLabel: "Finance", icon: FinanceIcon },
  { href: "/belongings", label: "Belongings", shortLabel: "Belongings", icon: BelongingIcon },
  { href: "/calendar", label: "Calendar", shortLabel: "Calendar", icon: CalendarIcon },
  { href: "/jobs", label: "Jobs", shortLabel: "Jobs", icon: JobsIcon },
  { href: "/skills", label: "Skills", shortLabel: "Skills", icon: SkillsIcon },
  { href: "/assets", label: "Assets", shortLabel: "Assets", icon: AssetIcon },
  { href: "/secrets", label: "Secrets", shortLabel: "Secrets", icon: LockIcon },
  { href: "/profile", label: "Profile", shortLabel: "Profile", icon: ProfileIcon },
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
