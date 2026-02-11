import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SYNC_PROFILE_MUTATION = `
  mutation SyncProfile($data: SyncProfileInput!) {
    syncProfile(data: $data) {
      id
    }
  }
`;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const error_description = searchParams.get("error_description");

  if (error) {
    console.error("OAuth callback error:", error, error_description);
    return NextResponse.redirect(
      `${origin}/auth/error?message=${error_description}`,
    );
  }

  let next = searchParams.get("next") ?? "/app";

  if (!next.startsWith("/")) {
    next = "/app";
  }

  if (code) {
    const supabase = await createClient();
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Session exchange error:", exchangeError);
      return NextResponse.redirect(
        `${origin}/auth/error?message=${exchangeError.message}`,
      );
    }

    if (!exchangeError && data.user && data.session) {
      const displayName =
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.user_name ||
        data.user.email!;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/graphql`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({
              query: SYNC_PROFILE_MUTATION,
              variables: {
                data: {
                  userId: data.user.id,
                  email: data.user.email!,
                  displayName,
                },
              },
            }),
          },
        );

        const json = await response.json();
        if (json.errors) {
          console.error("Profile sync error:", json.errors);
        }
      } catch (syncError) {
        console.error("Failed to sync profile:", syncError);
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
