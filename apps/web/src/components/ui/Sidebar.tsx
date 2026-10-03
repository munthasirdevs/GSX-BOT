"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Ticket, CalendarClock, Settings, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  guildId: string;
  guildName?: string;
  guildIconUrl?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  guildId,
  guildName = "Server",
  guildIconUrl,
}) => {
  const pathname = usePathname();

  const links = [
    {
      label: "Analytics",
      href: `/dashboard/${guildId}/analytics`,
      icon: BarChart3,
    },
    {
      label: "Tickets",
      href: `/dashboard/${guildId}/tickets`,
      icon: Ticket,
    },
    {
      label: "Schedules",
      href: `/dashboard/${guildId}/schedules`,
      icon: CalendarClock,
    },
    {
      label: "Settings",
      href: `/dashboard/${guildId}/settings`,
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 flex-shrink-0 glass border-r border-white/10 flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Server Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        {guildIconUrl ? (
          <img
            src={guildIconUrl}
            alt={guildName}
            className="w-10 h-10 rounded-xl object-cover border border-white/10 shadow"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5865F2] to-[#4752C4] flex items-center justify-center font-bold text-white shadow">
            {guildName.substring(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm text-white truncate">{guildName}</h2>
          <Link
            href="/dashboard"
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 mt-0.5"
          >
            <ArrowLeft className="w-3 h-3" /> Change Server
          </Link>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-[#5865F2] text-white shadow-md shadow-[#5865F2]/20 font-semibold"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-gray-400")} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-white/10 text-xs text-gray-500">
        <p>Discord Hub v1.0.0</p>
        <p className="text-[10px] mt-0.5 text-gray-600">ID: {guildId}</p>
      </div>
    </aside>
  );
};
