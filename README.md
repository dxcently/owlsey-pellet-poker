# owlsey-testing

Playwright test suite for chatbot QA. Reads questions from a CSV, runs them against a live chatbot, and writes responses to `output/responses.jsonl`.

## Prerequisites

The `flake.nix` provides Bun and Chromium. Enter the dev shell first:

```bash
nix develop
```

---

## 1. Initialize the project

```bash
bun init -y
bun add -d @playwright/test
```

Then add a `test` script to `package.json`:

```json
{
  "scripts": {
    "test": "playwright test"
  }
}
```

---

## 2. Playwright config

Create `src/playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  globalSetup: "./global-setup.ts",
  outputDir: "../output/error-outputs",
  timeout: 120_000,
  workers: 1,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    launchOptions: {
      executablePath: "/nix/store/i7spvxzkwv2xs0j6n2k8lwjs1k6b7mab-chromium-147.0.7727.101/bin/chromium",
    },
  },
});
```

### What `executablePath` does

By default Playwright downloads and manages its own browser binaries. `executablePath` overrides that — Playwright will launch the binary at the given path instead of its bundled one. This is necessary inside a Nix dev shell because Playwright's downloaded Chromium won't run (wrong dynamic linker paths), but the Nix-provided Chromium is already patched correctly for the system. If you update the Nix flake and the Chromium store path changes, update this value to match.

---

## 3. Questions file

Place a CSV in `data/` — one question per row, with a header row. The script skips the first line automatically:

```
question
What is the return policy?
How do I reset my password?
Can I speak to a human agent?
```

---

## 4. The test script

Create `src/chatbot-test.ts`. The script:

1. Reads `questions.txt`
2. For each question: navigates to the chatbot, types the question, waits for a response
3. Appends each result to `responses.jsonl`

```ts
import { test } from "@playwright/test";
import { appendFileSync, readFileSync, writeFileSync } from "fs";

const CHATBOT_URL = process.env.CHATBOT_URL ?? "https://example.com/chat";

// Selectors — YOU MUST TUNE THESE for your specific chatbot
const INPUT_SELECTOR = 'textarea[placeholder*="message"]';
const SEND_SELECTOR = 'button[aria-label="Send"]';
const RESPONSE_SELECTOR = ".bot-message:last-child"; // last bot bubble

const questions = readFileSync("questions.txt", "utf-8")
  .split("\n")
  .map((q) => q.trim())
  .filter(Boolean);

// Clear output file at start
writeFileSync("responses.jsonl", "");

for (const question of questions) {
  test(`Q: ${question}`, async ({ page }) => {
    await page.goto(CHATBOT_URL);

    await page.waitForSelector(INPUT_SELECTOR);
    await page.fill(INPUT_SELECTOR, question);
    await page.click(SEND_SELECTOR);

    await page.waitForSelector(RESPONSE_SELECTOR);
    await page.waitForTimeout(2000);

    const response = await page.textContent(RESPONSE_SELECTOR) ?? "";

    appendFileSync(
      "responses.jsonl",
      JSON.stringify({ question, response }) + "\n",
    );
  });
}
```

---

## 5. Finding the right selectors

1. Open the chatbot in your browser
2. Open DevTools → Inspector (F12)
3. Click the input box → note its tag/attributes (e.g. `textarea`, `input`, `role="textbox"`)
4. Click the send button → note its tag/attributes
5. Send a test message manually → inspect the response bubble element

Common patterns:

| Element      | Common selectors                                                        |
| ------------ | ----------------------------------------------------------------------- |
| Input        | `textarea`, `input[type=text]`, `[role=textbox]`                        |
| Send button  | `button[type=submit]`, `[aria-label*="send" i]`, `[data-testid="send"]` |
| Bot response | `.bot-message`, `[data-role="bot"]`, `.assistant`, `[aria-live]`        |

Update `INPUT_SELECTOR`, `SEND_SELECTOR`, and `RESPONSE_SELECTOR` accordingly.

---

## 6. Build and run

### With Nix (recommended)

```bash
# Enter the dev shell (first time pulls from cache, ~1 min)
nix develop

# Install JS dependencies
bun install

# Run tests
bun test
```

### Without Nix

You need [Bun](https://bun.sh) installed manually. Remove `launchOptions.executablePath` from `playwright.config.ts` and install Playwright's own Chromium:

```bash
bun install
bunx playwright install chromium
bun test
```

> Without Nix, the Nix store path in `executablePath` won't exist. Remove it and let Playwright use its own managed binary.

### Output

Results are written to `output/responses.jsonl`, one JSON object per line:

```jsonl
{"question":"What is the return policy?","response":"Our return window is 30 days..."}
{"question":"How do I reset my password?","response":"Click Forgot Password on the login page..."}
```

---

## Common issues

**Bot is still typing when we capture the response**\
Increase `waitForTimeout` or poll until the text stops changing:

```ts
await page.waitForFunction(
  (sel) => {
    const el = document.querySelector(sel);
    return el && el.textContent && el.textContent.length > 0;
  },
  RESPONSE_SELECTOR,
);
```

**Chatbot requires login**\
Add before the question loop:

```ts
await page.goto("https://your-chatbot.com/login");
await page.fill("#email", process.env.CHATBOT_EMAIL!);
await page.fill("#password", process.env.CHATBOT_PASSWORD!);
await page.click("button[type=submit]");
await page.waitForNavigation();
```

**Chromium path is wrong after a Nix flake update**\
Run `nix develop` and check the new store path with `which chromium`, then update `executablePath` in `playwright.config.ts`.
