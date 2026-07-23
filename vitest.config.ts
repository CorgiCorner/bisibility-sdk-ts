import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      all: true,
      exclude: ["src/types.ts"],
      include: ["src/**/*.ts"],
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage/vitest",
      thresholds: {
        branches: 95,
        functions: 95,
        lines: 95,
        statements: 95,
      },
    },
    environment: "node",
    exclude: [...configDefaults.exclude, "test/integration/**"],
    globals: false,
  },
});
