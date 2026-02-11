"use client";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/shared/Profile";
import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";

interface UserContextType {
  user: User | null;
  profile: Profile | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const SYNC_PROFILE_MUTATION = `
  mutation SyncProfile($data: SyncProfileInput!) {
    syncProfile(data: $data) {
      id
      userId
      email
      displayName
      avatarUrl
      createdAt
      updatedAt
    }
  }
`;

export const UserProvider = ({
  user,
  children,
}: {
  user: User | null;
  children: React.ReactNode;
}) => {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    const supabase = createClient();

    Promise.all([
      supabase.auth.getSession(),
      supabase.auth.getUser(),
    ]).then(([{ data: { session } }, { data: { user: freshUser } }]) => {
      if (!session?.access_token || !freshUser?.id) return;

      const displayName =
        freshUser.user_metadata?.full_name ||
        freshUser.user_metadata?.user_name ||
        freshUser.email!;

      fetch(`${process.env.NEXT_PUBLIC_API_URL}/graphql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          query: SYNC_PROFILE_MUTATION,
          variables: {
            data: {
              userId: freshUser.id,
              email: freshUser.email!,
              displayName,
            },
          },
        }),
      })
        .then((res) => res.json())
        .then((json) => {
          const synced = json.data?.syncProfile;
          if (synced) {
            setProfile({
              id: synced.id,
              user_id: synced.userId,
              email: synced.email,
              display_name: synced.displayName,
              avatar_url: synced.avatarUrl ?? null,
              created_at: synced.createdAt,
              updated_at: synced.updatedAt,
            });
          } else if (json.errors?.length) {
            console.error("Profile sync error:", json.errors[0]?.message);
          }
        })
        .catch((error) => {
          console.error("Failed to sync profile:", error);
        });
    });
  }, [user?.id]);

  return (
    <UserContext.Provider value={{ user, profile }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider.");
  }
  return context;
};
