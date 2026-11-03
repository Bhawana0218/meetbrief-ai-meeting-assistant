import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MeetBriefProvider } from "@/components/meetbrief-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeetBrief — Better meetings, clearer follow-through",
  description: "Meeting notes, searchable transcripts, decisions, and next steps in one calm workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <MeetBriefProvider>{children}</MeetBriefProvider>
      </body>
    </html>
  );
}
