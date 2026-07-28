"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Competition } from "@/types/competition";
import { generateXID } from "@/lib/id-generator";
import { competitionService } from "@/lib/services/competition-service";
import { 
  Trophy, Calendar, Users, 
  CheckCircle, Search, 
  ChevronRight, Edit, ArrowLeft, RefreshCw,
  AlertCircle, ShieldCheck, Trash2, UserPlus,
  QrCode, Camera, X, Image, CreditCard, Gamepad2,
  Plus, BookOpen, Save, ChevronDown, ChevronUp, Medal, Play
} from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Participant {
  id: string;
  userId: string;
  name: string;
  username: string;
  schoolName: string;
  category: string;
  isPaid: boolean;
  isPresent: boolean;
  isFinalist: boolean;
  registeredAt: string;
  avatar: string | null;
  gamesPlayed: number;
  avgScore: number;
  sessions: any[];
}

interface LocalGroup {
  id: string;
  name: string;
  stage: string;
  category: string;
  rounds: any[];
  sources: string[];
  members: {
    playerId: string;
    playerName: string;
    score: number;
    timeSeconds: number;
    isAdvanced: boolean;
  }[];
}

interface QuizItem {
  id: string;
  title: string;
  questionCount: number;
}

export default function CompetitionDetailPage() {
  const { profile, activeOrganizationId, organizationRole, hasPermission } = useAuth();
  const router = useRouter();
  const params = useParams();
  const compId = params.id as string;

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    "registration" | "payment" | "groupstage" | "completed"
  >("registration");

  // Competition details
  const [competition, setCompetition] = useState<Competition | null>(null);
  
  // User authorization
  const [userRole, setUserRole] = useState<"manager" | "mc" | "receptionist" | "none">("none");

  // Core Data Lists
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [groups, setGroups] = useState<LocalGroup[]>([]);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const categories = competition?.category
    ? competition.category.split(",").map((s: string) => s.trim()).filter(Boolean)
    : [];

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentSearchQuery, setPaymentSearchQuery] = useState("");
  const [groupFilterCategory, setGroupFilterCategory] = useState("all");
  const [selectedPlayerForSessions, setSelectedPlayerForSessions] = useState<Participant | null>(null);

  // Standings Tab / Group Stage Management states
  const [isGroupsDirty, setIsGroupsDirty] = useState(false);
  const [isSavingGroups, setIsSavingGroups] = useState(false);
  
  // Standings Tab Filters
  const [standingsSearchQuery, setStandingsSearchQuery] = useState("");
  const [standingsStageFilter, setStandingsStageFilter] = useState("all");
  const [standingsCategoryFilter, setStandingsCategoryFilter] = useState("all");
  
  // Selected Group for Standings visualization below list
  const [selectedGroupForStandings, setSelectedGroupForStandings] = useState<LocalGroup | null>(null);

  // Group Management Modals state
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<LocalGroup | null>(null);
  const [assignDialog, setAssignDialog] = useState<LocalGroup | null>(null);
  const [roundsDialog, setRoundsDialog] = useState<{ group: LocalGroup; rounds: any[] } | null>(null);
  
  // Assign Player state
  const [assignSelected, setAssignSelected] = useState<string[]>([]);
  const [assignSearch, setAssignSearch] = useState("");

  // Add Group Fields
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupStage, setNewGroupStage] = useState("Semifinal");
  const [newGroupCategory, setNewGroupCategory] = useState("");
  const [newGroupSources, setNewGroupSources] = useState<string[]>([]);

  // Edit Group Fields
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupStage, setEditGroupStage] = useState("");
  const [editGroupCategory, setEditGroupCategory] = useState("");
  const [editGroupSources, setEditGroupSources] = useState<string[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" }); // type: success | error
  const [startingRound, setStartingRound] = useState<string | null>(null);

  // Description / Rules Expanded
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  // Staff management
  const [staffList, setStaffList] = useState<any[]>([]);
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [newStaffRole, setNewStaffRole] = useState<string>("");
  const [organizerName, setOrganizerName] = useState("Regional Competition");

  // Selected Group Stage modal for editing scores
  const [selectedGroupModal, setSelectedGroupModal] = useState<LocalGroup | null>(null);

  // QR Scanner for Attendance/Check-In
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [scanResult, setScanResult] = useState<{ status: "success" | "error" | "info"; message: string } | null>(null);
  const scannerRef = React.useRef<any>(null);
  const lastScanRef = React.useRef<{ text: string; time: number } | null>(null);
  const participantsRef = React.useRef(participants);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  const handleQrResult = React.useCallback(
    (scannedText: string) => {
      const now = Date.now();
      if (lastScanRef.current && lastScanRef.current.text === scannedText && (now - lastScanRef.current.time) < 4000) return;
      lastScanRef.current = { text: scannedText, time: now };

      let extractedData = scannedText.trim();

      if (extractedData.includes("/profile/")) {
        const parts = extractedData.split("/profile/");
        extractedData = parts.pop()?.replace(/\//g, "") || extractedData;
      }

      const cleanedScan = extractedData.replace(/^@/, "").toLowerCase();

      const matched = participantsRef.current.find(
        (p) =>
          p.id.toLowerCase() === cleanedScan ||
          p.userId.toLowerCase() === cleanedScan ||
          p.username.toLowerCase() === cleanedScan
      );

      if (matched) {
        if (matched.isPresent) {
          setScanResult({
            status: "info",
            message: `Sudah Hadir: ${matched.name}`,
          });
        } else {
          supabaseBrowser
            .from("competition_participants")
            .update({ is_present: true })
            .eq("id", matched.id)
            .then(({ error }: { error: any }) => {
              if (error) {
                console.error("Error checking in via QR", error);
                setScanResult({
                  status: "error",
                  message: `Gagal mencatat kehadiran: ${error.message}`,
                });
              } else {
                setParticipants((prev) =>
                  prev.map((p) =>
                    p.id === matched.id ? { ...p, isPresent: true } : p
                  )
                );
                setScanResult({
                  status: "success",
                  message: `Kehadiran Berhasil Dicatat! - ${matched.name}`,
                });
              }
            });
        }
      } else {
        setScanResult({
          status: "error",
          message: `Kode QR tidak cocok dengan pendaftar (${cleanedScan})`,
        });
      }

      setTimeout(() => setScanResult(null), 3000);
    },
    []
  );

  useEffect(() => {
    if (!qrDialogOpen) {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
        } catch (e) { /* ignore */ }
        scannerRef.current = null;
      }
      setScanResult(null);
      return;
    }

    let mounted = true;
    const initScanner = async () => {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      if (!mounted) return;
      await new Promise((r) => setTimeout(r, 400));
      const el = document.getElementById("qr-reader");
      if (!el) return;
      const scanner = new Html5Qrcode("qr-reader", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        verbose: false,
      });
      scannerRef.current = scanner;

      const config = {
        fps: 15,
        disableFlip: false,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdgePercentage = 0.9; 
          const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
          return {
            width: qrboxSize,
            height: qrboxSize
          };
        }
      };

      try {
        await scanner.start(
          { facingMode: "environment" },
          config,
          (decodedText: string) => { handleQrResult(decodedText); },
          () => {}
        );
      } catch {
        try {
          await scanner.start(
            { facingMode: "user" },
            config,
            (decodedText: string) => { handleQrResult(decodedText); },
            () => {}
          );
        } catch (err2) {
          console.error("Failed to start QR scanner:", err2);
        }
      }
    };

    initScanner();
    return () => {
      mounted = false;
      if (scannerRef.current) {
        try { scannerRef.current.stop().catch(() => {}); } catch (e) { /* ignore */ }
        scannerRef.current = null;
      }
    };
  }, [qrDialogOpen, handleQrResult]);

  // Fetch all competition details and check authorization
  const loadData = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setLoading(true);
    else setRefreshing(true);

    try {
      // 1. Fetch competition info with organization details
      const { data: compData, error: compErr } = await supabaseBrowser
        .from("competitions")
        .select(`
          *,
          organizations:organization_id (
            name
          ),
          creator:profiles!creator_id (
            fullname,
            username
          )
        `)
        .eq("id", compId)
        .single();

      if (compErr || !compData) {
        throw new Error("Kompetisi tidak ditemukan.");
      }
      setCompetition(compData as unknown as Competition);
      if (compData.organizations) {
        setOrganizerName((compData.organizations as any).name);
      } else if (compData.creator) {
        setOrganizerName((compData.creator as any).fullname || (compData.creator as any).username || "Regional Competition");
      } else {
        setOrganizerName("Regional Competition");
      }

      // 2. Resolve role
      let role: "manager" | "mc" | "receptionist" | "none" = "none";
      if (profile) {
        // A. Check competition_staff first (specific staff assignment takes precedence)
        const { data: staffData, error: staffErr } = await supabaseBrowser
          .from("competition_staff")
          .select(`
            role,
            role_id,
            roles:role_id (
              name
            )
          `)
          .eq("competition_id", compId)
          .eq("profile_id", profile.id)
          .maybeSingle();

        console.log("[RoleDebug] profile.id:", profile.id, "compId:", compId);
        console.log("[RoleDebug] staffData:", JSON.stringify(staffData));
        console.log("[RoleDebug] staffErr:", staffErr);
        console.log("[RoleDebug] organizationRole:", organizationRole);

        if (staffData) {
          // Try roles FK join name first, then fallback to role text column
          const roleName = (staffData.roles as any)?.name || staffData.role;
          console.log("[RoleDebug] roleName resolved:", roleName);
          
          if (roleName) {
            const lowerRole = roleName.toLowerCase();
            if (lowerRole === "manager" || lowerRole === "co-manager" || lowerRole === "co-manager regional") {
              role = "manager";
            } else if (lowerRole === "mc" || lowerRole === "mc regional") {
              role = "mc";
            } else if (lowerRole === "receptionist" || lowerRole === "receptionist regional") {
              role = "receptionist";
            }
          }
        }

        // B. If not assigned as specific staff, fallback to creator, org owner, or org admin
        // Org admins are promoted to manager ONLY if the competition belongs to their organization.
        if (role === "none") {
          const isCreator = compData.creator_id === profile.id;
          const isOwner = organizationRole === "owner";
          const isOrgAdmin = organizationRole === "admin" && activeOrganizationId && compData.organization_id === activeOrganizationId;
          const isGlobalManager = profile.username === "manager_gfs";
          if (isCreator || isOwner || isOrgAdmin || isGlobalManager) {
            role = "manager";
          }
        }

        console.log("[RoleDebug] FINAL role:", role);
      }
      setUserRole(role);

      // 2b. Fetch roles for staff selection if activeOrganizationId exists
      if (activeOrganizationId) {
        const roles = await competitionService.getCompetitionRoles(activeOrganizationId);
        setAvailableRoles(roles);
        if (roles.length > 0 && !newStaffRole) {
          setNewStaffRole(roles[0].id);
        }
      }

      // 3. Fetch participants joined with profiles
      const { data: partData, error: partErr } = await supabaseBrowser
        .from("competition_participants")
        .select(`
          id,
          user_id,
          is_paid,
          is_present,
          is_finalist,
          school_name,
          category,
          created_at,
          profiles (
            fullname,
            username,
            avatar_url
          )
        `)
        .eq("competition_id", compId)
        .order("created_at", { ascending: true });

      if (!partErr && partData) {
        const userIds = partData.map((p: any) => p.user_id).filter(Boolean);
        
        let qualData: any[] = [];
        if (userIds.length > 0) {
          try {
            let qualQuery = supabaseBrowser
              .from("game_sessions")
              .select(`
                id,
                created_at,
                application,
                quiz_detail,
                participants
              `)
              .eq("status", "finished")
              .order("created_at", { ascending: false });
            
            if (compData.registration_start_date) {
              qualQuery = qualQuery.gte("created_at", compData.registration_start_date);
            }
            
            const orFilter = userIds.map((uid: string) => `participants.cs.[{"user_id":"${uid}"}]`).join(",");
            qualQuery = qualQuery.or(orFilter);
            
            const { data: qData, error: qErr } = await qualQuery;
            if (!qErr && qData) {
              qualData = qData;
            } else {
              console.warn("Could not fetch game sessions, ignoring stats:", qErr);
            }
          } catch (e) {
            console.warn("Gracefully ignored game_sessions fetch error:", e);
          }
        }

        // Map Qual Sessions Stats
        const qualStats: Record<string, { gamesPlayed: number; totalScore: number; sessions: any[] }> = {};
        
        qualData.forEach((session: any) => {
          const sessionCreatedAt = session.created_at;
          if (Array.isArray(session.participants)) {
            session.participants.forEach((p: any) => {
              if (p.user_id && userIds.includes(p.user_id)) {
                const matchedPart = partData.find((part: any) => part.user_id === p.user_id);
                if (matchedPart && sessionCreatedAt < matchedPart.created_at) return;
                if (compData.registration_end_date && sessionCreatedAt > compData.registration_end_date) return;

                if (!qualStats[p.user_id]) {
                  qualStats[p.user_id] = { gamesPlayed: 0, totalScore: 0, sessions: [] };
                }
                
                qualStats[p.user_id].gamesPlayed += 1;
                qualStats[p.user_id].totalScore += p.score || 0;

                let t = 0;
                if (p.time_seconds) t = p.time_seconds;
                else if (p.time) t = p.time;
                else if (p.started && p.ended) {
                  const start = new Date(p.started).getTime();
                  const end = new Date(p.ended).getTime();
                  if (end > start) t = Math.floor((end - start) / 1000);
                }

                qualStats[p.user_id].sessions.push({
                  id: session.id,
                  application: session.application,
                  quizTitle: session.quiz_detail?.title || session.application || "Quiz",
                  score: p.score || 0,
                  timeSeconds: t,
                  createdAt: sessionCreatedAt
                });
              }
            });
          }
        });

        const formatted: Participant[] = partData.map((p: any) => {
          const stats = qualStats[p.user_id] || { gamesPlayed: 0, totalScore: 0, sessions: [] };
          const avgScore = stats.gamesPlayed > 0 ? Number((stats.totalScore / stats.gamesPlayed).toFixed(1)) : 0;
          return {
            id: p.id,
            userId: p.user_id,
            name: p.profiles?.fullname || "Unknown",
            username: p.profiles?.username || p.user_id,
            schoolName: p.school_name || "",
            category: p.category || "",
            isPaid: p.is_paid || false,
            isPresent: p.is_present || false,
            isFinalist: p.is_finalist || false,
            registeredAt: p.created_at,
            avatar: p.profiles?.avatar_url || null,
            gamesPlayed: stats.gamesPlayed,
            avgScore: avgScore,
            sessions: stats.sessions
          };
        });
        setParticipants(formatted);
      }

      // 4. Fetch Groups & members
      const { data: groupData, error: groupErr } = await supabaseBrowser
        .from("competition_groups")
        .select(`
          id,
          name,
          stage,
          rounds,
          source_group_ids,
          category,
          competition_group_members (
            participant_id,
            score,
            time_seconds,
            is_advanced
          )
        `)
        .eq("competition_id", compId)
        .order("id", { ascending: true });

      if (!groupErr && groupData) {
        // Resolve participant names
        const partNameMap: Record<string, string> = {};
        partData?.forEach((p: any) => {
          partNameMap[p.id] = p.profiles?.fullname || "Unknown";
        });

        const formattedGroups: LocalGroup[] = groupData.map((g: any) => ({
          id: g.id,
          name: g.name,
          stage: g.stage,
          category: g.category || "",
          rounds: g.rounds || [],
          sources: g.source_group_ids || [],
          members: (g.competition_group_members || []).map((m: any) => ({
            playerId: m.participant_id,
            playerName: partNameMap[m.participant_id] || "Peserta Baru",
            score: Number(m.score) || 0,
            timeSeconds: Number(m.time_seconds) || 0,
            isAdvanced: m.is_advanced || false
          }))
        }));
        setGroups(formattedGroups);
      }

      // 5. Fetch available quizzes
      const { data: quizData } = await supabaseBrowser
        .from("quizzes")
        .select("id, title, questions");
      if (quizData) {
        setQuizzes(
          quizData.map((q: any) => ({
            id: q.id,
            title: q.title || "Untitled Quiz",
            questionCount: Array.isArray(q.questions) ? q.questions.length : 0
          }))
        );
      }

      // 6. Fetch staff list for manager
      const { data: staffDataList } = await supabaseBrowser
        .from("competition_staff")
        .select(`
          id,
          role,
          profile_id,
          profiles (
            fullname,
            email
          )
        `)
        .eq("competition_id", compId);

      if (staffDataList) {
        setStaffList(
          staffDataList.map((s: any) => ({
            id: s.id,
            role: s.role,
            profileId: s.profile_id,
            name: s.profiles?.fullname || "Unknown Staff",
            email: s.profiles?.email || ""
          }))
        );
      }

    } catch (err: any) {
      console.error(err);
      setMessage({ text: err.message || "Gagal memuat detail kompetisi", type: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [compId, profile, organizationRole]);

  // Set default active tab based on role when role is resolved
  useEffect(() => {
    if (userRole === "mc") {
      setActiveTab("groupstage");
    } else if (userRole === "receptionist" || userRole === "manager") {
      setActiveTab("registration");
    }
  }, [userRole]);

  // Handle Participant Check-In (Attendance)
  const handleCheckIn = async (partId: string, currentPresent: boolean) => {
    setMessage({ text: "", type: "" });
    try {
      const { error } = await supabaseBrowser
        .from("competition_participants")
        .update({ is_present: !currentPresent })
        .eq("id", partId);

      if (error) throw error;
      
      // Update local state for fast UI feedback
      setParticipants(prev =>
        prev.map(p => p.id === partId ? { ...p, isPresent: !currentPresent } : p)
      );
    } catch (err: any) {
      console.error(err);
      setMessage({ text: "Gagal memperbarui status check-in", type: "error" });
    }
  };

  // Handle Payment Verification
  const handleVerifyPayment = async (partId: string, currentPaid: boolean) => {
    setMessage({ text: "", type: "" });
    try {
      const { error } = await supabaseBrowser
        .from("competition_participants")
        .update({ is_paid: !currentPaid })
        .eq("id", partId);

      if (error) throw error;

      setParticipants(prev =>
        prev.map(p => p.id === partId ? { ...p, isPaid: !currentPaid } : p)
      );
    } catch (err: any) {
      console.error(err);
      setMessage({ text: "Gagal memverifikasi pembayaran", type: "error" });
    }
  };

  // Save Group Member scores (Group stage management)
  const handleSaveGroupScores = async (groupId: string, membersList: any[]) => {
    setMessage({ text: "", type: "" });
    setSaving(true);
    try {
      // 1. Delete old members for this group
      const { error: delErr } = await supabaseBrowser
        .from("competition_group_members")
        .delete()
        .eq("group_id", groupId);

      if (delErr) throw delErr;

      // 2. Insert updated members
      const insertData = membersList.map((m, idx) => ({
        id: `${groupId}-${m.playerId}-${idx}`,
        group_id: groupId,
        participant_id: m.playerId,
        score: Number(m.score) || 0,
        time_seconds: Number(m.timeSeconds) || 0,
        is_advanced: m.isAdvanced || false
      }));

      if (insertData.length > 0) {
        const { error: insErr } = await supabaseBrowser
          .from("competition_group_members")
          .insert(insertData);

        if (insErr) throw insErr;
      }

      setMessage({ text: "Skor babak grup berhasil disimpan!", type: "success" });
      loadData(false);
    } catch (err: any) {
      console.error(err);
      setMessage({ text: "Gagal menyimpan skor babak grup", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Group Stage Standings CRUD & Actions
  const handleAddGroup = () => {
    if (!newGroupName.trim()) {
      setMessage({ text: "Nama grup tidak boleh kosong", type: "error" });
      return;
    }

    let initialMembers: any[] = [];
    if (newGroupSources.length > 0) {
      const sourceGrps = groups.filter((g) => newGroupSources.includes(g.id));
      initialMembers = sourceGrps.flatMap(sourceGrp => 
        sourceGrp.members
          .filter((m) => m.isAdvanced)
          .map((m) => {
            const isChampion = newGroupStage === "Champion" || newGroupName.trim().toLowerCase().includes("juara");
            return { 
              ...m, 
              isAdvanced: false, 
              score: isChampion ? m.score : 0, 
              timeSeconds: isChampion ? m.timeSeconds : 0 
            };
          })
      );
    }

    const newGroup: LocalGroup = {
      id: generateXID(),
      name: newGroupName.trim(),
      rounds: [],
      members: initialMembers,
      stage: newGroupStage,
      category: newGroupCategory || "",
      sources: newGroupSources
    };

    setGroups([...groups, newGroup]);
    setIsGroupsDirty(true);
    setNewGroupName("");
    setNewGroupSources([]);
    setIsAddGroupOpen(false);
    setMessage({ text: `Grup "${newGroup.name}" berhasil ditambahkan secara lokal. Klik Save untuk menyimpan.`, type: "success" });
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups(groups.filter((g) => g.id !== groupId));
    setIsGroupsDirty(true);
    if (selectedGroupForStandings?.id === groupId) {
      setSelectedGroupForStandings(null);
    }
    setMessage({ text: "Grup berhasil dihapus secara lokal. Klik Save untuk menyimpan.", type: "success" });
  };

  const handleUpdateGroup = () => {
    if (!editGroup) return;
    if (!editGroupName.trim()) {
      setMessage({ text: "Nama grup tidak boleh kosong", type: "error" });
      return;
    }

    const updatedGroups = groups.map((g) =>
      g.id === editGroup.id
        ? {
            ...g,
            name: editGroupName.trim(),
            stage: editGroupStage,
            sources: editGroupSources,
            category: editGroupCategory
          }
        : g
    );

    setGroups(updatedGroups);
    setIsGroupsDirty(true);
    setEditGroup(null);
    setMessage({ text: "Grup berhasil diperbarui secara lokal. Klik Save untuk menyimpan.", type: "success" });
  };

  const handleAssignPlayers = () => {
    if (!assignDialog || assignSelected.length === 0) return;
    
    const existingPlayerIds = new Set(assignDialog.members.map(m => m.playerId));
    
    const newMembers = assignSelected
      .filter(pId => !existingPlayerIds.has(pId))
      .map((pId) => {
        const player = participants.find((p) => p.id === pId);
        
        let prevScore = 0;
        let prevTime = 0;
        
        const isChampion = assignDialog.stage === "Champion" || assignDialog.name.toLowerCase().includes("juara");
        if (isChampion) {
          for (let i = groups.length - 1; i >= 0; i--) {
            const memMatch = groups[i].members.find(m => m.playerId === pId);
            if (memMatch && memMatch.score > 0) {
              prevScore = memMatch.score;
              prevTime = memMatch.timeSeconds;
              break;
            }
          }
        }

        return {
          playerId: pId,
          playerName: player?.name || "Peserta Baru",
          score: prevScore,
          timeSeconds: prevTime,
          isAdvanced: false
        };
      });

    const updatedGroups = groups.map((g) =>
      g.id === assignDialog.id
        ? { ...g, members: [...g.members, ...newMembers] }
        : g
    );

    setGroups(updatedGroups);
    setIsGroupsDirty(true);
    setAssignSelected([]);
    setAssignSearch("");
    setAssignDialog(null);
    setMessage({ text: "Peserta berhasil dimasukkan ke dalam grup secara lokal. Klik Save untuk menyimpan.", type: "success" });
  };

  const handleSaveRounds = () => {
    if (!roundsDialog) return;
    
    const normalizedRounds = roundsDialog.rounds.map((r, idx) => ({
      round: idx + 1,
      quiz_id: r.quizId,
      game_id: r.gameId,
      settings: r.settings || {
        durationMinutes: 10,
        questionCount: 10,
        sound: true,
        difficulty: "Easy"
      }
    }));

    const updatedGroups = groups.map((g) =>
      g.id === roundsDialog.group.id ? { ...g, rounds: normalizedRounds } : g
    );

    setGroups(updatedGroups);
    setIsGroupsDirty(true);
    setRoundsDialog(null);
    setMessage({ text: "Konfigurasi ronde kuis berhasil diperbarui secara lokal. Klik Save untuk menyimpan.", type: "success" });
  };

  const handleSaveGroupsToDb = async () => {
    setMessage({ text: "", type: "" });
    setIsSavingGroups(true);
    try {
      const { data: oldGroups, error: fetchOldErr } = await supabaseBrowser
        .from("competition_groups")
        .select("id, rounds")
        .eq("competition_id", compId);

      if (fetchOldErr) throw fetchOldErr;

      if (oldGroups && oldGroups.length > 0) {
        const oldLobbyIds: string[] = [];
        const oldSessionIds: string[] = [];
        oldGroups.forEach((g: any) => {
          if (g.rounds && Array.isArray(g.rounds)) {
            g.rounds.forEach((r: any) => {
              if (r.lobby_id) oldLobbyIds.push(r.lobby_id);
              if (r.session_id) oldSessionIds.push(r.session_id);
            });
          }
        });

        const newLobbyIds: string[] = [];
        const newSessionIds: string[] = [];
        groups.forEach((g) => {
          if (g.rounds && Array.isArray(g.rounds)) {
            g.rounds.forEach((r) => {
              if (r.lobby_id) newLobbyIds.push(r.lobby_id);
              if (r.session_id) newSessionIds.push(r.session_id);
            });
          }
        });

        const orphanedLobbyIds = oldLobbyIds.filter(id => !newLobbyIds.includes(id));
        const orphanedSessionIds = oldSessionIds.filter(id => !newSessionIds.includes(id));

        if (orphanedSessionIds.length > 0) {
          await supabaseBrowser.from("game_sessions").delete().in("id", orphanedSessionIds);
        }
        if (orphanedLobbyIds.length > 0) {
          await supabaseBrowser.from("groups").delete().in("id", orphanedLobbyIds);
        }

        const oldIds = oldGroups.map((g: any) => g.id);
        
        const { error: delMemErr } = await supabaseBrowser
          .from("competition_group_members")
          .delete()
          .in("group_id", oldIds);
        if (delMemErr) throw delMemErr;

        const { error: delGrpErr } = await supabaseBrowser
          .from("competition_groups")
          .delete()
          .in("id", oldIds);
        if (delGrpErr) throw delGrpErr;
      }

      const insertGroups = groups.map(g => ({
        id: g.id,
        competition_id: compId,
        name: g.name,
        stage: g.stage || "",
        rounds: g.rounds || [],
        source_group_ids: g.sources || [],
        category: g.category || null,
      }));

      if (insertGroups.length > 0) {
        const { error: eg } = await supabaseBrowser
          .from("competition_groups")
          .insert(insertGroups);
        if (eg) throw eg;

        let insertMembers: any[] = [];
        groups.forEach(g => {
          g.members.forEach((m, idx) => {
            insertMembers.push({
              id: `${g.id}-${m.playerId}-${idx}`,
              group_id: g.id,
              participant_id: m.playerId,
              score: m.score,
              time_seconds: m.timeSeconds,
              is_advanced: m.isAdvanced
            });
          });
        });

        if (insertMembers.length > 0) {
          const { error: em } = await supabaseBrowser
            .from("competition_group_members")
            .insert(insertMembers);
          if (em) throw em;
        }
      }

      setIsGroupsDirty(false);
      setMessage({ text: "Seluruh konfigurasi babak Standings berhasil disimpan ke database!", type: "success" });
      loadData(false);
    } catch (err: any) {
      console.error(err);
      setMessage({ text: "Gagal menyimpan perubahan ke database", type: "error" });
    } finally {
      setIsSavingGroups(false);
    }
  };

  const toggleAdvance = (groupId: string, playerId: string) => {
    let playerObj: any = null;
    let nextValue = false;

    const updatedGroups = groups.map((g) => {
      if (g.id === groupId) {
        const updatedMembers = g.members.map((m) => {
          if (m.playerId === playerId) {
            nextValue = !m.isAdvanced;
            playerObj = { ...m, isAdvanced: nextValue };
            return playerObj;
          }
          return m;
        });
        return { ...g, members: updatedMembers };
      }
      return g;
    });

    const finalGroups = updatedGroups.map((g) => {
      if (g.sources && g.sources.includes(groupId)) {
        if (nextValue) {
          const exists = g.members.some((m) => m.playerId === playerId);
          if (!exists && playerObj) {
            const isChampion = g.stage === "Champion" || g.name.toLowerCase().includes("juara");
            return {
              ...g,
              members: [
                ...g.members,
                {
                  playerId: playerId,
                  playerName: playerObj.playerName,
                  score: isChampion ? playerObj.score : 0,
                  timeSeconds: isChampion ? playerObj.timeSeconds : 0,
                  isAdvanced: false,
                }
              ]
            };
          }
        } else {
          return {
            ...g,
            members: g.members.filter((m) => m.playerId !== playerId)
          };
        }
      }
      return g;
    });

    setGroups(finalGroups);
    setIsGroupsDirty(true);
    
    if (selectedGroupForStandings?.id === groupId) {
      setSelectedGroupForStandings(finalGroups.find(g => g.id === groupId) || null);
    }
  };

  const handleStartSession = async (group: LocalGroup, roundIdx: number) => {
    if (!compId || !profile) {
      alert("Competition ID or User Profile missing");
      return;
    }

    const round = group.rounds[roundIdx];
    if (!round.quiz_id && !round.game_id) {
      alert("Please assign a quiz or game first");
      return;
    }

    const loadingId = `${group.id}-${roundIdx}`;
    setStartingRound(loadingId);

    const hostWindow = typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;

    try {
      // 0. Load current group rounds to check for existing session
      const { data: cgData, error: cgError } = await supabaseBrowser
        .from("competition_groups")
        .select("rounds")
        .eq("id", group.id)
        .single();

      if (cgError) throw new Error("Failed to load competition group rounds");

      const existingRound = cgData?.rounds ? cgData.rounds[roundIdx] : null;

      let sessionXId = "";
      let newMainGroupId = "";
      let gamePin = Math.floor(100000 + Math.random() * 900000).toString();
      let isReusingSession = false;

      if (existingRound && existingRound.session_id) {
        sessionXId = existingRound.session_id;
        gamePin = existingRound.game_pin || gamePin;
        newMainGroupId = existingRound.lobby_id || generateXID();
        isReusingSession = true;
      } else {
        sessionXId = generateXID();
        newMainGroupId = generateXID();
      }

      // Extract participant IDs
      const participantIds = group.members.map(m => m.playerId);

      // Resolve user_id from competition_participants
      const { data: dbParticipants, error: pError } = await supabaseBrowser
        .from("competition_participants")
        .select("id, user_id")
        .in("id", participantIds);

      if (pError) throw new Error(`Failed to resolve users: ${pError.message}`);

      const resolvedUsers = (dbParticipants || []).filter((dp: any) => dp.user_id);

      if (resolvedUsers.length === 0) {
        throw new Error("No registered participants with user accounts found in this group.");
      }

      // Prepare Lobby (groups table) payload
      const members = [
        { id: profile.id, role: "admin" },
        ...resolvedUsers.map((u: any) => ({ id: u.user_id, role: "member" }))
      ];

      const groupPayload = {
        id: newMainGroupId,
        name: `${group.name} - Round ${roundIdx + 1}`,
        description: "Match Lobby",
        creator_id: profile.id,
        members: members,
        settings: { status: "secret", admins_approval: true },
      };

      // Prepare Notifications
      const notificationReceivers = resolvedUsers.filter((u: any) => u.user_id !== profile.id);
      const notifications = notificationReceivers.map((u: any) => ({
        user_id: u.user_id,
        actor_id: profile.id,
        type: "sessionGroup",
        entity_type: "session",
        entity_id: sessionXId,
        from_group_id: newMainGroupId,
        status: null,
        content: null
      }));

      // Fetch Quiz details
      let quizDetail = null;
      if (round.quiz_id) {
        const { data: quizData } = await supabaseBrowser
          .from("quizzes")
          .select("id, title, description, category, language, image_url, profiles(username, avatar_url)")
          .eq("id", round.quiz_id)
          .single();

        if (quizData) {
          const profileData: any = Array.isArray(quizData.profiles) ? quizData.profiles[0] : quizData.profiles;
          quizDetail = {
            title: quizData.title,
            description: quizData.description || null,
            category: quizData.category || "general",
            language: quizData.language || "id",
            image: quizData.image_url || null,
            creator_username: profileData?.username || "Unknown",
            creator_avatar: profileData?.avatar_url || null
          };
        }
      }

      // Normalize game ID & fetch registry
      const normalizeKey = (value: string) => value
        .toLowerCase()
        .trim()
        .replace(/[_\-]+/g, " ")
        .replace(/[^a-z0-9 ]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const resolveGameRegistryKey = (value: string | null | undefined) => {
        const normalized = normalizeKey(value || "");
        if (!normalized) return "axiom";
        
        if (normalized.includes("zigma")) return "zigma";
        if (normalized.includes("nitroquiz") || normalized.includes("nitro quiz") || normalized === "nitro") return "nitroquiz";
        if (normalized.includes("crazyrace") || normalized.includes("crazy race")) return "crazyrace";
        if (normalized.includes("spacequiz") || normalized.includes("space quiz") || normalized.includes("quiz game v2") || normalized.includes("quiz-game-v2") || normalized.includes("quizv2") || normalized.includes("gameforsmart")) return "spacequiz";
        if (normalized.includes("quizrush") || normalized.includes("zombie rawr") || normalized.includes("zombierawr") || normalized.includes("zombie_rawr") || normalized.includes("zombie-rawr")) return "quizrush";
        if (normalized.includes("memoryquiz") || normalized.includes("memory quiz") || normalized.includes("memory-game") || normalized.includes("memory game")) return "memoryquiz";
        if (normalized.includes("axiom")) return "axiom";
        
        return "axiom";
      };

      const { GameRegistry } = await import("@/lib/game-registry");
      const normalizedApplication = resolveGameRegistryKey(round.game_id);
      const gameIntegration = GameRegistry[normalizedApplication];

      // Prepare Main Game Session Payload
      const mainSessionPayload = {
        id: sessionXId,
        quiz_id: round.quiz_id || null,
        host_id: profile.id,
        game_pin: gamePin,
        status: "waiting",
        total_time_minutes: round.settings?.durationMinutes || 5,
        question_limit: String(round.settings?.questionCount || 5),
        game_end_mode: "first_finish",
        allow_join_after_start: false,
        participants: [],
        responses: [],
        current_questions: [],
        application: normalizedApplication,
        competition_id: compId,
        difficulty: round.settings?.difficulty?.toLowerCase() || "easy",
        quiz_detail: {
          ...(quizDetail || {}),
          ...(normalizedApplication === 'memoryquiz' ? { gameMode: round.settings?.difficulty?.toLowerCase() || 'easy' } : {}),
        },
        allowed_user_ids: resolvedUsers.map((u: any) => String(u.user_id)),
      };

      // Execution
      if (!isReusingSession) {
        // 1. Insert Group
        const { error: groupErr } = await supabaseBrowser.from("groups").insert(groupPayload);
        if (groupErr) throw new Error(`Lobby creation failed: ${groupErr.message}`);

        // 2. Insert Game Session
        const { error: sessionErr } = await supabaseBrowser.from("game_sessions").insert(mainSessionPayload);
        if (sessionErr) {
          await supabaseBrowser.from("groups").delete().eq("id", newMainGroupId);
          throw new Error(`Session creation failed: ${sessionErr.message}`);
        }

        // 3. Insert Notifications
        if (notifications.length > 0) {
          const { error: notifErr } = await supabaseBrowser.from("notifications").insert(notifications);
          if (notifErr) console.warn("Failed to create notifications:", notifErr.message);
        }

        // 4. Initialize specific game session
        if (gameIntegration && gameIntegration.initializeSession) {
          const allowedUserIds = resolvedUsers.map((u: any) => String(u.user_id));
          const initRes = await gameIntegration.initializeSession({
            quizId: round.quiz_id || undefined,
            groupId: group.id,
            competitionId: compId,
            roundIndex: roundIdx,
            groupName: group.name,
            generatedSessionId: sessionXId,
            gamePin: gamePin,
            hostId: profile.id,
            settings: round.settings,
            allowedUserIds: allowedUserIds
          });

          if (!initRes.success) {
            await supabaseBrowser.from("game_sessions").delete().eq("id", sessionXId);
            await supabaseBrowser.from("groups").delete().eq("id", newMainGroupId);
            throw new Error(`Game initialization failed: ${initRes.error}`);
          }
        }

        // 5. Update rounds field in competition_groups
        if (cgData?.rounds) {
          const updatedRounds = [...cgData.rounds];
          if (updatedRounds[roundIdx]) {
            updatedRounds[roundIdx] = {
              ...updatedRounds[roundIdx],
              session_id: sessionXId,
              game_pin: gamePin,
              lobby_id: newMainGroupId,
            };
          }
          const { error: updateCgErr } = await supabaseBrowser
            .from("competition_groups")
            .update({ rounds: updatedRounds })
            .eq("id", group.id);

          if (updateCgErr) console.error("Failed to update competition_groups.rounds with session details:", updateCgErr.message);
        }
      } else {
        if (notifications.length > 0) {
          const { error: notifErr } = await supabaseBrowser.from("notifications").insert(notifications);
          if (notifErr) console.error("Failed to resend notifications:", notifErr);
        }
      }

      const redirectUrl = gameIntegration
        ? gameIntegration.getRedirectUrl({
            quizId: round.quiz_id || undefined,
            generatedSessionId: sessionXId,
            gamePin: gamePin,
            hostId: profile.id,
            settings: round.settings
          })
        : `https://app.gameforsmart.com/host/${sessionXId}/lobby?hostId=${profile.id}`;

      if (hostWindow) {
        hostWindow.location.href = redirectUrl;
      } else {
        window.open(redirectUrl, "_blank");
      }

      loadData(false);
    } catch (err: any) {
      console.error(err);
      if (hostWindow) hostWindow.close();
      alert(err.message || "Gagal memulai sesi game.");
    } finally {
      setStartingRound(null);
    }
  };

  // Add new staff member
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffEmail.trim()) return;
    setMessage({ text: "", type: "" });
    setSaving(true);

    try {
      // 1. Look up profile
      const { data: prof, error: profErr } = await supabaseBrowser
        .from("profiles")
        .select("id, fullname")
        .eq("email", newStaffEmail.trim().toLowerCase())
        .single();

      if (profErr || !prof) {
        throw new Error("Email user tidak ditemukan. Pastikan staff Anda sudah terdaftar.");
      }

      // 2. Insert into staff table
      const selectedRoleObj = availableRoles.find(r => r.id === newStaffRole);
      const { error: insErr } = await supabaseBrowser
        .from("competition_staff")
        .insert({
          competition_id: compId,
          profile_id: prof.id,
          role_id: newStaffRole,
          role: selectedRoleObj?.name || "Staff"
        });

      if (insErr) {
        if (insErr.code === "23505") {
          throw new Error("User ini sudah terdaftar sebagai staff di kompetisi ini.");
        }
        throw insErr;
      }

      setMessage({ text: `Sukses menambahkan ${prof.fullname} sebagai staff!`, type: "success" });
      setNewStaffEmail("");
      loadData(false);
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err.message || "Gagal menambahkan staff", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Remove staff member
  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus staff ini?")) return;
    setMessage({ text: "", type: "" });
    try {
      const { error } = await supabaseBrowser
        .from("competition_staff")
        .delete()
        .eq("id", staffId);

      if (error) throw error;
      
      setMessage({ text: "Staff berhasil dihapus.", type: "success" });
      loadData(false);
    } catch (err: any) {
      console.error(err);
      setMessage({ text: "Gagal menghapus staff", type: "error" });
    }
  };

  const formatDetailDateRange = (startStr: string | null | undefined, endStr: string | null | undefined) => {
    if (!startStr || !endStr) return "—";
    
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const day = date.getDate();
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      const hour = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${day} ${month} ${year}, ${hour}.${min}`;
    };

    return `${formatDate(startStr)} — ${formatDate(endStr)}`;
  };

  const getPlayerInitials = (name: string) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  const formatTime = (seconds: number): string => {
    if (seconds === 0) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  const formatRelativeTime = (dateStr: string): string => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Header */}
        <div className="space-y-3">
          <Skeleton className="h-3 w-40 bg-muted/30" />
          <Skeleton className="h-8 w-72 bg-muted/30" />
          <div className="flex gap-3 mt-2">
            <Skeleton className="h-5 w-16 rounded-full bg-muted/30" />
            <Skeleton className="h-4 w-24 bg-muted/30" />
            <Skeleton className="h-4 w-32 bg-muted/30" />
          </div>
        </div>
        {/* Skeleton Card */}
        <div className="flex gap-6 border border-border/40 bg-card/30 p-5 rounded-xl">
          <Skeleton className="w-36 h-36 rounded-lg bg-muted/30 hidden md:block" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-24 bg-muted/30" />
            <Skeleton className="h-4 w-full bg-muted/30" />
            <Skeleton className="h-4 w-3/4 bg-muted/30" />
          </div>
        </div>
        {/* Skeleton Tabs */}
        <div className="flex gap-4 border-b border-border/40">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-24 bg-muted/30 rounded-none" />
          ))}
        </div>
        {/* Skeleton Table */}
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl bg-muted/20" />
          ))}
        </div>
      </div>
    );
  }

  if (!competition) return null;

  const filteredParticipants = participants.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categoriesPresent = Array.from(new Set(groups.map((g) => g.category).filter(Boolean)));
  const filteredGroups = groups.filter(
    (g) => groupFilterCategory === "all" || g.category === groupFilterCategory
  );

  const isManager = userRole === "manager";
  const isMC = userRole === "mc";
  const isReceptionist = userRole === "receptionist";

  const paidCount = participants.filter((p) => p.isPaid).length;
  const totalCount = participants.length;
  const paidPercentage = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="space-y-1">
        <nav className="flex items-center gap-1.5 text-xs text-slate-400">
          <Link href="/competition" className="hover:text-white transition">
            Competitions
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-650" />
          <span className="text-white font-medium">Competition Detail</span>
        </nav>
      </div>

      {/* Header section with title & controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">{competition.title}</h1>
          </div>

          
          {/* Stats Bar */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-400 mt-2">
            <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-3xs font-bold uppercase border-0 ${
              competition.status === "published"
                ? "bg-emerald-500/10 text-emerald-400"
                : competition.status === "completed" || competition.status === "finished"
                ? "bg-zinc-500/10 text-zinc-400"
                : "bg-rose-500/10 text-rose-400"
            }`}>
              {competition.status === "published"
                ? "Published"
                : competition.status === "completed" || competition.status === "finished"
                ? "Completed"
                : "Draft"}
            </Badge>

            <span className="text-slate-700">•</span>
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Users className="h-3.5 w-3.5 text-slate-500" />
              <span>{totalCount} Registered</span>
            </div>

            <span className="text-slate-700">•</span>
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <CheckCircle className="h-3.5 w-3.5 text-slate-500" />
              <span>{paidCount} Paid</span>
              {totalCount > 0 && (
                <div className="flex items-center gap-2 ml-1">
                  <div className="w-16 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-border/40">
                    <div className="bg-emerald-505 h-full rounded-full bg-emerald-500" style={{ width: `${paidPercentage}%` }} />
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold">{paidPercentage}%</span>
                </div>
              )}
            </div>

            <span className="text-slate-700">•</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span>{formatDetailDateRange(competition.registration_start_date, competition.registration_end_date)}</span>
            </div>

            {competition.prize_pool && (
              <>
                <span className="text-slate-700">•</span>
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Trophy className="h-3.5 w-3.5 text-primary" />
                  <span>{competition.prize_pool}</span>
                </div>
              </>
            )}

            {competition.registration_fee && (
              <>
                <span className="text-slate-700">•</span>
                <div className="flex items-center gap-1.5 text-slate-305">
                  <span className="text-slate-500 font-semibold">Fee:</span>
                  <span className="font-semibold text-slate-300">{competition.registration_fee}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(isManager || isReceptionist) && (
            <Button
              onClick={() => setQrDialogOpen(true)}
              className="bg-gradient-to-r from-primary/90 to-emerald-600 text-primary-foreground font-bold hover:from-primary hover:to-emerald-500 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all duration-200 cursor-pointer h-9 text-xs rounded-md gap-1.5 px-3 border border-primary/25"
            >
              <QrCode className="h-4 w-4" />
              <span>Scan QR</span>
            </Button>
          )}

          <Button
            onClick={() => loadData(false)}
            disabled={refreshing}
            variant="outline"
            className="border-border text-slate-400 hover:text-white cursor-pointer h-9 w-9 p-0 rounded-md bg-slate-900/40"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
          </Button>

          {isManager && (
            <Button
              render={<Link href={`/competition/${competition.id}/edit`} />}
              className="bg-primary text-primary-foreground font-bold hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all duration-200 cursor-pointer h-9 text-xs rounded-md gap-1.5 px-3 flex items-center"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {message.text && (
        <div className={`rounded-lg border p-4 text-sm flex items-start gap-3 ${
          message.type === "success" 
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" 
            : "border-red-500/30 bg-red-500/10 text-red-400"
        }`}>
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{message.text}</span>
        </div>
      )}

      {/* Inline Poster, Description, and Rules Section */}
      <div className="flex flex-col md:flex-row gap-6 bg-card/40 border border-border/60 p-5 rounded-xl">
        {/* Poster Thumbnail Box */}
        <div className="w-full md:w-36 h-48 md:h-36 rounded-lg overflow-hidden border border-border/40 bg-muted/30 flex items-center justify-center shrink-0">
          {competition.poster_url ? (
            <img src={competition.poster_url} alt="Poster" className="w-full h-full object-cover" />
          ) : (
            <Image className="h-10 w-10 text-slate-700" />
          )}
        </div>
        
        {/* Description & Rules Content */}
        <div className="space-y-4 flex-1">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450">Description</h3>
            <p className="text-sm text-slate-350 mt-1 leading-relaxed">
              {competition.description || "No description provided."}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450">Rules</h3>
            {competition.rules && competition.rules.length > 0 ? (
              <div className="mt-1 space-y-1 text-sm text-slate-350 pl-4 list-outside prose-invert leading-relaxed">
                {competition.rules.map((rule, idx) => (
                  <div key={idx} className="[&_p]:inline" dangerouslySetInnerHTML={{ __html: rule }} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 mt-1">No rules specified.</p>
            )}
          </div>
        </div>
      </div>

      {/* Staff Management Block (Manager only) */}
      {isManager && (
        <Card className="border-border/60 bg-card/40 p-5 rounded-xl">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-450">Kelola Staff Kompetisi</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <form onSubmit={handleAddStaff} className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                required
                placeholder="Masukkan email staff terdaftar..."
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
                className="flex-1 h-9 text-xs"
              />
              <select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value)}
                className="rounded-lg border border-input bg-transparent px-3 py-1.5 text-xs text-white outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 h-9 dark:bg-input/30 [&_option]:bg-[#080808]"
              >
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
                {availableRoles.length === 0 && (
                  <>
                    <option value="mc">MC (Match Controller)</option>
                    <option value="receptionist">Receptionist (Registrasi)</option>
                    <option value="co-manager">Co-Manager (Asisten)</option>
                  </>
                )}
              </select>
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary text-primary-foreground font-bold hover:brightness-110 cursor-pointer h-9 px-4 shrink-0 gap-1.5 text-xs rounded-md"
              >
                <UserPlus className="h-4 w-4" />
                Tambah Staff
              </Button>
            </form>

            <Table className="border border-border rounded-lg overflow-hidden bg-[#050811]/25">
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/30 hover:bg-transparent">
                  <TableHead className="px-4 py-2 text-slate-450 text-[11px] font-bold">Nama Staff</TableHead>
                  <TableHead className="px-4 py-2 text-slate-455 text-[11px] font-bold">Email</TableHead>
                  <TableHead className="px-4 py-2 text-slate-455 text-[11px] font-bold">Peran (Role)</TableHead>
                  <TableHead className="px-4 py-2 text-center w-16 text-slate-455 text-[11px] font-bold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="px-4 py-6 text-center text-slate-500 italic">
                      Belum ada staff lokal ditambahkan.
                    </TableCell>
                  </TableRow>
                ) : (
                  staffList.map((s) => (
                    <TableRow key={s.id} className="border-b border-border/40 hover:bg-card/30">
                      <TableCell className="px-4 py-2.5 font-semibold text-white text-xs">{s.name}</TableCell>
                      <TableCell className="px-4 py-2.5 text-slate-400 font-mono text-[11px]">{s.email}</TableCell>
                      <TableCell className="px-4 py-2.5 text-slate-300 capitalize text-xs">
                        {s.role === "co-manager" ? "Co-Manager" : s.role}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleDeleteStaff(s.id)}
                          size="icon-sm"
                          className="text-red-500 hover:bg-red-500/10 hover:text-red-400 cursor-pointer size-8"
                          title="Hapus Staff"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tabs Menu with Shadcn UI Components */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full space-y-4">
        <TabsList variant="line" className="border-b border-border/60 w-full justify-start gap-4 p-0 h-11 rounded-none bg-transparent overflow-x-auto scrollbar-none whitespace-nowrap">
          {(isManager || isReceptionist) && (
            <TabsTrigger value="registration" className="h-full px-5 pb-3 pt-2 rounded-none data-active:border-primary data-active:after:bg-primary border-b-2 border-transparent text-sm font-semibold">
              Registration
            </TabsTrigger>
          )}
          {(isManager || isReceptionist) && (
            <TabsTrigger value="payment" className="h-full px-5 pb-3 pt-2 rounded-none data-active:border-primary data-active:after:bg-primary border-b-2 border-transparent text-sm font-semibold">
              Payment
            </TabsTrigger>
          )}
          {(isManager || isMC) && (
            <TabsTrigger value="qualification" className="h-full px-5 pb-3 pt-2 rounded-none data-active:border-primary data-active:after:bg-primary border-b-2 border-transparent text-sm font-semibold">
              Qualification
            </TabsTrigger>
          )}
          {(isManager || isMC) && (
            <TabsTrigger value="standings" className="h-full px-5 pb-3 pt-2 rounded-none data-active:border-primary data-active:after:bg-primary border-b-2 border-transparent text-sm font-semibold">
              Standings
            </TabsTrigger>
          )}
          {(isManager || isMC) && (
            <TabsTrigger value="groupstage" className="h-full px-5 pb-3 pt-2 rounded-none data-active:border-primary data-active:after:bg-primary border-b-2 border-transparent text-sm font-semibold">
              Group Stage
            </TabsTrigger>
          )}
          <TabsTrigger value="completed" className="h-full px-5 pb-3 pt-2 rounded-none data-active:border-primary data-active:after:bg-primary border-b-2 border-transparent text-sm font-semibold">
            Champion
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Registration List */}
        <TabsContent value="registration" className="space-y-4 outline-none">
          {(isManager || isReceptionist) && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Registration</h2>
                  <span className="text-xs text-slate-500 font-semibold">({filteredParticipants.length})</span>
                </div>
                
                <div className="relative">
                  <Input
                    placeholder="Search player..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-56 pr-10 h-8 text-xs bg-slate-900/40 border-border text-white placeholder-slate-500"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded bg-primary text-primary-foreground">
                    <Search className="h-3 w-3" />
                  </div>
                </div>
              </div>

              <Table className="border border-border bg-card/30 rounded-xl overflow-hidden shadow-md">
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/30 hover:bg-transparent">
                    <TableHead className="w-16 px-5 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider text-center">#</TableHead>
                    <TableHead className="px-5 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">Player</TableHead>
                    <TableHead className="px-5 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">Category</TableHead>
                    <TableHead className="px-5 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">School</TableHead>
                    <TableHead className="px-5 py-3 text-center text-slate-400 font-bold text-xs uppercase tracking-wider w-28">Play</TableHead>
                    <TableHead className="px-5 py-3 text-center text-slate-400 font-bold text-xs uppercase tracking-wider w-28">Avg Score</TableHead>
                    <TableHead className="px-5 py-3 text-right text-slate-400 font-bold text-xs uppercase tracking-wider w-36">Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParticipants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="px-5 py-10 text-center text-slate-500 italic">
                        No players match the search criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredParticipants.map((p, idx) => {
                      const rank = idx + 1;
                      return (
                        <TableRow key={p.id} className="border-b border-border/40 hover:bg-primary/3 transition-colors duration-150">
                          <TableCell className="px-5 py-3.5 text-center">
                            {rank <= 3 ? (
                              <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-2xs font-extrabold ${
                                rank === 1 ? "bg-yellow-500/20 text-yellow-400" :
                                rank === 2 ? "bg-slate-300/20 text-slate-350" :
                                "bg-amber-700/20 text-amber-500"
                              }`}>
                                {rank}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs font-semibold">{rank}</span>
                            )}
                          </TableCell>
                          <TableCell className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              {p.avatar ? (
                                <img src={p.avatar} alt={p.name} className="h-8 w-8 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-200 font-bold text-xs uppercase">
                                  {getPlayerInitials(p.name)}
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="font-bold text-white text-xs">{p.name}</span>
                                <span className="text-slate-500 font-mono text-[10px]">@{p.username}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-3.5">
                            {p.category ? (
                              <Badge variant="outline" className="bg-primary/15 text-primary border-primary/25 rounded-md px-2 py-0.5 text-3xs font-semibold">
                                {p.category}
                              </Badge>
                            ) : (
                              <span className="text-slate-500 text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="px-5 py-3.5 text-slate-300 text-xs">{p.schoolName || "—"}</TableCell>
                          <TableCell className="px-5 py-3.5 text-center">
                            <button
                              onClick={() => setSelectedPlayerForSessions(p)}
                              className="inline-flex items-center justify-center gap-1.5 hover:bg-slate-800/40 px-2.5 py-1 rounded-md cursor-pointer transition-colors text-xs text-primary font-medium hover:underline"
                              title="Game Sessions"
                            >
                              <Gamepad2 className="h-3.5 w-3.5 text-slate-500" />
                              <span>{p.gamesPlayed}</span>
                            </button>
                          </TableCell>
                          <TableCell className="px-5 py-3.5 text-center">
                            <button
                              onClick={() => setSelectedPlayerForSessions(p)}
                              className="inline-flex items-center justify-center gap-1.5 hover:bg-slate-800/40 px-2.5 py-1 rounded-md cursor-pointer transition-colors text-xs font-semibold hover:underline text-yellow-500"
                              title="Average Score"
                            >
                              <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                              <span className="text-slate-200">{p.avgScore.toFixed(1)}</span>
                            </button>
                          </TableCell>
                          <TableCell className="px-5 py-3.5 text-right text-slate-400 text-xs">
                            {formatRelativeTime(p.registeredAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </TabsContent>

        {/* Tab 2: Payment */}
        <TabsContent value="payment" className="space-y-4 outline-none">
          {(isManager || isReceptionist) && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Payment</h2>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-0 rounded-full font-bold px-2.5 py-0.5 text-3xs">
                    {participants.filter(p => p.isPaid).length}/{participants.length} Paid
                  </Badge>
                </div>
                
                <div className="relative">
                  <Input
                    placeholder="Search player..."
                    value={paymentSearchQuery}
                    onChange={(e) => setPaymentSearchQuery(e.target.value)}
                    className="w-full sm:w-56 pr-10 h-8 text-xs bg-slate-900/40 border-border text-white placeholder-slate-500"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded bg-primary text-primary-foreground">
                    <Search className="h-3 w-3" />
                  </div>
                </div>
              </div>

              <Table className="border border-border bg-card/30 rounded-xl overflow-hidden shadow-md">
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/30 hover:bg-transparent">
                    <TableHead className="w-16 px-5 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider text-center">#</TableHead>
                    <TableHead className="px-5 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">Player</TableHead>
                    <TableHead className="px-5 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">Category</TableHead>
                    <TableHead className="px-5 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">School</TableHead>
                    <TableHead className="px-5 py-3 text-center text-slate-400 font-bold text-xs uppercase tracking-wider w-28">Play</TableHead>
                    <TableHead className="px-5 py-3 text-center text-slate-400 font-bold text-xs uppercase tracking-wider w-28">Avg Score</TableHead>
                    <TableHead className="px-5 py-3 text-center text-slate-400 font-bold text-xs uppercase tracking-wider w-36">Payment Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const filteredPaymentParticipants = participants.filter((p) =>
                      p.name.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
                      p.username.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
                      p.schoolName.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
                      (p.category && p.category.toLowerCase().includes(paymentSearchQuery.toLowerCase()))
                    );

                    if (filteredPaymentParticipants.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={7} className="px-5 py-10 text-center text-slate-500 italic">
                            No registrant data available.
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return filteredPaymentParticipants.map((p, idx) => (
                      <TableRow key={p.id} className="border-b border-border/40 hover:bg-primary/3 transition-colors duration-150">
                        <TableCell className="px-5 py-3.5 text-center text-slate-500 text-xs font-semibold">{idx + 1}</TableCell>
                        <TableCell className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {p.avatar ? (
                              <img src={p.avatar} alt={p.name} className="h-8 w-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-200 font-bold text-xs uppercase">
                                {getPlayerInitials(p.name)}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="font-bold text-white text-xs">{p.name}</span>
                              <span className="text-slate-505 text-slate-500 font-mono text-[10px]">@{p.username}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          {p.category ? (
                            <Badge variant="outline" className="bg-primary/15 text-primary border-primary/25 rounded-md px-2 py-0.5 text-3xs font-semibold">
                              {p.category}
                            </Badge>
                          ) : (
                            <span className="text-slate-500 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-slate-300 text-xs">{p.schoolName || "—"}</TableCell>
                        <TableCell className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => setSelectedPlayerForSessions(p)}
                            className="inline-flex items-center justify-center gap-1.5 hover:bg-slate-800/40 px-2.5 py-1 rounded-md cursor-pointer transition-colors text-xs text-primary font-medium hover:underline"
                            title="Game Sessions"
                          >
                            <Gamepad2 className="h-3.5 w-3.5 text-slate-505" />
                            <span>{p.gamesPlayed}</span>
                          </button>
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => setSelectedPlayerForSessions(p)}
                            className="inline-flex items-center justify-center gap-1.5 hover:bg-slate-800/40 px-2.5 py-1 rounded-md cursor-pointer transition-colors text-xs font-semibold hover:underline text-yellow-500"
                            title="Average Score"
                          >
                            <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                            <span className="text-slate-250 text-slate-200">{p.avgScore.toFixed(1)}</span>
                          </button>
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-center">
                          <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 font-bold text-3xs uppercase border-0 ${
                            p.isPaid 
                              ? "bg-emerald-500/10 text-emerald-400" 
                              : "bg-rose-500/10 text-rose-400"
                          }`}>
                            {p.isPaid ? "Paid" : "Unpaid"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </>
          )}
        </TabsContent>

        {/* Tab 3: Qualification (Placeholder) */}
        <TabsContent value="qualification" className="space-y-4 outline-none">
          <div className="rounded-xl border border-border bg-card/30 p-12 text-center text-slate-500 italic text-sm">
            Qualification stage matches and live scores are visualized under the Group Stage tab.
          </div>
        </TabsContent>

        {/* Tab 4: Standings */}
        <TabsContent value="standings" className="space-y-6 outline-none">
          {(isManager || isMC) && (
            <>
              {/* Header Stats & Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Standings</h2>
                  <Badge variant="outline" className="text-2xs bg-slate-900 border-border text-slate-400">
                    {participants.filter(p => p.isFinalist).length} Finalist
                  </Badge>
                  <Badge variant="outline" className="text-2xs bg-primary/10 border-primary/20 text-primary">
                    {Array.from(new Set(groups.flatMap(g => g.members.map(m => m.playerId)))).length} Assigned
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    placeholder="Search groups..."
                    value={standingsSearchQuery}
                    onChange={(e) => setStandingsSearchQuery(e.target.value)}
                    className="w-40 h-8 text-xs bg-slate-900/40 border-border text-white"
                  />

                  <select
                    value={standingsStageFilter}
                    onChange={(e) => setStandingsStageFilter(e.target.value)}
                    className="h-8 rounded border border-border bg-slate-950 text-xs px-2 py-0.5 text-white"
                  >
                    <option value="all">All Stages</option>
                    <option value="Semifinal">Semifinal</option>
                    <option value="Final">Final</option>
                    <option value="Champion">Champion</option>
                  </select>

                  <select
                    value={standingsCategoryFilter}
                    onChange={(e) => setStandingsCategoryFilter(e.target.value)}
                    className="h-8 rounded border border-border bg-slate-950 text-xs px-2 py-0.5 text-white"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <Button
                    onClick={() => loadData(false)}
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-slate-900 border-border text-slate-400 hover:text-white"
                    title="Refresh Data"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    onClick={() => setActiveTab("groupstage")}
                    variant="outline"
                    className="h-8 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5"
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    Bagan & Seeding
                  </Button>

                  {isManager && (
                    <>
                      <Button
                        onClick={() => {
                          setNewGroupName("");
                          setNewGroupStage("Semifinal");
                          setNewGroupCategory(categories[0] || "");
                          setNewGroupSources([]);
                          setIsAddGroupOpen(true);
                        }}
                        variant="outline"
                        className="h-8 text-xs gap-1 border-border text-slate-300"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Group
                      </Button>

                      <div className="flex items-center gap-2">
                        {isGroupsDirty && (
                          <span className="text-2xs text-amber-400 animate-pulse font-semibold">
                            ● Unsaved changes
                          </span>
                        )}
                        <Button
                          onClick={handleSaveGroupsToDb}
                          disabled={isSavingGroups}
                          className="h-8 text-xs gap-1 bg-emerald-650 hover:bg-emerald-700 text-white font-bold px-3 py-1.5"
                        >
                          {isSavingGroups ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          Save
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Pills filter category */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 border-b border-border/10 pb-3">
                  <button
                    onClick={() => setStandingsCategoryFilter("all")}
                    className={`px-3 py-1 text-2xs font-bold rounded-full transition-colors cursor-pointer border ${
                      standingsCategoryFilter === "all"
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-slate-900/60 border-border text-slate-400 hover:text-white"
                    }`}
                  >
                    All
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setStandingsCategoryFilter(cat)}
                      className={`px-3 py-1 text-2xs font-bold rounded-full transition-colors cursor-pointer border ${
                        standingsCategoryFilter === cat
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-slate-900/60 border-border text-slate-400 hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Group Cards Grid */}
              {(() => {
                const displayedGroups = groups.filter((g) => {
                  if (standingsStageFilter !== "all" && g.stage !== standingsStageFilter) return false;
                  if (standingsCategoryFilter !== "all" && g.category !== standingsCategoryFilter) return false;
                  if (standingsSearchQuery.trim() !== "" && !g.name.toLowerCase().includes(standingsSearchQuery.toLowerCase())) return false;
                  return true;
                });

                if (displayedGroups.length === 0) {
                  return (
                    <div className="rounded-xl border border-border bg-card/30 p-12 text-center text-slate-500 italic text-xs">
                      No groups found. Click "Add Group" to create one.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 gap-3">
                    {displayedGroups.map((g) => {
                      const advancedCount = g.members.filter(m => m.isAdvanced).length;
                      const isSelected = selectedGroupForStandings?.id === g.id;

                      return (
                        <div
                          key={g.id}
                          onClick={() => setSelectedGroupForStandings(g)}
                          className={`rounded-xl border p-4 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary/5 border-primary/40 shadow-md animate-pulse"
                              : "bg-card/30 border-border/60 hover:bg-card/50"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <h3 className="font-bold text-white text-xs">{g.name}</h3>
                              {g.stage && (
                                <Badge variant="outline" className="bg-slate-900 border-border text-slate-400 text-3xs font-semibold px-2 py-0.5">
                                  {g.stage}
                                </Badge>
                              )}
                              {g.category && (
                                <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-3xs font-semibold px-2 py-0.5">
                                  {g.category}
                                </Badge>
                              )}
                              <Badge variant="outline" className="bg-slate-900 border-border text-slate-400 text-3xs gap-1 px-2 py-0.5">
                                <Users className="h-2.5 w-2.5" /> {g.members.length}
                              </Badge>
                              {advancedCount > 0 && (
                                <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-3xs px-2 py-0.5">
                                  {advancedCount} Advanced
                                </Badge>
                              )}
                            </div>

                            {isManager && (
                              <div className="flex items-center gap-2 sm:ml-auto" onClick={(e) => e.stopPropagation()}>
                                {g.stage !== "Champion" && (
                                  <Button
                                    onClick={() => {
                                      const rounds = g.rounds.length > 0
                                        ? g.rounds.map(r => ({ quizId: r.quiz_id || "", gameId: r.game_id || "", settings: r.settings }))
                                        : [{ quizId: "", gameId: "", settings: { durationMinutes: 10, questionCount: 10, sound: true, difficulty: "Easy" } }];
                                      setRoundsDialog({ group: g, rounds });
                                    }}
                                    variant="outline"
                                    className="h-7 text-3xs gap-1 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                                  >
                                    <BookOpen className="h-2.5 w-2.5" /> Assign Quiz
                                  </Button>
                                )}

                                <Button
                                  onClick={() => {
                                    setAssignDialog(g);
                                    setAssignSelected(g.members.map(m => m.playerId));
                                  }}
                                  variant="outline"
                                  className="h-7 text-3xs gap-1 border-border text-slate-355"
                                >
                                  <UserPlus className="h-2.5 w-2.5" /> Assign Finalist
                                </Button>

                                <Button
                                  onClick={() => {
                                    setEditGroup(g);
                                    setEditGroupName(g.name);
                                    setEditGroupStage(g.stage || "Semifinal");
                                    setEditGroupCategory(g.category || "");
                                    setEditGroupSources(g.sources || []);
                                  }}
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 border-border text-slate-400 hover:text-white"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>

                                <Button
                                  onClick={() => {
                                    if (confirm(`Apakah Anda yakin ingin menghapus grup "${g.name}" secara lokal?`)) {
                                      handleDeleteGroup(g.id);
                                    }
                                  }}
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 border-border text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Group Standings Table visualization below */}
              {selectedGroupForStandings && (
                <div className="border border-border/40 bg-card/30 rounded-xl p-4 space-y-4 mt-6">
                  <div className="flex items-center justify-between border-b border-border/20 pb-3">
                    <div className="flex items-center gap-2">
                      <Medal className="h-4 w-4 text-sky-400" />
                      <h3 className="font-bold text-white text-xs">{selectedGroupForStandings.name} Standings</h3>
                      <Badge variant="outline" className="bg-slate-900 border-border text-slate-400 text-3xs">
                        {selectedGroupForStandings.stage}
                      </Badge>
                      {selectedGroupForStandings.category && (
                        <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-3xs">
                          {selectedGroupForStandings.category}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {selectedGroupForStandings.members.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 italic text-xs">
                      No members assigned to this group yet. Click "Assign Finalist" on the card above.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border bg-muted/30 hover:bg-transparent">
                          <TableHead className="w-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">#</TableHead>
                          <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wider">Player</TableHead>
                          <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wider">Category</TableHead>
                          <TableHead className="w-24 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">Score</TableHead>
                          <TableHead className="w-28 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">Time</TableHead>
                          <TableHead className="w-24 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">Advanced</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...selectedGroupForStandings.members]
                          .sort((a, b) => {
                            if (b.score !== a.score) return b.score - a.score;
                            return a.timeSeconds - b.timeSeconds;
                          })
                          .map((m, idx) => {
                            const player = participants.find(p => p.id === m.playerId);
                            return (
                              <TableRow key={m.playerId} className="border-b border-border/40 hover:bg-primary/3">
                                <td className="py-3 text-center text-xs font-semibold text-slate-500">{idx + 1}</td>
                                <td className="py-3">
                                  <div className="flex items-center gap-3">
                                    {player?.avatar ? (
                                      <img src={player.avatar} alt={m.playerName} className="h-8 w-8 rounded-full object-cover shrink-0" />
                                    ) : (
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-200 font-bold text-xs uppercase">
                                        {getPlayerInitials(m.playerName)}
                                      </div>
                                    )}
                                    <div className="flex flex-col">
                                      <span className="font-bold text-white text-xs">{m.playerName}</span>
                                      <span className="text-slate-500 font-mono text-[10px]">@{player?.username || m.playerName.toLowerCase().replace(/\s+/g, '')}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3">
                                  {player?.category ? (
                                    <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-3xs">
                                      {player.category}
                                    </Badge>
                                  ) : (
                                    <span className="text-slate-500 text-xs">—</span>
                                  )}
                                </td>
                                <td className="py-3 text-center font-bold text-white text-xs">{m.score} pt</td>
                                <td className="py-3 text-center text-slate-300 text-xs">{formatTime(m.timeSeconds)}</td>
                                <td className="py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={m.isAdvanced}
                                    onChange={() => toggleAdvance(selectedGroupForStandings.id, m.playerId)}
                                    disabled={!isManager}
                                    className={`h-4 w-4 rounded border-border bg-slate-900 text-primary focus:ring-primary ${isManager ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                                  />
                                </td>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Tab 5: Group Stage */}
        <TabsContent value="groupstage" className="space-y-6 outline-none">
          {(isManager || isMC) && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 border-b border-border/45 pb-3">
                
                {/* Category Filter */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={groupFilterCategory}
                    onChange={(e) => setGroupFilterCategory(e.target.value)}
                    className="h-7 rounded border border-border bg-slate-950 text-2xs font-bold px-2.5 py-0.5 text-white outline-none focus:ring-1 focus:ring-primary cursor-pointer w-28 text-center"
                  >
                    <option value="all">Semua</option>
                    {categoriesPresent.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredGroups.length === 0 ? (
                <div className="rounded-xl border border-border bg-card/30 p-12 text-center text-slate-500 italic">
                  Grup babak kualifikasi belum terbentuk. Masukkan kategori pada data edit kompetisi daerah Anda.
                </div>
              ) : (() => {
                const semifinals = filteredGroups.filter(g => g.stage === "Semifinal" || !g.stage || g.stage === "Group Stage").sort((a, b) => a.category.localeCompare(b.category));
                const finals = filteredGroups.filter(g => g.stage === "Final").sort((a, b) => a.category.localeCompare(b.category));
                const champions = filteredGroups.filter(g => g.stage === "Champion").sort((a, b) => a.category.localeCompare(b.category));

                const NODE_HEIGHT = 110;
                const Y_GAP = 50;
                const COLUMN_WIDTH = 260;
                const X_GAP = 120;
                const PADDING_X = 40;
                const START_Y = 80;

                const numSemis = semifinals.length;
                const totalHeight = Math.max(numSemis * NODE_HEIGHT + Math.max(numSemis - 1, 0) * Y_GAP + START_Y + 60, 450);
                const totalWidth = PADDING_X * 2 + COLUMN_WIDTH * 3 + X_GAP * 2;

                const nodeCenters: Record<string, { x: number, y: number, cx: number, cy: number }> = {};
                const renderNodes: any[] = [];

                // Position Nodes...
                semifinals.forEach((g, idx) => {
                  const x = PADDING_X;
                  const y = START_Y + idx * (NODE_HEIGHT + Y_GAP);
                  const node = { group: g, col: 0, x, y, cx: x + COLUMN_WIDTH / 2, cy: y + NODE_HEIGHT / 2 };
                  renderNodes.push(node);
                  nodeCenters[g.id] = node;
                });

                finals.forEach((g, idx) => {
                  const x = PADDING_X + COLUMN_WIDTH + X_GAP;
                  let y = START_Y + idx * (NODE_HEIGHT + Y_GAP);
                  if (g.sources && g.sources.length > 0) {
                    const sourceYs = g.sources.map(sid => nodeCenters[sid]?.cy).filter(Boolean);
                    if (sourceYs.length > 0) {
                      const avgCy = sourceYs.reduce((a, b) => a + b, 0) / sourceYs.length;
                      y = avgCy - NODE_HEIGHT / 2;
                    }
                  }
                  const node = { group: g, col: 1, x, y, cx: x + COLUMN_WIDTH / 2, cy: y + NODE_HEIGHT / 2 };
                  renderNodes.push(node);
                  nodeCenters[g.id] = node;
                });

                champions.forEach((g, idx) => {
                  const x = PADDING_X + 2 * (COLUMN_WIDTH + X_GAP);
                  let y = START_Y + idx * (NODE_HEIGHT + Y_GAP);
                  if (g.sources && g.sources.length > 0) {
                    const sourceYs = g.sources.map(sid => nodeCenters[sid]?.cy).filter(Boolean);
                    if (sourceYs.length > 0) {
                      const avgCy = sourceYs.reduce((a, b) => a + b, 0) / sourceYs.length;
                      y = avgCy - NODE_HEIGHT / 2;
                    }
                  }
                  const node = { group: g, col: 2, x, y, cx: x + COLUMN_WIDTH / 2, cy: y + NODE_HEIGHT / 2 };
                  renderNodes.push(node);
                  nodeCenters[g.id] = node;
                });

                const enforceGap = (colIdx: number) => {
                  const colNodes = renderNodes.filter(n => n.col === colIdx).sort((a, b) => a.y - b.y);
                  for (let i = 1; i < colNodes.length; i++) {
                    const prev = colNodes[i - 1];
                    const curr = colNodes[i];
                    const minY = prev.y + NODE_HEIGHT + 20;
                    if (curr.y < minY) {
                      curr.y = minY;
                      curr.cy = curr.y + NODE_HEIGHT / 2;
                    }
                  }
                };
                enforceGap(0);
                enforceGap(1);
                enforceGap(2);

                return (
                  <div className="overflow-x-auto pb-4 rounded-xl border border-border bg-card/30 w-full scrollbar-none">
                    <div className="relative mx-auto" style={{ width: totalWidth, minHeight: totalHeight }}>
                      {/* Columns Headers */}
                      {[
                        { title: "Semifinal", x: PADDING_X },
                        { title: "Final", x: PADDING_X + COLUMN_WIDTH + X_GAP },
                        { title: "Champion", x: PADDING_X + 2 * (COLUMN_WIDTH + X_GAP) }
                      ].map((col, cIdx) => (
                        <div
                          key={cIdx}
                          className="absolute top-0 bottom-0 border-r last:border-r-0 border-dashed border-border/40"
                          style={{ left: col.x, width: COLUMN_WIDTH }}
                        >
                          <div className="absolute top-0 flex items-center justify-center bg-muted/40 border-b border-border/60 text-2xs font-bold uppercase tracking-widest text-slate-400 shadow-xs" style={{ width: COLUMN_WIDTH, height: 40, borderBottomRightRadius: 8, borderBottomLeftRadius: 8 }}>
                            {col.title}
                          </div>
                        </div>
                      ))}

                      {/* SVG Connecting lines */}
                      <svg className="absolute inset-0 pointer-events-none" width={totalWidth} height={totalHeight}>
                        {renderNodes.map(node => {
                          if (!node.group.sources || node.group.sources.length === 0) return null;
                          const validSources = node.group.sources.map((sid: string) => nodeCenters[sid]).filter(Boolean);
                          if (validSources.length === 0) return null;

                          const endX = node.x;
                          const endY = node.cy;
                          const startXBase = validSources[0].x + COLUMN_WIDTH;
                          const midX = startXBase + (endX - startXBase) / 2;

                          if (validSources.length === 1) {
                            const sx = validSources[0].x + COLUMN_WIDTH;
                            const sy = validSources[0].cy;
                            return (
                              <path
                                key={`line-${node.group.id}`}
                                d={`M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${endY} L ${endX} ${endY}`}
                                stroke="#1b253b"
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            );
                          } else {
                            const sourceYs = validSources.map((s: any) => s.cy);
                            const topY = Math.min(...sourceYs);
                            const bottomY = Math.max(...sourceYs);
                            
                            const paths: string[] = [];
                            validSources.forEach((s: any) => {
                              paths.push(`M ${s.x + COLUMN_WIDTH} ${s.cy} L ${midX} ${s.cy}`);
                            });
                            paths.push(`M ${midX} ${topY} L ${midX} ${bottomY}`);
                            paths.push(`M ${midX} ${endY} L ${endX} ${endY}`);

                            return (
                              <path
                                key={`line-${node.group.id}`}
                                d={paths.join(" ")}
                                stroke="#1b253b"
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            );
                          }
                        })}
                      </svg>

                      {/* Nodes Cards */}
                      {renderNodes.map(node => {
                        const g = node.group;
                        const advancedCount = g.members.filter((m: any) => m.isAdvanced).length;
                        const sortedMembers = [...g.members].sort((a, b) => {
                          if (b.score === a.score) return a.timeSeconds - b.timeSeconds;
                          return b.score - a.score;
                        });

                        return (
                          <div
                            key={g.id}
                            onClick={() => setSelectedGroupModal(g)}
                            className="absolute border border-primary/20 hover:border-primary/60 rounded-xl p-3 transition bg-[#0c1224]/75 hover:bg-[#0c1224] shadow-lg flex flex-col justify-between cursor-pointer"
                            style={{
                              left: node.x,
                              top: node.y,
                              width: COLUMN_WIDTH,
                              height: NODE_HEIGHT,
                              zIndex: 10
                            }}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-xs truncate text-white" title={g.name}>{g.name}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="inline-flex items-center gap-0.5 rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-slate-400">
                                  <Users className="h-2.5 w-2.5" />
                                  {g.members.length}
                                </span>
                                {advancedCount > 0 && (
                                  <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">
                                    <ChevronRight className="h-2.5 w-2.5 -rotate-45" />
                                    {advancedCount}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Mini list of top 3 */}
                            <div className="space-y-0.5 text-[10px] text-slate-400">
                              {sortedMembers.slice(0, 3).map((m, mIdx) => (
                                <div key={m.playerId} className={`flex items-center justify-between ${m.isAdvanced ? "text-emerald-400 font-semibold" : ""}`}>
                                  <span className="truncate max-w-[120px]">{mIdx + 1}. {m.playerName}</span>
                                  <div className="flex items-center gap-2 shrink-0 font-mono text-[9px]">
                                    <span>{m.score} pt</span>
                                    <span>{formatTime(m.timeSeconds)}</span>
                                  </div>
                                </div>
                              ))}

                              {g.members.length === 0 && (
                                <span className="text-[10px] text-slate-600 italic block mt-1">Belum ada peserta.</span>
                              )}

                              {g.members.length > 3 && (
                                <span className="text-[9px] text-slate-500 block text-right">+{g.members.length - 3} lainnya</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </TabsContent>

        {/* Tab 4: Completed winners list */}
        <TabsContent value="completed" className="space-y-6 outline-none">
          {competition.status !== "completed" ? (
            <div className="rounded-xl border border-border bg-card/30 p-12 text-center text-slate-500 italic">
              Kompetisi belum diselesaikan. Hubungi Manager Anda untuk memfinalisasi skor dan mengunci daftar pemenang.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-3">
              {/* Gold Winner */}
              <div className="flex flex-col items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center space-y-4">
                <Trophy className="h-10 w-10 text-amber-500" />
                <div>
                  <h4 className="text-2xs font-bold text-slate-500 uppercase tracking-widest">Juara 1</h4>
                  <span className="mt-2 block text-lg font-bold text-white">
                    {competition.winners?.["1st"]?.name || "—"}
                  </span>
                  <span className="text-xs text-amber-400 mt-1.5 block font-mono">Skor: {competition.winners?.["1st"]?.score || "—"}</span>
                </div>
              </div>

              {/* Silver Winner */}
              <div className="flex flex-col items-center justify-between rounded-xl border border-zinc-400/30 bg-zinc-400/5 p-6 text-center space-y-4">
                <Trophy className="h-10 w-10 text-zinc-400" />
                <div>
                  <h4 className="text-2xs font-bold text-slate-500 uppercase tracking-widest">Juara 2</h4>
                  <span className="mt-2 block text-lg font-bold text-white">
                    {competition.winners?.["2nd"]?.name || "—"}
                  </span>
                  <span className="text-xs text-zinc-400 mt-1.5 block font-mono">Skor: {competition.winners?.["2nd"]?.score || "—"}</span>
                </div>
              </div>

              {/* Bronze Winner */}
              <div className="flex flex-col items-center justify-between rounded-xl border border-amber-700/30 bg-amber-700/5 p-6 text-center space-y-4">
                <Trophy className="h-10 w-10 text-amber-700" />
                <div>
                  <h4 className="text-2xs font-bold text-slate-500 uppercase tracking-widest">Juara 3</h4>
                  <span className="mt-2 block text-lg font-bold text-white">
                    {competition.winners?.["3rd"]?.name || "—"}
                  </span>
                  <span className="text-xs text-amber-600 mt-1.5 block font-mono">Skor: {competition.winners?.["3rd"]?.score || "—"}</span>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* --- SHADCN DIALOGS --- */}

      {/* Group Detail & Score Management Dialog */}
      <Dialog open={!!selectedGroupModal} onOpenChange={(open) => { if (!open) setSelectedGroupModal(null); }}>
        {selectedGroupModal && (
          <DialogContent className="max-w-2xl bg-[#0c1224] border-border text-white p-6 flex flex-col max-h-[90vh]">
            <DialogHeader className="border-b border-border pb-3">
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                {selectedGroupModal.name}
              </DialogTitle>
              <CardDescription className="text-2xs text-slate-400 mt-1">
                Babak: <span className="text-white font-semibold">{selectedGroupModal.stage}</span> • Kategori: <span className="text-white font-semibold">{selectedGroupModal.category}</span>
              </CardDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4 my-2">
              {/* Assigned Rounds Section */}
              <div className="border border-border/60 bg-[#050811]/40 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-xs flex items-center gap-1.5 text-primary border-b border-border/40 pb-2">
                  <Trophy className="h-4 w-4" />
                  Assigned Rounds
                </h4>
                {selectedGroupModal.rounds && selectedGroupModal.rounds.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {selectedGroupModal.rounds.map((roundConfig: any, i: number) => {
                      const qId = roundConfig.quiz_id || "";
                      const gId = roundConfig.game_id || "";
                      const quiz = qId ? quizzes.find(q => q.id === qId) : null;
                      return (
                        <div key={i} className="flex flex-col border border-border/80 rounded-lg bg-[#050811]/60 overflow-hidden relative">
                          <div className="px-3 py-1.5 bg-slate-900/80 border-b border-border/40 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Round {roundConfig.round || i + 1}
                            </span>
                          </div>
                          
                          <div className="p-3 flex flex-col gap-2">
                            {qId ? (
                              <div className="flex items-start gap-2.5">
                                <div className="mt-0.5 w-6 h-6 rounded-md bg-blue-500/10 flex flex-col items-center justify-center shrink-0">
                                  <BookOpen className="h-3.5 w-3.5 text-blue-450" />
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-xs font-semibold leading-tight text-white truncate" title={quiz?.title || qId}>{quiz?.title || qId}</span>
                                  {quiz && <span className="text-[10px] text-slate-400 mt-0.5">{quiz.questionCount || 0} questions</span>}
                                </div>
                              </div>
                            ) : null}

                            {gId ? (
                              <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center shrink-0">
                                  <Gamepad2 className="h-3.5 w-3.5 text-violet-405" />
                                </div>
                                <span className="text-xs font-semibold leading-none truncate capitalize text-violet-400 flex-1">
                                  {gId}
                                </span>
                              </div>
                            ) : null}
                            
                            {!qId && !gId ? (
                              <div className="text-xs text-slate-500 italic text-center py-2">Empty round</div>
                            ) : (
                              <div className="pt-2">
                                <Button 
                                  size="sm" 
                                  className="w-full h-8 text-[11px] font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-none cursor-pointer"
                                  disabled={startingRound === `${selectedGroupModal.id}-${i}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartSession(selectedGroupModal, i);
                                  }}
                                >
                                  {startingRound === `${selectedGroupModal.id}-${i}` ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Play className="h-3 w-3 fill-current" />
                                  )}
                                  {startingRound === `${selectedGroupModal.id}-${i}` ? "Starting..." : "Start"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic text-center py-4 bg-slate-900/20 border border-dashed border-border rounded-lg">
                    No rounds assigned yet.
                  </div>
                )}

                {isManager && (
                  <div className="flex justify-end pt-1">
                    <button 
                      type="button"
                      className="text-xs font-semibold text-primary hover:underline transition cursor-pointer flex items-center gap-1 bg-transparent border-0 outline-none"
                      onClick={() => {
                        const group = selectedGroupModal;
                        setSelectedGroupModal(null);
                        setTimeout(() => {
                          const rounds = group.rounds.length > 0
                            ? group.rounds.map((r: any) => ({ quizId: r.quiz_id || "", gameId: r.game_id || "", settings: r.settings }))
                            : [{ quizId: "", gameId: "", settings: { durationMinutes: 10, questionCount: 10, sound: true, difficulty: "Easy" } }];
                          setRoundsDialog({ group, rounds });
                        }, 200);
                      }}
                    >
                      Manage Rounds & Quiz ↗
                    </button>
                  </div>
                )}
              </div>

              <Table className="border border-border rounded-lg overflow-hidden bg-[#050811]/30">
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/30 hover:bg-transparent">
                    <TableHead className="px-4 py-2 text-slate-400 font-bold">Nama Peserta</TableHead>
                    <TableHead className="px-4 py-2 text-center w-24 text-slate-400 font-bold">Skor</TableHead>
                    <TableHead className="px-4 py-2 text-center w-24 text-slate-400 font-bold">Waktu (detik)</TableHead>
                    <TableHead className="px-4 py-2 text-center w-20 text-slate-400 font-bold">Lolos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedGroupModal.members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="px-4 py-6 text-center text-slate-500 italic">
                        Belum ada peserta di grup ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedGroupModal.members.map((m) => (
                      <TableRow key={m.playerId} className="hover:bg-card/30 border-b border-border/40">
                        <TableCell className="px-4 py-3 font-semibold text-white text-xs">{m.playerName}</TableCell>
                        <TableCell className="px-4 py-3">
                          <Input
                            type="number"
                            disabled={!isManager}
                            value={m.score}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setSelectedGroupModal(prev => {
                                if (!prev) return null;
                                return {
                                  ...prev,
                                  members: prev.members.map(mem => mem.playerId === m.playerId ? { ...mem, score: val } : mem)
                                };
                              });
                            }}
                            className="h-8 text-center text-xs w-full bg-[#050811]"
                          />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Input
                            type="number"
                            disabled={!isManager}
                            value={m.timeSeconds}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setSelectedGroupModal(prev => {
                                if (!prev) return null;
                                return {
                                  ...prev,
                                  members: prev.members.map(mem => mem.playerId === m.playerId ? { ...mem, timeSeconds: val } : mem)
                                };
                              });
                            }}
                            className="h-8 text-center text-xs w-full bg-[#050811]"
                          />
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            disabled={!isManager}
                            checked={m.isAdvanced}
                            onChange={(e) => {
                              const val = e.target.checked;
                              setSelectedGroupModal(prev => {
                                if (!prev) return null;
                                return {
                                  ...prev,
                                  members: prev.members.map(mem => mem.playerId === m.playerId ? { ...mem, isAdvanced: val } : mem)
                                };
                              });
                            }}
                            className={`h-4.5 w-4.5 rounded accent-primary border-border bg-[#050811] ${isManager ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
 
            <DialogFooter className="border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedGroupModal(null)}
                className="border-border text-slate-400 hover:text-white cursor-pointer h-9 px-4"
              >
                Batal
              </Button>
              {isManager && selectedGroupModal.members.length > 0 && (
                <Button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    await handleSaveGroupScores(selectedGroupModal.id, selectedGroupModal.members);
                    setSelectedGroupModal(null);
                  }}
                  className="bg-primary text-primary-foreground font-bold hover:brightness-110 cursor-pointer h-9 px-4"
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Game Sessions Detail Modal */}
      <Dialog open={!!selectedPlayerForSessions} onOpenChange={(open) => { if (!open) setSelectedPlayerForSessions(null); }}>
        {selectedPlayerForSessions && (
          <DialogContent className="max-w-2xl bg-[#0c1224] border-border text-white p-6 flex flex-col max-h-[85vh]">
            <DialogHeader className="border-b border-border pb-3">
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-primary" />
                <span>
                  Game Sessions for <span className="text-primary">{selectedPlayerForSessions.name}</span>
                </span>
              </DialogTitle>
              <CardDescription className="text-2xs text-slate-400 mt-1">
                Kuis diselesaikan setelah pendaftaran akan terhitung sebagai sesi kualifikasi resmi.
              </CardDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3 my-3">
              {(!selectedPlayerForSessions.sessions || selectedPlayerForSessions.sessions.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 italic text-sm">
                  <span>Belum ada data sesi game.</span>
                  <span className="text-3xs text-slate-500/70 mt-1">(Hanya sesi kuis selesai setelah waktu registrasi pendaftar yang terhitung)</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedPlayerForSessions.sessions.map((sess: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-2 p-3 border border-border/50 rounded-xl bg-[#050811]/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-3xs font-mono text-slate-450 bg-slate-800/60 px-1.5 py-0.5 rounded">#{idx + 1}</span>
                          <span className="font-semibold text-xs truncate max-w-[200px]" title={sess.quizTitle}>
                            {sess.quizTitle}
                          </span>
                          {sess.application && (
                            <span className="text-[9px] uppercase tracking-wider font-extrabold border border-border/40 text-slate-400 px-1.5 py-0.5 rounded-md bg-muted/30">
                              {sess.application}
                            </span>
                          )}
                        </div>
                        <span className="text-3xs text-slate-500">
                          {new Date(sess.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs mt-1">
                        <div className="flex items-center gap-1">
                          <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                          <span className="font-bold text-white">{sess.score} pt</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <span>⏱️</span>
                          <span>{sess.timeSeconds >= 60 ? `${Math.floor(sess.timeSeconds / 60)}m ${sess.timeSeconds % 60}s` : `${sess.timeSeconds}s`}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-border pt-4 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedPlayerForSessions(null)}
                className="border-border text-slate-400 hover:text-white cursor-pointer h-9 px-4 text-xs"
              >
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* QR Scanner Overlay Dialog */}
      {qrDialogOpen && (
        <div className="fixed inset-0 z-100 flex flex-col bg-black">
          {/* Header */}
          <div className="flex items-center justify-between p-4 shrink-0 border-b border-zinc-800">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Camera className="h-5 w-5 text-emerald-400" />
                Scan QR Absensi
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                Arahkan kamera ke kode QR peserta (ID Peserta atau Username) untuk absensi kehadiran secara instan.
              </p>
            </div>
            <button
              onClick={() => setQrDialogOpen(false)}
              className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Camera Viewfinder */}
          <div className="flex-1 flex items-center justify-center relative bg-black/95">
            <style>{`
              #qr-shaded-region,
              #qr-reader *[style*="border"] {
                display: none !important;
                border: none !important;
                box-shadow: none !important;
              }
              #qr-reader video {
                z-index: 10 !important;
                border: none !important;
                box-shadow: none !important;
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
              }
            `}</style>
            
            <div className="relative w-[85vw] h-[85vw] max-w-[400px] max-h-[400px] md:max-w-[450px] md:max-h-[450px] overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-850">
              <div id="qr-reader" className="absolute inset-0 w-full h-full" />

              {/* Corner brackets */}
              <div className="absolute inset-4 pointer-events-none z-20">
                <div className="absolute top-0 left-0" style={{ width: "40px", height: "40px", borderTop: "4px solid #10b981", borderLeft: "4px solid #10b981", borderTopLeftRadius: "12px" }} />
                <div className="absolute top-0 right-0" style={{ width: "40px", height: "40px", borderTop: "4px solid #10b981", borderRight: "4px solid #10b981", borderTopRightRadius: "12px" }} />
                <div className="absolute bottom-0 left-0" style={{ width: "40px", height: "40px", borderBottom: "4px solid #10b981", borderLeft: "4px solid #10b981", borderBottomLeftRadius: "12px" }} />
                <div className="absolute bottom-0 right-0" style={{ width: "40px", height: "40px", borderBottom: "4px solid #10b981", borderRight: "4px solid #10b981", borderBottomRightRadius: "12px" }} />
              </div>
            </div>

            {/* Sub-label */}
            <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none z-20">
              <span className="text-white/80 text-xs font-medium tracking-wide bg-zinc-900/80 px-5 py-2 rounded-full border border-zinc-800">
                Posisikan Kode QR di dalam kotak kamera
              </span>
            </div>

            {/* Custom Toast Alert within Scanner */}
            {scanResult && (
              <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 z-200 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300 pointer-events-none max-w-[90vw] whitespace-nowrap
                ${scanResult.status === 'success' ? 'bg-emerald-500 text-white' : 
                  scanResult.status === 'info' ? 'bg-blue-500 text-white' : 
                  'bg-red-500 text-white'}`}
              >
                <div className="shrink-0 bg-white/20 rounded-full p-0.5">
                  {scanResult.status === 'success' ? <CheckCircle className="h-4 w-4" /> :
                   scanResult.status === 'info' ? <ShieldCheck className="h-4 w-4" /> :
                   <AlertCircle className="h-4 w-4" />}
                </div>
                <span className="text-sm font-medium tracking-wide truncate">
                  {scanResult.message}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ADD GROUP DIALOG */}
      <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
        <DialogContent className="bg-slate-950 border border-border text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-sm font-bold uppercase tracking-wider">Add Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">Nama Grup</label>
              <Input
                placeholder="Contoh: Semifinal TK Group 1"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="bg-slate-900 border-border text-white text-xs"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">Babak (Stage)</label>
              <select
                value={newGroupStage}
                onChange={(e) => setNewGroupStage(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-slate-900 text-xs px-3 text-white"
              >
                <option value="Semifinal">Semifinal</option>
                <option value="Final">Final</option>
                <option value="Champion">Champion</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">Kategori</label>
              <select
                value={newGroupCategory}
                onChange={(e) => setNewGroupCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-slate-900 text-xs px-3 text-white"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {newGroupStage !== "Semifinal" && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">Grup Sumber Peserta (Lolos dari Babak Sebelumnya)</label>
                <div className="max-h-28 overflow-y-auto border border-border rounded-md p-2 bg-slate-900 space-y-1">
                  {groups
                    .filter(g => g.stage === (newGroupStage === "Final" ? "Semifinal" : "Final"))
                    .map(g => {
                      const isChecked = newGroupSources.includes(g.id);
                      return (
                        <div key={g.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setNewGroupSources(newGroupSources.filter(id => id !== g.id));
                              } else {
                                setNewGroupSources([...newGroupSources, g.id]);
                              }
                            }}
                            className="rounded border-border text-primary cursor-pointer"
                          />
                          <span className="text-xs">{g.name}</span>
                        </div>
                      );
                    })}
                  {groups.filter(g => g.stage === (newGroupStage === "Final" ? "Semifinal" : "Final")).length === 0 && (
                    <p className="text-slate-500 text-[11px] italic">Tidak ada grup sumber yang cocok.</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-end gap-2">
            <Button onClick={() => setIsAddGroupOpen(false)} variant="outline" className="border-border text-slate-400 h-8 text-xs">Batal</Button>
            <Button onClick={handleAddGroup} className="bg-primary text-primary-foreground h-8 text-xs font-bold">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT GROUP DIALOG */}
      <Dialog open={!!editGroup} onOpenChange={(open) => { if (!open) setEditGroup(null); }}>
        <DialogContent className="bg-slate-950 border border-border text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-sm font-bold uppercase tracking-wider">Edit Group</DialogTitle>
          </DialogHeader>
          {editGroup && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">Nama Grup</label>
                <Input
                  placeholder="Contoh: Semifinal TK Group 1"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="bg-slate-900 border-border text-white text-xs"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">Babak (Stage)</label>
                <select
                  value={editGroupStage}
                  onChange={(e) => setEditGroupStage(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-slate-900 text-xs px-3 text-white"
                >
                  <option value="Semifinal">Semifinal</option>
                  <option value="Final">Final</option>
                  <option value="Champion">Champion</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">Kategori</label>
                <select
                  value={editGroupCategory}
                  onChange={(e) => setEditGroupCategory(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-slate-900 text-xs px-3 text-white"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {editGroupStage !== "Semifinal" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400">Grup Sumber Peserta</label>
                  <div className="max-h-28 overflow-y-auto border border-border rounded-md p-2 bg-slate-900 space-y-1">
                    {groups
                      .filter(g => g.id !== editGroup.id && g.stage === (editGroupStage === "Final" ? "Semifinal" : "Final"))
                      .map(g => {
                        const isChecked = editGroupSources.includes(g.id);
                        return (
                          <div key={g.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setEditGroupSources(editGroupSources.filter(id => id !== g.id));
                                } else {
                                  setEditGroupSources([...editGroupSources, g.id]);
                                }
                              }}
                              className="rounded border-border text-primary cursor-pointer"
                            />
                            <span className="text-xs">{g.name}</span>
                          </div>
                        );
                      })}
                    {groups.filter(g => g.id !== editGroup.id && g.stage === (editGroupStage === "Final" ? "Semifinal" : "Final")).length === 0 && (
                      <p className="text-slate-500 text-[11px] italic">Tidak ada grup sumber yang cocok.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="sm:justify-end gap-2">
            <Button onClick={() => setEditGroup(null)} variant="outline" className="border-border text-slate-400 h-8 text-xs">Batal</Button>
            <Button onClick={handleUpdateGroup} className="bg-primary text-primary-foreground h-8 text-xs font-bold">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ASSIGN FINALIST DIALOG */}
      <Dialog open={!!assignDialog} onOpenChange={(open) => { if (!open) setAssignDialog(null); }}>
        <DialogContent className="bg-slate-950 border border-border text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-sm font-bold uppercase tracking-wider">Assign Finalists / Players</DialogTitle>
          </DialogHeader>
          {assignDialog && (
            <div className="space-y-4 py-2">
              <Input
                placeholder="Cari nama peserta..."
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                className="bg-slate-900 border-border text-white text-xs h-8"
              />

              <div className="max-h-60 overflow-y-auto border border-border rounded-md p-2 bg-slate-900 space-y-2">
                {participants
                  .filter(p => p.isPaid && p.name.toLowerCase().includes(assignSearch.toLowerCase()))
                  .map((p) => {
                    const isChecked = assignSelected.includes(p.id);
                    return (
                      <div key={p.id} className="flex items-center justify-between p-1.5 hover:bg-slate-800/40 rounded">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setAssignSelected(assignSelected.filter(id => id !== p.id));
                              } else {
                                setAssignSelected([...assignSelected, p.id]);
                              }
                            }}
                            className="rounded border-border text-primary cursor-pointer h-4 w-4"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{p.name}</span>
                            <span className="text-[10px] text-slate-500">@{p.username} | {p.schoolName}</span>
                          </div>
                        </div>
                        {p.category && (
                          <Badge variant="outline" className="text-[9px] px-1 bg-primary/10 border-primary/20 text-primary">
                            {p.category}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                {participants.filter(p => p.isPaid && p.name.toLowerCase().includes(assignSearch.toLowerCase())).length === 0 && (
                  <p className="text-slate-500 text-xs italic text-center py-4">Tidak ada peserta berbayar yang cocok.</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="sm:justify-end gap-2">
            <Button onClick={() => setAssignDialog(null)} variant="outline" className="border-border text-slate-400 h-8 text-xs">Batal</Button>
            <Button onClick={handleAssignPlayers} className="bg-primary text-primary-foreground h-8 text-xs font-bold">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ASSIGN QUIZ DIALOG */}
      <Dialog open={!!roundsDialog} onOpenChange={(open) => { if (!open) setRoundsDialog(null); }}>
        <DialogContent className="bg-[#0c1224] border border-border text-white sm:max-w-lg rounded-2xl shadow-2xl p-6">
          {roundsDialog && (
            <>
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-white text-base font-bold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span>Assign Quiz — {roundsDialog.group.name}</span>
                </DialogTitle>
                <p className="text-xs text-slate-400">Configure quizzes and games for each round</p>
              </DialogHeader>

              <div className="space-y-4 py-4 max-h-[350px] overflow-y-auto pr-1">
                {roundsDialog.rounds.map((r, idx) => (
                  <div key={idx} className="space-y-3 p-4 border border-border bg-slate-900/40 rounded-xl relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-300">Round {idx + 1}</span>
                      {roundsDialog.rounds.length > 1 && (
                        <button
                          onClick={() => {
                            const updatedRounds = roundsDialog.rounds.filter((_, i) => i !== idx);
                            setRoundsDialog({ ...roundsDialog, rounds: updatedRounds });
                          }}
                          className="h-6 w-6 rounded-md hover:bg-rose-500/10 text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                          title="Hapus Ronde"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Quiz Select */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
                          <BookOpen className="h-3 w-3 text-slate-500" />
                          <span>Select Quiz</span>
                        </label>
                        <select
                          value={r.quizId}
                          onChange={(e) => {
                            const updatedRounds = [...roundsDialog.rounds];
                            updatedRounds[idx].quizId = e.target.value;
                            setRoundsDialog({ ...roundsDialog, rounds: updatedRounds });
                          }}
                          className="w-full h-9 rounded-md border border-border bg-slate-955 bg-slate-950 text-xs px-3 text-white outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value="">None</option>
                          {quizzes.map(q => (
                            <option key={q.id} value={q.id}>{q.title}</option>
                          ))}
                        </select>
                      </div>

                      {/* Right: Game Select */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
                          <Gamepad2 className="h-3 w-3 text-slate-500" />
                          <span>Select Game</span>
                        </label>
                        <select
                          value={r.gameId}
                          onChange={(e) => {
                            const updatedRounds = [...roundsDialog.rounds];
                            updatedRounds[idx].gameId = e.target.value;
                            setRoundsDialog({ ...roundsDialog, rounds: updatedRounds });
                          }}
                          className="w-full h-9 rounded-md border border-border bg-slate-955 bg-slate-950 text-xs px-3 text-white outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value="">None</option>
                          <option value="axiom">Axiom</option>
                          <option value="crazy_race">CrazyRace</option>
                          <option value="gameforsmart">gameforsmart.com</option>
                          <option value="memory_quiz">memoryquiz</option>
                          <option value="nitro_quiz">NitroQuiz</option>
                          <option value="quiz_v1">Quiz V1</option>
                          <option value="quiz_v2">Quiz V2</option>
                          <option value="quiz_rush">QuizRush</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Round Button */}
              <div className="flex justify-center pb-2">
                <Button
                  onClick={() => {
                    const newRound = {
                      quizId: "",
                      gameId: "",
                      settings: { durationMinutes: 10, questionCount: 10, sound: true, difficulty: "Easy" }
                    };
                    setRoundsDialog({ ...roundsDialog, rounds: [...roundsDialog.rounds, newRound] });
                  }}
                  variant="outline"
                  className="h-8 text-xs gap-1 border-dashed border-border hover:bg-slate-900 w-full"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Round
                </Button>
              </div>

              <DialogFooter className="sm:justify-end gap-2 pt-2 border-t border-border/10">
                <Button onClick={() => setRoundsDialog(null)} variant="outline" className="border-border text-slate-400 h-8 text-xs">
                  Batal
                </Button>
                <Button onClick={handleSaveRounds} className="bg-primary text-primary-foreground h-8 text-xs font-bold px-4">
                  Simpan
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
}
