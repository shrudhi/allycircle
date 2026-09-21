import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { JobsPoller } from "@/components/jobs-poller";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AllyCircle — Your network. Your prep team.",
  description:
    "Find peers in your field, sync schedules, and run mock interviews together.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plusJakarta.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <JobsPoller />
          {children}
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
