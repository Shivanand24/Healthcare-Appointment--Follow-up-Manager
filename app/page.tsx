import Link from "next/link";
import {
  HeartPulse,
  CalendarCheck,
  Brain,
  Bell,
  ShieldCheck,
  ArrowRight,
  Stethoscope,
  Users,
  Zap,
  CheckCircle,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface-950 overflow-hidden">
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 glass-light border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white">HealthCare</span>
            <span className="text-brand-400 font-bold text-lg">Manager</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary text-sm px-4 py-2">
              Sign In
            </Link>
            <Link href="/register" className="btn-primary text-sm px-4 py-2">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ────────────────────────────────────────────────────── */}
      <section
        className="relative pt-32 pb-24 px-6"
        style={{ background: "var(--gradient-hero)" }}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-brand-500/20 text-brand-400 text-sm font-medium mb-8 animate-fade-in-up">
            <Zap className="w-3.5 h-3.5" />
            AI-Powered Healthcare Platform
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6 animate-fade-in-up stagger-1">
            Healthcare
            <span className="gradient-text"> Appointments</span>
            <br />
            Reimagined
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up stagger-2">
            Book doctors, get AI-powered symptom triage, receive plain-language
            prescriptions, and never miss a medication reminder — all in one
            secure platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up stagger-3">
            <Link href="/register?role=PATIENT" className="btn-primary text-base px-8 py-3.5">
              Book an Appointment
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="btn-secondary text-base px-8 py-3.5">
              Doctor / Admin Login
            </Link>
          </div>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 rounded-xl glass border border-slate-700/50 inline-block animate-fade-in-up stagger-4">
            <p className="text-slate-400 text-sm mb-3 font-medium">✨ Try Demo Accounts</p>
            <div className="flex flex-wrap gap-3 justify-center text-xs">
              {[
                { label: "Admin", email: "admin@healthcare.com", pass: "admin123", color: "text-purple-400" },
                { label: "Doctor", email: "dr.smith@healthcare.com", pass: "doctor123", color: "text-brand-400" },
                { label: "Patient", email: "john.doe@example.com", pass: "patient123", color: "text-emerald-400" },
              ].map((demo) => (
                <Link
                  key={demo.label}
                  href={`/login?email=${encodeURIComponent(demo.email)}&pass=${demo.pass}`}
                  className={`px-3 py-1.5 rounded-lg glass border border-slate-700/50 ${demo.color} hover:border-current/30 transition-all duration-200`}
                >
                  {demo.label}: {demo.email}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <section className="py-12 px-6 border-y border-slate-800/50">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "3", label: "Role Portals", icon: Users },
            { value: "AI", label: "Symptom Triage", icon: Brain },
            { value: "5min", label: "Slot Hold", icon: CalendarCheck },
            { value: "100%", label: "Async Notifications", icon: Bell },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <stat.icon className="w-6 h-6 text-brand-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-slate-400 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need, Built In
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              A complete, production-ready platform covering the full patient journey from
              booking to follow-up.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: CalendarCheck,
                title: "Smart Slot Booking",
                description:
                  "Atomic 5-minute slot holds prevent double-booking. Real-time availability with instant confirmation.",
                color: "text-brand-400",
                bg: "bg-brand-500/10 border-brand-500/20",
              },
              {
                icon: Brain,
                title: "AI Pre-Visit Triage",
                description:
                  "Gemini AI analyzes symptoms and assigns urgency levels (LOW/MEDIUM/HIGH) with suggested questions for doctors.",
                color: "text-purple-400",
                bg: "bg-purple-500/10 border-purple-500/20",
              },
              {
                icon: Stethoscope,
                title: "Doctor Portal",
                description:
                  "Daily schedule view, urgency badges, patient histories, and a full consultation record form.",
                color: "text-emerald-400",
                bg: "bg-emerald-500/10 border-emerald-500/20",
              },
              {
                icon: HeartPulse,
                title: "Post-Visit Summaries",
                description:
                  "AI converts clinical notes into plain-language patient summaries with clear medication schedules.",
                color: "text-rose-400",
                bg: "bg-rose-500/10 border-rose-500/20",
              },
              {
                icon: Bell,
                title: "Async Notifications",
                description:
                  "Redis + BullMQ queue with exponential backoff retries for emails, reminders, and calendar sync.",
                color: "text-amber-400",
                bg: "bg-amber-500/10 border-amber-500/20",
              },
              {
                icon: ShieldCheck,
                title: "Role-Based Access",
                description:
                  "Strict RBAC with Patient, Doctor, and Admin roles. Secure JWT sessions with NextAuth.js.",
                color: "text-cyan-400",
                bg: "bg-cyan-500/10 border-cyan-500/20",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className={`card-hover group`}
              >
                <div
                  className={`w-12 h-12 rounded-xl border ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portals CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-slate-800/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Three Portals, One Platform
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                role: "Patient",
                href: "/patient/dashboard",
                icon: Users,
                color: "from-emerald-500 to-teal-600",
                points: [
                  "Search & filter doctors",
                  "Book with symptom intake",
                  "View AI triage results",
                  "Track prescriptions",
                ],
              },
              {
                role: "Doctor",
                href: "/doctor/dashboard",
                icon: Stethoscope,
                color: "from-brand-500 to-blue-600",
                points: [
                  "Daily schedule timeline",
                  "Patient urgency badges",
                  "Suggested questions",
                  "Submit consultation notes",
                ],
              },
              {
                role: "Admin",
                href: "/admin/dashboard",
                icon: ShieldCheck,
                color: "from-purple-500 to-indigo-600",
                points: [
                  "Onboard doctors",
                  "Manage doctor leaves",
                  "View audit logs",
                  "System overview",
                ],
              },
            ].map((portal) => (
              <div key={portal.role} className="gradient-border overflow-hidden">
                <div
                  className={`h-2 bg-gradient-to-r ${portal.color}`}
                />
                <div className="p-6">
                  <portal.icon className="w-8 h-8 text-white mb-4" />
                  <h3 className="text-xl font-bold text-white mb-4">
                    {portal.role} Portal
                  </h3>
                  <ul className="space-y-2 mb-6">
                    {portal.points.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-slate-400 text-sm">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login"
                    className="btn-secondary w-full justify-center"
                  >
                    Go to {portal.role} Portal
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/50 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-brand-400" />
            <span className="text-slate-400 text-sm">
              HealthCare Manager — Built with Next.js, Prisma & AI
            </span>
          </div>
          <p className="text-slate-600 text-xs">
            Assignment Project — For educational use only. Not real medical advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
