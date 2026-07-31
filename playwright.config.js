import { defineConfig, devices } from "@playwright/test";

import {
  LOCAL_SUPABASE_URL,
  LOCAL_SUPABASE_ANON_KEY,
  LOCAL_SUPABASE_SERVICE_ROLE_KEY,
} from "./tests/testSupabase.js";

// unit: funciones puras, sin DB ni browser (extractTournamentId, etc).
// e2e: contra `next dev` + el stack local de Supabase (`supabase start`),
// nunca contra el proyecto remoto. Los tests de integracion con DB viven
// bajo tests/integration y corren en el project "unit" (no necesitan
// browser, solo el cliente de supabase-js contra 127.0.0.1).
export default defineConfig({
  fullyParallel: false,
  reporter: "list",
  projects: [
    {
      name: "unit",
      testDir: "./tests",
      testMatch: ["unit/**/*.test.js", "integration/**/*.test.js"],
    },
    {
      name: "e2e",
      testDir: "./tests/e2e",
      testMatch: "**/*.spec.js",
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000" },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATA_SOURCE: "supabase",
      NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL || LOCAL_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.SUPABASE_ANON_KEY || LOCAL_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY:
        process.env.SUPABASE_SERVICE_ROLE_KEY || LOCAL_SUPABASE_SERVICE_ROLE_KEY,
    },
  },
});
