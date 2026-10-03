"use client";

import React from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Bot, LogIn, LogOut, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Button } from "./Button";

export const Navbar = () => {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 w-full glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-[#5865F2] flex items-center justify-center shadow-lg shadow-[#5865F2]/25 group-hover:scale-105 transition-transform duration-200">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-white group-hover:text-[#5865F2] transition-colors">
                Discord Hub
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400 -mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Control Center Online
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation & Controls */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2 text-gray-300 hover:text-white">
              <LayoutDashboard className="w-4 h-4 text-[#5865F2]" />
              <span>Servers</span>
            </Button>
          </Link>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Admin Mode Active</span>
          </div>

          {session ? (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-7 h-7 rounded-full border border-white/10"
                />
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-gray-400 hover:text-rose-400 p-1.5"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
              className="gap-1.5 text-xs text-gray-400 hover:text-white hidden md:inline-flex"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Link Discord Account</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
