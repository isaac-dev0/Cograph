"use client";

import { Repository } from "@/lib/interfaces/repository.interfaces";
import { createContext, useContext, useEffect, useState } from "react";
import { graphqlRequest } from "@/lib/graphql/client";
import { createClient } from "@/lib/supabase/client";
import {
  FIND_ALL_USER_REPOSITORIES,
  SYNC_REPOSITORIES_FROM_GITHUB,
  ARCHIVE_REPOSITORY,
} from "@/lib/queries/RepositoryQueries";
import { useUser } from "./UserProvider";

interface RepositoryContextType {
  currentRepository: Repository | null;
  repositories: Repository[];
  setCurrentRepository: (repository: Repository | null) => void;
  isLoading: boolean;
  error: string | null;
  refreshRepositories: () => Promise<void>;
  syncRepositoriesFromGitHub: () => Promise<void>;
  archiveRepository: (repositoryId: string) => Promise<void>;
}

const RepositoryContext = createContext<RepositoryContextType | undefined>(
  undefined,
);

export function RepositoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [currentRepository, setCurrentRepository] = useState<Repository | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useUser();

  const loadRepositories = async () => {
    if (!user) {
      setRepositories([]);
      return;
    }

    try {
      setIsLoading(true);

      const data = await graphqlRequest<{ findAllRepositories: Repository[] }>(
        FIND_ALL_USER_REPOSITORIES,
        {},
      );

      const fetchedRepositories = data.findAllRepositories || [];
      setRepositories(fetchedRepositories);

      const savedRepositoryId = localStorage.getItem("currentRepositoryId");
      const savedRepository = fetchedRepositories.find(
        (repository: Repository) => repository.id === savedRepositoryId,
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
  }, [user?.id]);

  const syncRepositoriesFromGitHub = async () => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No active session");
      }

      const githubIdentity = user.identities?.find(
        (identity) => identity.provider === "github",
      );

      if (!githubIdentity) {
        throw new Error("GitHub account not connected");
      }

      const githubToken = session.provider_token;

      if (!githubToken) {
        throw new Error(
          "GitHub token not found in session. Please log out and log back in.",
        );
      }

      await graphqlRequest(SYNC_REPOSITORIES_FROM_GITHUB, { githubToken });
      await loadRepositories();
    } catch (error) {
      console.error("Failed to sync repositories:", error);
      setError(
        error instanceof Error ? error.message : "Failed to sync repositories",
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const archiveRepository = async (repositoryId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await graphqlRequest(ARCHIVE_REPOSITORY, { repositoryId });

      if (currentRepository?.id === repositoryId) {
        setCurrentRepository(null);
        localStorage.removeItem("currentRepositoryId");
      }

      await loadRepositories();
    } catch (error) {
      console.error("Failed to archive repository:", error);
      setError(
        error instanceof Error ? error.message : "Failed to archive repository",
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetCurrentRepository = (repository: Repository | null) => {
    setCurrentRepository(repository);

    if (repository) {
      localStorage.setItem("currentRepositoryId", repository.id);
    } else {
      localStorage.removeItem("currentRepositoryId");
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
        syncRepositoriesFromGitHub,
        archiveRepository,
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
