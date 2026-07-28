"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Eye, EyeOff, Lock, Mail, Trophy } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const { signIn, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleCreateDemoUsers = async () => {
    setErrorMsg("");
    setDemoLoading(true);
    try {
      const demoUsers = [
        { email: "manager@gfs.com", name: "Manager", username: "manager_gfs" },
        { email: "mc@gfs.com", name: "MC", username: "mc_gfs" },
        { email: "receptionist@gfs.com", name: "Receptionist", username: "receptionist_gfs" },
        { email: "comanager@gfs.com", name: "Co-Manager", username: "comanager_gfs" }
      ];

      for (const u of demoUsers) {
        const { error } = await supabaseBrowser.auth.signUp({
          email: u.email,
          password: "password123",
          options: {
            data: {
              full_name: u.name,
              username: u.username
            }
          }
        });

        if (error) {
          console.warn(`Signup warning for ${u.email}:`, error.message);
        }
      }

      alert("Demo accounts registered successfully! Default password: password123. Please sign in.");
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to register accounts: " + err.message);
    } finally {
      setDemoLoading(false);
    }
  };

  React.useEffect(() => {
    if (user && !loading) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Login failed:", err);
      setErrorMsg(err.message || "Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-rose-650 text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-[#1b253b] border-t-primary" />
            <div className="absolute inset-1 animate-spin rounded-full border-2 border-transparent border-b-primary/50" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <p className="text-sm font-medium tracking-wide text-slate-400">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4 relative overflow-hidden">
      {/* Animated Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-primary/[0.04] blur-[150px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-indigo-500/[0.03] blur-[140px] animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-primary/[0.02] blur-[120px]" />

      <Card className="w-full max-w-md relative border-border/60 bg-card/50 shadow-2xl backdrop-blur-xl overflow-hidden animate-fade-in-up">
        {/* Gradient border overlay */}
        <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative">
          <CardHeader className="flex flex-col items-center text-center pb-2 pt-8">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-black shadow-lg shadow-primary/25">
              <Trophy className="h-7 w-7" />
              <div className="absolute -inset-1 rounded-2xl bg-primary/20 blur-sm -z-10" />
            </div>
            <CardTitle className="mt-5 text-2xl font-bold tracking-tight text-white">
              Manage Competition
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm">
              GameForSmart Competition Management Portal
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-4 px-6">
              {errorMsg && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 z-10">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="h-11 pl-10 bg-secondary/60 border-border/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 z-10">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-11 pl-10 pr-10 bg-secondary/60 border-border/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 z-10 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 mt-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] font-bold cursor-pointer transition-all duration-200"
              >
                {isSubmitting ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                ) : (
                  "Sign In"
                )}
              </Button>
            </CardContent>
          </form>

          <CardFooter className="flex flex-col space-y-4 pb-8 pt-2 px-6 text-center">
            <div className="text-xs text-slate-500">
              Use your Competition Management account registered by the Super Admin.
            </div>

            <Separator className="bg-border/40" />

            <button
              type="button"
              disabled={demoLoading}
              onClick={handleCreateDemoUsers}
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors active:scale-[0.98] cursor-pointer"
            >
              {demoLoading ? "Registering Accounts..." : "Don't have an account? Register Demo Accounts (1-Click)"}
            </button>
          </CardFooter>
        </div>
      </Card>
    </div>
  );
}
