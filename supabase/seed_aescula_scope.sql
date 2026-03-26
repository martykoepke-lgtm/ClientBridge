-- ============================================
-- AESCULA Scope Document — Content Seed
-- Session ID: 5580accf-f0b7-4f21-822c-bd6da614b3c2
-- ============================================

-- STEP 1: Clean up duplicate project_documents (keep only one scope entry)
DELETE FROM project_documents
WHERE project_id = '79e6a931-d4bb-4dc9-990e-8d4efe6eb996'
  AND file_name = 'AESCULA — SOW Working Session';

-- Re-insert the single correct scope document link
INSERT INTO project_documents (
  project_id, uploaded_by_user_id, uploaded_by_role,
  file_name, file_url, file_size, file_type,
  document_type, scope_session_id
) VALUES (
  '79e6a931-d4bb-4dc9-990e-8d4efe6eb996',
  (SELECT developer_id FROM projects WHERE id = '79e6a931-d4bb-4dc9-990e-8d4efe6eb996'),
  'developer',
  'AESCULA — SOW Working Session',
  '/scope/a3e829b8-0d5c-43a8-9ca8-9fddd2f69594',
  0,
  'text/html',
  'scope',
  '5580accf-f0b7-4f21-822c-bd6da614b3c2'
);

-- ============================================
-- STEP 2: Scope Sections (the document structure)
-- ============================================
INSERT INTO scope_sections (session_id, section_id, section_number, eyebrow, title, subtitle, time_allocation_minutes, display_order) VALUES
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'overview', 0, 'Introduction', 'How to Use This Document', 'An interactive working session guide — read, react, and annotate in real time.', NULL, 0),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's1', 1, 'Section 01 · 10 minutes', 'Product Overview', 'What AESCULA is, what makes it different, and the scale of what we are building.', 10, 1),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's2', 2, 'Section 02 · 10 minutes', 'User Types, Access Model & Compliance', 'Who uses the platform, what they can see, and the legal framework that governs all of it.', 10, 2),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's3', 3, 'Section 03 · 20 minutes', 'AI Content Generation Pipeline', 'This is a core platform component — not external prep work. With 1,375 modules, this must be industrial-scale.', 20, 3),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's4', 4, 'Section 04 · 15 minutes', 'SME Review Workflow', 'How external physician reviewers approve, revise, and sign off on AI-generated content.', 15, 4),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's5', 5, 'Section 05 · 30 minutes', 'Student-Facing Experience', 'The full student journey — from signup to board readiness. Eight subsections covering every touchpoint.', 30, 5),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's6', 6, 'Section 06 · 10 minutes', 'Institutional Dashboard & Reporting', 'What medical schools see — cohort analytics, at-risk identification, and FERPA-controlled drill-downs.', 10, 6),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's7', 7, 'Section 07 · 10 minutes', 'Tech Stack & Database', 'The tools, services, and architecture that power the platform.', 10, 7),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's8', 8, 'Section 08 · 10 minutes', 'MVP Definition', 'What is in, what is deferred, and how we know it is done.', 10, 8),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's9', 9, 'Section 09 · 10 minutes', 'Timeline & Working Style', 'Sprint breakdown, communication cadence, and how we work together.', 10, 9),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's10', 10, 'Section 10 · 5 minutes', 'Closing & Next Steps', 'What happens after this session.', 5, 10);

-- ============================================
-- STEP 3: User Roles
-- ============================================
INSERT INTO scope_user_roles (session_id, role_key, role_label, who, access_scope, display_order) VALUES
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'admin', 'Platform Admin', 'DIS LLC (Dr. Scariati)', 'Full backstage access — content pipeline, SME management, analytics, billing', 1),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'sme', 'SME Reviewer', 'Board-certified physicians', 'Assigned lesson queue only — review, approve, reject. Zero student data access', 2),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'student', 'Student', 'Osteopathic medical students (Years 1-2)', 'Lessons, flashcards, MCQs, AI tutor, personal dashboard, progress tracking', 3),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'institutional', 'Institution', 'Medical school faculty/admin', 'Cohort-level analytics, at-risk flags, aggregate performance. No individual student drill-down without FERPA consent', 4),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'developer', 'Developer', 'Practical Informatics (Marty)', 'Technical infrastructure, deployment, database. No medical content decisions', 5);

-- ============================================
-- STEP 4: Compliance Items
-- ============================================
INSERT INTO scope_compliance_items (session_id, regulation, applies_when, what_it_means, architecture_notes, display_order) VALUES
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'FERPA', 'When a school licenses the platform and student records are created', 'Student educational records are protected. Schools must consent to data collection. Students must be notified.', 'FERPA consent screen at signup (checkbox + timestamp stored). RLS policies enforce data isolation per student. No cross-student data leakage. Audit trail on every data access event.', 1),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'HIPAA-adjacent', 'If any real patient data appears in case studies or clinical scenarios', 'No actual PHI should ever enter the system. All clinical scenarios use synthetic/fictional patient data.', 'Content generation prompts explicitly instruct AI to use fictional patients. QA check validates no real patient identifiers. System never stores, processes, or transmits actual patient health information.', 2),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Data Residency', 'All user data storage and processing', 'Data must reside in US-based infrastructure for FERPA compliance.', 'Supabase US region. Vercel US edge. Anthropic API processes in US. No data leaves US jurisdiction.', 3),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'SOC 2 Type II', 'Infrastructure provider requirements', 'Supabase and Vercel both maintain SOC 2 Type II compliance for their infrastructure.', 'We inherit SOC 2 compliance from our infrastructure providers. No additional certification needed at application level for MVP.', 4);

-- ============================================
-- STEP 5: FERPA Audit Events
-- ============================================
INSERT INTO scope_audit_events (session_id, event_number, event_name, what_we_log, what_we_dont_log, display_order) VALUES
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 1, 'Student account created', 'User ID, timestamp, consent checkbox state, school affiliation', 'Nothing sensitive — this is the baseline record', 1),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 2, 'Lesson session opened', 'Session ID, lesson ID, timestamp, student ID', 'Session content is ephemeral — not stored in audit log', 2),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 3, 'AI tutor API call made', 'Timestamp, lesson context, token count', 'Student identity never sent to Anthropic API — de-identified before transmission', 3),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 4, 'Performance data recorded', 'Score, Bloom''s level, response time (aggregated)', 'Raw keystroke data, individual answer sequences', 4),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 5, 'Faculty views cohort data', 'Requesting user ID, timestamp, data scope requested', 'The actual student data viewed — only that it was accessed', 5),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 6, 'Data export requested', 'Requesting user, export scope, timestamp, format', 'Export contents — logged that it happened, not what was in it', 6);

-- ============================================
-- STEP 6: Competitors
-- ============================================
INSERT INTO scope_competitors (session_id, competitor_name, what_they_do, our_advantage, display_order) VALUES
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Anki', 'Flashcard-only spaced repetition', 'Full Bloom''s scaffolding L1-L6 + AI Socratic tutor + prerequisite regression', 1),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'AMBOSS', 'Reference-heavy medical knowledge library', 'Purpose-built 5-min microlearning with adaptive closed-loop mastery', 2),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'UWorld', 'Board prep question bank', 'Longitudinal competency building — not just test prep. Habit engine for clinical mastery', 3),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Boards & Beyond', 'Video-first passive consumption', 'Active recall + interactive exercises + contextually aware AI tutor', 4),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Sketchy', 'Visual mnemonics for memorization', 'Adaptive system that goes beyond memorization to clinical reasoning (Bloom''s L3-L6)', 5);

-- ============================================
-- STEP 7: Tech Stack
-- ============================================
INSERT INTO scope_tech_stack (session_id, layer, tool_name, role_description, rationale, display_order) VALUES
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Frontend + Backend', 'Next.js 14', 'Full-stack React framework with server components', 'Industry standard, excellent DX, Vercel-native deployment', 1),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Database + Auth', 'Supabase', 'PostgreSQL database, authentication, row-level security, storage', 'Built-in RLS for FERPA compliance, real-time subscriptions, generous free tier', 2),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'AI Engine', 'Anthropic Claude API', 'Socratic tutor dialogue, content generation, session scoring', 'Best-in-class reasoning for medical education, strong safety guardrails', 3),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Hosting', 'Vercel', 'Edge deployment, CDN, serverless functions', 'Zero-config deploys from GitHub, global edge network, automatic HTTPS', 4),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Payments', 'Stripe', 'Subscription billing, school licensing', 'PCI-compliant — card data never touches our servers', 5),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Email', 'Resend', 'Transactional email (welcome, password reset, notifications)', 'Developer-friendly API, good deliverability, simple pricing', 6);

-- ============================================
-- STEP 8: Infrastructure Costs
-- ============================================
INSERT INTO scope_infrastructure_costs (session_id, service_name, plan_name, monthly_cost, cost_numeric, what_you_get, compliance_level, is_required, is_usage_based, display_order) VALUES
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Supabase', 'Pro', '$25/mo', 25.00, '8GB database, 250GB bandwidth, 100GB storage, daily backups', 'FERPA-ready (RLS + SOC 2)', true, false, 1),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Supabase', 'Team + HIPAA', '$599/mo', 599.00, 'BAA available, SSO, priority support, audit logging', 'BAA eligible (HIPAA)', false, false, 2),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Vercel', 'Pro', '$20/mo', 20.00, 'Unlimited deployments, analytics, preview environments', 'SOC 2 compliant', true, false, 3),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Anthropic API', 'Usage-based', '~$50-200/mo estimate', 100.00, 'Claude Sonnet for tutor sessions + content generation', 'Data not used for training', true, true, 4),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Stripe', 'Standard', '2.9% + $0.30/txn', 0.00, 'Payment processing, subscription management, invoicing', 'PCI DSS Level 1', true, true, 5),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Resend', 'Free → Pro', '$0-20/mo', 10.00, '3,000 emails/mo free, then $20/mo for 50K', 'N/A', false, false, 6),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Domain', 'Annual', '~$15/yr', 1.25, 'Custom domain for the platform', 'N/A', true, false, 7);

-- ============================================
-- STEP 9: Build Phases
-- ============================================
INSERT INTO scope_build_phases (session_id, phase_number, phase_name, tagline, estimated_hours_min, estimated_hours_max, estimated_months, gate_criteria, payment_trigger, display_order) VALUES
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 1, 'Content Factory', 'Nothing works without content. Build the machine that makes lessons.', 100, 120, 'Months 1-2', '20 published lessons exist. Pipeline proven. SME review workflow functional.', '$4,000 upon contract execution', 1),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 2, 'Student Experience', 'Now that content exists, build what students touch.', 100, 120, 'Months 3-4', 'A real student can register, learn, and the system adapts. MVP delivered.', '$4,000 upon MVP delivery', 2),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 3, 'Scale + Institutional', 'Platform works. Now make it work for schools.', 60, 80, 'Months 5-6', 'Full product delivered. All 1,375 modules. School dashboard functional.', '$7,000 upon full product completion', 3);

-- ============================================
-- STEP 10: Sprints
-- ============================================
INSERT INTO scope_sprints (phase_id, session_id, sprint_number, sprint_title, sprint_description, is_milestone, display_order)
SELECT p.id, '5580accf-f0b7-4f21-822c-bd6da614b3c2', s.sprint_number, s.sprint_title, s.sprint_description, s.is_milestone, s.display_order
FROM (VALUES
  (1, 1, 'Infrastructure', 'Database schema, auth, FERPA consent flow, role-based access', false, 1),
  (1, 2, 'AI Generation Pipeline', 'Framework upload, prompt assembly, batch generation by domain', false, 2),
  (1, 3, 'Automated QA + SME Portal', 'QA pass/fail checks, SME assignment queue, inline review', false, 3),
  (1, 4, 'First 20 Lessons Live', 'Generate, QA, SME review, approve — end-to-end pipeline test', true, 4),
  (2, 5, 'Student Signup', 'Both paths (individual + school code), FERPA consent, Stripe', false, 5),
  (2, 6, 'Lesson Viewer + Flashcards', 'Content renderer, flashcard flip, spaced repetition engine (SM-2)', false, 6),
  (2, 7, 'MCQs + Response Tracking', 'Board-style questions, timer, score recording, answer rationale', false, 7),
  (2, 8, 'AI Socratic Tutor', 'FERPA de-identified context, Socratic dialogue, session scoring', false, 8),
  (2, 9, 'Prerequisite Engine', 'Adaptive queue, backward regression to foundation concepts', false, 9),
  (2, 10, 'Student Dashboard', 'Bloom''s heatmap, streak/XP, weak zone alerts, progress over time', true, 10),
  (3, 11, 'Stripe Billing Live', 'Individual subscriptions + school license codes', false, 11),
  (3, 12, 'Institutional Dashboard', 'Cohort view, at-risk flags, aggregate analytics', false, 12),
  (3, 13, 'Remaining Content Batches', 'Full 1,375 modules through pipeline', false, 13),
  (3, 14, 'QA + Polish + Sign-off', 'Final testing, performance optimization, full product delivery', true, 14)
) AS s(phase_num, sprint_number, sprint_title, sprint_description, is_milestone, display_order)
JOIN scope_build_phases p ON p.session_id = '5580accf-f0b7-4f21-822c-bd6da614b3c2' AND p.phase_number = s.phase_num;

-- ============================================
-- STEP 11: AI Agents
-- ============================================
INSERT INTO scope_ai_agents (session_id, agent_number, agent_name, agent_location, phase, role_description, scope_description, boundaries, ferpa_notes, display_order) VALUES
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 1, 'Content Generator', 'Backstage', 'Phase 1', 'Takes Dr. Scariati''s micromodule framework + NBOME taxonomy and generates complete lesson content in bulk', 'Lesson text, flashcards, MCQs, clinical hooks, core concepts, supporting details, AI tutor prompts', 'Never generates student-facing responses. Never sees student data. Output is always draft — never auto-published.', NULL, 1),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 2, 'QA Validator', 'Backstage', 'Phase 1', 'Reviews generated content against 6 automated structural checks before SME review', 'Single learning goal, 3 or fewer concepts, required sections present, format validation, AI artifact detection', 'Does NOT evaluate medical accuracy — that is the SME''s job. Pass/fail only, with failure reasons.', NULL, 2),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 3, 'MCQ Builder', 'Backstage', 'Phase 1', 'Three-step question generation: case vignette, then question + answers, then explanations', 'Board-style COMLEX/USMLE format questions tied to lesson content', 'Must follow NBOME format. One correct answer, plausible distractors. Never generates misleading medical information.', NULL, 3),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 4, 'Socratic Tutor', 'Student-facing', 'Phase 2', 'Conducts Socratic dialogue with students — pushes to Bloom''s L5-L6 reasoning. Contextually aware of learner''s history.', 'Current lesson content + anonymized learner context (performance scores, prerequisite mastery, weak areas)', 'Stays within module scope. Never gives answers directly — guides through questions. Never reveals student identity to the API.', 'Student identity is NEVER sent to Anthropic API. Context is de-identified: "This learner scored 45% on Concept B which requires Concept C (68%)" — no names, no school, no demographics.', 4),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 5, 'Session Evaluator', 'Background', 'Phase 2', 'Post-session analysis — evaluates completed tutor sessions against learning objectives', 'Returns structured JSON: Bloom''s level achieved, score, weak areas, feedback summary', 'Returns data only — never student-facing. Does not make pedagogical decisions, only reports metrics.', NULL, 5);

-- ============================================
-- STEP 12: Payment Milestones
-- ============================================
INSERT INTO scope_payment_milestones (session_id, installment_number, amount, trigger_description, technical_meaning, status, display_order) VALUES
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 1, 4000.00, 'Upon execution of this Agreement', 'Contract signed. Phase 1 (Content Factory) begins. Infrastructure + pipeline build starts.', 'pending', 1),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 2, 4000.00, 'Upon delivery of the MVP', 'Phase 2 gate passes. Student can register, pay, learn end-to-end. 20+ lessons live. AI tutor functional.', 'pending', 2),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 3, 7000.00, 'Upon completion of the full product', 'Phase 3 gate passes. All 1,375 modules through pipeline. Institutional dashboard live. Full product sign-off.', 'pending', 3);

-- ============================================
-- STEP 13: Acceptance Criteria (per milestone)
-- ============================================
INSERT INTO scope_acceptance_criteria (milestone_id, session_id, criterion_number, description, display_order)
SELECT m.id, '5580accf-f0b7-4f21-822c-bd6da614b3c2', c.criterion_number, c.description, c.display_order
FROM (VALUES
  (2, 1, 'Student can register (both individual and school code path) without help', 1),
  (2, 2, 'FERPA consent screen blocks access until accepted — timestamp stored', 2),
  (2, 3, 'Stripe payment processes successfully for individual students', 3),
  (2, 4, '20+ lessons are live and accessible with flashcards, MCQs, and AI tutor', 4),
  (2, 5, 'Spaced repetition schedules reviews at correct intervals', 5),
  (2, 6, 'AI Socratic Tutor responds contextually within lesson scope', 6),
  (2, 7, 'Student dashboard shows Bloom''s heatmap and progress', 7),
  (3, 1, 'All 1,375 modules have passed through pipeline and been SME-approved', 1),
  (3, 2, 'Institutional dashboard shows cohort analytics with FERPA controls', 2),
  (3, 3, 'School license code system works end-to-end', 3),
  (3, 4, 'Prerequisite regression engine sends students back to foundational concepts when needed', 4),
  (3, 5, 'Platform handles concurrent users without performance degradation', 5)
) AS c(milestone_num, criterion_number, description, display_order)
JOIN scope_payment_milestones m ON m.session_id = '5580accf-f0b7-4f21-822c-bd6da614b3c2' AND m.installment_number = c.milestone_num;

-- ============================================
-- STEP 14: Decision Questions (pre-populate for each section)
-- ============================================
INSERT INTO scope_decisions (session_id, section_id, question_id, question_text) VALUES
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's1', 's1-q1', 'Is AESCULA the confirmed product name?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's1', 's1-q2', 'Are you aligned with the two-market strategy (individual students + school licenses)?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's1', 's1-q3', 'Does 1,375 total modules match your curriculum scope expectation?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's2', 's2-q1', 'Are these five user roles correct and complete?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's2', 's2-q2', 'Is FERPA consent at signup (checkbox + timestamp) sufficient, or do you need additional consent mechanisms?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's2', 's2-q3', 'Do we need a BAA (HIPAA Business Associate Agreement) for MVP, or can that wait until institutional sales begin?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's3', 's3-q1', 'Is the bulk AI generation approach acceptable, or do you want to hand-author some lessons?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's3', 's3-q2', 'Are these 6 automated QA checks sufficient, or are there additional validation rules?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's4', 's4-q1', 'Will you be the sole SME reviewer initially, or do you plan to onboard external reviewers?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's4', 's4-q2', 'Is the 7-point SME checklist complete, or are there additional review criteria?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's5', 's5-q1', 'Are matching exercises and diagram labeling the right two formats for MVP?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's5', 's5-q2', 'Should the AI tutor be aware of what the student has previously studied (prerequisite context)?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's5', 's5-q3', 'Is the spaced repetition approach (SM-2 algorithm) acceptable?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's6', 's6-q1', 'Is cohort-level analytics (no individual drill-down) the right default for institutional users?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's7', 's7-q1', 'Are you comfortable with the Supabase Pro plan ($25/mo) for MVP, upgrading later if needed?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's7', 's7-q2', 'Should we budget for Anthropic API costs (~$50-200/mo) from day one?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's8', 's8-q1', 'Does this MVP scope match your expectations for the $4,000 milestone?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's8', 's8-q2', 'Are the 7 MVP acceptance criteria clear and testable?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's9', 's9-q1', 'Is the 3-phase timeline (Content Factory → Student Experience → Scale) the right priority order?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's9', 's9-q2', 'Are you comfortable with the $4K / $4K / $7K payment structure tied to these gates?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's10', 's10-q1', 'Are you ready to proceed with contract execution?'),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 's10', 's10-q2', 'What is your target date for having the first 20 lessons live?');

-- ============================================
-- STEP 15: Curriculum Domains
-- ============================================
INSERT INTO scope_curriculum_domains (session_id, dimension, domain_code, domain_name, board_weight_percent, module_count, study_priority, display_order) VALUES
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 1, 'D3', 'Biomedical & Clinical Knowledge', 60.00, 680, 1, 1),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 1, 'D2', 'Osteopathic Principles & Practice', 13.00, 145, 2, 2),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 1, 'D4', 'Communication', 8.00, 70, 4, 3),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 1, 'D5', 'Practice-Based Learning', 7.00, 70, 5, 4),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 1, 'D6', 'Professionalism', 6.00, 70, 6, 5),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 1, 'D7', 'Systems-Based Practice', 6.00, 70, 7, 6),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 2, 'CP1', 'Cardiovascular', NULL, 120, 1, 7),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 2, 'CP2', 'Pulmonary', NULL, 80, 2, 8),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 2, 'CP3', 'Musculoskeletal / OMM', NULL, 100, 3, 9),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 2, 'CP4', 'Neuroscience', NULL, 90, 4, 10),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 2, 'CP5', 'GI / Hepatology', NULL, 75, 5, 11),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 2, 'CP6', 'Renal / Endocrine', NULL, 80, 6, 12);

-- ============================================
-- STEP 16: Exercise Formats
-- ============================================
INSERT INTO scope_exercise_formats (session_id, format_name, description, phase, display_order) VALUES
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Matching', 'Connect terms to definitions — drag one item to its pair', 'MVP', 1),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Diagram labeling', 'Fill in blanks on a labeled image or diagram', 'MVP', 2),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Drag and drop sorting', 'Arrange steps in correct order (e.g. clotting cascade)', 'Full product', 3),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Hotspot / click-to-label', 'Click the correct part on an anatomy image', 'Full product', 4),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 'Video with pause questions', 'Video stops and asks a question mid-way', 'Full product', 5);

-- ============================================
-- STEP 17: QA Checks
-- ============================================
INSERT INTO scope_qa_checks (session_id, check_number, check_name, rule_description, on_failure, display_order) VALUES
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 1, 'Single learning goal', 'Exactly one core concept per lesson', 'Reject — retry generation with stricter prompt', 1),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 2, 'Concept count', '3 or fewer supporting details', 'Reject — retry once, then flag for manual review', 2),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 3, 'Required sections present', 'Clinical hook, core concept, learning objective, MCQ, flashcard all present', 'Reject — missing section identified in error message', 3),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 4, 'Format validation', 'MCQ has exactly 4 options, one correct answer, all fields populated', 'Reject — format error identified', 4),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 5, 'AI artifact detection', 'No "as an AI" phrases, no hallucinated references, no markdown artifacts', 'Reject — retry with cleaned prompt', 5),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 6, 'Minimum content length', 'Core concept explanation at least 100 words, MCQ rationale at least 50 words', 'Reject — content too thin', 6);

-- ============================================
-- STEP 18: SME Checklist
-- ============================================
INSERT INTO scope_sme_checklist (session_id, item_number, criterion, enforced_in_ui, display_order) VALUES
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 1, 'Clear, singular learning goal', true, 1),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 2, 'Medically accurate content', true, 2),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 3, 'Appropriate Bloom''s level tagging', true, 3),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 4, 'COMLEX alignment confirmed', false, 4),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 5, 'No misleading or ambiguous content', true, 5),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 6, 'MCQ has one defensible correct answer', true, 6),
('5580accf-f0b7-4f21-822c-bd6da614b3c2', 7, 'Osteopathic integration where indicated', false, 7);
