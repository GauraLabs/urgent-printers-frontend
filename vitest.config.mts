import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: [
      // revalidatePath needs a Next request scope; tests assert on a recording stub.
      { find: /^next\/cache$/, replacement: path.resolve(__dirname, "tests/stubs/next-cache.ts") },
      // Node's ESM resolver needs the extension next's CJS entry point omits.
      { find: /^next\/server$/, replacement: "next/server.js" },
      { find: /^@\//, replacement: `${path.resolve(__dirname)}/` },
    ],
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    css: false,
  },
});
