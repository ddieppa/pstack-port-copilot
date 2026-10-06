---
name: pstack-host
description: "Host contract for pstack on VS Code and GitHub Copilot. Use whenever a pstack skill mentions Task, AskQuestion, subagent_type, /loop, Cursor model slugs, ~/.cursor, or a .cursor/ path, or when you need another pstack skill the skill tool cannot find. Maps those onto the agent tool, the host question tool, the wake script, Copilot paths, and ~/.copilot/pstack-models.md."
---

> **Copilot host.** On VS Code or GitHub Copilot, invoke the `pstack-host` skill before any Cursor tool name, model slug, or `.cursor/` path in this file (Task, AskQuestion, /loop, subagent_type). The host skill wins.

# pstack host (VS Code and GitHub Copilot)

This skill wins over Cursor-only tool names in every other pstack skill and playbook. The engineering rules, playbooks, and principles stay as written.

If this session actually has Cursor's `Task` tool and `AskQuestion`, follow the skill text literally and ignore this file.

## Subagents

Spawn with the first tool that exists:

1. `agent` or `runSubagent` (VS Code)
2. `task` (Copilot CLI)

| Skill text | Agent to run | Fallback prompt adds |
| --- | --- | --- |
| `subagent_type: "poteto-agent"` | `poteto-agent` | Read `<root>/skills/poteto-mode/SKILL.md` and follow it. |
| `subagent_type: "Comment Sicko"` | `comment-sicko` | Read `<root>/agents/comment-sicko.md` and follow it. Report only. |
| `subagent_type: generalPurpose` | `poteto-worker` | nothing |

Use the agent only when the spawn tool lists it. Copilot CLI chats, including Copilot CLI chats inside VS Code, can offer only built-in types such as `general-purpose`. Then spawn `general-purpose` and start its prompt with "Invoke the pstack-host skill.", the fallback text with `<root>` written as an absolute path (see Skills and files), and then the task.

One call per worker. Parallel workers are several calls in the same turn. `run_in_background: true` means that. Do not wait for one worker before starting the next.

Pass file paths, never pasted file bodies. `readonly: true` means do not edit. `readonly: false` means full tools.

Review every worker's diff yourself. Do not pass a worker's summary through as the answer.

If neither spawn tool exists, do the work in this session and say you could not fan out.

Nested workers need the VS Code setting `chat.subagents.allowInvocationsFromSubagents`. If a spawn is rejected for that reason, say so once, then do the step in this session.

## Models

Read `~/.copilot/pstack-models.md` when a skill names a role. That file is the setup sheet `/setup-pstack` writes.

- `inherit-parent` and `auto` mean omit the model argument.
- A role with no line uses `inherit-parent`.
- Send a model only when this session lists that exact id. Cursor slugs such as `grok-4.6-fast-xhigh`, `claude-fable-5-1-thinking-max`, `gpt-5.6-sol-max`, and `claude-opus-5-thinking-xhigh` are not Copilot ids. If one is configured and this session does not list it, omit the model and continue. Do not stop the task to fix the slug.
- Panel roles (`arena runners`, `architect runners`, `interrogate reviewers`, `arena cross-judge pool`) are lists. One worker per entry. The list length is the panel size. A single `inherit-parent` entry is a panel of one on the parent model.

On Copilot CLI, `subagents.maxConcurrency` must be at least the panel size and `subagents.maxDepth` at least 2. If a panel is collapsed by that cap, say so.

## Questions

`AskQuestion` maps to the host's question tool: `askQuestions` in VS Code chat (`vscode_askQuestions`), `ask_user` in Copilot CLI. Pass the options the skill lists. If the tool takes one question per call, ask them in order. If neither tool exists, ask with one short numbered list and wait.

When a skill says the answer is observable, prototype or measure instead of asking. Do not invent a tool call.

## Wake loop

Cursor's `/loop` is not available. For a heartbeat, run this plugin's wake script in a background terminal and resume when it prints `PSTACK_WAKE`.

- Windows: `<root>/scripts/wake.ps1 -Seconds <n>`
- macOS and Linux: `<root>/scripts/wake.sh <n>`

`<root>` is the folder with `plugin.json` (see Skills and files). Default interval is 1800 seconds unless the playbook names another. Do not sleep in the foreground.

For CI, merges, and PR status, use `gh` and `<root>/skills/poteto-mode/scripts/watch-pr/watch-pr` as the playbook says. Do not replace an event watch with sleep.

`watch-pr` and `skills/poteto-mode/scripts/orch/orch.ts` need Bun, because they call `Bun.spawnSync`. Run `bun --version` first. Without Bun, watch with `gh pr checks <pr> --watch` and read state with `gh pr view <pr> --json state,mergeStateStatus,reviewDecision,statusCheckRollup`, and say `watch-pr` was unavailable. A `#!/usr/bin/env bun` shebang does nothing on Windows, so call `bun <script>` explicitly.

`skills/poteto-mode/scripts/worktree-audit.sh` and `skills/show-me-your-work/scripts/log.sh` need bash. On Windows use Git for Windows' `bash.exe`. `C:\Windows\System32\bash.exe` is WSL and sees `/mnt/<drive>` paths. With no usable bash, do the step by hand and say so. `check-plan.mjs` runs under plain `node`.

## Skills and files

The skill tool lists only `pstack-host` and `setup-pstack`. Every other pstack skill sets `disable-model-invocation: true`, as upstream does, so the skill tool reports it as not found. That is expected. Do not stop, and do not substitute a same-named skill from another plugin.

Open other pstack skills by path. The pstack root (`<root>`) is two directories above this file, which is `<root>/skills/pstack-host/SKILL.md`. Skill `X` is `<root>/skills/X/SKILL.md`. Markdown links inside any pstack file resolve against that file, not the open workspace.

If you do not know this file's path, use the path of any pstack file already in context. A `/pstack:poteto-mode` or `/poteto-mode` attachment carries one. Otherwise take the newest match for `*pstack*/*/skills/pstack-host/SKILL.md` under `%APPDATA%\Code\agentPlugins` or `~/.vscode/agent-plugins` (other editors and OSes: the editor's user-data `agentPlugins` folder), or for `skills/pstack-host/SKILL.md` under `~/.copilot/installed-plugins`. A folder listed in the VS Code setting `chat.pluginLocations` also works.

Bare paths in skill text are not links. `pstack/skills/...` means `<root>/skills/...`. In a skill or its playbooks, `playbooks/...`, `references/...`, and `scripts/...` sit under that skill's own folder, for example `<root>/skills/poteto-mode/scripts/watch-pr/watch-pr`. None of them is under the open workspace.

Do not search `~/.cursor`, `~/.agents/skills`, or the open repo for pstack copies. Plugin skills lose to a same-named skill in the workspace or in `~/.copilot/skills` and `~/.agents/skills`.

`create-skill` is not bundled. When a playbook tells you to author a skill, write a folder whose name matches the `name` field (lowercase, hyphens), with a `description` that says what it does and when to use it.

`deslop`, `control-cli`, and `control-ui` are not in this pack. For prose, use `unslop`. For comments, use `no-comments`. For proof, run the project's own tests or drive the app and read the real output. Do not claim a missing skill ran.

## Paths

Neither VS Code nor Copilot CLI reads `.cursor/`. A file a skill writes there never registers.

| Skill text | Copilot path |
| --- | --- |
| `.cursor/skills/<name>/` | `.github/skills/<name>/` |
| `~/.cursor/skills/<name>/` | `~/.copilot/skills/<name>/` |
| `~/.cursor/rules/*.mdc` | `~/.copilot/instructions/*.instructions.md` |

Project skills also load from `.agents/skills/` and `.claude/skills/`. When a skill looks for an existing project skill (a `verify-*` or `*-mode` skill), check all three folders plus `.cursor/skills/` for an older copy. Write new ones to `.github/skills/`.

In Copilot CLI chats inside VS Code, plugin slash commands carry the plugin name, so `/how` is `/pstack:how` and `/setup-pstack` is `/pstack:setup-pstack`. Use that form when you tell the user what to type there.

## Transcripts

Do not glob `~/.cursor/projects`. Use the conversation in front of you, the git branch, and only a transcript you can open for this workspace. Copilot CLI session state is under `~/.copilot`. VS Code chat sessions are under the editor's `User/workspaceStorage/*/chatSessions` for the current workspace. If you cannot find one, say so.

## Instructions file

Where a skill says "your instructions file" or the always-applied model rule, use `~/.copilot/pstack-models.md`. `/setup-pstack` also writes `~/.copilot/instructions/pstack-models.instructions.md`, which VS Code and Copilot CLI load into every chat.
