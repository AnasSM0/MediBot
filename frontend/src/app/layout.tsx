import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { Providers } from "@/components/providers";
import { DisclaimerBanner } from "@/components/layout/disclaimer-banner";
import { TopNav } from "@/components/layout/top-nav";
import { OfflineIndicator } from "@/components/layout/OfflineIndicator";
import { ThemeScript } from "@/components/theme/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MediBot | Your AI Medical Companion",
  description:
    "MediBot helps you triage symptoms safely and quickly. Receive natural remedy ideas, over-the-counter suggestions, and guidance on when to seek urgent care.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${inter.variable} font-sans`}>
        <ThemeScript />
        <Providers>
          <OfflineIndicator />
          <div className="flex min-h-screen flex-col">
            <TopNav />
            <main className="flex-1 overflow-hidden">{children}</main>
            <DisclaimerBanner />
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
