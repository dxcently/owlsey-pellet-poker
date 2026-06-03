import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  globalSetup: "./global-setup.ts",
  timeout: 120_000,
  workers: 1,
  reporter: "line",
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: "off",
    video: "off",
    trace: "off",
    launchOptions: {
      executablePath: "/nix/store/i7spvxzkwv2xs0j6n2k8lwjs1k6b7mab-chromium-147.0.7727.101/bin/chromium",
    },
  },
});
