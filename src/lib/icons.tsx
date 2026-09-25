import {
  ArrowLeft, BadgeCheck, Bell, Calendar, CalendarCheck2, CalendarClock, CalendarDays, CalendarRange, Camera, Check, CheckSquare,
  ChevronDown, ChevronRight, CirclePause, CircleStop, CircleUserRound, ClipboardCheck, Clock3, ExternalLink, FileCheck2,
  FilePenLine, FilePlus2, FileSearch, FileText, Flag, FolderKanban, FolderOpen, Handshake, History, LayoutDashboard,
  ListChecks, ListFilter, NotebookTabs, Package, PackageCheck, Pencil, Play, Plus, RotateCcw, Search, Send, Settings,
  Settings2, ShieldCheck, UserRound, UsersRound, type LucideIcon,
} from 'lucide-react'

const ICONS = {
  'arrow-left': ArrowLeft,
  'badge-check': BadgeCheck,
  bell: Bell,
  calendar: Calendar,
  'calendar-check-2': CalendarCheck2,
  'calendar-clock': CalendarClock,
  'calendar-days': CalendarDays,
  'calendar-range': CalendarRange,
  camera: Camera,
  check: Check,
  'check-square': CheckSquare,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  'circle-pause': CirclePause,
  'circle-stop': CircleStop,
  'circle-user-round': CircleUserRound,
  'clipboard-check': ClipboardCheck,
  'clock-3': Clock3,
  'external-link': ExternalLink,
  'file-check-2': FileCheck2,
  'file-pen-line': FilePenLine,
  'file-plus-2': FilePlus2,
  'file-search': FileSearch,
  'file-text': FileText,
  flag: Flag,
  'folder-kanban': FolderKanban,
  'folder-open': FolderOpen,
  handshake: Handshake,
  history: History,
  'layout-dashboard': LayoutDashboard,
  'list-checks': ListChecks,
  'list-filter': ListFilter,
  'notebook-tabs': NotebookTabs,
  package: Package,
  'package-check': PackageCheck,
  pencil: Pencil,
  play: Play,
  plus: Plus,
  'rotate-ccw': RotateCcw,
  search: Search,
  send: Send,
  settings: Settings,
  'settings-2': Settings2,
  'shield-check': ShieldCheck,
  'user-round': UserRound,
  'users-round': UsersRound,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof ICONS

/** Lucide icon rendered like the original `lucide.createIcons({ 'stroke-width': 1.8 })` output. */
export function Icon({ name, className }: { name: string; className?: string }) {
  const Component = ICONS[name as IconName] ?? History
  return <Component className={className} strokeWidth={1.8} aria-hidden="true" />
}
