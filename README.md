# owlsey-testing

Playwright test suite that runs questions from `data/` against a live chatbot and writes responses to `output/`.

## Build and run

### Without Nix

1. Install [Bun](https://bun.sh)

2. Install dependencies:
   ```bash
   bun install
   ```

3. Install Playwright's Chromium browser:
   ```bash
   bunx playwright install chromium
   ```

4. Remove the `launchOptions` block from `src/playwright.config.ts` — the Nix store path won't exist on your machine:
   ```ts
   // delete this:
   launchOptions: {
     executablePath: "/nix/store/.../bin/chromium",
   },
   ```

5. Run the tests:
   ```bash
   bun test
   ```

Results are written to `output/responses-N.jsonl`, one JSON object per line:
```jsonl
{"question":"How do I reset my password?","response":"Click Forgot Password..."}
```
Failed test artifacts land in `output/error-outputs/`.

### With Nix

```bash
nix develop
bun install
bun test
```
