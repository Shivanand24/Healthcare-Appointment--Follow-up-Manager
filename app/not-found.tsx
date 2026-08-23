import Link from "next/link";
import { HeartPulse, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-6">
        <HeartPulse className="w-8 h-8 text-brand-400" />
      </div>
      <h1 className="text-6xl font-bold gradient-text mb-4">404</h1>
      <p className="text-slate-400 text-lg mb-8">Page not found</p>
      <Link href="/" className="btn-primary">
        <Home className="w-4 h-4" />
        Back to Home
      </Link>
    </div>
  );
}
