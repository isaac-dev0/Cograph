"use client";

import { User } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

const UserContext = createContext<User | null>(null);

export const UserProvider = ({
  value,
  children,
}: {
  value: User | null;
  children: React.ReactNode;
}) => <UserContext.Provider value={value}>{children}</UserContext.Provider>;

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider.");
  }
  return context;
};
