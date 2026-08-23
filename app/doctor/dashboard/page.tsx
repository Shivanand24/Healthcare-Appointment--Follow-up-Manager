"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  HeartPulse,
  Stethoscope,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Loader2,
  User,
  Brain,
  FileText,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Pill,
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  patient: { id: string; name: string; email: string; phone: string | null };
  preVisitSummary?: {
    rawSymptoms: string;
    urgencyLevel: string;
    chiefComplaint: string | null;
    suggestedQuestions: string[] | null;
    rawFallbackFlag: boolean;
  } | null;
  postVisitRecord?: { id: string } | null;
}

interface Prescription {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

// ─── Urgency Badge ────────────────────────────────────────────────────────────

function UrgencyBadge({ level }: { level: string }) {
  const cls = level === "HIGH" ? "badge-high" : level === "MEDIUM" ? "badge-medium" : "badge-low";
  const icon = level === "HIGH" ? "🔴" : level === "MEDIUM" ? "🟡" : "🟢";
  return <span className={cls}>{icon} {level}</span>;
}

// ─── Consultation Form Modal ──────────────────────────────────────────────────

function ConsultationForm({
  appointment,
  onClose,
  onSuccess,
}: {
  appointment: Appointment;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [plainSummary, setPlainSummary] = useState("");

  function addPrescription() {
    setPrescriptions((p) => [
      ...p,
      { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ]);
  }

  function updatePrescription(i: number, field: keyof Prescription, val: string) {
    setPrescriptions((prev) =>
      prev.map((p, idx) => (idx === i ? { ...p, [field]: val } : p))
    );
  }

  function removePrescription(i: number) {
    setPrescriptions((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (!notes.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/doctor/consultations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId: appointment.id,
        doctorNotes: notes,
        prescriptions: prescriptions.filter((p) => p.name.trim()),
        followUpDate: followUpDate || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to save consultation");
      setLoading(false);
      return;
    }

    setPlainSummary(data.plainSummary || "");
    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="card max-w-lg w-full text-center">
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Consultation Saved!</h3>
          {plainSummary && (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-left mb-4">
              <p className="text-xs text-emerald-400 font-semibold mb-2">AI Patient Summary:</p>
              <p className="text-slate-300 text-sm">{plainSummary}</p>
            </div>
          )}
          <button
            onClick={() => { onClose(); onSuccess(); }}
            className="btn-primary"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="card max-w-2xl w-full my-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-400" />
            Consultation Record — {appointment.patient.name}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">✕</button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Clinical Notes <span className="text-red-400">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Patient presented with... Examination findings... Assessment... Plan..."
              className="input-base min-h-[120px] resize-none"
              minLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Follow-up Date <span className="text-slate-500">(optional)</span>
            </label>
            <input
              type="date"
              value={followUpDate}
              min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="input-base"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-emerald-400" />
                Prescriptions
              </label>
              <button onClick={addPrescription} className="btn-secondary text-xs py-1.5 px-3">
                <Plus className="w-3.5 h-3.5" />
                Add Medication
              </button>
            </div>

            <div className="space-y-3">
              {prescriptions.map((med, i) => (
                <div key={i} className="p-3 rounded-xl bg-surface-800 border border-slate-700">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      placeholder="Medication name"
                      value={med.name}
                      onChange={(e) => updatePrescription(i, "name", e.target.value)}
                      className="input-base text-sm py-2"
                    />
                    <input
                      placeholder="Dosage (e.g., 500mg)"
                      value={med.dosage}
                      onChange={(e) => updatePrescription(i, "dosage", e.target.value)}
                      className="input-base text-sm py-2"
                    />
                    <input
                      placeholder="Frequency"
                      value={med.frequency}
                      onChange={(e) => updatePrescription(i, "frequency", e.target.value)}
                      className="input-base text-sm py-2"
                    />
                    <input
                      placeholder="Duration"
                      value={med.duration}
                      onChange={(e) => updatePrescription(i, "duration", e.target.value)}
                      className="input-base text-sm py-2"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      placeholder="Special instructions"
                      value={med.instructions}
                      onChange={(e) => updatePrescription(i, "instructions", e.target.value)}
                      className="input-base text-sm py-2 flex-1"
                    />
                    <button
                      onClick={() => removePrescription(i)}
                      className="btn-danger px-3 py-2 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!notes.trim() || loading}
          className="btn-primary w-full justify-center mt-6"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating AI Summary...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Save & Generate Patient Summary
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DoctorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [consultationApt, setConsultationApt] = useState<Appointment | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session.user.role !== "DOCTOR") {
      if (session.user.role === "PATIENT") router.push("/patient/dashboard");
      if (session.user.role === "ADMIN") router.push("/admin/dashboard");
    }
  }, [status, session, router]);

  const loadSchedule = useCallback(async (date: string) => {
    setLoading(true);
    const res = await fetch(`/api/doctor/schedule?date=${date}`);
    const data = await res.json();
    setAppointments(data.appointments || []);
    if (data.doctorId) setDoctorId(data.doctorId);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") loadSchedule(selectedDate);
  }, [selectedDate, status, loadSchedule]);

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
              <Stethoscope className="w-4 h-4" />
              <span>{session?.user?.name}</span>
              <span className="badge-confirmed text-xs">DOCTOR</span>
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
        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── Left: Schedule ──────────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            {/* Date nav */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-brand-400" />
                Daily Schedule
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDate(format(subDays(new Date(selectedDate), 1), "yyyy-MM-dd"))}
                  className="btn-secondary p-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-base text-sm py-2 w-40"
                />
                <button
                  onClick={() => setSelectedDate(format(addDays(new Date(selectedDate), 1), "yyyy-MM-dd"))}
                  className="btn-secondary p-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
              </div>
            ) : appointments.length === 0 ? (
              <div className="card text-center py-16">
                <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No appointments for this date.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((apt) => (
                  <div
                    key={apt.id}
                    onClick={() => setSelectedApt(apt.id === selectedApt?.id ? null : apt)}
                    className={`card cursor-pointer transition-all duration-200 ${
                      selectedApt?.id === apt.id
                        ? "border-brand-500/40 bg-brand-500/5"
                        : "card-hover"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center w-16 py-2 rounded-xl bg-surface-800 border border-slate-700">
                          <Clock className="w-3.5 h-3.5 text-brand-400 mb-1" />
                          <span className="text-white font-bold text-sm">{apt.startTime}</span>
                          <span className="text-slate-600 text-xs">to {apt.endTime}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-white">{apt.patient.name}</span>
                            {apt.preVisitSummary && (
                              <UrgencyBadge level={apt.preVisitSummary.urgencyLevel} />
                            )}
                          </div>
                          <p className="text-slate-500 text-xs">{apt.patient.email}</p>
                          {apt.patient.phone && (
                            <p className="text-slate-600 text-xs">{apt.patient.phone}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {apt.postVisitRecord ? (
                          <span className="badge-completed text-xs">Done</span>
                        ) : apt.status === "CONFIRMED" ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConsultationApt(apt);
                            }}
                            className="btn-primary text-xs px-3 py-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Record Consultation
                          </button>
                        ) : (
                          <span className="badge text-xs bg-amber-500/10 text-amber-400 border-amber-500/20">
                            {apt.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expanded: Pre-Visit Triage */}
                    {selectedApt?.id === apt.id && apt.preVisitSummary && (
                      <div className="mt-4 pt-4 border-t border-slate-800">
                        <div className="p-4 rounded-xl bg-surface-800 border border-slate-700">
                          <div className="flex items-center gap-2 mb-3">
                            <Brain className="w-4 h-4 text-brand-400" />
                            <span className="text-sm font-semibold text-white">AI Triage Report</span>
                            {apt.preVisitSummary.rawFallbackFlag && (
                              <span className="text-xs text-amber-400">(Fallback — API unavailable)</span>
                            )}
                          </div>
                          {apt.preVisitSummary.chiefComplaint && (
                            <p className="text-slate-300 text-sm mb-3">
                              <strong>Chief Complaint:</strong> {apt.preVisitSummary.chiefComplaint}
                            </p>
                          )}
                          <div className="mb-3">
                            <p className="text-slate-400 text-xs mb-1">Patient&apos;s Raw Symptoms:</p>
                            <p className="text-slate-400 text-xs italic bg-surface-900 p-2 rounded-lg">
                              &quot;{apt.preVisitSummary.rawSymptoms}&quot;
                            </p>
                          </div>
                          {apt.preVisitSummary.suggestedQuestions && (
                            <div>
                              <p className="text-slate-400 text-xs font-semibold mb-1">
                                🎯 Suggested Questions:
                              </p>
                              <ul className="space-y-1.5">
                                {(apt.preVisitSummary.suggestedQuestions as string[]).map((q, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                    <span className="text-brand-400 font-bold mt-0.5">{i + 1}.</span>
                                    {q}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: Stats Panel ──────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-400 mb-4">
                Today&apos;s Overview
              </h3>
              <div className="space-y-3">
                {[
                  {
                    label: "Total",
                    value: appointments.length,
                    color: "text-white",
                  },
                  {
                    label: "Confirmed",
                    value: appointments.filter((a) => a.status === "CONFIRMED").length,
                    color: "text-brand-400",
                  },
                  {
                    label: "HIGH Urgency",
                    value: appointments.filter(
                      (a) => a.preVisitSummary?.urgencyLevel === "HIGH"
                    ).length,
                    color: "text-red-400",
                  },
                  {
                    label: "Completed",
                    value: appointments.filter((a) => a.postVisitRecord).length,
                    color: "text-emerald-400",
                  },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                    <span className="text-slate-400 text-sm">{stat.label}</span>
                    <span className={`font-bold text-lg ${stat.color}`}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">
                Urgency Distribution
              </h3>
              <div className="space-y-2">
                {(["HIGH", "MEDIUM", "LOW"] as const).map((level) => {
                  const count = appointments.filter(
                    (a) => a.preVisitSummary?.urgencyLevel === level
                  ).length;
                  const total = appointments.filter((a) => a.preVisitSummary).length;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const colors = {
                    HIGH: "bg-red-500",
                    MEDIUM: "bg-amber-500",
                    LOW: "bg-emerald-500",
                  };

                  return (
                    <div key={level}>
                      <div className="flex justify-between text-xs mb-1">
                        <UrgencyBadge level={level} />
                        <span className="text-slate-400">{count} patients</span>
                      </div>
                      <div className="h-1.5 bg-surface-800 rounded-full">
                        <div
                          className={`h-full ${colors[level]} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-1.5">
                <User className="w-4 h-4" />
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => loadSchedule(selectedDate)}
                  className="btn-secondary w-full text-sm justify-center"
                >
                  Refresh Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Consultation Modal */}
      {consultationApt && (
        <ConsultationForm
          appointment={consultationApt}
          onClose={() => setConsultationApt(null)}
          onSuccess={() => loadSchedule(selectedDate)}
        />
      )}
    </div>
  );
}
