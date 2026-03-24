# Client Bridge — Protective Accountability Guardrails

> **MANDATORY**: Every AI agent (Claude, Cursor, Copilot, or any other tool) MUST read and follow this file in its entirety before making ANY changes to this project. No exceptions.

---

## What Client Bridge IS — Read This First

Client Bridge is Marty's own client collaboration platform for managing the full lifecycle of freelance/agency development projects. It is NOT a template or demo — it is a working production tool that Marty is actively using with real clients.

**The vision:** A single tool where Marty can manage every phase of a client engagement:

1. **Scoping & Contracts** — Define project scope, build contract terms, push to client for review/negotiation, electronic signatures from both parties
2. **Development & Feedback** — Client sees the live application via Vercel URL embedded in the portal, can screenshot any page, mark it up with drawing tools, classify the feedback (bug, content, UX, feature request, general), and submit structured feedback directly — no emails, no translation through Marty
3. **Time Tracking & Progress** — Marty logs time against projects with notes about what he's working on and what tools he's using, so clients have visibility into progress
4. **Milestones & Payments** — (Planned) Define project milestones, track completion, generate invoices, accept payments through Stripe or similar
5. **Reporting & AI Insights** — (Future) Use accumulated time and project data to estimate future project timelines and costs based on Marty's actual performance trends

**The immediate client context:** Marty is about to onboard a physician who is building a complex Learning Management System (LMS). The physician is the domain expert (medical content), Marty is the developer. The physician needs to be able to review the application, provide detailed visual feedback on exactly what she sees, and track the project's progress — all without sitting next to Marty. This client is across the country.

**Why this matters for agents:** Every feature in Client Bridge exists to solve a real workflow problem. The feedback system captures the client's exact words and observations so Marty doesn't have to be the bottleneck translating their intent. The contract system exists because Marty needs legally binding agreements before work begins. The time tracking exists because future AI-powered estimates depend on having real data now. Nothing is arbitrary. If you think something "could be improved" by replacing it, you are almost certainly wrong about what it does and why.

---

## The March 20 Incident — Learn From This

On March 20, 2026, Marty asked an AI agent to improve the client portal flow. He described a high-level vision: the portal should support a lifecycle from invitation → contract review → development feedback → milestone tracking.

**What the agent did wrong:** The agent interpreted this broad vision as license to restructure the entire portal. Without being asked, it **pulled out the working active feedback system** — the screenshot capture, markup tools, and structured feedback submission that is the core value of Client Bridge — and **replaced it with a historical feedback journal**. The agent stripped the client's ability to provide any new feedback.

**What Marty actually wanted:** Improvements to the contract/scope viewing area of the portal. The feedback system was working and was not part of the request.

**The pattern to prevent:** When Marty gives a broad vision instruction, the agent must:
1. Identify which specific features are being discussed
2. Confirm which parts of the existing system will be touched
3. Explicitly confirm that features NOT mentioned will be left completely alone
4. NEVER interpret a vision statement as permission to restructure or replace working features

**The rule:** If Marty describes a vision or direction, your job is to ask "Which specific part should I work on first?" — not to redesign the whole system.

---

## Core Principle: Additive-First, Never Destructive

**Your default mode is ADDITIVE.** You add new files, new components, new routes. You do NOT delete, overwrite, replace, or restructure existing working code unless Marty explicitly instructs you to do so by naming the specific item.

This means:
- Adding a new tab to the portal? **Create new files.** Do not modify existing tabs.
- Improving the contract view? **Add to it.** Do not replace the existing contract components.
- Building milestone tracking? **Create new components and routes.** Do not restructure the project detail page.

---

## ABSOLUTE RULE: Supabase Database Protection

**The Supabase database must NEVER be wiped, dropped, truncated, reset, or destructively modified by any agent under any circumstances.**

This means you must NEVER:
- Run `DROP TABLE`, `DROP SCHEMA`, `TRUNCATE`, or `DELETE FROM` without a WHERE clause on any production table
- Execute `supabase db reset` or any equivalent reset command
- Modify, rename, or delete any existing migration file in `supabase/migrations/`
- Alter existing columns in ways that lose data (dropping columns, changing types destructively)
- Remove or weaken any Row Level Security (RLS) policy
- Modify the `auth` schema or any Supabase system tables
- Run any Supabase CLI command that affects the remote/production database

**For database schema changes**, you must ONLY:
- Create NEW migration files with the next sequential number (e.g., `015_your_change.sql`)
- Use `ALTER TABLE ... ADD COLUMN` (additive only)
- Create new tables, indexes, or policies
- Present the full migration SQL to Marty for review BEFORE creating the file

**If you believe a destructive database operation is necessary**, you must:
1. Stop immediately
2. Explain exactly what you think needs to change and why
3. Show the exact SQL you would run
4. Wait for Marty's explicit written approval before proceeding
5. There are NO exceptions to this rule

---

## ABSOLUTE RULE: Architectural Changes Require Approval

**Any significant architectural change must be clearly described and wireframed for Marty to review and explicitly approve BEFORE implementation begins.**

A "significant architectural change" includes:
- Adding, removing, or reorganizing route groups (e.g., `(dashboard)`, `(auth)`, `portal/`)
- Changing the authentication flow or middleware logic
- Modifying the database schema (any migration)
- Changing the payment/billing flow (Stripe integration)
- Restructuring component hierarchy or shared layouts
- Adding new API routes that handle sensitive data (contracts, payments, auth)
- Changing the client portal's access model or invitation system
- Modifying the review token system
- Adding or removing npm dependencies that affect core functionality
- Changing deployment configuration (next.config.ts, Vercel settings)

**The approval process:**
1. **Describe** the change in plain language — what it does and why it's needed
2. **Wireframe** any UI changes — ASCII diagram, markdown sketch, or description of before/after states
3. **Impact analysis** — list every file that will be modified and what the modification does
4. **Risk assessment** — identify what could break and how to recover
5. **Wait for Marty's explicit "approved" or "go ahead"** before writing any code
6. Do NOT start implementation while awaiting approval

---

## CRITICAL RULE: Handling Broad Vision Instructions

Marty's working style alternates between broad vision descriptions and specific task requests. **This is where agents are most likely to cause damage.**

When Marty gives a **broad vision instruction** (e.g., "I want the portal to support the full lifecycle"):
1. **Do NOT interpret this as a work order.** It is context-setting, not a build command.
2. **Ask which specific piece to work on first.** Break the vision into discrete, scoped tasks.
3. **List what you understand is IN scope and what is OUT of scope** for the specific task.
4. **Get confirmation before writing any code.**
5. **Features not mentioned are OFF LIMITS.** If the instruction is about contracts, do not touch feedback. If the instruction is about the portal, do not touch the dashboard. If the instruction is about milestones, do not touch time tracking.

When Marty gives a **specific task instruction** (e.g., "Add a status badge to the feedback card"):
1. Execute the specific task.
2. Stay within the named files and components.
3. Do not "improve" adjacent features.

**The litmus test:** Can you state the specific task in one sentence? If not, you're operating on a vision, not a task. Stop and ask for specifics.

---

## Feature Status Map — What's Working, What's Not

Before touching any feature, check its status here. **WORKING features must not be degraded, replaced, or restructured.** In-progress features should be enhanced carefully. Planned features are where new work should focus.

### WORKING — Do Not Break These
| Feature | Location | Notes |
|---|---|---|
| Agency dashboard (nav, layout, pages) | `src/app/(dashboard)/` | Core workspace — the March 20 deletion target |
| Client & project management (CRUD) | `src/app/(dashboard)/clients/`, `projects/` | Creating clients, opening projects, managing details |
| Time tracking with session logging | `src/app/(dashboard)/time/`, timer-bar component | Marty logs time with notes per project — data feeds future AI estimates |
| Review app with embedded Vercel URL | `src/app/portal/project/[id]/` | Client sees the live app inside the portal |
| Screenshot capture with markup tools | `src/components/review/screenshot-capture.tsx` | html2canvas integration — see CLAUDE.md for strict config rules |
| Structured feedback submission | Feedback panel in review app | Client classifies feedback (bug/content/UX/feature/general), provides description, attaches screenshot — THIS IS THE CORE VALUE PROPOSITION |
| Feedback status workflow | Dashboard feedback views | Marty can mark feedback as reviewed/in-progress/resolved/dismissed, client sees status updates |
| AI-powered feedback-to-prompt generation | `src/app/api/summarize/` | Takes client feedback and generates coding prompts for Marty to feed back to agents |
| Client portal invitation flow | `src/app/api/invite-client/` | Marty sends portal invitations to clients |
| Review token-based access | Projects use UUID review tokens | Allows unauthenticated review access via secure token links |

### IN PROGRESS — Enhance Carefully
| Feature | Status | Notes |
|---|---|---|
| Contract builder & preview | ~75% built | Section-based scope, payment terms, contract template — not fully tested yet |
| Electronic signature flow | Partially built | Client signs → Marty countersigns — the immediate next priority |
| Client portal scope/contract view | Partially built | The second tab showing scope and contract details |
| Feedback history on client side | Partially built | Showing historical feedback with status tracking needs validation |
| Client-side portal auth | Recently added | Clients now have their own accounts vs. original token-only access |
| Reporting dashboard | Early stage | Weekly/project/cross-project views exist but need refinement |

### PLANNED — Not Yet Built
| Feature | Priority | Notes |
|---|---|---|
| Milestone tracking per project | High — next after contracts | Custom milestones per project, mark as complete, visible to client |
| Payment integration (Stripe or other) | High | Milestone-based invoicing and payment collection |
| SMS/text notifications | Medium | Alert clients when milestones complete or reviews are needed |
| AI-powered time estimates | Future | Use accumulated time data to predict future project timelines |
| Multi-project progress overview | Future | Cross-project dashboard for agency-level insights |

---

## Protected Zones — Do Not Touch Without Explicit Approval

These files and directories are load-bearing. Modifying them incorrectly can break the entire application, lose data, or cause legal/financial harm.

| File/Directory | Why It's Protected |
|---|---|
| `.env.local` | Production secrets — Supabase, Stripe, Resend API keys |
| `supabase/migrations/*` | Ordered schema history — editing existing migrations breaks the database |
| `middleware.ts` | Auth routing for developers AND clients — breaking this locks everyone out |
| `src/lib/supabase/*` | Database connection layer — breaking this breaks everything |
| `src/app/api/contract-sign/*` | Legal signature flow — errors have legal consequences |
| `src/app/api/contract-pdf/*` | PDF generation for legally binding contracts |
| `src/app/api/invoice/*` | Payment generation — errors have financial consequences |
| `src/app/api/invite-client/*` | Client onboarding — breaking this loses new clients |
| `src/app/(dashboard)/layout.tsx` | The dashboard shell — was deleted in the March 20 incident |
| `src/app/portal/layout.tsx` | Client portal shell — client-facing, must remain stable |
| `src/app/auth/*` | Auth callback and password reset — critical auth infrastructure |
| `src/components/review/screenshot-capture.tsx` | The core screenshot/markup feature — see CLAUDE.md for html2canvas rules |
| `src/lib/types.ts` | Shared type definitions — changes cascade everywhere |
| `package.json` | Removing dependencies can break the entire build |
| `CLAUDE.md` | Contains documented rules the agent itself depends on |
| `GUARDRAILS.md` | This file — contains the protective rules |

**To modify a protected file:**
1. State which protected file you need to modify
2. Explain exactly what you will change and why
3. Show the specific edit (old code → new code)
4. Wait for Marty's approval

---

## The Five Operating Rules

### Rule 1: Never Delete Without Quoted Instruction
Before any destructive operation (delete, remove, overwrite, replace), you MUST:
- Quote the specific instruction from Marty that authorizes the deletion
- Name the exact file, component, or resource being removed
- If you cannot quote an instruction, STOP and ASK

**"It would be cleaner to..." is NEVER a valid reason to delete something.**
**"I'm improving the architecture..." is NEVER a valid reason to replace something.**
**"This could be consolidated..." is NEVER a valid reason to restructure something.**

### Rule 2: Read Before Write
Before modifying ANY file, you must:
- Read the current contents of the file
- Summarize what exists and what it does
- Explain how your change interacts with the existing code
- Confirm the change is additive or explicitly approved as replacement

### Rule 3: Stay In Scope
Only touch files directly related to the task at hand.
- If the task is "add a button to the dashboard," do not touch the contract flow
- If the task is "fix a CSS issue," do not refactor the component structure
- If the task is "improve the contract view," do not touch the feedback system
- If you find yourself wanting to "clean up" adjacent code, STOP — that is scope creep

After completion, you should be able to justify every file you touched as necessary for the stated task.

### Rule 4: Build Must Pass
After every change:
- Verify the project still compiles (`npm run build` or equivalent)
- Verify TypeScript types resolve correctly
- If the build breaks, revert your change and diagnose before trying again

### Rule 5: Report What You Did
After completing any task, provide:
- A list of every file created or modified
- A one-sentence explanation of each change
- Confirmation that no files were deleted
- Confirmation that no WORKING features were degraded (check the Feature Status Map)
- Confirmation that the build still passes

---

## Decision Context Log

This section captures the "why" behind key architectural decisions. Agents must respect these decisions and not silently reverse them.

| Decision | Date | Context |
|---|---|---|
| Dashboard layout uses `(dashboard)` route group | Feb 2025 | Shared nav, timer bar, and error panel across all dashboard pages — this is the agency workspace |
| Client portal is separate from dashboard | Mar 2025 | Clients and developers have completely different auth flows, permissions, and UI needs. The portal is the client's view; the dashboard is Marty's view. They must remain independent. |
| Feedback captures client's exact words | Feb 2025 | The whole point is to avoid Marty being a translation bottleneck. Client feedback goes in raw, with screenshots and classification, then gets turned into prompts. Do NOT abstract or summarize the feedback capture flow. |
| Review app embeds the live Vercel URL | Feb 2025 | The client needs to see and interact with the actual application, not a static mockup. The feedback panel sits alongside the live app so the client can screenshot exactly what they see. |
| Contracts use section-based structure | Mar 2025 | Allows flexible contract templates with subsections — legally required. Scope items can be standard (e.g., "integrate Stripe") or custom/ad-hoc per project. |
| Time tracking captures tool usage notes | Mar 2025 | Marty logs what AI tools and methods he uses per session. This data will power future AI-driven time estimates. The notes field is not optional decoration — it is training data for a future feature. |
| Review tokens are UUID-based | Feb 2025 | Original design allowed unauthenticated review access via tokens. Now transitioning to authenticated portal access, but tokens are still used as a fallback and for initial access. |
| html2canvas has strict configuration rules | Mar 2025 | Documented in CLAUDE.md — deviating from these rules produces broken screenshots (zoomed-in, blacked out, offset). These rules were hard-won through debugging. |
| Migrations are sequential and immutable | Feb 2025 | 14 migrations spanning 2+ months. Each builds on the last — editing existing ones breaks the chain. New changes = new migration files only. |
| RLS policies enforce multi-tenancy | Feb 2025 | Developers can only see their own clients/projects — removing RLS exposes all data across all users. This is a security boundary, not a convenience feature. |
| Error monitoring uses 3-tier classification | Mar 2025 | Tier 1 = client-facing (fix immediately), Tier 2 = developer-only (fix when convenient), Tier 3 = noise to ignore |
| Feedback status workflow is bidirectional | Mar 2025 | Marty updates status (reviewed → in progress → resolved), client sees updates and can approve or provide more feedback. This cycle is the core product loop. Do not flatten it into one-way. |
| Client portal auth was recently added | Mar 2026 | Transition from token-only to authenticated portal. Both flows must work during transition. Do not remove token-based access. |

**When you encounter a pattern that seems "wrong" or "could be improved," check this table first.** The pattern exists for a reason that isn't obvious from the code alone. If the reason isn't in this table, ASK Marty before changing it.

---

## Emergency Recovery

If an agent has already caused damage:
1. **Check git status immediately** — `git diff` and `git status` to see what changed
2. **Do NOT run more commands to "fix" it** — you may compound the damage
3. **Use git to restore** — `git checkout -- <file>` for individual files, or `git stash` to save current state
4. **For database issues** — check Supabase dashboard directly, use point-in-time recovery if available
5. **Report to Marty** with exact details of what happened

---

## How to Use This File

**If you are an AI agent:**
1. Read this entire file at the start of every session
2. Check the Feature Status Map before modifying any feature
3. Refer to the Protected Zones before modifying any file
4. Follow the Five Operating Rules for every action
5. When Marty gives a broad vision, ask for specific scope before coding
6. When in doubt, ASK — never assume

**If you are Marty:**
1. Update the Feature Status Map as features move from planned → in progress → working
2. Update the Decision Context Log when you make architectural decisions
3. Add new files to Protected Zones as the project grows
4. After every significant agent session, review what changed and add context here if needed
5. This is your institutional context made visible — keep it current
