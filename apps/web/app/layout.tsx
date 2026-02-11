import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { UserProvider } from "@/hooks/providers/UserProvider";
import { createClient } from "@/lib/supabase/server";
import { ProjectProvider } from "@/hooks/providers/ProjectProvider";
import "./globals.css";
import { RepositoryProvider } from "@/hooks/providers/RepositoryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cograph | Graph Repository for Software Teams",
  description: "The best way to view Git repositories for Software Teams.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html className={`${geistSans.variable} ${geistMono.variable} ${geistSans.className}`} lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <UserProvider user={user}>
            <ProjectProvider>
              <RepositoryProvider>{children}</RepositoryProvider>
            </ProjectProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
