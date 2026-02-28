import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import StatusProvider from "@/components/StatusProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Ashby Tracker",
  description: "Track and discover job opportunities from AshbyHQ",
};

const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('theme');
    var dark = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.add(dark ? 'dark' : 'light');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-paper text-ink min-h-dvh" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>
          <StatusProvider>
            <Header />
            <main className="container-main py-6">{children}</main>
          </StatusProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
