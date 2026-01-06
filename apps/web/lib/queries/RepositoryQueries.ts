export const FIND_REPOSITORIES_BY_PROJECT_QUERY = `
  query FindRepositoriesByProjectId($projectId: ID!) {
    findRepositoriesByProjectId(projectId: $projectId) {
      id
      name
      icon
    }
  }
`;

export const FIND_ALL_USER_REPOSITORIES = `
query FindAllRepositories {
    findAllRepositories {
      id
      githubId
      nodeId
      name
      fullName
      description
      visibility
      repositoryUrl
      icon
      ownerLogin
      ownerType
      ownerAvatarUrl
      lastSyncedAt
      syncStatus
      syncError
      isArchived
      isDisabled
      isPrivate
      githubCreatedAt
      githubUpdatedAt
      githubPushedAt
      createdAt
      updatedAt
      archivedAt
    }
  }
`;

export const SYNC_REPOSITORIES_FROM_GITHUB = `
  mutation SyncRepositoriesFromGitHub($githubToken: String!) {
    syncRepositoriesFromGitHub(input: { githubToken: $githubToken })
  }
`;

export const ADD_REPOSITORIES_TO_PROJECT = `
  mutation AddRepositoriesToProject($projectId: ID!, $repositoryIds: [ID!]!) {
    addRepositoriesToProject(projectId: $projectId, repositoryIds: $repositoryIds)
  }
`;

export const REMOVE_REPOSITORY_FROM_PROJECT = `
  mutation RemoveRepositoryFromProject($projectId: ID!, $repositoryId: ID!) {
    removeRepositoryFromProject(projectId: $projectId, repositoryId: $repositoryId)
  }
`;