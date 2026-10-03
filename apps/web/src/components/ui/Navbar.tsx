"use client";

import React from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Bot, LogIn, LogOut, LayoutDashboard, ChevronRight } from "lucide-react";
import { Button } from "./Button";

export const Navbar = () => {
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-40 w-full glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-[#5865F2] flex items-center justify-center shadow-lg shadow-[#5865F2]/25 group-hover:scale-105 transition-transform duration-200">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-white group-hover:text-[#5865F2] transition-colors">
                Discord Hub
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400 -mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online Gateway
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation & Auth */}
        <div className="flex items-center gap-4">
          {session ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex gap-2">
                  <LayoutDashboard className="w-4 h-4 text-gray-400" />
                  <span>Servers</span>
                </Button>
              </Link>

              <div className="flex items-center gap-3 pl-3 border-l border-white/10">
                {session.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="w-8 h-8 rounded-full border border-white/10 shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white">
                    {session.user?.name?.[0] || "U"}
                  </div>
                )}
                <span className="text-sm font-medium text-gray-200 hidden md:block">
                  {session.user?.name}
                </span>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-gray-400 hover:text-rose-400"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
              className="gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Login with Discord</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
