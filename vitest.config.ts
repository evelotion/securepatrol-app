import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Tes Playwright (e2e/*.e2e.ts) dijalankan lewat `npm run test:e2e`.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
