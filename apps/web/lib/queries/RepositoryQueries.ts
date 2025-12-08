export const FIND_REPOSITORIES_BY_PROJECT_QUERY = `
  query FindRepositoriesByProjectId($projectId: ID!) {
    findRepositoriesByProjectId(projectId: $projectId) {
      id
      name
      icon
    }
  }
`;