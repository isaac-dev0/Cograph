"use client";

import { Profile } from "@/lib/shared/Profile";
import { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";

interface UserContextType {
  user: User | null;
  profile: Profile | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({
  user,
  profile,
  children,
}: {
  user: User | null;
  profile: Profile | null;
  children: React.ReactNode;
}) => {
  return (
    <UserContext.Provider value={{ user: user, profile: profile }}>
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
