import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/scope?token=xxx — load full scope document + feedback
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Look up session by view_token
  const { data: session, error: sessionError } = await supabase
    .from('scope_sessions')
    .select('*')
    .eq('view_token', token)
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Scope document not found' }, { status: 404 })
  }

  const sessionId = session.id

  // Fetch all content tables in parallel
  const [
    sections,
    userRoles,
    compliance,
    auditEvents,
    competitors,
    techStack,
    costs,
    phases,
    sprints,
    agents,
    curriculum,
    milestones,
    criteria,
    features,
    exercises,
    qaChecks,
    smeChecklist,
    sectionReviews,
    decisions,
    comments,
  ] = await Promise.all([
    supabase.from('scope_sections').select('*').eq('session_id', sessionId).order('display_order'),
    supabase.from('scope_user_roles').select('*').eq('session_id', sessionId).order('display_order'),
    supabase.from('scope_compliance_items').select('*').eq('session_id', sessionId).order('display_order'),
    supabase.from('scope_audit_events').select('*').eq('session_id', sessionId).order('display_order'),
    supabase.from('scope_competitors').select('*').eq('session_id', sessionId).order('display_order'),
    supabase.from('scope_tech_stack').select('*').eq('session_id', sessionId).order('display_order'),
    supabase.from('scope_infrastructure_costs').select('*').eq('session_id', sessionId).order('display_order'),
    supabase.from('scope_build_phases').select('*').eq('session_id', sessionId).order('display_order'),
    supabase.from('scope_sprints').select('*').eq('session_id', sessionId).order('display_order'),
    supabase.from('scope_ai_agents').select('*').eq('session_id', sessionId).order('display_order'),
    supabase.from('scope_curriculum_domains').select('*').eq('session_id', sessionId).order('display_order'),
    supabase.from('scope_payment_milestones').select('*').eq('session_id', sessionId).order('display_order'),
    supabase.from('scope_acceptance_criteria').select('*').eq('session_id', sessionId).order('display_order'),
    supabase.from('scope_features').select('*').eq('session_id', sessionId).order('display_order'),
    supabase.from('scope_exercise_formats').select('*').eq('session_id', sessionId).order('display_order'),
    supabase.from('scope_qa_checks').select('*').eq('session_id', sessionId).order('display_order'),
    supabase.from('scope_sme_checklist').select('*').eq('session_id', sessionId).order('display_order'),
    supabase.from('scope_section_reviews').select('*').eq('session_id', sessionId),
    supabase.from('scope_decisions').select('*').eq('session_id', sessionId),
    supabase.from('scope_decision_comments').select('*').eq('session_id', sessionId).order('created_at'),
  ])

  return NextResponse.json({
    session,
    content: {
      sections: sections.data || [],
      userRoles: userRoles.data || [],
      compliance: compliance.data || [],
      auditEvents: auditEvents.data || [],
      competitors: competitors.data || [],
      techStack: techStack.data || [],
      costs: costs.data || [],
      phases: phases.data || [],
      sprints: sprints.data || [],
      agents: agents.data || [],
      curriculum: curriculum.data || [],
      milestones: milestones.data || [],
      criteria: criteria.data || [],
      features: features.data || [],
      exercises: exercises.data || [],
      qaChecks: qaChecks.data || [],
      smeChecklist: smeChecklist.data || [],
    },
    feedback: {
      sectionReviews: sectionReviews.data || [],
      decisions: decisions.data || [],
      comments: comments.data || [],
    },
  })
}

// POST /api/scope — submit feedback (section review, decision answer, or comment)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, token } = body

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Verify token
  const { data: session } = await supabase
    .from('scope_sessions')
    .select('id')
    .eq('view_token', token)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
  }

  const sessionId = session.id

  if (action === 'review_section') {
    const { section_id, section_title, status, notes } = body
    const { data, error } = await supabase
      .from('scope_section_reviews')
      .upsert({
        session_id: sessionId,
        section_id,
        section_title,
        status,
        notes,
        reviewed_at: new Date().toISOString(),
      }, { onConflict: 'session_id,section_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ review: data })
  }

  if (action === 'answer_decision') {
    const { question_id, section_id, question_text, answer } = body
    const { data, error } = await supabase
      .from('scope_decisions')
      .upsert({
        session_id: sessionId,
        section_id,
        question_id,
        question_text,
        answer,
      }, { onConflict: 'session_id,question_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ decision: data })
  }

  if (action === 'add_comment') {
    const { question_id, decision_id, author_role, author_name, content } = body

    // If no decision_id, find or create the decision first
    let resolvedDecisionId = decision_id
    if (!resolvedDecisionId && question_id) {
      const { data: existing } = await supabase
        .from('scope_decisions')
        .select('id')
        .eq('session_id', sessionId)
        .eq('question_id', question_id)
        .single()

      if (existing) {
        resolvedDecisionId = existing.id
      } else {
        // Create placeholder decision
        const { data: newDecision } = await supabase
          .from('scope_decisions')
          .insert({
            session_id: sessionId,
            section_id: question_id.split('-')[0],
            question_id,
            answer: 'discuss',
          })
          .select()
          .single()
        resolvedDecisionId = newDecision?.id
      }
    }

    const { data, error } = await supabase
      .from('scope_decision_comments')
      .insert({
        decision_id: resolvedDecisionId,
        session_id: sessionId,
        question_id,
        author_role,
        author_name,
        content,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ comment: data })
  }

  if (action === 'finalize_decision') {
    const { question_id, finalized_decision } = body
    const { data, error } = await supabase
      .from('scope_decisions')
      .update({
        finalized: true,
        finalized_at: new Date().toISOString(),
        finalized_decision,
      })
      .eq('session_id', sessionId)
      .eq('question_id', question_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ decision: data })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
