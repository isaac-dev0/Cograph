"use client";

import { FIND_PROJECTS_BY_PROFILE_QUERY, ARCHIVE_PROJECT } from "@/lib/queries/ProjectQueries";
import { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@/hooks/providers/UserProvider";
import { graphqlRequest } from "@/lib/graphql/client";
import { Project } from "@/lib/interfaces/project.interfaces";

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  setCurrentProject: (project: Project) => void;
  isLoading: boolean;
  error: string | null;
  refreshProjects: () => Promise<void>;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
  archiveProject: (projectId: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState<boolean>(false);

  const { profile } = useUser();

  const loadProjects = async () => {
    if (!profile) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const data = await graphqlRequest<{ findProjectsByProfileId: Project[] }>(
        FIND_PROJECTS_BY_PROFILE_QUERY,
        { profileId: profile.id },
      );

      const fetchedProjects = data.findProjectsByProfileId;
      setProjects(fetchedProjects);

      const savedProjectId = localStorage.getItem("currentProjectId");
      const savedProject = fetchedProjects.find(
        (project: Project) => project.id === savedProjectId
      );

      const projectToSet = savedProject || fetchedProjects[0] || null;
      setCurrentProject(projectToSet);

      if (projectToSet) {
        localStorage.setItem("currentProjectId", projectToSet.id);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
      setError("Failed to load projects, please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const archiveProject = async (projectId: string) => {
    await graphqlRequest(ARCHIVE_PROJECT, { projectId });
    await loadProjects();
  };

  useEffect(() => {
    loadProjects();
  }, [profile?.id]);

  const handleSetCurrentProject = (project: Project) => {
    setCurrentProject(project);
    localStorage.setItem("currentProjectId", project.id);
  };

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        projects,
        setCurrentProject: handleSetCurrentProject,
        isLoading,
        error,
        refreshProjects: loadProjects,
        showArchived,
        setShowArchived,
        archiveProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
