import { mkdirSync, readdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function globalSetup() {
  const outputDir = resolve(__dirname, "../output");
  mkdirSync(outputDir, { recursive: true });
  const existing = readdirSync(outputDir)
    .filter((f) => /^responses-\d+\.jsonl$/.test(f))
    .map((f) => parseInt(f.match(/\d+/)?.[0] ?? "0", 10));
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 0;
  writeFileSync(
    resolve(outputDir, ".current-run"),
    resolve(outputDir, `responses-${next}.jsonl`)
  );
}
