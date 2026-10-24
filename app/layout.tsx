import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { COPY } from "@/config/copy";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ToyoGo",
  description: "What your Toyota is worth, what it costs to drive, and the next move that fits.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</div>
          <footer className="mx-auto w-full max-w-5xl border-t border-line px-4 py-4 text-sm text-muted print:hidden">
            <p>{COPY.footer}</p>
            <p className="mt-1">{COPY.modelCredit}</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
