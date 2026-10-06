import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function fail(message) {
  errors.push(message);
}

const CURSOR_ONLY =
  /AskQuestion|subagent_type|~\/\.cursor|(?<![\w~])\.cursor\/|claude-fable|gpt-5\.6-sol-max|grok-4\.6-fast|claude-opus-5-thinking/;

function markdownFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((dirent) => {
    const path = join(dir, dirent.name);
    if (dirent.isDirectory()) return dirent.name === "node_modules" ? [] : markdownFiles(path);
    return dirent.name.endsWith(".md") ? [path] : [];
  });
}

const manifest = JSON.parse(readFileSync(join(root, "plugin.json"), "utf8"));
if (manifest.$schema !== "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json") {
  fail("plugin.json $schema is not Agent Plugins 1.0");
}
if (!/^[a-z0-9](?:[a-z0-9]|[.-](?![.-]))*[a-z0-9]$/.test(manifest.name) && manifest.name.length > 1) {
  fail(`plugin name is invalid: ${manifest.name}`);
}
if (manifest.name.length < 1 || manifest.name.length > 64) {
  fail("plugin name length");
}

const skillsDir = join(root, "skills");
const names = new Set();
for (const entry of readdirSync(skillsDir)) {
  const skillDir = join(skillsDir, entry);
  if (!statSync(skillDir).isDirectory()) continue;
  const skillFile = join(skillDir, "SKILL.md");
  let text;
  try {
    text = readFileSync(skillFile, "utf8");
  } catch {
    fail(`${entry}: missing SKILL.md`);
    continue;
  }
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    fail(`${entry}: missing frontmatter`);
    continue;
  }
  const frontmatter = match[1];
  const nameLine = frontmatter.match(/^name:\s*(.+)$/m);
  const name = nameLine ? nameLine[1].trim().replace(/^["']|["']$/g, "") : "";
  if (name !== entry) fail(`${entry}: name "${name}" does not match folder`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) fail(`${entry}: name is not kebab-case`);
  if (name.length > 64) fail(`${entry}: name longer than 64`);
  if (names.has(name)) fail(`${entry}: duplicate skill name`);
  names.add(name);
  if (!/^description:/m.test(frontmatter)) fail(`${entry}: missing description`);
  // VS Code reads `mode` as the legacy name of `agent`. On /<skill> it switches to a chat mode with
  // that name, and when none exists it drops the send without an error.
  const modeKey = frontmatter.match(/^(mode|agent):/m)?.[1];
  if (modeKey) fail(`${entry}: frontmatter "${modeKey}" makes VS Code drop /${name} sends`);
  const description = frontmatter.match(/^description:\s*(.*)$/m)?.[1] ?? "";
  if (description.length > 1024) fail(`${entry}: description is ${description.length} chars`);
  if (entry !== "pstack-host" && !/Copilot host\./.test(text)) {
    const cursorOnly = markdownFiles(skillDir).find((file) => CURSOR_ONLY.test(readFileSync(file, "utf8")));
    if (cursorOnly) fail(`${entry}: uses Cursor-only names or paths but SKILL.md has no Copilot host banner`);
  }
}

const rulesDir = join(root, "com.github.copilot", "rules");
for (const file of readdirSync(rulesDir)) {
  // The agent host loads plugin rules only with these suffixes and skips every other file.
  if (!file.endsWith(".instructions.md") && !file.endsWith(".mdc")) {
    fail(`rule ${file} is ignored: rename it to *.instructions.md`);
  }
}

const agentsDir = join(root, "com.github.copilot", "agents");
for (const file of readdirSync(agentsDir)) {
  if (!file.endsWith(".agent.md")) fail(`unexpected agent file ${file}`);
  const text = readFileSync(join(agentsDir, file), "utf8");
  if (!/^name:/m.test(text)) fail(`${file}: missing name`);
  if (!/^description:/m.test(text)) fail(`${file}: missing description`);
}

const required = [
  "skills/pstack-host/SKILL.md",
  "skills/poteto-mode/references/copilot-host.md",
  "scripts/wake.ps1",
  "scripts/wake.sh",
  "com.github.copilot/rules/pstack-host.instructions.md",
  ".github/plugin/marketplace.json",
];
for (const relative of required) {
  try {
    statSync(join(root, relative));
  } catch {
    fail(`missing ${relative}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`ok: ${names.size} skills, plugin ${manifest.name}@${manifest.version}`);
