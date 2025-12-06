export const FIND_PROJECTS_BY_PROFILE_QUERY = `
  query FindProjectsByProfileId($profileId: ID!) {
    findProjectsByProfileId(profileId: $profileId) {
      id
      name
      description
      status
      icon
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
