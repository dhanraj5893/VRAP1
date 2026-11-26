"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardCheck,
  FileBarChart,
  LayoutDashboard,
  ListChecks,
  Milestone,
  Network,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Lock,
  AlertCircle,
  LogOut,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "reviewer", "approver", "vendor"] },
  { href: "/vendors", label: "Vendor register", icon: Building2, roles: ["admin", "reviewer", "approver", "vendor"] },
  { href: "/assessments", label: "Assessments", icon: ClipboardCheck, roles: ["admin", "reviewer", "approver", "vendor"] },
  { href: "/services", label: "Business services", icon: Network, roles: ["admin", "reviewer", "approver"] },
  { href: "/actions", label: "Findings & actions", icon: ListChecks, roles: ["admin", "reviewer", "approver", "vendor"] },
  { href: "/exceptions", label: "Exceptions", icon: Scale, roles: ["admin", "reviewer", "approver"] },
  { href: "/compliance", label: "Regulatory coverage", icon: BarChart3, roles: ["admin", "reviewer", "approver", "auditor"] },
  { href: "/monitoring", label: "Incidents & triggers", icon: AlertCircle, roles: ["admin", "reviewer"] },
  { href: "/reports", label: "Reports", icon: FileBarChart, roles: ["admin", "reviewer", "approver"] },
  { href: "/access", label: "Access control", icon: Lock, roles: ["admin"] },
  { href: "/settings", label: "Scoring model", icon: SlidersHorizontal, roles: ["admin"] },
  { href: "/evaluation", label: "Evaluation", icon: Users, roles: ["admin", "reviewer", "approver", "vendor", "auditor"] },
  { href: "/roadmap", label: "Project status", icon: Milestone, roles: ["admin", "reviewer", "approver", "vendor"] },
];

export function Sidebar({
  user,
  logoutAction,
}: {
  user: { name: string; email: string; role: string };
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const items = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-white/8 bg-[#0d131a] no-print">
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-400/15 text-teal-300">
          <ShieldCheck className="h-4.5 w-4.5" strokeWidth={2.2} />
        </div>
        <div>
          <div className="font-display text-[15px] font-bold tracking-tight text-zinc-100">VRAP</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Vendor risk portal</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-teal-400/10 text-teal-300"
                  : "text-zinc-400 hover:bg-white/4 hover:text-zinc-200",
              )}
            >
              <item.icon className="h-4 w-4" strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/8 p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-[11px] font-bold text-zinc-200">
            {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium text-zinc-200">{user.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-teal-400/80">
              {ROLE_LABELS[user.role] ?? user.role}
            </div>
          </div>
          <form action={logoutAction}>
            <button title="Sign out" className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200">
              <LogOut className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
