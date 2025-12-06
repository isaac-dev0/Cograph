"use client";

import { FIND_PROJECTS_BY_PROFILE_QUERY } from "@/lib/queries/ProjectQueries";
import { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@/hooks/providers/UserProvider";
import { createClient } from "@/lib/supabase/client";
import { Project } from "@/lib/shared/Project";

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  setCurrentProject: (project: Project) => void;
  isLoading: boolean;
  error: string | null;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { profile } = useUser();

  const loadProjects = async () => {
    if (!profile) {
      setIsLoading(false);
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
            query: FIND_PROJECTS_BY_PROFILE_QUERY,
            variables: { profileId: profile.id },
          }),
        }
      );

      const { data, errors } = await response.json();

      if (errors) {
        throw new Error("Failed to load projects:", errors[0]?.message);
      }

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
