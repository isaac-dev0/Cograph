"use client";

import { Repository } from "@/lib/interfaces/repository.interfaces";
import { createContext, useContext, useEffect, useState } from "react";
import { useProject } from "./ProjectProvider";
import { graphqlRequest } from "@/lib/graphql/client";
import { createClient } from "@/lib/supabase/client";
import {
  FIND_REPOSITORIES_BY_PROJECT_QUERY,
  FIND_ALL_USER_REPOSITORIES,
  SYNC_REPOSITORIES_FROM_GITHUB,
  REMOVE_REPOSITORY_FROM_PROJECT,
  ARCHIVE_REPOSITORY,
} from "@/lib/queries/RepositoryQueries";
import { useUser } from "./UserProvider";

interface RepositoryContextType {
  currentRepository: Repository | null;
  repositories: Repository[];
  accountRepositories: Repository[];
  setCurrentRepository: (repository: Repository | null) => void;
  isLoading: boolean;
  error: string | null;
  refreshRepositories: () => Promise<void>;
  refreshAccountRepositories: () => Promise<void>;
  syncRepositoriesFromGitHub: () => Promise<void>;
  removeRepositoryFromProject: (repositoryId: string) => Promise<void>;
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
  const [accountRepositories, setAccountRepositories] = useState<Repository[]>(
    [],
  );
  const [currentRepository, setCurrentRepository] = useState<Repository | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { currentProject } = useProject();
  const { user } = useUser();

  const loadRepositories = async () => {
    if (!currentProject) {
      setRepositories([]);
      setCurrentRepository(null);
      return;
    }

    try {
      setIsLoading(true);

      const data = await graphqlRequest<{
        findRepositoriesByProjectId: Repository[];
      }>(FIND_REPOSITORIES_BY_PROJECT_QUERY, { projectId: currentProject.id });

      const fetchedRepositories = data.findRepositoriesByProjectId || [];
      setRepositories(fetchedRepositories);

      const savedRepositoryId = localStorage.getItem(
        `currentRepositoryId-${currentProject.id}`,
      );
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
  }, [currentProject?.id]);

  useEffect(() => {
    setCurrentRepository(null);
  }, [currentProject?.id]);

  const loadAccountRepositories = async () => {
    if (!user) {
      setAccountRepositories([]);
      return;
    }

    try {
      setIsLoading(true);

      const data = await graphqlRequest<{ findAllRepositories: Repository[] }>(
        FIND_ALL_USER_REPOSITORIES,
        {},
      );

      const fetchedRepositories = data.findAllRepositories || [];
      setAccountRepositories(fetchedRepositories);
    } catch (error) {
      console.error("Failed to load account repositories:", error);
      setError("Failed to load account repositories, please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

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
      await loadAccountRepositories();
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
        if (currentProject) {
          localStorage.removeItem(`currentRepositoryId-${currentProject.id}`);
        }
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

    if (repository && currentProject) {
      localStorage.setItem(
        `currentRepositoryId-${currentProject.id}`,
        repository.id,
      );
    } else if (currentProject) {
      localStorage.removeItem(`currentRepositoryId-${currentProject.id}`);
    }
  };

  const removeRepositoryFromProject = async (repositoryId: string) => {
    if (!currentProject) {
      throw new Error("No project selected");
    }

    try {
      setIsLoading(true);
      setError(null);

      await graphqlRequest(REMOVE_REPOSITORY_FROM_PROJECT, {
        projectId: currentProject.id,
        repositoryId,
      });

      if (currentRepository?.id === repositoryId) {
        setCurrentRepository(null);
        localStorage.removeItem(`currentRepositoryId-${currentProject.id}`);
      }

      await loadRepositories();
    } catch (error) {
      console.error("Failed to remove repository from project:", error);
      setError(
        error instanceof Error ? error.message : "Failed to remove repository",
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RepositoryContext.Provider
      value={{
        currentRepository,
        repositories,
        accountRepositories,
        setCurrentRepository: handleSetCurrentRepository,
        isLoading,
        error,
        refreshRepositories: loadRepositories,
        refreshAccountRepositories: loadAccountRepositories,
        syncRepositoriesFromGitHub,
        removeRepositoryFromProject,
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
