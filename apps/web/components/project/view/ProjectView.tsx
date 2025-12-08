import { Project } from "@/lib/shared/Project";

interface ProjectViewProps {
  project: Project | null;
}

export function ProjectView({ project }: ProjectViewProps) {
  return <h1>{project?.name}</h1>;
}
