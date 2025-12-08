import type { Metadata } from "next";
import { Geist } from "next/font/google";
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
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Failed to load profile:", error);
    } else {
      profile = data;
    }
  }

  return (
    <html className={geistSans.className} lang="en" suppressHydrationWarning>
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
