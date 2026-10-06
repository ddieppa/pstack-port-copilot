---
name: setup-pstack
description: Configure which models pstack uses per role and at what reasoning budget. Detects models this session can actually name and writes ~/.copilot/pstack-models.md. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

> **Copilot host.** On VS Code or GitHub Copilot, invoke the `pstack-host` skill before any Cursor tool name in this file (Task, AskQuestion, /loop, subagent_type). The host skill wins.

# Setup pstack

Write `~/.copilot/pstack-models.md`. That sheet is what every pstack skill reads. Also mirror it into `~/.copilot/copilot-instructions.md` between the marker comments below, and write the same body to `~/.copilot/instructions/pstack-models.instructions.md` so VS Code keeps it in context.

On Cursor, if `AskQuestion` and the `Task` tool both exist, write `~/.cursor/rules/pstack-models.mdc` in the original always-applied shape instead and stop.

## Steps

### 1. Detect available models

List only model ids this session can pass to a subagent. Use a models listing from the host when one is in context. Otherwise ask the user to paste the ids from the VS Code model picker or from `copilot` `/model`. Never write a real id you have not confirmed. `inherit-parent` and `auto` are always valid. They are not model ids. Both mean omit the model argument so the worker uses the parent chat model.

### 2. Load current state

If `~/.copilot/pstack-models.md` exists, read it and treat its `# budget` line and role values as current. Otherwise start from the sheet in step 5. Every role there is `inherit-parent` until the user picks a confirmed id.

### 3. Budget, map, and confirm

Ask in one numbered list. Do not call `AskQuestion`.

**(a) Budget.** Offer these labels. With no sheet, say that `large` is the default:

- `unlimited`
- `large`
- `medium`
- `small`

Record the label. It does not invent ids. When the user later names a family, prefer the confirmed variant with the highest reasoning at or below the label's tier: `unlimited` up to `max`, `large` up to `xhigh`, `medium` up to `high`, `small` up to `medium`. A model that tops out at `xhigh` stays there under `unlimited`.

**(b) Roles.** Show every role with its current value. Mark any real id that is not in the detected set as needing a choice. Ask whether to accept the sheet or change specific roles. Offer the detected ids plus `inherit-parent` and `auto`.

Panel roles (`arena runners`, `architect runners`, `interrogate reviewers`, `arena cross-judge pool`) are lists. One worker runs per entry, so the list length is the panel size. A single `inherit-parent` is a panel of one. `arena cross-judge pool` is a list, and Arena picks one entry whose family differs from the parent when it can. `swarm workers` is the default model for every swarm worker unless a race names another.

### 4. Validate

Every real id must be in the detected set. `inherit-parent` and `auto` always pass. If a chosen id is not available, stop and ask again.

### 5. Write the sheet

Overwrite `~/.copilot/pstack-models.md` so re-runs stay idempotent. Shape:

```
# pstack model configuration. One line per role. Delete a line to fall back to inherit-parent.
# inherit-parent or auto: omit the subagent model. Alias entries in a panel list still count toward its fan-out.
# budget: large
feature, refactoring: inherit-parent
bug-fix: inherit-parent
perf-issue: inherit-parent
hillclimb: inherit-parent
judgment and prose: inherit-parent
hardest tasks: inherit-parent
how explorer: inherit-parent
how explainer: inherit-parent
why investigators: inherit-parent
why synthesizer: inherit-parent
reflect tooling: inherit-parent
reflect judgment, divergent, synthesizer: inherit-parent
arena runners: inherit-parent
arena cross-judge pool: inherit-parent
swarm workers: inherit-parent
architect runners: inherit-parent
interrogate reviewers: inherit-parent
```

Replace `inherit-parent` only where the user confirmed an id. Keep the `# budget` line equal to the chosen label.

Write `~/.copilot/instructions/pstack-models.instructions.md`:

```
---
description: pstack per-role model choices
applyTo: "**"
---
```

followed by the same body.

In `~/.copilot/copilot-instructions.md`, replace the region between `<!-- pstack:models:begin -->` and `<!-- pstack:models:end -->`, or append it if missing. Do not touch the rest of that file.

### 6. Confirm

Tell the user the sheet path and that new chats pick it up. Re-running this skill updates it.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, invoke `/create-verification-skill`. On no, move on.
