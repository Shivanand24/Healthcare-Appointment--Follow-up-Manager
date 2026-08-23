"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  HeartPulse,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  Users,
  Stethoscope,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    label: "Patient",
    email: "john.doe@example.com",
    pass: "patient123",
    icon: Users,
    color: "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10",
  },
  {
    label: "Doctor",
    email: "dr.smith@healthcare.com",
    pass: "doctor123",
    icon: Stethoscope,
    color: "text-brand-400 border-brand-500/30 hover:bg-brand-500/10",
  },
  {
    label: "Admin",
    email: "admin@healthcare.com",
    pass: "admin123",
    icon: ShieldCheck,
    color: "text-purple-400 border-purple-500/30 hover:bg-purple-500/10",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState(searchParams.get("pass") || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-login from URL params (demo buttons from landing page)
  useEffect(() => {
    const autoEmail = searchParams.get("email");
    const autoPass = searchParams.get("pass");
    if (autoEmail && autoPass) {
      setEmail(autoEmail);
      setPassword(autoPass);
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
      return;
    }

    // Fetch session to determine role-based redirect
    const res = await fetch("/api/auth/session");
    const session = await res.json();
    const role = session?.user?.role;

    if (role === "ADMIN") router.push("/admin/dashboard");
    else if (role === "DOCTOR") router.push("/doctor/dashboard");
    else router.push("/patient/dashboard");
  }

  async function loginAsDemo(acc: (typeof DEMO_ACCOUNTS)[0]) {
    setEmail(acc.email);
    setPassword(acc.pass);
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email: acc.email,
      password: acc.pass,
      redirect: false,
    });

    if (result?.error) {
      setError("Demo login failed. Please run the seed script first: npx prisma db seed");
      setLoading(false);
      return;
    }

    if (acc.label === "Admin") router.push("/admin/dashboard");
    else if (acc.label === "Doctor") router.push("/doctor/dashboard");
    else router.push("/patient/dashboard");
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-white">HealthCare</span>
            <span className="text-brand-400 font-bold text-xl">Manager</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-slate-400 mt-1 text-sm">Sign in to your account</p>
        </div>

        {/* Demo Buttons */}
        <div className="card mb-6">
          <p className="text-slate-400 text-xs font-medium mb-3 text-center">
            ✨ QUICK DEMO LOGIN
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.label}
                id={`demo-${acc.label.toLowerCase()}`}
                onClick={() => loginAsDemo(acc)}
                disabled={loading}
                className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-xs font-medium transition-all duration-200 disabled:opacity-50 ${acc.color}`}
              >
                <acc.icon className="w-4 h-4" />
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <div className="card">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base pl-10"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base pl-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              id="btn-login"
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-4">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-brand-400 hover:text-brand-300 font-medium">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-400" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
