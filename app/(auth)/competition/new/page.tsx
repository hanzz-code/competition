"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { competitionService } from "@/lib/services/competition-service";
import { generateXID } from "@/lib/id-generator";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { CompetitionStatus } from "@/types/competition";
import { 
  ChevronRight, Upload, X, Calendar, 
  Tag, Gift, Plus, Trash2 
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface Prize {
  place: string;
  category: string;
  amount: string;
  reward: string;
}

// Client-side WebP compressor using Canvas
function compressToWebP(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);

        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(blob || file);
          },
          "image/webp",
          0.8
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

export default function NewCompetitionPage() {
  const { profile, activeOrganizationId, hasPermission } = useAuth();
  const router = useRouter();

  // Basic Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [status, setStatus] = useState<CompetitionStatus>("draft");
  const [regLink, setRegLink] = useState("");
  const [fee, setFee] = useState("");
  const [prizePool, setPrizePool] = useState("");

  // Categories & Options
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  // Schedule Dates
  const [regStart, setRegStart] = useState("");
  const [regEnd, setRegEnd] = useState("");
  const [qualStart, setQualStart] = useState("");
  const [qualEnd, setQualEnd] = useState("");
  const [finalStart, setFinalStart] = useState("");
  const [finalEnd, setFinalEnd] = useState("");

  // Prizes
  const [prizes, setPrizes] = useState<Prize[]>([
    { place: "Juara 1", category: "Umum", amount: "", reward: "" },
    { place: "Juara 2", category: "Umum", amount: "", reward: "" },
    { place: "Juara 3", category: "Umum", amount: "", reward: "" },
    { place: "Harapan 1", category: "Umum", amount: "", reward: "" },
    { place: "Harapan 2", category: "Umum", amount: "", reward: "" },
    { place: "Harapan 3", category: "Umum", amount: "", reward: "" }
  ]);

  // Poster Image
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);

  // Modals Visibility
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPrizeModal, setShowPrizeModal] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Guard access: only users with competition.create permission
  useEffect(() => {
    if (profile && !hasPermission("competition.create")) {
      router.push("/dashboard");
    }
  }, [profile, router, hasPermission]);

  // Fetch Categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await competitionService.getCompetitionCategories();
        setAvailableCategories(cats.length > 0 ? cats : ["SD", "SMP", "SMA", "Kuliah", "Umum"]);
      } catch (err) {
        console.error("Failed to load categories:", err);
        setAvailableCategories(["SD", "SMP", "SMA", "Kuliah", "Umum"]);
      } finally {
        setLoadingCats(false);
      }
    }
    loadCategories();
  }, []);

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran gambar maksimal adalah 5MB");
        return;
      }
      setPosterFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPosterPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!title.trim()) {
      setErrorMsg("Judul Kompetisi wajib diisi!");
      return;
    }
    if (!regStart || !regEnd) {
      setErrorMsg("Jadwal Registrasi (Mulai & Selesai) wajib disetel!");
      return;
    }

    setIsSaving(true);
    try {
      const compId = generateXID();
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      let posterUrl = null;

      // Upload Poster if selected
      if (posterFile) {
        const compressedBlob = await compressToWebP(posterFile);
        const fileExt = "webp";
        const filePath = `posters/${Date.now()}.${fileExt}`;

        // Get storage reference via browser client
        const { data: uploadData, error: uploadError } = await supabaseBrowser
          .storage
          .from("competition")
          .upload(filePath, compressedBlob, { contentType: "image/webp", cacheControl: "31536000", upsert: true });

        if (uploadError) {
          console.error("Storage upload failed:", uploadError.message);
        } else if (uploadData) {
          const { data: publicUrlData } = supabaseBrowser
            .storage
            .from("competition")
            .getPublicUrl(filePath);
          posterUrl = publicUrlData.publicUrl;
        }
      }

      // Convert RichText rules HTML string into block paragraph items
      let rulesArray: string[] = [];
      if (rules) {
        if (typeof window !== "undefined") {
          const parser = new DOMParser();
          const doc = parser.parseFromString(rules, "text/html");
          const blockNodes = Array.from(doc.body.childNodes);
          rulesArray = blockNodes
            .map((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                return (node as Element).outerHTML;
              }
              const text = node.textContent?.trim();
              return text ? `<p>${text}</p>` : "";
            })
            .filter(Boolean);
        } else {
          rulesArray = rules.split("\n").filter((r) => r.trim() !== "");
        }
      }

      // Payload
      const payload = {
        id: compId,
        title,
        slug,
        description: description || null,
        rules: rulesArray,
        registration_start_date: new Date(regStart).toISOString(),
        registration_end_date: new Date(regEnd).toISOString(),
        qualification_start_date: qualStart ? new Date(qualStart).toISOString() : null,
        qualification_end_date: qualEnd ? new Date(qualEnd).toISOString() : null,
        final_start_date: finalStart ? new Date(finalStart).toISOString() : null,
        final_end_date: finalEnd ? new Date(finalEnd).toISOString() : null,
        poster_url: posterUrl,
        status,
        category: selectedCategories.length > 0 ? selectedCategories.join(", ") : null,
        registration_fee: fee || null,
        prize_pool: prizePool || null,
        prizes: prizes,
        registration_link: regLink || null,
        creator_id: profile?.id || "",
        organization_id: activeOrganizationId
      };

      // 1. Save Competition
      await competitionService.createCompetition(payload);

      // 2. Auto-generate groups if categories are selected
      if (selectedCategories.length > 0) {
        const groupsToInsert: any[] = [];
        for (const cat of selectedCategories) {
          const semiIds: string[] = [];
          
          // Generate 2 semifinal groups
          for (let i = 1; i <= 2; i++) {
            const semiId = generateXID();
            semiIds.push(semiId);
            groupsToInsert.push({
              id: semiId,
              competition_id: compId,
              name: `Semifinal ${cat} Group ${i}`,
              stage: "Semifinal",
              rounds: [],
              source_group_ids: null,
              category: cat
            });
          }

          // Generate 1 final group
          const finalId = generateXID();
          groupsToInsert.push({
            id: finalId,
            competition_id: compId,
            name: `Final ${cat}`,
            stage: "Final",
            rounds: [],
            source_group_ids: semiIds,
            category: cat
          });

          // Generate 1 champion group
          const champId = generateXID();
          groupsToInsert.push({
            id: champId,
            competition_id: compId,
            name: `Juara ${cat}`,
            stage: "Champion",
            rounds: [],
            source_group_ids: [finalId],
            category: cat
          });
        }

        await competitionService.createCompetitionGroups(groupsToInsert);
      }

      router.push("/competition");
    } catch (err: any) {
      console.error("Save failed:", err);
      setErrorMsg(err.message || "Gagal menyimpan kompetisi. Cek koneksi.");
    } finally {
      setIsSaving(false);
    }
  };

  const fmtDateDisplay = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const hasSchedule = regStart || regEnd || qualStart || qualEnd || finalStart || finalEnd;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400">
            <Link href="/competition" className="hover:text-white transition cursor-pointer">
                Kompetisi
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white font-medium">Tambah Kompetisi</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-white">Tambah Kompetisi</h1>
        </div>

        <Button
          type="submit"
          form="add-competition-form"
          disabled={isSaving}
          className="bg-primary text-primary-foreground font-bold hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all duration-200 cursor-pointer h-10 px-5"
        >
          {isSaving ? "Menyimpan..." : "Add"}
        </Button>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {errorMsg}
        </div>
      )}

      {/* Form Content */}
      <form id="add-competition-form" onSubmit={handleSubmit} className="rounded-xl border border-border bg-card/10 p-4 sm:p-6 space-y-6">
        {/* Title */}
        <div className="grid gap-2">
          <Label htmlFor="comp-title">
            Judul Kompetisi <span className="text-red-500">*</span>
          </Label>
          <Input
            id="comp-title"
            type="text"
            required
            placeholder="e.g. Cerdas Cermat Online - Sains"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 text-sm"
          />
        </div>

        {/* Description */}
        <div className="grid gap-2">
          <Label htmlFor="comp-desc">Deskripsi Kompetisi</Label>
          <Textarea
            id="comp-desc"
            placeholder="Write competition details, prizes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        {/* Rules (Rich Text Editor) */}
        <div className="grid gap-2">
          <Label>Rules</Label>
          <RichTextEditor
            content={rules}
            onChange={setRules}
            placeholder="Tulis peraturan kompetisi di sini..."
          />
        </div>

        {/* Bottom Split Layout: Poster/Status/Link on left, Schedule/Category/Fee/Prize on right */}
        <div className="grid grid-cols-1 lg:grid-cols-[384px_1fr] gap-x-8 gap-y-6 border-t border-border/40 pt-6">
          {/* Left Column */}
          <div className="flex flex-col gap-6">
            {/* Poster turnamen */}
            <div className="grid gap-2">
              <Label>Poster</Label>
              {posterPreview ? (
                <div className="relative rounded-lg overflow-hidden border border-border bg-[#050811] w-fit h-fit">
                  <img src={posterPreview} alt="Poster" className="w-full max-w-sm max-h-[220px] object-contain p-2" />
                  <button
                    type="button"
                    onClick={() => { setPosterPreview(null); setPosterFile(null); }}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-slate-200 hover:text-white z-10 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-[#050811]/40 py-8 text-center hover:bg-card/60 cursor-pointer h-full min-h-[140px] w-full max-w-sm">
                  <Upload className="h-6 w-6 text-slate-500 mb-2" />
                  <span className="text-sm text-slate-400">Click to upload poster</span>
                  <span className="text-[10px] text-slate-600 mt-1">PNG, JPG s.d. 5MB (Kompresi WebP)</span>
                  <input type="file" accept="image/*" onChange={handlePosterChange} className="hidden" />
                </label>
              )}
            </div>

            {/* Status selection */}
            <div className="grid gap-2">
              <Label htmlFor="comp-status">Status</Label>
              <select
                id="comp-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as CompetitionStatus)}
                className="w-full h-10 rounded-lg border border-border bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&_option]:bg-[#080808]"
              >
                <option value="draft">Draft (Private)</option>
                <option value="coming_soon">Coming Soon</option>
                <option value="published">Published (Public)</option>
              </select>
            </div>

            {/* External link */}
            <div className="grid gap-2">
              <Label htmlFor="comp-link">Registration Link <span className="text-slate-500 font-normal">(optional)</span></Label>
              <Input
                id="comp-link"
                type="url"
                placeholder="https://..."
                value={regLink}
                onChange={(e) => setRegLink(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col justify-start gap-6">
            {/* Schedule Trigger */}
            <div className="grid gap-2">
              <Label>Schedule <span className="text-red-500">*</span></Label>
              <button
                type="button"
                onClick={() => setShowScheduleModal(true)}
                className="flex items-start gap-3 w-full rounded-lg border border-border/60 bg-slate-900/10 hover:bg-slate-900/35 transition p-3 text-left cursor-pointer outline-none"
              >
                <Calendar className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                {hasSchedule ? (
                  <div className="flex flex-col sm:flex-row flex-wrap items-start gap-x-8 gap-y-4 text-xs w-full text-white">
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Registration</span>
                      <span>{fmtDateDisplay(regStart)} — {fmtDateDisplay(regEnd)}</span>
                    </div>
                    {(qualStart || qualEnd) && (
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Qualification</span>
                        <span>{fmtDateDisplay(qualStart)} — {fmtDateDisplay(qualEnd)}</span>
                      </div>
                    )}
                    {(finalStart || finalEnd) && (
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Final</span>
                        <span>{fmtDateDisplay(finalStart)} — {fmtDateDisplay(finalEnd)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-slate-500">Click to set schedule...</span>
                )}
              </button>
            </div>

            {/* Categories Selection */}
            <div className="grid gap-2">
              <Label>Categories</Label>
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="flex items-center gap-3 w-full rounded-lg border border-border/60 bg-slate-900/10 hover:bg-slate-900/35 transition p-3 text-left cursor-pointer outline-none"
              >
                <Tag className="h-5 w-5 text-indigo-400 shrink-0" />
                {selectedCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCategories.map((c) => (
                      <Badge key={c} variant="default" className="text-[11px] px-2 py-0.5 font-normal bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                        {c}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-slate-500">Click to set categories...</span>
                )}
              </button>
            </div>

            {/* Fee & Prize Pool Grid */}
            <div className="flex flex-col sm:flex-row gap-6 mt-2">
              <div className="grid gap-2 w-full sm:max-w-[200px]">
                <Label>Registration Fee</Label>
                <Input
                  type="text"
                  placeholder="Nominal / Desc"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="grid gap-2 w-full sm:max-w-[340px]">
                <Label>Total Prize</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Nominal / Reward"
                    value={prizePool}
                    onChange={(e) => setPrizePool(e.target.value)}
                    className="h-10 text-sm flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPrizeModal(true)}
                    className="h-10 border-border text-xs font-semibold text-slate-300 hover:text-white cursor-pointer hover:bg-slate-800"
                  >
                    Prizes & Awards
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* --- DIALOGS --- */}

      {/* 1. Schedule Dialog */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="max-w-md bg-[#0c1224] border-border text-white p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-400" />
              Schedule
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 my-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Registration <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <Input type="date" required value={regStart} onChange={(e) => setRegStart(e.target.value)} className="h-9 text-xs" />
                <span className="text-xs text-slate-500">—</span>
                <Input type="date" required value={regEnd} onChange={(e) => setRegEnd(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Qualification
              </Label>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <Input type="date" value={qualStart} onChange={(e) => setQualStart(e.target.value)} className="h-9 text-xs" />
                <span className="text-xs text-slate-500">—</span>
                <Input type="date" value={qualEnd} onChange={(e) => setQualEnd(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Final
              </Label>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <Input type="date" value={finalStart} onChange={(e) => setFinalStart(e.target.value)} className="h-9 text-xs" />
                <span className="text-xs text-slate-500">—</span>
                <Input type="date" value={finalEnd} onChange={(e) => setFinalEnd(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setShowScheduleModal(false)}
              className="bg-primary text-primary-foreground font-bold hover:brightness-110 cursor-pointer h-9 px-4"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Category Dialog */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-sm bg-[#0c1224] border-border text-white p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Tag className="h-5 w-5 text-indigo-400" />
              Categories
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 my-4">
            {loadingCats ? (
              <span className="text-xs text-slate-500">Loading categories...</span>
            ) : (
              availableCategories.map((cat) => {
                const selected = selectedCategories.includes(cat);
                return (
                  <Badge
                    key={cat}
                    variant={selected ? "default" : "outline"}
                    className="cursor-pointer font-normal border-dashed select-none text-sm px-3 py-1.5"
                    onClick={() => handleToggleCategory(cat)}
                  >
                    {cat}
                  </Badge>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setShowCategoryModal(false)}
              className="bg-primary text-primary-foreground font-bold hover:brightness-110 cursor-pointer h-9 px-4"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Prizes Dialog */}
      <Dialog open={showPrizeModal} onOpenChange={setShowPrizeModal}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-[#0c1224] border-border text-white p-6">
          <DialogHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Gift className="h-5 w-5 text-rose-500" />
              Prizes &amp; Awards
            </DialogTitle>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const cats = selectedCategories.length > 0 ? selectedCategories : ["Umum"];
                const basePlaces = ["Juara 1", "Juara 2", "Juara 3", "Harapan 1", "Harapan 2", "Harapan 3"];
                const newPrizes: Prize[] = [];
                cats.forEach(cat => {
                  basePlaces.forEach(place => {
                    newPrizes.push({ place, category: cat, amount: "", reward: "" });
                  });
                });
                setPrizes(newPrizes);
              }}
              className="border-border text-xs font-bold text-white hover:bg-zinc-800 cursor-pointer h-8 px-3"
            >
              Auto-generate per Category
            </Button>
          </DialogHeader>

          <div className="space-y-4 my-4 py-1 max-h-[50vh] overflow-y-auto pr-1">
            <div className="hidden sm:grid grid-cols-[1fr_1fr_1.5fr_1.5fr_auto] gap-3 items-center px-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <div>Category</div>
              <div>Place</div>
              <div>Amount</div>
              <div>Reward</div>
              <div></div>
            </div>

            {prizes.map((prize, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.5fr_1.5fr_auto] gap-3 items-center border-b border-border/40 sm:border-b-0 pb-4 sm:pb-0">
                <select
                  value={prize.category}
                  onChange={(e) => {
                    const newPrizes = [...prizes];
                    newPrizes[idx] = { ...newPrizes[idx], category: e.target.value };
                    setPrizes(newPrizes);
                  }}
                  className="rounded border border-input bg-transparent px-3 py-2 text-xs text-white outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 h-9 dark:bg-input/30"
                >
                  <option value="Umum" className="bg-[#0c1224]">Umum</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c} className="bg-[#0c1224]">{c}</option>
                  ))}
                </select>

                <Input
                  type="text"
                  placeholder="e.g. Juara 1"
                  value={prize.place}
                  onChange={(e) => {
                    const newPrizes = [...prizes];
                    newPrizes[idx] = { ...newPrizes[idx], place: e.target.value };
                    setPrizes(newPrizes);
                  }}
                  className="h-9 text-xs"
                />

                <Input
                  type="text"
                  placeholder="e.g. Rp 2.000.000"
                  value={prize.amount}
                  onChange={(e) => {
                    const newPrizes = [...prizes];
                    newPrizes[idx] = { ...newPrizes[idx], amount: e.target.value };
                    setPrizes(newPrizes);
                  }}
                  className="h-9 text-xs"
                />

                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="e.g. Piala + Sertifikat"
                    value={prize.reward}
                    onChange={(e) => {
                      const newPrizes = [...prizes];
                      newPrizes[idx] = { ...newPrizes[idx], reward: e.target.value };
                      setPrizes(newPrizes);
                    }}
                    className="h-9 text-xs flex-1"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setPrizes(prizes.filter((_, i) => i !== idx));
                    }}
                    size="icon-sm"
                    className="text-red-500 hover:bg-red-500/10 hover:text-red-400 cursor-pointer size-9"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                setPrizes([...prizes, { category: selectedCategories[0] || "Umum", place: "", amount: "", reward: "" }]);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-[#050811]/40 py-2.5 text-xs text-slate-400 hover:text-white transition outline-none cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Prize
            </button>
          </div>

          <DialogFooter className="border-t border-border pt-4">
            <Button
              type="button"
              onClick={() => setShowPrizeModal(false)}
              className="bg-primary text-primary-foreground font-bold hover:brightness-110 cursor-pointer h-9 px-4"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
