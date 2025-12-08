"use client";

import { Repository } from "@/lib/shared/Repository";
import { createContext, useContext, useEffect, useState } from "react";
import { useProject } from "./ProjectProvider";
import { createClient } from "@/lib/supabase/client";
import { FIND_REPOSITORIES_BY_PROJECT_QUERY } from "@/lib/queries/RepositoryQueries";

interface RepositoryContextType {
  currentRepository: Repository | null;
  repositories: Repository[];
  setCurrentRepository: (repository: Repository | null) => void;
  isLoading: boolean;
  error: string | null;
  refreshRepositories: () => Promise<void>;
}

const RepositoryContext = createContext<RepositoryContextType | undefined>(
  undefined
);

export function RepositoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [currentRepository, setCurrentRepository] = useState<Repository | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { currentProject } = useProject();

  const loadRepositories = async () => {
    if (!currentProject) {
      setRepositories([]);
      setCurrentRepository(null);
      return;
    }

    try {
      setIsLoading(true);

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No active session");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/graphql`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            query: FIND_REPOSITORIES_BY_PROJECT_QUERY,
            variables: { projectId: currentProject.id },
          }),
        }
      );

      const { data, errors } = await response.json();

      if (errors) {
        throw new Error("Failed to load repositories:", errors[0]?.message);
      }

      const fetchedRepositories = data.findRepositoriesByProjectId || [];
      setRepositories(fetchedRepositories);

      const savedRepositoryId = localStorage.getItem(
        `currentRepositoryId-${currentProject.id}`
      );
      const savedRepository = fetchedRepositories.find(
        (repository: Repository) => repository.id === savedRepositoryId
      );

      if (savedRepository) {
        setCurrentRepository(savedRepository);
      }
    } catch (error) {
      console.error("Failed to load repositories:", error);
      setError("Failed to load repositories, please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRepositories();
  }, [currentProject?.id]);

  useEffect(() => {
    setCurrentRepository(null);
  }, [currentProject?.id]);

  const handleSetCurrentRepository = (repository: Repository | null) => {
    setCurrentRepository(repository);

    if (repository && currentProject) {
      localStorage.setItem(
        `currentRepositoryId-${currentProject.id}`,
        repository.id
      );
    } else if (currentProject) {
      localStorage.removeItem(`currentRepositoryId-${currentProject.id}`);
    }
  };

  return (
    <RepositoryContext.Provider
      value={{
        currentRepository,
        repositories,
        setCurrentRepository: handleSetCurrentRepository,
        isLoading,
        error,
        refreshRepositories: loadRepositories,
      }}
    >
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepository() {
  const context = useContext(RepositoryContext);
  if (context === undefined) {
    throw new Error("useRepository must be used within a RepositoryProvider");
  }
  return context;
}
