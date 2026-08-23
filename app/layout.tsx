import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | HealthCare Manager",
    default: "HealthCare Manager — Appointment & Follow-up System",
  },
  description:
    "Modern healthcare appointment scheduling, AI-powered triage, and medication follow-up management platform.",
  keywords: ["healthcare", "appointment", "doctor", "medical", "scheduling"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-surface-950 text-slate-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
