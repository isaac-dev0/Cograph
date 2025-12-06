"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const getCallbackUrl = () => {
  const isLocal = process.env.NODE_ENV === "development";
  return isLocal
    ? "http://localhost:3000/auth/callback"
    : `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;
};

export async function loginWithGithub() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${getCallbackUrl()}?next=/app`,
    },
  });

  if (error) {
    console.error("GitHub OAuth error:", error);
    redirect("/auth/error");
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function loginWithGitlab() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "gitlab",
    options: {
      redirectTo: getCallbackUrl(),
    },
  });

  if (error) {
    console.error("GitLab OAuth error:", error);
    redirect("/auth/error");
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function loginWithBitbucket() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "bitbucket",
    options: {
      redirectTo: getCallbackUrl(),
    },
  });

  if (error) {
    console.error("Bitbucket OAuth error:", error);
    redirect("/auth/error");
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Sign out error:", error);
  }

  revalidatePath("/", "layout");
  redirect("/auth/login");
}
