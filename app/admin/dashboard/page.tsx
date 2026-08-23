"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  HeartPulse,
  ShieldCheck,
  LogOut,
  Loader2,
  Users,
  Calendar,
  ClipboardList,
  Stethoscope,
  Plus,
  CheckCircle,
  AlertCircle,
  X,
  Bell,
  RefreshCcw,
} from "lucide-react";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Doctor {
  id: string;
  specialization: string;
  slotDurationMinutes: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  consultationFee: number | null;
  user: { name: string; email: string; phone: string | null; createdAt: string };
  _count: { appointments: number; leaves: number };
}

interface Leave {
  id: string;
  leaveDate: string;
  reason: string | null;
  status: string;
  doctor: { specialization: string; user: { name: string } };
}

interface AuditLog {
  id: string;
  type: string;
  channel: string;
  status: string;
  retryCount: number;
  errorLog: string | null;
  sentAt: string | null;
  createdAt: string;
  appointment: {
    patient: { name: string; email: string };
    doctor: { user: { name: string } };
  } | null;
}

// ─── Doctor Onboarding Modal ──────────────────────────────────────────────────

function AddDoctorModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<"user" | "profile">("user");
  const [userId, setUserId] = useState("");
  const [userCreated, setUserCreated] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "doctor123",
    phone: "",
  });
  const [profile, setProfile] = useState({
    specialization: "",
    slotDurationMinutes: 30,
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    dailyCapacity: 16,
    consultationFee: 100,
    bio: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createUser() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, role: "DOCTOR" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create user");
      setLoading(false);
      return;
    }
    setUserId(data.user.id);
    setUserCreated(true);
    setStep("profile");
    setLoading(false);
  }

  async function createProfile() {
    if (!userId) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...profile }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create profile");
      setLoading(false);
      return;
    }
    onSuccess();
    onClose();
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="card max-w-lg w-full my-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-brand-400" />
            Onboard New Doctor {step === "profile" && "— Schedule Setup"}
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {["user", "profile"].map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s
                    ? "bg-brand-500 text-white"
                    : userCreated && i === 0
                    ? "bg-emerald-500 text-white"
                    : "bg-surface-800 text-slate-500 border border-slate-700"
                }`}
              >
                {userCreated && i === 0 ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs ${step === s ? "text-white" : "text-slate-500"}`}>
                {s === "user" ? "Create Account" : "Schedule Config"}
              </span>
              {i < 1 && <div className="flex-1 h-px bg-slate-700" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {step === "user" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-300 mb-1.5 block">Full Name</label>
                <input
                  placeholder="Dr. Jane Smith"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="input-base"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1.5 block">Phone</label>
                <input
                  placeholder="+1-555-000-0000"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="input-base"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-300 mb-1.5 block">Email</label>
              <input
                type="email"
                placeholder="doctor@healthcare.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="input-base"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 mb-1.5 block">Password</label>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="input-base"
              />
            </div>
            <button
              onClick={createUser}
              disabled={!form.name || !form.email || loading}
              className="btn-primary w-full justify-center"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Continue to Schedule Setup
            </button>
          </div>
        )}

        {step === "profile" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm text-slate-300 mb-1.5 block">Specialization</label>
                <input
                  placeholder="e.g., Cardiology"
                  value={profile.specialization}
                  onChange={(e) => setProfile((p) => ({ ...p, specialization: e.target.value }))}
                  className="input-base"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1.5 block">Working Hours Start</label>
                <input
                  type="time"
                  value={profile.workingHoursStart}
                  onChange={(e) => setProfile((p) => ({ ...p, workingHoursStart: e.target.value }))}
                  className="input-base"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1.5 block">Working Hours End</label>
                <input
                  type="time"
                  value={profile.workingHoursEnd}
                  onChange={(e) => setProfile((p) => ({ ...p, workingHoursEnd: e.target.value }))}
                  className="input-base"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1.5 block">Slot Duration (min)</label>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={profile.slotDurationMinutes}
                  onChange={(e) => setProfile((p) => ({ ...p, slotDurationMinutes: Number(e.target.value) }))}
                  className="input-base"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1.5 block">Consultation Fee ($)</label>
                <input
                  type="number"
                  value={profile.consultationFee}
                  onChange={(e) => setProfile((p) => ({ ...p, consultationFee: Number(e.target.value) }))}
                  className="input-base"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-300 mb-1.5 block">Bio</label>
              <textarea
                placeholder="Brief doctor bio..."
                value={profile.bio}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                className="input-base min-h-[80px] resize-none"
              />
            </div>
            <button
              onClick={createProfile}
              disabled={!profile.specialization || loading}
              className="btn-primary w-full justify-center"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Complete Onboarding
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [view, setView] = useState<"doctors" | "leaves" | "audit">("doctors");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDoctor, setShowAddDoctor] = useState(false);

  // Leave form
  const [leaveForm, setLeaveForm] = useState({ doctorId: "", leaveDate: "", reason: "" });
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveMsg, setLeaveMsg] = useState("");
  const [leaveError, setLeaveError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session.user.role !== "ADMIN") {
      router.push(session.user.role === "DOCTOR" ? "/doctor/dashboard" : "/patient/dashboard");
    }
  }, [status, session, router]);

  const loadDoctors = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/doctors");
    const data = await res.json();
    setDoctors(data.doctors || []);
    setLoading(false);
  }, []);

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/leaves");
    const data = await res.json();
    setLeaves(data.leaves || []);
    setLoading(false);
  }, []);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/audit");
    const data = await res.json();
    setAudits(data.audits || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (view === "doctors") loadDoctors();
    if (view === "leaves") { loadDoctors(); loadLeaves(); }
    if (view === "audit") loadAudit();
  }, [view, status, loadDoctors, loadLeaves, loadAudit]);

  async function submitLeave() {
    if (!leaveForm.doctorId || !leaveForm.leaveDate) return;
    setLeaveLoading(true);
    setLeaveMsg("");
    setLeaveError("");

    const res = await fetch("/api/admin/leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(leaveForm),
    });
    const data = await res.json();

    if (!res.ok) {
      setLeaveError(data.error || "Failed to record leave");
    } else {
      setLeaveMsg(data.message);
      setLeaveForm((f) => ({ ...f, leaveDate: "", reason: "" }));
      loadLeaves();
    }
    setLeaveLoading(false);
  }

  const getStatusColor = (s: string) =>
    s === "SENT" ? "text-emerald-400" :
    s === "FAILED" ? "text-red-400" :
    s === "DEAD_LETTER" ? "text-red-600" :
    "text-amber-400";

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Navbar */}
      <nav className="glass-light border-b border-slate-800/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white">HealthCare Manager</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>{session?.user?.name}</span>
              <span className="badge bg-purple-500/15 text-purple-400 border border-purple-500/20 text-xs">
                ADMIN
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="btn-secondary px-3 py-2"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab Nav */}
        <div className="flex gap-1 p-1 bg-surface-900 rounded-xl border border-slate-800 mb-8 w-fit">
          {([
            { id: "doctors", label: "Doctors", icon: Stethoscope },
            { id: "leaves", label: "Leave Manager", icon: Calendar },
            { id: "audit", label: "Audit Logs", icon: ClipboardList },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                view === tab.id
                  ? "bg-brand-500 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── DOCTORS ────────────────────────────────────────────────────────── */}
        {view === "doctors" && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-400" />
                Doctor Management ({doctors.length})
              </h2>
              <button
                onClick={() => setShowAddDoctor(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4" />
                Onboard Doctor
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {doctors.map((doc) => (
                  <div key={doc.id} className="card">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                        <Stethoscope className="w-6 h-6 text-brand-400" />
                      </div>
                      <div className="text-right">
                        {doc.consultationFee && (
                          <span className="text-emerald-400 font-bold">${doc.consultationFee}</span>
                        )}
                      </div>
                    </div>
                    <h3 className="font-semibold text-white">{doc.user.name}</h3>
                    <p className="text-brand-400 text-sm">{doc.specialization}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{doc.user.email}</p>

                    <div className="mt-3 p-3 rounded-xl bg-surface-800 border border-slate-700 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Hours</span>
                        <span className="text-slate-300">
                          {doc.workingHoursStart}–{doc.workingHoursEnd}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Slot</span>
                        <span className="text-slate-300">{doc.slotDurationMinutes} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Appointments</span>
                        <span className="text-slate-300">{doc._count.appointments}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {doctors.length === 0 && (
                  <div className="col-span-3 card text-center py-16">
                    <Stethoscope className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No doctors yet. Onboard your first doctor.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── LEAVE MANAGER ──────────────────────────────────────────────────── */}
        {view === "leaves" && (
          <div className="animate-fade-in-up">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-brand-400" />
              Doctor Leave Management
            </h2>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Leave Form */}
              <div className="card">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">
                  Record New Leave
                </h3>

                {leaveMsg && (
                  <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                    <Bell className="w-4 h-4 mt-0.5" />
                    {leaveMsg}
                  </div>
                )}
                {leaveError && (
                  <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {leaveError}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Select Doctor</label>
                    <select
                      value={leaveForm.doctorId}
                      onChange={(e) => setLeaveForm((f) => ({ ...f, doctorId: e.target.value }))}
                      className="input-base"
                    >
                      <option value="">-- Choose doctor --</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.user.name} ({d.specialization})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Leave Date</label>
                    <input
                      type="date"
                      value={leaveForm.leaveDate}
                      onChange={(e) => setLeaveForm((f) => ({ ...f, leaveDate: e.target.value }))}
                      className="input-base"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">
                      Reason <span className="text-slate-600">(optional)</span>
                    </label>
                    <input
                      placeholder="e.g., Medical conference"
                      value={leaveForm.reason}
                      onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))}
                      className="input-base"
                    />
                  </div>
                  <button
                    onClick={submitLeave}
                    disabled={!leaveForm.doctorId || !leaveForm.leaveDate || leaveLoading}
                    className="btn-primary w-full justify-center"
                  >
                    {leaveLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Record Leave & Notify Patients
                  </button>
                </div>
              </div>

              {/* Leave History */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Leave History</h3>
                <div className="space-y-3">
                  {leaves.map((leave) => (
                    <div key={leave.id} className="card">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-white text-sm">
                            {leave.doctor.user.name}
                          </p>
                          <p className="text-brand-400 text-xs">{leave.doctor.specialization}</p>
                          <p className="text-slate-400 text-xs mt-1">
                            📅 {format(new Date(leave.leaveDate), "MMMM d, yyyy")}
                          </p>
                          {leave.reason && (
                            <p className="text-slate-500 text-xs mt-0.5">
                              Reason: {leave.reason}
                            </p>
                          )}
                        </div>
                        <span
                          className={`badge text-xs ${
                            leave.status === "APPROVED"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {leave.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {leaves.length === 0 && (
                    <div className="card text-center py-8">
                      <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">No leaves recorded.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── AUDIT LOGS ─────────────────────────────────────────────────────── */}
        {view === "audit" && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-brand-400" />
                Notification Audit Logs
              </h2>
              <button onClick={loadAudit} className="btn-secondary text-sm">
                <RefreshCcw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
              </div>
            ) : (
              <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-800 border-b border-slate-700">
                      <tr>
                        {["Type", "Channel", "Patient", "Doctor", "Status", "Retries", "Sent At"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {audits.map((log) => (
                        <tr key={log.id} className="hover:bg-surface-800/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-slate-300 font-mono">
                            {log.type}
                          </td>
                          <td className="px-4 py-3">
                            <span className="badge text-xs bg-brand-500/10 text-brand-400 border-brand-500/20">
                              {log.channel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {log.appointment?.patient?.name || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {log.appointment?.doctor?.user?.name || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold ${getStatusColor(log.status)}`}>
                              {log.status}
                            </span>
                            {log.errorLog && (
                              <p className="text-red-500 text-xs mt-0.5 truncate max-w-[180px]" title={log.errorLog}>
                                {log.errorLog}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 text-center">
                            {log.retryCount > 0 ? (
                              <span className="text-amber-400">{log.retryCount}</span>
                            ) : (
                              "0"
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {log.sentAt
                              ? format(new Date(log.sentAt), "MMM d, HH:mm")
                              : "—"}
                          </td>
                        </tr>
                      ))}
                      {audits.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                            No notification logs yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddDoctor && (
        <AddDoctorModal
          onClose={() => setShowAddDoctor(false)}
          onSuccess={loadDoctors}
        />
      )}
    </div>
  );
}
