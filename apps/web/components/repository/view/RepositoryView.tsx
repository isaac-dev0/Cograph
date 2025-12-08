import { Repository } from "@/lib/shared/Repository";

interface RepositoryViewProps {
  repository: Repository | null;
}

export function RepositoryView({ repository }: RepositoryViewProps) {
  return <h1>{repository?.name}</h1>;
}
