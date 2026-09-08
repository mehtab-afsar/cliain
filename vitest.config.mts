import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // The real package throws when imported outside Next's "react-server" build condition,
      // which Vite/Vitest don't set — service files import it purely as a lint-time marker
      // ("don't import this from client code"), so a no-op stand-in is correct here.
      "server-only": new URL("./src/test/server-only-stub.ts", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // These are integration tests against one real shared Postgres instance, not pure unit
    // tests — running files concurrently lets unrelated Serializable transactions in different
    // files spuriously conflict with each other (Postgres's own predicate-locking false
    // positives, not a real bug), producing flaky failures unrelated to what each test
    // actually checks.
    fileParallelism: false,
  },
});
