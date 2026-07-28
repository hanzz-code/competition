"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { competitionService } from "@/lib/services/competition-service";
import { CompetitionListItem } from "@/types/competition";
import { Trophy, Users, AlertCircle, ArrowRight, HelpCircle, Zap } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
  const { profile } = useAuth();
  const [competitions, setCompetitions] = useState<CompetitionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCompetitions = async () => {
    try {
      setLoading(true);
      const data = await competitionService.getAuthorizedCompetitions();
      setCompetitions(data);
    } catch (err: any) {
      console.error("Failed to load competitions:", err.message || err);
      setError("Gagal memuat ringkasan statistik. Pastikan database RLS sudah terkonfigurasi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompetitions();
  }, []);

  const cleanName = (fullname: string | null | undefined, username: string | null | undefined) => {
    const raw = fullname || username || "Staff";
    return raw.replace(/(Regional|Kompetisi Regional)/gi, "").trim();
  };

  const stats = [
    {
      title: "Total Competitions",
      value: competitions.length,
      description: "Registered in your region",
      icon: Trophy,
      color: "text-primary",
      bgColor: "bg-primary/10",
      hoverBorder: "hover:border-primary/30",
    },
    {
      title: "Active Competitions",
      value: competitions.filter((c) => c.status === "published").length,
      description: "Currently active publicly",
      icon: Zap,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      hoverBorder: "hover:border-emerald-500/30",
      badge: true,
    },
    {
      title: "Total Participants",
      value: competitions.reduce((sum, c) => sum + c.participantCount, 0),
      description: "Accumulated across all tournaments",
      icon: Users,
      color: "text-sky-400",
      bgColor: "bg-sky-500/10",
      hoverBorder: "hover:border-sky-500/30",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1.5">Welcome back, <span className="text-white font-medium">{cleanName(profile?.fullname, profile?.username)}</span>.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className={`group relative border-border/60 bg-card/60 backdrop-blur-sm ${stat.hoverBorder} hover:card-elevated transition-all duration-300 overflow-hidden`}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardDescription className="text-sm font-medium text-slate-400">{stat.title}</CardDescription>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.bgColor} transition-all duration-300 group-hover:scale-110`}>
                {stat.badge ? (
                  <div className="relative">
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    <span className="absolute -top-1 -right-1 h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  </div>
                ) : (
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {loading ? <Skeleton className="h-8 w-16 bg-muted/40" /> : stat.value}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">{error}</p>
            <p className="text-xs text-slate-500 mt-1">
              Note: Make sure you have executed the migration SQL scripts in the `sql` folder on your Supabase database dashboard.
            </p>
          </div>
        </div>
      )}

      {/* Welcome Card */}
      <Card className="relative border-border/60 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-[#0c1224]/40 to-transparent pointer-events-none" />
        <div className="absolute inset-0 opacity-50 animate-shimmer pointer-events-none" />
        <div className="relative">
          <CardHeader className="p-6 pb-0">
            <CardTitle className="text-xl font-bold text-white">Manage Your Tournaments</CardTitle>
            <CardDescription className="mt-2 text-sm text-slate-400 max-w-xl leading-relaxed">
              Use this portal to track registration, verify participant payments, manage qualification brackets, standings, and group stage matches in real-time.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                href="/competition"
                className="group/card flex items-center justify-between rounded-xl border border-border/60 bg-card/40 p-5 transition-all duration-300 hover:border-primary/30 hover:bg-card/80 hover:card-elevated"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover/card:bg-primary/20 group-hover/card:scale-105">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white group-hover/card:text-primary transition-colors duration-200">Competition</p>
                    <p className="text-xs text-slate-500 mt-0.5">View list and manage active competitions</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-600 group-hover/card:text-primary transition-all duration-300 group-hover/card:translate-x-1" />
              </Link>

              <Link
                href="/support"
                className="group/card flex items-center justify-between rounded-xl border border-border/60 bg-card/40 p-5 transition-all duration-300 hover:border-sky-500/30 hover:bg-card/80 hover:card-elevated"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 transition-all duration-300 group-hover/card:bg-sky-500/20 group-hover/card:scale-105">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white group-hover/card:text-sky-400 transition-colors duration-200">Help / Support</p>
                    <p className="text-xs text-slate-500 mt-0.5">Contact the main support team for any issues</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-600 group-hover/card:text-sky-400 transition-all duration-300 group-hover/card:translate-x-1" />
              </Link>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
