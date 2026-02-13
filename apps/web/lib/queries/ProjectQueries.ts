export const FIND_PROJECTS_BY_PROFILE_QUERY = `
  query FindProjectsByProfileId($profileId: ID!) {
    findProjectsByProfileId(profileId: $profileId) {
      id
      name
      description
      status
      icon
      ownerId
      createdAt
      updatedAt
      archivedAt
    }
  }
`;

export const CREATE_PROJECT = `
  mutation CreateProject($createProjectInput: CreateProjectInput!) {
    createProject(createProjectInput: $createProjectInput) {
      id
      name
      description
      status
      icon
    }
  }
`;

export const FIND_PROJECT_MEMBERS = `
  query FindProjectMembers($projectId: ID!) {
    findProjectMembers(projectId: $projectId) {
      profileId
      projectId
      role
      createdAt
      updatedAt
      profile {
        id
        email
        displayName
        avatarUrl
      }
    }
  }
`;

export const ADD_PROJECT_MEMBERS = `
  mutation AddProjectMembers($projectId: ID!, $profileIds: [ID!]!) {
    addProjectMembers(projectId: $projectId, profileIds: $profileIds) {
      profileId
      projectId
      role
      profile {
        id
        email
        displayName
        avatarUrl
      }
    }
  }
`;

export const REMOVE_PROJECT_MEMBER = `
  mutation RemoveProjectMember($projectId: ID!, $profileId: ID!) {
    removeProjectMember(projectId: $projectId, profileId: $profileId) {
      profileId
    }
  }
`;

export const SEARCH_PROFILES = `
  query SearchProfiles($query: String!) {
    searchProfiles(query: $query) {
      id
      email
      displayName
      avatarUrl
    }
  }
`;

export const ARCHIVE_PROJECT = `
  mutation ArchiveProject($projectId: ID!) {
    archiveProject(projectId: $projectId) {
      id
      status
    }
  }
`;

export const TRANSFER_PROJECT_OWNERSHIP = `
  mutation TransferProjectOwnership($projectId: ID!, $newOwnerId: ID!) {
    transferProjectOwnership(projectId: $projectId, newOwnerId: $newOwnerId) {
      id
      name
      ownerId
    }
  }
`;

export const UPDATE_PROJECT_MEMBER_ROLE = `
  mutation UpdateProjectMemberRole($projectId: ID!, $memberId: ID!, $role: ProjectRole!) {
    updateProjectMemberRole(projectId: $projectId, memberId: $memberId, role: $role) {
      profileId
      role
    }
  }
`;
