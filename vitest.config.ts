import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: "./tests/global-setup.ts",
    testTimeout: 15000,
    hookTimeout: 20000,
    // Route tests share one live server + database, so they must not run concurrently
    // against each other (e.g. two tests racing the same user's coin balance).
    fileParallelism: false,
  },
});
