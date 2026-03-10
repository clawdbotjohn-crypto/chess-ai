# Chess Ai — Orchestrator Guide

**Project:** projects/chess-ai/
**Created:** 2026-02-25
**Platform:** web
**Has UI:** yes

---

## Mode Detection

Check the project state and act accordingly:

1. **If `docs/REQUIREMENTS.md` does NOT exist** → Run **Planning Mode** (below)
2. **If `docs/REQUIREMENTS.md` exists but `TASKS.md` does NOT** → Planning is incomplete; resume from where it stopped (check which phase artifacts exist)
3. **If `TASKS.md` exists AND has incomplete tasks** → Run **Build Mode** (see bottom of this file)
4. **If all tasks in `TASKS.md` are complete** → Post completion summary and exit

### How to Detect Incomplete Planning

Check which files exist to determine where to resume:
- `docs/REQUIREMENTS.md` missing → Start at Phase 1
- `research/tech-stack.md` missing → Start at Phase 2
- `docs/DECISIONS.md` missing → Start at Phase 3
- `design/STYLE-GUIDE.md` missing AND project has UI → Start at Phase 4
- `TASKS.md` missing → Start at Phase 5
- `research/feasibility.md` missing → Start at Phase 5b

---

## Planning Mode

You are planning a new project. Follow these phases **IN ORDER**. Do not skip ahead. Write progress to `PROGRESS.md` after each phase completes.

### Phase 1: Requirements (~10 min)

**Who:** You (the orchestrator). Do NOT spawn a subagent for this.

1. Read `docs/BRIEF.md` for John's original idea
2. Expand into structured requirements:
   - Identify target users (primary and secondary)
   - Write user stories with acceptance criteria (GIVEN/WHEN/THEN format)
   - Define scope boundaries:
     - **In Scope (MVP)** — what we're building first
     - **Future (Post-MVP)** — planned but not now
     - **Out of Scope (No-Gos)** — explicitly excluded and why
   - Note constraints (budget, tech, timeline)
3. Write `docs/REQUIREMENTS.md` following the template format in `templates/project-planning/REQUIREMENTS-TEMPLATE.md`
4. Update `PROGRESS.md`: "Phase 1 complete — REQUIREMENTS.md written"

**Quality check before moving on:**
- At least 3 user stories with acceptance criteria
- Clear scope boundaries (in/out)
- Constraints documented

---

### Phase 2: Technology Research (~15 min)

**Who:** Researcher subagent (spawned by you).

1. Spawn a researcher subagent with this prompt:

```
Research the best tech stack for the project "Chess Ai".

Read these files for context:
- projects/chess-ai/docs/REQUIREMENTS.md (what we're building)
- projects/chess-ai/docs/BRIEF.md (constraints and preferences)

Research and recommend:
- Frontend framework (with rationale)
- Backend approach (serverless vs server, which service)
- Database (Supabase? Firebase? Azure SQL? etc.)
- Hosting platform (Azure preferred — evaluate alternatives)
- UI component library (if applicable)
- Icon library (if applicable)
- Authentication approach
- Any other relevant tooling (state management, testing, CI/CD)

For EACH recommendation, provide:
- Why this over alternatives (concrete reasons)
- Cost (free tier details, pricing at scale)
- Compatibility with existing stack (Supabase, Expo, Azure)
- Known gotchas or limitations

Save your complete analysis to: projects/chess-ai/research/tech-stack.md
```

   - **Thinking:** high
   - **Timeout:** 900 seconds (15 min)

2. Wait for researcher to complete
3. Read `research/tech-stack.md` and verify it has substantive recommendations
4. **If researcher failed or produced thin output:** Retry once with a more specific prompt. If still fails, proceed to Phase 3 using your own knowledge + brief web searches.
5. Update `PROGRESS.md`: "Phase 2 complete — tech-stack.md written by researcher"

---

### Phase 3: Architecture Decisions (~10 min)

**Who:** You (the orchestrator). Do NOT spawn a subagent for this.

1. Read `research/tech-stack.md`
2. Make concrete decisions based on the research. For each decision, document:
   - **Context** — What problem requires this decision?
   - **Decision** — What we chose
   - **Rationale** — Why (reference the research)
   - **Alternatives Considered** — What we didn't choose and why
3. Write `docs/DECISIONS.md` following the template in `templates/project-planning/DECISIONS-TEMPLATE.md`
4. Include at minimum:
   - ADR-001: Tech Stack (frontend, backend, database, auth)
   - ADR-002: Hosting & Deployment (with cost estimate table)
   - ADR-003: Project Structure (monorepo vs multi-repo, folder layout)
   - Additional ADRs as needed for significant choices
5. **Scaffold the project** (if appropriate at this stage):
   - Run framework init commands (e.g., `npx create-expo-app`, `npm init`)
   - Set up initial project structure
   - Install core dependencies
   - Create initial git commit
6. Update `PROGRESS.md`: "Phase 3 complete — DECISIONS.md written, project scaffolded"

---

### Phase 4: Design (~25 min) — CONDITIONAL

**Skip this phase entirely if:**
- The project has no user-facing UI (`yes` is "no")
- The project is a CLI tool, backend service, or internal script
- BRIEF.md explicitly says "no design needed"

**Who:** Designer subagent (spawned by you).

1. Spawn a designer subagent with this prompt:

```
Design the UI for "Chess Ai".

Read these files for context:
- projects/chess-ai/docs/REQUIREMENTS.md (what we're building, user stories)
- projects/chess-ai/docs/DECISIONS.md (tech stack — affects what's feasible)

Tech stack: [INSERT FROM DECISIONS.md — e.g., "React Native with Expo, NativeWind for styling"]

Your tasks:
1. Research 3-5 competitor/similar apps for inspiration
2. Create 2-3 style directions (different visual approaches)
3. For each direction, generate mockups of key screens:
   - Home / main screen
   - Primary feature screen
   - Detail view
   - Settings or profile (if applicable)
4. Write a clear recommendation for which direction to use and why
5. Create a developer-ready style guide with:
   - Color palette (hex values)
   - Typography scale
   - Spacing system
   - Component patterns

Save all artifacts to: projects/chess-ai/design/
- Mockups: design/mockups/direction-1/, direction-2/, etc.
- Style guide: design/STYLE-GUIDE.md
- Presentation for John: design/PRESENTATION.md
```

   - **Thinking:** medium
   - **Timeout:** 1800 seconds (30 min)

2. Wait for designer to complete
3. Verify output exists: `design/PRESENTATION.md` and `design/STYLE-GUIDE.md`
4. **If designer failed:** Proceed without design. Note in TASKS.md: "Design phase skipped — needs separate design session"
5. Update `PROGRESS.md`: "Phase 4 complete — design artifacts generated"

---

### Phase 5: Task Breakdown (~10 min)

**Who:** You (the orchestrator). Do NOT spawn a subagent for this.

1. Read ALL planning artifacts:
   - `docs/REQUIREMENTS.md`
   - `docs/DECISIONS.md`
   - `design/STYLE-GUIDE.md` (if exists)
   - `research/tech-stack.md`
2. Break requirements into implementation phases:
   - **Phase 1: Foundation** — Project setup, auth, database schema, CI/CD
   - **Phase 2: Core Features** — The main user stories (MVP)
   - **Phase 3: Polish & UX** — UI refinement, error handling, edge cases, design system adherence
   - **Phase 4: Launch Prep** — Testing, deployment, documentation
3. Within each phase, create sized tasks:
   - **Task ID:** T-001, T-002, etc.
   - **Size:** XS (2-5 min) / S (5-15 min) / M (15-30 min) / L (30-60 min)
   - **Linked requirement:** US-001, etc.
   - **Dependencies:** Which tasks must complete first
   - **Implementation notes:** Brief hints for the sub-worker who will implement this
4. Write `TASKS.md`
5. Update `PROGRESS.md`: "Phase 5 complete — TASKS.md written with N tasks across M phases"

**Task sizing guidance (for AI agents):**

| Size | Scope | Target Time |
|------|-------|-------------|
| XS | Config change, single file edit | 2-5 min |
| S | Single component or function | 5-15 min |
| M | Feature spanning 2-3 files | 15-30 min |
| L | Multi-file feature with tests | 30-60 min |
| XL | Must be broken down further | N/A — split it |

---

### Phase 5b: Feasibility & Risk Analysis (~10 min) — CONDITIONAL

**Skip if:** The project is very simple (static site, CLI tool, internal script) with negligible platform risk.

**Who:** Researcher subagent (spawned by you).

1. Spawn a researcher subagent with this prompt:

```
Analyze feasibility and risks for the project "Chess Ai".

Read these files for context:
- projects/chess-ai/docs/REQUIREMENTS.md (what we're building)
- projects/chess-ai/docs/DECISIONS.md (tech choices)
- projects/chess-ai/TASKS.md (implementation plan)

Research and evaluate:

1. **Platform/API constraints** — Are there OS-level blocks or restrictions?
   (e.g., iOS/Android limiting messaging APIs, App Store rejection risks,
   restricted hardware APIs, platform fees)

2. **Technical feasibility** — Can every major feature actually be built
   with the chosen stack? Are there known limitations?

3. **Third-party dependencies** — Are critical APIs/services reliable?
   Free tier limits? Deprecation risks?

4. **Cost risks** — Could usage costs surprise us? (e.g., API calls,
   hosting at scale, required paid tiers)

5. **Legal/compliance** — Any data privacy, copyright, or ToS issues?
   (e.g., scraping restrictions, COPPA, GDPR)

6. **Competitive landscape** — Is this space already dominated by a
   free/cheap solution that would make building it pointless?

For each risk found:
- Severity: 🔴 Blocker / 🟡 Significant / 🟢 Manageable
- Impact on the project
- Mitigation options (or recommendation to pivot/descope)

Be specific. Reference real documentation, forum posts, or developer
experiences. The goal is to catch showstoppers BEFORE we invest in building.

Save to: projects/chess-ai/research/feasibility.md
```

   - **Thinking:** high
   - **Timeout:** 900 seconds (15 min)

2. Wait for researcher to complete
3. Read `research/feasibility.md`
4. **If any 🔴 Blockers found:** Include them prominently in the Phase 6 summary. These need John's attention before building.
5. Update `PROGRESS.md`: "Phase 5b complete — feasibility analysis done"

---

### Phase 6: Human Checkpoint — STOP 🛑

**This is the most important phase. You MUST stop here. Do NOT begin implementation.**

1. Compile a planning summary. Post to **#clawdbot-projects** (channel:1467306156106977386):

```
📋 **Chess Ai — Planning Complete**

**What we're building:** [1-2 sentence summary]

**Tech stack:**
- Frontend: [choice]
- Backend: [choice]
- Database: [choice]
- Hosting: [choice]
- Monthly cost: [estimate]

**Design:** [N style directions ready for review / N/A — no UI]

**Implementation plan:** [N] tasks across [M] phases
- Phase 1: [name] — [N] tasks
- Phase 2: [name] — [N] tasks
- Phase 3: [name] — [N] tasks
- Phase 4: [name] — [N] tasks

**Risks:**
- 🔴 [any blockers — or "None"]
- 🟡 [significant risks — or "None"]
- 🟢 [manageable concerns — or "None"]

**Estimated sessions:** [rough estimate based on task count and sizing]

📂 Review artifacts: `projects/chess-ai/docs/`
🎨 Design options: `projects/chess-ai/design/PRESENTATION.md`
📝 Task plan: `projects/chess-ai/TASKS.md`

⏸️ **Awaiting review.** Say "work on chess-ai" to begin implementation.
```

2. Update `PROGRESS.md`:
   - Status: `PLANNING_COMPLETE`
   - Note: "Awaiting John's review before implementation begins"

3. **EXIT. Do NOT begin implementation. Do NOT spawn any more agents. STOP.**

---

## Build Mode

> Only enter this mode when `TASKS.md` exists with incomplete tasks.
> This means planning is done and John has approved (or it's a --quick project).

### Setup
1. Read `docs/REQUIREMENTS.md` for context
2. Read `docs/DECISIONS.md` for tech choices
3. Read `design/STYLE-GUIDE.md` for design tokens (if exists)
4. Read `TASKS.md` for current state
5. Read `PROGRESS.md` for recent work and any notes

### Execution Loop
1. Find the next incomplete task (respect dependency order)
2. Spawn a sub-worker with this prompt pattern:

```
Implement task T-XXX for Chess Ai.

Read these files for context:
- projects/chess-ai/docs/REQUIREMENTS.md (what we're building)
- projects/chess-ai/docs/DECISIONS.md (tech decisions)
- projects/chess-ai/design/STYLE-GUIDE.md (design tokens — if exists)

YOUR TASK:
[Copy task description from TASKS.md]

Acceptance criteria:
[Copy from linked user story in REQUIREMENTS.md]

Rules:
- Work on THIS TASK ONLY — do not expand scope
- Commit when done with a descriptive message prefixed with the task ID (e.g., "T-001: Initialize Expo project")
- When done, reply with one of:
  - DONE — task completed successfully
  - BLOCKED: [reason] NEEDS: [what's needed]
  - PARTIAL: [what's done] REMAINING: [what's left]
```

   - **Thinking:** low (for XS/S tasks) or medium (for M/L tasks)
   - **Timeout:** Task size × 2 (e.g., S=600s, M=1800s, L=3600s)

3. When worker returns:
   - **DONE** → Mark task complete in TASKS.md (`- [x]`), pick next task
   - **BLOCKED** → Document blocker in PROGRESS.md, post to Discord, try next unblocked task or exit
   - **PARTIAL** → Update task notes, continue with remaining work or move to next task

4. **Post progress update** every 10 minutes or after every 2-3 completed tasks

5. Continue until:
   - Time budget exhausted → Write HANDOFF.md, post summary, exit
   - All tasks done → Post completion summary, exit
   - Blocked with no unblocked tasks → Post blocker, exit

### Exit (Build Mode)
- Update TASKS.md with completion status
- Update PROGRESS.md with session summary
- Write HANDOFF.md for next session (what's done, what's next, any gotchas)
- Post **detailed completion summary** to #clawdbot-projects (channel:1467306156106977386):

```
🏗️ **Chess Ai** — Session Complete
⏱️ Time: [verified timer output]

**What this project does:**
[1-3 sentences — assume John knows nothing about it]

**Features — Planned vs Implemented:**
✅ [Feature] — [how to verify/use]
⏳ [Planned but not done]
❌ [Cut/failed — why]

**How to access:**
[URL / cron job / Discord channel / dashboard — at least ONE]
[If none: "⚠️ NO DELIVERY METHOD — needs setup"]

**Links:**
- Repo: [GitHub URL or workspace path]
- README: [path]

**Delivery plan:**
[How John will see outputs. NOT "run this script."
If manual-only: set up cron, deploy as web page, post to Discord, or flag for John's input.]

**Status:** [COMPLETE | IN PROGRESS | BLOCKED]
```

⚠️ **John doesn't run scripts.** If the project output requires manual script execution, you MUST set up automated delivery (cron job, website, Discord posting) or flag it explicitly.
