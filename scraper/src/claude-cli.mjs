/**
 * Runs one prompt through the local Claude Code CLI (`claude -p`, the operator's Claude Code login, no API key),
 * without tools or project context, and returns the text answer. Used by the small helper scripts (titles, QCM).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { killTree } from "./util.mjs";

const CACHE_DIR = path.join(os.tmpdir(), "myschool-claude-cli");

export function askClaude(system, prompt, { model = "sonnet", timeoutMin = 20 } = {}) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const systemFile = path.join(CACHE_DIR, `system-${Buffer.from(system).length}-${hash(system)}.md`);
  if (!fs.existsSync(systemFile)) fs.writeFileSync(systemFile, system);
  const args = [
    "-p",
    "--output-format", "stream-json",
    "--verbose",
    "--system-prompt-file", JSON.stringify(systemFile),
    "--tools", '""',
    "--strict-mcp-config",
    "--no-session-persistence",
    "--model", model,
  ];
  return new Promise((resolve, reject) => {
    const env = { ...process.env, CLAUDE_CODE_MAX_OUTPUT_TOKENS: process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS || "64000" };
    const child = spawn("claude", args, { cwd: CACHE_DIR, shell: true, windowsHide: true, env });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      killTree(child);
      reject(new Error(`délai dépassé (${timeoutMin} min)`));
    }, timeoutMin * 60 * 1000);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error(`impossible de lancer claude : ${e.message}`));
    });
    child.on("close", () => {
      clearTimeout(timer);
      try {
        const events = out.split("\n").filter((l) => l.trim().startsWith("{")).map((l) => JSON.parse(l));
        const result = events.findLast((e) => e.type === "result");
        if (!result) throw new Error(`pas de résultat : ${(err || out).slice(0, 200)}`);
        if (result.is_error) throw new Error(`claude : ${String(result.result || result.subtype).slice(0, 200)}`);
        const text = events
          .filter((e) => e.type === "assistant")
          .map((e) => (e.message?.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join(""))
          .join("");
        resolve({ text: text || String(result.result || ""), cost: result.total_cost_usd || 0 });
      } catch (e) {
        reject(e);
      }
    });
    child.stdin.end(prompt);
  });
}

/** First JSON value found in a model answer (tolerates a ```json fence or a sentence around it). */
export function parseJson(text) {
  const fenced = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.search(/[[{]/);
  const end = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  return JSON.parse(raw.slice(start, end + 1));
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
