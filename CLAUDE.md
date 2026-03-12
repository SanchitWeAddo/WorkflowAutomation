# CLAUDE.md — AI Assistant Guide for WorkflowAutomation

This file provides instructions and context for AI assistants (Claude Code and similar) working in this repository.

---

## Project Overview

**WorkflowAutomation** is a project aimed at automating workflows. As of the initial commit, the repository contains only a bare `README.md`. This `CLAUDE.md` establishes the conventions and structure that should be followed as the project grows.

---

## Repository Structure (Current State)

```
WorkflowAutomation/
├── README.md        # Project title only — to be expanded
└── CLAUDE.md        # This file
```

As the project evolves, the expected top-level layout is:

```
WorkflowAutomation/
├── CLAUDE.md                  # AI assistant guide (this file)
├── README.md                  # Human-facing project documentation
├── src/                       # Application source code
│   ├── workflows/             # Workflow definitions and orchestration logic
│   ├── tasks/                 # Individual task/step implementations
│   ├── triggers/              # Event triggers (cron, webhooks, file watchers, etc.)
│   ├── integrations/          # Third-party service integrations
│   └── utils/                 # Shared utilities and helpers
├── tests/                     # Test suite
│   ├── unit/
│   └── integration/
├── config/                    # Configuration files (non-secret)
├── docs/                      # Extended documentation
├── scripts/                   # Developer and CI/CD helper scripts
├── .github/                   # GitHub Actions workflows
└── package.json / pyproject.toml / go.mod  # (depends on chosen language)
```

> When the tech stack is decided, update this section with the actual structure.

---

## Git Workflow

### Branches

- `master` — stable, production-ready code. Do **not** push directly.
- `claude/<slug>` — AI-generated feature/fix branches. Always push to your assigned branch.
- `feature/<description>` — human-authored feature branches.
- `fix/<description>` — bug fix branches.

### Commit Style

Use concise, imperative commit messages:

```
Add webhook trigger for Slack events
Fix retry logic in HTTP task runner
Refactor workflow executor to use async/await
```

- One logical change per commit.
- Do not bundle unrelated changes.
- Reference issue numbers where applicable: `Fix #42 — handle empty payload`.

### Push Protocol

```bash
git push -u origin <branch-name>
```

- Claude branches **must** follow the pattern `claude/<slug>` — pushes to other branch names will fail.
- If a push fails due to a network error, retry with exponential backoff: 2 s → 4 s → 8 s → 16 s (max 4 retries).

---

## Development Conventions

### General Principles

- **Keep it simple.** Prefer readable, direct code over clever abstractions.
- **No premature abstraction.** Only extract a helper when the same logic is needed in three or more places.
- **Minimal dependencies.** Prefer standard library solutions; add third-party packages only when there is a clear, justified benefit.
- **No dead code.** Remove unused variables, functions, and imports rather than commenting them out.
- **No backwards-compatibility shims** for code that is not yet public/stable.

### Error Handling

- Validate at system boundaries (user input, external API responses, file reads).
- Do not add defensive guards for conditions that cannot occur given internal invariants.
- Propagate errors with enough context to diagnose the failure (include the operation name and relevant identifiers).

### Testing

- Write tests for all non-trivial logic before or alongside implementation.
- Unit tests live in `tests/unit/`, integration tests in `tests/integration/`.
- Tests must pass before any commit is pushed.
- Run the full test suite with:

  ```bash
  # (update this command once the stack is chosen)
  npm test         # Node.js
  pytest           # Python
  go test ./...    # Go
  ```

### Security

- Never commit secrets, tokens, or credentials. Use environment variables or a secrets manager.
- Validate and sanitize all external input.
- Avoid constructing shell commands from user-controlled data (command injection).
- Keep dependencies up to date; address known CVEs promptly.

---

## Environment Variables

Document all required and optional environment variables in a `.env.example` file at the project root. A `MISSING_ENV_VARS` check should run at application startup.

Example `.env.example` structure (to be created when the stack is chosen):

```
# Required
APP_ENV=development          # development | staging | production

# Integrations (add as needed)
SLACK_WEBHOOK_URL=
GITHUB_TOKEN=

# Optional
LOG_LEVEL=info               # debug | info | warn | error
```

---

## AI Assistant Instructions

When working in this repository, AI assistants should:

1. **Read before editing.** Always read the relevant file(s) before making changes.
2. **Stay on the assigned branch.** Only push to the `claude/<slug>` branch specified in the task.
3. **Make minimal, focused changes.** Fix exactly what was asked; do not refactor surrounding code unless explicitly requested.
4. **Do not add comments** to code you didn't change.
5. **Do not create new files** unless they are strictly necessary for the task.
6. **Do not add features** beyond what was requested.
7. **Run tests** before committing changes (once a test suite exists).
8. **Update this file** (`CLAUDE.md`) if the project structure, stack, or conventions change significantly.
9. **Update `README.md`** when new user-facing functionality is added.
10. **Never force-push** to `master` or any shared branch.

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `README.md` | High-level project description for humans |
| `CLAUDE.md` | This file — conventions for AI assistants |
| `.env.example` | Template for required environment variables (to be created) |
| `src/workflows/` | Core workflow definitions (to be created) |
| `.github/workflows/` | CI/CD pipeline definitions (to be created) |

---

## Updating This File

Keep `CLAUDE.md` current. Update it when:

- The technology stack is chosen or changed.
- New top-level directories are added.
- Build, test, or lint commands change.
- New environment variables become required.
- Coding conventions are agreed upon or modified.
