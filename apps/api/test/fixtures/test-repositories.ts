export interface TestRepository {
  name: string;
  url: string;
  description: string;
  expectedFileCount: { min: number; max: number };
  expectedFileTypes: string[];
}

/**
 * Small TypeScript/JavaScript repository for basic testing.
 * is-number is a simple, stable package with few files.
 */
export const SMALL_TS_REPO: TestRepository = {
  name: 'small-ts-test',
  url: 'https://github.com/jonschlinkert/is-number',
  description: 'Small TypeScript/JavaScript package for testing basic analysis',
  expectedFileCount: { min: 1, max: 15 },
  expectedFileTypes: ['typescript', 'javascript'],
};

/**
 * Alternative small repo for concurrent testing.
 * kind-of is another simple utility package.
 */
export const SMALL_TS_REPO_ALT: TestRepository = {
  name: 'small-ts-alt-test',
  url: 'https://github.com/jonschlinkert/kind-of',
  description: 'Small JavaScript package for concurrent testing',
  expectedFileCount: { min: 1, max: 15 },
  expectedFileTypes: ['javascript'],
};

/**
 * Medium-sized repository with mixed JS/TS files.
 * chalk is a popular terminal string styling library.
 */
export const MIXED_LANG_REPO: TestRepository = {
  name: 'mixed-lang-test',
  url: 'https://github.com/chalk/chalk',
  description: 'Repository with mixed JavaScript and TypeScript files',
  expectedFileCount: { min: 3, max: 50 },
  expectedFileTypes: ['javascript', 'typescript'],
};

/**
 * Large repository for performance testing.
 * date-fns has many utility functions across multiple files.
 */
export const LARGE_REPO: TestRepository = {
  name: 'large-test',
  url: 'https://github.com/date-fns/date-fns',
  description: 'Large JavaScript/TypeScript utility library with 100+ files',
  expectedFileCount: { min: 100, max: 2000 },
  expectedFileTypes: ['typescript', 'javascript'],
};

/**
 * Invalid repository URL for error testing.
 * This repository should not exist.
 */
export const INVALID_REPO: TestRepository = {
  name: 'invalid-test',
  url: 'https://github.com/nonexistent-org-12345/nonexistent-repo-67890',
  description: 'Non-existent repository for error testing',
  expectedFileCount: { min: 0, max: 0 },
  expectedFileTypes: [],
};

/**
 * Malformed URL for error testing.
 */
export const MALFORMED_URL_REPO: TestRepository = {
  name: 'malformed-url-test',
  url: 'not-a-valid-url',
  description: 'Malformed URL for error testing',
  expectedFileCount: { min: 0, max: 0 },
  expectedFileTypes: [],
};
