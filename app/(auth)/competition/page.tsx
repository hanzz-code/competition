"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { competitionService } from "@/lib/services/competition-service";
import { CompetitionListItem } from "@/types/competition";
import { Calendar, Plus, Trophy, Users, AlertCircle, Search, SlidersHorizontal, Image as ImageIcon, ChevronLeft, ChevronRight, MoreHorizontal, Edit, Layout, Trash2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function CompetitionListPage() {
  const { profile } = useAuth();
  const [competitions, setCompetitions] = useState<CompetitionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [competitionToDelete, setCompetitionToDelete] = useState<CompetitionListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCompetitions = async () => {
    try {
      setLoading(true);
      const data = await competitionService.getAuthorizedCompetitions();
      setCompetitions(data);
    } catch (err: any) {
      console.error("Failed to load competitions:", err.message || err);
      setError("Failed to load competitions. Make sure the database RLS is configured.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompetitions();
  }, []);

  const handleDeleteClick = (comp: CompetitionListItem) => {
    setCompetitionToDelete(comp);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!competitionToDelete) return;
    setIsDeleting(true);
    try {
      await competitionService.deleteCompetition(competitionToDelete.id);
      setCompetitions((prev) => prev.filter((c) => c.id !== competitionToDelete.id));
      setDeleteDialogOpen(false);
      setCompetitionToDelete(null);
    } catch (err: any) {
      console.error("Failed to delete competition:", err.message || err);
      setError("Failed to delete competition. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "published":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]";
      case "coming_soon":
        return "bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-[0_0_8px_rgba(14,165,233,0.1)]";
      case "completed":
      case "finished":
        return "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20";
      default:
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "published":
        return "Published";
      case "coming_soon":
        return "Coming Soon";
      case "completed":
      case "finished":
        return "Completed";
      default:
        return "Draft";
    }
  };

  const formatDateRange = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return "—";
    const optionsStart: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    const optionsEnd: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
    const start = new Date(startStr);
    const end = new Date(endStr);

    if (start.getFullYear() !== end.getFullYear()) {
      return `${start.toLocaleDateString("en-US", optionsEnd)} — ${end.toLocaleDateString("en-US", optionsEnd)}`;
    }
    return `${start.toLocaleDateString("en-US", optionsStart)} — ${end.toLocaleDateString("en-US", optionsEnd)}`;
  };

  const filteredCompetitions = competitions.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredCompetitions.length / ITEMS_PER_PAGE) || 1;
  const paginatedCompetitions = filteredCompetitions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Competitions</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? "Loading..." : `${filteredCompetitions.length} competition${filteredCompetitions.length !== 1 ? "s" : ""} found`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-none">
            <Input
              placeholder="Search by title..."
              className="pr-10 w-full sm:w-64 bg-secondary/60 border-border/60 text-white text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-md bg-primary/90 text-primary-foreground">
              <Search className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val || "all");
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[150px] shrink-0 bg-secondary/60 border-border/60 text-slate-300 focus:border-primary/50 transition-all duration-200">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-[#0c1224] border-border text-white">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="coming_soon">Coming Soon</SelectItem>
            </SelectContent>
          </Select>

          {/* Add Button */}
          {profile?.role === "competition" && (
            <Button render={<Link href="/competition/new" />} className="bg-primary text-primary-foreground font-bold hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] cursor-pointer gap-1.5 shrink-0 h-9 px-4 text-xs transition-all duration-200">
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </Button>
          )}
        </div>
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

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 h-16 rounded-xl border border-border/40 bg-card/30 px-5">
              <Skeleton className="h-10 w-12 rounded-lg bg-muted/30" />
              <Skeleton className="h-4 w-48 bg-muted/30" />
              <Skeleton className="h-4 w-20 bg-muted/30 ml-auto" />
              <Skeleton className="h-5 w-16 rounded-full bg-muted/30" />
            </div>
          ))}
        </div>
      ) : filteredCompetitions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/20 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30 mb-4">
            <Trophy className="h-8 w-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-white">No Competitions Found</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm">
            Try adjusting your search criteria or add a new competition if you are the manager.
          </p>
        </div>
      ) : (
        <div className="border border-border/60 bg-card/30 rounded-2xl overflow-hidden shadow-lg">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-b border-border/60 hover:bg-transparent">
                <TableHead className="px-5 py-3.5 text-slate-400 font-bold text-xs uppercase tracking-wider w-20">Poster</TableHead>
                <TableHead className="px-5 py-3.5 text-slate-400 font-bold text-xs uppercase tracking-wider">Title</TableHead>
                <TableHead className="px-5 py-3.5 text-slate-400 font-bold text-xs uppercase tracking-wider">Category</TableHead>
                <TableHead className="px-5 py-3.5 text-slate-400 font-bold text-xs uppercase tracking-wider w-28">Status</TableHead>
                <TableHead className="px-5 py-3.5 text-slate-400 font-bold text-xs uppercase tracking-wider">Schedule</TableHead>
                <TableHead className="px-5 py-3.5 text-slate-400 font-bold text-xs uppercase tracking-wider w-32">Participants</TableHead>
                <TableHead className="px-5 py-3.5 text-center text-slate-400 font-bold text-xs uppercase tracking-wider w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedCompetitions.map((item) => (
                <TableRow key={item.id} className="border-b border-border/30 hover:bg-primary/3 transition-colors duration-150">
                  <TableCell className="px-5 py-3">
                    {item.posterUrl ? (
                      <div className="h-10 w-12 rounded-lg overflow-hidden bg-muted/40 border border-border/40 flex items-center justify-center">
                        <img src={item.posterUrl} alt={item.title} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-10 w-12 rounded-lg bg-muted/30 border border-border/40 flex items-center justify-center text-slate-600">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="px-5 py-3">
                    <Link href={`/competition/${item.id}`} className="font-semibold text-white hover:text-primary transition-colors duration-200 line-clamp-1 block text-sm">
                      {item.title}
                    </Link>
                  </TableCell>

                  <TableCell className="px-5 py-3 text-slate-400 text-xs font-medium">
                    {item.category || "General"}
                  </TableCell>

                  <TableCell className="px-5 py-3">
                    <Badge variant="outline" className={`${getStatusBadgeClass(item.status)} rounded-full font-bold px-2.5 py-0.5 text-[10px] uppercase`}>
                      {getStatusLabel(item.status)}
                    </Badge>
                  </TableCell>

                  <TableCell className="px-5 py-3 text-slate-355 text-xs">
                    {formatDateRange(item.regStartDate, item.regEndDate)}
                  </TableCell>

                  <TableCell className="px-5 py-3 text-slate-400 text-xs">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Users className="h-3.5 w-3.5 text-slate-500" />
                      <span>{item.participantCount}</span>
                    </div>
                  </TableCell>

                  <TableCell className="px-5 py-3 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white rounded-lg cursor-pointer hover:bg-primary/10 transition-all duration-200">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      } />
                      <DropdownMenuContent align="end" className="bg-[#0c1224] border-border text-white w-36 p-1">
                        <DropdownMenuItem render={
                          <Link href={`/competition/${item.id}`} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors" />
                        }>
                          <Layout className="h-3.5 w-3.5" />
                          Manage
                        </DropdownMenuItem>
                        {profile?.role === "competition" && (
                          <DropdownMenuItem render={
                            <Link href={`/competition/${item.id}/edit`} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-slate-355 hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors" />
                          }>
                            <Edit className="h-3.5 w-3.5" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {profile?.role === "competition" && (
                          <>
                            <DropdownMenuSeparator className="bg-border/40 my-1" />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(item)}
                              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border/40 bg-muted/20">
            <span className="text-xs text-slate-500">
              Page <span className="font-medium text-slate-400">{currentPage}</span> of <span className="font-medium text-slate-400">{totalPages}</span>
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="h-8 w-8 border-border/60 text-slate-400 hover:text-white hover:bg-primary/10 hover:border-primary/30 cursor-pointer disabled:opacity-30 transition-all duration-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`h-8 w-8 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                      currentPage === page
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                        : "text-slate-400 hover:bg-primary/10 hover:text-white"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="h-8 w-8 border-border/60 text-slate-400 hover:text-white hover:bg-primary/10 hover:border-primary/30 cursor-pointer disabled:opacity-30 transition-all duration-200"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-[#0c1224] border-border text-white">
          <DialogHeader>
            <DialogTitle>Delete Competition</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete <span className="font-semibold text-white">{competitionToDelete?.title}</span>? This action cannot be undone and will permanently remove all related data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="border-border text-slate-300 hover:text-white cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
            >
              {isDeleting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
