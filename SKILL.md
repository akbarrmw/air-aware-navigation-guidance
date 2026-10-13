---
name: ecopulse-git-workflow
description: Enforces a consistent, feature-based Git workflow, strict permission boundaries, and commit SOP for EcoPulse team members and AI coding assistants.
---

# EcoPulse Git Workflow and Commit SOP

This document defines the official Git workflow, branch management standards, commit conventions, and operational boundaries for all EcoPulse team members and AI coding assistants.

---

## 1. Git Operation Permissions

### 1.1 Actions the AI is Permitted to Perform
- **Inspect Repository State:** Run read-only Git commands (`git status`, `git branch`, `git log`, `git diff`, `git rev-parse`).
- **Create Local Feature Branches:** Create local feature branches according to the approved naming convention when starting an authorized task.
- **Modify and Test Code:** Edit source files, configuration, and unit tests strictly within the authorized scope of the feature.
- **Selective Staging:** Stage specific, relevant files using explicit commands (`git add <file1> <file2>`), avoiding untracked secrets or unintended files.
- **Create Local Commits:** Create local Git commits *only* when explicitly requested or authorized by the human team member.
- **Report Results:** Report the resulting commit hash, commit message, modified files, and test results to the user.

### 1.2 Prohibited Actions (AI Must NEVER Execute)
- ❌ **`git push` is STRICTLY PROHIBITED.** The AI must never publish branches, push commits, or synchronize local branches with any remote repository.
- ❌ **`git pull` or `git fetch` with automated merge is STRICTLY PROHIBITED.** The AI must not initiate remote pulls that could alter local working states.
- ❌ **Never bypass through alternatives:** The AI must not use aliases, custom shell scripts, curl commands, GitHub CLI (`gh`), IDE automation plugins, or other tools to circumvent this rule.
- ❌ **No automated commit or push:** After completing an implementation, the AI must not automatically commit or push unless a local commit was explicitly commanded by the user. If not authorized, the AI must present the reviewed diff and recommend a commit message.
- ❌ **Explicit Declaration Required:** In every completed response, the AI must explicitly state: *"Remote push/pull was NOT performed by AI. All push operations must be executed manually by the human team member."*

> **Rationale:** All remote publishing must remain a deliberate human action performed under the individual team member's own GitHub credentials and responsibility.

---

## 2. Branch Naming Convention

Every new feature, bug fix, or documentation update must be developed in its own dedicated, isolated branch.

### Format
`feat/<feature-name>`

### Standard Prefixes
- `feat/<feature-name>`: New user-facing or system feature.
- `fix/<issue-name>`: Bug fix for existing functionality.
- `docs/<topic-name>`: Documentation-only changes (PRD, Code Spec, guides).
- `test/<topic-name>`: Adding or improving tests without functional changes.
- `refactor/<topic-name>`: Code restructuring without behavioral change.
- `chore/<topic-name>`: Maintenance, package updates, or configuration.

### Canonical Examples for EcoPulse
- `feat/air-quality-map`
- `feat/personal-exposure-estimation`
- `feat/route-optimization`
- `feat/exposure-history`
- `feat/route-comparison`
- `feat/exposure-recommendations`
- `fix/missing-station-readings`
- `docs/api-contracts`

### Branch Management Rules
1. **Lowercase and Hyphens:** Use lowercase English words separated only by hyphens (`-`).
2. **Descriptive:** The branch name must clearly represent the specific feature or issue being addressed.
3. **One Branch per Feature:** Never implement unrelated features in the same branch.
4. **No Arbitrary Fragmentation:** Do not create multiple branches for fragments of a single feature that cannot be independently reviewed or tested.
5. **No Automatic Merges:** Never merge feature branches into `main` automatically; merging is done through GitHub Pull Requests reviewed by the team.
6. **Pre-Branch Verification:**
   - Always run `git branch --show-current` and `git status`.
   - Check for uncommitted changes before creating or switching branches.
   - Never switch branches if uncommitted changes could be overwritten or mixed into another branch.
   - If the base branch or repository status is unclear, ask the human team member before proceeding.
7. **Existing Branches:** If the target feature branch already exists, inspect its log and working tree before reusing it. Never overwrite existing work.

---

## 3. Commit Message Convention

All commits must follow the **Conventional Commits** specification in English.

### Format
`<type>(<scope>): <imperative description>`

### Standard Types
- `feat`: Introduces a new feature or capability.
- `fix`: Resolves a bug or defect.
- `docs`: Documentation updates only.
- `test`: Adds or modifies test cases.
- `refactor`: Refactors code without changing functional behavior.
- `perf`: Code changes that improve runtime performance or latency.
- `style`: Formatting, whitespace, or linting fixes without code behavior changes.
- `build`: Changes to build systems, bundler, or dependencies.
- `ci`: Changes to CI/CD workflows or scripts.
- `chore`: Routine maintenance, parameter config, or project scaffolding.

### Approved Examples
- `feat(exposure): calculate personal pollution exposure`
- `feat(routing): compare alternative travel routes`
- `feat(map): display air quality markers`
- `fix(exposure): handle missing pollution readings`
- `fix(routing): validate route coordinates`
- `test(exposure): cover exposure calculation edge cases`
- `docs(api): document route comparison endpoint`
- `refactor(routing): extract route scoring logic`
- `chore(config): update environment example`

### Commit Integrity Rules
1. **English Only:** All commit messages must be written in clear English.
2. **Imperative Mood:** Use imperative, present tense phrasing after the colon (e.g., `calculate`, `add`, `fix`, `handle`, not `calculated` or `calculates`).
3. **Focused Changes:** Each commit must encompass exactly one logical change.
4. **No Vague Messages:** Messages such as `update`, `fix bug`, `changes`, `final`, `wip`, or `misc` are strictly prohibited.
5. **Honest Test Claims:** Never claim tests passed unless they were actually executed and verified in the current session.
6. **No History Rewriting:** Do not amend (`--amend`), rebase interactively, or delete existing commits without explicit human authorization.
7. **No Empty Commits:** Never create empty commits (`--allow-empty`).
8. **Feature Branch Direct:** Commit only to the task's dedicated feature branch, never directly to `main` without permission.

---

## 4. Feature Development Workflow

Every task executed by an AI assistant or human engineer must follow this structured 6-step lifecycle:

```
[Step 1: Understand] ➔ [Step 2: Branch] ➔ [Step 3: Implement]
                                                 │
[Step 6: Handover]   ▲ [Step 5: Commit] ◀ [Step 4: Test & Review]
```

### Step 1 — Understand the Task
- Read relevant sections of `PRD_EcoPulse_Hackathon.md`, `CODE_SPEC_EcoPulse.md`, and active source files.
- Establish: Feature objective, user story, acceptance criteria, in-scope vs out-of-scope boundaries, and file ownership.

### Step 2 — Create or Switch to Feature Branch
- Verify clean working directory: `git status`.
- Create or check out the feature branch:
  ```bash
  git checkout -b feat/<feature-name>
  ```
- Ensure no work from another branch is accidentally carried over.

### Step 3 — Implement the Feature
- Write clean, modular, and typed TypeScript code within the assigned folder ownership.
- Respect domain boundaries established in `CODE_SPEC_EcoPulse.md`:
  - **Person 1:** `src/lib/algorithms/`, `src/config/parameters.ts`, `tests/algorithms/`
  - **Person 2:** `src/lib/services/`, `src/lib/utils/`, `src/fixtures/`, `src/app/api/`
  - **Person 3:** `supabase/migrations/`, `src/lib/supabase/`, `src/app/{login,history,settings}/`
  - **Person 4:** `src/app/globals.css`, `src/app/{page,map,routes,methodology}/`, `src/components/`
- Include relevant unit tests and direct documentation. Do not bundle unrelated refactoring.

### Step 4 — Test and Review
- Run unit tests: `npm test` (or relevant test suite).
- Run build validation: `npm run build` if UI/API routes were modified.
- Review diff: `git diff`.
- Check:
  - Functional correctness against PRD acceptance criteria.
  - Zero accidental commits of secrets (`.env.local`, API keys).
  - Clean error handling following the standard API envelope (`{ success, data, error, meta }`).

### Step 5 — Local Commit (When Authorized)
- When explicitly requested by the user:
  1. Inspect `git status`.
  2. Selectively stage files: `git add <file1> <file2>`.
  3. Verify staged changes: `git diff --cached`.
  4. Create commit:
     ```bash
     git commit -m "feat(<scope>): <imperative message>"
     ```
  5. Retrieve commit hash: `git rev-parse --short HEAD`.

### Step 6 — Handover to the Human Team Member
- Provide a structured final report detailing:
  1. Task objective and summary of changes.
  2. List of modified files.
  3. Verification and test results.
  4. Branch name and local commit hash (if committed).
  5. The manual push command for the human team member.
     ```bash
     git push -u origin feat/<feature-name>
     ```
  6. **Explicit Notice:** State that the push command was NOT executed by the AI and must be run manually by the human.

---

## 5. Preventing Branch Bloat & Scope Creep

To maintain a clean, merge-conflict-free repository:
1. **Single Feature Scope:** One branch = one cohesive feature or bug fix.
   - Example `feat/air-quality-map`: Map UI, station markers, attribution, tests.
   - Example `feat/personal-exposure-estimation`: Exposure calculation formulas, IDW, tests.
   - Example `feat/route-optimization`: Route scoring, Pareto ranking, trade-off analysis.
   - *Do NOT combine map rendering and route ranking into one massive branch.*
2. **Handling Unrelated Discoveries:**
   - If an unrelated bug or necessary refactor is discovered during feature implementation:
     - Do not expand the scope of the current branch.
     - Document the issue in the handover notes under "Remaining issues / Follow-up tasks".
     - Finish the current feature cleanly.
     - Create a separate branch (e.g. `fix/...`) for the secondary issue.
3. **Preserving Teammate Work:**
   - Never overwrite, delete, or revert another team member's code to resolve conflicts without direct coordination.
   - Always adhere to the file ownership matrix in `CODE_SPEC_EcoPulse.md`.

---

## 6. Standard Final Response Template

Every task executed under this workflow must conclude with the following response block:

```markdown
**Task:** [Feature name or Issue description]

**Branch:** `feat/<feature-name>`

**Changes:**
- [Brief bullet point summary of implementation]
- [Files modified/created]

**Verification:**
- [Tests executed (e.g. npm test, vitest) and actual results: X passed]
- [Build check result: npm run build]
- [Any checks not executed and explicit reason]

**Commit:**
- [Commit hash and Conventional Commit message, OR "Not committed (awaiting user authorization)"]

**Remote status:**
- Push/pull NOT performed by AI (Strict permission policy).
- Manual action required: `git push -u origin feat/<feature-name>`

**Remaining issues:**
- [Known limitations, open questions from PRD, or recommended follow-up tasks]
```

---

## 7. Compliance Checklist

Before declaring any task complete, verify:
- [ ] Working branch follows the prescribed naming format (`feat/*`, `fix/*`, etc.).
- [ ] Changes are isolated to the authorized scope; unrelated files are untouched.
- [ ] Tests were executed and results reported with absolute accuracy.
- [ ] Commit message complies with Conventional Commits in English.
- [ ] No `git push` or `git pull` command was executed by the AI assistant.
- [ ] The manual push instruction was provided clearly for the human team member.
