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

export const ARCHIVE_REPOSITORY = `
  mutation ArchiveRepository($repositoryId: ID!) {
    archiveRepository(repositoryId: $repositoryId) {
      id
      isArchived
    }
  }
`;

export const ANALYSE_REPOSITORY = `
  mutation AnalyseRepository($repositoryId: ID!) {
    analyseRepository(repositoryId: $repositoryId) {
      id
      status
      repositoryId
      createdAt
      updatedAt
    }
  }
`;