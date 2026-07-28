"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  HelpCircle, LogOut, Trophy, Menu, X,
  LayoutDashboard, PanelLeftClose, PanelLeft, Bell, Settings
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar_collapsed") === "true";
      setSidebarCollapsed(saved);
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const newVal = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("sidebar_collapsed", String(newVal));
      }
      return newVal;
    });
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-rose-650 text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-[#1b253b] border-t-primary" />
            <div className="absolute inset-1 animate-spin rounded-full border-2 border-transparent border-b-primary/50" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <p className="text-sm font-medium tracking-wide text-slate-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Competition", href: "/competition", icon: Trophy },
    { name: "Support Portal", href: "/support", icon: HelpCircle },
  ];

  const cleanName = (fullname: string | null | undefined, username: string | null | undefined) => {
    const raw = fullname || username || "Staff";
    return raw.replace(/(Regional|Kompetisi Regional)/gi, "").trim();
  };

  const getInitials = (fullname: string | null, username: string | null) => {
    const name = cleanName(fullname, username);
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const SidebarNavItem = ({ item }: { item: typeof navItems[0] }) => {
    const Icon = item.icon;
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

    const linkContent = (
      <Link
        href={item.href}
        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
          isActive
            ? "bg-primary/15 text-primary font-semibold glow-primary-sm"
            : "text-slate-400 hover:bg-[#1b253b]/40 hover:text-white"
        } ${sidebarCollapsed ? "justify-center px-2" : ""}`}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary shadow-[0_0_8px_rgba(132,204,22,0.4)]" />
        )}
        <Icon className="h-[18px] w-[18px] shrink-0 transition-colors duration-200" />
        {!sidebarCollapsed && <span>{item.name}</span>}
      </Link>
    );

    if (sidebarCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger render={linkContent} />
          <TooltipContent side="right" sideOffset={8}>
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <div className="flex h-screen bg-rose-650 text-zinc-100 font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-[#1b253b]/80 bg-[#060a16] transition-all duration-300 ease-in-out shrink-0 ${
          sidebarCollapsed ? "w-[68px]" : "w-64"
        }`}
      >
        {/* Brand Header */}
        <div className={`flex h-14 items-center border-b border-[#1b253b]/60 shrink-0 ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-4"}`}>
          {!sidebarCollapsed ? (
            <Link href="/dashboard" className="flex items-center">
              <img
                src="/icons/gameforsmartlogo.webp"
                alt="Gameforsmart"
                className="h-8 object-contain"
              />
            </Link>
          ) : (
            <Link href="/dashboard" className="flex items-center justify-center">
              <img
                src="/icons/icon-32x32.png"
                alt="Gameforsmart mini"
                className="h-7 w-7 object-contain"
              />
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 space-y-1 overflow-y-auto py-4 ${sidebarCollapsed ? "px-2" : "px-3"}`}>
          {navItems.map((item) => (
            <SidebarNavItem key={item.name} item={item} />
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className={`border-t border-[#1b253b]/40 p-3 ${sidebarCollapsed ? "px-2" : ""}`}>
          {sidebarCollapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center justify-center rounded-lg p-2.5 text-slate-500 hover:bg-rose-950/20 hover:text-rose-400 transition-all duration-200 cursor-pointer"
                  />
                }
              />
              <TooltipContent side="right" sideOffset={8}>
                Log Out
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-rose-950/20 hover:text-rose-400 transition-all duration-200 cursor-pointer"
            >
              <LogOut className="h-[18px] w-[18px]" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 items-center justify-between border-b border-[#1b253b]/60 bg-[#060a16]/80 backdrop-blur-xl px-4 shrink-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2">
            {/* Desktop toggle */}
            <button
              onClick={toggleSidebar}
              className="hidden md:flex rounded-lg p-1.5 text-slate-400 hover:bg-[#1b253b]/60 hover:text-white transition-all duration-200 cursor-pointer"
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {sidebarCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex md:hidden rounded-lg p-1.5 text-slate-400 hover:bg-[#1b253b]/60 hover:text-white transition-all duration-200 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Brand for collapsed / mobile */}
            {(sidebarCollapsed || mobileMenuOpen) && (
              <Link href="/dashboard" className="flex items-center ml-2 md:ml-0">
                <img
                  src="/icons/gameforsmartlogo.webp"
                  alt="Gameforsmart"
                  className="h-7 object-contain"
                />
              </Link>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            <button className="relative rounded-lg p-2 text-slate-400 hover:bg-[#1b253b]/60 hover:text-white transition-all duration-200 cursor-pointer">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#060a16]" />
            </button>

            <Link
              href="/support"
              className="rounded-lg p-2 text-slate-400 hover:bg-[#1b253b]/60 hover:text-white transition-all duration-200 cursor-pointer"
              title="Help"
            >
              <HelpCircle className="h-[18px] w-[18px]" />
            </Link>

            <button className="rounded-lg p-2 text-slate-400 hover:bg-[#1b253b]/60 hover:text-white transition-all duration-200 cursor-pointer" title="Settings">
              <Settings className="h-[18px] w-[18px]" />
            </button>

            <Separator orientation="vertical" className="mx-1 h-5 bg-[#1b253b]/80" />

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <button className="flex items-center gap-2.5 rounded-lg p-1.5 pr-2 text-left hover:bg-[#1b253b]/40 transition-all duration-200 cursor-pointer select-none outline-none">
                  <Avatar size="default">
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold text-[11px]">
                      {getInitials(profile?.fullname || null, profile?.username || null)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col">
                    <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                      {cleanName(profile?.fullname, profile?.username)}
                    </span>
                    <span className="text-[10px] text-slate-500 capitalize leading-none mt-0.5">
                      {profile?.role || "Staff"}
                    </span>
                  </div>
                </button>
              } />
              <DropdownMenuContent align="end" className="w-56 bg-[#0c1224] border-border text-white p-1">
                <DropdownMenuLabel className="px-3 py-2.5 border-b border-[#1b253b]/60">
                  <p className="text-xs font-bold text-white truncate">
                    {cleanName(profile?.fullname, profile?.username)}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {profile?.email || user.email || "-"}
                  </p>
                </DropdownMenuLabel>
                <div className="py-1">
                  <DropdownMenuItem render={
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-355 hover:bg-[#1b253b]/50 hover:text-white transition-colors cursor-pointer"
                    />
                  }>
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem render={
                    <Link
                      href="/competition"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-355 hover:bg-[#1b253b]/50 hover:text-white transition-colors cursor-pointer"
                    />
                  }>
                    <Trophy className="h-4 w-4" />
                    Your Competitions
                  </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator className="bg-[#1b253b]/60" />
                <div className="pt-1">
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/20 hover:text-rose-350 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-14 z-40 bg-[#060a16]/98 backdrop-blur-xl md:hidden flex flex-col p-4 border-b border-[#1b253b] animate-in slide-in-from-top duration-200">
            <nav className="flex-1 space-y-1 py-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-primary/15 text-primary font-semibold"
                        : "text-slate-400 hover:bg-[#1b253b]/40 hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-[#1b253b] py-4 space-y-4">
              <div className="flex items-center gap-3 px-2">
                <Avatar size="lg">
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                    {getInitials(profile?.fullname || null, profile?.username || null)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-white">
                    {cleanName(profile?.fullname, profile?.username)}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">
                    {profile?.role || "Staff"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-rose-400 hover:bg-rose-950/20 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Log Out
              </button>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-10 overflow-y-auto bg-rose-650 scrollbar-thin stagger-children">
          {children}
        </main>
      </div>
    </div>
  );
}
