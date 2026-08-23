"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  HeartPulse,
  Search,
  CalendarDays,
  Clock,
  ChevronRight,
  LogOut,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Brain,
  Pill,
  FileText,
  User,
  ChevronLeft,
  Stethoscope,
} from "lucide-react";
import { format, addDays } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Doctor {
  id: string;
  specialization: string;
  slotDurationMinutes: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  consultationFee: number | null;
  bio: string | null;
  user: { name: string; email: string };
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

interface Appointment {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  doctor: { specialization: string; user: { name: string } };
  preVisitSummary?: {
    urgencyLevel: string;
    chiefComplaint: string | null;
    suggestedQuestions: string[] | null;
    rawFallbackFlag: boolean;
  } | null;
  postVisitRecord?: {
    plainSummary: string | null;
    prescriptionDetails: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
    }> | null;
    followUpDate: string | null;
  } | null;
}

// ─── Urgency Badge ────────────────────────────────────────────────────────────

function UrgencyBadge({ level }: { level: string }) {
  const cls = level === "HIGH" ? "badge-high" : level === "MEDIUM" ? "badge-medium" : "badge-low";
  return <span className={cls}>{level}</span>;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    CONFIRMED: "badge-confirmed",
    COMPLETED: "badge-completed",
    HELD: "badge-held",
    CANCELLED_BY_PATIENT: "badge-cancelled",
    CANCELLED_BY_DOCTOR: "badge-cancelled",
  };
  return (
    <span className={map[status] || "badge"}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Countdown Timer ──────────────────────────────────────────────────────────

function HoldTimer({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecs(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const mins = Math.floor(secs / 60);
  const sec = secs % 60;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-mono font-bold animate-pulse-ring">
      <Clock className="w-4 h-4" />
      {mins}:{sec.toString().padStart(2, "0")} remaining
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function PatientDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [view, setView] = useState<"search" | "book" | "appointments">("search");
  const [searchSpec, setSearchSpec] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [holdData, setHoldData] = useState<{ appointmentId: string; holdExpiresAt: string } | null>(null);
  const [symptoms, setSymptoms] = useState("");
  const [bookingStep, setBookingStep] = useState<"slot" | "symptoms" | "confirm" | "done">("slot");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingResult, setBookingResult] = useState<{ urgencyLevel: string; chiefComplaint: string } | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [expandedApt, setExpandedApt] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session.user.role !== "PATIENT") {
      if (session.user.role === "DOCTOR") router.push("/doctor/dashboard");
      if (session.user.role === "ADMIN") router.push("/admin/dashboard");
    }
  }, [status, session, router]);

  // Load appointments
  const loadAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    const res = await fetch("/api/patient/appointments");
    const data = await res.json();
    setAppointments(data.appointments || []);
    setLoadingAppointments(false);
  }, []);

  useEffect(() => {
    if (view === "appointments") loadAppointments();
  }, [view, loadAppointments]);

  // Search doctors
  async function searchDoctors() {
    setLoadingDoctors(true);
    const params = searchSpec ? `?specialization=${encodeURIComponent(searchSpec)}` : "";
    const res = await fetch(`/api/doctors${params}`);
    const data = await res.json();
    setDoctors(data.doctors || []);
    setLoadingDoctors(false);
  }

  useEffect(() => {
    searchDoctors();
  }, []); // eslint-disable-line

  // Load slots for selected doctor + date
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    fetch(`/api/doctors/${selectedDoctor.id}/slots?date=${selectedDate}`)
      .then((r) => r.json())
      .then((d) => {
        setSlots(d.slots || []);
        setLoadingSlots(false);
      });
  }, [selectedDoctor, selectedDate]);

  // Hold slot
  async function holdSlot() {
    if (!selectedDoctor || !selectedSlot) return;
    setBookingLoading(true);
    setBookingError("");

    const res = await fetch("/api/appointments/hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctorId: selectedDoctor.id,
        appointmentDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setBookingError(data.error || "Failed to hold slot");
      setBookingLoading(false);
      return;
    }

    setHoldData({ appointmentId: data.appointment.id, holdExpiresAt: data.holdExpiresAt });
    setBookingStep("symptoms");
    setBookingLoading(false);
  }

  // Confirm booking
  async function confirmBooking() {
    if (!holdData || !symptoms.trim()) return;
    setBookingLoading(true);
    setBookingError("");

    const res = await fetch("/api/appointments/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId: holdData.appointmentId,
        symptoms: symptoms,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setBookingError(data.error || "Booking failed");
      setBookingLoading(false);
      return;
    }

    setBookingResult(data.triage);
    setBookingStep("done");
    setBookingLoading(false);
  }

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
              <User className="w-4 h-4" />
              <span>{session?.user?.name}</span>
              <span className="badge-confirmed text-xs">PATIENT</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="btn-secondary px-3 py-2 text-sm"
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
            { id: "search", label: "Find Doctors", icon: Search },
            { id: "book", label: "Book Appointment", icon: CalendarDays },
            { id: "appointments", label: "My Appointments", icon: FileText },
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

        {/* ── SEARCH DOCTORS ─────────────────────────────────────────────────── */}
        {view === "search" && (
          <div className="animate-fade-in-up">
            <div className="flex gap-3 mb-6 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by specialization..."
                  value={searchSpec}
                  onChange={(e) => setSearchSpec(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchDoctors()}
                  className="input-base pl-10"
                />
              </div>
              <button onClick={searchDoctors} className="btn-primary">
                Search
              </button>
            </div>

            {loadingDoctors ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {doctors.map((doc) => (
                  <div key={doc.id} className="card-hover">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                        <Stethoscope className="w-6 h-6 text-brand-400" />
                      </div>
                      {doc.consultationFee && (
                        <span className="text-emerald-400 font-semibold text-sm">
                          ${doc.consultationFee}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-white text-lg">{doc.user.name}</h3>
                    <p className="text-brand-400 text-sm mb-2">{doc.specialization}</p>
                    {doc.bio && (
                      <p className="text-slate-500 text-xs mb-3 line-clamp-2">{doc.bio}</p>
                    )}
                    <div className="text-xs text-slate-500 mb-4">
                      🕐 {doc.workingHoursStart}–{doc.workingHoursEnd} &nbsp;|&nbsp;
                      ⏱ {doc.slotDurationMinutes}min slots
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDoctor(doc);
                        setBookingStep("slot");
                        setHoldData(null);
                        setSelectedSlot(null);
                        setSymptoms("");
                        setBookingError("");
                        setBookingResult(null);
                        setView("book");
                      }}
                      className="btn-primary w-full justify-center text-sm"
                    >
                      Book Appointment
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {doctors.length === 0 && (
                  <div className="col-span-3 text-center py-16 text-slate-500">
                    No doctors found. Try a different specialization.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── BOOK APPOINTMENT ───────────────────────────────────────────────── */}
        {view === "book" && (
          <div className="max-w-2xl mx-auto animate-fade-in-up">
            {!selectedDoctor ? (
              <div className="card text-center py-12 text-slate-500">
                <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Select a doctor from the search tab first.</p>
                <button
                  onClick={() => setView("search")}
                  className="btn-secondary mt-4"
                >
                  Go to Search
                </button>
              </div>
            ) : (
              <>
                {/* Doctor Summary */}
                <div className="card mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs mb-0.5">Booking with</p>
                      <h2 className="text-white font-bold text-lg">{selectedDoctor.user.name}</h2>
                      <p className="text-brand-400 text-sm">{selectedDoctor.specialization}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedDoctor(null); setView("search"); }}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Booking steps */}
                {bookingStep === "slot" && (
                  <div className="card">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-brand-400" />
                      Select Date & Time
                    </h3>

                    {/* Date Picker */}
                    <div className="mb-4">
                      <label className="block text-sm text-slate-400 mb-2">Appointment Date</label>
                      <input
                        type="date"
                        value={selectedDate}
                        min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="input-base"
                      />
                    </div>

                    {/* Slot Grid */}
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Available Slots
                      </label>
                      {loadingSlots ? (
                        <div className="flex items-center gap-2 text-slate-500 py-4">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading slots...
                        </div>
                      ) : slots.length === 0 ? (
                        <p className="text-slate-500 py-4 text-sm">
                          No slots available — doctor may be on leave or fully booked.
                        </p>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {slots.map((slot) => (
                            <button
                              key={slot.startTime}
                              disabled={!slot.available}
                              onClick={() => setSelectedSlot(slot)}
                              className={
                                !slot.available
                                  ? "slot-unavailable"
                                  : selectedSlot?.startTime === slot.startTime
                                  ? "slot-selected"
                                  : "slot-available"
                              }
                            >
                              {slot.startTime}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {bookingError && (
                      <div className="flex items-center gap-2 p-3 mt-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {bookingError}
                      </div>
                    )}

                    <button
                      onClick={holdSlot}
                      disabled={!selectedSlot || bookingLoading}
                      className="btn-primary w-full justify-center mt-4"
                    >
                      {bookingLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      Hold Slot ({selectedSlot?.startTime || "—"})
                    </button>
                  </div>
                )}

                {bookingStep === "symptoms" && holdData && (
                  <div className="card">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        <Brain className="w-5 h-5 text-brand-400" />
                        Describe Your Symptoms
                      </h3>
                      <HoldTimer
                        expiresAt={holdData.holdExpiresAt}
                        onExpire={() => {
                          setBookingStep("slot");
                          setHoldData(null);
                          setBookingError("Your slot hold expired. Please select again.");
                        }}
                      />
                    </div>
                    <p className="text-slate-400 text-sm mb-4">
                      Our AI will analyze your symptoms to assign an urgency level and prepare
                      questions for your doctor.
                    </p>
                    <textarea
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      placeholder="Describe your symptoms in detail (e.g., chest pain for 3 days, worse when climbing stairs, no fever...)"
                      className="input-base min-h-[140px] resize-none"
                      minLength={10}
                    />
                    <p className="text-slate-600 text-xs mt-1">
                      {symptoms.length}/2000 characters (min 10)
                    </p>

                    {bookingError && (
                      <div className="flex items-center gap-2 p-3 mt-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {bookingError}
                      </div>
                    )}

                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => setBookingStep("slot")}
                        className="btn-secondary"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button
                        onClick={confirmBooking}
                        disabled={symptoms.trim().length < 10 || bookingLoading}
                        className="btn-primary flex-1 justify-center"
                      >
                        {bookingLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analyzing & Confirming...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Confirm Appointment
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {bookingStep === "done" && bookingResult && (
                  <div className="card text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Appointment Confirmed!</h3>
                    <p className="text-slate-400 mb-4">
                      A confirmation email has been sent to your inbox.
                    </p>

                    <div className="p-4 rounded-xl bg-surface-800 border border-slate-700 text-left mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-sm font-medium">AI Triage Result</span>
                        <UrgencyBadge level={bookingResult.urgencyLevel} />
                      </div>
                      <p className="text-slate-300 text-sm">{bookingResult.chiefComplaint}</p>
                    </div>

                    <button
                      onClick={() => {
                        setView("appointments");
                        setBookingStep("slot");
                        setSelectedDoctor(null);
                        setHoldData(null);
                        setBookingResult(null);
                      }}
                      className="btn-primary"
                    >
                      <FileText className="w-4 h-4" />
                      View My Appointments
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── MY APPOINTMENTS ────────────────────────────────────────────────── */}
        {view === "appointments" && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">My Appointments</h2>
              <button onClick={loadAppointments} className="btn-secondary text-sm">
                Refresh
              </button>
            </div>

            {loadingAppointments ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
              </div>
            ) : appointments.length === 0 ? (
              <div className="card text-center py-16">
                <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No appointments yet.</p>
                <button
                  onClick={() => setView("search")}
                  className="btn-primary mt-4"
                >
                  Book Your First Appointment
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div key={apt.id} className="card">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() =>
                        setExpandedApt(expandedApt === apt.id ? null : apt.id)
                      }
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                          <Stethoscope className="w-6 h-6 text-brand-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">
                            {apt.doctor.user.name}
                          </h3>
                          <p className="text-brand-400 text-sm">{apt.doctor.specialization}</p>
                          <p className="text-slate-500 text-xs mt-0.5">
                            {format(new Date(apt.appointmentDate), "MMMM d, yyyy")} at {apt.startTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={apt.status} />
                        {apt.preVisitSummary && (
                          <UrgencyBadge level={apt.preVisitSummary.urgencyLevel} />
                        )}
                        <ChevronRight
                          className={`w-4 h-4 text-slate-500 transition-transform ${
                            expandedApt === apt.id ? "rotate-90" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {expandedApt === apt.id && (
                      <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
                        {/* Pre-Visit Triage */}
                        {apt.preVisitSummary && (
                          <div className="p-4 rounded-xl bg-surface-800 border border-slate-700">
                            <div className="flex items-center gap-2 mb-3">
                              <Brain className="w-4 h-4 text-brand-400" />
                              <span className="text-sm font-semibold text-white">AI Pre-Visit Triage</span>
                              {apt.preVisitSummary.rawFallbackFlag && (
                                <span className="text-xs text-amber-400">(Fallback)</span>
                              )}
                            </div>
                            {apt.preVisitSummary.chiefComplaint && (
                              <p className="text-slate-300 text-sm mb-2">
                                <strong>Chief Complaint:</strong> {apt.preVisitSummary.chiefComplaint}
                              </p>
                            )}
                            {apt.preVisitSummary.suggestedQuestions && (
                              <div>
                                <p className="text-slate-400 text-xs mb-1">Suggested Questions for Doctor:</p>
                                <ul className="space-y-1">
                                  {(apt.preVisitSummary.suggestedQuestions as string[]).map((q, i) => (
                                    <li key={i} className="text-slate-400 text-xs flex items-start gap-1.5">
                                      <span className="text-brand-400 mt-0.5">•</span> {q}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Post-Visit Record */}
                        {apt.postVisitRecord && (
                          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                            <div className="flex items-center gap-2 mb-3">
                              <FileText className="w-4 h-4 text-emerald-400" />
                              <span className="text-sm font-semibold text-white">Post-Visit Summary</span>
                            </div>
                            {apt.postVisitRecord.plainSummary && (
                              <p className="text-slate-300 text-sm mb-3">
                                {apt.postVisitRecord.plainSummary}
                              </p>
                            )}
                            {apt.postVisitRecord.prescriptionDetails && (
                              <div>
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Pill className="w-4 h-4 text-emerald-400" />
                                  <span className="text-xs font-semibold text-emerald-400">
                                    Prescriptions
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {(apt.postVisitRecord.prescriptionDetails as Array<{
                                    name: string;
                                    dosage: string;
                                    frequency: string;
                                    duration: string;
                                  }>).map((med, i) => (
                                    <div
                                      key={i}
                                      className="p-2.5 rounded-lg bg-surface-800 text-xs"
                                    >
                                      <span className="text-white font-semibold">{med.name}</span>
                                      <span className="text-slate-400 ml-2">{med.dosage}</span>
                                      <span className="text-slate-500 ml-2">—</span>
                                      <span className="text-slate-400 ml-2">{med.frequency}</span>
                                      <span className="text-slate-600 ml-2">for {med.duration}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {apt.postVisitRecord.followUpDate && (
                              <p className="text-slate-400 text-xs mt-3">
                                📅 Follow-up:{" "}
                                {format(new Date(apt.postVisitRecord.followUpDate), "MMMM d, yyyy")}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
