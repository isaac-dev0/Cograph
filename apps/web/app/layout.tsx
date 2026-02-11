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

  let profile = null;

  if (user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/graphql`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              query: `query {
                findProfileByUserId(userId: "${user.id}") {
                  id userId email displayName avatarUrl job location
                }
              }`,
            }),
            cache: "no-store",
          }
        );
        const { data, errors } = await response.json();
        if (!errors) {
          profile = data.findProfileByUserId;
        }
      } catch {
        // Profile will be null; client-side sync will handle it.
      }
    }
  }

  return (
    <html className={`${geistSans.variable} ${geistMono.variable} ${geistSans.className}`} lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <UserProvider user={user} profile={profile}>
            <ProjectProvider>
              <RepositoryProvider>{children}</RepositoryProvider>
            </ProjectProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
