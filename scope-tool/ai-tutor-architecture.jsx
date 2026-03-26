import { useState } from "react";

const COLORS = {
  bg: "#0f172a",
  card: "#1e293b",
  cardHover: "#334155",
  accent1: "#3b82f6", // blue - medical knowledge
  accent2: "#8b5cf6", // purple - AI tutor
  accent3: "#10b981", // green - FERPA
  accent4: "#f59e0b", // amber - Duolingo
  accent5: "#ec4899", // pink - Database
  text: "#f1f5f9",
  textMuted: "#94a3b8",
  border: "#334155",
  white: "#ffffff",
};

const sections = [
  { id: "overview", label: "Big Picture", icon: "🏗️", color: COLORS.text },
  { id: "knowledge", label: "Medical Knowledge", icon: "📚", color: COLORS.accent1 },
  { id: "tutor", label: "AI Tutor", icon: "🧠", color: COLORS.accent2 },
  { id: "ferpa", label: "FERPA Privacy", icon: "🔒", color: COLORS.accent3 },
  { id: "duolingo", label: "Gamification", icon: "🎮", color: COLORS.accent4 },
  { id: "database", label: "Database", icon: "🗄️", color: COLORS.accent5 },
];

/* ─── Reusable Components ─── */

function FlowArrow({ color = COLORS.textMuted, vertical = true, label }) {
  return (
    <div style={{ display: "flex", flexDirection: vertical ? "column" : "row", alignItems: "center", gap: 2, margin: vertical ? "8px 0" : "0 8px" }}>
      <div style={{ width: vertical ? 2 : 24, height: vertical ? 24 : 2, background: color }} />
      {label && <span style={{ fontSize: 10, color, whiteSpace: "nowrap" }}>{label}</span>}
      <div style={{
        width: 0, height: 0,
        borderLeft: vertical ? "6px solid transparent" : `8px solid ${color}`,
        borderRight: vertical ? "6px solid transparent" : "none",
        borderTop: vertical ? `8px solid ${color}` : "6px solid transparent",
        borderBottom: vertical ? "none" : "6px solid transparent",
      }} />
    </div>
  );
}

function Box({ title, items, color, icon, small, onClick, highlight }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: highlight ? color + "22" : COLORS.card,
        border: `1.5px solid ${highlight ? color : COLORS.border}`,
        borderRadius: 12,
        padding: small ? "10px 14px" : "16px 20px",
        minWidth: small ? 140 : 200,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s",
        boxShadow: highlight ? `0 0 20px ${color}33` : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: items ? 8 : 0 }}>
        {icon && <span style={{ fontSize: small ? 16 : 20 }}>{icon}</span>}
        <span style={{ color: color || COLORS.text, fontWeight: 700, fontSize: small ? 13 : 15 }}>{title}</span>
      </div>
      {items && (
        <ul style={{ margin: 0, paddingLeft: 18, listStyle: "disc" }}>
          {items.map((item, i) => (
            <li key={i} style={{ color: COLORS.textMuted, fontSize: small ? 11 : 13, marginBottom: 3, lineHeight: 1.4 }}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, color }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <span style={{ fontSize: 32 }}>{icon}</span>
        <h2 style={{ margin: 0, color, fontSize: 26, fontWeight: 800 }}>{title}</h2>
      </div>
      <p style={{ margin: 0, color: COLORS.textMuted, fontSize: 15, maxWidth: 700 }}>{subtitle}</p>
    </div>
  );
}

/* ─── Section Views ─── */

function OverviewView({ onNavigate }) {
  return (
    <div>
      <SectionHeader icon="🏗️" title="System Architecture — Big Picture" subtitle="Five pillars working together to create an adaptive, evidence-based, FERPA-compliant Socratic medical tutor. Click any pillar to dive deeper." color={COLORS.text} />

      {/* Top: Student enters */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          borderRadius: 16, padding: "14px 32px",
          boxShadow: "0 4px 24px #3b82f644",
        }}>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>Student Opens App</span>
        </div>

        <FlowArrow color={COLORS.accent3} label="De-identified via Token" />

        {/* FERPA Layer */}
        <div onClick={() => onNavigate("ferpa")} style={{ cursor: "pointer", background: COLORS.accent3 + "15", border: `2px dashed ${COLORS.accent3}`, borderRadius: 14, padding: "12px 28px", marginBottom: 4, width: "80%", textAlign: "center" }}>
          <span style={{ color: COLORS.accent3, fontWeight: 700, fontSize: 14 }}>🔒 FERPA Privacy Layer — Real identity stripped, token UUID assigned</span>
        </div>

        <FlowArrow color={COLORS.accent2} label="Token + Learning Profile" />

        {/* AI Tutor Center */}
        <div onClick={() => onNavigate("tutor")} style={{
          cursor: "pointer",
          background: "linear-gradient(135deg, #8b5cf622, #3b82f622)",
          border: `2px solid ${COLORS.accent2}`,
          borderRadius: 20, padding: "24px 40px",
          textAlign: "center", width: "70%",
          boxShadow: `0 0 40px ${COLORS.accent2}22`,
        }}>
          <span style={{ fontSize: 36 }}>🧠</span>
          <div style={{ color: COLORS.accent2, fontWeight: 800, fontSize: 20, marginTop: 6 }}>AI Socratic Tutor (Claude)</div>
          <div style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 6 }}>Receives session briefing → Checks prerequisites → Guides with Socratic questions → Records mastery</div>
        </div>

        {/* Three inputs feeding into tutor */}
        <div style={{ display: "flex", justifyContent: "center", gap: 40, marginTop: 4, width: "100%" }}>
          {/* Left: Medical Knowledge */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <FlowArrow color={COLORS.accent1} label="Evidence chunks" />
            <div onClick={() => onNavigate("knowledge")} style={{ cursor: "pointer" }}>
              <Box title="Medical Knowledge" icon="📚" color={COLORS.accent1} highlight
                items={["PubMed / Cochrane APIs", "Chunked & embedded", "Weekly auto-refresh", "Vector similarity search"]} />
            </div>
          </div>

          {/* Center: Database */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <FlowArrow color={COLORS.accent5} label="Read & Write" />
            <div onClick={() => onNavigate("database")} style={{ cursor: "pointer" }}>
              <Box title="Supabase Database" icon="🗄️" color={COLORS.accent5} highlight
                items={["pgvector embeddings", "Student progress", "Concept prerequisite map", "Session history"]} />
            </div>
          </div>

          {/* Right: Gamification */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <FlowArrow color={COLORS.accent4} label="Engagement loop" />
            <div onClick={() => onNavigate("duolingo")} style={{ cursor: "pointer" }}>
              <Box title="Gamification Engine" icon="🎮" color={COLORS.accent4} highlight
                items={["Spaced repetition (SM-2)", "Streaks & XP", "Concept mastery levels", "Adaptive difficulty"]} />
            </div>
          </div>
        </div>

        {/* Bottom: Three tutor actions */}
        <div style={{ marginTop: 32, display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { label: "Pull Back", desc: "Reinforce prerequisite concepts", color: "#ef4444", icon: "⬅️" },
            { label: "Guide Forward", desc: "Socratic questions on new material", color: "#3b82f6", icon: "➡️" },
            { label: "Record Mastery", desc: "Update progress, schedule review", color: "#10b981", icon: "✅" },
          ].map((a) => (
            <div key={a.label} style={{
              background: a.color + "18", border: `1.5px solid ${a.color}44`,
              borderRadius: 12, padding: "12px 20px", textAlign: "center", minWidth: 180,
            }}>
              <span style={{ fontSize: 22 }}>{a.icon}</span>
              <div style={{ color: a.color, fontWeight: 700, fontSize: 14, marginTop: 4 }}>{a.label}</div>
              <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>{a.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KnowledgeView() {
  return (
    <div>
      <SectionHeader icon="📚" title="Medical Knowledge Pipeline" subtitle="How evidence-based content flows from trusted sources into the tutor's brain — and stays current." color={COLORS.accent1} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
        {/* Sources */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          {["PubMed (35M+ articles)", "Cochrane Reviews", "Semantic Scholar", "Clinical Guidelines (FHIR)"].map((s) => (
            <div key={s} style={{ background: COLORS.accent1 + "20", border: `1.5px solid ${COLORS.accent1}55`, borderRadius: 10, padding: "10px 18px" }}>
              <span style={{ color: COLORS.accent1, fontWeight: 600, fontSize: 13 }}>{s}</span>
            </div>
          ))}
        </div>

        <FlowArrow color={COLORS.accent1} label="REST APIs fetch articles by topic" />

        {/* Ingestion */}
        <Box title="Ingestion Pipeline" icon="⚙️" color={COLORS.accent1} highlight items={[
          "Initial bulk load: 50-100 curriculum topics → 20,000-50,000 articles",
          "Each article chunked into ~500 token passages with overlap",
          "Chunks converted to vector embeddings (1536 dimensions)",
          "Stored in Supabase pgvector with metadata & citations",
        ]} />

        <FlowArrow color={COLORS.accent1} label="Stored as searchable vectors" />

        {/* Vector DB */}
        <div style={{ background: COLORS.accent5 + "15", border: `2px solid ${COLORS.accent5}55`, borderRadius: 14, padding: 20, width: "80%", textAlign: "center" }}>
          <span style={{ fontSize: 24 }}>🗄️</span>
          <div style={{ color: COLORS.accent5, fontWeight: 700, fontSize: 16, marginTop: 4 }}>Supabase pgvector</div>
          <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>80,000–200,000 chunks · IVFFlat index · Cosine similarity search · ~2-5 GB storage</div>
        </div>

        <FlowArrow color={COLORS.accent1} label="Top 5 most relevant chunks returned in milliseconds" />

        {/* Retrieval */}
        <Box title="Retrieval at Query Time" icon="🔍" color={COLORS.accent1} highlight items={[
          "Student question → converted to embedding",
          "Cosine similarity search against 200K chunks",
          "Top 5 chunks returned with citations (title, DOI, URL)",
          "Passed to Claude as grounding context",
        ]} />

        {/* Refresh loop */}
        <div style={{ marginTop: 24, background: COLORS.accent1 + "10", border: `1.5px dashed ${COLORS.accent1}44`, borderRadius: 12, padding: 16, width: "70%", textAlign: "center" }}>
          <span style={{ color: COLORS.accent1, fontWeight: 700, fontSize: 14 }}>🔄 Weekly Auto-Refresh (Vercel Cron)</span>
          <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 6 }}>Checks all sources for new publications since last sync · Ingests new articles · Re-indexes · Admin can also trigger on-demand for new topics</div>
        </div>
      </div>
    </div>
  );
}

function TutorView() {
  return (
    <div>
      <SectionHeader icon="🧠" title="AI Socratic Tutor" subtitle="How Claude acts as an adaptive tutor — not just answering questions, but guiding students through reasoning." color={COLORS.accent2} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
        {/* Session Start */}
        <div style={{ background: "linear-gradient(135deg, #8b5cf622, #3b82f622)", border: `2px solid ${COLORS.accent2}`, borderRadius: 14, padding: 20, width: "85%", textAlign: "center" }}>
          <div style={{ color: COLORS.accent2, fontWeight: 800, fontSize: 16 }}>Session Briefing (Before Student Types)</div>
          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {[
              "Student mastery scores",
              "Known gaps & struggles",
              "Last session summary",
              "Prerequisite check results",
              "Socratic behavior rules",
            ].map((item) => (
              <span key={item} style={{ background: COLORS.accent2 + "25", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: COLORS.text }}>{item}</span>
            ))}
          </div>
        </div>

        <FlowArrow color={COLORS.accent2} label="Claude receives full context" />

        {/* Decision Tree */}
        <Box title="Tutor Decision Engine" icon="⚡" color={COLORS.accent2} highlight items={[
          "Student asks a question or responds to a prompt",
          "RAG retrieves top 5 evidence chunks from pgvector",
          "Claude checks: Does student have prerequisites mastered?",
          "If YES → Guide forward with Socratic questions using evidence",
          "If NO → Pull back to reinforce foundation concepts first",
        ]} />

        <FlowArrow color={COLORS.accent2} />

        {/* Three branches */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", width: "100%", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200, background: "#ef444418", border: "1.5px solid #ef444444", borderRadius: 12, padding: 16 }}>
            <div style={{ color: "#ef4444", fontWeight: 700, fontSize: 14 }}>⬅️ Pull Back</div>
            <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
              "Before we discuss beta blockers, let's revisit the Frank-Starling mechanism. Last time we touched on this but didn't fully nail it down. What happens to stroke volume when preload increases?"
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200, background: "#3b82f618", border: "1.5px solid #3b82f644", borderRadius: 12, padding: 16 }}>
            <div style={{ color: "#3b82f6", fontWeight: 700, fontSize: 14 }}>➡️ Guide Forward</div>
            <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
              "Good. The evidence shows carvedilol reduces mortality by 65% in mild-to-moderate HF. But why would blocking beta receptors help a failing heart? Think about what chronic sympathetic activation does..."
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200, background: "#10b98118", border: "1.5px solid #10b98144", borderRadius: 12, padding: 16 }}>
            <div style={{ color: "#10b981", fontWeight: 700, fontSize: 14 }}>✅ Record Mastery</div>
            <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
              "Excellent — you've connected cardiac remodeling to the mechanism of action. Updating your progress. This concept is now scheduled for spaced review in 3 days."
            </div>
          </div>
        </div>

        <FlowArrow color={COLORS.accent2} label="After each exchange" />

        {/* Post-session */}
        <Box title="End-of-Session Summary" icon="📝" color={COLORS.accent2} highlight items={[
          "Claude generates structured JSON: concepts covered, scores updated, struggles noted",
          "Progress written to student_progress table (de-identified)",
          "Spaced repetition schedule updated for reviewed concepts",
          "Recommended next topic stored for future session briefing",
        ]} />
      </div>
    </div>
  );
}

function FerpaView() {
  return (
    <div>
      <SectionHeader icon="🔒" title="FERPA De-Identification" subtitle="How the student stays anonymous to the AI while still getting a fully personalized learning experience." color={COLORS.accent3} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
        {/* Student Login */}
        <div style={{ background: COLORS.accent3 + "20", borderRadius: 12, padding: "12px 24px" }}>
          <span style={{ color: COLORS.accent3, fontWeight: 700 }}>Student Logs In</span>
          <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>jane.doe@medschool.edu</div>
        </div>

        <FlowArrow color={COLORS.accent3} label="App server (YOUR code)" />

        {/* The Wall */}
        <div style={{ display: "flex", width: "100%", gap: 20, alignItems: "stretch" }}>
          {/* Left: Identity side */}
          <div style={{ flex: 1, background: "#ef444412", border: "2px solid #ef444433", borderRadius: 14, padding: 20 }}>
            <div style={{ color: "#ef4444", fontWeight: 800, fontSize: 15, marginBottom: 12 }}>🚫 Identity Side (Never Sent to AI)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["Name: Jane Doe", "Email: jane.doe@medschool.edu", "Institution: ABC Medical School", "DOB: 1998-03-15", "Enrollment: Year 2, Active", "Grades: Protected by FERPA"].map((item) => (
                <div key={item} style={{ background: "#ef444418", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#fca5a5" }}>{item}</div>
              ))}
            </div>
            <div style={{ marginTop: 12, background: COLORS.card, borderRadius: 8, padding: 12 }}>
              <div style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: "monospace" }}>
                identity_map table<br />
                token_id: a3f7bc12-...<br />
                real_id: [encrypted]<br />
                ⚠️ Access logged & role-restricted
              </div>
            </div>
          </div>

          {/* Divider Wall */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ width: 4, flex: 1, background: `repeating-linear-gradient(to bottom, ${COLORS.accent3}, ${COLORS.accent3} 8px, transparent 8px, transparent 16px)` }} />
            <div style={{ background: COLORS.accent3, borderRadius: 8, padding: "8px 12px", transform: "rotate(-90deg)", whiteSpace: "nowrap" }}>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 11 }}>FIREWALL</span>
            </div>
            <div style={{ width: 4, flex: 1, background: `repeating-linear-gradient(to bottom, ${COLORS.accent3}, ${COLORS.accent3} 8px, transparent 8px, transparent 16px)` }} />
          </div>

          {/* Right: Token side */}
          <div style={{ flex: 1, background: "#10b98112", border: "2px solid #10b98133", borderRadius: 14, padding: 20 }}>
            <div style={{ color: COLORS.accent3, fontWeight: 800, fontSize: 15, marginBottom: 12 }}>✅ Token Side (What AI Sees)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "Token: a3f7bc12-9e4d-4c1a-...",
                "Cardiology mastery: 0.7",
                "Pharmacology mastery: 0.4",
                "Last session: struggled with preload",
                "Year in program: 2 (no school name)",
                "Track: Osteopathic medicine",
              ].map((item) => (
                <div key={item} style={{ background: "#10b98118", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#6ee7b7" }}>{item}</div>
              ))}
            </div>
            <div style={{ marginTop: 12, background: COLORS.card, borderRadius: 8, padding: 12 }}>
              <div style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: "monospace" }}>
                Prompt guardrail:<br />
                "Never ask for or use student's<br />
                name, email, or institution.<br />
                If volunteered, do not store it."
              </div>
            </div>
          </div>
        </div>

        {/* Admin access note */}
        <div style={{ marginTop: 20, background: COLORS.accent3 + "10", border: `1.5px dashed ${COLORS.accent3}44`, borderRadius: 12, padding: 16, width: "80%", textAlign: "center" }}>
          <span style={{ color: COLORS.accent3, fontWeight: 700, fontSize: 14 }}>👩‍💼 School Admin Dashboard</span>
          <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 6 }}>Admins CAN re-link token → identity for academic oversight. This access is logged, audited, and role-restricted. The AI layer never performs this lookup.</div>
        </div>
      </div>
    </div>
  );
}

function DuolingoView() {
  return (
    <div>
      <SectionHeader icon="🎮" title="Gamification & Spaced Repetition" subtitle="The Duolingo-inspired engagement layer — keeping students coming back and ensuring long-term retention." color={COLORS.accent4} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
        {/* Concept Map */}
        <Box title="Prerequisite Concept Map" icon="🗺️" color={COLORS.accent4} highlight items={[
          "Every concept maps to its prerequisite building blocks",
          "Example: Heart Failure Treatment requires Frank-Starling, which requires Preload + Afterload, which requires Cardiac Anatomy",
          "If student struggles → tutor walks BACKWARD through the chain",
          "Mastery of prerequisites required before advancing",
        ]} />

        <FlowArrow color={COLORS.accent4} />

        {/* Concept Tree Visual */}
        <div style={{ background: COLORS.card, borderRadius: 14, padding: 20, width: "90%", border: `1.5px solid ${COLORS.accent4}33` }}>
          <div style={{ color: COLORS.accent4, fontWeight: 700, fontSize: 14, marginBottom: 12, textAlign: "center" }}>Example: Cardiology Prerequisite Tree</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            {/* Level 4 */}
            <div style={{ background: "#ef444422", borderRadius: 8, padding: "8px 20px", border: "1px solid #ef444444" }}>
              <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 13 }}>HF Drug Management (Level 4)</span>
            </div>
            <span style={{ color: COLORS.textMuted, fontSize: 18 }}>↑</span>
            {/* Level 3 */}
            <div style={{ background: "#f59e0b22", borderRadius: 8, padding: "8px 20px", border: "1px solid #f59e0b44" }}>
              <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 13 }}>Frank-Starling Mechanism (Level 3)</span>
            </div>
            <span style={{ color: COLORS.textMuted, fontSize: 18 }}>↑</span>
            {/* Level 2 */}
            <div style={{ display: "flex", gap: 12 }}>
              {["Preload", "Afterload", "Contractility"].map((c) => (
                <div key={c} style={{ background: "#3b82f622", borderRadius: 8, padding: "8px 16px", border: "1px solid #3b82f644" }}>
                  <span style={{ color: "#3b82f6", fontWeight: 600, fontSize: 12 }}>{c} (L2)</span>
                </div>
              ))}
            </div>
            <span style={{ color: COLORS.textMuted, fontSize: 18 }}>↑</span>
            {/* Level 1 */}
            <div style={{ display: "flex", gap: 12 }}>
              {["Cardiac Anatomy", "Cardiac Cycle", "Basic Hemodynamics"].map((c) => (
                <div key={c} style={{ background: "#10b98122", borderRadius: 8, padding: "8px 16px", border: "1px solid #10b98144" }}>
                  <span style={{ color: "#10b981", fontWeight: 600, fontSize: 12 }}>{c} (L1)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <FlowArrow color={COLORS.accent4} label="Mastery feeds into..." />

        {/* Spaced Repetition */}
        <Box title="Spaced Repetition Engine (SM-2 Algorithm)" icon="🔄" color={COLORS.accent4} highlight items={[
          "When concept mastered → schedule first review in 1 day",
          "If recalled correctly → next review at 3 days, then 7, 14, 30...",
          "If forgotten → reset interval, pull back to prerequisite chain",
          "Each session, tutor checks: any concepts due for review today?",
        ]} />

        <FlowArrow color={COLORS.accent4} />

        {/* Engagement Features */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", width: "100%" }}>
          {[
            { icon: "🔥", title: "Daily Streaks", desc: "Consecutive days of practice. Streak freeze available for sick days." },
            { icon: "⭐", title: "XP System", desc: "Points for correct answers, bonus for mastering concepts on first try." },
            { icon: "🏆", title: "Mastery Levels", desc: "Bronze → Silver → Gold → Platinum per concept. Visual progress tree." },
            { icon: "📊", title: "Adaptive Difficulty", desc: "Questions get harder as mastery increases. Never too easy, never overwhelming." },
          ].map((f) => (
            <div key={f.title} style={{ flex: "1 1 200px", background: COLORS.accent4 + "12", border: `1.5px solid ${COLORS.accent4}33`, borderRadius: 12, padding: 14, textAlign: "center" }}>
              <span style={{ fontSize: 28 }}>{f.icon}</span>
              <div style={{ color: COLORS.accent4, fontWeight: 700, fontSize: 13, marginTop: 6 }}>{f.title}</div>
              <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 4, lineHeight: 1.4 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DatabaseView() {
  const tables = [
    {
      name: "medical_sources",
      color: COLORS.accent1,
      desc: "Where content comes from",
      fields: ["id uuid PK", "name text (PubMed, Cochrane...)", "type text (journal, review, guideline)", "base_url text", "last_synced_at timestamptz"],
    },
    {
      name: "medical_documents",
      color: COLORS.accent1,
      desc: "One row per article/review",
      fields: ["id uuid PK", "source_id uuid FK → medical_sources", "title text", "authors text[]", "published_at date", "doi text", "specialty_tags text[]"],
    },
    {
      name: "document_chunks",
      color: COLORS.accent1,
      desc: "Heart of RAG — searchable passages",
      fields: ["id uuid PK", "document_id uuid FK → medical_documents", "content text (~500 tokens)", "embedding vector(1536)", "chunk_index int", "token_count int"],
    },
    {
      name: "concepts",
      color: COLORS.accent4,
      desc: "Curriculum concept tree",
      fields: ["id uuid PK", "name text", "category text (cardiology, pharm...)", "difficulty int (1-5)", "description text"],
    },
    {
      name: "concept_prerequisites",
      color: COLORS.accent4,
      desc: "What must be learned first",
      fields: ["concept_id uuid FK → concepts", "prerequisite_id uuid FK → concepts"],
    },
    {
      name: "student_progress",
      color: COLORS.accent2,
      desc: "De-identified learning journey",
      fields: ["id uuid PK", "token_id uuid (NO FK to identity)", "concept_id uuid FK → concepts", "status text (not_started → mastered)", "mastery_score numeric (0.0-1.0)", "attempts int", "last_seen_at timestamptz"],
    },
    {
      name: "spaced_repetition",
      color: COLORS.accent4,
      desc: "SM-2 review schedule",
      fields: ["id uuid PK", "token_id uuid", "concept_id uuid FK", "interval_days int", "ease_factor numeric", "next_review_at date", "consecutive_correct int"],
    },
    {
      name: "session_summaries",
      color: COLORS.accent2,
      desc: "What Claude observed each session",
      fields: ["id uuid PK", "token_id uuid", "summary text", "concepts_covered uuid[]", "progress_updates jsonb", "recommended_next uuid FK → concepts"],
    },
    {
      name: "identity_map",
      color: "#ef4444",
      desc: "🔒 FERPA — encrypted, separate schema",
      fields: ["token_id uuid PK", "real_id text (encrypted at rest)", "created_at timestamptz"],
    },
  ];

  return (
    <div>
      <SectionHeader icon="🗄️" title="Database Architecture" subtitle="Nine tables in Supabase that power the entire system — medical knowledge, learning journey, gamification, and privacy." color={COLORS.accent5} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {tables.map((t) => (
          <div key={t.name} style={{ background: COLORS.card, borderRadius: 12, border: `1.5px solid ${t.color}44`, overflow: "hidden" }}>
            <div style={{ background: t.color + "22", padding: "10px 14px", borderBottom: `1px solid ${t.color}33` }}>
              <div style={{ color: t.color, fontWeight: 800, fontSize: 14, fontFamily: "monospace" }}>{t.name}</div>
              <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>{t.desc}</div>
            </div>
            <div style={{ padding: "10px 14px" }}>
              {t.fields.map((f, i) => (
                <div key={i} style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: "monospace", padding: "3px 0", borderBottom: i < t.fields.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>{f}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, background: COLORS.accent5 + "10", borderRadius: 12, padding: 16, border: `1.5px dashed ${COLORS.accent5}44` }}>
        <div style={{ color: COLORS.accent5, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Scale Estimates</div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[
            ["Articles ingested", "20,000–50,000"],
            ["Chunks stored", "80,000–200,000"],
            ["Storage needed", "2–5 GB"],
            ["Initial load", "4–8 hours"],
            ["Retrieval speed", "< 50ms"],
            ["Supabase cost", "Free tier"],
          ].map(([k, v]) => (
            <div key={k} style={{ textAlign: "center" }}>
              <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 16 }}>{v}</div>
              <div style={{ color: COLORS.textMuted, fontSize: 11 }}>{k}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main App ─── */

export default function App() {
  const [activeSection, setActiveSection] = useState("overview");

  const views = {
    overview: <OverviewView onNavigate={setActiveSection} />,
    knowledge: <KnowledgeView />,
    tutor: <TutorView />,
    ferpa: <FerpaView />,
    duolingo: <DuolingoView />,
    database: <DatabaseView />,
  };

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#0f172a", borderBottom: `1px solid ${COLORS.border}`, padding: "16px 24px", position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>
            <span style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Medical AI Tutor — System Architecture
            </span>
          </div>

          {/* Nav tabs */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  background: activeSection === s.id ? s.color + "25" : "transparent",
                  border: `1.5px solid ${activeSection === s.id ? s.color : COLORS.border}`,
                  borderRadius: 10,
                  padding: "8px 16px",
                  color: activeSection === s.id ? s.color : COLORS.textMuted,
                  fontWeight: activeSection === s.id ? 700 : 500,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
        {views[activeSection]}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "20px 24px", borderTop: `1px solid ${COLORS.border}`, color: COLORS.textMuted, fontSize: 12 }}>
        Prepared for Dr. Scariotti · Adaptive Medical AI Tutor · Next.js + Supabase + Claude Architecture
      </div>
    </div>
  );
}
