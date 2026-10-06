import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, className, ...rest }: IconProps) {
  return { width: size, height: size, className, fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, ...rest };
}

export function LeafIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="M5 19c8-1 12-6 14-14-8 2-13 6-14 14Z" />
      <path d="M5 19c2-4 6-7 11-9" />
    </svg>
  );
}

export function BrainIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="M9.5 4a3 3 0 0 0-3 3v.4A3 3 0 0 0 4 10.5V12a3 3 0 0 0 2 2.8V17a2 2 0 0 0 2 2h1" />
      <path d="M14.5 4a3 3 0 0 1 3 3v.4A3 3 0 0 1 20 10.5V12a3 3 0 0 1-2 2.8V17a2 2 0 0 1-2 2h-1" />
      <path d="M12 4v16" />
    </svg>
  );
}

export function NoteIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  );
}

export function TaskIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

export function MeetingIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function ThoughtIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 1 4.5 9.9c-.7.7-1.1 1.5-1.3 2.4H8.8c-.2-.9-.6-1.7-1.3-2.4A6 6 0 0 1 12 3Z" />
    </svg>
  );
}

export function MemoryIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8Z" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
    </svg>
  );
}

export function ProfileIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="m5 12 14-7-5 14-3-5-6-2Z" />
    </svg>
  );
}

export function SpeakerIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="M4 10v4h3l4 4V6L7 10H4Z" />
      <path d="M16 9a4 4 0 0 1 0 6M18.5 7a7 7 0 0 1 0 10" />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <rect x="8" y="8" width="11" height="13" rx="2" />
      <path d="M5 16V5a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" />
    </svg>
  );
}

export function WaveIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="M4 12v0M8 8v8M12 5v14M16 8v8M20 12v0" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c1-3 3.5-4.5 6-4.5S14 16 15 19" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17 14.5c2 .2 3.5 1.5 4.5 4.5" />
    </svg>
  );
}

export function DocIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </svg>
  );
}

export function RobotIcon(props: IconProps) {
  return (
    <svg {...base({ ...props, strokeWidth: 1.5 })} viewBox="0 0 24 24">
      <rect x="5" y="8" width="14" height="11" rx="3" />
      <circle cx="9.5" cy="13" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13" r="1.2" fill="currentColor" stroke="none" />
      <path d="M12 5v3M9 19v2M15 19v2" />
    </svg>
  );
}

export function PersonIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M7 7l1 13h8l1-13" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.2A11 11 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-4.2 4.8" />
      <path d="M6.1 6.1A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 4.1-.8" />
    </svg>
  );
}

export function AssetIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M8 12h8M8 15h5" />
    </svg>
  );
}

export function ProjectIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="M4 7h16v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Z" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M8 12h8M8 16h5" />
    </svg>
  );
}

export function ClientsIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c1-3.2 3.2-5 6-5s5 1.8 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17 14.5c1.8.3 3.2 1.5 4 4.5" />
    </svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="M15 6 9 12l6 6" />
    </svg>
  );
}

export function RecurringIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="M4 12a8 8 0 0 1 14-5.3" />
      <path d="M18 4v4h-4" />
      <path d="M20 12a8 8 0 0 1-14 5.3" />
      <path d="M6 20v-4h4" />
    </svg>
  );
}

export function FinanceIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16" cy="14" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BelongingIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <path d="M4 8h16v12H4z" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
    </svg>
  );
}

export function JobsIcon(props: IconProps) {
  return (
    <svg {...base(props)} viewBox="0 0 24 24">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </svg>
  );
}

