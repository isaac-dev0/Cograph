"use client";

import { createClient } from "@/lib/supabase/client";
import { graphqlRequest } from "@/lib/graphql/client";
import type { Profile } from "@/lib/interfaces/profile.interfaces";
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

    const syncProfile = async () => {
      try {
        const { data: { user: freshUser } } = await supabase.auth.getUser();
        if (!freshUser?.id) return;

        const displayName =
          freshUser.user_metadata?.full_name ||
          freshUser.user_metadata?.user_name ||
          freshUser.email!;

        const data = await graphqlRequest<{
          syncProfile: {
            id: string;
            userId: string;
            email: string;
            displayName: string;
            avatarUrl: string | null;
            createdAt: string;
            updatedAt: string;
          };
        }>(SYNC_PROFILE_MUTATION, {
          data: { userId: freshUser.id, email: freshUser.email!, displayName },
        });

        const synced = data.syncProfile;
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
        }
      } catch (error) {
        console.error("Failed to sync profile:", error);
      }
    };

    syncProfile();
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
