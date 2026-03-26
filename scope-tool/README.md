# ClientBridge Scope Tool

Interactive scoping document for client working sessions. Built as a standalone HTML tool that will be integrated into ClientBridge as a permanent feature.

## Current State
- **index.html** — Self-contained interactive scoping document (AESCULA SOW Working Session)
- **localStorage** — Feedback persists in the reviewer's browser
- **Export** — Plain-text feedback export via copy-to-clipboard

## Planned Integration
1. Swap localStorage → Supabase (tables defined in migrations 016 + 017)
2. Add magic link auth for client access
3. Embed as a route inside ClientBridge: `/project/[id]/scope/[sessionId]`
4. Show scope documents in the Documents tab as a special "scope" type
5. Bi-directional comments: both developer and client can add threaded comments on decisions

## Database Tables (see migrations)
- `scope_sessions` — One per scoping document, tied to `projects.id`
- `scope_section_reviews` — Approve/Flag/Discuss per section
- `scope_decisions` — Answer + finalization per decision question
- `scope_decision_comments` — Threaded comments tagged by author role

## To Run Locally
```bash
cd scope-tool
python -m http.server 3456
# Open http://localhost:3456
```

## Features
- 12-page navigation with prev/next buttons
- Approve / Flag / Discuss annotation per section
- Decision questions with Yes/No/Discuss buttons
- Comment threads on No/Discuss answers (tagged client vs developer)
- Finalize Decision mechanism with undo
- Progress bar and sidebar status dots
- Export Feedback as plain text
- Interactive mockups (clickable flashcards, MCQ selection, tab switching)
- localStorage persistence across browser sessions
