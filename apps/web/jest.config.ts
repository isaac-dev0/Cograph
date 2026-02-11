import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterFramework: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  collectCoverageFrom: [
    "components/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "!**/*.d.ts",
  ],
  coverageDirectory: "coverage",
};

export default createJestConfig(config);
