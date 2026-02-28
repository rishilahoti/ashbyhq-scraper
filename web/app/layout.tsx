import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import StatusProvider from "@/components/StatusProvider";

export const metadata: Metadata = {
  title: "Ashby Tracker",
  description: "Track and discover job opportunities from AshbyHQ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-paper text-ink min-h-dvh" suppressHydrationWarning>
        <StatusProvider>
          <Header />
          <main className="container-main py-6">{children}</main>
        </StatusProvider>
      </body>
    </html>
  );
}
