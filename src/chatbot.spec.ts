import { test, expect } from "@playwright/test";
import { readFileSync, appendFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CHATBOT_URL = "https://www.fau.edu/ai/";

function loadQuestions(csvPath: string): string[] {
  return readFileSync(csvPath, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(1);
}

const questions = loadQuestions(
  resolve(__dirname, "../data/myfau-400-faq-questions.csv")
);
const OUTPUT_PATH = readFileSync(
  resolve(__dirname, "../output/.current-run"),
  "utf-8"
).trim();

for (const question of questions) {
  test(`chatbot: ${question.slice(0, 60)}`, async ({ page }) => {
    const record = (data: Record<string, unknown>) =>
      appendFileSync(
        OUTPUT_PATH,
        JSON.stringify({ question, ...data }) + "\n"
      );

    try {
      await page.goto(CHATBOT_URL, { waitUntil: "load" });

      await page.locator("#ivy-bot").click();

      const introBtn = page.getByRole("button", {
        name: "How can I help you? Click to open chatbot",
      });
      if (await introBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await introBtn.click();
      }

      const frame = page.frameLocator('iframe[title="Chatbot Frame"]');
      const input = frame.locator("textarea#chat-reply-textarea");
      await input.waitFor({ timeout: 20_000 });

      const responseLocator = frame.locator(
        '[role="article"][aria-label^="Chatbot said"]'
      );
      const countBefore = await responseLocator.count();

      await input.fill(question);

      const sendBtn = frame.locator("button#chat-reply-button");
      await expect(sendBtn).toBeEnabled({ timeout: 5_000 });
      await sendBtn.click();

      await expect
        .poll(() => responseLocator.count(), { timeout: 24_000 })
        .toBeGreaterThan(countBefore);

      let prev = "";
      for (let i = 0; i < 15; i++) {
        await page.waitForTimeout(800);
        const current = (await responseLocator.last().textContent()) ?? "";
        if (current.length > 0 && current === prev) break;
        prev = current;
      }

      const response = (await responseLocator.last().textContent()) ?? "";
      record({ response: response.trim() });
    } catch (err) {
      record({ error: err instanceof Error ? err.message : String(err) });
    }
  });
}
