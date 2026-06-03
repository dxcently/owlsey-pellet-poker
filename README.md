# owlsey-testing

Automated QA suite for the FAU AI chatbot at [fau.edu/ai](https://www.fau.edu/ai/). It loads a CSV of questions, opens a real browser, navigates to the chatbot, submits each question one at a time, waits for a response, and saves the question/answer pair to a JSONL file for review.

---

## What it does

1. **Loads questions** from `data/myfau-400-faq-questions.csv` — a list of ~400 FAQ questions students might ask.

2. **Spins up a browser** using Playwright and navigates to `fau.edu/ai`.

3. **Opens the chatbot** by clicking the Ivy bot widget, then dismissing the intro prompt if it appears.

4. **Submits each question** by typing into the chat textarea inside the chatbot iframe and clicking send.

5. **Waits for a response** — polls for a new response bubble for up to 24 seconds. If nothing appears, the test fails and moves on.

6. **Detects when the bot stops typing** by sampling the response text every 800ms and stopping once it stabilizes.

7. **Writes the result** to `output/responses-N.jsonl` as a JSON object:
   ```jsonl
   {"question":"How do I reset my password?","response":"Click Forgot Password on the login page..."}
   ```
   Each run increments the file number so previous runs are never overwritten. Failed test artifacts (screenshots, traces) go to `output/error-outputs/`.

---

## Build and run

### Without Nix

**1. Install Bun**

Bun is the JavaScript runtime and package manager used by this project. Install it from [bun.sh](https://bun.sh):

```bash
curl -fsSL https://bun.sh/install | bash
```

**2. Install dependencies**

This pulls in Playwright and its type definitions:

```bash
bun install
```

**3. Install Playwright's Chromium browser**

Playwright manages its own browser binaries separately from your system browser. This downloads the Chromium build it needs:

```bash
bunx playwright install chromium
```

**4. Remove the Nix browser path from the config**

`src/playwright.config.ts` currently points to a Chromium binary in the Nix store, which won't exist on your machine. Open the file and delete the `launchOptions` block so Playwright falls back to its own downloaded binary:

```ts
// remove these 3 lines:
launchOptions: {
  executablePath: "/nix/store/.../bin/chromium",
},
```

**5. Run the tests**

```bash
bun test
```

Playwright will open a headless browser and work through all questions sequentially. Progress is printed to the terminal as each test passes or fails. Results are saved to `output/responses-N.jsonl` when complete.

---

### With Nix

The flake provides a pinned Bun and Chromium — no manual browser install or config edits needed.

```bash
nix develop
bun install
bun test
```
