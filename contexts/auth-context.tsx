"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase-browser";

export interface ProfileData {
  id: string;
  auth_user_id: string;
  username: string;
  fullname: string | null;
  nickname: string | null;
  avatar_url: string | null;
  role: string | null;
  language: string | null;
  country_id: number | null;
  is_blocked: boolean;
  email: string | null;
  phone: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: ProfileData | null;
  profileId: string | null;
  activeOrganizationId: string | null;
  organizationRole: "owner" | "admin" | "member" | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (permissionName: string, competitionId?: string, creatorId?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
  const [organizationRole, setOrganizationRole] = useState<"owner" | "admin" | "member" | null>(null);
  const [compPermissions, setCompPermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabaseBrowser
        .from("profiles")
        .select(`
          id,
          auth_user_id,
          username,
          fullname,
          nickname,
          avatar_url,
          role,
          language,
          country_id,
          is_blocked,
          email,
          phone
        `)
        .eq("auth_user_id", userId)
        .single();

      if (!error && data) {
        const safeData = data as unknown as ProfileData;
        localStorage.setItem("user_id", safeData.id);
        setProfile(safeData);
        setProfileId(safeData.id);

        // Fetch organization membership
        const { data: orgs } = await supabaseBrowser
          .from("organization_members")
          .select("organization_id, role_type")
          .eq("profile_id", safeData.id)
          .maybeSingle();

        if (orgs) {
          setActiveOrganizationId(orgs.organization_id);
          setOrganizationRole(orgs.role_type as any);
        } else {
          setActiveOrganizationId(null);
          setOrganizationRole(null);
        }

        // Fetch competition staff roles and permissions
        const { data: staffRoles } = await supabaseBrowser
          .from("competition_staff")
          .select(`
            competition_id,
            roles (
              name,
              role_permissions (
                permission_id
              )
            )
          `)
          .eq("profile_id", safeData.id);

        const permMap: Record<string, string[]> = {};
        if (staffRoles) {
          staffRoles.forEach((item: any) => {
            const compId = item.competition_id;
            const perms = (item.roles?.role_permissions || []).map((rp: any) => rp.permission_id);
            permMap[compId] = perms;
          });
        }
        setCompPermissions(permMap);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  const checkSession = async () => {
    try {
      const { data: { user: currentUser } } = await supabaseBrowser.auth.getUser();
      const newUserId = currentUser?.id || null;

      if (currentUserId !== null && newUserId !== currentUserId) {
        console.log("[AuthContext] Session change detected! Reloading...");
        window.location.reload();
      } else if (newUserId && !profile) {
        fetchProfile(newUserId);
      }
    } catch (err) {
      console.error("[AuthContext] Error checking session:", err);
    }
  };

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const initialId = session?.user?.id || null;
      setCurrentUserId(initialId);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    };

    initSession();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSession();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", checkSession);

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (event === "SIGNED_IN" && currentUser) {
        setCurrentUserId(currentUser.id);
        await fetchProfile(currentUser.id);
      } else if (event === "SIGNED_OUT") {
        setCurrentUserId(null);
        localStorage.removeItem("user_id");
        setUser(null);
        setProfile(null);
        setProfileId(null);
        setActiveOrganizationId(null);
        setOrganizationRole(null);
        setCompPermissions({});
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", checkSession);
    };
  }, [currentUserId]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabaseBrowser.auth.signOut();
    if (error) throw error;
  };

  const hasPermission = (permissionName: string, competitionId?: string, creatorId?: string): boolean => {
    if (!profile) return false;
    if (profile.username === "manager_gfs") return true; // Global manager bypass
    if (creatorId && profile.id === creatorId) return true;
    // Only organization "owner" gets full permission bypass.
    // "admin" is NOT bypassed because migration_v5 set ALL profiles as "admin".
    if (organizationRole === "owner") return true;

    // Global permission bypass for competition creator role
    if (permissionName === "competition.create" && profile.role === "competition") {
      return true;
    }

    if (competitionId) {
      return (compPermissions[competitionId] || []).includes(permissionName);
    }
    return Object.values(compPermissions).some(list => list.includes(permissionName));
  };

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        profile, 
        profileId, 
        activeOrganizationId, 
        organizationRole, 
        loading, 
        refreshProfile, 
        signIn, 
        signOut,
        hasPermission
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
